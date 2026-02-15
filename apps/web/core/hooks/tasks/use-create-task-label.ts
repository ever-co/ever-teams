'use client';

import { useMutation } from '@tanstack/react-query';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';
import { mergeTaskLabelData } from '@/core/lib/helpers/task';

/**
 * Hook for creating a new task label.
 *
 * This is the raw mutation without optimistic UI.
 * For optimistic UI, use the deprecated `useTaskLabels()` wrapper
 * or compose with `useTaskLabelsQuery().addOptimisticLabel`.
 *
 * @returns Object containing:
 * - `createTaskLabels` - mutateAsync function to create a task label
 * - `createTaskLabelsLoading` - whether the mutation is pending
 */
export function useCreateTaskLabel() {
	const { invalidateTaskLabelsData, teamId, organizationId, tenantId } = useInvalidateTaskLabels();

	const createTaskLabelMutation = useMutation({
		mutationFn: (data: ITagCreate) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const cleanData = mergeTaskLabelData(data, undefined, organizationId, tenantId, teamId);
			return taskLabelService.createTaskLabels(cleanData);
		},
		onSuccess: invalidateTaskLabelsData
	});

	return {
		createTaskLabels: createTaskLabelMutation.mutateAsync,
		createTaskLabelsLoading: createTaskLabelMutation.isPending
	};
}

