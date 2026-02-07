'use client';

import { taskService } from '@/core/services/client/api';
import { activeTeamState, detailedTaskState, tasksByTeamState } from '@/core/stores';
import { useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSyncRef, useQueryCall } from '../../common';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for specific task queries (individual task fetching operations).
 *
 * This hook provides:
 * - Get task by ID
 * - Get tasks by employee ID
 * - Detailed task state
 * - Loading states
 *
 * @returns Object containing:
 * - `getTaskById` - Function to fetch a single task
 * - `getTasksByIdLoading` - Task fetch loading state
 * - `getTasksByEmployeeId` - Function to fetch tasks by employee
 * - `getTasksByEmployeeIdLoading` - Employee tasks loading state
 * - `detailedTask` - Currently detailed task data
 */
export function useTaskQueries() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const tasks = useAtomValue(tasksByTeamState);
	const tasksRef = useSyncRef(tasks);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);

	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
	const [selectedOrganizationTeamId, setSelectedOrganizationTeamId] = useState<string | undefined>(activeTeam?.id);

	// Query call for getting task by ID
	const { queryCall: getTaskByIdQuery, loading: getTasksByIdLoading } = useQueryCall(async (taskId: string) =>
		queryClient.fetchQuery({
			queryKey: queryKeys.tasks.detail(taskId),
			queryFn: async () => {
				if (!taskId) {
					throw new Error('Task ID is required');
				}
				return await taskService.getTaskById(taskId);
			}
		})
	);

	// Query for getting tasks by employee ID
	const getTasksByEmployeeIdQuery = useQuery({
		queryKey: queryKeys.tasks.byEmployee(selectedEmployeeId, selectedOrganizationTeamId),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			return await taskService.getTasksByEmployeeId({ employeeId: selectedEmployeeId! });
		},
		enabled: !!selectedEmployeeId && !!activeTeam?.id && !!selectedOrganizationTeamId,
		gcTime: 1000 * 60 * 60
	});

	const getTaskById = useCallback(
		async (taskId: string) => {
			// First check local tasks
			tasksRef.current.forEach((task) => {
				if (task.id === taskId) {
					setDetailedTask(task);
				}
			});

			try {
				const res = await getTaskByIdQuery(taskId);
				setDetailedTask(res || null);
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				return null;
			}
		},
		[getTaskByIdQuery, setDetailedTask, tasksRef]
	);

	const getTasksByEmployeeId = useCallback(
		async (employeeId: string, organizationTeamId: string) => {
			try {
				if (!employeeId || !organizationTeamId) {
					throw new Error('Required parameters missing : employeeId or organizationTeamId');
				}

				setSelectedEmployeeId(employeeId);
				setSelectedOrganizationTeamId(organizationTeamId);

				const res = await getTasksByEmployeeIdQuery.refetch();
				return res.data;
			} catch (error) {
				console.error('Error fetching tasks by employee ID:', error);
				return [];
			}
		},
		[getTasksByEmployeeIdQuery]
	);

	return {
		getTaskById,
		getTasksByIdLoading,
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading: getTasksByEmployeeIdQuery.isLoading,
		detailedTask,
		setDetailedTask
	};
}
