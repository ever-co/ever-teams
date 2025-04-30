import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { ITeamTask, OT_Member } from '@/core/types/interfaces';
import { TaskEstimateInfo } from '@/core/components/features/team/user-team-card/task-estimate';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskEstimateBlock({
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
