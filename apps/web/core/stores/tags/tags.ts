import { ITag } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const tagsState = atom<ITag[]>([]);
