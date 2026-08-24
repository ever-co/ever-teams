'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';

import { queryKeys } from '@/core/query/keys';
import {
	activeTaskStatisticsState,
	activeTeamTaskState,
	allTaskStatisticsState,
	localTimerStatusState,
	organizationTeamsState,
	tasksFetchingState,
	tasksStatisticsState,
	teamTasksState,
	timeCounterState,
	timerSecondsState,
	timerStatusFetchingState,
	timerStatusState
} from '@/core/stores';

export interface FastShellScope {
	tenantId?: string | null;
	organizationId?: string | null;
	teamId?: string | null;
	projectId?: string | null;
	userId?: string | null;
	employeeId?: string | null;
	taskId?: string | null;
}

function criticalKeys(scope: FastShellScope): QueryKey[] {
	return [
		queryKeys.organizationTeams.listByScope(scope.tenantId, scope.organizationId),
		queryKeys.organizationTeams.detailByScope(scope.tenantId, scope.organizationId, scope.teamId),
		queryKeys.tasks.byTeamByScope(scope.tenantId, scope.organizationId, scope.teamId, scope.projectId),
		queryKeys.dailyPlans.myPlansByScope(scope.tenantId, scope.organizationId, scope.teamId, scope.userId),
		queryKeys.timer.statusByScope(scope.tenantId, scope.organizationId, scope.teamId, scope.userId),
		queryKeys.tasks.statisticsByScope(
			scope.tenantId,
			scope.organizationId,
			scope.teamId,
			scope.taskId,
			scope.employeeId
		)
	];
}

/** Cancels the previous shell scope and clears only mirrors that cannot cross that boundary. */
export function useScopeTransitionGuard(scope: FastShellScope, enabled = true) {
	const queryClient = useQueryClient();
	const setTeams = useSetAtom(organizationTeamsState);
	const setTasks = useSetAtom(teamTasksState);
	const setActiveTask = useSetAtom(activeTeamTaskState);
	const setTimerStatus = useSetAtom(timerStatusState);
	const setLocalTimerStatus = useSetAtom(localTimerStatusState);
	const setTimeCounter = useSetAtom(timeCounterState);
	const setTimerSeconds = useSetAtom(timerSecondsState);
	const setTimerFetching = useSetAtom(timerStatusFetchingState);
	const setTasksFetching = useSetAtom(tasksFetchingState);
	const setTaskStatistics = useSetAtom(tasksStatisticsState);
	const setActiveTaskStatistics = useSetAtom(activeTaskStatisticsState);
	const setAllTaskStatistics = useSetAtom(allTaskStatisticsState);

	const fingerprint = JSON.stringify([
		scope.tenantId ?? null,
		scope.organizationId ?? null,
		scope.teamId ?? null,
		scope.projectId ?? null,
		scope.userId ?? null,
		scope.employeeId ?? null,
		scope.taskId ?? null
	]);
	const generationRef = useRef({ fingerprint, value: 0 });
	const previousRef = useRef<{ fingerprint: string; scope: FastShellScope } | null>(null);

	if (generationRef.current.fingerprint !== fingerprint) {
		generationRef.current = { fingerprint, value: generationRef.current.value + 1 };
	}
	const generation = generationRef.current.value;

	useEffect(() => {
		if (!enabled) return;
		const previous = previousRef.current;
		if (previous && previous.fingerprint !== fingerprint) {
			criticalKeys(previous.scope).forEach((queryKey) => {
				void queryClient.cancelQueries({ queryKey, exact: true });
			});

			const organizationChanged =
				previous.scope.tenantId !== scope.tenantId || previous.scope.organizationId !== scope.organizationId;
			const teamChanged = organizationChanged || previous.scope.teamId !== scope.teamId;
			const taskChanged = teamChanged || previous.scope.taskId !== scope.taskId;
			if (organizationChanged) setTeams([]);
			if (teamChanged) {
				setTasks([]);
				setActiveTask(null);
				setTimerStatus(null);
				setLocalTimerStatus(null);
				setTimeCounter(0);
				setTimerSeconds(0);
				setTimerFetching(false);
			}
			if (taskChanged) {
				setTasksFetching(false);
				setTaskStatistics({ all: [], today: [] });
				setActiveTaskStatistics({ total: null, today: null });
				setAllTaskStatistics([]);
			}
		}
		previousRef.current = { fingerprint, scope: { ...scope } };
	}, [
		enabled,
		fingerprint,
		queryClient,
		scope,
		setActiveTask,
		setActiveTaskStatistics,
		setAllTaskStatistics,
		setLocalTimerStatus,
		setTasks,
		setTasksFetching,
		setTaskStatistics,
		setTeams,
		setTimeCounter,
		setTimerSeconds,
		setTimerFetching,
		setTimerStatus
	]);

	const isCurrentGeneration = useCallback(
		() =>
			enabled && generationRef.current.fingerprint === fingerprint && generationRef.current.value === generation,
		[enabled, fingerprint, generation]
	);

	return { generation, isCurrentGeneration };
}
