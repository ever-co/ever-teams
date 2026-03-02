import { useTaskQueries, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskBlockInfo } from '../../../team/team-members-views/user-team-block/task-info';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveBlockTaskInfo({
	activeTaskId
}: Readonly<{
	activeTaskId: string;
}>) {
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTaskQueries();

	useEffect(() => {
		if (!activeTaskId) {
			return;
		}
		getTaskById(activeTaskId)
			.then((task) => setActiveTask(task as TTask))
			.catch(console.error);
	}, [activeTaskId, getTaskById]);

	return (
		<>
			{activeTask?.id ? (
				<TaskBlockInfo edition={taskEdition} className="overflow-hidden px-1 py-2 w-full" publicTeam={false} />
			) : (
				<div className="px-6 w-full text-sm font-medium text-start">No active task</div>
			)}
		</>
	);
}
