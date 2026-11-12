/**
 * The platform's task automations (`/task-automations`, Gauzy plugin `@gauzy/plugin-task-automations`, platform spec
 * `docs/specs/features/task-automations`): rules of an organization — optionally of a project or a team — made of a
 * trigger, conditions and actions, run in the background after a task change. The shapes mirror the platform's
 * contracts (`packages/contracts/src/lib/task-automation.model.ts`); enumerated values are the platform's strings.
 */

/** What happened to a task. */
export enum ETaskAutomationTrigger {
	TASK_CREATED = 'TASK_CREATED',
	STATUS_CHANGED = 'STATUS_CHANGED',
	TASK_ASSIGNED = 'TASK_ASSIGNED',
	/** Every sub-task of a task is done; the rule acts on the parent. */
	ALL_SUBTASKS_DONE = 'ALL_SUBTASKS_DONE',
	/** A done sub-task was reopened; the rule acts on the parent. */
	SUBTASK_REOPENED = 'SUBTASK_REOPENED',
	DUE_DATE_PASSED = 'DUE_DATE_PASSED',
	/** A linked pull request or issue closed (reported by an integration). */
	LINK_CLOSED = 'LINK_CLOSED'
}

/** A test on the task the rule acts on; all of a rule's conditions must hold. */
export enum ETaskAutomationCondition {
	STATUS_IS = 'STATUS_IS',
	STATUS_IS_NOT = 'STATUS_IS_NOT',
	STATUS_CATEGORY_IS = 'STATUS_CATEGORY_IS',
	IS_OPEN = 'IS_OPEN',
	IS_DONE = 'IS_DONE',
	PRIORITY_IS = 'PRIORITY_IS',
	HAS_LABEL = 'HAS_LABEL',
	NOT_HAS_LABEL = 'NOT_HAS_LABEL',
	IS_ASSIGNED = 'IS_ASSIGNED',
	IS_UNASSIGNED = 'IS_UNASSIGNED',
	ASSIGNEE_IS = 'ASSIGNEE_IS',
	IS_SUBTASK = 'IS_SUBTASK',
	IS_NOT_SUBTASK = 'IS_NOT_SUBTASK',
	TITLE_CONTAINS = 'TITLE_CONTAINS'
}

/** A change to the task, or a notice to its assignees. */
export enum ETaskAutomationAction {
	SET_STATUS = 'SET_STATUS',
	SET_PRIORITY = 'SET_PRIORITY',
	ADD_ASSIGNEES = 'ADD_ASSIGNEES',
	SET_ASSIGNEES = 'SET_ASSIGNEES',
	ADD_LABELS = 'ADD_LABELS',
	REMOVE_LABELS = 'REMOVE_LABELS',
	NOTIFY_ASSIGNEES = 'NOTIFY_ASSIGNEES'
}

/** A workflow category of statuses. */
export enum ETaskAutomationStatusCategory {
	TODO = 'todo',
	IN_PROGRESS = 'in_progress',
	DONE = 'done'
}

/** How one run of a rule for one task ended. */
export enum ETaskAutomationRunOutcome {
	RUNNING = 'RUNNING',
	APPLIED = 'APPLIED',
	PARTIAL = 'PARTIAL',
	NO_CHANGE = 'NO_CHANGE',
	CONDITIONS_NOT_MET = 'CONDITIONS_NOT_MET',
	LOOP_GUARD = 'LOOP_GUARD',
	RATE_LIMITED = 'RATE_LIMITED',
	FAILED = 'FAILED'
}

export interface ITaskAutomationTrigger {
	type: ETaskAutomationTrigger;
	/** `STATUS_CHANGED`: only to these statuses (values or ids); empty: any. */
	toStatuses?: string[];
	/** `STATUS_CHANGED`: only from these statuses; empty: any. */
	fromStatuses?: string[];
}

export interface ITaskAutomationCondition {
	type: ETaskAutomationCondition;
	/** Statuses, categories, priorities, tag ids or employee ids, by condition. */
	values?: string[];
	/** `TITLE_CONTAINS`. */
	text?: string;
}

export interface ITaskAutomationAction {
	type: ETaskAutomationAction;
	/** `SET_STATUS`: a status value or id; or, instead, `category`. */
	status?: string;
	category?: ETaskAutomationStatusCategory;
	/** `SET_PRIORITY`: a priority value or id. */
	priority?: string;
	/** `ADD_ASSIGNEES` / `SET_ASSIGNEES`: employee ids. */
	employeeIds?: string[];
	/** `ADD_LABELS` / `REMOVE_LABELS`: tag ids. */
	tagIds?: string[];
	/** `NOTIFY_ASSIGNEES`: the notice's text. */
	message?: string;
}

export interface ITaskAutomationRule {
	id: string;
	tenantId?: string;
	organizationId?: string;
	name: string;
	description?: string | null;
	projectId?: string | null;
	organizationTeamId?: string | null;
	isEnabled: boolean;
	position: number;
	templateKey?: string | null;
	trigger: ITaskAutomationTrigger;
	conditions: ITaskAutomationCondition[];
	actions: ITaskAutomationAction[];
	lastRunAt?: string | null;
	createdByUserId?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

/** What creating a rule takes; a `templateKey` fills what the body leaves out. */
export interface ITaskAutomationRuleCreateInput {
	templateKey?: string;
	name?: string;
	description?: string | null;
	projectId?: string | null;
	organizationTeamId?: string | null;
	isEnabled?: boolean;
	trigger?: ITaskAutomationTrigger;
	conditions?: ITaskAutomationCondition[];
	actions?: ITaskAutomationAction[];
}

/** What editing a rule takes; only the fields stated change. */
export type ITaskAutomationRuleUpdateInput = Omit<ITaskAutomationRuleCreateInput, 'templateKey'>;

/** One change an action made, or would make. */
export interface ITaskAutomationChange {
	action: ETaskAutomationAction;
	field?: string;
	from?: unknown;
	to?: unknown;
	note?: string;
	failed?: boolean;
}

export interface ITaskAutomationConditionResult {
	type: ETaskAutomationCondition;
	passed: boolean;
	detail?: string;
}

/** One run of a rule for one task. */
export interface ITaskAutomationRun {
	id: string;
	ruleId: string;
	taskId?: string | null;
	eventKey: string;
	triggerType: ETaskAutomationTrigger;
	outcome: ETaskAutomationRunOutcome;
	depth: number;
	details?: { changes?: ITaskAutomationChange[]; conditions?: ITaskAutomationConditionResult[]; note?: string } | null;
	error?: string | null;
	durationMs?: number | null;
	createdAt?: string;
}

/** What a rule would do to a task (`POST /task-automations/:id/test`; nothing is written). */
export interface ITaskAutomationTestResult {
	ruleId: string;
	taskId: string;
	/** `null`: only an event can tell (a status change, an assignment). */
	triggerMatches: boolean | null;
	triggerNote?: string;
	subjectTaskId?: string | null;
	conditions: ITaskAutomationConditionResult[];
	changes: ITaskAutomationChange[];
	outcome: ETaskAutomationRunOutcome;
}

/** A built-in starting point for a rule. */
export interface ITaskAutomationTemplate {
	key: string;
	name: string;
	description: string;
	trigger: ITaskAutomationTrigger;
	conditions: ITaskAutomationCondition[];
	actions: ITaskAutomationAction[];
	/** The trigger needs an integration that reports it. */
	requiresIntegration?: boolean;
	/** The editor asks for values only the organization knows (a status, a label). */
	needsInput?: boolean;
}

/** The platform's limits (`TASK_AUTOMATION_LIMITS`). */
export const TASK_AUTOMATION_LIMITS = Object.freeze({
	rulesPerOrganization: 100,
	conditionsPerRule: 10,
	actionsPerRule: 10,
	nameLength: 120,
	descriptionLength: 2000,
	messageLength: 1000,
	runsShown: 50,
	/** The most values one list may hold (a trigger's statuses, a condition's values, an action's people or labels). */
	valuesPerList: 50
});
