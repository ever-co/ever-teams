import { describe, expect, it } from '@jest/globals';
import { DEFAULT_TASK_DUE_REMINDER_HOURS, taskDueNoticeOf, taskDueReminderHoursOf } from './task-due-reminders';

describe('taskDueReminderHoursOf', () => {
	it('is a day when nothing was chosen, or something Gauzy does not read as a threshold', () => {
		for (const hours of [undefined, -1, 500, Number.NaN]) {
			expect(taskDueReminderHoursOf({ taskDueReminderHours: hours })).toBe(DEFAULT_TASK_DUE_REMINDER_HOURS);
		}
		expect(taskDueReminderHoursOf(null)).toBe(DEFAULT_TASK_DUE_REMINDER_HOURS);
	});

	it('is off when the person turned the reminders off', () => {
		expect(taskDueReminderHoursOf({ taskDueReminderHours: null })).toBeNull();
		expect(taskDueReminderHoursOf({ taskDueReminderHours: 0 })).toBeNull();
	});

	it('reads a chosen threshold up to a week', () => {
		expect(taskDueReminderHoursOf({ taskDueReminderHours: 4 })).toBe(4);
		expect(taskDueReminderHoursOf({ taskDueReminderHours: 168 })).toBe(168);
	});
});

describe('taskDueNoticeOf (the messages Gauzy files with a due date reminder)', () => {
	it('reads the day a day-only due date names', () => {
		expect(taskDueNoticeOf('Due by the end of 2026-11-20.')).toEqual({ kind: 'day', day: '2026-11-20' });
	});

	it('reads the moment a due date names, in the zone Gauzy told it in', () => {
		expect(taskDueNoticeOf('Due at 2026-11-19 17:00 (Europe/Paris).')).toEqual({
			kind: 'moment',
			at: new Date('2026-11-19T16:00:00.000Z'),
			timeZone: 'Europe/Paris'
		});
		// Summer time in Paris is two hours ahead of UTC
		expect(taskDueNoticeOf('Due at 2026-07-01 09:30 (Europe/Paris).')).toMatchObject({
			at: new Date('2026-07-01T07:30:00.000Z')
		});
		expect(taskDueNoticeOf('Due at 2026-11-19 08:00 (UTC).')).toMatchObject({
			at: new Date('2026-11-19T08:00:00.000Z')
		});
	});

	it('keeps the message of a time the zone shows twice, when the clocks go back', () => {
		// 02:30 in Paris on 2026-10-25 is both 00:30 and 01:30 UTC
		expect(taskDueNoticeOf('Due at 2026-10-25 02:30 (Europe/Paris).')).toBeNull();
		expect(taskDueNoticeOf('Due at 2026-10-25 03:30 (Europe/Paris).')).toMatchObject({
			at: new Date('2026-10-25T02:30:00.000Z')
		});
	});

	it('reads nothing from any other message, or a zone the browser does not know', () => {
		expect(taskDueNoticeOf('Status: open → done.')).toBeNull();
		expect(taskDueNoticeOf(null)).toBeNull();
		expect(taskDueNoticeOf('Due at 2026-11-19 17:00 (Not/AZone).')).toBeNull();
	});
});
