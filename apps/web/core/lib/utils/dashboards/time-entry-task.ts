import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';

interface TaskWithProject {
	id: string;
	projectId?: string | null;
}

export function findProject(projectId: string | null | undefined, projects: TOrganizationProject[]) {
	if (!projectId) {
		return undefined;
	}
	return projects.find((project) => project.id === projectId);
}

/** The project of an entry on this task: the task's own project as it is now, or else the one picked by hand. */
export function entryProjectIdOf(task: { projectId?: string | null } | undefined, pickedProjectId: string): string {
	const taskProjectId = task?.projectId;
	if (taskProjectId) {
		return taskProjectId;
	}
	return pickedProjectId;
}

/**
 * A task's time goes to the task's own project: when the task has one, it is the only project offered. A task
 * project missing from the list (archived, or not loaded yet) offers none, since another pick would not be saved.
 */
export function projectChoicesFor(
	taskProjectId: string | null | undefined,
	taskProject: TOrganizationProject | undefined,
	projects: TOrganizationProject[]
) {
	if (!taskProjectId) {
		return projects;
	}
	if (taskProject) {
		return [taskProject];
	}
	return [];
}

/**
 * Whether an entry may move to a task of the listed team. An entry filed under another team keeps its task: a task
 * of the listed team would leave it with a team and a task of two different teams.
 */
export function isEntryOfListedTeam(entryTeamId: string | null | undefined, listedTeamId: string | null | undefined) {
	if (!entryTeamId) {
		return true;
	}
	return entryTeamId === listedTeamId;
}

/** The listed tasks, with the entry's own task first when the list does not hold it, so the entry always shows it. */
export function taskChoicesOfEntry<Task extends { id: string }>(
	entryTask: Task | null | undefined,
	listedTasks: ReadonlyArray<Task>
): Task[] {
	if (!entryTask) {
		return [...listedTasks];
	}
	const isListed = listedTasks.some((task) => task.id === entryTask.id);
	if (isListed) {
		return [...listedTasks];
	}
	return [entryTask, ...listedTasks];
}

export interface EntryTaskChange {
	taskId: string;
	/** Undefined when neither the task nor the entry has a project: the update then sends no project at all. */
	projectId: string | undefined;
}

/**
 * What an update sends when an entry moves to another task: the task, and the project the entry is then filed
 * under (the API writes both as sent, it does not follow the task's project by itself). Null while the task is the
 * entry's own.
 */
export function entryTaskChangeOf(
	entryTaskId: string | null | undefined,
	pickedTask: TaskWithProject | undefined,
	pickedProjectId: string
): EntryTaskChange | null {
	if (!pickedTask) {
		return null;
	}
	const isSameTask = pickedTask.id === entryTaskId;
	if (isSameTask) {
		return null;
	}
	const projectId = entryProjectIdOf(pickedTask, pickedProjectId);
	if (!projectId) {
		return { taskId: pickedTask.id, projectId: undefined };
	}
	return { taskId: pickedTask.id, projectId };
}
