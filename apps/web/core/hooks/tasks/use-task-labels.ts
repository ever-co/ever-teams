'use client';
import { taskLabelsListState, activeTeamIdState, activeTeamState } from '@/core/stores';
import { useCallback, useMemo, useOptimistic, startTransition } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { ITagCreate, ITag } from '@/core/types/interfaces/tag/tag';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Default colors for task labels when no color is provided
 */
const DEFAULT_LABEL_COLORS = [
	'#3B82F6', // Blue
	'#10B981', // Green
	'#F59E0B', // Yellow
	'#EF4444', // Red
	'#8B5CF6', // Purple
	'#06B6D4', // Cyan
	'#F97316', // Orange
	'#84CC16', // Lime
	'#EC4899', // Pink
	'#6B7280' // Gray (fallback)
];

/**
 * Generates a consistent color based on label name
 */
function generateDefaultColor(name: string): string {
	if (!name) return DEFAULT_LABEL_COLORS[DEFAULT_LABEL_COLORS.length - 1];

	// Simple hash function to get consistent color for same name
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
	}
	const index = Math.abs(hash) % (DEFAULT_LABEL_COLORS.length - 1);
	return DEFAULT_LABEL_COLORS[index];
}

/**
 * Intelligently merges label data with defaults and existing values
 */
function mergeTaskLabelData(
	inputData: Partial<ITagCreate>,
	existingLabel?: any,
	organizationId?: string | null,
	tenantId?: string | null,
	teamId?: string | null
): ITagCreate {
	// Helper to clean string values (null, undefined, empty -> undefined)
	const cleanString = (value: string | null | undefined): string | undefined => {
		if (!value || typeof value !== 'string') return undefined;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	};

	// Clean and prepare the data
	const cleanData: ITagCreate = {
		// Required fields
		name: cleanString(inputData.name) || cleanString(existingLabel?.name) || '',

		// Smart color handling - always provide a color
		color:
			cleanString(inputData.color) ||
			cleanString(existingLabel?.color) ||
			generateDefaultColor(cleanString(inputData.name) || cleanString(existingLabel?.name) || ''),

		// Smart icon handling
		icon: cleanString(inputData.icon) || cleanString(existingLabel?.icon),

		// Optional fields with fallbacks
		description: cleanString(inputData.description) || cleanString(existingLabel?.description),

		// System fields
		organizationId: inputData.organizationId || organizationId || undefined,
		tenantId: inputData.tenantId || tenantId || undefined,
		organizationTeamId: inputData.organizationTeamId || teamId || undefined
	};

	// Remove undefined values to avoid backend issues
	Object.keys(cleanData).forEach((key) => {
		if (cleanData[key as keyof ITagCreate] === undefined) {
			delete cleanData[key as keyof ITagCreate];
		}
	});

	return cleanData;
}

export function useTaskLabels() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { data: authUser } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);

	const queryClient = useQueryClient();

	const [taskLabels, setTaskLabels] = useAtom(taskLabelsListState);
	const { firstLoadData: firstLoadTaskLabelsData } = useFirstLoad();

	const organizationId = useMemo(() => authUser?.employee?.organizationId || getOrganizationIdCookie(), [authUser]);
	const tenantId = useMemo(() => authUser?.employee?.tenantId || getTenantIdCookie(), [authUser]);
	const teamId = useMemo(() => activeTeam?.id || getActiveTeamIdCookie() || activeTeamId, [activeTeam, activeTeamId]);

	// Stable base data for optimistic UI (avoid circular dependencies)
	const baseLabels = useMemo(() => taskLabels || [], [taskLabels]);

	// Optimistic UI state for task labels
	const [optimisticLabels, addOptimisticLabel] = useOptimistic(
		baseLabels,
		(state: any[], action: { type: 'add' | 'update' | 'delete'; label?: any; id?: string }) => {
			switch (action.type) {
				case 'add':
					return action.label ? [action.label, ...state] : state;
				case 'update':
					return action.label
						? state.map((label) => (label.id === action.label!.id ? action.label! : label))
						: state;
				case 'delete':
					return action.id ? state.filter((label) => label.id !== action.id) : state;
				default:
					return state;
			}
		}
	);

	// useQuery for fetching task labels
	const taskLabelsQuery = useQuery({
		queryKey: queryKeys.taskLabels.byTeam(teamId),
		queryFn: async () => {
			const isEnabled = !!tenantId && !!organizationId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskLabelService.getTaskLabelsList();
			return res.data;
		},
		enabled: !!tenantId && !!organizationId && !!teamId
	});
	const invalidateTaskLabelsData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.byTeam(teamId) }),
		[queryClient, teamId]
	);
	// Smart mutations with optimistic UI
	const createTaskLabelMutation = useMutation({
		mutationFn: (data: ITagCreate) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			// Use intelligent data merging
			const cleanData = mergeTaskLabelData(data, undefined, organizationId, tenantId, teamId);
			return taskLabelService.createTaskLabels(cleanData);
		},
		onSuccess: invalidateTaskLabelsData
	});

	const updateTaskLabelMutation = useMutation({
		mutationFn: ({ id, data, existingLabel }: { id: string; data: Partial<ITagCreate>; existingLabel?: ITag }) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			// Use intelligent data merging with existing label fallbacks
			const cleanData = mergeTaskLabelData(data, existingLabel, organizationId, tenantId, teamId);
			return taskLabelService.editTaskLabels({ tagId: id, data: cleanData });
		},
		onSuccess: invalidateTaskLabelsData
	});

	const deleteTaskLabelMutation = useMutation({
		mutationFn: (id: string) => taskLabelService.deleteTaskLabels(id),
		onSuccess: invalidateTaskLabelsData
	});

	useConditionalUpdateEffect(
		() => {
			if (taskLabelsQuery.data) {
				setTaskLabels(taskLabelsQuery.data.items);
			}
		},
		[taskLabelsQuery.data],
		Boolean(taskLabels?.length)
	);

	const loadTaskLabels = useCallback(async () => {
		return taskLabelsQuery.data;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authUser, activeTeamId]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskLabels();
		firstLoadTaskLabelsData();
	}, [firstLoadTaskLabelsData, loadTaskLabels]);
	// Smart wrapper functions with optimistic UI
	const createTaskLabelsWithOptimistic = useCallback(
		async (inputData: Partial<ITagCreate>) => {
			// Validate input to prevent unnecessary operations
			if (!inputData.name?.trim()) {
				throw new Error('Label name is required');
			}

			// Generate optimistic label
			const optimisticLabel = {
				id: `temp-${Date.now()}`,
				...mergeTaskLabelData(inputData, undefined, organizationId, tenantId, teamId),
				createdAt: new Date(),
				updatedAt: new Date(),
				isSystem: false
			} as any;

			// Add optimistic update with guard
			let optimisticAdded = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'add', label: optimisticLabel });
					optimisticAdded = true;
				});

				const result = await createTaskLabelMutation.mutateAsync(inputData as ITagCreate);
				return result;
			} catch (error) {
				// Revert optimistic update on error only if it was added
				if (optimisticAdded) {
					startTransition(() => {
						addOptimisticLabel({ type: 'delete', id: optimisticLabel.id });
					});
				}
				throw error;
			}
		},
		[createTaskLabelMutation, organizationId, tenantId, teamId, addOptimisticLabel]
	);

	const editTaskLabelsWithOptimistic = useCallback(
		async (id: string, inputData: Partial<ITagCreate>) => {
			// Use baseLabels instead of taskLabels to avoid circular dependency
			const existingLabel = baseLabels?.find((label) => label.id === id);

			if (!existingLabel) {
				throw new Error(`Label with id ${id} not found`);
			}

			// Check if there are actual changes to prevent unnecessary updates
			const hasChanges = Object.keys(inputData).some((key) => {
				const newValue = inputData[key as keyof ITagCreate];
				const existingValue = existingLabel[key as keyof typeof existingLabel];
				return newValue !== existingValue;
			});

			if (!hasChanges) {
				return existingLabel; // No changes, return existing
			}

			// Generate optimistic updated label
			const optimisticLabel = {
				...existingLabel,
				...mergeTaskLabelData(inputData, existingLabel, organizationId, tenantId, teamId),
				updatedAt: new Date()
			} as any;

			// Add optimistic update with guard
			let optimisticUpdated = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'update', label: optimisticLabel });
					optimisticUpdated = true;
				});

				const result = await updateTaskLabelMutation.mutateAsync({
					id,
					data: inputData,
					existingLabel: existingLabel as any
				});
				return result;
			} catch (error) {
				// Revert optimistic update on error only if it was updated
				if (optimisticUpdated && existingLabel) {
					startTransition(() => {
						addOptimisticLabel({ type: 'update', label: existingLabel });
					});
				}
				throw error;
			}
		},
		[updateTaskLabelMutation, baseLabels, organizationId, tenantId, teamId, addOptimisticLabel]
	);

	const deleteTaskLabelsWithOptimistic = useCallback(
		async (id: string) => {
			// Use baseLabels instead of taskLabels to avoid circular dependency
			const existingLabel = baseLabels?.find((label) => label.id === id);

			if (!existingLabel) {
				throw new Error(`Label with id ${id} not found`);
			}

			// Add optimistic delete with guard
			let optimisticDeleted = false;
			try {
				startTransition(() => {
					addOptimisticLabel({ type: 'delete', id });
					optimisticDeleted = true;
				});

				const result = await deleteTaskLabelMutation.mutateAsync(id);
				return result;
			} catch (error) {
				// Revert optimistic update on error only if it was deleted
				if (optimisticDeleted && existingLabel) {
					startTransition(() => {
						addOptimisticLabel({ type: 'add', label: existingLabel });
					});
				}
				throw error;
			}
		},
		[deleteTaskLabelMutation, baseLabels, addOptimisticLabel]
	);

	return {
		loading: taskLabelsQuery.isLoading,
		taskLabels: optimisticLabels, // Return optimistic labels for UI
		actualTaskLabels: taskLabels, // Provide access to actual data if needed
		firstLoadTaskLabelsData: handleFirstLoad,

		// Smart functions with optimistic UI
		createTaskLabels: createTaskLabelsWithOptimistic,
		editTaskLabels: editTaskLabelsWithOptimistic,
		deleteTaskLabels: deleteTaskLabelsWithOptimistic,

		// Loading states
		createTaskLabelsLoading: createTaskLabelMutation.isPending,
		editTaskLabelsLoading: updateTaskLabelMutation.isPending,
		deleteTaskLabelsLoading: deleteTaskLabelMutation.isPending,

		// Legacy support (deprecated - use smart functions above)
		setTaskLabels,
		loadTaskLabels,

		// Utility functions
		generateDefaultColor,
		mergeTaskLabelData: (data: Partial<ITagCreate>, existing?: ITag) =>
			mergeTaskLabelData(data, existing, organizationId, tenantId, teamId)
	};
}
