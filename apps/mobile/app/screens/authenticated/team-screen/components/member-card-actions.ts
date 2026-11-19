import type { ActionSheetAction } from '../../../../components/action-sheet';

export type MemberCardLabel =
	| 'tasksScreen.editTaskLabel'
	| 'myWorkScreen.estimateLabel'
	| 'tasksScreen.assignTaskButton'
	| 'tasksScreen.unassignTaskLabel'
	| 'tasksScreen.makeManager'
	| 'tasksScreen.unMakeManager'
	| 'tasksScreen.remove';

/** What the person looking at a member card may do with it: the same rules as the menu it replaces. */
export interface MemberCardViewer {
	isAuthTeamManager: boolean;
	isAuthUser: boolean;
	isTeamCreator: boolean;
	isTeamManager: boolean;
	isTeamOwner: boolean;
	hasTask: boolean;
	hasTasksToAssign: boolean;
	hasActiveTask: boolean;
}

export interface MemberCardHandlers {
	editTask: () => void;
	editEstimate: () => void;
	assignTask: () => void;
	unassignTask: () => void;
	makeManager: () => void;
	unMakeManager: () => void;
	remove: () => void;
}

/** Whether the viewer may open the card's menu: a manager on any card, anyone on their own. */
export function canEditMemberWork(viewer: MemberCardViewer): boolean {
	return viewer.isAuthTeamManager || viewer.isAuthUser;
}

function canChangeRoleOf(viewer: MemberCardViewer): boolean {
	const managesSomeoneElse = viewer.isAuthTeamManager && !viewer.isAuthUser;
	return managesSomeoneElse && !viewer.isTeamCreator;
}

function roleActionOf(
	viewer: MemberCardViewer,
	handlers: MemberCardHandlers,
	label: (key: MemberCardLabel) => string
): ActionSheetAction {
	if (viewer.isTeamManager) {
		return { key: 'unmake-manager', label: label('tasksScreen.unMakeManager'), onPress: handlers.unMakeManager };
	}
	return { key: 'make-manager', label: label('tasksScreen.makeManager'), onPress: handlers.makeManager };
}

/** The actions of a member card's sheet, in the order of the menu it replaces. */
export function memberCardActionsOf(
	viewer: MemberCardViewer,
	handlers: MemberCardHandlers,
	label: (key: MemberCardLabel) => string
): ActionSheetAction[] {
	const actions: ActionSheetAction[] = [];
	const canEditWork = canEditMemberWork(viewer);
	const canEditTask = canEditWork && viewer.hasTask;
	const canAssign = canEditWork && viewer.hasTasksToAssign;
	const canUnassign = canEditWork && viewer.hasActiveTask;

	if (canEditTask) {
		actions.push(
			{ key: 'edit-task', label: label('tasksScreen.editTaskLabel'), onPress: handlers.editTask },
			{ key: 'estimate', label: label('myWorkScreen.estimateLabel'), onPress: handlers.editEstimate }
		);
	}
	if (canAssign) {
		actions.push({ key: 'assign', label: label('tasksScreen.assignTaskButton'), onPress: handlers.assignTask });
	}
	if (canUnassign) {
		actions.push({
			key: 'unassign',
			label: label('tasksScreen.unassignTaskLabel'),
			onPress: handlers.unassignTask
		});
	}
	if (canChangeRoleOf(viewer)) {
		actions.push(roleActionOf(viewer, handlers, label));
	}
	if (!viewer.isTeamOwner) {
		actions.push({
			key: 'remove',
			label: label('tasksScreen.remove'),
			onPress: handlers.remove,
			destructive: true
		});
	}
	return actions;
}

/** The card's menu shows to whoever may open it, and only with an action in it. */
export function showsMemberMenu(viewer: MemberCardViewer, actions: ActionSheetAction[]): boolean {
	const hasActions = actions.length > 0;
	return canEditMemberWork(viewer) && hasActions;
}
