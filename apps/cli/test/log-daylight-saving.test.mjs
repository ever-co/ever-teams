// log in a time zone that moves its clocks for daylight saving: against the built command line, node --test
// test/*.test.mjs (from apps/cli, after tsc). The zone is set before this file makes any date, and Node applies it
// to every date the process makes after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from './support/cli.mjs';
import { json, recorded, signedIn, signedInHome, standInApi } from './support/stand-in-api.mjs';

process.env.TZ = 'America/New_York';

// On 2026-03-08 the clocks of New York go from 02:00 to 03:00: no time from 02:00 to 02:59 exists that day.
const NOW = new Date('2026-03-09T17:00:00Z');

const createdFrom = (request) =>
	json(201, {
		...recorded('timer.start'),
		startedAt: request.body.startedAt,
		stoppedAt: request.body.stoppedAt,
		isRunning: false,
		logType: 'MANUAL',
		duration: (Date.parse(request.body.stoppedAt) - Date.parse(request.body.startedAt)) / 1000
	});

const logApi = () => standInApi({ ...signedIn(), 'POST /timesheet/time-log': createdFrom });

const runLog = (args, api) => runCli(['log', ...args], { home: signedInHome(), fetch: api.fetch, now: NOW });

test('this process reads dates in New York time', () => {
	assert.equal(new Date(2026, 2, 8, 1, 30).toISOString(), '2026-03-08T06:30:00.000Z');
	assert.equal(new Date(2026, 2, 8, 3, 30).toISOString(), '2026-03-08T07:30:00.000Z');
});

test('a time the clocks skip is refused with its date, never moved to the next hour', async () => {
	const refused = [
		{ args: ['--date', '2026-03-08', '--from', '02:30', '--to', '04:00'], says: '--from 02:30' },
		{ args: ['--date', '2026-03-08', '--to', '02:00', '--duration', '1h'], says: '--to 02:00' }
	];
	for (const { args, says } of refused) {
		const api = logApi();

		const result = await runLog(args, api);

		assert.equal(result.code, 2, args.join(' '));
		assert.equal(
			result.stderr,
			`${says} does not exist on 2026-03-08 in this computer's time zone (the clocks skip it): pick another ` +
				'time. Run ever-teams log --help to see how to use it.\n'
		);
		assert.equal(api.requests.length, 0);
	}
});

test('times around the skipped hour are sent as the instants they are', async () => {
	const api = logApi();

	const result = await runLog(['--date', '2026-03-08', '--from', '01:30', '--to', '03:30'], api);

	const { body } = api.requests.find((request) => request.route === 'POST /timesheet/time-log');
	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Added 1h 00m on 2026-03-08, from 01:30 to 03:30.\n');
	assert.equal(body.startedAt, '2026-03-08T06:30:00.000Z');
	assert.equal(body.stoppedAt, '2026-03-08T07:30:00.000Z');
});
