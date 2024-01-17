import { atom } from 'recoil';

export const activityTypeState = atom<'DATE' | 'TICKET'>({
	key: 'activityTypeState',
	default: 'DATE'
});
