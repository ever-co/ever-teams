import {
	ETaskAutomationAction,
	ETaskAutomationCondition,
	ETaskAutomationRunOutcome,
	ETaskAutomationStatusCategory,
	ETaskAutomationTrigger,
	type ITaskAutomationAction,
	type ITaskAutomationCondition,
	type ITaskAutomationRule,
	type ITaskAutomationRuleCreateInput,
	type ITaskAutomationTemplate,
	TASK_AUTOMATION_LIMITS
} from '@/core/types/interfaces/common/task-automation';

/**
 * The form of Settings → Automations ↔ the platform's rule: a rule is read into an editable draft (every list item
 * keeps a key of its own, every action keeps all its fields so switching its type back loses nothing), checked, and
 * written back as exactly the fields the platform takes for each type.
 */

/** The triggers the editor offers, in the order it lists them. */
export const TASK_AUTOMATION_TRIGGERS: readonly ETaskAutomationTrigger[] = [
	ETaskAutomationTrigger.STATUS_CHANGED,
	ETaskAutomationTrigger.TASK_ASSIGNED,
	ETaskAutomationTrigger.TASK_CREATED,
	ETaskAutomationTrigger.ALL_SUBTASKS_DONE,
	ETaskAutomationTrigger.SUBTASK_REOPENED,
	ETaskAutomationTrigger.DUE_DATE_PASSED,
	ETaskAutomationTrigger.LINK_CLOSED
];

export const TASK_AUTOMATION_CONDITIONS: readonly ETaskAutomationCondition[] = [
	ETaskAutomationCondition.STATUS_IS,
	ETaskAutomationCondition.STATUS_IS_NOT,
	ETaskAutomationCondition.STATUS_CATEGORY_IS,
	ETaskAutomationCondition.IS_OPEN,
	ETaskAutomationCondition.IS_DONE,
	ETaskAutomationCondition.PRIORITY_IS,
	ETaskAutomationCondition.HAS_LABEL,
	ETaskAutomationCondition.NOT_HAS_LABEL,
	ETaskAutomationCondition.IS_ASSIGNED,
	ETaskAutomationCondition.IS_UNASSIGNED,
	ETaskAutomationCondition.ASSIGNEE_IS,
	ETaskAutomationCondition.IS_SUBTASK,
	ETaskAutomationCondition.IS_NOT_SUBTASK,
	ETaskAutomationCondition.TITLE_CONTAINS
];

export const TASK_AUTOMATION_ACTIONS: readonly ETaskAutomationAction[] = [
	ETaskAutomationAction.SET_STATUS,
	ETaskAutomationAction.SET_PRIORITY,
	ETaskAutomationAction.ADD_ASSIGNEES,
	ETaskAutomationAction.SET_ASSIGNEES,
	ETaskAutomationAction.ADD_LABELS,
	ETaskAutomationAction.REMOVE_LABELS,
	ETaskAutomationAction.NOTIFY_ASSIGNEES
];

export const TASK_AUTOMATION_CATEGORIES: readonly ETaskAutomationStatusCategory[] = [
	ETaskAutomationStatusCategory.TODO,
	ETaskAutomationStatusCategory.IN_PROGRESS,
	ETaskAutomationStatusCategory.DONE
];

/** What value a condition asks for. */
export type TaskAutomationConditionInput = 'statuses' | 'categories' | 'priorities' | 'labels' | 'members' | 'text' | 'none';

export function conditionInputOf(type: ETaskAutomationCondition): TaskAutomationConditionInput {
	switch (type) {
		case ETaskAutomationCondition.STATUS_IS:
		case ETaskAutomationCondition.STATUS_IS_NOT:
			return 'statuses';
		case ETaskAutomationCondition.STATUS_CATEGORY_IS:
			return 'categories';
		case ETaskAutomationCondition.PRIORITY_IS:
			return 'priorities';
		case ETaskAutomationCondition.HAS_LABEL:
		case ETaskAutomationCondition.NOT_HAS_LABEL:
			return 'labels';
		case ETaskAutomationCondition.ASSIGNEE_IS:
			return 'members';
		case ETaskAutomationCondition.TITLE_CONTAINS:
			return 'text';
		default:
			return 'none';
	}
}

/** What value an action asks for. */
export type TaskAutomationActionInput = 'status' | 'priority' | 'members' | 'labels' | 'message';

export function actionInputOf(type: ETaskAutomationAction): TaskAutomationActionInput {
	switch (type) {
		case ETaskAutomationAction.SET_STATUS:
			return 'status';
		case ETaskAutomationAction.SET_PRIORITY:
			return 'priority';
		case ETaskAutomationAction.ADD_ASSIGNEES:
		case ETaskAutomationAction.SET_ASSIGNEES:
			return 'members';
		case ETaskAutomationAction.ADD_LABELS:
		case ETaskAutomationAction.REMOVE_LABELS:
			return 'labels';
		default:
			return 'message';
	}
}

export interface TaskAutomationConditionDraft {
	key: string;
	type: ETaskAutomationCondition;
	values: string[];
	text: string;
}

export interface TaskAutomationActionDraft {
	key: string;
	type: ETaskAutomationAction;
	/** `SET_STATUS`: a category of the task's project, or one status. */
	statusMode: 'category' | 'status';
	category: ETaskAutomationStatusCategory;
	status: string;
	priority: string;
	employeeIds: string[];
	tagIds: string[];
	message: string;
}

export interface TaskAutomationForm {
	name: string;
	description: string;
	projectId: string | null;
	organizationTeamId: string | null;
	isEnabled: boolean;
	templateKey: string | null;
	trigger: ETaskAutomationTrigger;
	toStatuses: string[];
	fromStatuses: string[];
	conditions: TaskAutomationConditionDraft[];
	actions: TaskAutomationActionDraft[];
}

let draftCounter = 0;

/** A key for a new list item of the form (React keys; never sent). */
export function nextDraftKey(): string {
	draftCounter += 1;
	return `draft-${draftCounter}`;
}

const unique = (values: readonly (string | null | undefined)[] | null | undefined): string[] => [
	...new Set((values ?? []).map((value) => String(value ?? '').trim()).filter(Boolean))
];

export function conditionDraftOf(condition?: Partial<ITaskAutomationCondition>): TaskAutomationConditionDraft {
	return {
		key: nextDraftKey(),
		type: condition?.type ?? ETaskAutomationCondition.IS_OPEN,
		values: unique(condition?.values),
		text: condition?.text ?? ''
	};
}

export function actionDraftOf(action?: Partial<ITaskAutomationAction>): TaskAutomationActionDraft {
	const hasStatus = Boolean(action?.status) && !action?.category;
	return {
		key: nextDraftKey(),
		type: action?.type ?? ETaskAutomationAction.SET_STATUS,
		statusMode: hasStatus ? 'status' : 'category',
		category: action?.category ?? ETaskAutomationStatusCategory.DONE,
		status: action?.status ?? '',
		priority: action?.priority ?? '',
		employeeIds: unique(action?.employeeIds),
		tagIds: unique(action?.tagIds),
		message: action?.message ?? ''
	};
}

/** A blank rule: any status change, no condition, one action to fill in. */
export function emptyTaskAutomationForm(): TaskAutomationForm {
	return {
		name: '',
		description: '',
		projectId: null,
		organizationTeamId: null,
		// A blank rule starts off: it is switched on once it says what it should do.
		isEnabled: false,
		templateKey: null,
		trigger: ETaskAutomationTrigger.STATUS_CHANGED,
		toStatuses: [],
		fromStatuses: [],
		conditions: [],
		actions: [actionDraftOf()]
	};
}

function fromParts(parts: {
	name: string;
	description?: string | null;
	trigger: ITaskAutomationRule['trigger'];
	conditions: ITaskAutomationCondition[];
	actions: ITaskAutomationAction[];
}) {
	return {
		name: parts.name ?? '',
		description: parts.description ?? '',
		trigger: parts.trigger?.type ?? ETaskAutomationTrigger.STATUS_CHANGED,
		toStatuses: unique(parts.trigger?.toStatuses),
		fromStatuses: unique(parts.trigger?.fromStatuses),
		conditions: (parts.conditions ?? []).map(conditionDraftOf),
		actions: (parts.actions ?? []).map(actionDraftOf)
	};
}

export function formFromRule(rule: ITaskAutomationRule): TaskAutomationForm {
	return {
		...fromParts(rule),
		projectId: rule.projectId ?? null,
		organizationTeamId: rule.organizationTeamId ?? null,
		isEnabled: rule.isEnabled,
		templateKey: rule.templateKey ?? null
	};
}

/** A template as a new rule's form; `name` is the template's name as the app shows it (translated). */
export function formFromTemplate(template: ITaskAutomationTemplate, name?: string, description?: string): TaskAutomationForm {
	const form = fromParts({ ...template, name: name ?? template.name, description: description ?? template.description });
	return {
		...form,
		actions: form.actions.length ? form.actions : [actionDraftOf()],
		projectId: null,
		organizationTeamId: null,
		// A template that needs the organization's values starts off, as the platform creates it.
		isEnabled: !template.needsInput,
		templateKey: template.key
	};
}

function conditionOf(draft: TaskAutomationConditionDraft): ITaskAutomationCondition {
	const input = conditionInputOf(draft.type);
	if (input === 'none') return { type: draft.type };
	if (input === 'text') return { type: draft.type, text: draft.text.trim() };
	return { type: draft.type, values: unique(draft.values) };
}

function actionOf(draft: TaskAutomationActionDraft): ITaskAutomationAction {
	switch (actionInputOf(draft.type)) {
		case 'status':
			return draft.statusMode === 'status'
				? { type: draft.type, status: draft.status.trim() }
				: { type: draft.type, category: draft.category };
		case 'priority':
			return { type: draft.type, priority: draft.priority.trim() };
		case 'members':
			return { type: draft.type, employeeIds: unique(draft.employeeIds) };
		case 'labels':
			return { type: draft.type, tagIds: unique(draft.tagIds) };
		default: {
			const message = draft.message.trim();
			return message ? { type: draft.type, message } : { type: draft.type };
		}
	}
}

/** The form as the platform takes it: for each type exactly the fields it reads. */
export function ruleInputFromForm(form: TaskAutomationForm): ITaskAutomationRuleCreateInput {
	const trigger =
		form.trigger === ETaskAutomationTrigger.STATUS_CHANGED
			? { type: form.trigger, toStatuses: unique(form.toStatuses), fromStatuses: unique(form.fromStatuses) }
			: { type: form.trigger };
	return {
		name: form.name.trim(),
		description: form.description.trim() || null,
		projectId: form.projectId || null,
		organizationTeamId: form.organizationTeamId || null,
		isEnabled: form.isEnabled,
		trigger,
		conditions: form.conditions.map(conditionOf),
		actions: form.actions.map(actionOf)
	};
}

/** What keeps a form from being saved, with the list item it is about. */
export type TaskAutomationFormErrorCode =
	| 'NAME_REQUIRED'
	| 'NAME_TOO_LONG'
	| 'DESCRIPTION_TOO_LONG'
	| 'ACTION_REQUIRED'
	| 'TOO_MANY_CONDITIONS'
	| 'TOO_MANY_ACTIONS'
	| 'CONDITION_VALUE_REQUIRED'
	| 'CONDITION_TEXT_REQUIRED'
	| 'ACTION_STATUS_REQUIRED'
	| 'ACTION_PRIORITY_REQUIRED'
	| 'ACTION_MEMBERS_REQUIRED'
	| 'ACTION_LABELS_REQUIRED'
	| 'MESSAGE_TOO_LONG'
	| 'TOO_MANY_VALUES';

export interface TaskAutomationFormError {
	code: TaskAutomationFormErrorCode;
	/** The key of the condition or action it is about (`TRIGGER_ITEM_KEY` for the trigger's status lists). */
	itemKey?: string;
}

/** The `itemKey` of an error about the trigger's status lists. */
export const TRIGGER_ITEM_KEY = 'trigger';

/** The platform's own checks, made before the request so the editor can point at the field. */
export function validateTaskAutomationForm(form: TaskAutomationForm): TaskAutomationFormError[] {
	const errors: TaskAutomationFormError[] = [];
	const name = form.name.trim();
	if (!name) errors.push({ code: 'NAME_REQUIRED' });
	if (name.length > TASK_AUTOMATION_LIMITS.nameLength) errors.push({ code: 'NAME_TOO_LONG' });
	if (form.description.trim().length > TASK_AUTOMATION_LIMITS.descriptionLength) errors.push({ code: 'DESCRIPTION_TOO_LONG' });
	if (!form.actions.length) errors.push({ code: 'ACTION_REQUIRED' });
	if (form.conditions.length > TASK_AUTOMATION_LIMITS.conditionsPerRule) errors.push({ code: 'TOO_MANY_CONDITIONS' });
	if (form.actions.length > TASK_AUTOMATION_LIMITS.actionsPerRule) errors.push({ code: 'TOO_MANY_ACTIONS' });
	const tooMany = (values: readonly string[]) => unique(values).length > TASK_AUTOMATION_LIMITS.valuesPerList;
	if (form.trigger === ETaskAutomationTrigger.STATUS_CHANGED && (tooMany(form.toStatuses) || tooMany(form.fromStatuses))) {
		errors.push({ code: 'TOO_MANY_VALUES', itemKey: TRIGGER_ITEM_KEY });
	}
	for (const condition of form.conditions) {
		if (tooMany(condition.values)) errors.push({ code: 'TOO_MANY_VALUES', itemKey: condition.key });
		const input = conditionInputOf(condition.type);
		if (input === 'text' && !condition.text.trim()) errors.push({ code: 'CONDITION_TEXT_REQUIRED', itemKey: condition.key });
		const needsValues = input !== 'text' && input !== 'none';
		if (needsValues && unique(condition.values).length === 0) {
			errors.push({ code: 'CONDITION_VALUE_REQUIRED', itemKey: condition.key });
		}
	}
	for (const action of form.actions) {
		const input = actionInputOf(action.type);
		if ((input === 'members' && tooMany(action.employeeIds)) || (input === 'labels' && tooMany(action.tagIds))) {
			errors.push({ code: 'TOO_MANY_VALUES', itemKey: action.key });
		}
		if (input === 'status' && action.statusMode === 'status' && !action.status.trim()) {
			errors.push({ code: 'ACTION_STATUS_REQUIRED', itemKey: action.key });
		}
		if (input === 'priority' && !action.priority.trim()) errors.push({ code: 'ACTION_PRIORITY_REQUIRED', itemKey: action.key });
		// Replacing the assignees with nobody is allowed: it unassigns everyone.
		if (action.type === ETaskAutomationAction.ADD_ASSIGNEES && unique(action.employeeIds).length === 0) {
			errors.push({ code: 'ACTION_MEMBERS_REQUIRED', itemKey: action.key });
		}
		if (input === 'labels' && unique(action.tagIds).length === 0) errors.push({ code: 'ACTION_LABELS_REQUIRED', itemKey: action.key });
		if (input === 'message' && action.message.trim().length > TASK_AUTOMATION_LIMITS.messageLength) {
			errors.push({ code: 'MESSAGE_TOO_LONG', itemKey: action.key });
		}
	}
	return errors;
}

/** The rules in the order the platform runs them. */
export function sortTaskAutomationRules(rules: readonly ITaskAutomationRule[]): ITaskAutomationRule[] {
	return [...rules].sort((a, b) => a.position - b.position || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
}

/** The rule ids with one moved by `delta` places, or `null` when it cannot move that way. */
export function moveRuleId(ids: readonly string[], id: string, delta: -1 | 1): string[] | null {
	const index = ids.indexOf(id);
	const target = index + delta;
	if (index < 0 || target < 0 || target >= ids.length) return null;
	const next = [...ids];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

/** The rules in the order of `ids` (with the positions that order gives), for an optimistic reorder. */
export function rulesInOrder(rules: readonly ITaskAutomationRule[], ids: readonly string[]): ITaskAutomationRule[] {
	const byId = new Map(rules.map((rule) => [rule.id, rule]));
	const named = ids.map((id) => byId.get(id)).filter((rule): rule is ITaskAutomationRule => !!rule);
	const rest = sortTaskAutomationRules(rules.filter((rule) => !ids.includes(rule.id)));
	return [...named, ...rest].map((rule, position) => ({ ...rule, position }));
}

export type TaskAutomationOutcomeTone = 'success' | 'neutral' | 'warning' | 'danger';

/** How a run's outcome is shown. */
export function outcomeToneOf(outcome: ETaskAutomationRunOutcome): TaskAutomationOutcomeTone {
	switch (outcome) {
		case ETaskAutomationRunOutcome.APPLIED:
			return 'success';
		case ETaskAutomationRunOutcome.PARTIAL:
		case ETaskAutomationRunOutcome.LOOP_GUARD:
		case ETaskAutomationRunOutcome.RATE_LIMITED:
			return 'warning';
		case ETaskAutomationRunOutcome.FAILED:
			return 'danger';
		default:
			return 'neutral';
	}
}

/** A value an action or a run names, as text: a list is counted, a name is looked up. */
export function changeValueText(value: unknown, nameOf: (id: string) => string | undefined): string {
	if (value === null || value === undefined || value === '') return '—';
	if (Array.isArray(value)) return value.map((item) => nameOf(String(item)) ?? String(item)).join(', ') || '—';
	if (typeof value === 'number') return String(value);
	const text = String(value);
	return nameOf(text) ?? text;
}
