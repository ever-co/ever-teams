import { addTimeSlot, apiConfigManager, startTimer as startApiTimer, stopTimer as stopApiTimer } from '@ever-teams/api';
import { useEffect, useRef, useState } from 'react';
import { NO_TEAMS_STATE, useForgetOnAccountChange } from './useForgetOnAccountChange';
import { useTeamsStopWatch } from './useTeamsStopWatch';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimerStatus } from './useTimerStatus';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTranslation } from 'react-i18next';
import { errorMessageOf, useTimerStatusContext } from '@lib/context/teams-timer-status-context';
import { kindOfFailedRequest, noticeOfFailure } from '@lib/errors/kit-error';

/**
 * Self-contained timer hook that manages all timer functionality.
 * Internally fetches all required dependencies - no parameters needed.
 *
 * @returns Timer state and control functions
 */
export const useTimer = () => {
	// Get dependencies from context
	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { t } = useTranslation();
	// Every widget of the page reads the same status: after a start or a stop, all of them are refreshed at once.
	const sharedStatus = useTimerStatusContext();
	const refreshEveryWidget = async () => {
		await sharedStatus?.refetch();
	};

	const [currentTeamsState, setCurrentTeamsState] = useState<ICurrentTeamsState>(NO_TEAMS_STATE);

	// Fetch timer status
	const { data: timerStatus, loading: timerStatusLoading } = useTimerStatus(user, token, organizationId);

	// Default timer status if null
	const safeTimerStatus = { duration: 0, lastLog: null, running: false };

	const {
		todayTrackedTime,
		setTodayTrackedTime,
		start,
		pause,
		reset,
		isRunning,
		hours,
		minutes,
		seconds,
		totalSeconds,
		time,
		setTime
	} = useTeamsStopWatch(timerStatus ?? safeTimerStatus);

	// Another account starts clean. The sync below leaves the task, project and team, and today's total, as they were
	// when a status states none (an account with no time recorded): after a sign-out that keeps the widget mounted, the
	// next account's first start would send the previous account's task, project and team. Called before that sync, so
	// it never undoes a status read for the new account.
	const account = useForgetOnAccountChange(() => {
		setCurrentTeamsState(NO_TEAMS_STATE);
		setTodayTrackedTime(new Date(0));
		reset();
	});
	// Whose stopwatch a start or stop moves once it answers: the account's, whatever token it runs with by then.
	const currentAccount = useRef(account);
	currentAccount.current = account;

	const [timerLoading, setTimerLoading] = useState(false);

	const interval = useRef<number>(0);

	// One start or stop at a time: under a TeamsProvider for every widget of the page, otherwise for this widget. A
	// second click while one runs (a double click, or a stop while the start is in flight) is ignored.
	const ownActionInFlight = useRef(false);
	const runAction = async (action: () => Promise<void>) => {
		if (sharedStatus) {
			return sharedStatus.runAction(action);
		}
		if (ownActionInFlight.current) {
			return;
		}
		ownActionInFlight.current = true;
		try {
			await action();
		} finally {
			ownActionInFlight.current = false;
		}
	};

	// Whose start or stop this is: a result that comes back after a switch of user, token or organization is not shown
	// in the widgets of the new one.
	const identity = `${user?.id ?? ''}|${token}|${organizationId ?? ''}`;
	const currentIdentity = useRef(identity);
	currentIdentity.current = identity;

	// A refused start or stop: under a TeamsProvider every widget shows it as a notice inside the widget; outside one,
	// as before, a toast. The API package returns a request that got no answer as an error with no status: the probe
	// says whether this site is not allowed or Ever Teams is unreachable.
	const reportAnswer = async (
		answer: { message?: unknown; error?: unknown; statusCode?: unknown; code?: unknown },
		forIdentity: string
	) => {
		const message = errorMessageOf(answer);
		if (sharedStatus) {
			const failure = await noticeOfFailure(answer, message, apiConfigManager.getConfig().apiUrl);
			if (currentIdentity.current === forIdentity) {
				sharedStatus.reportNotice(failure);
			}
			return;
		}
		toast({ variant: 'destructive', description: message });
	};

	// A start or stop that got no answer.
	const reportThrown = async (error: unknown, forIdentity: string) => {
		if (sharedStatus) {
			const kind = await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl);
			if (currentIdentity.current === forIdentity) {
				sharedStatus.reportNotice({ kind });
			}
			return;
		}
		toast({ title: 'Ever Teams Error', description: (error as Error).message, variant: 'destructive' });
	};

	const startTimerNow = async () => {
		const forIdentity = identity;
		const forAccount = account;
		try {
			setTimerLoading(true);
			const timeSlot = await startApiTimer(user, token, currentTeamsState, organizationId);

			if ('message' in timeSlot || 'error' in timeSlot) {
				await reportAnswer(timeSlot, forIdentity);
				return;
			}
			// A start that comes back after a switch of user or organization is the previous account's: the widgets of
			// the new one keep their own stopwatch. A new token for the same account still shows the start.
			if (currentAccount.current !== forAccount) {
				return;
			}

			start();
			await refreshEveryWidget();
		} catch (error) {
			await reportThrown(error, forIdentity);
		} finally {
			setTimerLoading(false);
		}
	};

	const stopTimerNow = async () => {
		const forIdentity = identity;
		const forAccount = account;
		clearInterval(interval.current);
		try {
			setTimerLoading(true);
			const timeSlot = await stopApiTimer(user, token, organizationId);

			if ('message' in timeSlot || 'error' in timeSlot) {
				await reportAnswer(timeSlot, forIdentity);
				return;
			}

			timeSlot && (await addTimeSlot(token, timeSlot));
			// The same for a stop: it never resets the stopwatch of the account signed in since.
			if (currentAccount.current !== forAccount) {
				return;
			}

			reset();
			await refreshEveryWidget();
		} catch (error) {
			await reportThrown(error, forIdentity);
		} finally {
			setTimerLoading(false);
		}
	};

	useEffect(() => {
		// Sync timer status with stopwatch when timer is running
		if (timerStatus?.running) {
			// The run's elapsed time comes from the server, so a reload or a run started elsewhere shows it right
			const startedAt = timerStatus.lastLog?.startedAt;
			if (startedAt) {
				setTime(new Date(Math.max(0, Date.now() - new Date(startedAt).getTime())));
			}
			start();
		} else {
			reset();
		}

		// Sync timer status with stopwatch (today tracked time)
		if (timerStatus && timerStatus.duration) {
			setTodayTrackedTime(new Date(timerStatus.duration * 1000));
		}
		// Sync timer status with teams state
		if (timerStatus && timerStatus.lastLog) {
			setCurrentTeamsState({
				taskId: timerStatus.lastLog.taskId,
				projectId: timerStatus.lastLog.projectId,
				organizationTeamId: timerStatus.lastLog.organizationTeamId,
				clientId: timerStatus.lastLog.organizationContactId
			});
		}
	}, [timerStatus]);

	const startTimer = () => runAction(startTimerNow);
	const stopTimer = () => runAction(stopTimerNow);

	// The name screen readers give the start and stop control of every timer widget.
	const timerActionLabel = t(isRunning ? 'TIME_TRACKER.STOP_TIMER' : 'TIME_TRACKER.START_TIMER');

	return {
		timerActionLabel,
		start,
		pause,
		startTimer,
		stopTimer,
		isRunning,
		hours,
		minutes,
		seconds,
		totalSeconds,
		timerStatus: safeTimerStatus,
		timerStatusLoading,
		time,
		setTime,
		todayTrackedTime,
		setTodayTrackedTime,
		// A start or a stop in any widget of the page shows in all of them.
		timerLoading: timerLoading || Boolean(sharedStatus?.actionPending),
		currentTeamsState,
		setCurrentTeamsState
	};
};
