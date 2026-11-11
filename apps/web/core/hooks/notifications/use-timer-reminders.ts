'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useNotificationSettings } from '@/core/hooks/notifications/use-notification-settings';
import { quietHoursOf } from '@/core/lib/notifications/notification-preferences';
import {
	isWithinQuietHours,
	nextTimerReminderAt,
	recordTimerReminder,
	shownTimerReminderLevel,
	timerReminderHoursOf,
	timerReminderLevelAt,
	timerRunOf,
	type TimerReminderLevel
} from '@/core/lib/notifications/timer-reminders';
import type { INotificationPreferences } from '@/core/types/interfaces/common/employee-notification';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** The longest delay a timeout keeps (about 24.8 days): a reminder due later is checked again then. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/** The page the timer is on. */
const TIMER_PATH = '/';

/** The toast (and system notification) of one reminder of one run. */
export const timerReminderIdOf = (runKey: string, level: TimerReminderLevel) => `timer-reminder-${runKey}-${level}`;

/** A system notification as well: the tab is out of sight, the browser allows it, push is on, not the quiet hours. */
function showsSystemNotification(preferences: INotificationPreferences | null | undefined): boolean {
	if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
		return false;
	}
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
		return false;
	}
	if (preferences?.push === false) {
		return false;
	}
	return !isWithinQuietHours(new Date(), quietHoursOf(preferences));
}

interface UseTimerRemindersInput {
	timerStatus: ITimerStatus | null | undefined;
	stopTimer: () => unknown;
}

/**
 * Reminds the employee of a timer left running (#5022): once it has run for their threshold, then at twice it, each
 * reminder once per run whatever the tabs and reloads, with the actions to stop the timer or open it. A tab out of
 * sight shows it as a system notification too, where the browser allows them, push is on and it is not the quiet
 * hours. Mounted once, beside the header's timer.
 */
export function useTimerReminders({ timerStatus, stopTimer }: UseTimerRemindersInput) {
	const t = useTranslations();
	const router = useRouter();
	const { setting, isLoading: isSettingLoading } = useNotificationSettings();
	const preferences = setting?.preferences;
	const hours = timerReminderHoursOf(preferences);
	const run = timerRunOf(timerStatus);
	const runKey = run?.key;
	const startedAt = run?.startedAt;
	const isRunning = Boolean(timerStatus?.running);

	// Read when a reminder fires or is acted on, not when it was scheduled
	const latest = useSyncRef({ preferences, stopTimer, isRunning, t, router });
	// The reminders shown in this tab, for a browser that keeps no storage
	const shownHere = useRef(new Map<string, number>());

	useEffect(() => {
		// Before the employee's threshold is known, the default would remind of a timer they gave more time
		if (isSettingLoading || !runKey || startedAt === undefined || hours === null) {
			return;
		}
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const show = (level: TimerReminderLevel) => {
			const { t: translate } = latest.current;
			const title = translate(
				level === 1
					? 'notifications.TIMER_REMINDER.LONG_TITLE'
					: 'notifications.TIMER_REMINDER.FORGOTTEN_TITLE',
				{ hours: level === 1 ? hours : hours * 2 }
			);
			const description = translate(
				level === 1
					? 'notifications.TIMER_REMINDER.LONG_DESCRIPTION'
					: 'notifications.TIMER_REMINDER.FORGOTTEN_DESCRIPTION'
			);
			const stop = () => {
				// Stopped meanwhile, here or on another device: nothing to stop
				if (latest.current.isRunning) {
					void Promise.resolve(latest.current.stopTimer()).catch(() => undefined);
				}
			};
			const open = () => latest.current.router.push(TIMER_PATH);

			// The second reminder takes the first one's place
			toast.dismiss(timerReminderIdOf(runKey, 1));
			toast.warning(title, {
				id: timerReminderIdOf(runKey, level),
				description,
				duration: Infinity,
				action: { label: translate('notifications.TIMER_REMINDER.STOP'), onClick: stop },
				cancel: { label: translate('notifications.TIMER_REMINDER.OPEN'), onClick: open }
			});
			if (showsSystemNotification(latest.current.preferences)) {
				// Tagged per reminder: the system shows one whatever the tabs that raise it
				const notification = new Notification(title, {
					body: description,
					tag: timerReminderIdOf(runKey, level)
				});
				notification.onclick = () => {
					window.focus();
					open();
					notification.close();
				};
			}
		};

		const check = () => {
			const shown = Math.max(shownTimerReminderLevel(runKey), shownHere.current.get(runKey) ?? 0);
			const level = timerReminderLevelAt(Date.now() - startedAt, hours);
			if (level > shown) {
				recordTimerReminder(runKey, level as TimerReminderLevel);
				shownHere.current.set(runKey, level);
				show(level as TimerReminderLevel);
			}
			const next = nextTimerReminderAt({ key: runKey, startedAt }, hours, Math.max(level, shown));
			if (next !== null) {
				timeout = setTimeout(check, Math.min(Math.max(next - Date.now(), 0), MAX_TIMEOUT_MS));
			}
		};
		check();

		return () => clearTimeout(timeout);
	}, [isSettingLoading, latest, runKey, startedAt, hours]);

	// A run that ended (the timer stopped, or another run started) takes its reminders away
	const previousRunKey = useRef(runKey);
	useEffect(() => {
		const previous = previousRunKey.current;
		previousRunKey.current = runKey;
		if (previous && previous !== runKey) {
			toast.dismiss(timerReminderIdOf(previous, 1));
			toast.dismiss(timerReminderIdOf(previous, 2));
		}
	}, [runKey]);
}
