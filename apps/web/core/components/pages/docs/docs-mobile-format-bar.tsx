'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { Bold, Comment, Heading2, Italic, ListBullet, ListTodo, Redo, Strikethrough, Undo, type IconComponent } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { keyboardInsetOf } from '@/core/lib/utils/docs-viewport';

/** A phone: a coarse pointer on a narrow screen. */
const PHONE_QUERY = '(pointer: coarse) and (max-width: 1023px)';

function useIsPhone(): boolean {
	const [isPhone, setIsPhone] = useState(false);
	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const query = window.matchMedia(PHONE_QUERY);
		const update = () => setIsPhone(query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);
	return isPhone;
}

/** The on-screen keyboard's height, followed as it opens, closes and the page scrolls under it. */
function useKeyboardInset(enabled: boolean): number {
	const [inset, setInset] = useState(0);
	useEffect(() => {
		const viewport = typeof window === 'undefined' ? null : window.visualViewport;
		if (!enabled || !viewport) return;
		const update = () => setInset(keyboardInsetOf(window.innerHeight, viewport));
		update();
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
		};
	}, [enabled]);
	return inset;
}

function stateOf(editor: Editor) {
	return {
		focused: editor.isFocused,
		editable: editor.isEditable,
		bold: editor.isActive('bold'),
		italic: editor.isActive('italic'),
		strike: editor.isActive('strike'),
		heading: editor.isActive('heading', { level: 2 }),
		bulletList: editor.isActive('bulletList'),
		taskList: editor.isActive('taskList'),
		// Live editing has the shared document's history, or none: the buttons follow what the editor has.
		hasHistory: typeof (editor.commands as unknown as Record<string, unknown>)['undo'] === 'function',
		canUndo: editor.can().undo?.() ?? false,
		canRedo: editor.can().redo?.() ?? false
	};
}

/**
 * The formatting row of a phone: while the page is being typed in, it sits right above the on-screen keyboard (the
 * toolbar at the top of the page is out of reach there), with the marks, a heading, the lists, a comment on the
 * selection, and undo / redo where the editor keeps the history.
 */
export function DocsMobileFormatBar({ editor, onComment }: Readonly<{ editor: Editor; onComment?: () => void }>) {
	const t = useTranslations();
	const isPhone = useIsPhone();
	const state = useEditorState({ editor, selector: ({ editor: current }) => stateOf(current) });
	const shows = isPhone && state.focused && state.editable;
	const inset = useKeyboardInset(shows);
	if (!shows) return null;

	// The press keeps the editor's focus (and the keyboard up): mousedown and touchstart are not let through.
	const tool = (icon: IconComponent, label: string, active: boolean, run: () => void, disabled = false) => {
		const Icon = icon;
		return (
			<button
				type="button"
				aria-label={label}
				aria-pressed={active}
				disabled={disabled}
				onMouseDown={(event) => event.preventDefault()}
				onTouchStart={(event) => event.preventDefault()}
				onTouchEnd={(event) => {
					event.preventDefault();
					if (!disabled) run();
				}}
				onClick={run}
				className={cn(
					'inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors active:bg-foreground/[0.08] disabled:opacity-40 [&_svg]:size-5',
					active && 'bg-foreground/[0.07] text-foreground'
				)}
			>
				<Icon aria-hidden="true" />
			</button>
		);
	};

	// On the page's body: the editor's own styles (its sticky toolbar row) and its scrolling box stay out of it.
	return createPortal(
		<div
			role="toolbar"
			aria-label={t('docs.FORMATTING')}
			data-docs-mobile-format-bar=""
			style={{ bottom: inset }}
			className="fixed inset-x-0 z-50 flex items-center gap-0.5 overflow-x-auto border-t border-border bg-background/95 px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur print:hidden"
		>
			{tool(Bold, t('richEditor.BOLD'), state.bold, () => editor.chain().focus().toggleBold().run())}
			{tool(Italic, t('richEditor.ITALIC'), state.italic, () => editor.chain().focus().toggleItalic().run())}
			{tool(Strikethrough, t('richEditor.STRIKETHROUGH'), state.strike, () => editor.chain().focus().toggleStrike().run())}
			{tool(Heading2, t('richEditor.HEADING_2'), state.heading, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
			{tool(ListBullet, t('richEditor.BULLET_LIST'), state.bulletList, () => editor.chain().focus().toggleBulletList().run())}
			{tool(ListTodo, t('richEditor.TODO_LIST'), state.taskList, () => editor.chain().focus().toggleTaskList().run())}
			{onComment && tool(Comment, t('docs.COMMENT'), false, onComment)}
			<span className="flex-1" />
			{state.hasHistory && tool(Undo, t('richEditor.UNDO'), false, () => editor.chain().focus().undo().run(), !state.canUndo)}
			{state.hasHistory && tool(Redo, t('richEditor.REDO'), false, () => editor.chain().focus().redo().run(), !state.canRedo)}
		</div>,
		document.body
	);
}
