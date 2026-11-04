'use client';

import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Bold, InlineCode, Italic, Link, WritingHelp, Strikethrough, Underline } from '@/core/components/icons';
import { LinkForm, linkLabelOf, removeHandlerOf } from './link-form';
import { ToolButton, ToolDivider, useShortcutLabel } from './tool-button';

function selectionStateOf(editor: Editor) {
	const href = editor.getAttributes('link').href as string | undefined;
	return {
		bold: editor.isActive('bold'),
		italic: editor.isActive('italic'),
		underline: editor.isActive('underline'),
		strike: editor.isActive('strike'),
		code: editor.isActive('code'),
		link: editor.isActive('link'),
		href: href ?? '',
		inCodeBlock: editor.isActive('codeBlock')
	};
}

function hidesBubble(editor: Editor) {
	const isReadOnly = !editor.isEditable;
	const isOnImage = editor.isActive('image');
	const isInCodeBlock = editor.isActive('codeBlock');
	return isReadOnly || isOnImage || isInCodeBlock;
}

/** Shown over a selection, or with the caret inside a link so the link can be edited without selecting it. */
function shouldShowBubble({ editor, state }: { editor: Editor; state: EditorState }) {
	if (hidesBubble(editor)) {
		return false;
	}
	if (!state.selection.empty) {
		return true;
	}
	return editor.isActive('link');
}

/**
 * The toolbar over a selection (Notion's and Linear's gesture): inline marks, a link and the writing help, nothing
 * that changes the block. The link row is drawn inside the bubble: a layer elsewhere would take the focus, the editor
 * would blur and the bubble would close under the field it opened.
 */
export function BubbleToolbar({
	editor,
	aiEnabled,
	onAskAi
}: Readonly<{
	editor: Editor;
	aiEnabled: boolean;
	onAskAi: () => void;
}>) {
	const t = useTranslations();
	const shortcutLabel = useShortcutLabel();
	const [linkOpen, setLinkOpen] = useState(false);
	const state = useEditorState({ editor, selector: ({ editor: current }) => selectionStateOf(current) });

	const applyLink = (href: string) => {
		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		setLinkOpen(false);
	};

	const removeLink = () => {
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
		setLinkOpen(false);
	};

	const closeLinkForm = () => {
		setLinkOpen(false);
		editor.commands.focus();
	};

	const linkLabel = linkLabelOf(state.link, t('richEditor.EDIT_LINK'), t('richEditor.ADD_LINK'));
	const removeHandler = removeHandlerOf(state.link, removeLink);

	return (
		<BubbleMenu
			editor={editor}
			pluginKey="richEditorBubble"
			data-rich-editor-layer=""
			updateDelay={120}
			options={{ placement: 'top', offset: 8 }}
			shouldShow={shouldShowBubble}
			className="surface-raised z-[1000] flex items-center gap-0.5 rounded-xl p-1 text-popover-foreground"
		>
			{linkOpen && (
				<LinkForm initial={state.href} onApply={applyLink} onRemove={removeHandler} onCancel={closeLinkForm} />
			)}
			{!linkOpen && (
				<>
					<ToolButton
						icon={Bold}
						label={t('richEditor.BOLD')}
						shortcutLabel={shortcutLabel(['Mod', 'B'])}
						active={state.bold}
						disabled={state.inCodeBlock}
						onPress={() => editor.chain().focus().toggleBold().run()}
					/>
					<ToolButton
						icon={Italic}
						label={t('richEditor.ITALIC')}
						shortcutLabel={shortcutLabel(['Mod', 'I'])}
						active={state.italic}
						disabled={state.inCodeBlock}
						onPress={() => editor.chain().focus().toggleItalic().run()}
					/>
					<ToolButton
						icon={Underline}
						label={t('richEditor.UNDERLINE')}
						shortcutLabel={shortcutLabel(['Mod', 'U'])}
						active={state.underline}
						disabled={state.inCodeBlock}
						onPress={() => editor.chain().focus().toggleUnderline().run()}
					/>
					<ToolButton
						icon={Strikethrough}
						label={t('richEditor.STRIKETHROUGH')}
						shortcutLabel={shortcutLabel(['Mod', 'Shift', 'S'])}
						active={state.strike}
						disabled={state.inCodeBlock}
						onPress={() => editor.chain().focus().toggleStrike().run()}
					/>
					<ToolButton
						icon={InlineCode}
						label={t('richEditor.INLINE_CODE')}
						shortcutLabel={shortcutLabel(['Mod', 'E'])}
						active={state.code}
						disabled={state.inCodeBlock}
						onPress={() => editor.chain().focus().toggleCode().run()}
					/>
					<ToolButton icon={Link} label={linkLabel} active={state.link} onPress={() => setLinkOpen(true)} />
					{aiEnabled && (
						<>
							<ToolDivider />
							<ToolButton
								icon={WritingHelp}
								label={t('richEditor.ASK_AI_SELECTION')}
								onPress={onAskAi}
								className="text-primary-ink hover:text-primary-ink"
							/>
						</>
					)}
				</>
			)}
		</BubbleMenu>
	);
}
