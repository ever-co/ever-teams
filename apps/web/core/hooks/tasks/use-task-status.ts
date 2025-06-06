'use client';

import { taskStatusesState, activeTeamIdState } from '@/core/stores';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { useCallbackRef, useConditionalUpdateEffect, useSyncRef } from '../common';
import { TStatus, TStatusItem, useMapToTaskStatusValues } from '@/core/components/tasks/task-status';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/task-status-order';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';

export function useTaskStatus() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskStatuses, setTaskStatuses] = useAtom(taskStatusesState);
	const { firstLoadData: firstLoadTaskStatusesData } = useFirstLoad();
	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;
	const organizationId = user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = user?.employee?.tenantId || getTenantIdCookie();

	// useQuery for fetching task statuses
	const taskStatusesQuery = useQuery({
		queryKey: queryKeys.taskStatuses.byTeam(teamId),
		queryFn: () => {
			if (!organizationId || !teamId || !tenantId) {
				throw new Error('Required parameters missing: organizationId, teamId, and tenantId are required');
			}
			return taskStatusService.getTaskStatuses(tenantId, organizationId, teamId);
		},
		enabled: Boolean(organizationId) && Boolean(teamId) && Boolean(tenantId)
	});

	// Mutations using useQuery pattern
	const createTaskStatusMutation = useMutation({
		mutationFn: (data: ITaskStatusCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskStatusService.createTaskStatus(requestData, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskStatuses.byTeam(teamId)
				});
		}
	});

	const updateTaskStatusMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskStatusCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskStatusService.editTaskStatus(id, data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskStatuses.byTeam(teamId)
				});
		}
	});

	const deleteTaskStatusMutation = useMutation({
		mutationFn: (id: string) => taskStatusService.deleteTaskStatus(id),
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskStatuses.byTeam(teamId)
				});
		}
	});

	const reorderTaskStatusMutation = useMutation({
		mutationFn: (data: ITaskStatusOrder) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskStatusService.editTaskStatusOrder(data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskStatuses.byTeam(teamId)
				});
		}
	});

	/**
	 * This helper function prevents:
	 *
	 * - Setting state unnecessarily on mount.
	 */
	useConditionalUpdateEffect(
		() => {
			if (taskStatusesQuery.data) {
				setTaskStatuses(taskStatusesQuery.data.items);
			}
		},
		[taskStatusesQuery.data],
		Boolean(taskStatuses?.length)
	);

	const loadTaskStatuses = useCallback(async () => {
		try {
			const res = taskStatusesQuery.data;
			return res;
		} catch (error) {
			console.error('Failed to load task statuses:', error);
		}
	}, [setTaskStatuses, taskStatusesQuery.data]);

	const handleFirstLoad = useCallback(() => {
		loadTaskStatuses();
		firstLoadTaskStatusesData();
	}, [firstLoadTaskStatusesData, loadTaskStatuses]);

	return {
		taskStatuses: taskStatuses, // Use the atom state which gets updated by onSuccess
		loading: taskStatusesQuery.isLoading,

		getTaskStatusesLoading: taskStatusesQuery.isLoading,
		createTaskStatus: createTaskStatusMutation.mutateAsync,
		createTaskStatusLoading: createTaskStatusMutation.isPending,
		deleteTaskStatus: deleteTaskStatusMutation.mutateAsync,
		deleteTaskStatusLoading: deleteTaskStatusMutation.isPending,
		editTaskStatus: (id: string, data: ITaskStatusCreate) => updateTaskStatusMutation.mutateAsync({ id, data }),
		editTaskStatusLoading: updateTaskStatusMutation.isPending,
		reOrderTaskStatus: reorderTaskStatusMutation.mutateAsync,
		reOrderTaskStatusLoading: reorderTaskStatusMutation.isPending,
		setTaskStatuses,
		firstLoadTaskStatusesData: handleFirstLoad,
		loadTaskStatuses
	};
}

/**
 * It returns a set of items, the selected item, and a callback to change the selected item
 * @param statusItems - This is the object that contains the status items.
 * @param {ITaskStatusStack[T] | undefined}  - The current value of the status field.
 * @param [onValueChange] - This is the callback function that will be called when the value changes.
 */

export function useStatusValue<T extends ITaskStatusField>({
	value: $value,
	status: statusItems,
	onValueChange,
	multiple,
	defaultValues = []
}: {
	status: TStatus<ITaskStatusStack[T]>;
	value: ITaskStatusStack[T] | undefined;
	defaultValues?: ITaskStatusStack[T][];
	onValueChange?: (v: ITaskStatusStack[T], values?: ITaskStatusStack[T][]) => void;
	multiple?: boolean;
}) {
	const onValueChangeRef = useCallbackRef(onValueChange);
	const multipleRef = useSyncRef(multiple);

	const items = useMemo(() => {
		return Object.keys(statusItems).map((key) => {
			const value = statusItems[key as ITaskStatusStack[T]];
			if (!value.value) {
				value.value = key;
			}
			return {
				...value,
				name: key,
				displayName: key.split('-').join(' ')
			} as Required<TStatusItem>;
		});
	}, [statusItems]);

	const [value, setValue] = useState<ITaskStatusStack[T] | undefined>($value);
	const [values, setValues] = useState<ITaskStatusStack[T][]>(defaultValues);
	const item: TStatusItem | undefined = useMemo(
		() => items.find((r) => r.value === value || r.name === value),
		[items, value]
	);

	useEffect(() => {
		if ($value !== value) {
			setValue($value);
		}
	}, [$value, value]);

	useEffect(() => {
		if (defaultValues.length > 0 && JSON.stringify(values) !== JSON.stringify(defaultValues)) {
			setValues(defaultValues);
		}
	}, [defaultValues, values]);

	const onChange = useCallback(
		(value: ITaskStatusStack[T]) => {
			if (multipleRef.current) {
				setValues((prevValues) => {
					const newValues =
						typeof value === 'string'
							? prevValues.includes(value)
								? prevValues.filter((v) => v !== value)
								: [...prevValues, value]
							: Array.isArray(value)
								? value
								: [value];

					onValueChangeRef.current?.(value, newValues);
					return newValues;
				});
			} else {
				setValue(value);
				onValueChangeRef.current?.(value, [value]);
			}
		},
		[onValueChangeRef, multipleRef]
	);

	return {
		items,
		onChange,
		item,
		values
	};
}

//! =============== Task Status ================= //

export function useTaskStatusValue() {
	const { taskStatuses } = useTaskStatus();
	return useMapToTaskStatusValues(taskStatuses);
}
