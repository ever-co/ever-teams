import { IUser } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const collaborativeSelectState = atom<boolean>(false);

export const collaborativeMembersState = atom<IUser[]>([]);
