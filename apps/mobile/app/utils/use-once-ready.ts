import { useEffect, useRef } from 'react';

/**
 * Runs `action` once, after the first render where something is pending and the screen is ready to show it: an effect
 * runs after its children mounted, so a message host rendered in that pass can already take the message.
 */
export function useOnceReady(pending: boolean, ready: boolean, action: () => void) {
	const done = useRef(false);
	useEffect(() => {
		const due = pending && ready && !done.current;
		if (!due) {
			return;
		}
		done.current = true;
		action();
	}, [pending, ready, action]);
}
