import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

/** The creation day a board can be narrowed to, relative to the user's today. */
export type KanbanDay = 'all' | 'today' | 'yesterday' | 'tomorrow';

export type KanbanFilterField = 'issueType' | 'epic' | 'priority' | 'size' | 'label';

export type KanbanPropertyFilters = Record<KanbanFilterField, string[]>;

export interface KanbanFilters {
	search: string;
	properties: KanbanPropertyFilters;
	/** Full name of the member picked from the team avatars (the `employee` URL parameter). */
	employee: string | null;
	day: KanbanDay;
}

export interface KanbanLane {
	status: TTaskStatus;
	tasks: TTask[];
}

/** Task ids in the order the user dropped them, per status id. Gauzy keeps no order inside a status. */
export type KanbanLaneOrder = Record<string, string[]>;

export const EMPTY_KANBAN_PROPERTY_FILTERS: KanbanPropertyFilters = {
	issueType: [],
	epic: [],
	priority: [],
	size: [],
	label: []
};

const DAY_OFFSETS: Record<Exclude<KanbanDay, 'all'>, number> = {
	yesterday: -1,
	today: 0,
	tomorrow: 1
};

function normalizedName(value: string | null | undefined) {
	const text = value ?? '';
	return text.trim().toLowerCase();
}

function byStatusOrder(first: TTaskStatus, second: TTaskStatus) {
	const firstOrder = first.order ?? Number.MAX_SAFE_INTEGER;
	const secondOrder = second.order ?? Number.MAX_SAFE_INTEGER;
	return firstOrder - secondOrder;
}

export function sortStatusesByOrder(statuses: TTaskStatus[]) {
	return [...statuses].sort(byStatusOrder);
}

function startOfLocalDay(date: Date) {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day;
}

function isSameLocalDay(first: Date, second: Date) {
	const firstDay = startOfLocalDay(first);
	const secondDay = startOfLocalDay(second);
	return firstDay.getTime() === secondDay.getTime();
}

export function wasCreatedOn(task: TTask, day: KanbanDay, now: Date) {
	if (day === 'all') {
		return true;
	}
	if (!task.createdAt) {
		return false;
	}
	const target = new Date(now);
	target.setDate(target.getDate() + DAY_OFFSETS[day]);
	const createdAt = new Date(task.createdAt);
	return isSameLocalDay(createdAt, target);
}

function matchesSearch(task: TTask, search: string) {
	const query = normalizedName(search);
	if (!query) {
		return true;
	}
	const title = normalizedName(task.title);
	const numberLabel = `#${task.taskNumber ?? task.number ?? ''}`;
	const matchesTitle = title.includes(query);
	const matchesNumber = numberLabel.toLowerCase().includes(query);
	return matchesTitle || matchesNumber;
}

function matchesAny(selected: string[], value: string | null | undefined) {
	if (selected.length === 0) {
		return true;
	}
	if (!value) {
		return false;
	}
	return selected.includes(value);
}

function matchesLabels(task: TTask, labels: string[]) {
	if (labels.length === 0) {
		return true;
	}
	const tagNames = (task.tags ?? []).map((tag) => tag.name);
	return labels.some((label) => tagNames.includes(label));
}

/** An epic filter keeps the epic itself and every task under it. */
function matchesEpics(task: TTask, epics: string[]) {
	if (epics.length === 0) {
		return true;
	}
	const isPickedEpic = epics.includes(task.id);
	const rootEpicId = task.rootEpic?.id;
	const isUnderPickedEpic = Boolean(rootEpicId) && epics.includes(rootEpicId as string);
	const parentIsPickedEpic = Boolean(task.parentId) && epics.includes(task.parentId as string);
	return isPickedEpic || isUnderPickedEpic || parentIsPickedEpic;
}

function matchesEmployee(task: TTask, employee: string | null) {
	if (!employee) {
		return true;
	}
	const memberNames = (task.members ?? []).map((member) => member.fullName);
	return memberNames.includes(employee);
}

export function matchesKanbanFilters(task: TTask, filters: KanbanFilters, now: Date) {
	const { properties } = filters;
	const checks = [
		matchesSearch(task, filters.search),
		matchesAny(properties.issueType, task.issueType),
		matchesEpics(task, properties.epic),
		matchesAny(properties.priority, task.priority as string | null | undefined),
		matchesAny(properties.size, task.size as string | null | undefined),
		matchesLabels(task, properties.label),
		matchesEmployee(task, filters.employee),
		wasCreatedOn(task, filters.day, now)
	];
	return checks.every(Boolean);
}

export function countPropertyFilters(properties: KanbanPropertyFilters) {
	let count = 0;
	for (const values of Object.values(properties)) {
		count += values.length;
	}
	return count;
}

/**
 * The status a task sits in: its status relation, or for older tasks without one (seeded, API-created) the status
 * whose name matches the task's status text, so they never vanish from the board.
 */
export function statusIdOf(task: TTask, statuses: TTaskStatus[]) {
	const byRelation = statuses.find((status) => status.id === task.taskStatusId);
	if (byRelation) {
		return byRelation.id;
	}
	const taskStatusName = normalizedName(task.status as string | null | undefined);
	if (!taskStatusName) {
		return undefined;
	}
	const byName = statuses.find((status) => normalizedName(status.name) === taskStatusName);
	return byName?.id;
}

function orderedByDrop(tasks: TTask[], droppedOrder: string[] | undefined) {
	if (!droppedOrder || droppedOrder.length === 0) {
		return tasks;
	}
	const positionOf = new Map(droppedOrder.map((taskId, index) => [taskId, index]));
	const placed = tasks.filter((task) => positionOf.has(task.id));
	const others = tasks.filter((task) => !positionOf.has(task.id));
	placed.sort((first, second) => (positionOf.get(first.id) ?? 0) - (positionOf.get(second.id) ?? 0));
	return [...placed, ...others];
}

/**
 * One lane per status in the statuses' order. A task whose status belongs to no lane (no status, or another team's
 * status set) lands in the first lane so it stays visible and can be dragged to the right one.
 */
export function buildKanbanLanes(tasks: TTask[], statuses: TTaskStatus[], laneOrder: KanbanLaneOrder): KanbanLane[] {
	const orderedStatuses = sortStatusesByOrder(statuses);
	const tasksByStatus = new Map<string, TTask[]>();
	for (const status of orderedStatuses) {
		tasksByStatus.set(status.id, []);
	}
	const firstStatusId = orderedStatuses[0]?.id;
	for (const task of tasks) {
		const statusId = statusIdOf(task, orderedStatuses) ?? firstStatusId;
		if (!statusId) {
			continue;
		}
		tasksByStatus.get(statusId)?.push(task);
	}
	return orderedStatuses.map((status) => {
		const laneTasks = tasksByStatus.get(status.id) ?? [];
		return { status, tasks: orderedByDrop(laneTasks, laneOrder[status.id]) };
	});
}

/** The ids of a lane after a task was dropped at `index`, the task removed from where it was first. */
export function laneIdsAfterDrop(laneTaskIds: string[], taskId: string, index: number) {
	const withoutTask = laneTaskIds.filter((id) => id !== taskId);
	const boundedIndex = Math.max(0, Math.min(index, withoutTask.length));
	withoutTask.splice(boundedIndex, 0, taskId);
	return withoutTask;
}

/** The statuses in their new order once one of them was dropped at `index`. */
export function statusIdsAfterDrop(statusIds: string[], statusId: string, index: number) {
	return laneIdsAfterDrop(statusIds, statusId, index);
}
