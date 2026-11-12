'use client';

import { getHTMLFromFragment, type Editor, type Extensions, type JSONContent } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type MouseEvent,
	type ReactNode
} from 'react';
import { toast } from 'sonner';
import { Spinner, type IconComponent } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import type { ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { useEditorAssist } from '@/core/hooks/ai/use-editor-assist';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { isMarkdown, storedTextToEditorHtml } from '@/core/lib/helpers/rich-text-format';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	EDITOR_AI_MAX_CHARS,
	EDITOR_AI_MIN_CHARS,
	type TEditorAiContext,
	type TEditorAiMode
} from '@/core/types/schemas/ai/editor-assist.schema';
import { BubbleToolbar } from './bubble-toolbar';
import { EditorAiPanel, type AiPanelState } from './editor-ai-panel';
import {
	EDITOR_IMAGE_ACCEPT,
	EDITOR_IMAGE_FOLDER,
	altTextOf,
	editorImageProblemOf,
	imageFilesOf
} from './editor-config';
import { buildExtensions, type EditorCollaboration } from './editor-extensions';
import { EditorToolbar, ToolbarPlaceholder } from './editor-toolbar';
import type { MentionCandidate } from './mention-extension';
import type { SlashItemCopy } from './slash-command';
import styles from './rich-text.module.css';

export type RichEditorStats = { words: number; characters: number };

export type RichEditorHandle = {
	focus: (position?: 'start' | 'end') => void;
	readonly editor: Editor | null;
	isEmpty: () => boolean;
	openAi: () => void;
};

export type RichEditorAi = {
	/** What the text is, so the writing help fits it. */
	context: TEditorAiContext;
	/** The task title or project name, read by the writing help as context. */
	title?: string;
};

/** A host's button in the toolbar over a selection. */
export type RichEditorBubbleAction = {
	id: string;
	icon: IconComponent;
	label: string;
	shortcutLabel?: string;
	onPress: (editor: Editor) => void;
};

export type RichEditorProps = {
	/** The stored description, in any format the editors ever wrote; it is shown as HTML. */
	value: string;
	/** HTML on every edit, or an empty string when the text is empty. */
	onChange: (html: string, stats: RichEditorStats) => void;
	placeholder?: string;
	/** "field" draws the input recipe around the editor; "bare" draws nothing (the host carries the frame). */
	chrome?: 'field' | 'bare';
	/** The fixed formatting row. The "/" menu and the selection toolbar exist either way. */
	toolbar?: boolean;
	/** Drawn at the start of the toolbar row, such as a section label. */
	toolbarLeading?: ReactNode;
	/** Writing help; absent means no AI entry point at all. */
	ai?: RichEditorAi;
	/** People "@" can mention; absent means no mentions. */
	mentions?: readonly MentionCandidate[];
	/** Pictures by paste, drop, toolbar or "/" menu, uploaded to Gauzy's image assets. */
	images?: boolean;
	characterLimit?: number;
	/**
	 * Live editing: the editor shows and edits this shared document (its first state comes from the session, never
	 * from `value`), with the co-editors' carets; `value` is then ignored. Set once per editor: a new document needs a
	 * new editor (remount it).
	 */
	collaboration?: EditorCollaboration | null;
	/** Extensions a host adds (the Docs pages). Keep the array stable: a new one builds a new editor. */
	extensions?: Extensions;
	/** More buttons in the toolbar over a selection, after the marks. */
	bubbleActions?: readonly RichEditorBubbleAction[];
	disabled?: boolean;
	autoFocus?: boolean;
	onModEnter?: () => void;
	/** Return true when the key was handled (the host closed something). */
	onEscape?: (event: KeyboardEvent) => boolean | void;
	className?: string;
	contentClassName?: string;
	id?: string;
	'aria-label'?: string;
	'aria-labelledby'?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
};

const FIELD_CHROME =
	'rounded-md hairline-border border-transparent bg-background shadow-sm shadow-black/10 hairline-ring ring-foreground/10 transition-[color,box-shadow] focus-within:border-foreground/35 focus-within:ring-[3px] focus-within:ring-ring/25 dark:bg-foreground/5 dark:ring-foreground/15 dark:focus-within:border-foreground/25';

const FIELD_INVALID = 'border-destructive ring-destructive/20 dark:ring-destructive/40';

const IMAGE_TYPE_TOAST_ID = 'rich-editor-image-type';
const IMAGE_SIZE_TOAST_ID = 'rich-editor-image-size';
const AI_TEXT_LENGTH_TOAST_ID = 'rich-editor-ai-text-length';

function emittedHtmlOf(editor: Editor) {
	if (editor.isEmpty) {
		return '';
	}
	return editor.getHTML();
}

function statsOf(editor: Editor): RichEditorStats {
	const storage = editor.storage.characterCount;
	return { words: storage.words(), characters: storage.characters() };
}

/**
 * Where a picture or an inserted proposal goes: after the top-level block the position sits in, never in the middle
 * of a sentence. On an empty line the picture takes the line's place and the caret stays below it.
 */
function blockBoundaryAfter(editor: Editor, pos: number | null): number {
	const doc = editor.state.doc;
	const raw = pos ?? editor.state.selection.to;
	const clamped = Math.max(0, Math.min(raw, doc.content.size));
	const $pos = doc.resolve(clamped);
	if ($pos.depth === 0) {
		return $pos.pos;
	}
	const block = $pos.node(1);
	const isEmptyParagraph = block.type.name === 'paragraph' && block.content.size === 0;
	if (isEmptyParagraph) {
		return $pos.before(1);
	}
	return $pos.after(1);
}

/** A single paragraph landing inside a sentence goes in as inline text, so it does not split its paragraph. */
function insertMarkdownAt(editor: Editor, range: { from: number; to: number }, markdown: string) {
	const parsed = editor.markdown?.parse(markdown);
	const blocks = parsed?.content ?? [];
	const $from = editor.state.doc.resolve(range.from);
	const $to = editor.state.doc.resolve(range.to);
	const isInlineScope = $from.sameParent($to) && $from.parent.isTextblock;
	const isOneParagraph = blocks.length === 1 && blocks[0].type === 'paragraph';
	if (isInlineScope && isOneParagraph) {
		editor
			.chain()
			.focus()
			.insertContentAt(range, blocks[0].content ?? [])
			.run();
		return;
	}
	editor.chain().focus().insertContentAt(range, markdown, { contentType: 'markdown' }).run();
}

/** The Markdown of a range, for the writing help to read. */
function markdownOfRange(editor: Editor, from: number, to: number): string {
	const slice = editor.state.doc.slice(from, to);
	const content = slice.content.toJSON() as JSONContent[] | null;
	const plainText = editor.state.doc.textBetween(from, to, '\n');
	const markdown = editor.markdown;
	if (!content || !markdown) {
		return plainText;
	}
	try {
		return markdown.serialize({ type: 'doc', content });
	} catch {
		return plainText;
	}
}

/** A proposal as HTML through the editor's own schema, so the preview shows mentions and to-do items as they will be. */
function proposalHtmlOf(editor: Editor, markdown: string) {
	try {
		const json = editor.markdown?.parse(markdown);
		if (!json) {
			return '';
		}
		const doc = ProseMirrorNode.fromJSON(editor.schema, json);
		return getHTMLFromFragment(doc.content, editor.schema);
	} catch {
		return '';
	}
}

function isInsideCodeBlock(view: EditorView) {
	const { $from } = view.state.selection;
	return $from.parent.type.name === 'codeBlock';
}

type EditorAttributeInput = {
	className: string;
	id?: string;
	ariaLabel?: string;
	ariaLabelledBy?: string;
	ariaDescribedBy?: string;
	ariaInvalid?: boolean;
};

function editorAttributesOf(input: EditorAttributeInput): Record<string, string> {
	const attributes: Record<string, string> = {
		class: input.className,
		role: 'textbox',
		'aria-multiline': 'true'
	};
	if (input.id) {
		attributes.id = input.id;
	}
	if (input.ariaLabel) {
		attributes['aria-label'] = input.ariaLabel;
	}
	if (input.ariaLabelledBy) {
		attributes['aria-labelledby'] = input.ariaLabelledBy;
	}
	if (input.ariaDescribedBy) {
		attributes['aria-describedby'] = input.ariaDescribedBy;
	}
	if (input.ariaInvalid) {
		attributes['aria-invalid'] = 'true';
	}
	return attributes;
}

function autofocusOf(autoFocus: boolean) {
	if (autoFocus) {
		return 'end' as const;
	}
	return false;
}

function isModEnterKey(event: KeyboardEvent) {
	const hasModifier = event.metaKey || event.ctrlKey;
	return hasModifier && event.key === 'Enter';
}

/** The selection, or the whole text when nothing is selected, as the writing help reads it. */
function aiSourceOf(editor: Editor) {
	const { from, to, empty } = editor.state.selection;
	if (empty) {
		return { source: editor.getMarkdown(), scope: null };
	}
	return { source: markdownOfRange(editor, from, to), scope: { from, to } };
}

function insertionPointOf(editor: Editor, scope: AiPanelState['scope']) {
	const size = editor.state.doc.content.size;
	if (!scope) {
		return blockBoundaryAfter(editor, size);
	}
	const scopeEnd = Math.min(scope.to, size);
	return blockBoundaryAfter(editor, scopeEnd);
}

function mentionsGetterOf(hasMentions: boolean, mentionsRef: { current: readonly MentionCandidate[] }) {
	if (!hasMentions) {
		return undefined;
	}
	return () => mentionsRef.current;
}

function toolbarEditorOf(toolbar: boolean, editor: Editor | null) {
	if (!toolbar) {
		return null;
	}
	return editor;
}

function closedAiState(state: AiPanelState): AiPanelState {
	return { ...state, mode: null, busy: false, result: null, resultHtml: '', error: null };
}

function useSlashCopy(): SlashItemCopy {
	const t = useTranslations();
	return useMemo(
		() => ({
			text: { title: t('richEditor.slash.TEXT'), hint: t('richEditor.slash.TEXT_HINT') },
			h1: { title: t('richEditor.slash.HEADING_1'), hint: t('richEditor.slash.HEADING_1_HINT') },
			h2: { title: t('richEditor.slash.HEADING_2'), hint: t('richEditor.slash.HEADING_2_HINT') },
			h3: { title: t('richEditor.slash.HEADING_3'), hint: t('richEditor.slash.HEADING_3_HINT') },
			bullet: { title: t('richEditor.slash.BULLET_LIST'), hint: t('richEditor.slash.BULLET_LIST_HINT') },
			numbered: { title: t('richEditor.slash.NUMBERED_LIST'), hint: t('richEditor.slash.NUMBERED_LIST_HINT') },
			todo: { title: t('richEditor.slash.TODO_LIST'), hint: t('richEditor.slash.TODO_LIST_HINT') },
			quote: { title: t('richEditor.slash.QUOTE'), hint: t('richEditor.slash.QUOTE_HINT') },
			code: { title: t('richEditor.slash.CODE_BLOCK'), hint: t('richEditor.slash.CODE_BLOCK_HINT') },
			divider: { title: t('richEditor.slash.DIVIDER'), hint: t('richEditor.slash.DIVIDER_HINT') },
			image: { title: t('richEditor.slash.IMAGE'), hint: t('richEditor.slash.IMAGE_HINT') },
			ai: { title: t('richEditor.slash.ASK_AI'), hint: t('richEditor.slash.ASK_AI_HINT') }
		}),
		[t]
	);
}

/**
 * The rich text editor of descriptions (tasks, projects, task creation): Tiptap with HTML in and HTML out, a "/"
 * menu for blocks, a toolbar over the selection, "@" for team members, pictures by paste, drop or button, and
 * writing help that proposes and never edits on its own. Load it through `LazyRichEditor`: the read view
 * (`RichTextView`) shows a description without this code.
 */
export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
	{
		value,
		onChange,
		placeholder,
		chrome = 'field',
		toolbar = true,
		toolbarLeading,
		ai,
		mentions,
		images = true,
		characterLimit,
		collaboration = null,
		extensions: hostExtensions,
		bubbleActions,
		disabled = false,
		autoFocus = false,
		onModEnter,
		onEscape,
		className,
		contentClassName,
		id,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledBy,
		'aria-describedby': ariaDescribedBy,
		'aria-invalid': ariaInvalid
	},
	ref
) {
	const t = useTranslations();
	const slashCopy = useSlashCopy();
	const assist = useEditorAssist();
	const { createImageAssets } = useImageAssets();
	const aiEnabled = Boolean(ai);
	const hasMentions = mentions !== undefined;
	const resolvedPlaceholder = placeholder ?? t('richEditor.PLACEHOLDER');

	const lastEmitted = useRef(value);
	const syncedEditor = useRef<Editor | null>(null);
	const suggestionOpen = useRef(false);
	const mentionsRef = useRef<readonly MentionCandidate[]>(mentions ?? []);
	const disabledRef = useRef(disabled);
	const callbacks = useRef({ onChange, onModEnter, onEscape });
	const openAiRef = useRef<() => void>(() => undefined);
	const uploadRef = useRef<(files: File[], pos: number | null) => void>(() => undefined);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [initialHtml] = useState(() => storedTextToEditorHtml(value));
	const [uploading, setUploading] = useState(0);
	const [aiState, setAiState] = useState<AiPanelState | null>(null);

	useEffect(() => {
		mentionsRef.current = mentions ?? [];
		disabledRef.current = disabled;
		callbacks.current = { onChange, onModEnter, onEscape };
	});

	const pickImage = useCallback(() => fileInputRef.current?.click(), []);

	const extensions = useMemo(
		() =>
			buildExtensions({
				placeholder: resolvedPlaceholder,
				characterLimit,
				slashMenu: {
					copy: slashCopy,
					handlers: { pickImage, openAi: () => openAiRef.current() },
					imagesEnabled: images,
					aiEnabled
				},
				slashLabels: {
					emptyLabel: t('richEditor.slash.EMPTY'),
					loadingLabel: t('richEditor.LOADING'),
					ariaLabel: t('richEditor.slash.LABEL')
				},
				mentionLabels: {
					emptyLabel: t('richEditor.mention.EMPTY'),
					loadingLabel: t('richEditor.LOADING'),
					ariaLabel: t('richEditor.mention.LABEL')
				},
				mentions: mentionsGetterOf(hasMentions, mentionsRef),
				onSuggestionOpenChange: (open) => {
					suggestionOpen.current = open;
				},
				collaboration,
				extraExtensions: hostExtensions
			}),
		[aiEnabled, characterLimit, collaboration, hasMentions, hostExtensions, images, pickImage, resolvedPlaceholder, slashCopy, t]
	);

	const handleKeyDown = useCallback((_view: EditorView, event: KeyboardEvent) => {
		if (isModEnterKey(event)) {
			if (!callbacks.current.onModEnter) {
				return false;
			}
			event.preventDefault();
			callbacks.current.onModEnter();
			return true;
		}
		if (event.key !== 'Escape') {
			return false;
		}
		if (suggestionOpen.current) {
			return false;
		}
		return callbacks.current.onEscape?.(event) === true;
	}, []);

	const pasteMarkdownRef = useRef<(markdown: string) => void>(() => undefined);

	const handlePaste = useCallback((view: EditorView, event: ClipboardEvent) => {
		if (disabledRef.current) {
			return false;
		}
		const files = imageFilesOf(event.clipboardData?.files);
		if (files.length > 0) {
			event.preventDefault();
			uploadRef.current(files, null);
			return true;
		}
		const html = event.clipboardData?.getData('text/html');
		const text = event.clipboardData?.getData('text/plain') ?? '';
		const isPlainMarkdown = !html && isMarkdown(text);
		if (!isPlainMarkdown) {
			return false;
		}
		if (isInsideCodeBlock(view)) {
			return false;
		}
		event.preventDefault();
		pasteMarkdownRef.current(text);
		return true;
	}, []);

	const handleDrop = useCallback((view: EditorView, event: DragEvent, _slice: unknown, moved: boolean) => {
		if (moved || disabledRef.current) {
			return false;
		}
		const files = imageFilesOf(event.dataTransfer?.files);
		if (files.length === 0) {
			return false;
		}
		event.preventDefault();
		event.stopPropagation();
		const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
		uploadRef.current(files, coords?.pos ?? null);
		return true;
	}, []);

	const editor = useEditor(
		{
			immediatelyRender: false,
			extensions,
			// A live editor starts from the shared document; seeding it here would add the text to it a second time.
			content: collaboration ? undefined : initialHtml,
			editable: !disabled,
			autofocus: autofocusOf(autoFocus),
			editorProps: {
				attributes: editorAttributesOf({
					className: cn(
						'prose prose-sm max-w-none px-3 py-2.5 outline-none',
						styles.content,
						contentClassName
					),
					id,
					ariaLabel,
					ariaLabelledBy,
					ariaDescribedBy,
					ariaInvalid
				}),
				handleKeyDown,
				handlePaste,
				handleDrop
			},
			onUpdate: ({ editor: current }) => {
				const html = emittedHtmlOf(current);
				lastEmitted.current = html;
				callbacks.current.onChange(html, statsOf(current));
			}
		},
		[extensions]
	);

	useEffect(() => {
		pasteMarkdownRef.current = (markdown: string) => {
			editor?.chain().focus().insertContent(markdown, { contentType: 'markdown' }).run();
		};
	}, [editor]);

	// The host replaced the text (a cancelled edit, a save the server normalised), or the editor was rebuilt: load
	// the text without echoing it back as a change, and without an undo step that would empty the editor.
	useEffect(() => {
		// A live editor's text is the shared document's: the host never replaces it.
		if (!editor || collaboration) {
			return;
		}
		const previousEditor = syncedEditor.current;
		syncedEditor.current = editor;
		const isRebuilt = previousEditor !== null && previousEditor !== editor;
		const hostReplacedValue = value !== lastEmitted.current;
		if (!hostReplacedValue && !isRebuilt) {
			return;
		}
		lastEmitted.current = value;
		const html = storedTextToEditorHtml(value);
		editor.chain().setMeta('addToHistory', false).setContent(html, { emitUpdate: false }).run();
	}, [collaboration, editor, value]);

	useEffect(() => {
		editor?.setEditable(!disabled);
	}, [editor, disabled]);

	const showUploadError = useCallback(
		(error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.editor.IMAGE_UPLOAD_FAILED'), { description: t(reasonKey) });
		},
		[t]
	);

	const uploadFiles = useCallback(
		async (files: File[], pos: number | null) => {
			if (!editor) {
				return;
			}
			const accepted: File[] = [];
			for (const file of files) {
				const problem = editorImageProblemOf(file);
				if (problem === 'type') {
					toast.warning(t('richEditor.images.TYPE_ERROR'), { id: IMAGE_TYPE_TOAST_ID });
				} else if (problem === 'size') {
					toast.warning(t('richEditor.images.SIZE_ERROR'), { id: IMAGE_SIZE_TOAST_ID });
				} else {
					accepted.push(file);
				}
			}
			if (accepted.length === 0) {
				return;
			}
			setUploading((count) => count + accepted.length);
			let at: number | null = pos;
			for (const file of accepted) {
				try {
					const asset = await createImageAssets(file, EDITOR_IMAGE_FOLDER);
					const src = asset.fullUrl;
					if (!src) {
						showUploadError(undefined);
						continue;
					}
					const node = { type: 'image', attrs: { src, alt: altTextOf(file) } };
					const target = blockBoundaryAfter(editor, at);
					at = null;
					editor.chain().focus().insertContentAt(target, node).run();
				} catch (error) {
					showUploadError(error);
				} finally {
					setUploading((count) => count - 1);
				}
			}
		},
		[createImageAssets, editor, showUploadError, t]
	);

	useEffect(() => {
		uploadRef.current = (files, pos) => void uploadFiles(files, pos);
	}, [uploadFiles]);

	const openAi = useCallback(() => {
		if (!editor || disabledRef.current) {
			return;
		}
		const { source, scope } = aiSourceOf(editor);
		const baseState: AiPanelState = {
			scope,
			source,
			mode: null,
			busy: false,
			result: null,
			resultHtml: '',
			error: null,
			setup: false
		};
		const needsSetup = !assist.isConfigured && !assist.isCheckingAvailability;
		if (needsSetup) {
			setAiState({ ...baseState, setup: true });
			return;
		}
		const length = source.trim().length;
		if (length < EDITOR_AI_MIN_CHARS) {
			toast.info(t('richEditor.ai.EMPTY_TEXT'), { id: AI_TEXT_LENGTH_TOAST_ID });
			return;
		}
		if (length > EDITOR_AI_MAX_CHARS) {
			toast.info(t('richEditor.ai.TOO_LONG', { max: EDITOR_AI_MAX_CHARS }), { id: AI_TEXT_LENGTH_TOAST_ID });
			return;
		}
		setAiState(baseState);
	}, [assist.isCheckingAvailability, assist.isConfigured, editor, t]);

	useEffect(() => {
		openAiRef.current = openAi;
	}, [openAi]);

	async function runAi(mode: TEditorAiMode, instruction?: string) {
		const current = aiState;
		if (!current) {
			return;
		}
		if (!editor || !ai) {
			return;
		}
		setAiState({ ...current, mode, busy: true, result: null, resultHtml: '', error: null });
		const result = await assist.run({
			mode,
			context: ai.context,
			text: current.source,
			instruction,
			title: ai.title
		});
		if (!result.ok && result.reason === 'aborted') {
			return;
		}
		if (!result.ok && result.reason === 'not_configured') {
			setAiState((state) => state && { ...closedAiState(state), setup: true });
			return;
		}
		if (!result.ok) {
			setAiState((state) => state && { ...state, busy: false, error: result.reason });
			return;
		}
		const resultHtml = proposalHtmlOf(editor, result.data.text);
		setAiState((state) => state && { ...state, busy: false, result: result.data, resultHtml });
	}

	function applyAi(how: 'replace' | 'insert') {
		if (!editor || !aiState?.result) {
			return;
		}
		const markdown = aiState.result.text.trim();
		const size = editor.state.doc.content.size;
		const scope = aiState.scope;
		if (how === 'replace' && scope) {
			const range = { from: Math.min(scope.from, size), to: Math.min(scope.to, size) };
			insertMarkdownAt(editor, range, markdown);
		} else if (how === 'replace') {
			editor.chain().focus().setContent(markdown, { contentType: 'markdown' }).run();
		} else {
			const at = insertionPointOf(editor, scope);
			editor.chain().focus().insertContentAt(at, markdown, { contentType: 'markdown' }).run();
		}
		setAiState(null);
	}

	function closeAi() {
		assist.cancel();
		setAiState(null);
		editor?.commands.focus();
	}

	function backToModes() {
		assist.cancel();
		setAiState((state) => state && closedAiState(state));
	}

	function saveAiConfig(config: ChatConfig) {
		assist.saveConfig(config);
		const source = aiState?.source ?? '';
		const hasEnoughText = source.trim().length >= EDITOR_AI_MIN_CHARS;
		if (!hasEnoughText) {
			setAiState(null);
			toast.info(t('richEditor.ai.EMPTY_TEXT'), { id: AI_TEXT_LENGTH_TOAST_ID });
			return;
		}
		setAiState((state) => state && { ...closedAiState(state), setup: false });
	}

	useImperativeHandle(
		ref,
		() => ({
			focus: (position) => {
				editor
					?.chain()
					.focus(position ?? 'end')
					.run();
			},
			get editor() {
				return editor;
			},
			isEmpty: () => editor?.isEmpty ?? true,
			openAi: () => openAiRef.current()
		}),
		[editor]
	);

	function focusEndOnEmptyArea(event: MouseEvent<HTMLDivElement>) {
		const isOnEmptyArea = event.target === event.currentTarget;
		if (!isOnEmptyArea || disabled) {
			return;
		}
		if (!editor) {
			return;
		}
		event.preventDefault();
		editor.chain().focus('end').run();
	}

	const isField = chrome === 'field';
	const isInvalidField = isField && Boolean(ariaInvalid);
	const toolbarEditor = toolbarEditorOf(toolbar, editor);
	const showsToolbarPlaceholder = toolbar && !editor;

	return (
		<div
			className={cn(
				'group/editor relative flex min-w-0 flex-col',
				isField && FIELD_CHROME,
				isInvalidField && FIELD_INVALID,
				disabled && 'opacity-60',
				className
			)}
			aria-busy={uploading > 0 || undefined}
		>
			{toolbarEditor && (
				<EditorToolbar
					editor={toolbarEditor}
					aiEnabled={aiEnabled}
					imagesEnabled={images}
					disabled={disabled}
					leading={toolbarLeading}
					onPickImage={pickImage}
					onAskAi={openAi}
				/>
			)}
			{showsToolbarPlaceholder && <ToolbarPlaceholder />}

			<div className="min-w-0 flex-1 cursor-text" onMouseDown={focusEndOnEmptyArea}>
				{editor && <EditorContent editor={editor} />}
				{!editor && (
					<div aria-hidden="true" className="px-3 py-2.5 text-sm text-muted-foreground/75">
						{resolvedPlaceholder}
					</div>
				)}
			</div>

			{editor && <BubbleToolbar editor={editor} aiEnabled={aiEnabled} onAskAi={openAi} actions={bubbleActions} />}

			<AnimatedHeight>
				{aiState && (
					<EditorAiPanel
						state={aiState}
						config={assist.config}
						onRun={(mode, instruction) => void runAi(mode, instruction)}
						onApply={applyAi}
						onBack={backToModes}
						onClose={closeAi}
						onSaveConfig={saveAiConfig}
					/>
				)}
			</AnimatedHeight>

			{uploading > 0 && (
				<p
					role="status"
					aria-live="polite"
					className="flex items-center gap-1.5 hairline-t border-border px-3 py-1.5 text-xs text-muted-foreground"
				>
					<Spinner className="size-3.5 animate-spin" aria-hidden="true" />
					{t('richEditor.images.UPLOADING', { count: uploading })}
				</p>
			)}

			{images && (
				<input
					ref={fileInputRef}
					type="file"
					accept={EDITOR_IMAGE_ACCEPT}
					multiple
					tabIndex={-1}
					aria-hidden="true"
					className="sr-only"
					onChange={(event) => {
						const files = imageFilesOf(event.target.files);
						event.target.value = '';
						if (files.length > 0) {
							void uploadFiles(files, null);
						}
					}}
				/>
			)}
		</div>
	);
});
