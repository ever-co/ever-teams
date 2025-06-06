import { TUser } from '@/core/types/schemas';
import { atom } from 'jotai';

export const userState = atom<TUser | null>(null);
export const userDetailAccordion = atom<string>('');
export const stayOpen = atom<boolean>(false);
