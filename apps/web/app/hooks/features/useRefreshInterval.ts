'use client';

import { useEffect } from 'react';
import { useCallbackRef } from '../useCallbackRef';
import { useRecoilState } from 'recoil';
import { dataSyncModeState, isDataSyncState } from '@app/stores/data-sync';

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

enum ESyncMode {
	PULL = 'PULL',
	REAL_TIME = 'REAL_TIME'
}

export function useRefreshIntervalV2(callback: any, delay: number, ...params: any[]) {
	const [dataSyncMode, setDataSyncMode] = useRecoilState(dataSyncModeState);
	const [isDataSync, setDataSync] = useRecoilState(isDataSyncState);
	// Remember the latest callback.
	const callbackRef = useCallbackRef(callback);

	//  get Sync Mode from Local Storage
	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				setDataSync(JSON.parse(window.localStorage.getItem('conf-is-data-sync') || 'true'));
				setDataSyncMode((window.localStorage.getItem('conf-data-sync-mode') as ESyncMode) ?? 'PULL');
			}
		} catch (error) {
			console.log(error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		console.log('__LOAD ONCE__');
		// Define the function that will be executed
		const tick = () => {
			callbackRef.current(...params);
		};

		// Start the loop only if dataSyncMode is 'PULL'
		if (delay !== null && isDataSync && dataSyncMode === 'PULL') {
			console.log('__LOAD AGAIN__ [BY SYNC MODE]');
			const timeoutId = setTimeout(tick, delay);
			// Cleanup function to clear the timeout when the component unmounts
			return () => clearTimeout(timeoutId);
		} else if (isDataSync == true) {
			// If dataSyncMode is not 'PULL', execute the callback once immediately
			tick();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delay, isDataSync, dataSyncMode, ...params]); // Depend on `delay`, `isDataSync`, `dataSyncMode`, and `params` to restart the loop if any of these change
}
//  NodeJS.Timeout;
