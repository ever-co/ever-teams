/**
 * Where the clock of a running timer counts from: the run's start, so a start moved on the web or on the phone shows
 * on both at the next status read.
 */
import { runStartOf } from './timer-run-start';

const STARTED_AT = '2026-11-16T09:00:00.000Z';

describe('runStartOf', () => {
	it("counts from the running log's start, not from when its entry was created", () => {
		const status = {
			running: true,
			duration: 0,
			lastLog: { startedAt: STARTED_AT, createdAt: '2026-11-16T09:25:00.000Z', duration: 0 }
		};

		expect(runStartOf(status)).toBe(Date.parse(STARTED_AT));
	});

	it('follows a start moved since the last read', () => {
		const moved = { running: true, duration: 0, lastLog: { startedAt: '2026-11-16T08:30:00.000Z' } };

		expect(runStartOf(moved)).toBe(Date.parse('2026-11-16T08:30:00.000Z'));
	});

	it('gives no start when no timer runs, or when the status does not say when it started', () => {
		expect(runStartOf({ running: false, lastLog: { startedAt: STARTED_AT } })).toBeNull();
		expect(runStartOf({ running: true })).toBeNull();
		expect(runStartOf({ running: true, lastLog: { startedAt: 'not a date' } })).toBeNull();
		expect(runStartOf(null)).toBeNull();
	});
});
