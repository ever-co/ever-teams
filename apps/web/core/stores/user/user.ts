import { IUser } from '@/core/types/interfaces/user/user';
import { atom } from 'jotai';

export const userState = atom<IUser | null>(null);
export const userDetailAccordion = atom<string>('');
export const stayOpen = atom<boolean>(false);
