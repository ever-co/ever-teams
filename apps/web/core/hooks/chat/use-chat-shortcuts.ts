'use client';

import { useEffect, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import { chordOfEvent, isDialogOpen, isTypingTarget } from '@/core/lib/keyboard/shortcuts';
import { chatShortcutOf, type ChatShortcutId } from '@/core/lib/utils/chat-shortcuts';

export type ChatShortcutHandlers = Partial<Record<ChatShortcutId, () => void>>;

/**
 * The chat page's keys (`Alt+↑/↓` previous / next conversation, `Alt+Shift+↑/↓` previous / next unread, `Mod+Shift+A`
 * Unreads, `Shift+Escape` mark all read) with the bindings in force: the registry's commands, which the person can
 * rebind in the shortcuts help, matched here as the task list matches its own keys (the registry's listener runs no
 * command without a handler, so nothing fires twice). They work in the composer too, except a plain key; never while
 * a dialog is open.
 */
export function useChatShortcuts(handlers: ChatShortcutHandlers, enabled = true): void {
	const { bindings } = useKeyboardPreferences();
	const latest = useRef(handlers);
	useIsomorphicLayoutEffect(() => {
		latest.current = handlers;
	});

	useEffect(() => {
		if (!enabled || typeof window === 'undefined') return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			const chord = chordOfEvent(event);
			if (!chord) return;
			const id = chatShortcutOf(chord, bindings, isTypingTarget(event.target));
			if (!id || isDialogOpen(document)) return;
			const run = latest.current[id];
			if (!run) return;
			event.preventDefault();
			run();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [bindings, enabled]);
}
