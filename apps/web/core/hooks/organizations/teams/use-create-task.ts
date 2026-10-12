'use client';

import { taskService } from '@/core/services/client/api';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

import { TEmployee, TTag } from '@/core/types/schemas';
import { EIssueType, ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import { ETaskStatusName } from '@/core/types/schemas';
import { useTaskStatusesQuery } from '../../tasks/use-task-statuses-query';

/**
 * No HTTP response means the API could not be reached. A 4xx carries the API's own reason
 * (validation, permission); other failure messages are written for developers, not users.
 */
function getCreateTaskErrorDetail(error: Error, networkIssueMessage: string): string | undefined {
	if (!ApiErrorService.isApiError(error)) return undefined;

	const status = error.httpResponseStatus;
	if (status === undefined) return networkIssueMessage;

	return status >= 400 && status < 500 ? error.message : undefined;
}

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
	const t = useTranslations();
	const { taskStatuses } = useTaskStatusesQuery();

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();

	// Create mutation
	const createTaskMutation = useMutation({
		mutationFn: async (taskData: Parameters<typeof taskService.createTask>[0]) => {
			return await taskService.createTask(taskData);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		},
		// Overrides the query client's generic "Mutation Error" toast for this mutation only.
		onError: (error) => {
			toast.error(t('task.toastMessages.TASK_CREATION_FAILED'), {
				description: getCreateTaskErrorDetail(error, t('errors.NETWORK_ISSUE'))
			});
		}
	});

	// Depend on the STABLE mutateAsync, not the mutation object (recreated on every state change).
	const createTaskMutateAsync = createTaskMutation.mutateAsync;
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
				const res = await createTaskMutateAsync({
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
		[createTaskMutateAsync, taskStatuses]
	);

	return {
		createTask,
		createLoading: createTaskMutation.isPending
	};
}
