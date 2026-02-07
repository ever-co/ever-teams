'use client';

import { taskService } from '@/core/services/client/api';
import { taskStatusesState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

import { TEmployee, TTag } from '@/core/types/schemas';
import { EIssueType, ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import { ETaskStatusName } from '@/core/types/schemas';

/**
 * Hook for creating team tasks (CREATE operations only).
 *
 * This hook provides:
 * - Task creation mutation
 * - Loading state
 * - Automatic cache invalidation
 *
 * @returns Object containing:
 * - `createTask` - Function to create a new task
 * - `createLoading` - Mutation pending state
 */
export function useCreateTask() {
	const taskStatuses = useAtomValue(taskStatusesState);

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();

	// Create mutation
	const createTaskMutation = useMutation({
		mutationFn: async (taskData: Parameters<typeof taskService.createTask>[0]) => {
			return await taskService.createTask(taskData);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	const createTask = useCallback(
		async ({
			title,
			issueType,
			taskStatusId,
			status = taskStatuses[0]?.name,
			priority,
			size,
			tags,
			description,
			projectId,
			members
		}: {
			title: string;
			issueType?: EIssueType | null;
			status?: ETaskStatusName | null;
			taskStatusId: string;
			priority?: ETaskPriority | null;
			size?: ETaskSize | null;
			tags?: TTag[] | null;
			description?: string | null;
			projectId?: string | null;
			members?: TEmployee[] | { id: string }[] | null;
		}) => {
			try {
				const res = await createTaskMutation.mutateAsync({
					title,
					issueType,
					status: status ?? taskStatuses?.[0]?.name,
					priority,
					size,
					tags,
					projectId,
					...(description ? { description: `<p>${description}</p>` } : {}),
					members: members ?? [],
					taskStatusId: taskStatusId
				});
				return res;
			} catch (error) {
				console.error('Error creating task:', error);
				throw error;
			}
		},
		[createTaskMutation, taskStatuses]
	);

	return {
		createTask,
		createLoading: createTaskMutation.isPending
	};
}
