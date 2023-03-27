import { OTRefreshIntervalState } from '@app/stores';
import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';

export function useOTRefreshInterval(callback: any, delay: number) {
	const [interval, setOTRefreshIntervalState] = useRecoilState(
		OTRefreshIntervalState
	);

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
		if (delay !== null && !interval) {
			let id = setInterval(tick, delay);
			setOTRefreshIntervalState(id as any);

			return () => clearInterval(id);
		}
	}, [delay]);
}
