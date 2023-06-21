import { IRole } from '@app/interfaces/';
import { atom } from 'recoil';

export const rolesState = atom<IRole[]>({
	key: 'rolesState',
	default: [],
});
