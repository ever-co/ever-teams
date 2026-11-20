import { textOption } from '../args.js';
import { Command, CommandContext } from '../command.js';
import { recordOfLog, workOf } from '../entries.js';
import { clockOf } from '../format.js';
import { namesOf, workNamed } from '../lookup.js';
import { openSession } from '../session.js';

async function start(context: CommandContext): Promise<void> {
	const client = openSession(context);
	const work = await workNamed(client, context.values);
	const note = textOption(context.values, 'note') || undefined;
	const log = await client.timer.start({ projectId: work.projectId, taskId: work.taskId, description: note });
	const names = await namesOf(client, log, work);
	const entry = recordOfLog(log, names, context.io.now());
	const startedAt = clockOf(new Date(entry.startedAt));
	context.output.result({ started: true, entry }, [`Timer started at ${startedAt}${workOf(entry)}.`]);
}

export const startCommand: Command = {
	name: 'start',
	summary: 'Start your timer, on a project or a task',
	usage: 'start [--project <name or id>] [--task <number or id>] [--note <text>]',
	description:
		'Starts your timer now, on the project or the task you name. A task given alone brings its project.\n' +
		'A timer already running stops first, as in the apps.',
	options: { project: { type: 'string' }, task: { type: 'string' }, note: { type: 'string' } },
	optionHelp: [
		['--project <name or id>', 'One of your projects (ever-teams projects lists them)'],
		['--task <number or id>', 'One of your tasks: 12, #12, its number as the app shows it, or its id'],
		['--note <text>', 'What you work on']
	],
	examples: [
		'ever-teams start',
		'ever-teams start --project Website --task 12',
		'ever-teams start --project Website --note "Call with the client"'
	],
	run: start
};
