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

describe('formatStartAndEndDateRange in the time zone the request sends', () => {
	// The browser is in Tokyo; the request sends the user's profile zone, whose days the API lists the logs in
	beforeEach(() => setTimeZone('Asia/Tokyo'));

	it('runs over the days of the zone it is given, not the browser ones', () => {
		expect(formatStartAndEndDateRange('2026-10-25', '2026-10-25', 'America/Los_Angeles')).toEqual({
			start: '2026-10-25T07:00:00.000Z',
			end: '2026-10-26T06:59:59.999Z'
		});
		expect(formatStartAndEndDateRange('2026-10-23', '2026-10-25', 'UTC')).toEqual({
			start: '2026-10-23T00:00:00.000Z',
			end: '2026-10-25T23:59:59.999Z'
		});
	});

	it('keeps the day the date stands for in the app (a picked browser day, a UTC-midnight plan date)', () => {
		// The date picker hands over the browser midnight of the picked day: October 25 in Tokyo
		const pickedDay = new Date('2026-10-24T15:00:00.000Z');
		expect(formatStartAndEndDateRange(pickedDay, pickedDay, 'America/Los_Angeles')).toEqual({
			start: '2026-10-25T07:00:00.000Z',
			end: '2026-10-26T06:59:59.999Z'
		});

		const planDate = new Date('2026-10-24T00:00:00.000Z');
		expect(formatStartAndEndDateRange(planDate, planDate, 'America/Los_Angeles')).toEqual({
			start: '2026-10-24T07:00:00.000Z',
			end: '2026-10-25T06:59:59.999Z'
		});
	});

	it('covers the whole 23-hour and 25-hour days of a DST change in that zone', () => {
		expect(formatStartAndEndDateRange('2026-03-08', '2026-03-08', 'America/New_York')).toEqual({
			start: '2026-03-08T05:00:00.000Z',
			end: '2026-03-09T03:59:59.999Z'
		});
		expect(formatStartAndEndDateRange('2026-11-01', '2026-11-01', 'America/New_York')).toEqual({
			start: '2026-11-01T04:00:00.000Z',
			end: '2026-11-02T04:59:59.999Z'
		});
	});

	it('starts a day whose midnight the clocks skip at 01:00, and ends one whose midnight they repeat at the second', () => {
		expect(formatStartAndEndDateRange('2026-04-04', '2026-04-04', 'America/Santiago')).toEqual({
			start: '2026-04-04T03:00:00.000Z',
			end: '2026-04-05T03:59:59.999Z'
		});
		expect(formatStartAndEndDateRange('2026-09-06', '2026-09-06', 'America/Santiago')).toEqual({
			start: '2026-09-06T04:00:00.000Z',
			end: '2026-09-07T02:59:59.999Z'
		});
	});

	it('falls back to the browser days for a zone the runtime does not know', () => {
		expect(formatStartAndEndDateRange('2026-10-25', '2026-10-25', 'Not/AZone')).toEqual({
			start: '2026-10-24T15:00:00.000Z',
			end: '2026-10-25T14:59:59.999Z'
		});
	});
});
