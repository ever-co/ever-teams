'use client';

import { useAtom, useAtomValue } from 'jotai';
import isEqual from 'lodash/isEqual';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import {
    STOP_TIMER_DEBOUNCE_MS, STOP_TIMER_EFFECT_DEBOUNCE_MS, SYNC_TIMER_INTERVAL
} from '@/core/constants/config/constants';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers';
import {
    activeTeamIdState, activeTeamState, activeTeamTaskState, detailedTaskState, taskStatusesState,
    teamTasksState, timerStatusFetchingState, timerStatusState
} from '@/core/stores';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ILocalTimerStatus, ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthenticateUser } from '../auth';
import { useQueryCall } from '../common/use-query';
import { useSyncRef } from '../common/use-sync-ref';
import { useMyDailyPlans } from '../daily-plans/use-my-daily-plans';
import { useOrganizationEmployeeTeams, useTeamTasksState, useUpdateTask } from '../organizations';

// ==================== TYPES ====================

export interface UseTimerApiParams {
	/** Function to update local timer status (from useTimerStorage) */
	updateLocalTimerStatus: (status: ILocalTimerStatus) => void;
	/** Whether the initial data load has completed */
	firstLoad: boolean;
}

export interface UseTimerApiReturn {
	/** Filtered timer status (only shows timer for current team's tasks) */
	timerStatus: ITimerStatus | null;
	/** Whether the timer status is currently being fetched */
	timerStatusFetching: boolean;
	/** Whether the initial query is loading */
	loading: boolean;
	/** Fetch the latest timer status from the server */
	getTimerStatus: (deepCheck?: boolean) => Promise<any> | undefined;
	/** Start the timer (optionally with an explicit task) */
	startTimer: (explicitTask?: TTask) => Promise<any> | undefined;
	/** Stop the timer (with debounce protection) */
	stopTimer: () => Promise<any> | void;
	/** Toggle the timer for a specific task */
	toggleTimer: (taskId: string, updateStore?: boolean) => Promise<any>;
	/** Sync the timer with the server */
	syncTimer: () => Promise<any> | undefined;
	/** Whether the sync timer mutation is pending */
	syncTimerLoading: boolean;
	/** Today's daily plan (if any) */
	hasPlan: TDailyPlan | undefined;
	/** Tomorrow's daily plan (if any) */
	hasPlanForTomorrow: TDailyPlan | undefined;
	/** Whether the timer can run (email verified + valid task) */
	canRunTimer: boolean;
	/** Whether the user can track time (plan requirement check) */
	canTrack: boolean;
	/** Whether the plan is verified (has work time + estimated tasks) */
	isPlanVerified: boolean | undefined;
	/** The currently active team task */
	activeTeamTask: TTask | null;
}

// ==================== HOOK ====================

/**
 * Layer 1: Core Data & Mutations — "The Brain"
 *
 * Manages all server communication, business logic, and side effects
 * for the timer system.
 *
 * Responsibilities:
 * - React Query queries (getTimerStatus) and mutations (start/stop/toggle/sync)
 * - Business callbacks: startTimer, stopTimer, toggleTimer, syncTimer
 * - Debounce protection for stopTimer (prevents 406 duplicate errors)
 * - Side effects: team change → stop timer, task change → stop timer, sync interval
 * - Derived state: hasPlan, canTrack, canRunTimer, isPlanVerified, filteredTimerStatus
 * - Query invalidation after start/stop for real-time UI updates
 *
 * This hook does NOT manage:
 * - localStorage persistence (→ useTimerStorage)
 * - High-frequency ticking / animation (→ useTimerUi)
 */
export function useTimerApi({ updateLocalTimerStatus, firstLoad }: UseTimerApiParams): UseTimerApiReturn {
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const t = useTranslations();

	// ==================== ATOMS ====================

	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const taskStatuses = useAtomValue(taskStatusesState);
	const detailedTask = useAtomValue(detailedTaskState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const teamTasks = useAtomValue(teamTasksState);
	const [timerStatusFetching, setTimerStatusFetching] = useAtom(timerStatusFetchingState);
	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);

	// ==================== REFS ====================

	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTeamTask);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTeam = useRef<typeof activeTeam | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const lastActiveTask = useRef<TTask | null>(null);
	/** Track last stopTimer call to prevent duplicate calls within short time window */
	const lastStopTimerTimestamp = useRef<number>(0);

	// ==================== EXTERNAL HOOKS ====================

	const { updateTask } = useUpdateTask();
	const { setActiveTask, isUpdatingActiveTask } = useTeamTasksState();
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user, refreshUserData } = useAuthenticateUser();
	const { myDailyPlans } = useMyDailyPlans();

	// ==================== QUERIES & MUTATIONS ====================

	const { queryCall, loading, loadingRef } = useQueryCall(async () =>
		queryClient.fetchQuery({
			queryKey: queryKeys.timer.timer(activeTeamId),
			queryFn: () => timerService.getTimerStatus()
		})
	);

	const startTimerMutation = useMutation({
		mutationFn: timerService.startTimer
	});

	const toggleTimerMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await timerService.toggleTimer({ taskId });
		}
	});

	const stopTimerMutation = useMutation({
		mutationFn: async (source: ETimeLogSource) => {
			return await timerService.stopTimer({ source });
		}
	});

	const syncTimerMutation = useMutation({
		mutationFn: async (data: { source: ETimeLogSource; user?: TUser | null }) => {
			await timerService.syncTimer({ source: data.source, user: data.user });
		},
		onError: (error: any) => {
			if (error?.response?.status !== 401) {
				console.error('[Timer] Sync timer failed:', error);
			}
		},
		retry: (failureCount, error: any) => {
			if (error?.response?.status === 401) {
				return false;
			}
			return failureCount < 2;
		}
	});

	// ==================== DERIVED STATE ====================

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

	const requirePlan = activeTeam?.requirePlanToTrack;

	let canTrack = true;
	if (requirePlan) {
		if (!hasPlan) canTrack = false;
	}

	const isPlanVerified = requirePlan
		? hasPlan &&
			hasPlan?.workTimePlanned > 0 &&
			!!hasPlan?.tasks?.every((task) => task.estimate && task.estimate > 0)
		: true;

	const canRunTimer = !!(
		user?.isEmailVerified &&
		((!!activeTeamTask && activeTeamTask.status !== 'closed') ||
			timerStatusRef.current?.lastLog?.source !== ETimeLogSource.TEAMS)
	);

	// ==================== CALLBACKS ====================

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
		(taskIdParam: string, updateStore = true) => {
			return toggleTimerMutation.mutateAsync(taskIdParam).then((res) => {
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

	// ==================== START TIMER ====================

	const startTimer = useCallback(
		async (explicitTask?: TTask) => {
			// Check if the user is tracking time in another tab or device
			try {
				const userData = await refreshUserData();
				if (userData?.employee.isTrackingTime) {
					// Cross-check with timer status to detect desync
					// (employee.isTrackingTime stuck at true while timer is actually stopped)
					const timerRunning = timerStatusRef.current?.running;

					if (timerRunning) {
						// Timer is genuinely running — block as expected
						toast.info(t('timer.ALREADY_TRACKING_MESSAGE'));
						return;
					}

					// Desync detected: isTrackingTime=true but timer not running
					// Force a stop call to reset the employee flag on the server
					logErrorInDev(
						'startTimer',
						'Desync detected: employee.isTrackingTime=true but timer not running. Auto-healing...'
					);
					try {
						await timerService.stopTimer({
							source: timerStatusRef.current?.lastLog?.source || ETimeLogSource.TEAMS
						});
						// Refresh user data to confirm the flag was reset
						const refreshed = await refreshUserData();
						if (refreshed?.employee.isTrackingTime) {
							// Flag still stuck after stop — cannot auto-heal, block with toast
							toast.info(t('timer.ALREADY_TRACKING_MESSAGE'));
							return;
						}
						// Flag reset successfully — continue with start
					} catch (healError) {
						logErrorInDev('[startTimer] Auto-heal stop failed:', healError);
						// Still allow start attempt — the server start endpoint may handle it
					}
				}
			} catch (error) {
				toast.error('Failed to verify tracking status', {
					description: getErrorMessage(error, 'Unable to verify tracking status')
				});
				logErrorInDev('Failed to verify tracking status', error);
				return;
			}

			// NOTE_FIX: Use explicit task if provided to avoid race conditions with taskId.current
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
				// Skip if we're on /task/ page because setActiveTask already does it
				if (activeTeamId && taskIdToUse && user && !pathname?.startsWith('/task/')) {
					const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

					if (currentMember?.id) {
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
				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.all
				});

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
			// Updating the task status to "In Progress" when the timer is started
			if (taskToUse && taskToUse.status !== ETaskStatusName.IN_PROGRESS) {
				const selectedStatus = taskStatuses.find(
					(s) => s.name === ETaskStatusName.IN_PROGRESS && s.value === ETaskStatusName.IN_PROGRESS
				);
				const taskStatusId = selectedStatus?.id;
				updateTask({
					...taskToUse,
					taskStatusId: taskStatusId ?? taskToUse.taskStatusId,
					status: ETaskStatusName.IN_PROGRESS
				});
			}

			// Update Current user's active task to sync across multiple devices
			// Only execute this block on /task/ page to avoid redundancy
			if (taskToUse && pathname?.startsWith('/task/')) {
				const currentEmployeeDetails = activeTeam?.members?.find(
					(member) => member.employeeId === user?.employee?.id
				);
				if (currentEmployeeDetails && currentEmployeeDetails.id) {
					updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
						organizationId: taskToUse.organizationId,
						activeTaskId: taskToUse.id,
						organizationTeamId: activeTeam?.id,
						tenantId: activeTeam?.tenantId ?? ''
					}).catch((error) => {
						toast.error('[Timer] Failed to update active task (fire-and-forget)', {
							description: getErrorMessage(error, 'Unable to save active task')
						});
						logErrorInDev('[Timer] Failed to update active task (fire-and-forget):', error);
					});
				}
			}

			promise.finally(() => setTimerStatusFetching(false));

			return promise;
		},
		[
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
			activeTeam?.organizationId,
			activeTeam?.members,
			activeTeam?.id,
			activeTeam?.tenantId,
			user?.employee?.id,
			updateOrganizationTeamEmployeeActiveTask,
			t,
			refreshUserData,
			queryClient,
			activeTeamId
		]
	);

	// ==================== STOP TIMER ====================

	const stopTimer = useCallback(() => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false
		});

		// Use timerStatusRef instead of timerStatus to avoid closure issues
		if (!timerStatusRef.current?.running) {
			return Promise.resolve();
		}

		// Prevent duplicate stopTimer calls within 500ms
		// PRIMARY defense against race conditions causing 406 errors
		const timeSinceLastStop = Date.now() - lastStopTimerTimestamp.current;
		if (timeSinceLastStop < STOP_TIMER_DEBOUNCE_MS) {
			console.warn(`[stopTimer] Debounced duplicate call (${timeSinceLastStop}ms since last stop)`);
			return Promise.resolve();
		}

		// Update timestamp BEFORE calling the API to prevent race conditions
		lastStopTimerTimestamp.current = Date.now();

		// Sync the last few seconds of work before stopping
		// Placed after debounce check to avoid wasteful duplicate sync calls
		syncTimer();

		return stopTimerMutation
			.mutateAsync(timerStatusRef.current?.lastLog?.source || ETimeLogSource.TEAMS)
			.then(async (res) => {
				res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);

				// Clear active task via API when timer stops
				if (activeTeamId && user) {
					const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

					if (currentMember?.id) {
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
				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.all
				});
				if (activeTeamId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.organizationTeams.detail(activeTeamId)
					});
				}
			});
	}, [
		timerStatus,
		setTimerStatus,
		stopTimerMutation,
		taskId,
		updateLocalTimerStatus,
		queryClient,
		activeTeamId,
		timerStatusRef,
		user,
		activeTeam,
		updateOrganizationTeamEmployeeActiveTask,
		syncTimer
	]);

	// ==================== SIDE EFFECTS ====================

	// Loading states
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusFetching(loading);
		}
	}, [loading, firstLoad, setTimerStatusFetching]);

	useEffect(() => {
		setTimerStatusFetching(stopTimerMutation.isPending);
	}, [stopTimerMutation.isPending, setTimerStatusFetching]);

	// Sync timer interval (every 60s while running)
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
				const currentMember = previousTeam.members?.find((m) => m.employee?.userId === user.id);

				if (currentMember?.id && previousTask.id) {
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
	useEffect(() => {
		if (activeTeamTask) {
			lastActiveTask.current = activeTeamTask;
		}
	}, [activeTeamTask]);

	// If active task changes then stop the timer
	useEffect(() => {
		// FIX: Skip if we're manually updating the active task to prevent race conditions
		if (isUpdatingActiveTask) {
			return;
		}

		const currentTaskId = activeTeamTask?.id;
		const canStop = lastActiveTaskId.current !== null && currentTaskId !== lastActiveTaskId.current;

		if (canStop && timerStatusRef.current?.running && firstLoad) {
			// If timer is started at some other source keep the timer running...
			// If timer is started in the browser Stop the timer on Task Change
			if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
				const timeSinceLastStop = Date.now() - lastStopTimerTimestamp.current;
				if (timeSinceLastStop > STOP_TIMER_EFFECT_DEBOUNCE_MS) {
					stopTimer();
				}
			}
		}

		if (currentTaskId) {
			lastActiveTaskId.current = currentTaskId;
		}
	}, [firstLoad, activeTeamTask?.id, stopTimer, timerStatusRef, isUpdatingActiveTask]);

	// ==================== FILTERED TIMER STATUS ====================

	// Filter timerStatus to only show timer for current team's tasks
	const filteredTimerStatus = useMemo<ITimerStatus | null>(() => {
		if (!timerStatus) return null;

		// If timer is not running, return as is
		if (!timerStatus.running) return timerStatus;

		// If timer is running, check if the task belongs to current team
		const currentTaskId = timerStatus.lastLog?.taskId;
		if (!currentTaskId) return timerStatus;

		// Check if task exists in current team's tasks
		const taskBelongsToCurrentTeam = teamTasks.some((task) => task.id === currentTaskId);

		// If task doesn't belong to current team, return timer as stopped
		if (!taskBelongsToCurrentTeam) {
			return {
				...timerStatus,
				running: false
			};
		}

		return timerStatus;
	}, [timerStatus, teamTasks]);

	// ==================== RETURN ====================

	return {
		timerStatus: filteredTimerStatus,
		timerStatusFetching,
		loading,
		getTimerStatus,
		startTimer,
		stopTimer,
		toggleTimer,
		syncTimer,
		syncTimerLoading: syncTimerMutation.isPending,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		activeTeamTask
	};
}
