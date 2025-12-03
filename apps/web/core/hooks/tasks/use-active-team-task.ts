'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { activeTeamState, activeTeamTaskState, getPublicState, tasksByTeamState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { taskService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * Result interface for the useActiveTeamTask hook
 */
export interface UseActiveTeamTaskResult {
	/** The current active task (from various sources with priority) */
	activeTask: TTask | null;
	/** Whether the task is being fetched from API */
	isLoading: boolean;
	/** Whether there's an error fetching the task */
	isError: boolean;
	/** The error object if any */
	error: Error | null;
}

/**
 * Hook to get the current user's active task with proper fallback logic.
 *
 * Priority order:
 * 1. activeTeamTaskState (Jotai atom) - Instant updates when user selects a task
 * 2. currentUser.activeTaskId - From API via team member data
 * 3. currentUser.lastWorkedTask - Last task the user worked on
 * 4. Find in local tasks list - Search for task in cached tasks
 * 5. API fetch - Last resort, fetch from server if task ID exists but not in cache
 *
 * @returns The active task with loading/error states
 */
export const useActiveTeamTask = (): UseActiveTeamTaskResult => {
	// Jotai state - instant updates
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const setActiveTeamTask = useSetAtom(activeTeamTaskState);
	const activeTeam = useAtomValue(activeTeamState);
	const tasks = useAtomValue(tasksByTeamState);
	const publicTeam = useAtomValue(getPublicState);

	// User data
	const { data: authUser, isLoading: userLoading } = useUserQuery();
	const currentUser = useMemo(
		() => activeTeam?.members?.find((m) => m?.employee?.userId === authUser?.id),
		[activeTeam?.members, authUser?.id]
	);

	// Determine the task ID to use (following priority order)
	const taskIdToFetch = useMemo(() => {
		// Priority 1: If we already have activeTeamTask, no need to fetch
		if (activeTeamTask?.id) {
			return null;
		}

		// Priority 2: activeTaskId from member data (set when timer starts/stops)
		if (currentUser?.activeTaskId) {
			return currentUser.activeTaskId;
		}

		// Priority 3: lastWorkedTask from member data
		if (currentUser?.lastWorkedTask?.id) {
			return currentUser.lastWorkedTask.id;
		}

		return null;
	}, [activeTeamTask?.id, currentUser?.activeTaskId, currentUser?.lastWorkedTask?.id]);

	// Try to find the task in local cache first
	const taskFromCache = useMemo(() => {
		if (!taskIdToFetch) return null;

		// Search in local tasks list
		const foundTask = tasks.find((t) => t.id === taskIdToFetch);
		if (foundTask) {
			// Verify the current user is a member of this task (unless public team)
			if (publicTeam) return foundTask;
			const isMember = foundTask.members?.some((m) => m.userId === currentUser?.employee?.userId);
			if (isMember) return foundTask;
		}

		return null;
	}, [taskIdToFetch, tasks, publicTeam, currentUser?.employee?.userId]);

	// Determine if we need to fetch from API
	// Only fetch if we have a task ID but couldn't find it in cache
	const shouldFetchFromApi = !!(taskIdToFetch && !taskFromCache && !activeTeamTask);

	// API query - last resort fallback
	const taskQuery = useQuery({
		queryKey: queryKeys.tasks.detail(taskIdToFetch),
		queryFn: async () => {
			if (!taskIdToFetch) {
				throw new Error('Task ID is required');
			}
			return await taskService.getTaskById(taskIdToFetch);
		},
		enabled: shouldFetchFromApi,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes cache
		refetchOnWindowFocus: false
	});

	// Sync fetched task to Jotai state for instant updates across components
	const fetchedTask = taskQuery.data;
	useEffect(() => {
		if (fetchedTask && !activeTeamTask) {
			// Verify the current user is a member of this task before setting
			const isMember = fetchedTask.members?.some((m) => m.userId === currentUser?.employee?.userId);
			if (isMember || publicTeam) {
				setActiveTeamTask(fetchedTask);
			}
		}
	}, [fetchedTask, activeTeamTask, currentUser?.employee?.userId, publicTeam, setActiveTeamTask]);

	// Compute the final active task with priority
	const activeTask = useMemo((): TTask | null => {
		// Priority 1: Jotai atom (instant updates)
		if (activeTeamTask) {
			return activeTeamTask;
		}

		// Priority 2-4: Task from local cache
		if (taskFromCache) {
			return taskFromCache;
		}

		// Priority 5: Task from API (if available)
		if (fetchedTask) {
			const isMember = fetchedTask.members?.some((m) => m.userId === currentUser?.employee?.userId);
			if (isMember || publicTeam) {
				return fetchedTask;
			}
		}

		// Public team fallback: find any task for display
		if (publicTeam && tasks.length > 0) {
			return tasks[0];
		}

		return null;
	}, [activeTeamTask, taskFromCache, fetchedTask, currentUser?.employee?.userId, publicTeam, tasks]);

	// Compute loading state
	const isLoading = userLoading || (shouldFetchFromApi && taskQuery.isPending);

	return {
		activeTask,
		isLoading,
		isError: taskQuery.isError,
		error: taskQuery.error
	};
};
