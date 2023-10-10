import { IUser } from '@app/interfaces';
import { atom } from 'recoil';

export const collaborativeSelectState = atom<boolean>({
	key: 'collaborativeSelectState',
	default: false
});

export const collaborativeMembersState = atom<IUser[]>({
	key: 'collaborativeMembersState',
	default: []
});
