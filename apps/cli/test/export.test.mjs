// export, against a stand-in API that answers what the API recorded: node --test test/*.test.mjs (from apps/cli,
// after tsc).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { csvOf } from '../dist/csv.js';
import { newHome, runCli } from './support/cli.mjs';
import { recorded, signedIn, signedInHome, standInApi } from './support/stand-in-api.mjs';

process.env.TZ = 'UTC';

const HEADER =
	'id,startedAt,stoppedAt,durationSeconds,running,projectId,projectName,taskId,taskNumber,taskTitle,note,logType,' +
	'billable,memberId,memberName';

const exportApi = (entries = recorded('timeEntries.list')) =>
	standInApi({ ...signedIn(), 'GET /timesheet/time-log': entries });

const PERIOD = ['--from', '2000-01-01', '--to', '2000-01-31'];

test("export writes the member's own entries of the period as CSV, one row each", async () => {
	const api = exportApi();

	const result = await runCli(['export', ...PERIOD, '--format', 'csv'], { home: signedInHome(), fetch: api.fetch });

	const { query } = api.requests[2];
	assert.equal(result.code, 0);
	assert.equal(
		result.stdout,
		`${HEADER}\r\n` +
			'<log-1>,2000-01-01T00:23:00.000Z,2000-01-01T00:25:00.000Z,2,false,,,,,,,TRACKED,true,<employee-1>,' +
			'<fullName-1>\r\n' +
			'<log-2>,2000-01-01T00:27:00.000Z,2000-01-01T00:29:00.000Z,2,false,<project-2>,<name-4>,<task-1>,' +
			'<taskNumber-1>,<title-1>,,TRACKED,true,<employee-1>,<fullName-1>\r\n'
	);
	assert.equal(query.get('startDate'), '2000-01-01T00:00:00.000Z');
	assert.equal(query.get('endDate'), '2000-01-31T23:59:59.999Z');
	assert.equal(query.get('employeeIds[0]'), '<employee-1>');
});

test('the CSV quotes what needs it and keeps a spreadsheet from running a formula', async () => {
	const [, onTask] = recorded('timeEntries.list');
	const notes = [
		'He said "done", then left',
		'two\nlines',
		'=HYPERLINK("https://example.com")',
		'-fixed',
		'@team',
		'plain'
	];
	const entries = notes.map((description, index) => ({ ...onTask, id: `<log-${index + 1}>`, description }));
	const api = exportApi(entries);

	const result = await runCli(['export', ...PERIOD, '--format', 'csv'], { home: signedInHome(), fetch: api.fetch });

	assert.match(result.stdout, /,"He said ""done"", then left",TRACKED,/);
	assert.match(result.stdout, /,"two\nlines",TRACKED,/);
	assert.match(result.stdout, /,"'=HYPERLINK\(""https:\/\/example\.com""\)",TRACKED,/);
	assert.match(result.stdout, /,'-fixed,TRACKED,/);
	assert.match(result.stdout, /,'@team,TRACKED,/);
	assert.match(result.stdout, /,plain,TRACKED,/);
	// The header, a row per entry, and the empty text after the last line end.
	assert.equal(result.stdout.split('\r\n').length, notes.length + 2);
});

test('the CSV columns are the keys of an entry in JSON, in the same order', async () => {
	const api = exportApi();

	const result = await runCli(['export', ...PERIOD, '--format', 'json'], { home: signedInHome(), fetch: api.fetch });

	const entries = JSON.parse(result.stdout);
	assert.equal(result.code, 0);
	assert.equal(entries.length, 2);
	assert.equal(Object.keys(entries[0]).join(','), HEADER);
	assert.equal(csvOf([]), `${HEADER}\r\n`);
	assert.equal(entries[1].projectName, '<name-4>');
});

test('--output writes the file and says how many entries it holds', async () => {
	const api = exportApi();
	const file = path.join(newHome(), 'november.csv');

	const plain = await runCli(['export', ...PERIOD, '--format', 'csv', '--output', file], {
		home: signedInHome(),
		fetch: api.fetch
	});
	const asJson = await runCli(['export', ...PERIOD, '--format', 'json', '--output', file, '--json'], {
		home: signedInHome(),
		fetch: api.fetch
	});

	assert.equal(plain.code, 0);
	assert.equal(plain.stdout, `Wrote 2 entries to ${file}.\n`);
	assert.deepEqual(JSON.parse(asJson.stdout), { file, format: 'json', entries: 2 });
	assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).length, 2);
});

test("--all exports every entry the token may see, the team's for a manager", async () => {
	const api = exportApi();

	const result = await runCli(['export', ...PERIOD, '--format', 'csv', '--all'], {
		home: signedInHome(),
		fetch: api.fetch
	});

	assert.equal(result.code, 0);
	assert.equal(api.requests[2].query.get('employeeIds[0]'), null);
});

test('a missing or malformed period or format is a usage error, and nothing is sent', async () => {
	const refused = [
		{ args: ['--to', '2026-11-30', '--format', 'csv'], says: 'Give --from, such as --from 2026-11-01.' },
		{ args: ['--from', '2026-11-01', '--to', '2026-11-30'], says: 'Give --format, such as --format csv.' },
		{ args: [...PERIOD, '--format', 'xml'], says: '--format takes csv or json, not xml.' },
		{
			args: ['--from', '2026-11-30', '--to', '2026-11-01', '--format', 'csv'],
			says: '--to must not be before --from.'
		},
		{
			args: ['--from', '2026-11-31', '--to', '2026-12-01', '--format', 'csv'],
			says: '--from 2026-11-31 is not a day of the calendar.'
		}
	];
	for (const { args, says } of refused) {
		const api = exportApi();

		const result = await runCli(['export', ...args], { home: signedInHome(), fetch: api.fetch });

		assert.equal(result.code, 2, args.join(' '));
		assert.equal(result.stderr, `${says} Run ever-teams export --help to see how to use it.\n`);
		assert.equal(api.requests.length, 0);
	}
});

test('a file that cannot be written fails with what to check', async () => {
	const api = exportApi();
	const file = path.join(newHome(), 'missing-folder', 'november.csv');

	const result = await runCli(['export', ...PERIOD, '--format', 'csv', '--output', file], {
		home: signedInHome(),
		fetch: api.fetch
	});

	assert.equal(result.code, 1);
	assert.equal(
		result.stderr,
		`${file} cannot be written (ENOENT): check that its folder exists and that you may write there.\n`
	);
});
