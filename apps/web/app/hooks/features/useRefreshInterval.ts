import { useEffect } from 'react';
import { useCallbackRef } from '../useCallbackRef';

export function useRefreshInterval(callback: any, delay: number, ...params: any[]) {
	// Remember the latest callback.
	const callbackRef = useCallbackRef(callback);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			callbackRef.current(...params);
		}

		// If already set do not execute it again,
		// to avoid multiple setInterval calls, multiple API call.
		if (delay !== null) {
			const id = setInterval(tick, delay);

			return () => clearInterval(id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delay]);
}
