import { IRolePermission } from '@/core/types/interfaces/role/IRolePermission';
import { atom } from 'jotai';

export const rolePermissionsState = atom<IRolePermission[]>([]);

export const rolePermissionsFormatedState = atom<{
	[key: string]: IRolePermission;
}>({});
