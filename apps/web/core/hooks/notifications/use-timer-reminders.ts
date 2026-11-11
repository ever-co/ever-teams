'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useNotificationSettings } from '@/core/hooks/notifications/use-notification-settings';
import { quietHoursOf } from '@/core/lib/notifications/notification-preferences';
import {
	claimTimerReminder,
	isWithinQuietHours,
	nextTimerReminderAt,
	shownTimerReminderLevel,
	TIMER_REMINDER_CLAIM_RETRY_MS,
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

/** The system notification of a reminder, or none: some browsers (Chrome on Android) refuse to build one in a page. */
function systemNotificationOf(title: string, body: string, tag: string): Notification | null {
	try {
		return new Notification(title, { body, tag });
	} catch {
		return null;
	}
}

interface UseTimerRemindersInput {
	timerStatus: ITimerStatus | null | undefined;
	stopTimer: () => unknown;
}

/**
 * Reminds the employee of a timer left running (#5022): once it has run for their threshold, then at twice it, each
 * reminder once per run whatever the tabs and reloads (the tab in sight shows it), with the actions to stop the timer
 * or open it. A tab out of sight shows it as a system notification too, where the browser allows them, push is on and
 * it is not the quiet hours. Nothing is reminded of until the employee's preferences have been read. Mounted once for
 * the app, by its timer's owner (TimerReminders).
 */
export function useTimerReminders({ timerStatus, stopTimer }: UseTimerRemindersInput) {
	const t = useTranslations();
	const router = useRouter();
	const {
		setting,
		isAvailable: isSettingAvailable,
		isLoading: isSettingLoading,
		isError: isSettingError,
		isSavingPreferences
	} = useNotificationSettings();
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
	// The system notifications this tab raised, by reminder: withdrawn with their run, or by the next reminder
	const systemNotifications = useRef(new Map<string, Notification>());

	// Until the employee's threshold is read, the default could remind of a timer they gave more time: nothing is read
	// before the workspace is known, and a read that failed says nothing of it either, unless an earlier one answered
	// with their row (an answer without a saved row is a read: the default applies). A threshold being saved is shown
	// before Gauzy took it, and a refusal puts the former one back: it is used once the save is over.
	const isThresholdKnown =
		isSettingAvailable && !isSettingLoading && !isSavingPreferences && (!isSettingError || setting !== null);

	useEffect(() => {
		if (!isThresholdKnown || !runKey || startedAt === undefined || hours === null) {
			return;
		}
		let timeout: ReturnType<typeof setTimeout> | undefined;
		let isCancelled = false;

		const closeSystemNotification = (id: string) => {
			systemNotifications.current.get(id)?.close();
			systemNotifications.current.delete(id);
		};

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
			const id = timerReminderIdOf(runKey, level);

			// The second reminder takes the first one's place. Never before the first: sonner applies a dismissal a frame
			// later, so it would take away the reminder created with that id meanwhile.
			if (level === 2) {
				toast.dismiss(timerReminderIdOf(runKey, 1));
				closeSystemNotification(timerReminderIdOf(runKey, 1));
			}
			toast.warning(title, {
				id,
				description,
				duration: Infinity,
				action: { label: translate('notifications.TIMER_REMINDER.STOP'), onClick: stop },
				cancel: { label: translate('notifications.TIMER_REMINDER.OPEN'), onClick: open },
				// Two actions beside the text would squeeze it: they go on a row of their own, under it
				classNames: { toast: 'flex-wrap', content: 'basis-[calc(100%-3rem)]', cancelButton: 'ml-auto' }
			});
			if (showsSystemNotification(latest.current.preferences)) {
				// Tagged per reminder: the system shows one whatever the tabs that raise it
				const notification = systemNotificationOf(title, description, id);
				if (notification) {
					systemNotifications.current.set(id, notification);
					notification.onclick = () => {
						window.focus();
						open();
						closeSystemNotification(id);
					};
				}
			}
		};

		const check = async () => {
			const level = timerReminderLevelAt(Date.now() - startedAt, hours);
			const shownInTab = shownHere.current.get(runKey) ?? 0;
			if (level > shownInTab) {
				// One tab of the browser claims the reminder, the one in sight first; the others note it once it was given
				const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
				const isClaimed = await claimTimerReminder(
					runKey,
					level as TimerReminderLevel,
					isVisible,
					() => isCancelled
				);
				if (isCancelled) {
					return;
				}
				if (isClaimed) {
					shownHere.current.set(runKey, level);
					show(level as TimerReminderLevel);
				} else if (shownTimerReminderLevel(runKey) >= level) {
					shownHere.current.set(runKey, level);
				} else {
					// Another tab holds the claim and has given nothing yet: it may still give the reminder, or be called
					// off and give the claim back. Asked again shortly, until a tab gives it or that claim expires.
					timeout = setTimeout(() => void check(), TIMER_REMINDER_CLAIM_RETRY_MS);
					return;
				}
			}
			const shown = Math.max(level, shownTimerReminderLevel(runKey), shownHere.current.get(runKey) ?? 0);
			const next = nextTimerReminderAt({ key: runKey, startedAt }, hours, shown);
			if (next !== null) {
				timeout = setTimeout(() => void check(), Math.min(Math.max(next - Date.now(), 0), MAX_TIMEOUT_MS));
			}
		};
		void check();

		return () => {
			isCancelled = true;
			clearTimeout(timeout);
		};
	}, [isThresholdKnown, latest, runKey, startedAt, hours]);

	// A run that ended (the timer stopped, or another run started) takes its reminders away, the system notifications
	// too. A status being read again (none, as on a team change) says nothing of the run: its reminders stay.
	const isStatusKnown = timerStatus != null;
	const previousRunKey = useRef(runKey);
	useEffect(() => {
		if (!isStatusKnown) {
			return;
		}
		const previous = previousRunKey.current;
		previousRunKey.current = runKey;
		if (previous && previous !== runKey) {
			for (const level of [1, 2] as const) {
				const id = timerReminderIdOf(previous, level);
				toast.dismiss(id);
				systemNotifications.current.get(id)?.close();
				systemNotifications.current.delete(id);
			}
		}
	}, [isStatusKnown, runKey]);
}
