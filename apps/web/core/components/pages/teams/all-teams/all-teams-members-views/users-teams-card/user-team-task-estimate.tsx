import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskEstimateInfo } from '../../../team/team-members-views/user-team-card/task-estimate';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

export default function UserTeamActiveTaskEstimate({
	member,
	className
}: Readonly<{ member: IOrganizationTeamEmployee; className?: string }>) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITask | null | undefined>(null);
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
