'use client';

import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';
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

	useEffect(() => {
		if (!entryId || typeof window === 'undefined' || window.matchMedia(LARGE_SCREEN).matches) return;
		const active = document.activeElement;
		if (active instanceof HTMLElement && !sheetRef.current?.contains(active)) returnFocusRef.current = active;
		sheetRef.current?.focus();
	}, [entryId]);

	const close = useCallback(() => {
		onClose();
		const back = returnFocusRef.current;
		returnFocusRef.current = null;
		if (back?.isConnected) back.focus();
	}, [onClose]);

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key !== 'Escape' || isTextFieldFocused(document)) return;
			event.stopPropagation();
			close();
		},
		[close]
	);

	return { sheetRef, close, onKeyDown };
}
