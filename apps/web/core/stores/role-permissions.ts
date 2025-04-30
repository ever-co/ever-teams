import { IRolePermissions } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const rolePermissionsState = atom<IRolePermissions[]>([]);

export const rolePermissionsFormatedState = atom<{
	[key: string]: IRolePermissions;
}>({});
