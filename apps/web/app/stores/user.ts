import { IUser } from '@app/interfaces/IUserData';
import { atom } from 'jotai';

export const userState = atom<IUser | null>(null);
export const userDetailAccordion = atom<string>('');
