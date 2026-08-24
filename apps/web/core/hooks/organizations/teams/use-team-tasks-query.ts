'use client';

import { getValidActiveTask } from '@/core/lib/utils/task.utils';
import { taskService } from '@/core/services/client/api';
import {
	activeTeamState,
	activeTeamTaskState,
	detailedTaskState,
	memberActiveTaskIdState,
	tasksByTeamState,
	teamTasksState
} from '@/core/stores';
import isEqual from 'lodash/isEqual';
import { useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad, useConditionalUpdateEffect, useSyncRef } from '../../common';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';
import type { ApiRequestScope } from '@/core/services/client/api-request-scope';
import { useFastScopeGuard } from '../../bootstrap/use-fast-scope-guard';

export interface UseTeamTasksQueryOptions {
	enabled?: boolean;
	scope?: ApiRequestScope;
	refetchInterval?: number | false;
}

/**
 * Hook for reading team tasks data (GET operations only).
 *
 * This hook provides:
 * - Team tasks list from Jotai state
 * - Loading and fetching states
 * - Active team task management
 * - First load data initialization
 * - React Query ↔ Jotai synchronization
 *
 * @returns Object containing:
 * - `tasks` - Array of team tasks
 * - `loading` - Initial loading state
 * - `tasksFetching` - Refetch loading state
 * - `activeTeamTask` - Currently active task
 * - `activeTeam` - Active team object
 * - `activeTeamId` - Active team ID
 * - `detailedTask` - Detailed task data
 * - `loadTeamTasksData` - Function to reload tasks
 * - `firstLoadTasksData` - First load utility
 * - `setAllTasks` - Setter for all tasks (state management)
 */
export function useTeamTasksQuery(options: UseTeamTasksQueryOptions = {}) {
	const { user } = useAuthenticateUser();
	const queryClient = useQueryClient();

	// Jotai state
	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useAtomValue(tasksByTeamState);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);
	const tasksRef = useSyncRef(tasks);
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);

	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();
	const { enabled = true, scope, refetchInterval = false } = options;
	const scoped = scope !== undefined;
	const projectId = activeTeam?.projects?.[0]?.id ?? null;
	const queryKey = scoped
		? queryKeys.tasks.byTeamByScope(scope.tenantId, scope.organizationId, scope.teamId, projectId)
		: queryKeys.tasks.byTeam(activeTeam?.id);
	const isCurrentScope = useFastScopeGuard(queryKey, scoped && enabled);
	const scopedReady = !!(scope?.tenantId && scope.organizationId && scope.teamId && scope.accessToken);

	// React Query for team tasks
	const teamTasksQuery = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			const activeProjectId = projectId ?? '';
			return await taskService.getTasks({
				projectId: activeProjectId,
				...(scoped ? { options: { scope: scope!, signal } } : {})
			});
		},
		enabled: scoped ? enabled && scopedReady && !!activeTeam?.id : enabled && !!activeTeam?.id,
		gcTime: 1000 * 60 * 60,
		refetchInterval: scoped ? refetchInterval : false,
		refetchIntervalInBackground: false
	});

	// Deep update function for React Query → Jotai sync
	const deepCheckAndUpdateTasks = useCallback(
		(responseTasks: TTask[], deepCheck?: boolean) => {
			if (scoped && !isCurrentScope()) return;
			// Map to new objects if modification is needed to avoid mutating cache
			const processedTasks =
				responseTasks?.map((task) => {
					if (task.tags && task.tags?.length) {
						const _task = { ...task };
						_task.label = task.tags[0].name;
						return _task;
					}
					return task;
				}) || [];

			/**
			 * When deepCheck enabled,
			 * then update the tasks store only when active-team tasks have an update
			 */
			if (deepCheck) {
				const latestActiveTeamTasks = processedTasks
					.filter((task) => {
						return task.teams?.some((tm) => {
							return tm.id === activeTeamRef.current?.id;
						});
					})
					.sort((a, b) => a.title.localeCompare(b.title));

				const activeTeamTasks = tasksRef.current.slice().sort((a, b) => a.title.localeCompare(b.title));

				if (!isEqual(latestActiveTeamTasks, activeTeamTasks)) {
					setAllTasks(processedTasks);
				}
			} else {
				setAllTasks(processedTasks);
			}
		},
		[activeTeamRef, isCurrentScope, scoped, setAllTasks, tasksRef]
	);

	const loadTeamTasksData = useCallback(
		async (deepCheck?: boolean) => {
			if (teamTasksQuery.isLoading || !user || !activeTeamRef.current?.id) {
				return Promise.resolve(true);
			}

			try {
				const res = await teamTasksQuery.refetch();
				if (res.data?.items) {
					deepCheckAndUpdateTasks(res.data.items, deepCheck);
				}
				return res;
			} catch (error) {
				console.error('Error loading team tasks data:', error);
				return null;
			}
		},
		[teamTasksQuery.isLoading, teamTasksQuery.refetch, deepCheckAndUpdateTasks, user, activeTeamRef]
	);

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();

	// Reload tasks after active team changed
	useConditionalUpdateEffect(
		() => {
			if (activeTeam?.id && firstLoad) {
				loadTeamTasksData();
			}
		},
		[activeTeam?.id, firstLoad],
		true
	);

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (teamTasksQuery.data?.items && (!scoped || isCurrentScope())) {
				deepCheckAndUpdateTasks(teamTasksQuery.data.items, true);
			}
		},
		[teamTasksQuery.data?.items, scoped, isCurrentScope],
		Boolean(tasks?.length)
	);

	// Sync active team task from member data
	useConditionalUpdateEffect(
		() => {
			// Validate: ensure the task belongs to the current active team
			const memberActiveTask = getValidActiveTask(tasks, memberActiveTaskId, activeTeam?.id);
			if (scoped && !isCurrentScope()) return;
			if (memberActiveTask) {
				setActiveTeamTask(memberActiveTask);
			} else if (memberActiveTaskId && activeTeam?.id) {
				// Task ID exists but doesn't belong to this team - clear it
				setActiveTeamTask(null);
			}
		},
		[activeTeam, tasks, memberActiveTaskId, scoped, isCurrentScope],
		true
	);

	return {
		// Data
		tasks,
		activeTeamTask,
		activeTeam,
		activeTeamId: activeTeam?.id,
		detailedTask,

		// Loading states
		loading: teamTasksQuery.isLoading,
		tasksFetching: teamTasksQuery.isFetching,
		querySuccess: teamTasksQuery.isSuccess && (!scoped || isCurrentScope()),

		// Functions
		loadTeamTasksData,
		firstLoadTasksData,
		setAllTasks,
		setDetailedTask,
		invalidateTeamTasksData,

		// Internal (for other hooks)
		deepCheckAndUpdateTasks,
		tasksRef,
		activeTeamRef,
		queryClient
	};
}
