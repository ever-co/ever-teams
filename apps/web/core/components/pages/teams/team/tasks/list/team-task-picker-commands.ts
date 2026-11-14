import type { TeamTaskPickerKind } from './team-tasks-list-context';

interface PickerCommand {
	kind: TeamTaskPickerKind;
	appliesToSelection: boolean;
	/** Only with the saved-views feature: the key, or its use on a selection, came with the platform's bulk update. */
	withRegistry?: 'command' | 'selection';
}

/** The commands that open a picker on the focused row (their keys are the bindings in force). */
const PICKER_COMMANDS: ReadonlyMap<string, PickerCommand> = new Map<string, PickerCommand>([
	['taskStatus', { kind: 'status', appliesToSelection: true }],
	['taskPriority', { kind: 'priority', appliesToSelection: true }],
	['taskLabels', { kind: 'labels', appliesToSelection: false }],
	['taskDueDate', { kind: 'dueDate', appliesToSelection: false, withRegistry: 'selection' }],
	['taskProject', { kind: 'project', appliesToSelection: true, withRegistry: 'command' }],
	['taskAssignee', { kind: 'assignees', appliesToSelection: true, withRegistry: 'command' }]
]);

/** The picker a command opens with the registry on or off: `null` when the command is not there without it. */
export function pickerOf(commandId: string, isRegistryOn: boolean) {
	const picker = PICKER_COMMANDS.get(commandId);
	if (!picker) {
		return null;
	}
	if (picker.withRegistry === 'command' && !isRegistryOn) {
		return null;
	}
	const appliesToSelection = picker.appliesToSelection || (picker.withRegistry === 'selection' && isRegistryOn);
	return { kind: picker.kind, appliesToSelection };
}

/** Whether a picker opened from a cell or the row menu applies to the selection the row is in. */
export function cellAppliesToSelection(kind: TeamTaskPickerKind, isRegistryOn: boolean) {
	if (kind === 'labels' || kind === 'issueType') {
		return false;
	}
	if (kind === 'dueDate') {
		// One due date for a whole selection came with the platform's bulk update.
		return isRegistryOn;
	}
	return true;
}
