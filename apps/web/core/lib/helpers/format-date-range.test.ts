/**
 * Gauzy filters time logs on the exact instants of the range, so the range runs over the viewer's own days: from local
 * midnight of the first day to 1 ms before the local midnight that follows the last one.
 *
 * Jest hands each test file a copy of process.env, where TZ changes nothing. The zone is set on the real process,
 * reached through node:vm, and put back once the file is done.
 */
import { runInThisContext } from 'node:vm';
import { formatStartAndEndDateRange } from './format-date-range';

const realProcess = runInThisContext('process') as NodeJS.Process;
const runnerTimeZone = realProcess.env.TZ;

const setTimeZone = (timeZone: string) => {
	realProcess.env.TZ = timeZone;
};

afterAll(() => {
	if (runnerTimeZone === undefined) {
		delete realProcess.env.TZ;
		return;
	}
	realProcess.env.TZ = runnerTimeZone;
});

describe('formatStartAndEndDateRange', () => {
	it('keeps the UTC bounds for a user in UTC', () => {
		setTimeZone('UTC');

		expect(formatStartAndEndDateRange('2026-10-23', '2026-10-25')).toEqual({
			start: '2026-10-23T00:00:00.000Z',
			end: '2026-10-25T23:59:59.999Z'
		});
	});

	it('runs a date-only range over the local days west and east of UTC', () => {
		setTimeZone('America/Los_Angeles');
		expect(formatStartAndEndDateRange('2026-10-25', '2026-10-25')).toEqual({
			start: '2026-10-25T07:00:00.000Z',
			end: '2026-10-26T06:59:59.999Z'
		});

		setTimeZone('Asia/Tokyo');
		expect(formatStartAndEndDateRange('2026-10-25', '2026-10-25')).toEqual({
			start: '2026-10-24T15:00:00.000Z',
			end: '2026-10-25T14:59:59.999Z'
		});
	});

	it('keeps the date of a plan date stored at UTC midnight', () => {
		setTimeZone('America/Los_Angeles');
		const planDate = new Date('2026-10-24T00:00:00.000Z');

		expect(formatStartAndEndDateRange(planDate, planDate)).toEqual({
			start: '2026-10-24T07:00:00.000Z',
			end: '2026-10-25T06:59:59.999Z'
		});
	});

	it('takes the local day of any other instant', () => {
		setTimeZone('America/Los_Angeles');
		// 23:30 on October 25 in Los Angeles, already October 26 in UTC
		const lateEvening = new Date('2026-10-26T06:30:00.000Z');

		expect(formatStartAndEndDateRange(lateEvening, lateEvening)).toEqual({
			start: '2026-10-25T07:00:00.000Z',
			end: '2026-10-26T06:59:59.999Z'
		});
	});

	it('covers the whole 23-hour and 25-hour days of a DST change', () => {
		setTimeZone('America/New_York');
		expect(formatStartAndEndDateRange('2026-03-08', '2026-03-08')).toEqual({
			start: '2026-03-08T05:00:00.000Z',
			end: '2026-03-09T03:59:59.999Z'
		});
		expect(formatStartAndEndDateRange('2026-11-01', '2026-11-01')).toEqual({
			start: '2026-11-01T04:00:00.000Z',
			end: '2026-11-02T04:59:59.999Z'
		});
	});

	it('ends 1 ms before the next local midnight when the clocks change at midnight', () => {
		// Santiago repeats 23:00 to 24:00 on April 4, 2026, and its September 6 starts at 01:00
		setTimeZone('America/Santiago');
		expect(formatStartAndEndDateRange('2026-04-04', '2026-04-04')).toEqual({
			start: '2026-04-04T03:00:00.000Z',
			end: '2026-04-05T03:59:59.999Z'
		});
		expect(formatStartAndEndDateRange('2026-09-06', '2026-09-06')).toEqual({
			start: '2026-09-06T04:00:00.000Z',
			end: '2026-09-07T02:59:59.999Z'
		});
	});
});

// The browser is in Tokyo; each request sends another zone, whose days the API lists the logs in. Each row: what it
// shows, the first and last day (a 'YYYY-MM-DD' string, or the Date the app holds), the zone, and the bounds expected.
const ZONED_RANGES: Array<[string, string | Date, string | Date, string, string, string]> = [
	[
		'the days of the zone it is given',
		'2026-10-25',
		'2026-10-25',
		'America/Los_Angeles',
		'2026-10-25T07:00:00.000Z',
		'2026-10-26T06:59:59.999Z'
	],
	['several UTC days', '2026-10-23', '2026-10-25', 'UTC', '2026-10-23T00:00:00.000Z', '2026-10-25T23:59:59.999Z'],
	// The date picker hands over the browser midnight of the picked day: October 25 in Tokyo
	[
		'a picked browser day',
		new Date('2026-10-24T15:00:00.000Z'),
		new Date('2026-10-24T15:00:00.000Z'),
		'America/Los_Angeles',
		'2026-10-25T07:00:00.000Z',
		'2026-10-26T06:59:59.999Z'
	],
	[
		'a plan date stored at UTC midnight',
		new Date('2026-10-24T00:00:00.000Z'),
		new Date('2026-10-24T00:00:00.000Z'),
		'America/Los_Angeles',
		'2026-10-24T07:00:00.000Z',
		'2026-10-25T06:59:59.999Z'
	],
	[
		'a 23-hour DST day',
		'2026-03-08',
		'2026-03-08',
		'America/New_York',
		'2026-03-08T05:00:00.000Z',
		'2026-03-09T03:59:59.999Z'
	],
	[
		'a 25-hour DST day',
		'2026-11-01',
		'2026-11-01',
		'America/New_York',
		'2026-11-01T04:00:00.000Z',
		'2026-11-02T04:59:59.999Z'
	],
	[
		'a day whose midnight the clocks repeat',
		'2026-04-04',
		'2026-04-04',
		'America/Santiago',
		'2026-04-04T03:00:00.000Z',
		'2026-04-05T03:59:59.999Z'
	],
	[
		'a day whose midnight the clocks skip (it starts at 01:00)',
		'2026-09-06',
		'2026-09-06',
		'America/Santiago',
		'2026-09-06T04:00:00.000Z',
		'2026-09-07T02:59:59.999Z'
	],
	[
		// Amman fell back from 01:00 to 00:00 on October 29, 2021: midnight came twice, the day starts at the first
		'a day whose midnight comes twice',
		'2021-10-29',
		'2021-10-29',
		'Asia/Amman',
		'2021-10-28T21:00:00.000Z',
		'2021-10-29T21:59:59.999Z'
	],
	[
		'the browser days for a zone the runtime does not know',
		'2026-10-25',
		'2026-10-25',
		'Not/AZone',
		'2026-10-24T15:00:00.000Z',
		'2026-10-25T14:59:59.999Z'
	]
];

describe('formatStartAndEndDateRange in the time zone the request sends', () => {
	beforeEach(() => setTimeZone('Asia/Tokyo'));

	it.each(ZONED_RANGES)('runs over %s', (_case, first, last, timeZone, start, end) => {
		expect(formatStartAndEndDateRange(first, last, timeZone)).toEqual({ start, end });
	});
});
