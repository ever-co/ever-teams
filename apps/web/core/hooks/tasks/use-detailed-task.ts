'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { detailedTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export type TDetailedTaskFailure = 'not-found' | 'load-failed';

/** The fields of the list copy that changed after the detail was read: edits newer than the detail. */
function editedSince(baseline: TTask, current: TTask): Partial<TTask> {
	const editedEntries = Object.entries(current).filter(([key, value]) => {
		const baselineValue = baseline[key as keyof TTask];
		return value !== baselineValue;
	});
	return Object.fromEntries(editedEntries) as Partial<TTask>;
}

/** Loads the full task (description, children, linked issues) into the detail state the task page shares. */
export function useDetailedTask(task: TTask, isActive: boolean) {
	const { getTaskById, getTaskByIdError, getTasksByIdLoading } = useTaskQueries();
	const detailedTask = useAtomValue(detailedTaskState);
	const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null);
	const [resyncedTaskId, setResyncedTaskId] = useState<string | null>(null);

	const readTask = useCallback(
		async (taskId: string) => {
			const loaded = await getTaskById(taskId);
			if (loaded) {
				setLoadedTaskId(taskId);
			}
		},
		[getTaskById]
	);

	const loadTask = useEffectEvent((taskId: string) => {
		void readTask(taskId);
	});

	useEffect(() => {
		loadTask(task.id);
	}, [task.id]);

	const retry = useCallback(() => {
		void readTask(task.id);
	}, [readTask, task.id]);

	// A failed read wins over the store, which can still hold the list copy getTaskById puts there first
	const hasLoadFailed = getTaskByIdError?.taskId === task.id;
	const isTaskNotFound = getTaskByIdError?.isTaskNotFound === true;
	let failure: TDetailedTaskFailure | null = null;
	if (hasLoadFailed) {
		failure = 'load-failed';
	}
	if (hasLoadFailed && isTaskNotFound) {
		failure = 'not-found';
	}

	const isSameTask = detailedTask?.id === task.id;
	const isLoaded = loadedTaskId === task.id;
	const isReady = isSameTask && isLoaded && !hasLoadFailed;
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

	// The list copy the detail arrived alongside: what differs from it later is a newer edit, the rest is older
	const [pairing, setPairing] = useState({ detail, task });
	const isPairedDetail = pairing.detail === detail;
	if (!isPairedDetail) {
		setPairing({ detail, task });
	}
	let baselineTask = task;
	if (isPairedDetail) {
		baselineTask = pairing.task;
	}

	let shownTask = task;
	if (detail) {
		const newerEdits = editedSince(baselineTask, task);
		shownTask = {
			...detail,
			...newerEdits,
			children: detail.children,
			linkedIssues: detail.linkedIssues,
			estimations: detail.estimations
		};
	}
	return { shownTask, detail, isReady, failure, retry, isRetrying: getTasksByIdLoading };
}
