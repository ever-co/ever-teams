'use client';

import { useAtomValue } from 'jotai';
import { detailedTaskState, tasksByTeamState } from '@/core/stores';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { TaskDrawerBody, TaskDrawerLoading } from './task-drawer';

/**
 * What the drawer shows for a task. The task comes from the team's tasks, so an edit anywhere shows here at once; a
 * task outside them is read from the detail the drawer loads.
 */
export function GlobalTaskDrawerContent({ taskId }: Readonly<{ taskId: string }>) {
	const teamTasks = useAtomValue(tasksByTeamState);
	const detailedTask = useAtomValue(detailedTaskState);
	const { closeTaskDrawer } = useTaskDrawer();

	const teamTask = teamTasks.find((candidate) => candidate.id === taskId) ?? null;
	const isDetailOfTask = detailedTask?.id === taskId;
	let task = teamTask;
	if (!task && isDetailOfTask) {
		task = detailedTask;
	}

	if (!task) {
		return <TaskDrawerLoading taskId={taskId} onClose={closeTaskDrawer} />;
	}
	return <TaskDrawerBody key={task.id} task={task} onClose={closeTaskDrawer} />;
}
