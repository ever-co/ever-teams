import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@app/hooks';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { TaskEstimateInfo } from 'lib/features/team/user-team-card/task-estimate';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskEstimate({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64"
		/>
	);
}
