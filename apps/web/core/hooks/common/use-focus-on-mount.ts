'use client';

import { RefObject, useCallback, useEffect, useRef } from 'react';

/**
 * Focuses an element when it mounts, as the `autoFocus` attribute does, for fields a user has just opened (a dialog's
 * first field, an inline editor). Returns a ref callback, so a field that appears later in an already mounted
 * component is focused too.
 */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
	return useCallback(
		(element: T | null) => {
			if (!element) {
				return;
			}
			if (!enabled) {
				return;
			}
			element.focus();
		},
		[enabled]
	);
}

/**
 * The same for a field that already has its own ref object and mounts with its component. Whether to focus is read
 * at mount only, like `autoFocus`: a later change of `enabled` does not move the focus.
 */
export function useFocusRefOnMount<T extends HTMLElement>(elementRef: RefObject<T | null>, enabled = true) {
	const focusesAtMount = useRef(enabled);
	useEffect(() => {
		if (!focusesAtMount.current) {
			return;
		}
		elementRef.current?.focus();
	}, [elementRef]);
}
