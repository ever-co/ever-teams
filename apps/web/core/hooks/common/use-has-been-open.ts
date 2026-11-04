'use client';

import { useState } from 'react';

/**
 * True from the first time `isOpen` is true, and from then on: a dialog rendered only after it first opened
 * costs nothing while it has never been needed, and still plays its closing transition afterwards.
 */
export function useHasBeenOpen(isOpen: boolean | undefined): boolean {
	const isOpenNow = Boolean(isOpen);
	const [hasBeenOpen, setHasBeenOpen] = useState(isOpenNow);
	if (isOpenNow && !hasBeenOpen) {
		setHasBeenOpen(true);
	}
	return hasBeenOpen || isOpenNow;
}
