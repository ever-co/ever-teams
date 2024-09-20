import { IRolePermissions } from '@app/interfaces/';
import { atom } from 'jotai';

export const rolePermissionsState = atom<IRolePermissions[]>([]);

export const rolePermissionsFormatedState = atom<{
  [key: string]: IRolePermissions;
}>({});
