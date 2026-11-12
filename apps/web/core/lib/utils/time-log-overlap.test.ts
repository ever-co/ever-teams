import {
	formatOverlapDuration,
	hasUnreadableInterval,
	overlapSummaryOf,
	periodsOverlapEachOther,
	type OverlapCandidateLog
} from './time-log-overlap';

const at = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);
const period = (start: string, end: string) => ({ start: at(start), end: at(end) });
const NOW = at('23:00');
const WHOLE_TRACKED_ENTRY = 38 * 60;

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

		expect(summary.totalSeconds).toBe(WHOLE_TRACKED_ENTRY);
		expect(summary.entries).toHaveLength(1);
		expect(summary.entries[0]).toMatchObject({
			id: 'tracked',
			start: at('18:42'),
			end: at('19:20'),
			removedSeconds: WHOLE_TRACKED_ENTRY,
			isRunning: false,
			taskTitle: 'Fix the login page',
			projectName: 'Website'
		});
	});

	// Measured on the API: any overlap removes the overlapped entry whole, never only the time they share
	it('a 1h 54m entry overlapped for 37 minutes counts 1h 54m', () => {
		const longLog: OverlapCandidateLog = {
			id: 'long',
			startedAt: '2026-11-10T12:53:00.000Z',
			stoppedAt: '2026-11-10T14:47:00.000Z'
		};
		const summary = overlapSummaryOf({ periods: [period('12:30', '13:30')], logs: [longLog], now: NOW });

		expect(summary.entries[0].removedSeconds).toBe(114 * 60);
		expect(summary.totalSeconds).toBe(114 * 60);
		expect(formatOverlapDuration(summary.totalSeconds)).toBe('1h 54m');
	});

	it('counts the whole entry when the new one overlaps its start', () => {
		const summary = overlapSummaryOf({ periods: [period('18:30', '18:50')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(WHOLE_TRACKED_ENTRY);
	});

	it('counts the whole entry when the new one overlaps its end', () => {
		const summary = overlapSummaryOf({ periods: [period('19:00', '20:00')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(WHOLE_TRACKED_ENTRY);
	});

	it('counts the whole entry when the new one sits in its middle', () => {
		const summary = overlapSummaryOf({ periods: [period('18:50', '19:00')], logs: [trackedLog], now: NOW });

		expect(summary.totalSeconds).toBe(WHOLE_TRACKED_ENTRY);
	});

	it('removes nothing from an entry that only touches the new one', () => {
		const endsWhereItStarts = overlapSummaryOf({
			periods: [period('19:20', '20:00')],
			logs: [trackedLog],
			now: NOW
		});
		const startsWhereItEnds = overlapSummaryOf({
			periods: [period('18:00', '18:42')],
			logs: [trackedLog],
			now: NOW
		});

		expect(endsWhereItStarts.totalSeconds).toBe(0);
		expect(endsWhereItStarts.entries).toEqual([]);
		expect(startsWhereItEnds.entries).toEqual([]);
	});

	it('removes nothing for a reversed or an empty period', () => {
		const summary = overlapSummaryOf({
			periods: [period('19:30', '18:30'), period('19:00', '19:00')],
			logs: [trackedLog],
			now: NOW
		});

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
		expect(summary.totalSeconds).toBe(30 * 60);
	});

	it('counts a running entry from its start up to now, whatever end the API last stored', () => {
		const runningLog: OverlapCandidateLog = {
			id: 'running',
			startedAt: '2026-11-10T22:00:00.000Z',
			stoppedAt: '2026-11-10T22:10:00.000Z',
			isRunning: true
		};
		const summary = overlapSummaryOf({ periods: [period('22:45', '23:30')], logs: [runningLog], now: NOW });

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

	it('checks every period and counts an entry two periods overlap once, whole', () => {
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
		expect(summary.entries[0].removedSeconds).toBe(30 * 60);
		expect(summary.entries[1].removedSeconds).toBe(WHOLE_TRACKED_ENTRY);
		expect(summary.totalSeconds).toBe(30 * 60 + WHOLE_TRACKED_ENTRY);
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

describe('hasUnreadableInterval', () => {
	it('reads a stopped entry with a start and an end, and a running entry with a start alone', () => {
		const runningLog: OverlapCandidateLog = {
			id: 'running',
			startedAt: '2026-11-10T22:30:00.000Z',
			isRunning: true
		};

		expect(hasUnreadableInterval(trackedLog)).toBe(false);
		expect(hasUnreadableInterval(runningLog)).toBe(false);
	});

	it('cannot read an entry without a start, or with a start that is not a date', () => {
		expect(hasUnreadableInterval({ id: 'a', startedAt: null, stoppedAt: '2026-11-10T19:00:00.000Z' })).toBe(true);
		expect(hasUnreadableInterval({ id: 'b', startedAt: 'soon', stoppedAt: '2026-11-10T19:00:00.000Z' })).toBe(true);
	});

	it('cannot read a stopped entry without an end', () => {
		expect(hasUnreadableInterval({ id: 'c', startedAt: '2026-11-10T18:42:00.000Z', stoppedAt: null })).toBe(true);
		expect(hasUnreadableInterval({ id: 'd', startedAt: '2026-11-10T18:42:00.000Z', isRunning: false })).toBe(true);
	});
});

describe('periodsOverlapEachOther', () => {
	it('finds two periods that share time, in any order', () => {
		expect(periodsOverlapEachOther([period('09:00', '10:00'), period('09:30', '11:00')])).toBe(true);
		expect(
			periodsOverlapEachOther([period('14:00', '15:00'), period('09:00', '10:00'), period('09:15', '09:45')])
		).toBe(true);
	});

	it('passes periods apart or only touching, and a single period', () => {
		expect(periodsOverlapEachOther([period('09:00', '10:00'), period('10:00', '11:00')])).toBe(false);
		expect(periodsOverlapEachOther([period('14:00', '15:00'), period('09:00', '10:00')])).toBe(false);
		expect(periodsOverlapEachOther([period('09:00', '10:00')])).toBe(false);
	});

	it('passes the same hours on two different days', () => {
		const nextDay = { start: new Date('2026-11-11T09:00:00.000Z'), end: new Date('2026-11-11T10:00:00.000Z') };

		expect(periodsOverlapEachOther([period('09:00', '10:00'), nextDay])).toBe(false);
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
