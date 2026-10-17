'use client';

import { useAtom, useAtomValue } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import {
	STOP_TIMER_DEBOUNCE_MS,
	STOP_TIMER_EFFECT_DEBOUNCE_MS,
	SYNC_TIMER_INTERVAL
} from '@/core/constants/config/constants';
import { findTimerPlans } from '@/core/lib/helpers/daily-plan-day';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { shouldRetryQuery } from '@/core/lib/helpers/retry-utils';
import { canRunTimerForState } from '@/core/lib/helpers/timer-policy';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerService } from '@/core/services/client/api/timers';
import {
	activeTeamIdState,
	activeTeamState,
	activeTeamTaskState,
	detailedTaskState,
	localTimerStatusState,
	teamTasksState,
	timerStatusFetchingState,
	timerStatusState
} from '@/core/stores';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ILocalTimerStatus, ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TUser } from '@/core/types/schemas/user/user.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthenticateUser } from '../auth/use-authenticate-user';
import { useQueryCall } from '../common/use-query';
import { useSyncRef } from '../common/use-sync-ref';
import { useMyDailyPlans } from '../daily-plans/use-my-daily-plans';
import { useOrganizationEmployeeTeams } from '../organizations/teams/use-organization-teams-employee';
import { useTeamTasksState } from '../organizations/teams/use-team-tasks-state';
import { useUpdateTask } from '../organizations/teams/use-update-task';
import { useTaskStatusesQuery } from '../tasks/use-task-statuses-query';
import type { ApiRequestScope } from '@/core/services/client/api-request-scope';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useStopStaleTeamsTimer } from './use-stale-timer-guard';

// ==================== TYPES ====================

export interface UseTimerApiParams {
	/** Function to update local timer status (from useTimerStorage) */
	updateLocalTimerStatus: (status: ILocalTimerStatus) => void;
	/** Whether the initial data load has completed */
	firstLoad: boolean;
	/** Controls the scoped status and plan observers. */
	enabled?: boolean;
	scope?: ApiRequestScope;
	statusEnabled?: boolean;
	statusRefetchInterval?: number | false;
	plansEnabled?: boolean;
	plansRefetchInterval?: number | false;
	manageRuntime?: boolean;
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
	/** Unfiltered status used only by the single runtime owner. */
	rawTimerRunning: boolean;
	/** Critical observer readiness. */
	statusResolved: boolean;
	plansResolved: boolean;
}

// ==================== SHARED REQUEST GUARDS ====================

// Module scope on purpose: every task card, the timer and the shell mount their own useTimerApi, and a ref
// only guards the instance that owns it. A guard is held until its timer request lands, not through the
// bookkeeping that follows (active task update, invalidations), so it never swallows a later start or stop.
let pendingStartTimer: Promise<void> | null = null;
let pendingStartTaskId: string | null = null;
let pendingStopTimer: Promise<void> | null = null;
/** Track last stopTimer call to prevent duplicate calls within short time window */
let lastStopTimerTimestamp = 0;
// Bumped when a start, stop or toggle is sent and again when it lands. A sync reads the status back after its
// time slot, so that read may predate such a command: it only updates the status when none happened meanwhile.
let timerCommandSeq = 0;

function trackTimerCommand<T>(request: Promise<T>): Promise<T> {
	timerCommandSeq += 1;
	return request.finally(() => {
		timerCommandSeq += 1;
	});
}

// Identity check: an older flow settling late must not clear the guard of a newer request
function releaseStartGuard(request: Promise<void>) {
	if (pendingStartTimer !== request) return;
	pendingStartTimer = null;
	pendingStartTaskId = null;
}

function releaseStopGuard(request: Promise<void>) {
	if (pendingStopTimer === request) pendingStopTimer = null;
}

/**
 * Tell the user about an automatic stop once its request has settled, so a
 * failed stop never reads as "timer stopped" while the server keeps tracking.
 */
function notifyAutomaticStop(stopRequest: Promise<unknown> | void, title: string, description: string) {
	Promise.resolve(stopRequest)
		.then(() => {
			toast.info(title, { description });
		})
		.catch((error) => {
			// The stop mutation already showed the translated TIMER_STOP_FAILED toast
			logErrorInDev('Automatic timer stop failed', error);
		});
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
export function useTimerApi({
	updateLocalTimerStatus,
	firstLoad,
	enabled = true,
	scope,
	statusEnabled = false,
	statusRefetchInterval = false,
	plansEnabled = true,
	plansRefetchInterval = false,
	manageRuntime = true
}: UseTimerApiParams): UseTimerApiReturn {
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const t = useTranslations();

	// ==================== ATOMS ====================

	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { taskStatuses } = useTaskStatusesQuery({ enabled });
	const detailedTask = useAtomValue(detailedTaskState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const teamTasks = useAtomValue(teamTasksState);
	const [timerStatusFetching, setTimerStatusFetching] = useAtom(timerStatusFetchingState);
	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);
	const localTimerStatus = useAtomValue(localTimerStatusState);

	// ==================== REFS ====================

	const timerStatusRef = useSyncRef(timerStatus);
	const localTimerStatusRef = useSyncRef(localTimerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTeamTask);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTeam = useRef<typeof activeTeam | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const lastActiveTask = useRef<TTask | null>(null);

	// ==================== EXTERNAL HOOKS ====================

	const { updateTask } = useUpdateTask();
	const { setActiveTask, isUpdatingActiveTask } = useTeamTasksState();
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user, refreshUserData } = useAuthenticateUser();
	const stopStaleTeamsTimer = useStopStaleTeamsTimer();
	const { myDailyPlans, isSuccess: plansResolved } = useMyDailyPlans({
		enabled: enabled && plansEnabled,
		...(statusEnabled && scope ? { scope, refetchInterval: plansRefetchInterval } : {})
	});

	// ==================== QUERIES & MUTATIONS ====================

	const statusKey = statusEnabled
		? queryKeys.timer.statusByScope(scope?.tenantId, scope?.organizationId, scope?.teamId, scope?.userId)
		: queryKeys.timer.timer(activeTeamId);
	const isCurrentScope = useScopeGuard(statusKey, statusEnabled && enabled);
	const scopedStatusReady = !!(
		scope?.tenantId &&
		scope.organizationId &&
		scope.teamId &&
		scope.userId &&
		scope.accessToken
	);
	const scopedStatusQuery = useQuery({
		queryKey: statusKey,
		queryFn: ({ signal }) => timerService.getTimerStatus({ scope: scope!, signal }),
		enabled: statusEnabled && enabled && scopedStatusReady,
		refetchInterval: statusEnabled ? statusRefetchInterval : false,
		refetchIntervalInBackground: false,
		// Opts back in to the reconnect refetch the app default turns off: after any outage the timer resyncs
		// (it may have been stopped or started elsewhere meanwhile), also in a background tab or without auto refresh
		refetchOnReconnect: 'always'
	});
	const {
		queryCall,
		loading: fallbackLoading,
		loadingRef
	} = useQueryCall(async () =>
		queryClient.fetchQuery({
			queryKey: queryKeys.timer.timer(activeTeamId),
			queryFn: () => timerService.getTimerStatus()
		})
	);
	const loading = statusEnabled ? scopedStatusQuery.isLoading : fallbackLoading;

	useEffect(() => {
		const nextStatus = scopedStatusQuery.data?.data;
		if (statusEnabled && nextStatus && isCurrentScope() && !isEqual(timerStatusRef.current, nextStatus)) {
			setTimerStatus(nextStatus);
		}
	}, [isCurrentScope, scopedStatusQuery.data, setTimerStatus, statusEnabled, timerStatusRef]);

	const startTimerMutation = useMutation({
		mutationFn: async ({ taskId }: { taskId: string }) => {
			return await timerService.startTimer({ taskId });
		},
		// runStartTimer shows the translated TIMER_START_FAILED toast; this keeps the raw global
		// "Mutation Error" toast from showing a second one
		onError: () => undefined
	});

	const toggleTimerMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await timerService.toggleTimer({ taskId });
		}
	});

	const stopTimerMutation = useMutation({
		mutationFn: async (source: ETimeLogSource) => {
			try {
				return await timerService.stopTimer({ source });
			} catch (error) {
				// 406 means Gauzy has no running timer left: a previous attempt whose response was lost,
				// or another device, already stopped it. Report the real status instead of a failure.
				if (ApiErrorService.isApiError(error) && error.hasHttpResponseStatus(406)) {
					return { ...(await timerService.getTimerStatus()), alreadyStopped: true };
				}
				// The proxy route turns Gauzy's 406 into a 500: the stop only failed if the timer still runs.
				const status = await timerService.getTimerStatus().catch(() => null);
				if (status?.data?.running === false) return { ...status, alreadyStopped: true };
				throw error;
			}
		},
		// The stop is not idempotent: only a network error or a 5xx gets one retry, never a timeout or a 4xx
		retry: shouldRetryQuery,
		// Replaces the generic global mutation toast, which showed the raw error message
		onError: () => {
			toast.error(t('timer.TIMER_STOP_FAILED'));
		}
	});

	const syncTimerMutation = useMutation({
		mutationFn: async (data: { source: ETimeLogSource; user?: TUser | null; timeLogId?: string }) => {
			return await timerService.syncTimer({ source: data.source, user: data.user, timeLogId: data.timeLogId });
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

	const { hasPlan, hasPlanForTomorrow } = useMemo(() => findTimerPlans(myDailyPlans?.items), [myDailyPlans?.items]);

	const requirePlan = activeTeam?.requirePlanToTrack;

	const canTrack = useMemo(() => {
		if (requirePlan && !hasPlan) return false;
		return true;
	}, [requirePlan, hasPlan]);

	const isPlanVerified = useMemo(
		() =>
			requirePlan
				? hasPlan &&
					hasPlan?.workTimePlanned > 0 &&
					!!hasPlan?.tasks?.every((task) => task.estimate && task.estimate > 0)
				: true,
		[requirePlan, hasPlan]
	);

	const canRunTimer = useMemo(
		() =>
			canRunTimerForState({
				isEmailVerified: !!user?.isEmailVerified,
				hasActiveTask: !!activeTeamTask,
				isActiveTaskClosed: activeTeamTask?.status === ETaskStatusName.CLOSED,
				isTimerRunning: !!timerStatus?.running,
				timerSource: timerStatus?.lastLog?.source
			}),
		[user?.isEmailVerified, activeTeamTask, timerStatus?.running, timerStatus?.lastLog?.source]
	);

	// ==================== CALLBACKS ====================

	const getTimerStatus = useCallback(
		(deepCheck?: boolean) => {
			if ((statusEnabled ? scopedStatusQuery.isFetching : loadingRef.current) || !user?.tenantId) {
				return;
			}
			const request = statusEnabled ? scopedStatusQuery.refetch().then((result) => result.data) : queryCall();
			return request.then((res) => {
				if (res?.data && (!statusEnabled || isCurrentScope()) && !isEqual(timerStatus, res.data)) {
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
		[
			isCurrentScope,
			loadingRef,
			queryCall,
			scopedStatusQuery,
			setTimerStatus,
			statusEnabled,
			timerStatus,
			user?.tenantId
		]
	);

	// Depend on the STABLE mutateAsync functions, never on the mutation result objects: those objects are
	// recreated on every state change (idle → pending → success), which made every callback below new on
	// each transition and re-ran the effects that depend on them (stopTimer → team/task-change effects).
	const toggleTimerMutate = toggleTimerMutation.mutateAsync;
	const toggleTimer = useCallback(
		(taskIdParam: string, updateStore = true) => {
			return trackTimerCommand(toggleTimerMutate(taskIdParam)).then((res) => {
				if (
					updateStore &&
					(!statusEnabled || isCurrentScope()) &&
					res.data &&
					!isEqual(timerStatus, res.data)
				) {
					setTimerStatus(res.data);
				}
				return res;
			});
		},
		[isCurrentScope, statusEnabled, timerStatus, toggleTimerMutate, setTimerStatus]
	);

	const syncTimerMutate = syncTimerMutation.mutateAsync;
	const syncTimerPending = syncTimerMutation.isPending;
	const syncTimer = useCallback(() => {
		if (syncTimerPending) {
			return;
		}
		const commandSeq = timerCommandSeq;
		return syncTimerMutate({
			source: timerStatus?.lastLog?.source || ETimeLogSource.TEAMS,
			user: $user.current,
			timeLogId: timerStatus?.lastLog?.id
		}).then((res) => {
			// A hidden tab, or one without auto refresh, never refetches the status: this is how its heartbeat
			// learns that the timer was stopped elsewhere. The proxy route answers null when its status read fails.
			const status = res?.data;
			if (
				typeof status?.running === 'boolean' &&
				commandSeq === timerCommandSeq &&
				(!statusEnabled || isCurrentScope()) &&
				!isEqual(timerStatusRef.current, status)
			) {
				setTimerStatus(status);
			}
			return res;
		});
	}, [isCurrentScope, setTimerStatus, statusEnabled, syncTimerMutate, syncTimerPending, timerStatus, timerStatusRef]);

	// ==================== START TIMER ====================

	const startTimerMutate = startTimerMutation.mutateAsync;
	const runStartTimer = useCallback(
		async (explicitTask?: TTask, onRequestLanded?: () => void) => {
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
						// A TEAMS timer left behind by a closed tab is credited up to its last heartbeat, not now
						const stoppedStale = await stopStaleTeamsTimer(userData.employee.id);
						if (!stoppedStale) {
							await timerService.stopTimer({
								source: timerStatusRef.current?.lastLog?.source || ETimeLogSource.TEAMS
							});
						}
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

			// NOTE_FIX: Use explicit task if provided to avoid race conditions with taskId.current.
			// On a task page that page's task becomes the active one, so it is also the one to start.
			const pageTask = pathname?.startsWith('/task/') ? detailedTask : null;
			const taskToUse = explicitTask || pageTask || activeTeamTaskRef.current;
			const taskIdToUse = taskToUse?.id;

			if (pageTask) setActiveTask(pageTask);

			if (!taskIdToUse) {
				toast.error(t('timer.START_TIMER'));
				return;
			}

			updateLocalTimerStatus({
				lastTaskId: taskIdToUse,
				runnedDateTime: Date.now(),
				running: true
			});

			if (!statusEnabled || isCurrentScope()) setTimerStatusFetching(true);
			const promise = trackTimerCommand(startTimerMutate({ taskId: taskIdToUse })).then(async (res) => {
				res.data &&
					(!statusEnabled || isCurrentScope()) &&
					!isEqual(timerStatus, res.data) &&
					setTimerStatus(res.data);
				onRequestLanded?.();

				// Save active task via API when timer starts
				// Skip if we're on /task/ page because setActiveTask already does it
				// Wrapped in its own try/catch so a failure here doesn't propagate
				// to the outer .catch() that resets the timer state
				if (activeTeamId && taskIdToUse && user && !pathname?.startsWith('/task/')) {
					try {
						const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

						if (currentMember?.id) {
							await updateOrganizationTeamEmployeeActiveTask(currentMember.id, {
								organizationId: activeTeam?.organizationId,
								activeTaskId: taskIdToUse,
								organizationTeamId: activeTeam?.id,
								tenantId: activeTeam?.tenantId ?? ''
							});
						}
					} catch (error) {
						toast.error('[Timer] Failed to update active task', {
							description: getErrorMessage(error, 'Unable to save active task')
						});
						logErrorInDev('[Timer] Failed to update active task:', error);
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
			});

			promise
				.catch((error) => {
					// Roll back the optimistic start, also when no active task was set (explicit or page task)
					updateLocalTimerStatus({
						lastTaskId: taskIdToUse ?? taskId.current ?? null,
						runnedDateTime: 0,
						running: false
					});
					toast.error(t('timer.TIMER_START_FAILED'));
					logErrorInDev('startTimer', error);
				})
				.finally(() => {
					if (!statusEnabled || isCurrentScope()) setTimerStatusFetching(false);
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

			return promise;
		},
		[
			pathname,
			setActiveTask,
			detailedTask,
			taskId,
			updateLocalTimerStatus,
			setTimerStatusFetching,
			startTimerMutate,
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
			stopStaleTeamsTimer,
			queryClient,
			activeTeamId,
			isCurrentScope,
			statusEnabled
		]
	);

	// Set before refreshUserData so its round trip is covered too: a call made while a start is running waits
	// for that start instead of sending a second POST /timer/start.
	const startTimer = useCallback(
		(explicitTask?: TTask) => {
			if (pendingStartTimer) {
				// No task named, or the same one: the start in flight is the one asked for
				if (!explicitTask || explicitTask.id === pendingStartTaskId) return pendingStartTimer;
				// Another task: fail, so the caller does not report the first task's start as its own
				toast.error(t('timer.TIMER_START_FAILED'));
				return Promise.reject(new Error('A timer start for another task is already in progress'));
			}

			const request: Promise<void> = runStartTimer(explicitTask, () => releaseStartGuard(request)).finally(() =>
				releaseStartGuard(request)
			);
			pendingStartTimer = request;
			// The task runStartTimer will start: explicit, else the page's task on /task/*, else the active one
			pendingStartTaskId =
				explicitTask?.id ??
				(pathname?.startsWith('/task/') ? detailedTask?.id : undefined) ??
				activeTeamTaskRef.current?.id ??
				null;
			return request;
		},
		[runStartTimer, activeTeamTaskRef, pathname, detailedTask, t]
	);

	// ==================== STOP TIMER ====================

	const stopTimerMutate = stopTimerMutation.mutateAsync;
	const stopTimer = useCallback(() => {
		const previousLocalTimerStatus = localTimerStatusRef.current;
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false
		});

		// Use timerStatusRef instead of timerStatus to avoid closure issues
		if (!timerStatusRef.current?.running) {
			return Promise.resolve();
		}

		// The status stays "running" until the stop response lands, so a second stop sent meanwhile gets a 406
		if (pendingStopTimer) {
			return pendingStopTimer;
		}

		// Prevent duplicate stopTimer calls within 500ms
		// PRIMARY defense against race conditions causing 406 errors
		const timeSinceLastStop = Date.now() - lastStopTimerTimestamp;
		if (timeSinceLastStop < STOP_TIMER_DEBOUNCE_MS) {
			console.warn(`[stopTimer] Debounced duplicate call (${timeSinceLastStop}ms since last stop)`);
			return Promise.resolve();
		}

		// Update timestamp BEFORE calling the API to prevent race conditions
		lastStopTimerTimestamp = Date.now();

		// Sync the last few seconds of work before stopping
		// Placed after debounce check to avoid wasteful duplicate sync calls
		syncTimer();

		if (!statusEnabled || isCurrentScope()) setTimerStatusFetching(true);
		// Tracked after the sync above, so that sync's status read can never put a running timer back
		const request: Promise<void> = trackTimerCommand(
			stopTimerMutate(timerStatusRef.current?.lastLog?.source || ETimeLogSource.TEAMS)
		)
			.catch((error) => {
				// The last known server status still says running: undo the optimistic stop so the clock agrees
				// with it, and refetch the status in case the stop landed after all. Only a running snapshot is put
				// back: a stop sent while another one was pending captured that one's optimistic running:false.
				if (
					previousLocalTimerStatus?.running &&
					timerStatusRef.current?.running &&
					(!statusEnabled || isCurrentScope())
				) {
					updateLocalTimerStatus(previousLocalTimerStatus);
				}
				queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
				throw error;
			})
			.then(async (res) => {
				res.data &&
					(!statusEnabled || isCurrentScope()) &&
					!isEqual(timerStatus, res.data) &&
					setTimerStatus(res.data);
				releaseStopGuard(request);

				// Clear active task via API when timer stops. Skipped when the timer was already stopped: a team
				// switch can send two stops, and the one answered 406 may already carry the new team.
				if (activeTeamId && user && !('alreadyStopped' in res)) {
					const currentMember = activeTeam?.members?.find((m) => m.employee?.userId === user.id);

					if (currentMember?.id) {
						// The timer is stopped by now: failing to clear the active task must not make the stop
						// look failed to its callers (a task card would then refuse to start the next task)
						try {
							await updateOrganizationTeamEmployeeActiveTask(currentMember.id, {
								organizationId: activeTeam?.organizationId,
								activeTaskId: null,
								organizationTeamId: activeTeam?.id,
								tenantId: activeTeam?.tenantId ?? ''
							});
						} catch (error) {
							logErrorInDev('[Timer] Failed to clear the active task after stop:', error);
						}
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
			})
			.finally(() => {
				if (!statusEnabled || isCurrentScope()) setTimerStatusFetching(false);
				releaseStopGuard(request);
			});
		// onError already told the user. Most callers fire and forget the stop, so the rejection must not go
		// unhandled; callers that await it (stop then start) still receive it.
		request.catch(() => undefined);
		pendingStopTimer = request;
		return request;
	}, [
		timerStatus,
		setTimerStatus,
		stopTimerMutate,
		taskId,
		updateLocalTimerStatus,
		queryClient,
		activeTeamId,
		timerStatusRef,
		localTimerStatusRef,
		user,
		activeTeam,
		updateOrganizationTeamEmployeeActiveTask,
		syncTimer,
		isCurrentScope,
		statusEnabled,
		setTimerStatusFetching
	]);

	// ==================== SIDE EFFECTS ====================

	// Loading states
	useEffect(() => {
		if (firstLoad && statusEnabled && isCurrentScope()) {
			setTimerStatusFetching(loading);
		}
	}, [loading, firstLoad, isCurrentScope, setTimerStatusFetching, statusEnabled]);

	// Sync timer interval (every 60s while running)
	useEffect(() => {
		let syncTimerInterval: NodeJS.Timeout;
		if (manageRuntime && timerStatus?.running && firstLoad) {
			syncTimerInterval = setInterval(() => {
				syncTimer();
			}, SYNC_TIMER_INTERVAL);
		}
		return () => {
			if (syncTimerInterval) clearInterval(syncTimerInterval);
		};
	}, [syncTimer, timerStatus, firstLoad, manageRuntime]);

	// If active team changes then stop the timer and reinitialize
	useEffect(() => {
		if (lastActiveTeamId.current !== null && activeTeamId !== lastActiveTeamId.current && firstLoad) {
			// Stop timer if it's running from TEAMS source
			if (timerStatusRef.current?.running) {
				if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
					const timeSinceLastStop = Date.now() - lastStopTimerTimestamp;
					if (timeSinceLastStop > STOP_TIMER_EFFECT_DEBOUNCE_MS) {
						notifyAutomaticStop(
							stopTimer(),
							t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_TITLE'),
							t('timer.TEAM_SWITCH.STOPPED_TIMER_TOAST_DESCRIPTION')
						);
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
		updateOrganizationTeamEmployeeActiveTask,
		t
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
				const timeSinceLastStop = Date.now() - lastStopTimerTimestamp;
				if (timeSinceLastStop > STOP_TIMER_EFFECT_DEBOUNCE_MS) {
					notifyAutomaticStop(
						stopTimer(),
						t('timer.TASK_SWITCH.STOPPED_TIMER_TOAST_TITLE'),
						t('timer.TASK_SWITCH.STOPPED_TIMER_TOAST_DESCRIPTION')
					);
				}
			}
		}

		if (currentTaskId) {
			lastActiveTaskId.current = currentTaskId;
		}
	}, [firstLoad, activeTeamTask?.id, stopTimer, timerStatusRef, isUpdatingActiveTask, t]);

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
		activeTeamTask,
		rawTimerRunning: timerStatus?.running === true,
		statusResolved: statusEnabled ? scopedStatusQuery.isSuccess && isCurrentScope() : firstLoad,
		plansResolved
	};
}
