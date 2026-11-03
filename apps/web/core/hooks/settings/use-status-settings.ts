'use client';

import { useCallback, useMemo } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useCreateTaskStatus } from '@/core/hooks/tasks/use-create-task-status';
import { useEditTaskStatus } from '@/core/hooks/tasks/use-edit-task-status';
import { useReorderTaskStatus } from '@/core/hooks/tasks/use-reorder-task-status';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import {
	hasStatusCategories,
	isDraftChanged,
	orderEntriesOf,
	PropertyDraft,
	PropertyListItem,
	statusEditBodyOf,
	statusItemsOf,
	statusValueOf,
	TaskPropertySettingsModel
} from '@/core/lib/utils/settings-task-properties';
import { TTaskStatus } from '@/core/types/schemas';

function withOrder(status: TTaskStatus, orderById: ReadonlyMap<string, number>): TTaskStatus {
	const order = orderById.get(status.id);
	if (order === undefined) {
		return status;
	}
	return { ...status, order };
}

function undefinedIfNull<T>(value: T | null): T | undefined {
	if (value === null) {
		return undefined;
	}
	return value;
}

export interface StatusSettingsModel extends Omit<TaskPropertySettingsModel, 'remove'> {
	isGrouped: boolean;
	move: (orderedIds: string[]) => Promise<void>;
}

export function useStatusSettings(): StatusSettingsModel {
	const { data: user } = useUserQuery();
	const { taskStatuses, loading, isError, refetch, setTaskStatuses } = useTaskStatusesQuery();
	const { createTaskStatus } = useCreateTaskStatus();
	const { editTaskStatus } = useEditTaskStatus();
	const { reOrderTaskStatus } = useReorderTaskStatus();
	const organizationId = user?.employee?.organizationId;
	const tenantId = user?.tenantId ?? '';

	const items = useMemo(() => statusItemsOf(taskStatuses), [taskStatuses]);
	const isGrouped = useMemo(() => hasStatusCategories(taskStatuses), [taskStatuses]);

	const create = useCallback(
		(draft: PropertyDraft) => {
			const name = draft.name.trim();
			return createTaskStatus({
				name,
				value: statusValueOf(name),
				color: undefinedIfNull(draft.color),
				organizationId,
				tenantId,
				icon: undefinedIfNull(draft.icon),
				template: undefinedIfNull(draft.template)
			});
		},
		[createTaskStatus, organizationId, tenantId]
	);

	const update = useCallback(
		async (item: PropertyListItem, draft: PropertyDraft) => {
			const hasChanges = isDraftChanged(item, draft);
			if (!hasChanges) {
				return;
			}
			const body = statusEditBodyOf(item, draft);
			await editTaskStatus(item.id, body);
		},
		[editTaskStatus]
	);

	const move = useCallback(
		async (orderedIds: string[]) => {
			const previous = taskStatuses;
			const reorder = orderEntriesOf(orderedIds);
			const orderById = new Map(reorder.map((entry) => [entry.id, entry.order]));
			setTaskStatuses((current) => current.map((status) => withOrder(status, orderById)));
			try {
				const cookieOrganizationId = getOrganizationIdCookie();
				await reOrderTaskStatus({ organizationId: cookieOrganizationId, reorder });
			} catch {
				setTaskStatuses(previous);
			}
		},
		[reOrderTaskStatus, setTaskStatuses, taskStatuses]
	);

	return { items, isGrouped, isLoading: loading, isError, retry: refetch, create, update, move };
}
