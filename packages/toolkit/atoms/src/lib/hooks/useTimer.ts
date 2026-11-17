import { addTimeSlot, startTimer as startApiTimer, stopTimer as stopApiTimer } from '@ever-teams/api';
import { useEffect, useRef, useState } from 'react';
import { useTeamsStopWatch } from './useTeamsStopWatch';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimerStatus } from './useTimerStatus';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTimerStatusContext } from '@lib/context/teams-timer-status-context';

/**
 * Self-contained timer hook that manages all timer functionality.
 * Internally fetches all required dependencies - no parameters needed.
 *
 * @returns Timer state and control functions
 */
export const useTimer = () => {
	// Get dependencies from context
	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	// Every widget of the page reads the same status: after a start or a stop, all of them are refreshed at once.
	const sharedStatus = useTimerStatusContext();
	const refreshEveryWidget = async () => {
		await sharedStatus?.refetch();
	};

	const [currentTeamsState, setCurrentTeamsState] = useState<ICurrentTeamsState>({
		taskId: null,
		projectId: null,
		organizationTeamId: null,
		clientId: null
	});

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

	const [timerLoading, setTimerLoading] = useState(false);

	const interval = useRef<number>(0);

	const startTimer = async () => {
		try {
			setTimerLoading(true);
			const timeSlot = await startApiTimer(user, token, currentTeamsState, organizationId);

			if ('message' in timeSlot || 'error' in timeSlot) {
				const errorMessage =
					'message' in timeSlot
						? Array.isArray(timeSlot.message)
							? timeSlot.message.join(', ')
							: timeSlot.message
						: String(timeSlot.error);

				toast({
					variant: 'destructive',
					description: errorMessage
				});

				return;
			}

			start();
			await refreshEveryWidget();
		} catch (error) {
			toast({
				title: 'Ever Teams Error',
				description: (error as Error).message,
				variant: 'destructive'
			});
		} finally {
			setTimerLoading(false);
		}
	};

	const stopTimer = async () => {
		clearInterval(interval.current);
		try {
			setTimerLoading(true);
			const timeSlot = await stopApiTimer(user, token, organizationId);

			if ('message' in timeSlot || 'error' in timeSlot) {
				const errorMessage =
					'message' in timeSlot
						? Array.isArray(timeSlot.message)
							? timeSlot.message.join(', ')
							: timeSlot.message
						: String(timeSlot.error);

				toast({
					variant: 'destructive',
					description: errorMessage
				});

				return;
			}

			timeSlot && (await addTimeSlot(token, timeSlot));

			reset();
			await refreshEveryWidget();
		} catch (error) {
			toast({
				title: 'Ever Teams Error',
				description: (error as Error).message,
				variant: 'destructive'
			});
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

	return {
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
		timerLoading,
		currentTeamsState,
		setCurrentTeamsState
	};
};
