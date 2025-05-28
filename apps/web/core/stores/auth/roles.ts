import { IRole } from '@/core/types/interfaces/role/role';
import { atom } from 'jotai';

export const rolesState = atom<IRole[]>([]);
