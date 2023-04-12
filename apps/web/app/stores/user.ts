import { IUser } from '@app/interfaces/IUserData';
import { atom } from 'recoil';

export const userState = atom<IUser | null>({
	key: 'userState',
	default: null,
});
