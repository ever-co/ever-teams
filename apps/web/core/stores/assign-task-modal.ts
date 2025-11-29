import { atom } from 'jotai';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

/**
 * Global state for AssignTaskModal
 * This ensures the modal survives when parent Popover components are unmounted
 *
 * The modal was previously closing immediately because it was rendered inside
 * a HeadlessUI Popover. When the Popover closed, the modal component was unmounted
 * and its local state was lost.
 */
export interface IAssignTaskModalState {
	isOpen: boolean;
	tasks: TTask[];
	userProfile: TOrganizationTeamEmployee | null;
	employeeId: string | null;
	onTaskClick?: (task: TTask, close: () => void) => void;
	onTaskCreated?: (task: TTask | undefined, close: () => void) => void;
}

export const assignTaskModalState = atom<IAssignTaskModalState>({
	isOpen: false,
	tasks: [],
	userProfile: null,
	employeeId: null,
	onTaskClick: undefined,
	onTaskCreated: undefined
});

