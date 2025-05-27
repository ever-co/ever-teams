import { ITag } from '@/core/types/interfaces/tag/ITag';
import { atom } from 'jotai';

export const tagsState = atom<ITag[]>([]);
