import { IKanban } from '@/core/types/interfaces/IKanban';
import { atom } from 'jotai';

export const kanbanBoardState = atom<IKanban>({});
