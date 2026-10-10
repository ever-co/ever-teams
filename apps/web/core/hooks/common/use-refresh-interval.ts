'use client';

import { useEffect } from 'react';
import { useCallbackRef } from './use-callback-ref';
import { useAtom, useSetAtom } from 'jotai';
import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';

enum ESyncMode {
	PULL = 'PULL',
	REAL_TIME = 'REAL_TIME'
}

export function useRefreshIntervalV2(callback: any, delay: number, ...params: any[]) {
	const setDataSyncMode = useSetAtom(dataSyncModeState);
	const [isDataSync, setDataSync] = useAtom(isDataSyncState);
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
			console.error(error);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		// Define the function that will be executed
		const tick = () => {
			callbackRef.current(...params);
		};

		// Real-time push is not implemented yet, so both sync modes poll
		if (delay !== null && isDataSync) {
			const intervalId = setInterval(tick, delay);
			// Cleanup function to clear the interval when the component unmounts
			return () => clearInterval(intervalId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delay, isDataSync, ...params]); // Depend on `delay`, `isDataSync`, and `params` to restart the loop if any of these change
}
//  NodeJS.Timeout;
