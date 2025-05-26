import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskInfo } from '../../../team/team-members-views/user-team-card/task-info';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

export default function UserTeamActiveTaskInfo({
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
		<>
			{activeTask?.id ? (
				<TaskInfo
					edition={{ ...taskEdition, task: activeTask }}
					memberInfo={memberInfo}
					className={cn('flex-1 lg:px-4 px-2 overflow-y-hidden w-full max-w-fit', className)}
					publicTeam={false}
					tab="default"
				/>
			) : (
				<div className="w-full px-6 text-start">--</div>
			)}
		</>
	);
}
