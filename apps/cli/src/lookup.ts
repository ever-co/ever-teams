import { EverTeamsClient, EverTeamsError, EverTeamsTimeLog } from '@ever-teams/api';
import { Names, ProjectName, TaskName } from './entries.js';

// A name is a courtesy: when the member's projects or tasks cannot be read, the entry shows its ids, and the command,
// whose own call succeeded, does not fail for it.
async function quietly<T>(read: () => Promise<T>): Promise<T | null> {
	try {
		return await read();
	} catch (error) {
		if (error instanceof EverTeamsError) {
			return null;
		}
		throw error;
	}
}

async function projectNamed(client: EverTeamsClient, projectId: string | null): Promise<ProjectName | null> {
	if (!projectId) {
		return null;
	}
	const projects = await quietly(() => client.projects.list());
	const found = projects?.find((project) => project.id === projectId);
	return found ?? null;
}

async function taskNamed(client: EverTeamsClient, log: EverTeamsTimeLog): Promise<TaskName | null> {
	if (!log.taskId) {
		return null;
	}
	const projectId = log.projectId ?? undefined;
	const tasks = await quietly(() => client.tasks.list({ projectId }));
	const found = tasks?.find((task) => task.id === log.taskId);
	return found ?? null;
}

/** The project and task of a time log, read from the member's own; those already known are not read again. */
export async function namesOf(
	client: EverTeamsClient,
	log: EverTeamsTimeLog,
	known: Partial<Names> = {}
): Promise<Names> {
	const project = known.project ?? (await projectNamed(client, log.projectId));
	const task = known.task ?? (await taskNamed(client, log));
	return { project, task };
}
