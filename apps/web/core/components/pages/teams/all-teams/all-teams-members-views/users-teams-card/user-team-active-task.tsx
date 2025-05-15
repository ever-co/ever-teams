import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { ITeamTask, OT_Member } from '@/core/types/interfaces';
import { useEffect, useState } from 'react';
import { TaskInfo3 } from '../../../team/team-members-views/user-team-card/task-info';

export default function UserTeamActiveTaskInfo({
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
		<>
			{activeTask?.id ? (
				<TaskInfo3
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
