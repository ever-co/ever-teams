import { IUser } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const collaborativeSelectState = atom<boolean>(false);

export const collaborativeMembersState = atom<IUser[]>([]);
