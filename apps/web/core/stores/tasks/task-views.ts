import { atom } from 'jotai';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * The tasks of the open view that are not the active team's (a built-in view lists the person's tasks across
 * teams): the pickers and the row menu find them here when the team's list does not hold them.
 */
export const viewTasksState = atom<TTask[]>([]);
