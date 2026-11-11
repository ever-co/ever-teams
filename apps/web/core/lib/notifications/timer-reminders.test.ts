/** @jest-environment jsdom */
/**
 * #5022: when a running timer is worth a reminder. One at the employee's threshold, one more at twice it, never a
 * third; quiet hours keep the system notification away.
 */
import {
	claimTimerReminder,
	DEFAULT_TIMER_REMINDER_HOURS,
	givenTimerReminderLevel,
	timerReminderShownAt,
	isWithinQuietHours,
	nextTimerReminderAt,
	quietHoursEndAfter,
	recordTimerReminder,
	shownTimerReminderLevel,
	timerReminderGoesOutAt,
	timerReminderHoursOf,
	TIMER_REMINDER_HIDDEN_YIELD_MS,
	TIMER_REMINDER_DELIVERY_GRACE_MS,
	TIMER_REMINDER_MARK_MARGIN_MS,
	timerReminderDueAt,
	timerReminderLevelAt,
	timerReminderNoticeOf,
	timerReminderToMarkRead,
	timerRunOf,
	wasRemindedByServer
} from './timer-reminders';
import { TAB_CLAIM_TTL_MS } from '@/core/lib/realtime/tab-claim';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';

const HOUR = 60 * 60 * 1000;

describe('the threshold', () => {
	it('is eight hours unless the employee chose another, and off when they chose none', () => {
		expect(timerReminderHoursOf(undefined)).toBe(DEFAULT_TIMER_REMINDER_HOURS);
		expect(timerReminderHoursOf({})).toBe(8);
		expect(timerReminderHoursOf({ timerReminderHours: 6 })).toBe(6);
		// To the hundredth, as Gauzy's title names it: one the title cannot name is the default, as there
		expect(timerReminderHoursOf({ timerReminderHours: 1.234 })).toBe(1.23);
		expect(timerReminderHoursOf({ timerReminderHours: 0.004 })).toBe(DEFAULT_TIMER_REMINDER_HOURS);
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
		expect(givenTimerReminderLevel('log-1')).toBe(1);
		expect(givenTimerReminderLevel('log-2')).toBe(0);

		recordTimerReminder('log-2', 2);
		expect(givenTimerReminderLevel('log-2')).toBe(2);
		expect(givenTimerReminderLevel('log-1')).toBe(0);
	});

	it('keep one left to the platform apart from one the person was shown', () => {
		window.localStorage.clear();
		// Left to the platform's email or push: given, not shown
		recordTimerReminder('log-1', 1);
		expect(givenTimerReminderLevel('log-1')).toBe(1);
		expect(shownTimerReminderLevel('log-1')).toBe(0);

		recordTimerReminder('log-1', 2, { shown: true });
		expect(givenTimerReminderLevel('log-1')).toBe(2);
		expect(shownTimerReminderLevel('log-1')).toBe(2);

		// Never lower than one noted before
		recordTimerReminder('log-1', 1, { shown: true });
		expect(shownTimerReminderLevel('log-1')).toBe(2);
	});

	it('keep when the person was shown the last reminder shown', () => {
		window.localStorage.clear();
		jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-11T16:00:00Z'));
		recordTimerReminder('log-1', 1);
		expect(timerReminderShownAt('log-1')).toBeNull();

		recordTimerReminder('log-1', 1, { shown: true });
		expect(timerReminderShownAt('log-1')).toBe(Date.parse('2026-11-11T16:00:00Z'));
		jest.restoreAllMocks();
	});

	it('read a record written before the shown level existed as shown nothing', () => {
		window.localStorage.setItem('ever-teams:timer-reminder', JSON.stringify({ run: 'log-1', level: 2 }));
		expect(givenTimerReminderLevel('log-1')).toBe(2);
		expect(shownTimerReminderLevel('log-1')).toBe(0);
	});
});

describe('the claim of a reminder', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		window.localStorage.clear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	/** The claims settle on timers: the wait of a hidden tab, and the read-back of a browser without Web Locks. */
	const settled = async <T>(claim: Promise<T>) => {
		await jest.advanceTimersByTimeAsync(TIMER_REMINDER_HIDDEN_YIELD_MS + 1_000);
		return claim;
	};

	it('goes to one tab, the one in sight before a hidden one that reached it at the same moment', async () => {
		const hidden = claimTimerReminder('log-1', 1, false);
		const visible = claimTimerReminder('log-1', 1, true);

		await expect(settled(visible)).resolves.toBe(true);
		await expect(settled(hidden)).resolves.toBe(false);
		expect(givenTimerReminderLevel('log-1')).toBe(1);
	});

	it('is not given once a later reminder of the run was, and never takes the run back to a lower one', async () => {
		// A hidden tab waits to claim the first reminder; meanwhile a tab with a shorter threshold gave the second
		const hidden = claimTimerReminder('log-1', 1, false);
		recordTimerReminder('log-1', 2);

		await expect(settled(hidden)).resolves.toBe(false);
		expect(givenTimerReminderLevel('log-1')).toBe(2);

		recordTimerReminder('log-1', 1);
		expect(givenTimerReminderLevel('log-1')).toBe(2);
	});

	it('is given back when called off while it waited, so the next check can give the reminder', async () => {
		await expect(settled(claimTimerReminder('log-1', 1, false, () => true))).resolves.toBe(false);
		expect(givenTimerReminderLevel('log-1')).toBe(0);

		await expect(settled(claimTimerReminder('log-1', 1, true))).resolves.toBe(true);
	});

	it('is never given again for the run, even once the claim the tabs share has expired', async () => {
		await expect(settled(claimTimerReminder('log-1', 1, true))).resolves.toBe(true);
		jest.advanceTimersByTime(TAB_CLAIM_TTL_MS + 1);

		await expect(settled(claimTimerReminder('log-1', 1, true))).resolves.toBe(false);
		// The next reminder of the run, and the reminders of another run, are still to give
		await expect(settled(claimTimerReminder('log-1', 2, true))).resolves.toBe(true);
		await expect(settled(claimTimerReminder('log-2', 1, true))).resolves.toBe(true);
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

describe("the platform's own reminders", () => {
	/** A reminder as the platform files it: Gauzy's English title, about the run's time log. */
	const filed = (title: string, overrides: Record<string, unknown> = {}) => ({
		type: EEmployeeNotificationType.TimerReminder,
		title,
		entity: 'TimeLog',
		entityId: 'log-1',
		isRead: false,
		...overrides
	});

	it("read their level and hours off the platform's title, and their run off the record they are about", () => {
		expect(timerReminderNoticeOf(filed('Your timer has been running for 8 hours'))).toEqual({
			level: 1,
			hours: 8,
			timeLogId: 'log-1'
		});
		expect(timerReminderNoticeOf(filed('Your timer is still running after 16 hours on "Ship it"'))).toEqual({
			level: 2,
			hours: 16,
			timeLogId: 'log-1'
		});
		expect(timerReminderNoticeOf(filed('Your timer has been running for 1.5 hours'))?.hours).toBe(1.5);
		expect(timerReminderNoticeOf(filed('Your timer has been running for 1 hour'))?.hours).toBe(1);
	});

	it('are read as a first reminder, with no hours, when the title is one this app does not know', () => {
		expect(timerReminderNoticeOf(filed('Timer still on', { entity: 'Employee' }))).toEqual({
			level: 1,
			hours: null,
			timeLogId: null
		});
	});

	it('are no other kind of notification', () => {
		expect(
			timerReminderNoticeOf({ ...filed('Your timer has been running for 8 hours'), type: 'Mention' })
		).toBeNull();
		expect(timerReminderNoticeOf({ title: 'Your timer has been running for 8 hours' })).toBeNull();
	});

	describe('a tab does not repeat', () => {
		const run = { key: 'log-1', startedAt: Date.parse('2026-11-11T08:00:00Z') };
		const dueAt = run.startedAt + 8 * HOUR;
		const MINUTE = 60 * 1000;
		const level1 = 'Your timer has been running for 8 hours';
		const level2 = 'Your timer is still running after 16 hours';
		/** The platform's unread copy, filed at that moment. */
		const filedAt = (at: number, overrides: Record<string, unknown> = {}) =>
			filed(level1, { createdAt: new Date(at).toISOString(), ...overrides });
		/** The tab deciding at `serverNow`, with the person's preferences (the defaults: an email at once, push on). */
		const at = (serverNow: number, preferences: Record<string, unknown> = {}) => ({
			serverNow,
			markMarginMs: TIMER_REMINDER_MARK_MARGIN_MS,
			preferences
		});

		it('a reminder another tab or device showed, or the person read, however recently', () => {
			const read = [filedAt(dueAt + 30_000, { isRead: true })];
			expect(wasRemindedByServer(read, run, 1, at(dueAt + MINUTE))).toBe(true);
			expect(wasRemindedByServer(read, run, 1, at(dueAt + 5 * HOUR))).toBe(true);
		});

		it('an unread one that went by email at once or by push, or goes before a mark could stop it', () => {
			const copy = [filedAt(dueAt)];
			// It goes when the platform's hold is over, three minutes after it was filed
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + 5 * HOUR))).toBe(true);
			expect(
				wasRemindedByServer(
					copy,
					run,
					1,
					at(dueAt + TIMER_REMINDER_DELIVERY_GRACE_MS - TIMER_REMINDER_MARK_MARGIN_MS)
				)
			).toBe(true);
			// Pushed with the email off, emailed at once with push off
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + HOUR, { email: 'off' }))).toBe(true);
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + HOUR, { pushByType: { TimerReminder: false } }))).toBe(
				true
			);
			// A copy whose filing time is unknown is taken as gone
			expect(wasRemindedByServer([filed(level1)], run, 1, at(dueAt))).toBe(true);
		});

		it('but shows an unread one the platform still holds, filed moments ago, for the tab to mark it read', () => {
			const copy = [filedAt(dueAt + 30_000)];
			const goesAt = dueAt + 30_000 + TIMER_REMINDER_DELIVERY_GRACE_MS;
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + MINUTE))).toBe(false);
			expect(wasRemindedByServer(copy, run, 1, at(goesAt - TIMER_REMINDER_MARK_MARGIN_MS - 1))).toBe(false);
			// Too late for a mark to reach the platform before the copy goes
			expect(wasRemindedByServer(copy, run, 1, at(goesAt - TIMER_REMINDER_MARK_MARGIN_MS))).toBe(true);
		});

		it('and one that reaches the person nowhere but in the inbox: the email in the digest or off, push off', () => {
			const copy = [filedAt(dueAt)];
			const pushOff = { pushByType: { TimerReminder: false } };
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + HOUR, { ...pushOff, email: 'digest' }))).toBe(false);
			expect(
				wasRemindedByServer(
					copy,
					run,
					1,
					at(dueAt + HOUR, { ...pushOff, emailByType: { TimerReminder: 'off' } })
				)
			).toBe(false);
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + HOUR, { push: false, email: false }))).toBe(false);
		});

		it('and one the quiet hours still hold, which goes when they end', () => {
			// Filed at 17:00 UTC inside quiet hours from 16:00 to 18:00 UTC: it goes at 18:00
			const quiet = { dnd: { start: '16:00', end: '18:00', timeZone: 'UTC' } };
			const copy = [filedAt(dueAt + MINUTE)];
			const quietEnd = Date.parse('2026-11-11T18:00:00Z');
			expect(dueAt).toBe(Date.parse('2026-11-11T16:00:00Z'));
			expect(wasRemindedByServer(copy, run, 1, at(dueAt + HOUR, quiet))).toBe(false);
			expect(wasRemindedByServer(copy, run, 1, at(quietEnd + MINUTE, quiet))).toBe(true);
		});

		it('a first reminder after the second, but shows the second after the first', () => {
			expect(
				wasRemindedByServer([filedAt(dueAt + 8 * HOUR, { title: level2 })], run, 1, at(dueAt + 9 * HOUR))
			).toBe(true);
			expect(wasRemindedByServer([filedAt(dueAt)], run, 2, at(dueAt + 8 * HOUR))).toBe(false);
		});

		it("nothing for another run's reminder, another kind, or when there is none", () => {
			expect(wasRemindedByServer([filedAt(dueAt, { entityId: 'log-0' })], run, 1, at(dueAt + HOUR))).toBe(false);
			expect(wasRemindedByServer([filedAt(dueAt, { type: 'Mention' })], run, 1, at(dueAt + HOUR))).toBe(false);
			expect(wasRemindedByServer([], run, 1, at(dueAt + HOUR))).toBe(false);
		});
	});

	describe("when the platform's copy reaches the person", () => {
		const filedAt = Date.parse('2026-11-11T16:00:00Z');
		const copy = { createdAt: new Date(filedAt).toISOString() };

		it('once its hold is over, by email at once or by push; never, when it goes neither way', () => {
			expect(timerReminderGoesOutAt(copy, {})).toBe(filedAt + TIMER_REMINDER_DELIVERY_GRACE_MS);
			expect(timerReminderGoesOutAt(copy, { email: 'digest' })).toBe(filedAt + TIMER_REMINDER_DELIVERY_GRACE_MS);
			expect(timerReminderGoesOutAt(copy, { email: 'digest', push: false })).toBeNull();
			expect(
				timerReminderGoesOutAt(copy, {
					emailByType: { TimerReminder: 'off' },
					pushByType: { TimerReminder: false }
				})
			).toBeNull();
		});

		it('at the end of the quiet hours its hold ends in, across midnight too', () => {
			expect(timerReminderGoesOutAt(copy, { dnd: { start: '15:00', end: '19:30', timeZone: 'UTC' } })).toBe(
				Date.parse('2026-11-11T19:30:00Z')
			);
			expect(
				quietHoursEndAfter(Date.parse('2026-11-11T23:10:00Z'), {
					start: '22:00',
					end: '07:00',
					timeZone: 'UTC'
				})
			).toBe(Date.parse('2026-11-12T07:00:00Z'));
		});
	});

	/**
	 * The titles are a contract with Gauzy, which files them (`timerReminderNotice` in
	 * packages/core/src/lib/time-tracking/timer-reminder/timer-reminder.rules.ts) and pins the same strings in its spec
	 * "the titles Ever Teams reads back". A change there is a change here.
	 */
	describe('the titles Gauzy files', () => {
		it.each([
			['Your timer has been running for 8 hours', 1, 8],
			['Your timer has been running for 1 hour', 1, 1],
			['Your timer has been running for 1.5 hours', 1, 1.5],
			['Your timer has been running for 1.23 hours', 1, 1.23],
			['Your timer has been running for 8 hours on "Fix the login page"', 1, 8],
			['Your timer is still running after 16 hours', 2, 16],
			['Your timer is still running after 1 hour', 2, 1],
			['Your timer is still running after 2.46 hours', 2, 2.46],
			['Your timer is still running after 8 hours on "Ship it"', 2, 8]
		] as const)('"%s" is reminder %s, after %s hours', (title, level, hours) => {
			expect(timerReminderNoticeOf(filed(title))).toEqual({ level, hours, timeLogId: 'log-1' });
		});
	});

	describe("the platform's copy a tab marks read once it showed the reminder", () => {
		const copy = (title: string, overrides: Record<string, unknown> = {}) => ({
			id: 'n-1',
			...filed(title, overrides)
		});
		const level1 = 'Your timer has been running for 8 hours';
		const level2 = 'Your timer is still running after 16 hours';

		it("is the run's reminder of that level while it is unread, and none to mark once it is read", () => {
			expect(timerReminderToMarkRead([copy(level1)], 'log-1', 1)).toEqual({ id: 'n-1' });
			expect(timerReminderToMarkRead([copy(level2)], 'log-1', 2)).toEqual({ id: 'n-1' });
			expect(timerReminderToMarkRead([copy(level1, { isRead: true })], 'log-1', 1)).toBe('read');
		});

		it('is not there yet before the platform files it, nor in another level, run or kind', () => {
			expect(timerReminderToMarkRead([], 'log-1', 1)).toBeNull();
			expect(timerReminderToMarkRead([copy(level2)], 'log-1', 1)).toBeNull();
			expect(timerReminderToMarkRead([copy(level1, { entityId: 'log-0' })], 'log-1', 1)).toBeNull();
			expect(timerReminderToMarkRead([copy(level1, { type: 'Mention' })], 'log-1', 1)).toBeNull();
		});

		it('comes due at the threshold, then at twice it', () => {
			const run = { key: 'log-1', startedAt: Date.parse('2026-11-11T08:00:00Z') };
			expect(timerReminderDueAt(run, 8, 1)).toBe(run.startedAt + 8 * HOUR);
			expect(timerReminderDueAt(run, 8, 2)).toBe(run.startedAt + 16 * HOUR);
		});
	});
});
