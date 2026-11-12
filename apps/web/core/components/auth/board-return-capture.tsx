'use client';

import { useEffect } from 'react';
import { rememberBoardReturn } from '@/core/lib/auth/board-return';

/**
 * Keeps the Board address an auth page was opened with (`?redirect=`, sent by the Board app's sign-in link) for the
 * end of the sign-in, which may happen on another page of the flow (core/lib/auth/board-return.ts). Renders nothing.
 */
export function BoardReturnCapture() {
	useEffect(() => {
		rememberBoardReturn(window.location.search);
	}, []);

	return null;
}
