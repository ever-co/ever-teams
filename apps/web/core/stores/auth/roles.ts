import { TRole } from '@/core/types/schemas';
import { atom } from 'jotai';

export const rolesState = atom<TRole[]>([]);
