/** @jest-environment jsdom */
/**
 * #5022: when a running timer is worth a reminder. One at the employee's threshold, one more at twice it, never a
 * third; quiet hours keep the system notification away.
 */
import {
	DEFAULT_TIMER_REMINDER_HOURS,
	isWithinQuietHours,
	nextTimerReminderAt,
	recordTimerReminder,
	shownTimerReminderLevel,
	timerReminderHoursOf,
	timerReminderLevelAt,
	timerRunOf
} from './timer-reminders';

const HOUR = 60 * 60 * 1000;

describe('the threshold', () => {
	it('is eight hours unless the employee chose another, and off when they chose none', () => {
		expect(timerReminderHoursOf(undefined)).toBe(DEFAULT_TIMER_REMINDER_HOURS);
		expect(timerReminderHoursOf({})).toBe(8);
		expect(timerReminderHoursOf({ timerReminderHours: 6 })).toBe(6);
		expect(timerReminderHoursOf({ timerReminderHours: null })).toBeNull();
		expect(timerReminderHoursOf({ timerReminderHours: 0 })).toBeNull();
	});

	it('falls back to the default for a value that is no number of hours in a day', () => {
		expect(timerReminderHoursOf({ timerReminderHours: -2 })).toBe(8);
		expect(timerReminderHoursOf({ timerReminderHours: 30 })).toBe(8);
		expect(timerReminderHoursOf({ timerReminderHours: '4' as never })).toBe(8);
	});
});

describe('the run of a timer', () => {
	it('is the running time log, kept under its id, else under its start', () => {
		const startedAt = '2026-11-11T08:00:00.000Z';
		expect(timerRunOf({ running: true, lastLog: { id: 'log-1', startedAt } as never })).toEqual({
			key: 'log-1',
			startedAt: Date.parse(startedAt)
		});
		expect(timerRunOf({ running: true, lastLog: { startedAt } as never })?.key).toBe(startedAt);
	});

	it('is none for a stopped timer, or one whose start is unknown', () => {
		expect(
			timerRunOf({ running: false, lastLog: { id: 'log-1', startedAt: '2026-11-11T08:00:00Z' } as never })
		).toBeNull();
		expect(timerRunOf({ running: true, lastLog: {} as never })).toBeNull();
		expect(timerRunOf(null)).toBeNull();
	});
});

describe('the reminders of a run', () => {
	const run = { key: 'log-1', startedAt: Date.parse('2026-11-11T08:00:00Z') };

	it('come at the threshold and at twice it', () => {
		expect(timerReminderLevelAt(8 * HOUR - 1, 8)).toBe(0);
		expect(timerReminderLevelAt(8 * HOUR, 8)).toBe(1);
		expect(timerReminderLevelAt(16 * HOUR - 1, 8)).toBe(1);
		expect(timerReminderLevelAt(16 * HOUR, 8)).toBe(2);
		expect(timerReminderLevelAt(40 * HOUR, 8)).toBe(2);
	});

	it('are due one after the other, and never a third', () => {
		expect(nextTimerReminderAt(run, 8, 0)).toBe(run.startedAt + 8 * HOUR);
		expect(nextTimerReminderAt(run, 8, 1)).toBe(run.startedAt + 16 * HOUR);
		expect(nextTimerReminderAt(run, 8, 2)).toBeNull();
	});

	it('are noted for the current run only, shared by every tab of the browser', () => {
		recordTimerReminder('log-1', 1);
		expect(shownTimerReminderLevel('log-1')).toBe(1);
		expect(shownTimerReminderLevel('log-2')).toBe(0);

		recordTimerReminder('log-2', 2);
		expect(shownTimerReminderLevel('log-2')).toBe(2);
		expect(shownTimerReminderLevel('log-1')).toBe(0);
	});
});

describe('the quiet hours', () => {
	const at = (iso: string) => new Date(iso);
	const night = { start: '22:00', end: '07:00', timeZone: 'UTC' };

	it('span midnight when they end before they start', () => {
		expect(isWithinQuietHours(at('2026-11-11T23:30:00Z'), night)).toBe(true);
		expect(isWithinQuietHours(at('2026-11-11T06:59:00Z'), night)).toBe(true);
		expect(isWithinQuietHours(at('2026-11-11T07:00:00Z'), night)).toBe(false);
		expect(isWithinQuietHours(at('2026-11-11T12:00:00Z'), night)).toBe(false);
	});

	it("are read in the window's own time zone", () => {
		// 21:30 UTC is 22:30 in Paris in November
		expect(isWithinQuietHours(at('2026-11-11T21:30:00Z'), { ...night, timeZone: 'Europe/Paris' })).toBe(true);
		expect(isWithinQuietHours(at('2026-11-11T21:30:00Z'), night)).toBe(false);
	});

	it('are none without a window, or with an empty one', () => {
		expect(isWithinQuietHours(at('2026-11-11T23:30:00Z'), null)).toBe(false);
		expect(isWithinQuietHours(at('2026-11-11T23:30:00Z'), { start: '09:00', end: '09:00' })).toBe(false);
	});
});
