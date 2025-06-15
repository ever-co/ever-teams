import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskBlockInfo } from '../../../team/team-members-views/user-team-block/task-info';
import { ITask } from '@/core/types/interfaces/task/task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function UserTeamActiveBlockTaskInfo({
	member,
	activeTaskId
}: {
	member: TOrganizationTeamEmployee;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		if (!activeTaskId) {
			return;
		}
		getTaskById(activeTaskId)
			.then((task) => setActiveTask(task as ITask))
			.catch(console.error);
	}, [activeTaskId, getTaskById]);

	return (
		<>
			{activeTask?.id ? (
				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className="w-full px-1 py-2 overflow-hidden "
					publicTeam={false}
				/>
			) : (
				<div className="w-full px-6 text-sm font-medium text-start">No active task</div>
			)}
		</>
	);
}
