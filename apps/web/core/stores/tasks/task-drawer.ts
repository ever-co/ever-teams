import { atom } from 'jotai';

export interface TaskDrawerState {
	taskId: string | null;
	isOpen: boolean;
	sequence: string[];
	openedOn: string | null;
}

/**
 * The task drawer opened from any task card of the app. The id is kept after closing so the panel keeps its
 * content while it slides out; `sequence` is the list the task was opened from (a board lane), for the previous and
 * next arrows; `openedOn` is the page it was opened on, which it closes when left.
 */
export const taskDrawerState = atom<TaskDrawerState>({
	taskId: null,
	isOpen: false,
	sequence: [],
	openedOn: null
});
