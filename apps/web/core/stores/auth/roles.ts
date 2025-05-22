import { IRole } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const rolesState = atom<IRole[]>([]);
