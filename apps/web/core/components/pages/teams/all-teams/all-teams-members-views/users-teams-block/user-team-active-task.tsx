import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskBlockInfo } from '../../../team/team-members-views/user-team-block/task-info';
import { ITask } from '@/core/types/interfaces/task/task';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';

export default function UserTeamActiveBlockTaskInfo({
	member,
	activeTaskId
}: {
	member: IOrganizationTeamEmployee;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			{activeTask?.id ? (
				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className=" w-full px-1 py-2 overflow-hidden"
					publicTeam={false}
				/>
			) : (
				<div className="w-full text-start px-6 font-medium text-sm">No active task</div>
			)}
		</>
	);
}
