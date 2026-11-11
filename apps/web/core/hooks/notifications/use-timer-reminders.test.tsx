/** @jest-environment jsdom */
/**
 * #5022: a timer left running is worth a reminder at the employee's threshold, then at twice it, each once per run
 * whatever the tabs, with the actions to stop the timer or open it.
 */
import { act, renderHook } from '@testing-library/react';

const mockToast = { warning: jest.fn(), dismiss: jest.fn() };
const mockPush = jest.fn();
const mockSetting = { current: { preferences: {} } as { preferences: Record<string, unknown> } | null };

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
const mockSettingLoading = { current: false };
jest.mock('@/core/hooks/notifications/use-notification-settings', () => ({
	useNotificationSettings: () => ({ setting: mockSetting.current, isLoading: mockSettingLoading.current })
}));

import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { timerReminderIdOf, useTimerReminders } from './use-timer-reminders';

const HOUR = 60 * 60 * 1000;
const STARTED_AT = Date.parse('2026-11-11T08:00:00Z');
const RUNNING: ITimerStatus = { running: true, lastLog: { id: 'log-1', startedAt: new Date(STARTED_AT) } as never };

function renderReminders(timerStatus: ITimerStatus | null = RUNNING, stopTimer = jest.fn()) {
	const rendered = renderHook(
		(props: { timerStatus: ITimerStatus | null }) => useTimerReminders({ ...props, stopTimer }),
		{
			initialProps: { timerStatus }
		}
	);
	return { ...rendered, stopTimer };
}

/** The reminders shown so far, by title key. */
const shownTitles = () => mockToast.warning.mock.calls.map(([title]) => String(title).split(' ')[0]);
const lastOptions = () => mockToast.warning.mock.calls.at(-1)?.[1];

describe('useTimerReminders', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(STARTED_AT + 7 * HOUR);
		mockToast.warning.mockReset();
		mockToast.dismiss.mockReset();
		mockPush.mockReset();
		mockSetting.current = { preferences: {} };
		mockSettingLoading.current = false;
		window.localStorage.clear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('reminds once at the threshold, then once at twice it, and never a third time', () => {
		renderReminders();
		expect(mockToast.warning).not.toHaveBeenCalled();

		act(() => jest.advanceTimersByTime(HOUR));
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":8}');
		expect(lastOptions()).toMatchObject({ id: timerReminderIdOf('log-1', 1), duration: Infinity });
		// Sonner applies a dismissal a frame later: one of this id would take the new reminder away
		expect(mockToast.dismiss).not.toHaveBeenCalled();

		act(() => jest.advanceTimersByTime(8 * HOUR));
		expect(shownTitles()).toEqual([
			'notifications.TIMER_REMINDER.LONG_TITLE',
			'notifications.TIMER_REMINDER.FORGOTTEN_TITLE'
		]);
		expect(mockToast.warning.mock.calls[1][0]).toContain('{"hours":16}');
		// The second reminder takes the first one's place
		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 1));

		act(() => jest.advanceTimersByTime(48 * HOUR));
		expect(mockToast.warning).toHaveBeenCalledTimes(2);
	});

	it("follows the employee's threshold, and reminds of nothing when they turned it off", () => {
		mockSetting.current = { preferences: { timerReminderHours: 4 } };
		const first = renderReminders();
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.LONG_TITLE']);
		expect(mockToast.warning.mock.calls[0][0]).toContain('{"hours":4}');
		first.unmount();

		mockToast.warning.mockReset();
		window.localStorage.clear();
		mockSetting.current = { preferences: { timerReminderHours: null } };
		renderReminders();
		act(() => jest.advanceTimersByTime(48 * HOUR));
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it("waits for the employee's threshold before reminding: the default could be too early", () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		mockSettingLoading.current = true;
		mockSetting.current = null;
		const { rerender } = renderReminders();
		expect(mockToast.warning).not.toHaveBeenCalled();

		// They gave the timer ten hours
		mockSettingLoading.current = false;
		mockSetting.current = { preferences: { timerReminderHours: 10 } };
		rerender({ timerStatus: RUNNING });
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it('shows a reminder once per run, whatever the tabs and reloads', () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		renderReminders();
		// Another tab, or the page reloaded: the same run was already reminded of
		renderReminders();
		expect(mockToast.warning).toHaveBeenCalledTimes(1);
	});

	it('opened long after the start, shows only the latest reminder due', () => {
		jest.setSystemTime(STARTED_AT + 20 * HOUR);
		renderReminders();
		expect(shownTitles()).toEqual(['notifications.TIMER_REMINDER.FORGOTTEN_TITLE']);
	});

	it('stops the timer, or opens it, from the reminder', () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { stopTimer, rerender } = renderReminders();
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

	it('keeps the reminder while the status is read again (none, as on a team change)', () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { rerender } = renderReminders();
		mockToast.dismiss.mockReset();

		rerender({ timerStatus: null });
		rerender({ timerStatus: RUNNING });

		expect(mockToast.dismiss).not.toHaveBeenCalled();
		expect(mockToast.warning).toHaveBeenCalledTimes(1);
	});

	it('takes the reminders of a run away once its timer stops', () => {
		jest.setSystemTime(STARTED_AT + 9 * HOUR);
		const { rerender } = renderReminders();
		mockToast.dismiss.mockReset();

		rerender({ timerStatus: { running: false } });

		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 1));
		expect(mockToast.dismiss).toHaveBeenCalledWith(timerReminderIdOf('log-1', 2));
	});

	describe('as a system notification', () => {
		const notifications: Array<{ title: string; options: NotificationOptions }> = [];
		class FakeNotification {
			static permission: NotificationPermission = 'granted';
			onclick: (() => void) | null = null;
			constructor(title: string, options: NotificationOptions) {
				notifications.push({ title, options });
			}
			close() {}
		}
		let visibility: DocumentVisibilityState = 'hidden';

		beforeEach(() => {
			notifications.length = 0;
			visibility = 'hidden';
			FakeNotification.permission = 'granted';
			Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
			jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
			jest.setSystemTime(Date.parse('2026-11-11T17:00:00Z'));
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('also shows one when the tab is out of sight and the browser allows it, tagged per reminder', () => {
			renderReminders();
			expect(notifications).toHaveLength(1);
			expect(notifications[0].options.tag).toBe(timerReminderIdOf('log-1', 1));
		});

		it('shows none in a visible tab, without permission, with push off, or in the quiet hours', () => {
			visibility = 'visible';
			renderReminders();
			window.localStorage.clear();

			visibility = 'hidden';
			FakeNotification.permission = 'default';
			renderReminders();
			window.localStorage.clear();

			FakeNotification.permission = 'granted';
			mockSetting.current = { preferences: { push: false } };
			renderReminders();
			window.localStorage.clear();

			// 17:00 UTC is inside a 16:00-18:00 window
			mockSetting.current = { preferences: { dnd: { start: '16:00', end: '18:00', timeZone: 'UTC' } } };
			renderReminders();

			expect(notifications).toHaveLength(0);
			expect(mockToast.warning).toHaveBeenCalledTimes(4);
		});
	});
});
