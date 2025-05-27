import { IRole } from '@/core/types/interfaces/role/IRole';
import { atom } from 'jotai';

export const rolesState = atom<IRole[]>([]);
