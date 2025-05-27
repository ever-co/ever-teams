import { atom } from 'jotai';
import { IKanban } from '../hooks/tasks/use-kanban';

export const kanbanBoardState = atom<IKanban>({});
