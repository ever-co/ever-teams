'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { activityLogService } from '@/core/services/client/api/activity-logs';
import { taskDiscussionScope, toTaskActivityItem } from '@/core/lib/utils/task-discussion';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { TaskActivityItem } from '@/core/types/interfaces/task/task-discussion';

const ACTIVITY_LOG_PAGE_SIZE = 50;

const NO_ACTIVITIES: TaskActivityItem[] = [];

async function fetchTaskActivityLog(
	taskId: string | null,
	scope: IEntityRecordScope | null,
	signal: AbortSignal
): Promise<TaskActivityItem[]> {
	if (!taskId || !scope) {
		return NO_ACTIVITIES;
	}
	const page = await activityLogService.getLatest(
		EBaseEntityEnum.Task,
		taskId,
		ACTIVITY_LOG_PAGE_SIZE,
		scope,
		signal
	);

	return page.items.map(toTaskActivityItem);
}

/** A task's activity log, newest first: the latest 50 entries Gauzy wrote for it. */
export function useTaskActivityLog(taskId: string | null) {
	const scope = taskDiscussionScope();
	const isEnabled = scope !== null && taskId !== null;

	const activityQuery = useQuery({
		queryKey: queryKeys.tasks.activityLog(scope?.tenantId, scope?.organizationId, taskId),
		queryFn: ({ signal }) => fetchTaskActivityLog(taskId, scope, signal),
		enabled: isEnabled,
		// Edits by others land in the log too: opening the drawer again re-reads it behind the cached one.
		staleTime: 0
	});

	const { refetch: refetchActivities } = activityQuery;
	const refetch = useCallback(() => {
		if (!isEnabled) {
			return;
		}
		void refetchActivities();
	}, [isEnabled, refetchActivities]);

	const activities = activityQuery.data ?? NO_ACTIVITIES;

	return {
		activities,
		isLoading: activityQuery.isLoading,
		isError: activityQuery.isError,
		refetch
	};
}
