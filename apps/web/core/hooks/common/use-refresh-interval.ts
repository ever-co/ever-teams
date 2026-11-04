'use client';

import { useEffect } from 'react';
import { useCallbackRef } from './use-callback-ref';
import { useAtom, useSetAtom } from 'jotai';
import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';
import { readStoredDataSync, readStoredDataSyncMode } from '@/core/lib/utils/settings-data-sync';

export function useRefreshIntervalV2(callback: any, delay: number, ...params: any[]) {
	const setDataSyncMode = useSetAtom(dataSyncModeState);
	const [isDataSync, setDataSync] = useAtom(isDataSyncState);
	// Remember the latest callback.
	const callbackRef = useCallbackRef(callback);

	//  get Sync Mode from Local Storage
	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				const storedIsOn = readStoredDataSync(window.localStorage);
				const storedMode = readStoredDataSyncMode(window.localStorage);
				setDataSync(storedIsOn);
				setDataSyncMode(storedMode);
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
