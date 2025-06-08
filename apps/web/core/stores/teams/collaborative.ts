import { TUser } from '@/core/types/schemas';
import { atom } from 'jotai';

export const collaborativeSelectState = atom<boolean>(false);

export const collaborativeMembersState = atom<TUser[]>([]);
