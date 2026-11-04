'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useDeleteTaskStatus } from '@/core/hooks/tasks/use-delete-task-status';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import { isSameStatusName, PropertyListItem } from '@/core/lib/utils/settings-task-properties';
import { tasksByTeamState } from '@/core/stores';
import { ETaskStatusName } from '@/core/types/generics/enums/task';

/** Only the tasks loaded in the browser move to Open before the status is deleted. */
export function useStatusDeletion(status: PropertyListItem) {
	const tasks = useAtomValue(tasksByTeamState);
	const { isFirstLoad } = useTeamTasksLoadState();
	const { updateTask } = useUpdateTask();
	const { deleteTaskStatus } = useDeleteTaskStatus();
	const { setTaskStatuses } = useTaskStatusesQuery();

	const tasksUsingStatus = useMemo(
		() => tasks.filter((task) => isSameStatusName(task.status, status.name)),
		[status.name, tasks]
	);

	const remove = useCallback(async () => {
		const moves = tasksUsingStatus.map((task) => updateTask({ ...task, status: ETaskStatusName.OPEN }));
		await Promise.all(moves);
		await deleteTaskStatus(status.id);
		setTaskStatuses((current) => current.filter((candidate) => candidate.id !== status.id));
	}, [deleteTaskStatus, setTaskStatuses, status.id, tasksUsingStatus, updateTask]);

	return { usageCount: tasksUsingStatus.length, isCounting: isFirstLoad, remove };
}
