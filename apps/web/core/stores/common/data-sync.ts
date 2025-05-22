import { atom } from 'jotai';

export const isDataSyncState = atom<boolean>(true);

export const dataSyncModeState = atom<'REAL_TIME' | 'PULL'>('PULL');
