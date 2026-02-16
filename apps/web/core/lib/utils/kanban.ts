
// ==================== PURE FILTER FUNCTIONS ====================
// These are pure functions (no hooks, no side effects) for testability and reusability.

import { KanbanFilterCriteria } from "@/core/types/interfaces/task/task";
import { TTask } from "@/core/types/schemas/task/task.schema";

export const matchesSearch = (task: TTask, search: string): boolean =>
	task.title.toLowerCase().includes(search.toLowerCase());

export const matchesPriority = (task: TTask, priority: string[]): boolean =>
	priority.length === 0 || priority.includes(task.priority as string);

export const matchesIssue = (task: TTask, issueValue: string | undefined): boolean =>
	!issueValue || task.issueType === issueValue;

export const matchesSize = (task: TTask, sizes: string[]): boolean =>
	sizes.length === 0 || sizes.includes(task.size as string);

export const matchesLabels = (task: TTask, labels: string[]): boolean =>
	labels.length === 0 || labels.some((label) => task.tags?.some((tag) => tag.name === label));

export const matchesEpics = (task: TTask, epics: string[]): boolean =>
	epics.length === 0 || epics.includes(task.id);

export const matchesEmployee = (task: TTask, employee: string | null): boolean =>
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
