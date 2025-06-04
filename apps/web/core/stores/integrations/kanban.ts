import { atom } from 'jotai';
import { IKanban } from '@/core/hooks/tasks/use-kanban';

export const kanbanBoardState = atom<IKanban>({});
