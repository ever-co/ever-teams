'use client';

import { taskService } from '@/core/services/client/api';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

import { TEmployee, TTag } from '@/core/types/schemas';
import { ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import { useTaskStatusesQuery } from '../../tasks/use-task-statuses-query';

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
		// The one report of a failed creation: callers stay silent and keep the typed title for a retry.
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.CREATE_FAILED'), { description: t(reasonKey) });
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
			issueType?: string | null;
			status?: string | null;
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
