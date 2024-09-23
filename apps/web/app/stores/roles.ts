import { IRole } from '@app/interfaces/';
import { atom } from 'jotai';

export const rolesState = atom<IRole[]>([]);
