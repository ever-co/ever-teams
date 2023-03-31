import { useEffect, useRef } from 'react';

export function useRefreshInterval(callback: any, delay: number) {
	const savedCallback = useRef<any>();

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			savedCallback.current();
		}

		// If already set do not execute it again,
		// to avoid multiple setInterval calls, multiple API call.
		if (delay !== null) {
			let id = setInterval(tick, delay);

			return () => clearInterval(id);
		}
	}, [delay]);
}
