'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { detailedTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** Loads the full task (description, children, linked issues) into the detail state the task page shares. */
export function useDetailedTask(task: TTask, isActive: boolean) {
	const { getTaskById } = useTaskQueries();
	const detailedTask = useAtomValue(detailedTaskState);
	const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null);
	const [resyncedTaskId, setResyncedTaskId] = useState<string | null>(null);

	const loadTask = useEffectEvent(async (taskId: string) => {
		await getTaskById(taskId);
		setLoadedTaskId(taskId);
	});

	useEffect(() => {
		loadTask(task.id);
	}, [task.id]);

	const isSameTask = detailedTask?.id === task.id;
	const isLoaded = loadedTaskId === task.id;
	const isReady = isSameTask && isLoaded;
	const hasDrifted = isLoaded && !isSameTask;
	const hasResynced = resyncedTaskId === task.id;
	const needsResync = isActive && hasDrifted && !hasResynced;

	// A slower answer for the previous task can land after this one's: read it again, once, so two surfaces never fight.
	const resyncTask = useEffectEvent((taskId: string) => {
		setResyncedTaskId(taskId);
		void getTaskById(taskId);
	});

	useEffect(() => {
		if (needsResync) {
			resyncTask(task.id);
		}
	}, [needsResync, task.id]);

	let detail: TTask | null = null;
	if (isSameTask) {
		detail = detailedTask;
	}
	let shownTask = task;
	if (detail) {
		shownTask = {
			...detail,
			...task,
			children: detail.children,
			linkedIssues: detail.linkedIssues,
			estimations: detail.estimations
		};
	}
	return { shownTask, detail, isReady };
}
