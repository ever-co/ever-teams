'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { STALE_TIMER_THRESHOLD, SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { onSignOut } from '@/core/lib/auth/sign-out-cleanups';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { isRunningTeamsLog, isStaleTeamsTimer } from '@/core/lib/helpers/timer-policy';
import { lookAtPageClock, watchPageSleep } from '@/core/lib/utils/timer/page-sleep';
import { forgetSavedStop, parseSavedStop, storedSavedStop } from '@/core/lib/utils/timer/saved-stop';
import {
	askAboutUnfollowedTime,
	decideUnfollowedTime,
	dropUnfollowedTimeQuestion,
	forgetHeartbeat,
	rememberHeartbeat,
	rememberedHeartbeat,
	UNFOLLOWED_TIME_FLOOR_MS
} from '@/core/lib/utils/timer/unfollowed-time';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerService } from '@/core/services/client/api/timers';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { TEmployee } from '@/core/types/schemas/organization/employee.schema';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf } from '@/core/lib/utils/workspace-formats';

/** The employee's last log, with the present the closed-tab rule goes by. */
async function readLastLog(employeeId: string) {
	const response = await timerService.getLastTimerLog(employeeId);
	const lastLog = response.data?.[0]?.lastLog;
	// A client clock running fast would cut live timers: use the server clock when the response exposes it.
	// Without it (the Gauzy API's CORS does not expose Date in direct mode), allow 5 minutes of client skew.
	const serverNow = Date.parse(response.headers?.date ?? '');
	const clientNow = Date.now();
	return { lastLog, clientNow, now: Number.isNaN(serverNow) ? clientNow - 5 * 60_000 : serverNow };
}

/**
 * Why a run was stopped at its last heartbeat, as the person reads it: its tab was closed, the app could not follow
 * it (the computer slept, the browser paused the tab), or they chose not to keep the time after it.
 */
type StoppedAtHeartbeatHint = 'STALE_STOPPED_HINT' | 'UNFOLLOWED_STOPPED_HINT' | 'UNFOLLOWED_STOP_CHOSEN_HINT';

/** Stops a TEAMS run at its last heartbeat rather than now, and tells the person when it ended, and why. */
function useStopAtLastHeartbeat() {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const queryClient = useQueryClient();

	return useCallback(
		/** @param timeLogId When given, the stop names that run and never ends another one. */
		async (lastLog: ITimeLog & { stoppedAt: Date }, hint: StoppedAtHeartbeatHint, timeLogId?: string) => {
			try {
				await timerService.stopTimer({
					source: ETimeLogSource.TEAMS,
					startedAt: lastLog.startedAt,
					stoppedAt: lastLog.stoppedAt,
					...(timeLogId ? { timeLogId } : {})
				});
			} catch (error) {
				if (!ApiErrorService.isApiError(error)) throw error;
				// 409: another run is the running one by then, which this stop may not end
				if (timeLogId && error.hasHttpResponseStatus(409)) return;
				// 406: another tab or device stopped it first.
				if (!error.hasHttpResponseStatus(406)) throw error;
			}
			stopsAtLastHeartbeat += 1;

			const stoppedAt = dateFormatOf(locale, {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(lastLog.stoppedAt));
			toast.info(t('toasts.timer.STALE_STOPPED', { stoppedAt }), {
				id: 'timer-stale-stopped',
				description: t(`toasts.timer.${hint}`)
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		},
		[locale, queryClient, t]
	);
}

/**
 * Stops a TEAMS timer that a closed tab left running, at its last heartbeat rather than now, so the time
 * after the tab closed is not credited. Resolves to true when the employee's last log was such a timer.
 */
export function useStopStaleTeamsTimer() {
	const stopAtLastHeartbeat = useStopAtLastHeartbeat();

	return useCallback(
		async (employeeId: string) => {
			const { lastLog, now } = await readLastLog(employeeId);
			if (!isStaleTeamsTimer(lastLog, now)) return false;

			await stopAtLastHeartbeat(lastLog, 'STALE_STOPPED_HINT');
			return true;
		},
		[stopAtLastHeartbeat]
	);
}

/**
 * Settles the time the employee's run went on without a heartbeat (unfollowed-time.ts), as the app loads or as
 * the page wakes up: nothing for a moment, the stop at the last heartbeat past the closed-tab delay, and in between
 * the question to the person, whose answer is applied here.
 *
 * - They keep the time: a heartbeat is sent at once, so the run ends at the present again.
 * - They stop the run at its last heartbeat, or leave the question unanswered until the closed-tab delay is
 *   reached: the run is stopped there, if it is still as it was when the question was asked. One that went on
 *   meanwhile, kept from another device, is left alone.
 * - They answer in another tab: that tab applies the answer.
 */
function useSettleUnfollowedTime() {
	const stopAtLastHeartbeat = useStopAtLastHeartbeat();

	return useCallback(
		/** @param wasAsleep Whether the page's scripts had stopped running, rather than the app being opened. */
		async (employeeId: string, wasAsleep: boolean) => {
			const { lastLog, now, clientNow } = await readLastLog(employeeId);
			const decision = decideUnfollowedTime({ lastLog, now, clientNow, remembered: rememberedHeartbeat() });
			if (decision === 'follow' || !lastLog?.id || !lastLog.stoppedAt) return;

			const run = lastLog as ITimeLog & { stoppedAt: Date };
			const unansweredHint = wasAsleep ? 'UNFOLLOWED_STOPPED_HINT' : 'STALE_STOPPED_HINT';
			if (decision === 'stop') {
				await stopAtLastHeartbeat(run, unansweredHint);
				return;
			}

			const heartbeat = new Date(run.stoppedAt).getTime();
			const answer = await askAboutUnfollowedTime(
				{ employeeId, timeLogId: lastLog.id, from: new Date(heartbeat).toISOString(), until: clientNow },
				STALE_TIMER_THRESHOLD.value - (now - heartbeat)
			);
			if (answer === 'elsewhere') return;
			if (answer === 'keep') {
				try {
					const kept = await timerService.syncTimer({
						source: ETimeLogSource.TEAMS,
						user: { employee: { id: employeeId } },
						timeLogId: lastLog.id
					});
					rememberHeartbeat(kept?.data?.lastLog);
				} catch (error) {
					// The heartbeat the app sends each minute takes over: the answer stands
					logErrorInDev('[Timer] The heartbeat of a kept run failed:', error);
				}
				return;
			}

			const latest = (await readLastLog(employeeId)).lastLog;
			const isAsAsked =
				isRunningTeamsLog(latest) &&
				latest.id === lastLog.id &&
				new Date(latest.stoppedAt ?? Number.NaN).getTime() === heartbeat;
			if (!isAsAsked) return;
			await stopAtLastHeartbeat(
				run,
				answer === 'stop' ? 'UNFOLLOWED_STOP_CHOSEN_HINT' : unansweredHint,
				lastLog.id
			);
		},
		[stopAtLastHeartbeat]
	);
}

/**
 * Applies the stop the employee asked for as their session ended, which the browser kept (saved-stop.ts): the run it
 * was pressed for ends at the time it was pressed, as it would have with a session that went on. Resolves to true
 * when that stop ended the run.
 *
 * It ends that run only, and only while it is still the running one. It never ends the run before its last
 * heartbeat, up to which the API has it going on (a computer clock running late would). And when the app was no
 * longer following the run as Stop was pressed (the computer had slept, the tab was frozen), the time since its last
 * heartbeat is no more counted than after a closed tab: the run is left to that rule, which ends it at the heartbeat.
 */
function useApplySavedStop() {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const queryClient = useQueryClient();

	return useCallback(
		async (employeeId: string, isTrackingTime: boolean) => {
			const savedStop = parseSavedStop(storedSavedStop());
			// Another employee's stop stays for them: they may sign in again on this browser
			if (!savedStop || savedStop.employeeId !== employeeId) return false;
			// Nothing runs for the employee anymore: the run was stopped meanwhile
			if (!isTrackingTime) {
				forgetSavedStop(savedStop.timeLogId);
				return false;
			}

			const response = await timerService.getLastTimerLog(employeeId);
			const lastLog = response.data?.[0]?.lastLog;
			const pressedAt = Date.parse(savedStop.pressedAt);
			const isStillItsRun = !!lastLog?.isRunning && lastLog.id === savedStop.timeLogId;
			if (!isStillItsRun || isStaleTeamsTimer(lastLog, pressedAt)) {
				forgetSavedStop(savedStop.timeLogId);
				return false;
			}

			// The time Stop was pressed is the computer's. Never before the run's last heartbeat, which a clock running
			// late would give, nor after the present on the API's clock, when the answer gives it (a clock running fast)
			const lastHeartbeat = new Date(lastLog.stoppedAt ?? Number.NaN).getTime();
			const serverNow = Date.parse(response.headers?.date ?? '');
			const earliest = Number.isNaN(lastHeartbeat) ? pressedAt : lastHeartbeat;
			const latest = Number.isNaN(serverNow) ? Number.POSITIVE_INFINITY : Math.max(serverNow, earliest);
			const stoppedAt = new Date(Math.min(Math.max(pressedAt, earliest), latest)).toISOString();

			try {
				await timerService.stopTimer({
					source: savedStop.source,
					startedAt: lastLog.startedAt,
					stoppedAt,
					timeLogId: savedStop.timeLogId
				});
			} catch (error) {
				// 406: the run was stopped as this stop arrived. 409: another run is the running one by then. Neither
				// is a run this stop may end.
				if (!(ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(406, 409))) throw error;
				forgetSavedStop(savedStop.timeLogId);
				return false;
			}

			forgetSavedStop(savedStop.timeLogId);
			const shownStoppedAt = dateFormatOf(locale, {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(stoppedAt));
			toast.info(t('toasts.timer.STALE_STOPPED', { stoppedAt: shownStoppedAt }), {
				id: 'timer-saved-stop-applied',
				description: t('toasts.timer.SAVED_STOP_HINT')
			});
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			return true;
		},
		[locale, queryClient, t]
	);
}

/**
 * The page's closed-tab checks: the employees whose check is over, and the check in flight per employee. Module
 * scope on purpose (#5118): the check runs once per page load. The timer's owner mounts again within a page (the
 * (main) layout after a page outside it), and a check made again then found the run this page kept alive stale,
 * with no heartbeat while the owner was unmounted, and stopped it as left behind by a closed tab. A run this page
 * keeps alive is never one the check sees: the heartbeat waits for the check, which does not run again.
 */
const checkedEmployees = new Set<string>();
const checksInFlight = new Map<string, Promise<void>>();
/** How many runs this page stopped at their last heartbeat: a stop that waited for one has nothing left to end. */
let stopsAtLastHeartbeat = 0;

/**
 * The page's sleeps (#5123). When its scripts stopped running for longer than the app's ordinary pace (the computer
 * slept, the browser paused the tab), the page no longer kept the run alive, and the check runs again: this is the
 * one case in which a page checks twice. Until that check is over no heartbeat is sent, as on a page load.
 */
let sleeps = 0;
let isCheckDueAfterSleep = false;
let hasCheckedOnce = false;
let mountedGuards = 0;
let whenSettled: { promise: Promise<void>; settle: () => void } | null = null;
const sleepListeners = new Set<() => void>();

function onPageSlept(): void {
	sleeps += 1;
	isCheckDueAfterSleep = true;
	checkedEmployees.clear();
	if (!whenSettled) {
		let settle: () => void = () => undefined;
		const promise = new Promise<void>((resolve) => {
			settle = resolve;
		});
		whenSettled = { promise, settle };
	}
	for (const listener of [...sleepListeners]) listener();
}

function onChecked(): void {
	hasCheckedOnce = true;
	isCheckDueAfterSleep = false;
	whenSettled?.settle();
	whenSettled = null;
}

/** Whether the browser discarded this tab to free memory, and loaded it again when the person came back to it. */
function wasPageDiscarded(): boolean {
	return typeof document !== 'undefined' && (document as Document & { wasDiscarded?: boolean }).wasDiscarded === true;
}

function subscribeToSleeps(listener: () => void): () => void {
	sleepListeners.add(listener);
	return () => {
		sleepListeners.delete(listener);
	};
}

/**
 * Whether the time a run went on without the app is still to be settled, on a page that settles it (the guard is
 * mounted): a check is due after a sleep, or one is under way. The sender of a heartbeat asks first, and sends none
 * meanwhile, or the heartbeat would put that time in the run before the person has said what becomes of it.
 */
export function isUnfollowedTimeUnsettled(): boolean {
	lookAtPageClock();
	return mountedGuards > 0 && (isCheckDueAfterSleep || checksInFlight.size > 0);
}

/**
 * The moment that time is settled, or null when nothing is to be settled. A stop asked meanwhile waits for it: sent
 * at once, it would end the run at the present, with that time in it.
 *
 * @returns Whether the run was stopped at its last heartbeat meanwhile: the stop that waited then sends nothing.
 */
export function whenUnfollowedTimeIsSettled(): Promise<boolean> | null {
	if (!isUnfollowedTimeUnsettled()) {
		return null;
	}
	const stopsBefore = stopsAtLastHeartbeat;
	const checks = [...checksInFlight.values()].map((check) => check.catch(() => undefined));
	return Promise.all([...checks, whenSettled?.promise]).then(() => stopsAtLastHeartbeat !== stopsBefore);
}

// The person's runs, as this page knew them, go with the session (sign-out-cleanups.ts)
onSignOut(() => {
	checkedEmployees.clear();
	checksInFlight.clear();
	dropUnfollowedTimeQuestion();
	forgetHeartbeat();
	onChecked();
});

/** Runs the employee's check unless this page ran it: a check in flight is shared, a failed one runs again. */
function checkOncePerPage(employeeId: string, check: () => Promise<unknown>): Promise<void> {
	const inFlight = checksInFlight.get(employeeId);
	if (inFlight) return inFlight;
	const sleepsAtStart = sleeps;
	const request: Promise<void> = check()
		.then(() => {
			// A sleep during the check calls for another one: this one is not the last word
			if (checksInFlight.get(employeeId) !== request || sleeps !== sleepsAtStart) return;
			checkedEmployees.add(employeeId);
			onChecked();
		})
		.finally(() => {
			if (checksInFlight.get(employeeId) === request) checksInFlight.delete(employeeId);
		});
	checksInFlight.set(employeeId, request);
	return request;
}

/**
 * Checks once per employee and page load, when the app loads, for a TEAMS timer left running by a closed tab, after
 * the stop the employee asked for as their session ended, when the browser kept one. And once more each time the
 * page wakes up from a sleep, during which it did not follow the run (#5123). Below the closed-tab delay, the time
 * the run went on without a heartbeat is put to the person (useSettleUnfollowedTime).
 * Returns true when the check is over: the heartbeat must wait for it, or it would revive the stale timer, move the
 * end of a run past the time its stop was asked for, and keep time the person has not said they keep.
 */
export function useStaleTimerGuard(
	employee: Pick<TEmployee, 'id' | 'isTrackingTime'> | null | undefined,
	enabled: boolean
): boolean {
	const settleUnfollowedTime = useSettleUnfollowedTime();
	const applySavedStop = useApplySavedStop();
	const employeeId = employee?.id;
	const isTrackingTime = !!employee?.isTrackingTime;
	const pageSleeps = useSyncExternalStore(
		subscribeToSleeps,
		() => sleeps,
		() => 0
	);
	const [settled, setSettled] = useState<{ employeeId: string; sleeps: number } | null>(null);
	const [attempt, setAttempt] = useState(0);

	// The page's sleeps are watched for as long as it follows the employee's run
	useEffect(() => {
		if (!enabled || !employeeId) return;
		mountedGuards += 1;
		const stopWatching = watchPageSleep(() => onPageSlept(), UNFOLLOWED_TIME_FLOOR_MS);
		return () => {
			mountedGuards -= 1;
			stopWatching();
			// Nobody is left on this page to settle it for now: a stop that waits goes ahead. The check stays due
			if (mountedGuards === 0) {
				whenSettled?.settle();
				whenSettled = null;
			}
		};
	}, [enabled, employeeId]);

	useEffect(() => {
		if (!enabled || !employeeId) return;
		if (checkedEmployees.has(employeeId)) {
			setSettled({ employeeId, sleeps: pageSleeps });
			return;
		}
		let isCurrent = true;
		let retryTimer: number | undefined;
		// A tab the browser discarded and loaded again was not closed by the person: it slept
		const wasAsleep = isCheckDueAfterSleep || (!hasCheckedOnce && wasPageDiscarded());
		// The stop the employee asked for comes first: the closed-tab rule would end its run at the last heartbeat.
		// An employee who is not tracking time has no run left behind
		const check = async () => {
			const isStoppedAsAsked = await applySavedStop(employeeId, isTrackingTime);
			if (!isStoppedAsAsked && isTrackingTime) {
				await settleUnfollowedTime(employeeId, wasAsleep);
			}
		};
		void checkOncePerPage(employeeId, check).then(
			() => {
				if (!isCurrent) return;
				// The page slept during the check: it is made again
				if (!checkedEmployees.has(employeeId)) {
					setAttempt((count) => count + 1);
					return;
				}
				setSettled({ employeeId, sleeps: pageSleeps });
			},
			(error) => {
				logErrorInDev('[Timer] Stale timer check failed, retrying:', error);
				// Releasing the heartbeat now would move a stale log's stoppedAt to the present and credit the
				// closed-tab gap, so it keeps waiting until a check goes through.
				if (!isCurrent) return;
				retryTimer = window.setTimeout(() => setAttempt((count) => count + 1), SYNC_TIMER_INTERVAL);
			}
		);
		return () => {
			isCurrent = false;
			window.clearTimeout(retryTimer);
		};
	}, [applySavedStop, attempt, enabled, employeeId, isTrackingTime, pageSleeps, settleUnfollowedTime]);

	return !employeeId || (settled?.employeeId === employeeId && settled.sleeps === pageSleeps);
}

/**
 * The employee's last time log, whatever its day: the query of the check below. Any other reader of it (the timer
 * reminders) takes these options with the query off, so it never runs the query with a function of its own.
 */
export function lastTimerLogQuery(employeeId: string | null | undefined) {
	return {
		queryKey: queryKeys.timer.lastLog(employeeId),
		queryFn: async () => (await timerService.getLastTimerLog(employeeId!)).data?.[0]?.lastLog ?? null
	};
}

/**
 * /timesheet/timer/status only sees logs started on the server's current day, so a timer still running past the
 * server's midnight reads as stopped there, and without its heartbeat the stale check would cut it at that midnight.
 * When the status says stopped although this tab saw the timer run or the employee is tracking time, the last log
 * (any day) tells whether a TEAMS timer still runs. It is polled only while one does, so the heartbeat stops with it.
 */
export function useTimerRunningPastMidnight(
	employee: Pick<TEmployee, 'id' | 'isTrackingTime'> | null | undefined,
	statusRunning: boolean,
	enabled: boolean
): boolean {
	const employeeId = employee?.id;
	const [sawRunning, setSawRunning] = useState(statusRunning);

	useEffect(() => {
		if (statusRunning) setSawRunning(true);
	}, [statusRunning]);

	const checkLastLog = enabled && !statusRunning && !!employeeId && (sawRunning || !!employee?.isTrackingTime);
	const { data: lastLog } = useQuery({
		...lastTimerLogQuery(employeeId),
		enabled: checkLastLog,
		staleTime: 0,
		// A failed read keeps polling: a first read that fails has no data, and stopping there would end the
		// heartbeat of a timer that may still run.
		refetchInterval: (query) =>
			query.state.status === 'error' || isRunningTeamsLog(query.state.data) ? SYNC_TIMER_INTERVAL : false
	});

	return statusRunning || (checkLastLog && isRunningTeamsLog(lastLog));
}
