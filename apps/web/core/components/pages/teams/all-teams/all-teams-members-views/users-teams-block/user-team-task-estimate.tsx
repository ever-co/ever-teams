import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/task';
import { useEffect, useState } from 'react';
import { TaskEstimateInfo } from '../../../team/team-members-views/user-team-card/task-estimate';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';

export default function UserTeamActiveTaskEstimateBlock({
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
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			showTime={false}
			className="w-1/5"
			radial={true}
		/>
	);
}
