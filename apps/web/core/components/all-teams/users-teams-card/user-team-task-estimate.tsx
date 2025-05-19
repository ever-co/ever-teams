import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { ITeamTask, OT_Member } from '@/core/types/interfaces';
import { TaskEstimateInfo } from '@/core/components/teams/user-team-card/task-estimate';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskEstimate({
	member,
	className
}: Readonly<{ member: OT_Member; className?: string }>) {
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
			className={cn('w-1/5 lg:px-3 2xl:w-52 3xl:w-64', className)}
		/>
	);
}
