import { TRolePermission } from '@/core/types/schemas/role/role-permission-schema';
import { atom } from 'jotai';

export const rolePermissionsState = atom<TRolePermission[]>([]);
export const myRolePermissionsState = atom<TRolePermission[]>([]);

export const rolePermissionsFormatedState = atom<{
	[key: string]: TRolePermission;
}>({});

export const myPermissionsState = atom<string[]>((get) => {
	const myRolePermissions = get(myRolePermissionsState);
	return myRolePermissions.map((item) => item.permission);
});
