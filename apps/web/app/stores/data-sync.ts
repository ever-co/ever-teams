import { atom } from 'recoil';

export const isDataSyncState = atom<boolean>({
	key: 'isDataSyncState',
	default: true
});

export const dataSyncModeState = atom<'REAL_TIME' | 'PULL'>({
	key: 'dataSyncModeState',
	default: 'PULL'
});
