import { formatOverlapDuration, mergedPeriodsOf, overlapSummaryOf, type OverlapCandidateLog } from './time-log-overlap';

const at = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);
const period = (start: string, end: string) => ({ start: at(start), end: at(end) });
const NOW = at('23:00');

const trackedLog: OverlapCandidateLog = {
	id: 'tracked',
	startedAt: '2026-11-10T18:42:00.000Z',
	stoppedAt: '2026-11-10T19:20:00.000Z',
	isRunning: false,
	task: { title: 'Fix the login page' },
	project: { name: 'Website' }
};

describe('overlapSummaryOf', () => {
	it('counts a tracked entry the new entry covers entirely', () => {
		const summary = overlapSummaryOf({ periods: [period('18:30', '19:30')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(38 * 60);
		expect(summary.entries).toHaveLength(1);
		expect(summary.entries[0]).toMatchObject({
			id: 'tracked',
			overlappedSeconds: 38 * 60,
			isRunning: false,
			taskTitle: 'Fix the login page',
			projectName: 'Website'
		});
	});

	it('counts only the shared part of a partial overlap', () => {
		const summary = overlapSummaryOf({ periods: [period('19:00', '20:00')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(20 * 60);
	});

	it('counts the covered middle of an entry longer than the new one', () => {
		const summary = overlapSummaryOf({ periods: [period('18:50', '19:00')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(10 * 60);
	});

	it('removes nothing from an entry that only touches the new one', () => {
		const summary = overlapSummaryOf({ periods: [period('19:20', '20:00')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(0);
		expect(summary.entries).toEqual([]);
	});

	it('leaves the edited entry out', () => {
		const otherLog: OverlapCandidateLog = {
			id: 'other',
			startedAt: '2026-11-10T19:10:00.000Z',
			stoppedAt: '2026-11-10T19:40:00.000Z'
		};
		const summary = overlapSummaryOf({
			periods: [period('18:30', '19:30')],
			logs: [trackedLog, otherLog],
			ignoredLogId: 'tracked',
			now: NOW
		});

		expect(summary.entries.map((entry) => entry.id)).toEqual(['other']);
		expect(summary.totalSeconds).toBe(20 * 60);
	});

	it('counts a running entry up to now, whatever end the API last stored', () => {
		const runningLog: OverlapCandidateLog = {
			id: 'running',
			startedAt: '2026-11-10T22:00:00.000Z',
			stoppedAt: '2026-11-10T22:10:00.000Z',
			isRunning: true
		};
		const summary = overlapSummaryOf({ periods: [period('22:00', '23:30')], logs: [runningLog], now: NOW });

		expect(summary.totalSeconds).toBe(60 * 60);
		expect(summary.entries[0].isRunning).toBe(true);
		expect(summary.entries[0].end).toEqual(NOW);
	});

	it('counts a running entry without a stored end up to now', () => {
		const runningLog: OverlapCandidateLog = {
			id: 'running',
			startedAt: '2026-11-10T22:30:00.000Z',
			stoppedAt: null,
			isRunning: true
		};
		const summary = overlapSummaryOf({ periods: [period('22:00', '23:30')], logs: [runningLog], now: NOW });

		expect(summary.totalSeconds).toBe(30 * 60);
	});

	it('checks every period and counts an entry returned for two periods once', () => {
		const morningLog: OverlapCandidateLog = {
			id: 'morning',
			startedAt: '2026-11-10T09:00:00.000Z',
			stoppedAt: '2026-11-10T09:30:00.000Z'
		};
		const summary = overlapSummaryOf({
			periods: [period('09:10', '09:20'), period('18:30', '19:00'), period('19:10', '19:30')],
			logs: [trackedLog, morningLog, trackedLog],
			now: NOW
		});

		expect(summary.entries.map((entry) => entry.id)).toEqual(['morning', 'tracked']);
		expect(summary.entries[0].overlappedSeconds).toBe(10 * 60);
		expect(summary.entries[1].overlappedSeconds).toBe(28 * 60);
		expect(summary.totalSeconds).toBe(38 * 60);
	});

	it('counts the time two periods share once', () => {
		const summary = overlapSummaryOf({
			periods: [period('18:30', '19:10'), period('19:00', '19:30')],
			logs: [trackedLog],
			now: NOW
		});

		expect(summary.totalSeconds).toBe(38 * 60);
	});

	it('skips an entry without a readable start', () => {
		const brokenLog: OverlapCandidateLog = { id: 'broken', startedAt: null, stoppedAt: '2026-11-10T19:00:00.000Z' };
		const summary = overlapSummaryOf({ periods: [period('18:30', '19:30')], logs: [brokenLog], now: NOW });

		expect(summary.entries).toEqual([]);
	});

	it('reads missing task and project as null', () => {
		const bareLog: OverlapCandidateLog = {
			id: 'bare',
			startedAt: '2026-11-10T18:42:00.000Z',
			stoppedAt: '2026-11-10T19:20:00.000Z',
			task: null
		};
		const summary = overlapSummaryOf({ periods: [period('18:30', '19:30')], logs: [bareLog], now: NOW });

		expect(summary.entries[0].taskTitle).toBeNull();
		expect(summary.entries[0].projectName).toBeNull();
	});
});

describe('mergedPeriodsOf', () => {
	it('drops reversed and empty periods and merges the ones that touch', () => {
		const merged = mergedPeriodsOf([
			period('10:00', '11:00'),
			period('09:00', '10:00'),
			period('12:00', '12:00'),
			period('14:00', '13:00')
		]);

		expect(merged).toEqual([period('09:00', '11:00')]);
	});
});

describe('formatOverlapDuration', () => {
	it('writes minutes alone under an hour', () => {
		expect(formatOverlapDuration(37 * 60)).toBe('37m');
	});

	it('writes whole hours without minutes', () => {
		expect(formatOverlapDuration(2 * 3600)).toBe('2h');
	});

	it('writes hours and minutes', () => {
		expect(formatOverlapDuration(3600 + 5 * 60)).toBe('1h 5m');
	});

	it('never writes less than a minute', () => {
		expect(formatOverlapDuration(12)).toBe('1m');
	});
});
