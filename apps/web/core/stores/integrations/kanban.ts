import { IKanban } from '@/core/types/interfaces/to-review/IKanban';
import { atom } from 'jotai';

export const kanbanBoardState = atom<IKanban>({});
