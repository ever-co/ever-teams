'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc } from 'yjs';
import { RichEditor, type RichEditorHandle } from '@/core/components/common/rich-editor/rich-editor';
import { editorSchemaTypes, type EditorCollaboration } from '@/core/components/common/rich-editor/editor-extensions';
import { liveCollaboration } from '@/core/components/common/rich-editor/live-collaboration';
import type { MentionCandidate } from '@/core/components/common/rich-editor/mention-extension';
import type { DocsLiveBinding } from '@/core/lib/docs-live/binding';
import { DOCS_LIVE_FIELD } from '@/core/lib/docs-live/config';
import { mentionedEmployeeIds } from '@/core/lib/utils/docs-markdown';
import { unsupportedTypesOf } from '@/core/lib/utils/docs-content';
import type { IDocumentNode } from '@/core/types/interfaces/common/docs';

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
}

/**
 * The page body: the app's rich editor, in this module so the Tiptap chunk loads with the page view and not
 * with the tree. Every change hands back the HTML (what the page shows) and the editor's JSON (what the
 * platform keeps as the canonical text).
 */
export function DocsEditorSurface({ value, onChange, onReady, onSaveShortcut, mentions, placeholder, disabled, title, json, onUnsupported, live = null }: DocsEditorSurfaceProps) {
	const editorRef = useRef<RichEditorHandle>(null);
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

	useEffect(() => {
		onReady?.({
			getJson,
			focus: (position) => editorRef.current?.focus(position)
		});
	}, [getJson, onReady]);

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
			// The formatting row stays in sight while a long page scrolls under it.
			className="docs-editor-surface min-h-[50vh] [&_[role=toolbar]]:sticky [&_[role=toolbar]]:top-0 [&_[role=toolbar]]:z-10 [&_[role=toolbar]]:bg-background print:[&_[role=toolbar]]:hidden"
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
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				chrome="bare"
				toolbar
				images
				mentions={mentions}
				collaboration={collaboration}
				disabled={disabled || Boolean(live?.readOnly)}
				contentClassName="min-h-[40vh] text-base"
				aria-label={title}
			/>
		</div>
	);
}
