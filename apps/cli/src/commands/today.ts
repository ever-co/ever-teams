import { Command, CommandContext } from '../command.js';
import { EntryRecord, inStartOrder, labelOf, recordOfEntry } from '../entries.js';
import { clockOf, dayOf, durationText } from '../format.js';
import { openSession } from '../session.js';

function rangeOf(record: EntryRecord): string {
	const from = clockOf(new Date(record.startedAt));
	if (record.stoppedAt === null) {
		return `${from}-now`;
	}
	return `${from}-${clockOf(new Date(record.stoppedAt))}`;
}

function whatOf(record: EntryRecord): string {
	const label = labelOf(record) || '(no project)';
	if (!record.note) {
		return label;
	}
	return `${label}: ${record.note}`;
}

function lineOf(record: EntryRecord): string {
	const range = rangeOf(record).padEnd(11);
	const duration = durationText(record.durationSeconds).padStart(7);
	return `  ${range}  ${duration}  ${whatOf(record)}`;
}

function linesOf(day: string, records: EntryRecord[], totalSeconds: number): string[] {
	if (records.length === 0) {
		return [`Nothing tracked today (${day}).`];
	}
	const header = `Today (${day}): ${durationText(totalSeconds)} tracked.`;
	return [header, ...records.map(lineOf)];
}

async function today(context: CommandContext): Promise<void> {
	const client = openSession(context);
	const now = context.io.now();
	const day = dayOf(now);
	const listed = await client.timeEntries.list({ from: day, to: day, mine: true });
	const records = inStartOrder(listed.map((entry) => recordOfEntry(entry, now)));
	const totalSeconds = records.reduce((total, record) => total + record.durationSeconds, 0);
	context.output.result({ date: day, totalSeconds, entries: records }, linesOf(day, records, totalSeconds));
}

export const todayCommand: Command = {
	name: 'today',
	summary: "List today's time entries, with their total",
	usage: 'today',
	description:
		'Lists your time entries started today, in the time zone of this computer, with what each was on and the\n' +
		'total. A running entry counts up to now.',
	options: {},
	optionHelp: [],
	examples: ['ever-teams today', 'ever-teams today --json'],
	run: today
};
