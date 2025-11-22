'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { convertMsToTime, secondsToTime } from '@/core/lib/helpers/date-and-time';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	localTimerStatusState,
	timeCounterIntervalState,
	timeCounterState,
	timerSecondsState,
	timerStatusFetchingState,
	timerStatusState,
	taskStatusesState,
	activeTeamIdState,
	activeTeamTaskState,
	detailedTaskState,
	activeTeamState,
	teamTasksState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import { useQueryCall } from '../common/use-query';
import { useSyncRef } from '../common/use-sync-ref';
import { useTaskStatistics } from '../tasks/use-task-statistics';
import isEqual from 'lodash/isEqual';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { timerService } from '@/core/services/client/api/timers';
import { useOrganizationEmployeeTeams, useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useRefreshIntervalV2 } from '../common';
import { useTimerPolling } from './use-timer-polling';
import { ILocalTimerStatus, ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { getLocalTimerStorageKey } from '@/core/lib/helpers/timer';
import { useDailyPlan } from '../daily-plans/use-daily-plan';
import { REFRESH_INTERVAL, STOP_TIMER_DEBOUNCE_MS, STOP_TIMER_EFFECT_DEBOUNCE_MS, SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';

/**
 * ! Don't modify this function unless you know what you're doing
 * "This function is used to update the local timer status and time counter."
 *
 * The function is used in the `Timer` component
 * @param {ITimerStatus | null} timerStatus - ITimerStatus | null,
 * @param {TTask | null} activeTeamTask - TTask | null - the current active task
 * @param {boolean} firstLoad - boolean - this is a flag that indicates that the component is loaded
 * for the first time.
 * @returns An object with the following properties:
 */
function useLocalTimeCounter(
	timerStatus: ITimerStatus | null,
	activeTeamTask: TTask | null,
	firstLoad: boolean,
	activeTeamId?: string | null
) {
	const [timeCounterInterval, setTimeCounterInterval] = useAtom(timeCounterIntervalState);
	const [localTimerStatus, setLocalTimerStatus] = useAtom(localTimerStatusState);

	const [timeCounter, setTimeCounter] = useAtom(timeCounterState); // in millisencods
	const [timerSeconds, setTimerSeconds] = useAtom(timerSecondsState);

	// Refs
	const timerStatusRef = useSyncRef(timerStatus);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const timerSecondsRef = useRef(0);
	const seconds = Math.floor(timeCounter / 1000);

	const updateLocalStorage = useCallback(
		(status: ILocalTimerStatus) => {
			localStorage.setItem(getLocalTimerStorageKey(activeTeamId), JSON.stringify(status));
		},
		[activeTeamId]
	);

	const updateLocalTimerStatus = useCallback(
		(status: ILocalTimerStatus) => {
			updateLocalStorage(status); // the order is important (first update localstorage, then update the store state)
			setLocalTimerStatus(status);
		},
		[updateLocalStorage, setLocalTimerStatus]
	);

	const getLocalCounterStatus = useCallback(() => {
		let data: ILocalTimerStatus | null = null;
		try {
			data = JSON.parse(localStorage.getItem(getLocalTimerStorageKey(activeTeamId)) || 'null');
		} catch (error) {
			console.log(error);
		}
		return data;
	}, [activeTeamId]);

	// Update local time status (storage and store) only when global timerStatus changes
	useEffect(() => {
		if (firstLoad) {
			const localStatus = getLocalCounterStatus();
			localStatus && setLocalTimerStatus(localStatus);

			const timerStatusDate = timerStatus?.lastLog?.createdAt
				? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 - timerStatus?.lastLog?.duration
				: 0;

			timerStatus &&
				updateLocalTimerStatus({
					runnedDateTime:
						(timerStatus.running ? timerStatusDate || Date.now() : 0) || localStatus?.runnedDateTime || 0,
					running: timerStatus.running || false,
					lastTaskId: timerStatus.lastLog?.taskId || null
				});
		}
	}, [firstLoad, timerStatus, getLocalCounterStatus, setLocalTimerStatus, updateLocalTimerStatus]);

	// THis is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (!firstLoad) return 0;
		if (seconds > timerSecondsRef.current) {
			return seconds;
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0;
		}
		return timerSecondsRef.current;
	}, [seconds, firstLoad, timerStatusRef]);

	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [activeTeamTask?.id, setTimerSeconds, firstLoad, timerSecondsRef]);

	useEffect(() => {
		if (firstLoad) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [setTimerSeconds, firstLoad]);

	// Update timerSeconds state when timerSecondsRef changes
	// This ensures the progress bar updates in real-time as the timer runs
	useEffect(() => {
		if (firstLoad && timerSecondsRef.current !== timerSeconds) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [seconds, firstLoad, setTimerSeconds, timerSeconds]);

	// Time Counter
	useEffect(() => {
		if (!firstLoad || !localTimerStatus) return;
		window.clearInterval(timeCounterIntervalRef.current);
		if (localTimerStatus.running) {
			setTimeCounterInterval(
				window.setInterval(() => {
					const now = Date.now();
					setTimeCounter(now - localTimerStatus.runnedDateTime);
				}, 50)
			);
		} else {
			setTimeCounter(0);
		}
	}, [localTimerStatus, firstLoad, setTimeCounter, setTimeCounterInterval, timeCounterIntervalRef]);

	return {
		updateLocalTimerStatus,
		timeCounter,
		timerSeconds: timerSeconds
	};
}

/**
 * It returns a bunch of data and functions related to the timer
 */
export function useTimer() {
	const pathname = usePathname();

	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const taskStatuses = useAtomValue(taskStatusesState);
	const detailedTask = useAtomValue(detailedTaskState);
	const activeTeamId = useAtomValue(activeTeamIdState);

	// Use useDailyPlan to get the logged-in user's plans (no employeeId = current user)
	const { myDailyPlans } = useDailyPlan();

	const teamTasks = useAtomValue(teamTasksState);

	const [timerStatusFetching, setTimerStatusFetching] = useAtom(timerStatusFetchingState);

	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);

	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTeamTask);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTeam = useRef<typeof activeTeam | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const lastActiveTask = useRef<TTask | null>(null);
	// Track last stopTimer call to prevent duplicate calls within short time window
	const lastStopTimerTimestamp = useRef<number>(0);
	const { updateTask, setActiveTask, isUpdatingActiveTask } = useTeamTasks();
	const t = useTranslations();

	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user, refreshUserData } = useAuthenticateUser();

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();
	const queryClient = useQueryClient();

	// Queries
	const { queryCall, loading, loadingRef } = useQueryCall(async () =>
		queryClient.fetchQuery({
			queryKey: queryKeys.timer.timer(activeTeamId),
			queryFn: () => timerService.getTimerStatus()
		})
	);

	const toggleTimerMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await timerService.toggleTimer({ taskId });
		}
	});

	const stopTimerMutation = useMutation({
		mutationFn: async (source: ETimeLogSource) => {
			return await timerService.stopTimer({ source });
		}
		// onSuccess: () => {
		// 	refetchEmployeeTodayTimeLogs?.();
		// }
	});

	const startTimerMutation = useMutation({
		mutationFn: timerService.startTimer
	});

	const syncTimerMutation = useMutation({
		mutationFn: async (data: { source: ETimeLogSource; user?: TUser | null }) => {
			await timerService.syncTimer({ source: data.source, user: data.user });
		},
		onError: (error: any) => {
			// Don't log every sync error to avoid console spam
			// The 401 handler will take care of logout if needed
			if (error?.response?.status !== 401) {
				console.error('[Timer] Sync timer failed:', error);
			}
		},
		retry: (failureCount, error: any) => {
			// Don't retry on 401 - let the auth system handle it
			if (error?.response?.status === 401) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		}
	});

	// Find if the connected user has a today plan. Help to know if he can track time when require daily plan is set to true
	const hasPlan = myDailyPlans?.items.find(
		(plan: TDailyPlan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]) &&
			plan.tasks &&
			plan.tasks?.length > 0
	);

	const tomorrow = moment().add(1, 'days');
	const hasPlanForTomorrow = myDailyPlans?.items.find(
		(plan: TDailyPlan) => moment(plan.date).format('YYYY-MM-DD') === tomorrow.format('YYYY-MM-DD')
	);

	// Team setting that tells if each member must have a today plan for allowing tracking time
	const requirePlan = activeTeam?.requirePlanToTrack;

	// If require plan setting is activated but user don't have plan, block time tracking until a today plan will be added
	let canTrack = true;

	if (requirePlan) {
		if (!hasPlan) canTrack = false;
	}

	// If require plan setting is activated,
	// check if the today plan has working time planned and all the tasks into the plan are estimated
	const isPlanVerified = requirePlan
		? hasPlan &&
			hasPlan?.workTimePlanned > 0 &&
			!!hasPlan?.tasks?.every((task) => task.estimate && task.estimate > 0)
		: true;

	const canRunTimer =
		user?.isEmailVerified &&
		((!!activeTeamTask && activeTeamTask.status !== 'closed') ||
			// If timer is running at some other source and user may or may not have selected the task
			timerStatusRef.current?.lastLog?.source !== ETimeLogSource.TEAMS);

	// Local time status
	const { timeCounter, updateLocalTimerStatus, timerSeconds } = useLocalTimeCounter(
		timerStatus,
		activeTeamTask,
		firstLoad,
		activeTeamId
	);

	const getTimerStatus = useCallback(
		(deepCheck?: boolean) => {
			if (loadingRef.current || !user?.tenantId) {
				return;
			}
			return queryCall().then((res) => {
				if (res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus((t: ITimerStatus | null) => {
						if (deepCheck) {
							return res.data.running !== t?.running ? res.data : t;
						}
						return res.data;
					});
				}
				return res;
			});
		},
		[timerStatus, setTimerStatus, queryCall, loadingRef, user]
	);

	const toggleTimer = useCallback(
		(taskId: string, updateStore = true) => {
			return toggleTimerMutation.mutateAsync(taskId).then((res) => {
				if (updateStore && res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus(res.data);
				}
				return res;
			});
		},
		[timerStatus, toggleTimerMutation, setTimerStatus]
	);

	const syncTimer = useCallback(() => {
		if (syncTimerMutation.isPending) {
			return;
		}
		return syncTimerMutation
			.mutateAsync({ source: timerStatus?.lastLog?.source || ETimeLogSource.TEAMS, user: $user.current })
			.then((res) => {
				return res;
			});
	}, [syncTimerMutation, timerStatus]);

	// Loading states
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusFetching(loading);
		}
	}, [loading, firstLoad, setTimerStatusFetching]);

	useEffect(() => {
		setTimerStatusFetching(stopTimerMutation.isPending);
	}, [stopTimerMutation.isPending, setTimerStatusFetching]);

	// Start timer
	const startTimer = useCallback(async (explicitTask?: TTask) => {
		// Check if the user is tracking time in another tab or device
		try {
			const userData = await refreshUserData();
			if (userData?.employee.isTrackingTime) {
				toast.info(t('timer.ALREADY_TRACKING_MESSAGE'));
				return;
			}
		} catch (error) {
			toast.error('Failed to verify tracking status', {
				description: getErrorMessage(error, 'Unable to verify tracking status')
			});
			logErrorInDev('Failed to verify tracking status', error);
			return;
		}

		// NOTE_FIX: Use explicit task if provided to avoid race conditions with taskId.current
		// When startTimerWithTask calls setActiveTask then startTimer, taskId.current might have changed
		// due to useEffects or React Query refetches. Using explicitTask ensures we start timer on the correct task.
		const taskToUse = explicitTask || activeTeamTaskRef.current;
		const taskIdToUse = taskToUse?.id;

		if (pathname?.startsWith('/task/')) setActiveTask(detailedTask);
		if (!taskIdToUse) return;
		updateLocalTimerStatus({
			lastTaskId: taskIdToUse,
			runnedDateTime: Date.now(),
			running: true
		});

		setTimerStatusFetching(true);
		const promise = startTimerMutation.mutateAsync().then(async (res) => {
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);

			// Save active task via API when timer starts
			// Skip if we're on /task/ page because setActiveTask (line 366) already does it
			if (activeTeamId && taskIdToUse && user && !pathname?.startsWith('/task/')) {
				const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

				if (currentMember?.id) {
					// Use mutation instead of direct service call for better error handling and cache management
					await updateOrganizationTeamEmployeeActiveTask(currentMember.id, {
						organizationId: activeTeam?.organizationId,
						activeTaskId: taskIdToUse,
						organizationTeamId: activeTeam?.id,
						tenantId: activeTeam?.tenantId ?? ''
					});
				}
			}

			// Invalidate timer query for current team
			if (activeTeamId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.timer.all
				});
			}

			// Invalidate team-related queries to update member stats in real-time
			// This ensures the "Working" | "Pause" | "Not Working" tab count updates immediately when timer starts
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
			// NOTE: The invalidate organization team details is not needed because it's already invalidated by the above query

			return;
		});

		promise.catch(() => {
			if (taskId.current) {
				updateLocalTimerStatus({
					lastTaskId: taskId.current,
					runnedDateTime: 0,
					running: false
				});
			}
		});

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (taskToUse && taskToUse.status !== 'in-progress') {
			const selectedStatus = taskStatuses.find((s) => s.name === 'in-progress' && s.value === 'in-progress');
			const taskStatusId = selectedStatus?.id;
			updateTask({
				...taskToUse,
				taskStatusId: taskStatusId ?? taskToUse.taskStatusId,
				status: ETaskStatusName.IN_PROGRESS
			});
		}

		// Update Current user's active task to sync across multiple devices
		// Only execute this block on /task/ page to avoid redundancy with the block inside promise.then() (lines 401-413)
		// On /task/ page, the block inside promise.then() is skipped, so we need this block to update the active task
		if (taskToUse && pathname?.startsWith('/task/')) {
			const currentEmployeeDetails = activeTeam?.members?.find(
				(member) => member.employeeId === user?.employee?.id
			);
			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				// Fire-and-forget: don't wait for this call to complete
				// This reduces perceived delay for the user
				await updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
					organizationId: taskToUse.organizationId,
					activeTaskId: taskToUse.id,
					organizationTeamId: activeTeam?.id,
					tenantId: activeTeam?.tenantId ?? ''
				});
			}
		}

		promise.finally(() => setTimerStatusFetching(false));

		return promise;
	}, [
		pathname,
		setActiveTask,
		detailedTask,
		taskId,
		updateLocalTimerStatus,
		setTimerStatusFetching,
		startTimerMutation,
		activeTeamTaskRef,
		timerStatus,
		setTimerStatus,
		taskStatuses,
		updateTask,
		activeTeam?.members,
		activeTeam?.id,
		activeTeam?.tenantId,
		user?.employee?.id,
		updateOrganizationTeamEmployeeActiveTask,
		t,
		refreshUserData,
		queryClient,
		activeTeamId
	]);

	// Stop timer
	const stopTimer = useCallback(() => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false
		});

		syncTimer();

		// Use timerStatusRef instead of timerStatus to avoid closure issues
		// This ensures we check the most current timer state, not the captured one
		if (!timerStatusRef.current?.running) {
			return Promise.resolve();
		}

		// Prevent duplicate stopTimer calls within 500ms
		// This is the PRIMARY defense against race conditions causing 406 errors
		// The debounce checks in useEffects are SECONDARY (they prevent useEffect triggers)
		const timeSinceLastStop = Date.now() - lastStopTimerTimestamp.current;
		if (timeSinceLastStop < STOP_TIMER_DEBOUNCE_MS) {
			console.warn(`[stopTimer] Debounced duplicate call (${timeSinceLastStop}ms since last stop)`);
			return Promise.resolve();
		}

		// Update timestamp BEFORE calling the API to prevent race conditions
		// This ensures that if another stopTimer() is called immediately after,
		// it will be caught by the debounce check above
		lastStopTimerTimestamp.current = Date.now();

		return stopTimerMutation.mutateAsync(timerStatusRef.current?.lastLog?.source || ETimeLogSource.TEAMS).then(async (res) => {
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);

			// Clear active task via API when timer stops
			if (activeTeamId && user) {
				const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

				if (currentMember?.id) {
					// Use mutation instead of direct service call for better error handling and cache management
					await updateOrganizationTeamEmployeeActiveTask(currentMember.id, {
						organizationId: activeTeam?.organizationId,
						activeTaskId: null,
						organizationTeamId: activeTeam?.id,
						tenantId: activeTeam?.tenantId ?? ''
					});
				}
			}

			// Invalidate timer query for current team
			if (activeTeamId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.timer.all
				});
			}

			// Invalidate team-related queries to update member stats in real-time
			// This ensures the "Working" |"Pause" | "Not Working" tab count updates immediately when timer stops
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
			if (activeTeamId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.detail(activeTeamId)
				});
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timerStatus, setTimerStatus, stopTimerMutation, taskId, updateLocalTimerStatus, queryClient, activeTeamId, timerStatusRef]);

	useEffect(() => {
		let syncTimerInterval: NodeJS.Timeout;
		if (timerStatus?.running && firstLoad) {
			syncTimerInterval = setInterval(() => {
				syncTimer();
			}, SYNC_TIMER_INTERVAL);
		}
		return () => {
			if (syncTimerInterval) clearInterval(syncTimerInterval);
		};
	}, [syncTimer, timerStatus, firstLoad]);

	// If active team changes then stop the timer and reinitialize
	useEffect(() => {
		if (lastActiveTeamId.current !== null && activeTeamId !== lastActiveTeamId.current && firstLoad) {
			// Stop timer if it's running from TEAMS source
			if (timerStatusRef.current?.running) {
				if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
					// Prevent duplicate stopTimer calls within 2 seconds
					// This avoids the 406 error when queries are invalidated and refetched
					const timeSinceLastStop = Date.now() - lastStopTimerTimestamp.current;
					if (timeSinceLastStop > STOP_TIMER_EFFECT_DEBOUNCE_MS) {
						stopTimer();
					}
				}
			}

			// Save active task for the previous team via API
			const previousTeamId = lastActiveTeamId.current;
			const previousTeam = lastActiveTeam.current;
			const previousTask = lastActiveTask.current;
			if (previousTeamId && previousTeam && previousTask && user) {
				// Find the current user's member record in the PREVIOUS team (not the new active team)
				const currentMember = previousTeam.members?.find((m) => m.employee?.userId === user.id);

				if (currentMember?.id && previousTask.id) {
					// Save active task via API (don't await to avoid blocking team switch)
					// Use mutation instead of direct service call for better error handling and cache management
					updateOrganizationTeamEmployeeActiveTask(currentMember.id, {
						organizationId: previousTeam.organizationId,
						activeTaskId: previousTask.id,
						organizationTeamId: previousTeam.id,
						tenantId: previousTeam.tenantId ?? ''
					}).catch((error) => {
						toast.error('Failed to save active task on team switch', {
							description: getErrorMessage(error, 'Unable to save active task')
						});
						logErrorInDev('Failed to save active task on team switch:', error);
					});
				}
			}

			// Reinitialize the timer state for the new team
			setTimerStatus(null);

			// Invalidate the React Query cache to force a refetch for the new team
			queryClient.invalidateQueries({
				queryKey: queryKeys.timer.all
			});

			// Invalidate organization teams to reload totalTodayTasks and totalWorkedTasks
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		}

		if (activeTeamId) {
			lastActiveTeamId.current = activeTeamId;
			lastActiveTeam.current = activeTeam;
		}
	}, [
		firstLoad,
		activeTeamId,
		activeTeam,
		stopTimer,
		timerStatusRef,
		setTimerStatus,
		queryClient,
		user,
		updateOrganizationTeamEmployeeActiveTask
	]);

	// Track active task changes separately to keep lastActiveTask.current in sync
	// This ensures that when switching teams, we save the correct active task for the previous team
	useEffect(() => {
		if (activeTeamTask) {
			lastActiveTask.current = activeTeamTask;
		}
	}, [activeTeamTask]);
	// If active task changes then stop the timer
	useEffect(() => {
		// FIX: Skip if we're manually updating the active task to prevent race conditions
		// When startTimerWithTask calls setActiveTask then startTimer, this useEffect would trigger
		// and call stopTimer, causing the timer to stop immediately after starting
		if (isUpdatingActiveTask) {
			return;
		}

		const taskId = activeTeamTask?.id;
		const canStop = lastActiveTaskId.current !== null && taskId !== lastActiveTaskId.current;

		if (canStop && timerStatusRef.current?.running && firstLoad) {
			// If timer is started at some other source keep the timer running...
			// If timer is started in the browser Stop the timer on Task Change
			if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
				// Prevent duplicate stopTimer calls within 2 seconds
				// This avoids the 406 error when switching tasks quickly via startTimerWithTask
				// which already calls stopTimer before changing the active task
				const timeSinceLastStop = Date.now() - lastStopTimerTimestamp.current;
				if (timeSinceLastStop > STOP_TIMER_EFFECT_DEBOUNCE_MS) {
					stopTimer();
				}
			}
		}

		if (taskId) {
			lastActiveTaskId.current = taskId;
		}
	}, [firstLoad, activeTeamTask?.id, stopTimer, timerStatusRef, isUpdatingActiveTask]);

	// Filter timerStatus to only show timer for current team's tasks
	const filteredTimerStatus = useMemo<ITimerStatus | null>(() => {
		if (!timerStatus) return null;

		// If timer is not running, return as is
		if (!timerStatus.running) return timerStatus;

		// If timer is running, check if the task belongs to current team
		const taskId = timerStatus.lastLog?.taskId;
		if (!taskId) return timerStatus;

		// Check if task exists in current team's tasks
		const taskBelongsToCurrentTeam = teamTasks.some((task) => task.id === taskId);

		// If task doesn't belong to current team, return timer as stopped
		if (!taskBelongsToCurrentTeam) {
			return {
				...timerStatus,
				running: false
			};
		}

		return timerStatus;
	}, [timerStatus, teamTasks]);

	return {
		timeCounter,
		fomatedTimeCounter: convertMsToTime(timeCounter),
		timerStatusFetching,
		getTimerStatus,
		loading,
		timerStatus: filteredTimerStatus,
		firstLoadTimerData,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		firstLoad,
		toggleTimer,
		timerSeconds,
		activeTeamTask,
		syncTimer,
		syncTimerLoading: syncTimerMutation.isPending
	};
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const seconds = useAtomValue(timerSecondsState);

	const timerStatus = useAtomValue(timerStatusState);
	const { hours: h, minutes: m } = secondsToTime((timerStatus?.duration || 0) + seconds);

	return {
		time: { h, m },
		seconds,
		timerStatus
	};
}

/**
 * It returns the timer's state and the function to start/stop the timer
 */
export function useTimerView() {
	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		timerSeconds,
		activeTeamTask,
		syncTimerLoading
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else {
			startTimer();
		}
	};

	return {
		hours,
		minutes,
		seconds,
		ms_p,
		activeTaskEstimation,
		timerHanlder,
		canRunTimer,
		timerStatusFetching,
		timerStatus,
		activeTeamTask,
		hasPlan,
		hasPlanForTomorrow,
		disabled: !canRunTimer,
		canTrack,
		isPlanVerified,
		startTimer,
		stopTimer,
		syncTimerLoading
	};
}

export function useSyncTimer() {
	const { syncTimer } = useTimer();
	const timerStatus = useAtomValue(timerStatusState);

	// Enable real-time polling of team data when timer is active
	// This ensures all team members see updated statuses (Working/Pause/Not Working) in real-time
	// Note: This hook is called only once in init-state.tsx, so we have a single polling instance
	useTimerPolling(timerStatus?.running ?? false);

	useRefreshIntervalV2(timerStatus?.running ? syncTimer : () => void 0, REFRESH_INTERVAL);
}
