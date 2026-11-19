import type { ActionSheetAction } from '../../../../components/action-sheet';

export type TaskCardLabel =
	| 'tasksScreen.editTaskLabel'
	| 'myWorkScreen.estimateLabel'
	| 'tasksScreen.assignTaskButton'
	| 'tasksScreen.unassignTaskLabel';

export interface TaskCardHandlers {
	editTitle: () => void;
	editEstimate: () => void;
	assign: () => void;
	unassign: () => void;
}

function assignmentActionOf(
	isAssigned: boolean,
	handlers: TaskCardHandlers,
	label: (key: TaskCardLabel) => string
): ActionSheetAction {
	if (isAssigned) {
		return { key: 'unassign', label: label('tasksScreen.unassignTaskLabel'), onPress: handlers.unassign };
	}
	return { key: 'assign', label: label('tasksScreen.assignTaskButton'), onPress: handlers.assign };
}

/** The actions of a task card's sheet on a person's Tasks tab, in the order of the menu it replaces. */
export function taskCardActionsOf(
	isAssigned: boolean,
	handlers: TaskCardHandlers,
	label: (key: TaskCardLabel) => string
): ActionSheetAction[] {
	return [
		{ key: 'edit-task', label: label('tasksScreen.editTaskLabel'), onPress: handlers.editTitle },
		{ key: 'estimate', label: label('myWorkScreen.estimateLabel'), onPress: handlers.editEstimate },
		assignmentActionOf(isAssigned, handlers, label)
	];
}
