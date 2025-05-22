import { IRolePermissions } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const rolePermissionsState = atom<IRolePermissions[]>([]);

export const rolePermissionsFormatedState = atom<{
	[key: string]: IRolePermissions;
}>({});
