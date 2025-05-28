import { IRolePermission } from '@/core/types/interfaces/role/role-permission';
import { atom } from 'jotai';

export const rolePermissionsState = atom<IRolePermission[]>([]);

export const rolePermissionsFormatedState = atom<{
	[key: string]: IRolePermission;
}>({});
