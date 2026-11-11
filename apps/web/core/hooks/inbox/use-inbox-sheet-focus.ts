'use client';

import { useCallback, useEffect, useRef } from 'react';
import { isTextFieldFocused } from '@/core/lib/realtime/invalidation-scheduler';

/** The breakpoint from which the inbox shows its pane beside the list instead of the sheet over it. */
const LARGE_SCREEN = '(min-width: 1024px)';

/**
 * The focus of the inbox's sheet below the large breakpoint: the sheet takes the focus when it opens with an entry,
 * Escape closes it (not while typing an answer in it), and closing gives the focus back to what had it before, as a
 * rule the entry's row.
 *
 * @param entryId The entry the sheet shows, or null when it is closed.
 * @param onClose Closes the sheet.
 */
export function useInboxSheetFocus(entryId: string | null, onClose: () => void) {
	const sheetRef = useRef<HTMLDivElement | null>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);

	// The sheet takes the focus when it opens below the breakpoint, and when a window it is open in narrows below it.
	useEffect(() => {
		if (!entryId || typeof window === 'undefined') return;
		const largeScreen = window.matchMedia(LARGE_SCREEN);
		const takeFocus = () => {
			if (largeScreen.matches) return;
			const active = document.activeElement;
			if (active instanceof HTMLElement && !sheetRef.current?.contains(active)) returnFocusRef.current = active;
			sheetRef.current?.focus();
		};
		takeFocus();
		largeScreen.addEventListener('change', takeFocus);
		return () => largeScreen.removeEventListener('change', takeFocus);
	}, [entryId]);

	const close = useCallback(() => {
		onClose();
		const back = returnFocusRef.current;
		returnFocusRef.current = null;
		if (back?.isConnected) back.focus();
	}, [onClose]);

	// Escape is heard on the sheet itself (a dialog, not a control), wherever the focus is inside it.
	useEffect(() => {
		const sheet = sheetRef.current;
		if (!entryId || !sheet) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' || isTextFieldFocused(document)) return;
			event.stopPropagation();
			close();
		};
		sheet.addEventListener('keydown', onKeyDown);
		return () => sheet.removeEventListener('keydown', onKeyDown);
	}, [close, entryId]);

	return { sheetRef, close };
}
