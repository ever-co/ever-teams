'use client';

import { TTask } from '@/core/types/schemas/task/task.schema';
import { useCallback, useEffect, useState } from 'react';

export function useLinkedTasks(task?: TTask | null) {
	const [tasks, setTasks] = useState<TTask[]>([]);

	const loadRelatedTasks = useCallback<(taskId: string) => Promise<TTask[]>>((taskId: string) => {
		console.log(taskId);

		return Promise.resolve([]);
	}, []);

	useEffect(() => {
		if (task?.id) {
			loadRelatedTasks(task?.id).then((tasks) => setTasks(tasks));
		}
	}, [task?.id, loadRelatedTasks]);

	return {
		tasks,
		loadRelatedTasks
	};
}
