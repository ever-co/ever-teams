'use client';

import { taskStatusesState, activeTeamIdState } from '@/core/stores';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import { useQuery } from '../common/use-query';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { useCallbackRef, useSyncRef } from '../common';
import { TStatus, TStatusItem, useMapToTaskStatusValues } from '@/core/components/tasks/task-status';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/ITaskStatus';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/ITaskStatusOrder';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/ITaskStatusField';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/ITaskStatusStack';

export function useTaskStatus() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskStatuses, setTaskStatuses] = useAtom(taskStatusesState);
	const { firstLoadData: firstLoadTaskStatusesData } = useFirstLoad();
	const teamId = getActiveTeamIdCookie() || activeTeamId;
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const {
		loading: getTaskStatusesLoading,
		queryCall: getTaskStatusesQueryCall,
		loadingRef: getTaskStatusesLoadingRef
	} = useQuery(taskStatusService.getTaskStatuses);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } = useQuery(
		taskStatusService.createTaskStatus
	);
	const { loading: deleteTaskStatusLoading, queryCall: deleteQueryCall } = useQuery(
		taskStatusService.deleteTaskStatus
	);
	const { loading: editTaskStatusLoading, queryCall: editQueryCall } = useQuery(taskStatusService.editTaskStatus);
	const { loading: reOrderTaskStatusLoading, queryCall: reOrderQueryCall } = useQuery(
		taskStatusService.editTaskStatusOrder
	);

	const getTaskStatuses = useCallback(async () => {
		try {
			if (getTaskStatusesLoadingRef.current) {
				return;
			}
			if (organizationId && teamId && tenantId) {
				const res = await getTaskStatusesQueryCall(tenantId, organizationId, teamId);

				return res;
			} else {
				throw Error(
					'Required parameters missing: organizationId and teamId are required. Ensure you have tenant,  active team and organization ids set in cookies.'
				);
			}
		} catch (error) {
			console.error('Failed to get task statuses:', error);
		}
	}, [getTaskStatusesLoadingRef, getTaskStatusesQueryCall, organizationId, teamId, tenantId]);

	const createTaskStatus = useCallback(
		async (data: ITaskStatusCreate) => {
			try {
				if (tenantId) {
					const requestData = { ...data, organizationTeamId: activeTeamId || '' };

					const res = await createQueryCall(requestData, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('[WEB][useTaskStatus] Failed to create task status:', error);
				throw error;
			}
		},
		[tenantId, createQueryCall, activeTeamId]
	);

	const deleteTaskStatus = useCallback(
		async (id: string) => {
			try {
				if (tenantId) {
					const res = await deleteQueryCall(id);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to delete task status:', error);
			}
		},
		[tenantId, deleteQueryCall]
	);

	const editTaskStatus = useCallback(
		async (id: string, data: ITaskStatusCreate) => {
			try {
				if (tenantId) {
					const res = await editQueryCall(id, data, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to edit task status:', error);
			}
		},
		[tenantId, editQueryCall]
	);

	const reOrderTaskStatus = useCallback(
		async (data: ITaskStatusOrder) => {
			try {
				if (tenantId) {
					const res = await reOrderQueryCall(data, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to re-order task status:', error);
			}
		},
		[reOrderQueryCall, tenantId]
	);

	const loadTaskStatuses = useCallback(async () => {
		try {
			const res = await getTaskStatuses();

			if (res) {
				setTaskStatuses(res.data.items);
			}
		} catch (error) {
			console.error('Failed to load task statuses:', error);
		}
	}, [getTaskStatuses, setTaskStatuses]);

	const handleFirstLoad = useCallback(() => {
		loadTaskStatuses();
		firstLoadTaskStatusesData();
	}, [firstLoadTaskStatusesData, loadTaskStatuses]);

	return {
		getTaskStatuses,
		getTaskStatusesLoading,
		createTaskStatus,
		createTaskStatusLoading,
		deleteTaskStatus,
		deleteTaskStatusLoading,
		editTaskStatus,
		editTaskStatusLoading,
		reOrderTaskStatus,
		reOrderTaskStatusLoading,
		taskStatuses,
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
