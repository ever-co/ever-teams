export type DataSyncMode = 'REAL_TIME' | 'PULL';

export const DATA_SYNC_STORAGE_KEY = 'conf-is-data-sync';

export const DATA_SYNC_MODE_STORAGE_KEY = 'conf-data-sync-mode';

/** The settings page once wrote the mode here (JSON-quoted) while the reader looked under the key above. */
const LEGACY_DATA_SYNC_MODE_STORAGE_KEY = 'conf-data-sync';

export function parseStoredDataSync(raw: string | null): boolean {
	if (raw === null) {
		return true;
	}
	return raw !== 'false';
}

export function parseStoredDataSyncMode(raw: string | null): DataSyncMode {
	if (!raw) {
		return 'PULL';
	}
	const unquoted = raw.replace(/"/g, '');
	if (unquoted === 'REAL_TIME') {
		return 'REAL_TIME';
	}
	return 'PULL';
}

export function readStoredDataSync(storage: Storage): boolean {
	const raw = storage.getItem(DATA_SYNC_STORAGE_KEY);
	return parseStoredDataSync(raw);
}

export function readStoredDataSyncMode(storage: Storage): DataSyncMode {
	const current = storage.getItem(DATA_SYNC_MODE_STORAGE_KEY);
	if (current) {
		return parseStoredDataSyncMode(current);
	}
	const legacy = storage.getItem(LEGACY_DATA_SYNC_MODE_STORAGE_KEY);
	return parseStoredDataSyncMode(legacy);
}

export function writeStoredDataSync(storage: Storage, isOn: boolean) {
	const serialized = JSON.stringify(isOn);
	storage.setItem(DATA_SYNC_STORAGE_KEY, serialized);
}

export function writeStoredDataSyncMode(storage: Storage, mode: DataSyncMode) {
	storage.setItem(DATA_SYNC_MODE_STORAGE_KEY, mode);
}
