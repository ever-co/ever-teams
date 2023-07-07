import { IRolePermissions } from '@app/interfaces/';
import { atom } from 'recoil';

export const rolePermissionsState = atom<IRolePermissions[]>({
	key: 'rolePermissionsState',
	default: [],
});

export const rolePermissionsFormatedState = atom<{
	[key: string]: IRolePermissions;
}>({
	key: 'rolePermissionsFormatedState',
	default: {},
});
