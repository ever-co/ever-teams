'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useCreateTask } from '@/core/hooks/organizations/teams/use-create-task';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { tasksByTeamState } from '@/core/stores';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const OPEN_STATUS_VALUE = 'open';

function startingStatusOf(statuses: TTaskStatus[]) {
	const openStatus = statuses.find((status) => status.value === OPEN_STATUS_VALUE);
	return openStatus ?? statuses[0] ?? null;
}

function createdTimeOf(task: TTask) {
	return new Date(task.createdAt ?? 0).getTime();
}

function newestOf(tasks: TTask[]) {
	let newest: TTask | null = null;
	for (const candidate of tasks) {
		if (!newest) {
			newest = candidate;
			continue;
		}
		const isLater = createdTimeOf(candidate) > createdTimeOf(newest);
		if (isLater) {
			newest = candidate;
		}
	}
	return newest;
}

function isNewTaskTitled(task: TTask, title: string, knownIds: Set<string>) {
	const hasTitle = task.title === title;
	return hasTitle && !knownIds.has(task.id);
}

/** Creation answers with the team's task list, not the new task: it is the one with that title that was not there. */
function createdTaskOf(response: unknown, title: string, knownIds: Set<string>) {
	const items = (response as { items?: TTask[] } | undefined)?.items ?? [];
	const trimmedTitle = title.trim();
	const newTasks = items.filter((task) => isNewTaskTitled(task, trimmedTitle, knownIds));
	return newestOf(newTasks);
}

/** A task typed in a picker, created in the project of the task the picker belongs to, starting "open". */
export function useCreateTaskFromPicker(task: TTask) {
	const teamTasks = useAtomValue(tasksByTeamState);
	const { createTask } = useCreateTask();
	const { taskStatuses } = useTaskStatusesQuery();

	return useCallback(
		async (title: string, issueType: EIssueType = EIssueType.TASK) => {
			const status = startingStatusOf(taskStatuses);
			if (!status?.id) {
				return null;
			}
			const knownIds = new Set(teamTasks.map((teamTask) => teamTask.id));
			const response = await createTask({
				title,
				issueType,
				taskStatusId: status.id,
				status: status.name,
				projectId: task.projectId,
				members: []
			});
			return createdTaskOf(response, title, knownIds);
		},
		[createTask, task.projectId, taskStatuses, teamTasks]
	);
}
