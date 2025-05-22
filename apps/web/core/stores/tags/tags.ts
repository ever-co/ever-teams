import { ITag } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const tagsState = atom<ITag[]>([]);
