import { useCallback, useEffect, useRef } from 'react';

/**
 * Numbers the openings of a dialog. Closing or unmounting it ends the opening, so an answer awaited by an earlier
 * one can be told apart and dropped: it never acts for a dialog the person already dismissed.
 */
export function useOpenSession(isOpen: boolean) {
	const sessionRef = useRef(0);

	useEffect(
		() => () => {
			sessionRef.current += 1;
		},
		[isOpen]
	);

	return useCallback(() => sessionRef.current, []);
}
