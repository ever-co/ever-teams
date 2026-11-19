import { EverTeamsClient, EverTeamsError, EverTeamsProject, EverTeamsTask, EverTeamsTimeLog } from '@ever-teams/api';
import { OptionValues, textOption } from './args.js';
import { Names, ProjectName, TaskName } from './entries.js';
import { Refusal } from './refusals.js';

/** The project and the task a command was given, read from the member's own. */
export interface Work extends Names {
	projectId: string | undefined;
	taskId: string | undefined;
}

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

const sameText = (a: string, b: string): boolean => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** The member's project whose id or name `query` is. */
export async function findProject(client: EverTeamsClient, query: string): Promise<EverTeamsProject> {
	const projects = await client.projects.list();
	const byId = projects.find((project) => project.id === query);
	if (byId) {
		return byId;
	}
	const named = projects.filter((project) => sameText(project.name, query));
	if (named.length === 1) {
		return named[0];
	}
	if (named.length > 1) {
		const count = named.length;
		const message = `${count} of your projects are named ${query}: give the id of one, from ever-teams projects.`;
		throw new Refusal('AMBIGUOUS_PROJECT', message);
	}
	const message = `None of your projects is named ${query}: run ever-teams projects to see their names and ids.`;
	throw new Refusal('NO_SUCH_PROJECT', message);
}

// "12", "#12", or the number the app shows with its prefix ("WEB-12").
function hasNumber(task: EverTeamsTask, query: string): boolean {
	const digits = query.trim().replace(/^#/, '');
	const isNumber = /^\d+$/.test(digits);
	const sameNumber = isNumber && task.number === Number(digits);
	const sameTaskNumber = sameText(task.taskNumber ?? '', query);
	return sameNumber || sameTaskNumber;
}

/** The member's task whose id or number `query` is, in `project` when one is given. */
export async function findTask(
	client: EverTeamsClient,
	query: string,
	project: ProjectName | null
): Promise<EverTeamsTask> {
	const tasks = await client.tasks.list({ projectId: project?.id });
	const byId = tasks.find((task) => task.id === query);
	if (byId) {
		return byId;
	}
	const numbered = tasks.filter((task) => hasNumber(task, query));
	if (numbered.length === 1) {
		return numbered[0];
	}
	if (numbered.length > 1) {
		const count = numbered.length;
		const message = `${count} of your tasks have the number ${query}: add --project, or give the task's id.`;
		throw new Refusal('AMBIGUOUS_TASK', message);
	}
	let place = '';
	if (project) {
		place = ` in ${project.name}`;
	}
	const message = `None of your tasks${place} has the number or id ${query}: check its number in the web app.`;
	throw new Refusal('NO_SUCH_TASK', message);
}

/** What --project and --task name. A task given alone brings its own project. */
export async function workNamed(client: EverTeamsClient, values: OptionValues): Promise<Work> {
	const projectQuery = textOption(values, 'project');
	const taskQuery = textOption(values, 'task');
	let project: EverTeamsProject | null = null;
	if (projectQuery !== undefined) {
		project = await findProject(client, projectQuery);
	}
	let task: EverTeamsTask | null = null;
	if (taskQuery !== undefined) {
		task = await findTask(client, taskQuery, project);
	}
	const projectId = project?.id ?? task?.projectId ?? undefined;
	return { project, task, projectId, taskId: task?.id };
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
