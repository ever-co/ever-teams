'use client';

import { useMutation } from '@tanstack/react-query';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { TTag } from '@/core/types/schemas';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';
import { mergeTaskLabelData } from '@/core/lib/helpers/task';

/**
 * Hook for editing an existing task label.
 *
 * This is the raw mutation without optimistic UI.
 * For optimistic UI, use the deprecated `useTaskLabels()` wrapper
 * or compose with `useTaskLabelsQuery().addOptimisticLabel`.
 *
 * @returns Object containing:
 * - `editTaskLabels` - mutateAsync function to edit a task label
 * - `editTaskLabelsLoading` - whether the mutation is pending
 */
export function useEditTaskLabel() {
	const { invalidateTaskLabelsData, teamId, organizationId, tenantId } = useInvalidateTaskLabels();

	const updateTaskLabelMutation = useMutation({
		mutationFn: ({ id, data, existingLabel }: { id: string; data: Partial<ITagCreate>; existingLabel?: TTag }) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const cleanData = mergeTaskLabelData(data, existingLabel, organizationId, tenantId, teamId);
			return taskLabelService.editTaskLabels({ tagId: id, data: cleanData });
		},
		onSuccess: invalidateTaskLabelsData
	});

	return {
		editTaskLabels: updateTaskLabelMutation.mutateAsync,
		editTaskLabelsLoading: updateTaskLabelMutation.isPending
	};
}

