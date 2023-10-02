import { atom } from 'recoil';

// TODO Type
export const integrationState = atom<any[]>({
	key: 'integrationState',
	default: [],
});
