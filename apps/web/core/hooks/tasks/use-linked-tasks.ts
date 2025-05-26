'use client';

import { ITask } from '@/core/types/interfaces/task/ITask';
import { useCallback, useEffect, useState } from 'react';

export function useLinkedTasks(task?: ITask | null) {
	const [tasks, setTasks] = useState<ITask[]>([]);

	const loadRelatedTasks = useCallback<(taskId: string) => Promise<ITask[]>>((taskId: string) => {
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
