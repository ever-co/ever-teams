'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useNotificationScope } from '@/core/hooks/notifications/use-notification-scope';
import { useNotificationSettings } from '@/core/hooks/notifications/use-notification-settings';
import { pushOnFor, quietHoursOf } from '@/core/lib/notifications/notification-preferences';
import {
	claimTimerReminder,
	givenTimerReminderLevel,
	isWithinQuietHours,
	nextTimerReminderAt,
	recordTimerReminder,
	shownTimerReminderLevel,
	TIMER_REMINDER_CLAIM_RETRY_MS,
	TIMER_REMINDER_MARK_MARGIN_MS,
	TIMER_REMINDER_MARK_MARGIN_UNSYNCED_MS,
	TIMER_REMINDER_MARK_READ_RETRY_MS,
	TIMER_REMINDER_MARK_READ_WINDOW_MS,
	timerReminderHoursOf,
	timerReminderLevelAt,
	timerReminderShownAt,
	timerReminderToMarkRead,
	timerRunOf,
	wasRemindedByServer,
	type TimerReminderLevel
} from '@/core/lib/notifications/timer-reminders';
import { serverClockOffset } from '@/core/lib/utils/team-members.utils';
import { queryKeys } from '@/core/query/keys';
import { employeeNotificationService, type INotificationInboxScope } from '@/core/services/client/api/notifications';
import { timerReminderTargetState } from '@/core/stores/timer/timer-reminder';
import {
	EEmployeeNotificationType,
	type IEmployeeNotification,
	type INotificationPreferences
} from '@/core/types/interfaces/common/employee-notification';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** The longest delay a timeout keeps (about 24.8 days): a reminder due later is checked again then. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/** The page the timer is on. */
const TIMER_PATH = '/';

/** The toast (and system notification) of one reminder of one run. */
export const timerReminderIdOf = (runKey: string, level: TimerReminderLevel) => `timer-reminder-${runKey}-${level}`;

/**
 * A system notification as well: the tab is out of sight, the browser allows it, push is on for the timer reminders
 * (their own switch, else the one of every kind), not the quiet hours.
 */
function showsSystemNotification(preferences: INotificationPreferences | null | undefined): boolean {
	if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
		return false;
	}
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
		return false;
	}
	if (!pushOnFor(preferences, EEmployeeNotificationType.TimerReminder)) {
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
 *
 * The platform reminds of the same run on its own, in the inbox and by email or push, for when no tab is open. It
 * files every reminder unread and holds its email and push a few minutes; a tab that put the reminder in front of the
 * person (a toast in sight, or a system notification) marks the platform's copy read meanwhile, so that they do not go
 * (`markPlatformCopyRead`), whatever app runs the timer. A toast in a tab out of sight, with no system notification,
 * leaves the copy to go. A tab does not repeat a reminder the person already got from the platform
 * (`wasRemindedByServer`), when the tab opens or wakes up after it came due. While the timer runs, the run and the
 * owner's stop are published for the inbox's "Stop timer" (`timerReminderTargetState`).
 */
export function useTimerReminders({ timerStatus, stopTimer }: UseTimerRemindersInput) {
	const t = useTranslations();
	const router = useRouter();
	const scope = useNotificationScope();
	const setReminderTarget = useSetAtom(timerReminderTargetState);
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
	const latest = useSyncRef({ preferences, stopTimer, isRunning, runKey, t, router, scope });
	// The reminders shown in this tab, for a browser that keeps no storage
	const shownHere = useRef(new Map<string, number>());
	// The system notifications this tab raised, by reminder: withdrawn with their run, or by the next reminder
	const systemNotifications = useRef(new Map<string, Notification>());
	// The platform's copies of the reminders this tab showed, being marked read, by run and level. They outlive the run
	// (a timer stopped from its reminder is not to be emailed about either), and end with the tab.
	const markingRead = useRef(new Map<string, () => void>());
	// The reminders this tab gave in a toast while out of sight, with no system notification, by toast: the person sees
	// such a toast once they bring the tab into sight, and its copy is marked read then
	const givenOutOfSight = useRef(new Map<string, { runKey: string; level: TimerReminderLevel }>());
	const queryClient = useQueryClient();

	/** The bell, its count and the inbox show the copy read at once, with a live connection or without one. */
	const refreshNotificationLists = useCallback(
		(notificationScope: INotificationInboxScope | null) => {
			if (notificationScope) {
				const { tenantId, organizationId, receiverEmployeeId } = notificationScope;
				void queryClient.invalidateQueries({
					queryKey: queryKeys.notifications.inbox(tenantId, organizationId, receiverEmployeeId)
				});
				void queryClient.invalidateQueries({
					queryKey: queryKeys.notifications.unreadCount(tenantId, organizationId, receiverEmployeeId)
				});
			}
			void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all });
		},
		[queryClient]
	);

	useEffect(() => {
		const marking = markingRead.current;
		return () => {
			for (const stop of [...marking.values()]) {
				stop();
			}
		};
	}, []);

	/**
	 * Marks the platform's copy of a reminder this tab showed read, so that its email and push do not follow: the
	 * platform holds them a few minutes for it (TIMER_REMINDER_DELIVERY_GRACE_MS) and files the copy at its next sweep,
	 * so the copy is asked for again until it is there, for a while (TIMER_REMINDER_MARK_READ_WINDOW_MS). Nothing is
	 * marked when the platform has none (an older Gauzy, or its reminders off), nor twice.
	 *
	 * @param known The run's reminders the platform answered just before the reminder was shown, when it did.
	 */
	const markPlatformCopyRead = useCallback(
		(runKey: string, level: TimerReminderLevel, known: readonly IEmployeeNotification[] | null) => {
			const marking = markingRead.current;
			const key = `${runKey}:${level}`;
			if (marking.has(key)) {
				return;
			}
			const until = Date.now() + TIMER_REMINDER_MARK_READ_WINDOW_MS;
			let timeout: ReturnType<typeof setTimeout> | undefined;
			let isStopped = false;
			const stop = () => {
				isStopped = true;
				clearTimeout(timeout);
				marking.delete(key);
			};
			marking.set(key, stop);

			const attempt = async (reminders: readonly IEmployeeNotification[] | null) => {
				try {
					const notificationScope = latest.current.scope;
					const copies =
						reminders ??
						(notificationScope
							? await employeeNotificationService.getTimerReminders(notificationScope, runKey)
							: null);
					if (isStopped) {
						return;
					}
					const copy = copies ? timerReminderToMarkRead(copies, runKey, level) : null;
					if (copy === 'read') {
						stop();
						return;
					}
					if (copy) {
						await employeeNotificationService.update(copy.id, {
							isRead: true,
							readAt: new Date().toISOString()
						});
						stop();
						refreshNotificationLists(latest.current.scope);
						return;
					}
				} catch {
					// Asked again shortly, until the window closes
				}
				if (isStopped) {
					return;
				}
				if (Date.now() >= until) {
					stop();
					return;
				}
				timeout = setTimeout(() => void attempt(null), TIMER_REMINDER_MARK_READ_RETRY_MS);
			};
			void attempt(known);
		},
		[latest, refreshNotificationLists]
	);

	// A toast given out of sight is out of date once a later reminder of its run was given in this browser (another tab
	// showed it, or the platform sent it): taken away with its system notification, never shown nor marked read
	const dropOutdatedHeldReminders = useCallback(() => {
		for (const [id, { runKey, level }] of [...givenOutOfSight.current]) {
			if (givenTimerReminderLevel(runKey) > level) {
				givenOutOfSight.current.delete(id);
				toast.dismiss(id);
				systemNotifications.current.get(id)?.close();
				systemNotifications.current.delete(id);
			}
		}
	}, []);

	// A toast given out of sight waits in its tab: once the person brings the tab into sight they see it, and its copy on
	// the platform is marked read, so that the email or push held for it does not follow
	useEffect(() => {
		const outOfSight = givenOutOfSight.current;
		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible') {
				return;
			}
			dropOutdatedHeldReminders();
			for (const [id, { runKey, level }] of [...outOfSight]) {
				outOfSight.delete(id);
				recordTimerReminder(runKey, level, { shown: true });
				markPlatformCopyRead(runKey, level, null);
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	}, [dropOutdatedHeldReminders, markPlatformCopyRead]);

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

		// Shows the reminder: true when the person could see it (the tab in sight, or a system notification)
		const show = (level: TimerReminderLevel): boolean => {
			const { t: translate } = latest.current;
			const isInSight = typeof document !== 'undefined' && document.visibilityState === 'visible';
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
				givenOutOfSight.current.delete(timerReminderIdOf(runKey, 1));
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
					return true;
				}
			}
			return isInSight;
		};

		// The platform's reminders of the run, asked once per reminder: null when it cannot say (no workspace scope yet,
		// or a read that failed), when the reminder is shown, as before the platform reminded too
		const platformReminders = new Map<TimerReminderLevel, Promise<IEmployeeNotification[] | null>>();
		const remindersOfRun = (level: TimerReminderLevel) => {
			const asked =
				platformReminders.get(level) ??
				(async () => {
					const notificationScope = latest.current.scope;
					if (!notificationScope) {
						return null;
					}
					try {
						return await employeeNotificationService.getTimerReminders(notificationScope, runKey);
					} catch {
						return null;
					}
				})();
			platformReminders.set(level, asked);
			return asked;
		};

		const check = async () => {
			const level = timerReminderLevelAt(Date.now() - startedAt, hours);
			const shownInTab = shownHere.current.get(runKey) ?? 0;
			if (level > shownInTab) {
				// A reminder the person already got from the platform (by email or push, or in another tab or device) is
				// noted as shown, not repeated. Not asked for one this browser gave already (a reload, another tab).
				const isGivenHere = givenTimerReminderLevel(runKey) >= level;
				const reminders = isGivenHere ? null : await remindersOfRun(level as TimerReminderLevel);
				if (isCancelled) {
					return;
				}
				// On the platform's clock, which the platform's copy is stamped with, where the app has read it
				const clockOffset = serverClockOffset();
				const isRemindedElsewhere =
					reminders !== null &&
					wasRemindedByServer(reminders, { key: runKey, startedAt }, level as TimerReminderLevel, {
						serverNow: Date.now() + (clockOffset ?? 0),
						markMarginMs:
							clockOffset === null
								? TIMER_REMINDER_MARK_MARGIN_UNSYNCED_MS
								: TIMER_REMINDER_MARK_MARGIN_MS,
						preferences: latest.current.preferences
					});
				if (isRemindedElsewhere) {
					recordTimerReminder(runKey, level as TimerReminderLevel);
					shownHere.current.set(runKey, level);
				} else {
					// One tab of the browser claims the reminder, the one in sight first; the others note it once it was
					// given
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
						// Only a reminder the person could see stops the platform's copy: a toast in a tab out of sight,
						// with no system notification, leaves it to go by email or push, unless the tab comes into sight
						// before it goes
						if (show(level as TimerReminderLevel)) {
							recordTimerReminder(runKey, level as TimerReminderLevel, { shown: true });
							markPlatformCopyRead(runKey, level as TimerReminderLevel, reminders);
						} else {
							givenOutOfSight.current.set(timerReminderIdOf(runKey, level as TimerReminderLevel), {
								runKey,
								level: level as TimerReminderLevel
							});
						}
					} else if (givenTimerReminderLevel(runKey) >= level) {
						shownHere.current.set(runKey, level);
						// The tab that showed it may close or reload before it marks the copy: every other tab of this
						// browser takes the mark over, for a reminder this browser showed the person only, never one it
						// left to the platform
						// Within the mark's window from when the reminder was shown, which may be long after it came due
						// (a threshold lowered while the timer ran)
						const shownAt = timerReminderShownAt(runKey);
						const wasShownHere = shownTimerReminderLevel(runKey) >= level && shownAt !== null;
						if (wasShownHere && Date.now() - shownAt < TIMER_REMINDER_MARK_READ_WINDOW_MS) {
							markPlatformCopyRead(runKey, level as TimerReminderLevel, null);
						}
					} else {
						// Another tab holds the claim and has given nothing yet: it may still give the reminder, or be
						// called off and give the claim back. Asked again shortly, until a tab gives it or that claim expires.
						// The platform may file and send its copy meanwhile: it is asked afresh then.
						platformReminders.delete(level as TimerReminderLevel);
						timeout = setTimeout(() => void check(), TIMER_REMINDER_CLAIM_RETRY_MS);
						return;
					}
				}
			}
			// A toast this tab holds out of sight may be out of date: a later reminder of the run was given elsewhere
			dropOutdatedHeldReminders();
			const shown = Math.max(level, givenTimerReminderLevel(runKey), shownHere.current.get(runKey) ?? 0);
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
	}, [isThresholdKnown, latest, markPlatformCopyRead, dropOutdatedHeldReminders, runKey, startedAt, hours]);

	// The running run and the owner's stop, for the "Stop timer" of its reminders in the inbox
	useEffect(() => {
		if (!runKey || !isRunning) {
			setReminderTarget(null);
			return;
		}
		setReminderTarget({
			runKey,
			stop: () => {
				// Stopped meanwhile, here or on another device, or another run started since: nothing of this run to stop
				if (latest.current.isRunning && latest.current.runKey === runKey) {
					return latest.current.stopTimer();
				}
			}
		});
		return () => setReminderTarget(null);
	}, [isRunning, latest, runKey, setReminderTarget]);

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
				givenOutOfSight.current.delete(id);
			}
		}
	}, [isStatusKnown, runKey]);
}
