import { IRole } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const rolesState = atom<IRole[]>([]);
