'use client';

import { type KeyboardEvent, useCallback } from 'react';
import { nextFocusIndex } from '@/core/lib/utils/inbox-entry';

/** The row element the keyboard walks: every row carries this attribute with its entry id. */
export const INBOX_ROW_ATTRIBUTE = 'data-inbox-row';

export interface InboxKeyboardHandlers {
	onOpen: (id: string) => void;
	onToggleSelect: (id: string) => void;
	onArchive: (id: string) => void;
	onSnooze: (id: string) => void;
	onToggleRead: (id: string) => void;
	onDone: (id: string) => void;
	onMarkAllRead: () => void;
}

/** Whether the key press happened in a field where letters are typed, not commands. */
function isTypingTarget(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	if (!element) return false;
	const tag = element.tagName?.toUpperCase();
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable === true;
}

/**
 * The list's keyboard: `J` / `K` (and the arrows) move between rows, `X` selects, `E` archives, `H` snoozes,
 * `U` toggles read, `D` marks done, `Enter` opens, `Shift+Escape` marks everything read. Letters are ignored
 * while a text field has the focus; the rows are buttons, so `Tab` still walks every control.
 */
export function useInboxKeyboard(handlers: InboxKeyboardHandlers) {
	return useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(`[${INBOX_ROW_ATTRIBUTE}]`));
			const active = document.activeElement as HTMLElement | null;
			const current = rows.findIndex((row) => row === active || row.contains(active));
			const focusedId = current >= 0 ? rows[current].getAttribute(INBOX_ROW_ATTRIBUTE) : null;
			const key = event.key;

			if (key === 'Escape' && event.shiftKey) {
				event.preventDefault();
				handlers.onMarkAllRead();
				return;
			}
			if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

			const lower = key.toLowerCase();
			if (key === 'ArrowDown' || lower === 'j' || key === 'ArrowUp' || lower === 'k') {
				if (!rows.length) return;
				event.preventDefault();
				const direction = key === 'ArrowDown' || lower === 'j' ? 1 : -1;
				rows[nextFocusIndex(current, rows.length, direction)]?.focus();
				return;
			}
			if (!focusedId) return;
			const actions: Record<string, (id: string) => void> = {
				x: handlers.onToggleSelect,
				e: handlers.onArchive,
				h: handlers.onSnooze,
				u: handlers.onToggleRead,
				d: handlers.onDone
			};
			if (key === 'Enter' && event.target === rows[current]) {
				event.preventDefault();
				handlers.onOpen(focusedId);
				return;
			}
			const action = actions[lower];
			if (action) {
				event.preventDefault();
				action(focusedId);
			}
		},
		[handlers]
	);
}
