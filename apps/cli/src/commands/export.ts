import fs from 'node:fs';
import path from 'node:path';
import { flagOption, OptionValues, textOption } from '../args.js';
import { Command, CommandContext } from '../command.js';
import { csvOf } from '../csv.js';
import { EntryRecord, inStartOrder, recordOfEntry } from '../entries.js';
import { localDayOf } from '../past-range.js';
import { Refusal, UsageError } from '../refusals.js';
import { openSession } from '../session.js';

const FORMATS = new Set(['csv', 'json']);

function required(values: OptionValues, name: string, example: string): string {
	const value = textOption(values, name);
	if (value === undefined) {
		throw new UsageError(`Give --${name}, such as --${name} ${example}.`);
	}
	return value;
}

function checkPeriod(from: string, to: string): void {
	const start = localDayOf(from, '--from');
	const end = localDayOf(to, '--to');
	if (end.getTime() < start.getTime()) {
		throw new UsageError('--to must not be before --from.');
	}
}

function checkFormat(format: string): void {
	if (!FORMATS.has(format)) {
		throw new UsageError(`--format takes csv or json, not ${format}.`);
	}
}

function textOf(records: EntryRecord[], format: string): string {
	if (format === 'csv') {
		return csvOf(records);
	}
	return `${JSON.stringify(records, null, 2)}\n`;
}

function writeExport(file: string, text: string): string {
	const target = path.resolve(file);
	try {
		fs.writeFileSync(target, text);
	} catch (error) {
		const reason = (error as NodeJS.ErrnoException).code ?? 'an error';
		const step = 'check that its folder exists and that you may write there';
		throw new Refusal('CANNOT_WRITE', `${target} cannot be written (${reason}): ${step}.`);
	}
	return target;
}

function entriesWord(count: number): string {
	if (count === 1) {
		return '1 entry';
	}
	return `${count} entries`;
}

async function exportEntries(context: CommandContext): Promise<void> {
	const { values, io, output } = context;
	const from = required(values, 'from', '2026-11-01');
	const to = required(values, 'to', '2026-11-30');
	const format = required(values, 'format', 'csv');
	checkPeriod(from, to);
	checkFormat(format);
	const client = openSession(context);
	const mine = !flagOption(values, 'all');
	const listed = await client.timeEntries.list({ from, to, mine });
	const now = io.now();
	const records = inStartOrder(listed.map((entry) => recordOfEntry(entry, now)));
	const text = textOf(records, format);
	const file = textOption(values, 'output');
	if (file === undefined) {
		output.data(text);
		return;
	}
	const written = writeExport(file, text);
	output.result({ file: written, format, entries: records.length }, [
		`Wrote ${entriesWord(records.length)} to ${written}.`
	]);
}

export const exportCommand: Command = {
	name: 'export',
	summary: 'Write the time entries of a period as CSV or JSON',
	usage: 'export --from <YYYY-MM-DD> --to <YYYY-MM-DD> --format csv|json [--output <file>] [--all]',
	description:
		'Writes your time entries started from the first day to the last, both included, in the time zone of this\n' +
		'computer: to the standard output, or to a file with --output (replaced if it exists). In CSV, a text\n' +
		'that a spreadsheet would run as a formula (it starts with =, +, -, @) gets a leading quote.',
	options: {
		from: { type: 'string' },
		to: { type: 'string' },
		format: { type: 'string' },
		output: { type: 'string' },
		all: { type: 'boolean' }
	},
	optionHelp: [
		['--from <YYYY-MM-DD>', 'The first day'],
		['--to <YYYY-MM-DD>', 'The last day'],
		['--format csv|json', 'CSV with a header row, or a JSON list'],
		['--output <file>', 'Write to this file instead of the standard output'],
		['--all', "Every member's entries your token may see (the team's, for a manager), not only yours"]
	],
	examples: [
		'ever-teams export --from 2026-11-01 --to 2026-11-30 --format csv --output november.csv',
		'ever-teams export --from 2026-11-18 --to 2026-11-18 --format json'
	],
	run: exportEntries
};
