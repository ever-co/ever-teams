import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/** The saved query cache: the last known timer, day and tasks draw on the first frame, before the network answers. */
export const queryCacheStorage = new MMKV({ id: 'ever-teams.query-cache' });

export const queryPersister = createSyncStoragePersister({
	storage: {
		getItem: (key: string) => queryCacheStorage.getString(key) ?? null,
		setItem: (key: string, value: string) => queryCacheStorage.set(key, value),
		removeItem: (key: string) => queryCacheStorage.delete(key)
	}
});
