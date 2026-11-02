'use client';

import type { ChainedCommands, Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { DictationButton } from '@/core/components/common/dictation-button';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Check,
	CodeBlock,
	Copy,
	Heading1,
	Heading2,
	Heading3,
	ImagePlus,
	InlineCode,
	Italic,
	Link,
	ListBullet,
	ListNumbered,
	ListTodo,
	Minus,
	Quote,
	Redo,
	Smile,
	WritingHelp,
	Strikethrough,
	Underline,
	Undo
} from '@/core/components/icons';
import { LazyEmojiPicker } from '@/core/components/common/lazy-emoji-picker';
import { cn } from '@/core/lib/helpers';
import { LinkForm, linkLabelOf, removeHandlerOf } from './link-form';
import type { TTextAlignment } from './text-align-extension';
import { ToolButton, ToolDivider, useShortcutLabel } from './tool-button';

const COPIED_FEEDBACK_MS = 1500;

type ToolbarState = {
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	code: boolean;
	h1: boolean;
	h2: boolean;
	h3: boolean;
	bullet: boolean;
	ordered: boolean;
	task: boolean;
	quote: boolean;
	codeBlock: boolean;
	link: boolean;
	href: string;
	alignment: TTextAlignment | null;
	canUndo: boolean;
	canRedo: boolean;
	emptySelection: boolean;
};

function alignmentAt(editor: Editor): TTextAlignment | null {
	const alignments: TTextAlignment[] = ['center', 'right', 'justify', 'left'];
	const active = alignments.find((alignment) => editor.isActive({ textAlign: alignment }));
	return active ?? null;
}

function toolbarStateOf(editor: Editor): ToolbarState {
	const href = editor.getAttributes('link').href as string | undefined;
	return {
		bold: editor.isActive('bold'),
		italic: editor.isActive('italic'),
		underline: editor.isActive('underline'),
		strike: editor.isActive('strike'),
		code: editor.isActive('code'),
		h1: editor.isActive('heading', { level: 1 }),
		h2: editor.isActive('heading', { level: 2 }),
		h3: editor.isActive('heading', { level: 3 }),
		bullet: editor.isActive('bulletList'),
		ordered: editor.isActive('orderedList'),
		task: editor.isActive('taskList'),
		quote: editor.isActive('blockquote'),
		codeBlock: editor.isActive('codeBlock'),
		link: editor.isActive('link'),
		href: href ?? '',
		alignment: alignmentAt(editor),
		canUndo: editor.can().undo(),
		canRedo: editor.can().redo(),
		emptySelection: editor.state.selection.empty
	};
}

function copyButtonOf(copied: boolean, copiedLabel: string, copyLabel: string) {
	if (copied) {
		return { icon: Check, label: copiedLabel };
	}
	return { icon: Copy, label: copyLabel };
}

function linkTextOf(href: string) {
	return href.replace(/^https?:\/\//, '');
}

function useCopiedFeedback() {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);
	const flash = () => {
		setCopied(true);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
	};
	return { copied, flash };
}

/** The emoji picker floats under the toolbar, inside the editor: a portal would leave a dialog that hosts it. */
function EmojiPanel({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
	const { resolvedTheme } = useTheme();
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const closeOnOutsidePress = (event: MouseEvent) => {
			const target = event.target as Node;
			const isInside = panelRef.current?.contains(target);
			if (!isInside) {
				onClose();
			}
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('mousedown', closeOnOutsidePress);
		document.addEventListener('keydown', closeOnEscape);
		return () => {
			document.removeEventListener('mousedown', closeOnOutsidePress);
			document.removeEventListener('keydown', closeOnEscape);
		};
	}, [onClose]);

	return (
		<div ref={panelRef} className="absolute top-full right-0 z-[1000] mt-1">
			<LazyEmojiPicker
				onEmojiSelect={(emoji: { native: string }) => onPick(emoji.native)}
				theme={resolvedTheme}
				previewPosition="none"
				skinTonePosition="none"
				maxFrequentRows={1}
				autoFocus
			/>
		</div>
	);
}

/**
 * The fixed formatting row above a description: the same blocks as the "/" menu, in the same order, so learning one
 * teaches the other. Headings, alignment and the rarer blocks wait for wider screens; the "/" menu has them all.
 */
export function EditorToolbar({
	editor,
	aiEnabled,
	imagesEnabled,
	disabled,
	leading,
	onPickImage,
	onAskAi
}: {
	editor: Editor;
	aiEnabled: boolean;
	imagesEnabled: boolean;
	disabled: boolean;
	leading?: ReactNode;
	onPickImage: () => void;
	onAskAi: () => void;
}) {
	const t = useTranslations();
	const shortcutLabel = useShortcutLabel();
	const [linkOpen, setLinkOpen] = useState(false);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const { copied, flash } = useCopiedFeedback();
	const state = useEditorState({ editor, selector: ({ editor: current }) => toolbarStateOf(current) });

	const run = (command: (chain: ChainedCommands) => ChainedCommands) => {
		command(editor.chain().focus()).run();
	};

	const toggleAlignment = (alignment: TTextAlignment) => {
		const isActive = state.alignment === alignment;
		if (isActive) {
			run((chain) => chain.unsetTextAlign());
			return;
		}
		run((chain) => chain.setTextAlign(alignment));
	};

	const applyLink = (href: string) => {
		const insertsAddress = state.emptySelection && !state.link;
		if (insertsAddress) {
			const text = linkTextOf(href);
			editor
				.chain()
				.focus()
				.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
				.run();
		} else {
			editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		}
		setLinkOpen(false);
	};

	const removeLink = () => {
		run((chain) => chain.extendMarkRange('link').unsetLink());
		setLinkOpen(false);
	};

	const closeLinkForm = () => {
		setLinkOpen(false);
		editor.commands.focus();
	};

	const insertEmoji = (emoji: string) => {
		editor.chain().focus().insertContent(emoji).run();
		setEmojiOpen(false);
	};

	/** Inserted as a text node, never parsed as HTML: dictated words can hold no markup. */
	const insertDictation = (text: string) => {
		const dictated = `${text} `;
		editor.chain().focus().insertContent({ type: 'text', text: dictated }).run();
	};

	const copyText = async () => {
		const text = editor.getText({ blockSeparator: '\n' });
		try {
			await navigator.clipboard.writeText(text);
			flash();
		} catch {
			// The browser refused the clipboard (permission or an insecure origin): nothing to undo.
		}
	};

	if (linkOpen) {
		const removeHandler = removeHandlerOf(state.link, removeLink);
		return (
			<div className="flex min-h-10 items-center gap-1 hairline-b border-border px-1.5 py-1">
				<LinkForm initial={state.href} onApply={applyLink} onRemove={removeHandler} onCancel={closeLinkForm} />
			</div>
		);
	}

	const markDisabled = disabled || state.codeBlock;
	const linkLabel = linkLabelOf(state.link, t('richEditor.EDIT_LINK'), t('richEditor.ADD_LINK'));
	const copyButton = copyButtonOf(copied, t('richEditor.COPIED'), t('richEditor.COPY_TEXT'));

	return (
		<div
			role="toolbar"
			aria-label={t('richEditor.TOOLBAR')}
			className="relative flex min-h-10 flex-wrap items-center gap-0.5 hairline-b border-border px-1.5 py-1"
		>
			{leading}
			<span className="hidden items-center gap-0.5 md:flex">
				<ToolButton
					icon={Heading1}
					label={t('richEditor.HEADING_1')}
					active={state.h1}
					disabled={disabled}
					onPress={() => run((chain) => chain.toggleHeading({ level: 1 }))}
				/>
				<ToolButton
					icon={Heading2}
					label={t('richEditor.HEADING_2')}
					active={state.h2}
					disabled={disabled}
					onPress={() => run((chain) => chain.toggleHeading({ level: 2 }))}
				/>
				<ToolButton
					icon={Heading3}
					label={t('richEditor.HEADING_3')}
					active={state.h3}
					disabled={disabled}
					onPress={() => run((chain) => chain.toggleHeading({ level: 3 }))}
				/>
				<ToolDivider />
			</span>
			<ToolButton
				icon={Bold}
				label={t('richEditor.BOLD')}
				shortcutLabel={shortcutLabel(['Mod', 'B'])}
				active={state.bold}
				disabled={markDisabled}
				onPress={() => run((chain) => chain.toggleBold())}
			/>
			<ToolButton
				icon={Italic}
				label={t('richEditor.ITALIC')}
				shortcutLabel={shortcutLabel(['Mod', 'I'])}
				active={state.italic}
				disabled={markDisabled}
				onPress={() => run((chain) => chain.toggleItalic())}
			/>
			<ToolButton
				icon={Underline}
				label={t('richEditor.UNDERLINE')}
				shortcutLabel={shortcutLabel(['Mod', 'U'])}
				active={state.underline}
				disabled={markDisabled}
				onPress={() => run((chain) => chain.toggleUnderline())}
			/>
			<ToolButton
				icon={Strikethrough}
				label={t('richEditor.STRIKETHROUGH')}
				shortcutLabel={shortcutLabel(['Mod', 'Shift', 'S'])}
				active={state.strike}
				disabled={markDisabled}
				onPress={() => run((chain) => chain.toggleStrike())}
			/>
			<ToolButton
				icon={InlineCode}
				label={t('richEditor.INLINE_CODE')}
				shortcutLabel={shortcutLabel(['Mod', 'E'])}
				active={state.code}
				disabled={markDisabled}
				onPress={() => run((chain) => chain.toggleCode())}
			/>
			<ToolDivider />
			<ToolButton
				icon={ListBullet}
				label={t('richEditor.BULLET_LIST')}
				active={state.bullet}
				disabled={disabled}
				onPress={() => run((chain) => chain.toggleBulletList())}
			/>
			<ToolButton
				icon={ListNumbered}
				label={t('richEditor.NUMBERED_LIST')}
				active={state.ordered}
				disabled={disabled}
				onPress={() => run((chain) => chain.toggleOrderedList())}
			/>
			<ToolButton
				icon={ListTodo}
				label={t('richEditor.TODO_LIST')}
				active={state.task}
				disabled={disabled}
				onPress={() => run((chain) => chain.toggleTaskList())}
			/>
			<span className="hidden items-center gap-0.5 md:flex">
				<ToolDivider />
				<ToolButton
					icon={Quote}
					label={t('richEditor.QUOTE')}
					active={state.quote}
					disabled={disabled}
					onPress={() => run((chain) => chain.toggleBlockquote())}
				/>
				<ToolButton
					icon={CodeBlock}
					label={t('richEditor.CODE_BLOCK')}
					active={state.codeBlock}
					disabled={disabled}
					onPress={() => run((chain) => chain.toggleCodeBlock())}
				/>
				<ToolButton
					icon={Minus}
					label={t('richEditor.DIVIDER')}
					disabled={disabled}
					onPress={() => run((chain) => chain.setHorizontalRule())}
				/>
				<ToolDivider />
				<ToolButton
					icon={AlignLeft}
					label={t('richEditor.ALIGN_LEFT')}
					active={state.alignment === 'left'}
					disabled={disabled}
					onPress={() => toggleAlignment('left')}
				/>
				<ToolButton
					icon={AlignCenter}
					label={t('richEditor.ALIGN_CENTER')}
					active={state.alignment === 'center'}
					disabled={disabled}
					onPress={() => toggleAlignment('center')}
				/>
				<ToolButton
					icon={AlignRight}
					label={t('richEditor.ALIGN_RIGHT')}
					active={state.alignment === 'right'}
					disabled={disabled}
					onPress={() => toggleAlignment('right')}
				/>
				<ToolButton
					icon={AlignJustify}
					label={t('richEditor.ALIGN_JUSTIFY')}
					active={state.alignment === 'justify'}
					disabled={disabled}
					onPress={() => toggleAlignment('justify')}
				/>
			</span>
			<ToolDivider />
			<ToolButton
				icon={Link}
				label={linkLabel}
				active={state.link}
				disabled={disabled}
				onPress={() => setLinkOpen(true)}
			/>
			{imagesEnabled && (
				<ToolButton
					icon={ImagePlus}
					label={t('richEditor.ADD_IMAGE')}
					disabled={disabled}
					onPress={onPickImage}
				/>
			)}
			<ToolButton
				icon={Smile}
				label={t('richEditor.EMOJI')}
				active={emojiOpen}
				disabled={disabled}
				onPress={() => setEmojiOpen((open) => !open)}
			/>
			{aiEnabled && (
				<>
					<ToolDivider />
					<ToolButton
						icon={WritingHelp}
						label={t('richEditor.ASK_AI')}
						disabled={disabled}
						onPress={onAskAi}
						className="text-primary-ink hover:text-primary-ink"
					/>
				</>
			)}
			<DictationButton onText={insertDictation} disabled={disabled} />
			<span className="ml-auto flex items-center gap-0.5">
				<ToolButton icon={copyButton.icon} label={copyButton.label} onPress={() => void copyText()} />
				<ToolButton
					icon={Undo}
					label={t('richEditor.UNDO')}
					shortcutLabel={shortcutLabel(['Mod', 'Z'])}
					disabled={disabled || !state.canUndo}
					onPress={() => run((chain) => chain.undo())}
				/>
				<ToolButton
					icon={Redo}
					label={t('richEditor.REDO')}
					shortcutLabel={shortcutLabel(['Mod', 'Shift', 'Z'])}
					disabled={disabled || !state.canRedo}
					onPress={() => run((chain) => chain.redo())}
				/>
			</span>
			{emojiOpen && <EmojiPanel onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
		</div>
	);
}

export function ToolbarPlaceholder({ className }: { className?: string }) {
	return <div aria-hidden="true" className={cn('min-h-10 hairline-b border-border', className)} />;
}
