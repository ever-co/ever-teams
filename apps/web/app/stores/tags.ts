import { ITag } from '@app/interfaces/';
import { atom } from 'jotai';

export const tagsState = atom<ITag[]>([]);
