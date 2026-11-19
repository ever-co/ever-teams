import { Command, CommandContext } from '../command.js';
import { ProjectName } from '../entries.js';
import { openSession } from '../session.js';

const byName = (a: ProjectName, b: ProjectName): number => a.name.localeCompare(b.name);

function linesOf(projects: ProjectName[]): string[] {
	if (projects.length === 0) {
		return ['You are a member of no project.'];
	}
	const width = Math.max(...projects.map((project) => project.name.length));
	return projects.map((project) => `${project.name.padEnd(width)}  ${project.id}`);
}

async function projects(context: CommandContext): Promise<void> {
	const client = openSession(context);
	const listed = await client.projects.list();
	const named = listed.map(({ id, name }): ProjectName => ({ id, name }));
	const sorted = named.sort(byName);
	context.output.result({ projects: sorted }, linesOf(sorted));
}

export const projectsCommand: Command = {
	name: 'projects',
	summary: 'List your projects, with the id of each',
	usage: 'projects',
	description: 'Lists the projects you are a member of, by name, with the id of each: start and log take either.',
	options: {},
	optionHelp: [],
	examples: ['ever-teams projects', 'ever-teams projects --json'],
	run: projects
};
