import { IKanban, KanbanFilterCriteria } from "@/core/types/interfaces/task/task";
import { TTaskStatus } from "@/core/types/schemas";
import { TTask } from "@/core/types/schemas/task/task.schema";

const matchesSearch = (task: TTask, search: string): boolean =>
	task.title.toLowerCase().includes(search.toLowerCase());

const matchesPriority = (task: TTask, priority: string[]): boolean =>
	priority.length === 0 || priority.includes(task.priority as string);

const matchesIssue = (task: TTask, issueValue: string | undefined): boolean =>
	!issueValue || task.issueType === issueValue;

const matchesSize = (task: TTask, sizes: string[]): boolean =>
	sizes.length === 0 || sizes.includes(task.size as string);

const matchesLabels = (task: TTask, labels: string[]): boolean =>
	labels.length === 0 || labels.some((label) => task.tags?.some((tag) => tag.name === label));

const matchesEpics = (task: TTask, epics: string[]): boolean =>
	epics.length === 0 || epics.includes(task.id);

const matchesEmployee = (task: TTask, employee: string | null): boolean =>
	!employee || (task.members?.map((el) => el.fullName).includes(employee) ?? false);


/**
 * Applies all kanban filters to a list of tasks in a single pass.
 * Single-pass filtering is more performant than chaining .filter() calls
 * because it avoids creating intermediate arrays.
 */
export function applyAllFilters(tasks: TTask[], criteria: KanbanFilterCriteria): TTask[] {
	const { search, priority, issueValue, sizes, labels, epics, employee } = criteria;
	return tasks.filter(
		(task) =>
			matchesSearch(task, search) &&
			matchesPriority(task, priority) &&
			matchesIssue(task, issueValue) &&
			matchesSize(task, sizes) &&
			matchesLabels(task, labels) &&
			matchesEpics(task, epics) &&
			matchesEmployee(task, employee)
	);
}

/**
 * Builds a kanban board by grouping tasks by their status.
 * Pure function — no side effects, easily testable.
 */
export function buildKanbanBoard(filteredTasks: TTask[], taskStatuses: TTaskStatus[]): IKanban {
	const board: IKanban = {};
	const placed = new Set<string>();
	const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

	for (const status of taskStatuses) {
		const key = status.name ?? '';
		board[key] = filteredTasks.filter((task) => {
			// Primary: the status relation. Fallback: tasks whose `taskStatusId` is null (older / seeded /
			// API-created tasks) but whose `status` NAME matches — they used to vanish from the board
			// entirely while still showing in the Tasks list (WEB-010).
			const match =
				task.taskStatusId === status.id ||
				(!task.taskStatusId && !!task.status && norm(String(task.status)) === norm(status.name) && !placed.has(task.id));
			if (match) placed.add(task.id);
			return match;
		});
	}

	// Anything still unplaced (no status at all, or a status id from another team's status set) goes into
	// the first column so it is at least visible and can be dragged to the right place.
	const firstKey = taskStatuses[0]?.name;
	if (firstKey !== undefined && firstKey !== null) {
		const orphans = filteredTasks.filter((task) => !placed.has(task.id));
		if (orphans.length) board[firstKey] = [...(board[firstKey] ?? []), ...orphans];
	}
	return board;
}
