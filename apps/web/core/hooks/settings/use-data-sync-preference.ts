'use client';

import { useCallback, useState } from 'react';
import { useSetAtom } from 'jotai';
import { isDataSyncState } from '@/core/stores/common/data-sync';
import {
	DataSyncMode,
	readStoredDataSync,
	readStoredDataSyncMode,
	writeStoredDataSync
} from '@/core/lib/utils/settings-data-sync';

function storedDataSync(): boolean {
	try {
		return readStoredDataSync(window.localStorage);
	} catch {
		return true;
	}
}

function storedDataSyncMode(): DataSyncMode {
	try {
		return readStoredDataSyncMode(window.localStorage);
	} catch {
		return 'PULL';
	}
}

/** Read from the storage here: the atoms keep their defaults until the polling page reads it. */
export function useDataSyncPreference() {
	const setIsDataSyncAtom = useSetAtom(isDataSyncState);
	const [isDataSync, setIsDataSync] = useState(storedDataSync);
	const [mode] = useState(storedDataSyncMode);

	const changeDataSync = useCallback(
		(isOn: boolean) => {
			setIsDataSync(isOn);
			setIsDataSyncAtom(isOn);
			try {
				writeStoredDataSync(window.localStorage, isOn);
				return true;
			} catch {
				return false;
			}
		},
		[setIsDataSyncAtom]
	);

	return { isDataSync, mode, changeDataSync };
}
