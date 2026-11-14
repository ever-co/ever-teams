import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '~lib/api-client';
import { listTasks, type TaskItem } from '~lib/gauzy';
import { refusalOf, type Refusal } from '~lib/refusal';
import {
	loadRecentTaskIds,
	loadSelectedTaskId,
	saveRecentTaskIds,
	saveSelectedTaskId
} from '~lib/session-store';
import { rememberRecent } from '~lib/task-order';
import type { Session } from '~lib/workspaces';

function refusalFrom(failure: unknown): Refusal {
	if (failure instanceof ApiError) {
		return refusalOf(failure);
	}
	return { key: 'errorGeneric' };
}

/** The person's tasks of the active team, the one picked for the timer, and the tasks they started recently. */
export function useTasks(session: Session | null) {
	const [tasks, setTasks] = useState<TaskItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Refusal | null>(null);
	const [recentIds, setRecentIds] = useState<string[]>([]);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!session) {
			return;
		}
		setLoading(true);
		try {
			setTasks(await listTasks(session));
			setError(null);
		} catch (failure) {
			setError(refusalFrom(failure));
		} finally {
			setLoading(false);
		}
	}, [session]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		void loadRecentTaskIds().then(setRecentIds);
		void loadSelectedTaskId().then(setSelectedTaskId);
	}, [session?.teamId]);

	const selectTask = useCallback(async (taskId: string | null) => {
		setSelectedTaskId(taskId);
		await saveSelectedTaskId(taskId);
	}, []);

	/** Puts a task the person started first among the recent ones. */
	const rememberStart = useCallback(async (taskId: string) => {
		const next = rememberRecent(await loadRecentTaskIds(), taskId);
		setRecentIds(next);
		await saveRecentTaskIds(next);
	}, []);

	/** Adds a task the person just created to the list, and picks it. */
	const addCreated = useCallback(
		async (task: TaskItem) => {
			setTasks((current) => [task, ...current.filter((existing) => existing.id !== task.id)]);
			await selectTask(task.id);
		},
		[selectTask]
	);

	const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

	return { tasks, loading, error, recentIds, selectedTask, selectTask, rememberStart, addCreated, reload: load };
}
