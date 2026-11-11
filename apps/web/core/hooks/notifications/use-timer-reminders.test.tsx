/** @jest-environment jsdom */
/**
 * #5022: a timer left running is worth a reminder at the employee's threshold, then at twice it, each once per run
 * whatever the tabs, with the actions to stop the timer or open it.
 */
import { act, renderHook } from '@testing-library/react';

const mockToast = { warning: jest.fn(), dismiss: jest.fn() };
const mockPush = jest.fn();
const mockSetting = { current: { preferences: {} } as { preferences: Record<string, unknown> } | null };
const mockSettingRead = { isAvailable: true, isLoading: false, isError: false, isSavingPreferences: false };

jest.mock('sonner', () => ({
	toast: {
		warning: (...args: unknown[]) => mockToast.warning(...args),
		dismiss: (...args: unknown[]) => mockToast.dismiss(...args)
	}
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('@/core/hooks/notifications/use-notification-settings', () => ({
	useNotificationSettings: () => ({ setting: mockSetting.current, ...mockSettingRead })
}));

import {
	shownTimerReminderLevel,
	TIMER_REMINDER_CLAIM_RETRY_MS,
	TIMER_REMINDER_HIDDEN_YIELD_MS
} from '@/core/lib/notifications/timer-reminders';
import { TAB_CLAIM_PREFIX, TAB_CLAIM_TTL_MS } from '@/core/lib/realtime/tab-claim';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { timerReminderIdOf, useTimerReminders } from './use-timer-reminders';

const HOUR = 60 * 60 * 1000;
const STARTED_AT = Date.parse('2026-11-11T08:00:00Z');
const RUNNING: ITimerStatus = { running: true, lastLog: { id: 'log-1', startedAt: new Date(STARTED_AT) } as never };

/** Runs the clock forward, letting the reminders' claims (promises) settle between the timers. */
const advance = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

async function renderReminders(timerStatus: ITimerStatus | null = RUNNING, stopTimer = jest.fn()) {
	const rendered = renderHook(
		(props: { timerStatus: ITimerStatus | null }) => useTimerReminders({ ...props, stopTimer }),
		{
			initialProps: { timerStatus }
		}
	);
	await advance(0);
	return { ...rendered, stopTimer };
}

/** The reminders shown so far, by title key. */
const shownTitles = () => mockToast.warning.mock.calls.map(([title]) => String(title).split(' ')[0]);
const lastOptions = () => mockToast.warning.mock.calls.at(-1)?.[1];

describe('useTimerReminders', () => {
	let visibility: DocumentVisibilityState;

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(STARTED_AT + 7 * HOUR);
		mockToast.warning.mockReset();
		mockToast.dismiss.mockReset();
		mockPush.mockReset();
		mockSetting.current = { preferences: {} };
		mockSettingRead.isAvailable = true;
		mockSettingRead.isLoading = false;
		mockSettingRead.isError = false;
		mockSettingRead.isSavingPreferences = false;
		window.localStorage.clear();
		visibility = 'visible';
		jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
		// The browser's Web Locks, under which the tabs claim a reminder (tab-claim.ts)
		Object.defineProperty(navigator, 'locks', {
			configurable: true,
			value: { request: (_name: string, callback: () => unknown) => Promise.resolve().then(callback) }
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		Reflect.deleteProperty(navigator, 'locks');
	});

	it('reminds once at the threshold, then once at twice it, and never a third time', async () => {
		await renderReminders();
		expect(mockToast.warning).not.toHaveBeenCalled();

		await advance(HOUR);
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":8}');
		expect(lastOptions()).toMatchObject({ id: timerReminderIdOf('log-1', 1), duration: Infinity });
		// Sonner applies a dismissal a frame later: one of this id would take the new reminder away
		expect(mockToast.dismiss).not.toHaveBeenCalled();

		await advance(8 * HOUR);
		expect(shownTitles()).toEqual([
			'notifications.TIMER_REMINDER.LONG_TITLE',
			'notifications.TIMER_REMINDER.FORGOTTEN_TITLE'
		]);
		expect(mockToast.warning.mock.calls[1][0]).toContain('{"hours":16}');
		// The second reminder takes the first one's place
		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 1));

		await advance(48 * HOUR);
		expect(mockToast.warning).toHaveBeenCalledTimes(2);
	});

	it("follows the employee's threshold, and reminds of nothing when they turned it off", async () => {
		mockSetting.current = { preferences: { timerReminderHours: 4 } };
		const first = await renderReminders();
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":4}');
		first.unmount();

		mockToast.warning.mockReset();
		window.localStorage.clear();
		mockSetting.current = { preferences: { timerReminderHours: null } };
		await renderReminders();
		await advance(48 * HOUR);
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it("waits for the employee's threshold before reminding: the default could be too early", async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		mockSettingRead.isLoading = true;
		mockSetting.current = null;
		const { rerender } = await renderReminders();
		expect(mockToast.warning).not.toHaveBeenCalled();

		// They gave the timer ten hours
		mockSettingRead.isLoading = false;
		mockSetting.current = { preferences: { timerReminderHours: 10 } };
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it('reminds of nothing while their preferences cannot be read, and from their threshold once a read answers', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		mockSettingRead.isError = true;
		mockSetting.current = null;
		const { rerender } = await renderReminders();
		await advance(HOUR);
		expect(mockToast.warning).not.toHaveBeenCalled();

		// A read answers: they gave the timer ten hours, reached by now
		mockSettingRead.isError = false;
		mockSetting.current = { preferences: { timerReminderHours: 10 } };
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning).toHaveBeenCalledTimes(1);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":10}');
	});

	it('reads no threshold before the workspace is known: the default could be too early', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		mockSettingRead.isAvailable = false;
		mockSetting.current = null;
		const { rerender } = await renderReminders();
		await advance(HOUR);
		expect(mockToast.warning).not.toHaveBeenCalled();

		// The workspace is known and its read answers: their own threshold, twelve hours
		mockSettingRead.isAvailable = true;
		mockSetting.current = { preferences: { timerReminderHours: 12 } };
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it('reminds from a threshold being saved only once Gauzy took it', async () => {
		jest.setSystemTime(STARTED_AT + 3 * HOUR);
		const { rerender } = await renderReminders();

		// Two hours chosen: shown at once, while the save is still on its way
		mockSetting.current = { preferences: { timerReminderHours: 2 } };
		mockSettingRead.isSavingPreferences = true;
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning).not.toHaveBeenCalled();

		// Refused: the eight hours come back, and no reminder of the run was noted on the way
		mockSetting.current = { preferences: {} };
		mockSettingRead.isSavingPreferences = false;
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning).not.toHaveBeenCalled();
		expect(shownTimerReminderLevel('log-1')).toBe(0);

		// Saved: reminded at once, on two hours
		mockSetting.current = { preferences: { timerReminderHours: 2 } };
		rerender({ timerStatus: RUNNING });
		await advance(0);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":2}');
	});

	it('leaves a reminder called off while its claim waited to the check after it', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		visibility = 'hidden';
		const { rerender } = await renderReminders();

		// A threshold starts being saved while this hidden tab waits its turn to claim the reminder
		mockSettingRead.isSavingPreferences = true;
		rerender({ timerStatus: RUNNING });
		await advance(TIMER_REMINDER_HIDDEN_YIELD_MS);
		expect(mockToast.warning).not.toHaveBeenCalled();
		expect(shownTimerReminderLevel('log-1')).toBe(0);

		// The save is refused: the threshold stays, and the reminder is given after all
		mockSettingRead.isSavingPreferences = false;
		rerender({ timerStatus: RUNNING });
		await advance(TIMER_REMINDER_HIDDEN_YIELD_MS);
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
	});

	it('keeps the threshold an earlier read answered when a later read fails', async () => {
		mockSettingRead.isError = true;
		mockSetting.current = { preferences: { timerReminderHours: 4 } };
		await renderReminders();

		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":4}');
	});

	it('shows a reminder once per run, whatever the tabs and reloads', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		await renderReminders();
		// Another tab, or the page reloaded: the same run was already reminded of
		await renderReminders();
		expect(mockToast.warning).toHaveBeenCalledTimes(1);

		// Long after the tabs' claim of it expired, too
		await advance(HOUR);
		await renderReminders();
		expect(mockToast.warning).toHaveBeenCalledTimes(1);
	});

	it('asks again while another tab holds the claim without having given the reminder', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		// Another tab took the claim of the first reminder, and has given nothing yet
		const claim = `${TAB_CLAIM_PREFIX}timer-reminder-log-1-1`;
		window.localStorage.setItem(claim, `other-tab|${Date.now() + TAB_CLAIM_TTL_MS}`);
		await renderReminders();
		expect(mockToast.warning).not.toHaveBeenCalled();

		// That tab was called off and gave the claim back: this one gives the reminder when it asks again
		window.localStorage.removeItem(claim);
		await advance(TIMER_REMINDER_CLAIM_RETRY_MS);
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
	});

	it('shows it once when two tabs reach the threshold together', async () => {
		await renderReminders();
		await renderReminders();

		// Both tabs check at the same moment, before either has noted the reminder as shown
		act(() => jest.advanceTimersByTime(HOUR));
		await advance(0);

		expect(mockToast.warning).toHaveBeenCalledTimes(1);
	});

	it('opened long after the start, shows only the latest reminder due', async () => {
		jest.setSystemTime(STARTED_AT + 20 * HOUR);
		await renderReminders();
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.FORGOTTEN_TITLE']);
	});

	it('stops the timer, or opens it, from the reminder', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { stopTimer, rerender } = await renderReminders();
		const { action, cancel } = lastOptions();

		action.onClick();
		expect(stopTimer).toHaveBeenCalledTimes(1);
		cancel.onClick();
		expect(mockPush).toHaveBeenCalledWith('/');

		// Stopped meanwhile, here or on another device: the button stops nothing
		rerender({ timerStatus: { running: false } });
		action.onClick();
		expect(stopTimer).toHaveBeenCalledTimes(1);
	});

	it('keeps the reminder while the status is read again (none, as on a team change)', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { rerender } = await renderReminders();
		mockToast.dismiss.mockReset();

		rerender({ timerStatus: null });
		rerender({ timerStatus: RUNNING });
		await advance(0);

		expect(mockToast.dismiss).not.toHaveBeenCalled();
		expect(mockToast.warning).toHaveBeenCalledTimes(1);
	});

	it('takes the reminders of a run away once its timer stops', async () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { rerender } = await renderReminders();
		mockToast.dismiss.mockReset();

		rerender({ timerStatus: { running: false } });

		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 1));
		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 2));
	});

	describe('as a system notification', () => {
		const notifications: Array<{ title: string; options: NotificationOptions; close: jest.Mock }> = [];
		let refusesNotifications = false;
		class FakeNotification {
			static permission: NotificationPermission = 'granted';
			onclick: (() => void) | null = null;
			close = jest.fn();
			constructor(title: string, options: NotificationOptions) {
				// Chrome on Android builds them only through a service worker
				if (refusesNotifications) {
					throw new TypeError('Illegal constructor');
				}
				notifications.push({ title, options, close: this.close });
			}
		}

		beforeEach(() => {
			notifications.length = 0;
			refusesNotifications = false;
			visibility = 'hidden';
			FakeNotification.permission = 'granted';
			Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
			jest.setSystemTime(Date.parse('2026-11-11T17:00:00Z'));
		});

		/** A tab out of sight lets the tab in sight claim a reminder first. */
		const renderHidden = async (timerStatus: ITimerStatus = RUNNING) => {
			const rendered = await renderReminders(timerStatus);
			await advance(TIMER_REMINDER_HIDDEN_YIELD_MS);
			return rendered;
		};

		it('also shows one when the tab is out of sight and the browser allows it, tagged per reminder', async () => {
			await renderHidden();
			expect(notifications).toHaveLength(1);
			expect(notifications[0].options.tag).toBe(timerReminderIdOf('log-1', 1));
		});

		it('shows none in a visible tab, without permission, with push off, or in the quiet hours', async () => {
			visibility = 'visible';
			await renderHidden();
			window.localStorage.clear();

			visibility = 'hidden';
			FakeNotification.permission = 'default';
			await renderHidden();
			window.localStorage.clear();

			FakeNotification.permission = 'granted';
			mockSetting.current = { preferences: { push: false } };
			await renderHidden();
			window.localStorage.clear();

			// 17:00 UTC is inside a 16:00-18:00 window
			mockSetting.current = { preferences: { dnd: { start: '16:00', end: '18:00', timeZone: 'UTC' } } };
			await renderHidden();

			expect(notifications).toHaveLength(0);
			expect(mockToast.warning).toHaveBeenCalledTimes(4);
		});

		it('closes the first when the second takes its place, and the second when the timer stops', async () => {
			const { rerender } = await renderHidden();
			const [first] = notifications;

			await advance(8 * HOUR + TIMER_REMINDER_HIDDEN_YIELD_MS);
			expect(notifications).toHaveLength(2);
			expect(first.close).toHaveBeenCalled();
			const [, second] = notifications;
			expect(second.options.tag).toBe(timerReminderIdOf('log-1', 2));
			expect(second.close).not.toHaveBeenCalled();

			rerender({ timerStatus: { running: false } });
			expect(second.close).toHaveBeenCalled();
		});

		it('keeps reminding in the page where the browser refuses to build one', async () => {
			refusesNotifications = true;
			await renderHidden();
			expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);

			await advance(8 * HOUR + TIMER_REMINDER_HIDDEN_YIELD_MS);
			expect(shownTitles()).toEqual([
				'notifications.TIMER_REMINDER.LONG_TITLE',
				'notifications.TIMER_REMINDER.FORGOTTEN_TITLE'
			]);
			expect(notifications).toHaveLength(0);
		});
	});
});
