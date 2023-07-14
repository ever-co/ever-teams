import { ITeamTask } from '@app/interfaces';
import { useCallback, useEffect, useState } from 'react';

export function useLinkedTasks(task?: ITeamTask | null) {
	const [tasks, setTasks] = useState<ITeamTask[]>([]);

	const loadRelatedTasks = useCallback<
		(taskId: string) => Promise<ITeamTask[]>
	>((taskId: string) => {
		console.log(taskId);

		return Promise.resolve([]);
	}, []);

	useEffect(() => {
		if (task?.id) {
			loadRelatedTasks(task?.id).then((tasks) => setTasks(tasks));
		}
	}, [task?.id]);

	return {
		tasks,
		loadRelatedTasks,
	};
}
