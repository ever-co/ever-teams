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
export function useTeamTasksQuery() {
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

	// React Query for team tasks
	const teamTasksQuery = useQuery({
		queryKey: queryKeys.tasks.byTeam(activeTeam?.id),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			const projectId = activeTeam?.projects && activeTeam?.projects.length > 0 ? activeTeam.projects[0].id : '';
			return await taskService.getTasks({ projectId });
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

	// Deep update function for React Query → Jotai sync
	const deepCheckAndUpdateTasks = useCallback(
		(responseTasks: TTask[], deepCheck?: boolean) => {
			if (responseTasks && responseTasks.length) {
				responseTasks.forEach((task) => {
					if (task.tags && task.tags?.length) {
						task.label = task.tags[0].name;
					}
				});
			}

			/**
			 * When deepCheck enabled,
			 * then update the tasks store only when active-team tasks have an update
			 */
			if (deepCheck) {
				const latestActiveTeamTasks = responseTasks
					.filter((task) => {
						return task.teams?.some((tm) => {
							return tm.id === activeTeamRef.current?.id;
						});
					})
					.sort((a, b) => a.title.localeCompare(b.title));

				const activeTeamTasks = tasksRef.current.slice().sort((a, b) => a.title.localeCompare(b.title));

				if (!isEqual(latestActiveTeamTasks, activeTeamTasks)) {
					setAllTasks(responseTasks);
				}
			} else {
				setAllTasks(responseTasks);
			}
		},
		[activeTeamRef, setAllTasks, tasksRef]
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
		[teamTasksQuery, deepCheckAndUpdateTasks, user, activeTeamRef]
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
			if (teamTasksQuery.data?.items) {
				deepCheckAndUpdateTasks(teamTasksQuery.data.items, true);
			}
		},
		[teamTasksQuery.data?.items],
		Boolean(tasks?.length)
	);

	// Sync active team task from member data
	useConditionalUpdateEffect(
		() => {
			// Validate: ensure the task belongs to the current active team
			const memberActiveTask = getValidActiveTask(tasks, memberActiveTaskId, activeTeam?.id);
			if (memberActiveTask) {
				setActiveTeamTask(memberActiveTask);
			} else if (memberActiveTaskId && activeTeam?.id) {
				// Task ID exists but doesn't belong to this team - clear it
				setActiveTeamTask(null);
			}
		},
		[activeTeam, tasks, memberActiveTaskId],
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
