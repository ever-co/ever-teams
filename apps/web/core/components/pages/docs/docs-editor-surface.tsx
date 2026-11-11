'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Editor, Extensions } from '@tiptap/core';
import { useTranslations } from 'next-intl';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';
import { Comment, Link } from '@/core/components/icons';
import { RichEditor, type RichEditorBubbleAction, type RichEditorHandle } from '@/core/components/common/rich-editor/rich-editor';
import { anchorSelectionBlock, blockOf, BlockIds } from '@/core/components/common/rich-editor/block-id-extension';
import { editorSchemaTypes, type EditorCollaboration } from '@/core/components/common/rich-editor/editor-extensions';
import { liveCollaboration } from '@/core/components/common/rich-editor/live-collaboration';
import type { MentionCandidate } from '@/core/components/common/rich-editor/mention-extension';
import { useShortcutLabel } from '@/core/components/common/rich-editor/tool-button';
import { useDocsTaskChips } from '@/core/hooks/docs/use-docs-task-chips';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import type { DocsLiveBinding } from '@/core/lib/docs-live/binding';
import { DOCS_LIVE_FIELD } from '@/core/lib/docs-live/config';
import { quoteOf } from '@/core/lib/utils/docs-comments';
import { mentionedEmployeeIds } from '@/core/lib/utils/docs-markdown';
import { unsupportedTypesOf } from '@/core/lib/utils/docs-content';
import type { IDocumentNode } from '@/core/types/interfaces/common/docs';
import { DocsCommentMarksExtension, DocsTaskChipsExtension, setCommentMarks, setTaskChips } from './docs-editor-extensions';
import { editorHtmlOf } from './docs-editor-html';
import { DocsMobileFormatBar } from './docs-mobile-format-bar';

/** The live session the editor binds to, when the page is edited live. */
export interface DocsEditorLive {
	binding: DocsLiveBinding;
	doc: Doc;
	awareness: Awareness;
	/** Moves when the session replaced its document: the editor is built again on the new one. */
	generation: number;
	readOnly: boolean;
}

/** What the page view can ask the editor once it is up. */
export interface DocsEditorApi {
	getJson: () => IDocumentNode | null;
	focus: (position?: 'start' | 'end') => void;
	/**
	 * The block of the selection as a comment's place: its anchor (given to it now when it has none, which is an edit
	 * of the page, saved as any other) and the selected text as its quote. Null when the selection is in no block.
	 */
	anchorSelection: () => { blockId: string; quote: string; created: boolean } | null;
}

/** The comment threads the editor marks, and what it does with them. */
export interface DocsEditorComments {
	openBlockIds: readonly string[];
	/** The block a thread or a link points at, lit. */
	activeBlockId: string | null;
	onOpenThread: (blockId: string) => void;
	/** Comment on the selection (the selection toolbar, Mod-Alt-M, the phone's formatting row). */
	onComment: () => void;
	/** Copy the address of the selection's block. */
	onCopyBlockLink: () => void;
}

interface DocsEditorSurfaceProps {
	/** The stored HTML of the page. */
	value: string;
	onChange: (html: string, json: IDocumentNode | null, mentionEmployeeIds: string[]) => void;
	onReady?: (api: DocsEditorApi) => void;
	onSaveShortcut?: () => void;
	mentions: readonly MentionCandidate[];
	placeholder: string;
	disabled?: boolean;
	title?: string;
	/** The page's stored JSON, checked against the editor's schema before anything is saved. */
	json?: IDocumentNode | null;
	/** The JSON holds types the editor does not know: the page must not be edited here. */
	onUnsupported?: (types: string[]) => void;
	/**
	 * Live editing: the editor binds the session's shared document (`value` and `json` are not used), and every change,
	 * whoever made it, is reported (the platform saves it; the page only follows the outline).
	 */
	live?: DocsEditorLive | null;
	/**
	 * The JSON `value` was rendered from (the stored page, not a kept draft). A page whose blocks carry anchors opens from
	 * it: the platform's HTML cache does not keep them, and a page saved without them would lose its threads' places.
	 */
	sourceJson?: IDocumentNode | null;
	comments?: DocsEditorComments | null;
}

/** The editor of the RichEditor once it is up (it is made after the first render), again when it is rebuilt. */
function useEditorOf(editorRef: RefObject<RichEditorHandle | null>, rebuild: string): Editor | null {
	const [editor, setEditor] = useState<Editor | null>(null);
	useEffect(() => {
		let frames = 0;
		let handle = 0;
		const read = () => {
			const current = editorRef.current?.editor ?? null;
			if (current && !current.isDestroyed) {
				setEditor((previous) => (previous === current ? previous : current));
				return;
			}
			if (frames++ < 240) handle = requestAnimationFrame(read);
		};
		read();
		return () => cancelAnimationFrame(handle);
	}, [editorRef, rebuild]);
	return editor && !editor.isDestroyed ? editor : null;
}

/**
 * The page body: the app's rich editor, in this module so the Tiptap chunk loads with the page view and not
 * with the tree. Every change hands back the HTML (what the page shows) and the editor's JSON (what the
 * platform keeps as the canonical text).
 */
export function DocsEditorSurface({
	value,
	onChange,
	onReady,
	onSaveShortcut,
	mentions,
	placeholder,
	disabled,
	title,
	json,
	onUnsupported,
	live = null,
	sourceJson = null,
	comments = null
}: Readonly<DocsEditorSurfaceProps>) {
	const t = useTranslations();
	const shortcutLabel = useShortcutLabel();
	const editorRef = useRef<RichEditorHandle>(null);
	// What the editor opens, worked out again when the page's text is replaced: a new HTML, or a new stored JSON with the
	// same HTML (another save that moved only anchors, which the HTML cache does not keep). A draft held meanwhile hands
	// no JSON (`null`), which keeps what is shown.
	const [shown, setShown] = useState(() => ({ source: value, json: sourceJson, html: editorHtmlOf(value, sourceJson) }));
	const replaced = shown.source !== value || (sourceJson !== null && sourceJson !== shown.json);
	if (!live && replaced) setShown({ source: value, json: sourceJson, html: editorHtmlOf(value, sourceJson) });
	const editorValue = live ? value : shown.html;
	const liveBinding = live?.binding ?? null;
	const liveDoc = live?.doc ?? null;
	const liveAwareness = live?.awareness ?? null;
	// Live, the editor's binding deletes from the shared document (for everyone) whatever its schema cannot render: the
	// document is checked before the editor is bound, and the session checks every update after (`bindEditor`). Done
	// while rendering, so no update can land between the check and the editor.
	const schemaTypes = useMemo(() => (liveBinding ? editorSchemaTypes() : null), [liveBinding]);
	const unknownLiveTypes = useMemo(() => (liveBinding && liveDoc && schemaTypes ? liveBinding.bindEditor(schemaTypes) : []), [liveBinding, liveDoc, schemaTypes]);
	const collaboration = useMemo<EditorCollaboration | null>(
		() => (liveDoc && liveAwareness && unknownLiveTypes.length === 0 ? liveCollaboration(liveDoc, liveAwareness, DOCS_LIVE_FIELD) : null),
		[liveAwareness, liveDoc, unknownLiveTypes.length]
	);
	useEffect(() => {
		if (!liveBinding || unknownLiveTypes.length === 0) return;
		liveBinding.refuseEditor(unknownLiveTypes);
		onUnsupported?.(unknownLiveTypes);
	}, [liveBinding, onUnsupported, unknownLiveTypes]);
	// Whether the person has acted on the editor. Opening a page makes the editor tidy the stored text (a closing empty
	// line, default attributes), which it reports as a change: that is not an edit, and it must never be saved — or every
	// reader of a page would move its "updated" time, add a version and collide with whoever is writing.
	const touchedRef = useRef(false);
	const markTouched = useCallback(() => {
		touchedRef.current = true;
	}, []);

	// Once the editor is up: a page whose JSON holds what this editor cannot carry is reported before any change,
	// so the reduced text it would produce is never saved over the original.
	useEffect(() => {
		if (!json || !onUnsupported) return;
		let frames = 0;
		let handle = 0;
		const check = () => {
			const editor = editorRef.current?.editor;
			if (!editor) {
				if (frames++ < 120) handle = requestAnimationFrame(check);
				return;
			}
			const unknown = unsupportedTypesOf(json, { nodes: new Set(Object.keys(editor.schema.nodes)), marks: new Set(Object.keys(editor.schema.marks)) });
			if (unknown.length) onUnsupported(unknown);
		};
		check();
		return () => cancelAnimationFrame(handle);
	}, [json, onUnsupported]);

	const getJson = useCallback((): IDocumentNode | null => {
		const editor = editorRef.current?.editor;
		return editor ? (editor.getJSON() as IDocumentNode) : null;
	}, []);

	const anchorSelection = useCallback(() => {
		const current = editorRef.current?.editor;
		if (!current || current.isDestroyed) return null;
		const anchored = anchorSelectionBlock(current.state);
		if (!anchored) return null;
		if (anchored.transaction) {
			// Giving the block its anchor is the person's edit: it is saved (or sent live) as any other.
			touchedRef.current = true;
			current.view.dispatch(anchored.transaction);
		}
		const { from, to } = current.state.selection;
		const selected = current.state.doc.textBetween(from, to, ' ', ' ').trim();
		const block = blockOf(current.state.doc, anchored.blockId);
		return { blockId: anchored.blockId, quote: quoteOf(selected || block?.node.textContent || ''), created: anchored.transaction !== null };
	}, []);

	useEffect(() => {
		onReady?.({
			getJson,
			focus: (position) => editorRef.current?.focus(position),
			anchorSelection
		});
	}, [anchorSelection, getJson, onReady]);

	// ---------------------------------------------------------------- the Docs layer: anchors, comment marks, task chips

	const { openTaskDrawer } = useTaskDrawer();
	const taskChips = useDocsTaskChips();
	const commentsRef = useRef(comments);
	const openTaskRef = useRef(openTaskDrawer);
	const labelsRef = useRef({ marker: '', unknownTask: '', openTask: '' });
	useEffect(() => {
		commentsRef.current = comments;
		openTaskRef.current = openTaskDrawer;
		labelsRef.current = { marker: t('docs.COMMENT_MARKER'), unknownTask: t('docs.TASK_CHIP_UNKNOWN'), openTask: t('docs.OPEN_TASK') };
	});
	// Made once per surface: the callbacks read the props of the latest render.
	const docsExtensions = useMemo<Extensions>(
		() => [
			BlockIds,
			DocsCommentMarksExtension.configure({
				onOpenThread: (blockId) => commentsRef.current?.onOpenThread(blockId),
				onComment: () => commentsRef.current?.onComment(),
				markerLabel: () => labelsRef.current.marker
			}),
			DocsTaskChipsExtension.configure({
				origin: () => (typeof window === 'undefined' ? 'http://localhost' : window.location.origin),
				onOpenTask: (taskId) => openTaskRef.current(taskId),
				unknownLabel: () => labelsRef.current.unknownTask,
				openLabel: () => labelsRef.current.openTask
			})
		],
		[]
	);
	const editor = useEditorOf(editorRef, live ? `live-${live.generation}` : 'page');
	const openKey = comments?.openBlockIds.join(',') ?? '';
	const activeBlockId = comments?.activeBlockId ?? null;
	useEffect(() => {
		if (!editor) return;
		setCommentMarks(editor.view, { open: new Set(openKey ? openKey.split(',') : []), active: activeBlockId });
	}, [activeBlockId, editor, openKey]);
	useEffect(() => {
		if (editor) setTaskChips(editor.view, taskChips);
	}, [editor, taskChips]);

	const hasComments = comments !== null;
	const commentLabel = t('docs.COMMENT');
	const blockLinkLabel = t('docs.COPY_BLOCK_LINK');
	const commentShortcut = shortcutLabel(['Mod', 'Alt', 'M']);
	const bubbleActions = useMemo<RichEditorBubbleAction[] | undefined>(
		() =>
			hasComments
				? [
						{ id: 'comment', icon: Comment, label: commentLabel, shortcutLabel: commentShortcut, onPress: () => commentsRef.current?.onComment() },
						{ id: 'block-link', icon: Link, label: blockLinkLabel, onPress: () => commentsRef.current?.onCopyBlockLink() }
					]
				: undefined,
		[blockLinkLabel, commentLabel, commentShortcut, hasComments]
	);

	const isLive = live !== null;
	const handleChange = useCallback(
		(html: string) => {
			// Live, a change of someone else's moves the outline too (nothing here saves it).
			if (!isLive && !touchedRef.current) return;
			const json = getJson();
			onChange(html, json, mentionedEmployeeIds(json));
		},
		[getJson, isLive, onChange]
	);

	// Live with content this editor cannot carry: nothing is bound; the page shows its read-only view.
	if (live && !collaboration) return null;

	return (
		<div
			// The formatting row stays in sight while a long page scrolls under it; the Docs layer's marks and chips.
			className={DOCS_SURFACE_CLASS}
			onKeyDownCapture={markTouched}
			onBeforeInputCapture={markTouched}
			onPointerDownCapture={markTouched}
			onPasteCapture={markTouched}
			onDropCapture={markTouched}
			onKeyDown={(event) => {
				if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
					event.preventDefault();
					onSaveShortcut?.();
				}
			}}
		>
			<RichEditor
				// A new shared document needs a new editor: the binding is made once per editor.
				key={live ? `live-${live.generation}` : 'page'}
				ref={editorRef}
				value={editorValue}
				onChange={handleChange}
				placeholder={placeholder}
				chrome="bare"
				toolbar
				images
				mentions={mentions}
				collaboration={collaboration}
				extensions={docsExtensions}
				bubbleActions={bubbleActions}
				disabled={disabled || Boolean(live?.readOnly)}
				contentClassName="min-h-[40vh] text-base"
				aria-label={title}
			/>
			{editor && <DocsMobileFormatBar editor={editor} onComment={hasComments ? () => commentsRef.current?.onComment() : undefined} />}
		</div>
	);
}

/**
 * The surface's styles: the sticky formatting row (hidden on a phone, where the row above the keyboard takes its place
 * while typing), the blocks with an open thread (a tint and a button in the margin), the block a link points at, and
 * the task chips.
 */
const DOCS_SURFACE_CLASS = [
	'docs-editor-surface min-h-[50vh] [&_[role=toolbar]]:sticky [&_[role=toolbar]]:top-0 [&_[role=toolbar]]:z-10 [&_[role=toolbar]]:bg-background print:[&_[role=toolbar]]:hidden',
	'[&_.docs-commented-block]:relative [&_.docs-commented-block]:rounded-sm [&_.docs-commented-block]:bg-amber-500/[0.07] [&_.docs-commented-block]:shadow-[inset_2px_0_0_rgb(245_158_11/0.6)]',
	'[&_.docs-active-block]:rounded-sm [&_.docs-active-block]:bg-amber-500/[0.16] [&_.docs-active-block]:transition-colors',
	'[&_.docs-comment-marker]:absolute [&_.docs-comment-marker]:-left-7 [&_.docs-comment-marker]:top-0.5 [&_.docs-comment-marker]:flex [&_.docs-comment-marker]:size-5 [&_.docs-comment-marker]:cursor-pointer [&_.docs-comment-marker]:items-center [&_.docs-comment-marker]:justify-center [&_.docs-comment-marker]:rounded-md [&_.docs-comment-marker]:border-0 [&_.docs-comment-marker]:bg-amber-500/20 [&_.docs-comment-marker]:p-0 [&_.docs-comment-marker:hover]:bg-amber-500/35 max-sm:[&_.docs-comment-marker]:-left-5',
	'[&_.docs-comment-marker]:after:block [&_.docs-comment-marker]:after:size-2 [&_.docs-comment-marker]:after:rounded-full [&_.docs-comment-marker]:after:bg-amber-600 [&_.docs-comment-marker]:after:content-[""]',
	'[&_.docs-task-chip]:me-1 [&_.docs-task-chip]:inline-flex [&_.docs-task-chip]:cursor-pointer [&_.docs-task-chip]:items-center [&_.docs-task-chip]:gap-1 [&_.docs-task-chip]:rounded-md [&_.docs-task-chip]:border-0 [&_.docs-task-chip]:bg-foreground/[0.06] [&_.docs-task-chip]:px-1.5 [&_.docs-task-chip]:align-baseline [&_.docs-task-chip]:text-[0.8em] [&_.docs-task-chip]:font-medium [&_.docs-task-chip]:leading-5 [&_.docs-task-chip]:text-foreground/80 [&_.docs-task-chip:hover]:bg-foreground/[0.1]',
	'[&_.docs-task-chip-status]:inline-flex [&_.docs-task-chip-status]:items-center [&_.docs-task-chip-status]:gap-1 [&_.docs-task-chip-status]:font-normal [&_.docs-task-chip-status]:capitalize [&_.docs-task-chip-status]:text-muted-foreground [&_.docs-task-chip-status]:before:size-1.5 [&_.docs-task-chip-status]:before:rounded-full [&_.docs-task-chip-status]:before:bg-[var(--chip-status,currentColor)] [&_.docs-task-chip-status]:before:content-[""]',
	'[&_.docs-task-link]:font-medium'
].join(' ');
