import type { TeamTasksFilters, TeamTasksScope, TeamTasksViewSettings } from '@/core/lib/utils/team-tasks-view';

/** Who sees a saved view: its creator only, or everyone in the team. */
export enum ETaskViewVisibility {
	PERSONAL = 'personal',
	SHARED = 'shared'
}

/** The views the platform computes for the signed-in person, in their time zone. */
export enum ETaskBuiltInView {
	MINE = 'mine',
	THIS_WEEK = 'this-week',
	OVERDUE = 'overdue',
	DUE_SOON = 'due-soon'
}

export const TASK_BUILT_IN_VIEWS: ETaskBuiltInView[] = [
	ETaskBuiltInView.MINE,
	ETaskBuiltInView.THIS_WEEK,
	ETaskBuiltInView.OVERDUE,
	ETaskBuiltInView.DUE_SOON
];

/** What a saved view remembers of the Team tasks page: its settings, filters, scope and search. */
export interface ITaskViewDefinition {
	settings: TeamTasksViewSettings;
	filters: TeamTasksFilters;
	scope: TeamTasksScope;
	search?: string;
}

/** A saved view as the platform keeps it (`/task-views`). */
export interface ITaskView {
	id: string;
	name: string;
	description?: string | null;
	visibility?: ETaskViewVisibility | null;
	/** Moves on every save; a save states the version it read and is refused when stale. */
	version?: number;
	/** The filters of the view. */
	filterOptions?: Record<string, unknown> | null;
	/** The grouping, ordering and properties of the view. */
	displayOptions?: Record<string, unknown> | null;
	/** The scope and the search of the view. */
	queryParams?: Record<string, unknown> | null;
	/** The task ids in the order the view shows them when its ordering is manual. */
	manualOrder?: string[] | null;
	organizationTeamId?: string | null;
	projectId?: string | null;
	organizationId?: string | null;
	tenantId?: string | null;
	createdByUserId?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface ITaskViewList {
	items: ITaskView[];
	total: number;
}

export interface ITaskViewCreateInput {
	name: string;
	description?: string | null;
	visibility: ETaskViewVisibility;
	organizationTeamId?: string | null;
	projectId?: string | null;
	filterOptions?: Record<string, unknown>;
	displayOptions?: Record<string, unknown>;
	queryParams?: Record<string, unknown>;
	/** The manual order a new view starts with (Save as keeps the one of the view it was made from). */
	manualOrder?: string[];
}

export interface ITaskViewUpdateInput extends Partial<ITaskViewCreateInput> {
	/** The version the page read; the platform refuses the save (409) when the view moved on since. */
	expectedVersion?: number;
}

/** What a bulk update changes on every selected task. Lists take `add` / `remove` or `set`. */
export interface ITaskBulkChanges {
	status?: string | null;
	taskStatusId?: string | null;
	priority?: string | null;
	taskPriorityId?: string | null;
	size?: string | null;
	taskSizeId?: string | null;
	addTagIds?: string[];
	removeTagIds?: string[];
	setTagIds?: string[];
	addMemberIds?: string[];
	removeMemberIds?: string[];
	setMemberIds?: string[];
	projectId?: string | null;
	organizationSprintId?: string | null;
	dueDate?: string | null;
	isArchived?: boolean;
}

export interface ITaskBulkUpdateItem {
	taskId: string;
	changes: ITaskBulkChanges;
}

export interface ITaskBulkUpdateInput {
	taskIds?: string[];
	changes?: ITaskBulkChanges;
	items?: ITaskBulkUpdateItem[];
}

export interface ITaskBulkUpdateResult {
	taskId: string;
	ok: boolean;
	error?: string;
	/** The values before the change, in the changes shape (lists as `set…`): an undo is the same request with them. */
	previous?: ITaskBulkChanges;
}

export interface ITaskBulkUpdateOutcome {
	applied: number;
	refused: number;
	results: ITaskBulkUpdateResult[];
}

/** The most tasks one bulk update takes (the platform's limit). */
export const TASK_BULK_UPDATE_MAX = 100;

/** A page of a built-in view's tasks. */
export interface ITaskBuiltInViewPage<T> {
	items: T[];
	total: number;
}
