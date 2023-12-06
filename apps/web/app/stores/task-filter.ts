import { atom } from 'recoil';

export const taskBlockFilterState = atom<'all' | 'running' | 'online' | 'pause' | 'idle' | 'suspended'>({
	key: 'taskBlockFilterState',
	default: 'all'
});
