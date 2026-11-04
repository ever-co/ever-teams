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
				<TaskBlockInfo edition={taskEdition} className="w-full overflow-hidden px-4 py-3" publicTeam={false} />
			) : (
				<div className="w-full px-4 py-3 text-start text-sm text-muted-foreground">No active task</div>
			)}
		</>
	);
}
