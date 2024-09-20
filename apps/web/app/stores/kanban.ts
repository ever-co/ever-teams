import { IKanban } from '@app/interfaces/IKanban';
import { atom } from 'jotai';

export const kanbanBoardState = atom<IKanban>({});
