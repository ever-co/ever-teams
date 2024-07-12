import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@app/hooks';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { TaskBlockInfo } from 'lib/features/team/user-team-block/task-info';
import { useEffect, useState } from 'react';

export default function UserTeamActiveBlockTaskInfo({
	member,
	activeTaskId
}: {
	member: OT_Member;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
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
