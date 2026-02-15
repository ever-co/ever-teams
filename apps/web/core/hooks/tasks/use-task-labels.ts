'use client';

import { useCallback, startTransition } from 'react';
import { generateDefaultColor } from '@/core/lib/helpers/index';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { mergeTaskLabelData } from '@/core/lib/helpers/task';
import { TTag } from '@/core/types/schemas';
import { useTaskLabelsQuery } from './use-task-labels-query';
import { useCreateTaskLabel } from './use-create-task-label';
import { useEditTaskLabel } from './use-edit-task-label';
import { useDeleteTaskLabel } from './use-delete-task-label';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskLabelsQuery` for read operations (list, loading, optimistic labels)
 * - `useCreateTaskLabel` for task label creation (raw mutation)
 * - `useEditTaskLabel` for task label edits (raw mutation)
 * - `useDeleteTaskLabel` for task label deletion (raw mutation)
 * - `useInvalidateTaskLabels` for shared cache invalidation
 *
 * This wrapper adds optimistic UI wrappers around the raw mutations.
 */
export function useTaskLabels() {
	const { organizationId, tenantId, teamId } = useInvalidateTaskLabels();
	const queryData = useTaskLabelsQuery();
	const createData = useCreateTaskLabel();
	const editData = useEditTaskLabel();
	const deleteData = useDeleteTaskLabel();

	const { addOptimisticLabel, baseLabels } = queryData;

	// Smart wrapper functions with optimistic UI
	const createTaskLabelsWithOptimistic = useCallback(
		async (inputData: Partial<ITagCreate>) => {
			if (!inputData.name?.trim()) {
				throw new Error('Label name is required');
			}

			const optimisticLabel: TTag = {
				id: `temp-${Date.now()}`,
				...mergeTaskLabelData(inputData, undefined, organizationId, tenantId, teamId),
				createdAt: new Date(),
				updatedAt: new Date(),
				isSystem: false
			} as TTag;

			let optimisticAdded = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'add', label: optimisticLabel });
					optimisticAdded = true;
				});

				const result = await createData.createTaskLabels(inputData as ITagCreate);
				return result;
			} catch (error) {
				if (optimisticAdded) {
					try {
						startTransition(() => {
							addOptimisticLabel({ type: 'delete', id: optimisticLabel.id });
						});
					} catch (revertError) {
						console.warn('Failed to revert optimistic update:', revertError);
					}
				}
				throw error;
			}
		},
		[createData, organizationId, tenantId, teamId, addOptimisticLabel]
	);

	const editTaskLabelsWithOptimistic = useCallback(
		async (id: string, inputData: Partial<ITagCreate>) => {
			const existingLabel = baseLabels?.find((label) => label.id === id);

			if (!existingLabel) {
				throw new Error(`Label with id ${id} not found`);
			}

			const hasChanges = Object.keys(inputData).some((key) => {
				const newValue = inputData[key as keyof ITagCreate];
				const existingValue = existingLabel[key as keyof typeof existingLabel];
				return newValue !== existingValue;
			});

			if (!hasChanges) {
				return existingLabel;
			}

			const optimisticLabel = {
				...existingLabel,
				...mergeTaskLabelData(inputData, existingLabel, organizationId, tenantId, teamId),
				updatedAt: new Date()
			} as any;

			let optimisticUpdated = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'update', label: optimisticLabel });
					optimisticUpdated = true;
				});

				const result = await editData.editTaskLabels({
					id,
					data: inputData,
					existingLabel: existingLabel as any
				});
				return result;
			} catch (error) {
				if (optimisticUpdated) {
					startTransition(() => {
						addOptimisticLabel({ type: 'update', label: existingLabel });
					});
				}
				throw error;
			}
		},
		[editData, baseLabels, organizationId, tenantId, teamId, addOptimisticLabel]
	);

	const deleteTaskLabelsWithOptimistic = useCallback(
		async (id: string) => {
			const existingLabel = baseLabels?.find((label) => label.id === id);

			if (!existingLabel) {
				throw new Error(`Label with id ${id} not found`);
			}

			let optimisticDeleted = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'delete', id });
					optimisticDeleted = true;
				});

				const result = await deleteData.deleteTaskLabels(id);
				return result;
			} catch (error) {
				if (optimisticDeleted) {
					startTransition(() => {
						addOptimisticLabel({ type: 'add', label: existingLabel });
					});
				}
				throw error;
			}
		},
		[deleteData, baseLabels, addOptimisticLabel]
	);

	return {
		loading: queryData.loading,
		taskLabels: queryData.taskLabels, // Optimistic labels for UI
		actualTaskLabels: queryData.actualTaskLabels,
		firstLoadTaskLabelsData: queryData.firstLoadTaskLabelsData,

		// Smart functions with optimistic UI
		createTaskLabels: createTaskLabelsWithOptimistic,
		editTaskLabels: editTaskLabelsWithOptimistic,
		deleteTaskLabels: deleteTaskLabelsWithOptimistic,

		// Loading states
		createTaskLabelsLoading: createData.createTaskLabelsLoading,
		editTaskLabelsLoading: editData.editTaskLabelsLoading,
		deleteTaskLabelsLoading: deleteData.deleteTaskLabelsLoading,

		// Legacy support
		loadTaskLabels: queryData.loadTaskLabels,

		// Utility functions
		generateDefaultColor,
		mergeTaskLabelData: (data: Partial<ITagCreate>, existing?: TTag) =>
			mergeTaskLabelData(data, existing, organizationId, tenantId, teamId)
	};
}
