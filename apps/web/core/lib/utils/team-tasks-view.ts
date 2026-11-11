import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { EIssueType } from '@/core/types/generics/enums/task';
import { sortStatusesByOrder, statusIdOf } from './kanban-board';
import { sortByManualOrder } from './task-view-order';

/** Which part of the team's work the page shows, from the statuses' own workflow flags. */
export type TeamTasksScope = 'active' | 'done' | 'all';

export type TeamTasksGrouping = 'status' | 'priority' | 'assignee' | 'project' | 'issueType' | 'none';

/** `manual` is a saved view's own order (its `manualOrder`), offered only on a saved view. */
export type TeamTasksOrdering = 'priority' | 'updated' | 'created' | 'dueDate' | 'number' | 'title' | 'manual';

export type TeamTaskProperty =
	| 'number'
	| 'issueType'
	| 'priority'
	| 'status'
	| 'parent'
	| 'labels'
	| 'size'
	| 'project'
	| 'progress'
	| 'dueDate'
	| 'created'
	| 'assignees';

export type TeamTasksFilterField =
	| 'status'
	| 'priority'
	| 'size'
	| 'issueType'
	| 'label'
	| 'project'
	| 'assignee'
	| 'epic';

export type TeamTasksFilters = Partial<Record<TeamTasksFilterField, string[]>>;

/** How the tasks are shown: rows, or cards in one lane per status (the saved-views feature). */
export type TeamTasksLayout = 'list' | 'board';

export interface TeamTasksViewSettings {
	/** Absent in what was stored before the board came: a list. */
	layout?: TeamTasksLayout;
	grouping: TeamTasksGrouping;
	ordering: TeamTasksOrdering;
	isDescending: boolean;
	showsSubTasks: boolean;
	showsEmptyGroups: boolean;
	properties: Record<TeamTaskProperty, boolean>;
}

/** The value a filter or a group uses for "nothing set" (no assignee, no project, no priority). */
export const NONE_VALUE = '__none';

export const TEAM_TASK_PROPERTIES: TeamTaskProperty[] = [
	'number',
	'issueType',
	'priority',
	'status',
	'parent',
	'labels',
	'size',
	'project',
	'progress',
	'dueDate',
	'created',
	'assignees'
];

export const DEFAULT_TEAM_TASKS_VIEW: TeamTasksViewSettings = {
	grouping: 'status',
	ordering: 'priority',
	isDescending: false,
	showsSubTasks: true,
	showsEmptyGroups: false,
	properties: {
		number: true,
		issueType: true,
		priority: true,
		status: true,
		parent: true,
		labels: true,
		size: false,
		project: true,
		progress: true,
		dueDate: true,
		created: false,
		assignees: true
	}
};

/** The tasks of the groups once each, in the order the list shows them (a task can sit in several groups). */
export function tasksOfGroups(groups: readonly TeamTasksGroup[]): TTask[] {
	const seen = new Set<string>();
	const tasks: TTask[] = [];
	for (const group of groups) {
		for (const task of group.tasks) {
			if (seen.has(task.id)) {
				continue;
			}
			seen.add(task.id);
			tasks.push(task);
		}
	}
	return tasks;
}

export interface TeamTasksGroup {
	key: string;
	grouping: TeamTasksGrouping;
	/** The raw value behind the group: a status name, a priority, an employee id, a project id, an issue type. */
	value: string;
	status?: TTaskStatus;
	tasks: TTask[];
}

export type TeamTasksListRow =
	| { kind: 'group'; key: string; group: TeamTasksGroup; isCollapsed: boolean }
	| { kind: 'task'; key: string; task: TTask; group: TeamTasksGroup };

export interface TeamTasksLookups {
	statuses: TTaskStatus[];
	projectNames: Map<string, string>;
	memberNames: Map<string, string>;
}

const PRIORITY_RANK: Record<string, number> = {
	urgent: 0,
	highest: 0,
	critical: 0,
	high: 1,
	medium: 2,
	normal: 2,
	low: 3,
	lowest: 4
};

const NO_PRIORITY_RANK = 9;

const DONE_STATUS_NAMES = new Set(['done', 'completed', 'closed', 'cancelled', 'canceled', 'resolved']);

const ISSUE_TYPE_ORDER: string[] = [EIssueType.EPIC, EIssueType.STORY, EIssueType.TASK, EIssueType.BUG];

export function normalizedText(value: string | null | undefined) {
	const text = value ?? '';
	const lowerCased = text.toLowerCase();
	const spaced = lowerCased.replace(/[-_]+/g, ' ');
	return spaced.trim();
}

function hasWorkflowFlags(status: TTaskStatus) {
	const flags = [status.isTodo, status.isInProgress, status.isDone];
	return flags.some(Boolean);
}

/**
 * A status is done when Gauzy says so (`isDone`). Statuses created before the workflow flags carry none of them;
 * those fall back on the names Gauzy seeds as finished.
 */
export function isDoneStatus(status: TTaskStatus | undefined) {
	if (!status) {
		return false;
	}
	if (hasWorkflowFlags(status)) {
		return Boolean(status.isDone);
	}
	const name = normalizedText(status.name);
	return DONE_STATUS_NAMES.has(name);
}

export function statusOfTask(task: TTask, statuses: TTaskStatus[]) {
	const statusId = statusIdOf(task, statuses);
	if (!statusId) {
		return undefined;
	}
	return statuses.find((status) => status.id === statusId);
}

export function isTaskDone(task: TTask, statuses: TTaskStatus[]) {
	const status = statusOfTask(task, statuses);
	return isDoneStatus(status);
}

export function isInScope(task: TTask, scope: TeamTasksScope, statuses: TTaskStatus[]) {
	if (scope === 'all') {
		return true;
	}
	const isDone = isTaskDone(task, statuses);
	if (scope === 'done') {
		return isDone;
	}
	return !isDone;
}

export function taskNumberLabel(task: TTask) {
	const number = task.taskNumber ?? task.number;
	if (number === undefined || number === null || number === '') {
		return '';
	}
	return `#${number}`;
}

function matchesSearch(task: TTask, search: string) {
	const query = normalizedText(search);
	if (!query) {
		return true;
	}
	const title = normalizedText(task.title);
	const numberLabel = taskNumberLabel(task).toLowerCase();
	const prefixed = normalizedText(`${task.prefix ?? ''}-${task.number ?? ''}`);
	const matchesTitle = title.includes(query);
	const matchesNumber = numberLabel.includes(query);
	const matchesPrefixed = prefixed.includes(query);
	return [matchesTitle, matchesNumber, matchesPrefixed].some(Boolean);
}

/** The picked values of a filter, or null when the filter is not set. */
function selectionOf(selected: string[] | undefined) {
	if (!selected) {
		return null;
	}
	if (selected.length === 0) {
		return null;
	}
	return selected;
}

function valueOrNone(value: string | null | undefined) {
	if (!value) {
		return NONE_VALUE;
	}
	return value;
}

function matchesOne(selected: string[] | undefined, value: string | null | undefined) {
	const picked = selectionOf(selected);
	if (!picked) {
		return true;
	}
	const comparable = valueOrNone(value);
	return picked.includes(comparable);
}

function matchesNormalized(selected: string[] | undefined, value: string | null | undefined) {
	const picked = selectionOf(selected);
	if (!picked) {
		return true;
	}
	if (!value) {
		return picked.includes(NONE_VALUE);
	}
	const normalizedValue = normalizedText(value);
	return picked.some((candidate) => normalizedText(candidate) === normalizedValue);
}

function assigneeIdsOf(task: TTask) {
	const members = task.members ?? [];
	return members.map((member) => member.id);
}

function matchesAssignees(task: TTask, selected: string[] | undefined) {
	const picked = selectionOf(selected);
	if (!picked) {
		return true;
	}
	const ids = assigneeIdsOf(task);
	const isUnassigned = ids.length === 0;
	if (isUnassigned) {
		return picked.includes(NONE_VALUE);
	}
	return ids.some((id) => picked.includes(id));
}

function matchesLabels(task: TTask, selected: string[] | undefined) {
	const picked = selectionOf(selected);
	if (!picked) {
		return true;
	}
	const names = (task.tags ?? []).map((tag) => tag.name);
	return names.some((name) => picked.includes(name));
}

function matchesStatus(task: TTask, selected: string[] | undefined, statuses: TTaskStatus[]) {
	const picked = selectionOf(selected);
	if (!picked) {
		return true;
	}
	const statusId = statusIdOf(task, statuses);
	const comparable = valueOrNone(statusId);
	return picked.includes(comparable);
}

/** An epic filter keeps the epic itself and every task under it. */
function matchesEpics(task: TTask, selected: string[] | undefined) {
	const epics = selectionOf(selected);
	if (!epics) {
		return true;
	}
	const isPickedEpic = epics.includes(task.id);
	const rootEpicId = task.rootEpic?.id ?? '';
	const parentId = task.parentId ?? '';
	const isUnderPickedEpic = epics.includes(rootEpicId);
	const parentIsPickedEpic = epics.includes(parentId);
	return [isPickedEpic, isUnderPickedEpic, parentIsPickedEpic].some(Boolean);
}

export function matchesTeamTasksFilters(
	task: TTask,
	search: string,
	filters: TeamTasksFilters,
	statuses: TTaskStatus[]
) {
	const checks = [
		matchesSearch(task, search),
		matchesStatus(task, filters.status, statuses),
		matchesNormalized(filters.priority, task.priority as string | null | undefined),
		matchesNormalized(filters.size, task.size as string | null | undefined),
		matchesOne(filters.issueType, task.issueType),
		matchesLabels(task, filters.label),
		matchesOne(filters.project, task.projectId),
		matchesAssignees(task, filters.assignee),
		matchesEpics(task, filters.epic)
	];
	return checks.every(Boolean);
}

export function countFilters(filters: TeamTasksFilters) {
	let count = 0;
	for (const values of Object.values(filters)) {
		count += values?.length ?? 0;
	}
	return count;
}

export function priorityRankOf(priority: string | null | undefined) {
	if (!priority) {
		return NO_PRIORITY_RANK;
	}
	const key = normalizedText(priority);
	return PRIORITY_RANK[key] ?? NO_PRIORITY_RANK - 1;
}

function timeOf(value: Date | string | null | undefined) {
	if (!value) {
		return null;
	}
	const time = new Date(value).getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	return time;
}

function numberOf(task: TTask) {
	const number = task.number ?? Number(task.taskNumber);
	if (!Number.isFinite(number)) {
		return null;
	}
	return number;
}

/** Missing values always sort last, whatever the direction. */
function compareNullable(first: number | null, second: number | null, direction: number) {
	const firstMissing = first === null;
	const secondMissing = second === null;
	if (firstMissing && secondMissing) {
		return 0;
	}
	if (firstMissing) {
		return 1;
	}
	if (secondMissing) {
		return -1;
	}
	return ((first as number) - (second as number)) * direction;
}

function byNewestNumber(first: TTask, second: TTask) {
	return compareNullable(numberOf(first), numberOf(second), -1);
}

function directionOf(isDescending: boolean) {
	if (isDescending) {
		return -1;
	}
	return 1;
}

function dateFieldOf(ordering: TeamTasksOrdering) {
	if (ordering === 'created') {
		return 'createdAt' as const;
	}
	return 'updatedAt' as const;
}

function comparePriority(first: TTask, second: TTask, direction: number) {
	const firstRank = priorityRankOf(first.priority);
	const secondRank = priorityRankOf(second.priority);
	const difference = (firstRank - secondRank) * direction;
	if (difference !== 0) {
		return difference;
	}
	return byNewestNumber(first, second);
}

function compareTasks(first: TTask, second: TTask, ordering: TeamTasksOrdering, isDescending: boolean) {
	const direction = directionOf(isDescending);
	if (ordering === 'priority') {
		return comparePriority(first, second, direction);
	}
	if (ordering === 'title') {
		return first.title.localeCompare(second.title) * direction;
	}
	if (ordering === 'number') {
		return compareNullable(numberOf(first), numberOf(second), direction);
	}
	if (ordering === 'dueDate') {
		const firstDue = timeOf(first.dueDate);
		const secondDue = timeOf(second.dueDate);
		return compareNullable(firstDue, secondDue, direction);
	}
	const field = dateFieldOf(ordering);
	const newestFirst = -direction;
	const firstTime = timeOf(first[field]);
	const secondTime = timeOf(second[field]);
	return compareNullable(firstTime, secondTime, newestFirst);
}

/** The tasks in the view's ordering; a manual one follows the saved view's order, whatever the direction. */
export function sortTeamTasks(
	tasks: TTask[],
	ordering: TeamTasksOrdering,
	isDescending: boolean,
	manualOrder?: readonly string[] | null
) {
	if (ordering === 'manual') {
		return sortByManualOrder(tasks, manualOrder);
	}
	return [...tasks].sort((first, second) => compareTasks(first, second, ordering, isDescending));
}

function pushTo(map: Map<string, TTask[]>, key: string, task: TTask) {
	const current = map.get(key);
	if (current) {
		current.push(task);
		return;
	}
	map.set(key, [task]);
}

function groupOf(grouping: TeamTasksGrouping, value: string, tasks: TTask[], status?: TTaskStatus): TeamTasksGroup {
	return { key: `${grouping}:${value}`, grouping, value, status, tasks };
}

function groupByStatus(tasks: TTask[], statuses: TTaskStatus[]) {
	const ordered = sortStatusesByOrder(statuses);
	const byStatus = new Map<string, TTask[]>();
	for (const task of tasks) {
		const statusId = statusIdOf(task, ordered);
		const key = valueOrNone(statusId);
		pushTo(byStatus, key, task);
	}
	const groups = ordered.map((status) => {
		const statusTasks = byStatus.get(status.id) ?? [];
		return groupOf('status', status.id, statusTasks, status);
	});
	const withoutStatus = byStatus.get(NONE_VALUE) ?? [];
	groups.push(groupOf('status', NONE_VALUE, withoutStatus));
	return groups;
}

function priorityKeyOf(priority: string | null | undefined) {
	if (!priority) {
		return NONE_VALUE;
	}
	return normalizedText(priority);
}

function groupByPriority(tasks: TTask[], priorityValues: string[]) {
	const byPriority = new Map<string, TTask[]>();
	for (const task of tasks) {
		const priority = task.priority as string | null | undefined;
		const key = priorityKeyOf(priority);
		pushTo(byPriority, key, task);
	}
	const byRank = (first: string, second: string) => priorityRankOf(first) - priorityRankOf(second);
	const known = [...priorityValues].sort(byRank);
	const groups = known.map((value) => {
		const key = normalizedText(value);
		return groupOf('priority', value, byPriority.get(key) ?? []);
	});
	groups.push(groupOf('priority', NONE_VALUE, byPriority.get(NONE_VALUE) ?? []));
	return groups;
}

function groupByIssueType(tasks: TTask[]) {
	const byType = new Map<string, TTask[]>();
	for (const task of tasks) {
		const key = valueOrNone(task.issueType);
		pushTo(byType, key, task);
	}
	const groups = ISSUE_TYPE_ORDER.map((type) => {
		const typeTasks = byType.get(type) ?? [];
		return groupOf('issueType', type, typeTasks);
	});
	groups.push(groupOf('issueType', NONE_VALUE, byType.get(NONE_VALUE) ?? []));
	return groups;
}

function byName(names: Map<string, string>) {
	return (first: string, second: string) => {
		const firstName = names.get(first) ?? '';
		const secondName = names.get(second) ?? '';
		return firstName.localeCompare(secondName);
	};
}

/** A task with several assignees is listed under each of them, as a person reads their own group. */
function groupByAssignee(tasks: TTask[], memberNames: Map<string, string>) {
	const byAssignee = new Map<string, TTask[]>();
	for (const task of tasks) {
		const ids = assigneeIdsOf(task);
		if (ids.length === 0) {
			pushTo(byAssignee, NONE_VALUE, task);
			continue;
		}
		for (const id of ids) {
			pushTo(byAssignee, id, task);
		}
	}
	const memberIds = [...memberNames.keys()].sort(byName(memberNames));
	const isOutsideTeam = (id: string) => {
		const isNone = id === NONE_VALUE;
		const isMember = memberNames.has(id);
		return !isNone && !isMember;
	};
	const otherIds = [...byAssignee.keys()].filter(isOutsideTeam);
	const groupIds = [...memberIds, ...otherIds];
	const groups = groupIds.map((id) => {
		const assigneeTasks = byAssignee.get(id) ?? [];
		return groupOf('assignee', id, assigneeTasks);
	});
	groups.push(groupOf('assignee', NONE_VALUE, byAssignee.get(NONE_VALUE) ?? []));
	return groups;
}

function groupByProject(tasks: TTask[], projectNames: Map<string, string>) {
	const byProject = new Map<string, TTask[]>();
	for (const task of tasks) {
		const key = valueOrNone(task.projectId);
		pushTo(byProject, key, task);
	}
	const projectIds = [...byProject.keys()].filter((id) => id !== NONE_VALUE);
	projectIds.sort(byName(projectNames));
	const groups = projectIds.map((id) => {
		const projectTasks = byProject.get(id) ?? [];
		return groupOf('project', id, projectTasks);
	});
	groups.push(groupOf('project', NONE_VALUE, byProject.get(NONE_VALUE) ?? []));
	return groups;
}

export function buildTeamTasksGroups(
	tasks: TTask[],
	settings: TeamTasksViewSettings,
	lookups: TeamTasksLookups,
	priorityValues: string[],
	manualOrder?: readonly string[] | null
): TeamTasksGroup[] {
	const sorted = sortTeamTasks(tasks, settings.ordering, settings.isDescending, manualOrder);
	let groups: TeamTasksGroup[];
	if (settings.grouping === 'status') {
		groups = groupByStatus(sorted, lookups.statuses);
	} else if (settings.grouping === 'priority') {
		groups = groupByPriority(sorted, priorityValues);
	} else if (settings.grouping === 'issueType') {
		groups = groupByIssueType(sorted);
	} else if (settings.grouping === 'assignee') {
		groups = groupByAssignee(sorted, lookups.memberNames);
	} else if (settings.grouping === 'project') {
		groups = groupByProject(sorted, lookups.projectNames);
	} else {
		groups = [groupOf('none', 'all', sorted)];
	}
	const isUngrouped = settings.grouping === 'none';
	if (isUngrouped) {
		return groups;
	}
	return groups.filter((group) => {
		const hasTasks = group.tasks.length > 0;
		const isNoneGroup = group.value === NONE_VALUE;
		const showsWhenEmpty = settings.showsEmptyGroups && !isNoneGroup;
		return hasTasks || showsWhenEmpty;
	});
}

/** Sub-tasks whose parent is listed too are left out when the view hides sub-tasks; orphans stay visible. */
export function withoutListedSubTasks(tasks: TTask[]) {
	const listedIds = new Set(tasks.map((task) => task.id));
	return tasks.filter((task) => {
		const parentId = task.parentId ?? task.parent?.id;
		if (!parentId) {
			return true;
		}
		return !listedIds.has(parentId);
	});
}

/** How many tasks of the team name each task as their parent. */
export function childCountsOf(tasks: TTask[]) {
	const counts = new Map<string, number>();
	for (const task of tasks) {
		const parentId = task.parentId ?? task.parent?.id;
		if (!parentId) {
			continue;
		}
		const current = counts.get(parentId) ?? 0;
		counts.set(parentId, current + 1);
	}
	return counts;
}

export function flattenTeamTasksGroups(
	groups: TeamTasksGroup[],
	collapsedKeys: ReadonlySet<string>,
	showsHeaders: boolean
): TeamTasksListRow[] {
	const rows: TeamTasksListRow[] = [];
	for (const group of groups) {
		const isCollapsed = showsHeaders && collapsedKeys.has(group.key);
		if (showsHeaders) {
			rows.push({ kind: 'group', key: group.key, group, isCollapsed });
		}
		if (isCollapsed) {
			continue;
		}
		for (const task of group.tasks) {
			rows.push({ kind: 'task', key: `${group.key}/${task.id}`, task, group });
		}
	}
	return rows;
}

/** The task ids in the order the list shows them, each once, for ranges and the drawer's arrows. */
export function orderedTaskIdsOf(rows: TeamTasksListRow[]) {
	const seen = new Set<string>();
	const ids: string[] = [];
	for (const row of rows) {
		if (row.kind !== 'task') {
			continue;
		}
		if (seen.has(row.task.id)) {
			continue;
		}
		seen.add(row.task.id);
		ids.push(row.task.id);
	}
	return ids;
}

/** The ids between two picked tasks, both included, in list order. */
export function idsBetween(orderedIds: string[], fromId: string, toId: string) {
	const fromIndex = orderedIds.indexOf(fromId);
	const toIndex = orderedIds.indexOf(toId);
	const hasBoth = fromIndex >= 0 && toIndex >= 0;
	if (!hasBoth) {
		return [toId];
	}
	const start = Math.min(fromIndex, toIndex);
	const end = Math.max(fromIndex, toIndex);
	return orderedIds.slice(start, end + 1);
}

const ISSUE_TYPE_TRANSITIONS: Record<EIssueType, EIssueType[]> = {
	[EIssueType.EPIC]: [],
	[EIssueType.STORY]: [EIssueType.TASK, EIssueType.BUG],
	[EIssueType.TASK]: [EIssueType.STORY, EIssueType.BUG],
	[EIssueType.BUG]: [EIssueType.STORY, EIssueType.TASK]
};

export function isEpic(task: TTask) {
	return task.issueType === EIssueType.EPIC;
}

/**
 * The types a task may take, by the rules of the app's issue type menu: an epic stays an epic, a task under a
 * story cannot become one, a task without a type may take any. The current type comes first.
 */
export function issueTypeChoicesFor(task: TTask | undefined): EIssueType[] {
	const current = task?.issueType as EIssueType | null | undefined;
	if (!current) {
		return [EIssueType.STORY, EIssueType.TASK, EIssueType.BUG, EIssueType.EPIC];
	}
	const transitions = ISSUE_TYPE_TRANSITIONS[current] ?? [];
	const parentIsStory = task?.parent?.issueType === EIssueType.STORY;
	const allowed = transitions.filter((issueType) => {
		const isStory = issueType === EIssueType.STORY;
		return !(isStory && parentIsStory);
	});
	return [current, ...allowed];
}

export type DueDateTone = 'overdue' | 'soon' | 'later';

const SOON_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(time: number) {
	const day = new Date(time);
	day.setHours(0, 0, 0, 0);
	return day.getTime();
}

/** Overdue before today, soon within two days; a finished task is never late. */
export function dueDateToneOf(dueDate: Date | string | null | undefined, isDone: boolean, now: number): DueDateTone {
	const dueTime = timeOf(dueDate);
	if (dueTime === null) {
		return 'later';
	}
	if (isDone) {
		return 'later';
	}
	const today = startOfDay(now);
	const dueDay = startOfDay(dueTime);
	if (dueDay < today) {
		return 'overdue';
	}
	const daysLeft = (dueDay - today) / DAY_MS;
	if (daysLeft <= SOON_DAYS) {
		return 'soon';
	}
	return 'later';
}
