import { textOption } from '../args.js';
import { Command, CommandContext } from '../command.js';
import { recordOfLog, workOf } from '../entries.js';
import { clockOf, dayOf, durationText } from '../format.js';
import { namesOf, workNamed } from '../lookup.js';
import { pastRangeOf } from '../past-range.js';
import { openSession } from '../session.js';

async function log(context: CommandContext): Promise<void> {
	const { values, io } = context;
	const now = io.now();
	const range = pastRangeOf(values, now);
	const client = openSession(context);
	const work = await workNamed(client, values);
	const note = textOption(values, 'note') || undefined;
	const created = await client.timeEntries.create({
		startedAt: range.start,
		stoppedAt: range.end,
		projectId: work.projectId,
		taskId: work.taskId,
		description: note
	});
	const names = await namesOf(client, created, work);
	const entry = recordOfLog(created, names, now);
	const when = `on ${dayOf(range.start)}, from ${clockOf(range.start)} to ${clockOf(range.end)}`;
	context.output.result({ added: true, entry }, [
		`Added ${durationText(entry.durationSeconds)} ${when}${workOf(entry)}.`
	]);
}

export const logCommand: Command = {
	name: 'log',
	summary: 'Add a past time entry, where your organization allows manual time',
	usage:
		'log --from <HH:MM> --to <HH:MM> [--date <YYYY-MM-DD>] [options]\n' +
		'       ever-teams log --duration <1h30m> [--from <HH:MM> | --to <HH:MM>] [--date <YYYY-MM-DD>] [options]',
	description:
		'Adds time you worked without the timer: from a time to another on a day (today by default), or for a\n' +
		'duration that starts at --from, ends at --to, or ends now. Times are in the time zone of this computer.\n' +
		'Your organization must allow manual time; an entry over a running timer or a break is refused.',
	options: {
		from: { type: 'string' },
		to: { type: 'string' },
		date: { type: 'string' },
		duration: { type: 'string' },
		project: { type: 'string' },
		task: { type: 'string' },
		note: { type: 'string' }
	},
	optionHelp: [
		['--from <HH:MM>', 'When the entry starts'],
		['--to <HH:MM>', 'When it ends'],
		['--date <YYYY-MM-DD>', 'The day of --from and --to; today by default'],
		['--duration <1h30m>', 'How long it lasts: 1h30m, 2h or 45m'],
		['--project <name or id>', 'One of your projects (ever-teams projects lists them)'],
		['--task <number or id>', 'One of your tasks: 12, #12, its number as the app shows it, or its id'],
		['--note <text>', 'What you worked on']
	],
	examples: [
		'ever-teams log --from 09:00 --to 10:30 --project Website --note "Call with the client"',
		'ever-teams log --date 2026-11-17 --from 14:00 --to 16:15 --task 12',
		'ever-teams log --duration 45m --note "Code review"'
	],
	run: log
};
