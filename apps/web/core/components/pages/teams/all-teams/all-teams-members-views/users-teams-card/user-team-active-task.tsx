import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskInfo } from '../../../team/team-members-views/user-team-card/task-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveTaskInfo({
	member,
	className
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		if (member.activeTaskId) {
			getTaskById(member.activeTaskId)
				.then((response) => setActiveTask(response as TTask))
				.catch((_) => console.log(_));
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [member.activeTaskId, getTaskById]);

	return (
		<>
			{activeTask?.id ? (
				<TaskInfo
					edition={{ ...taskEdition, task: activeTask }}
					memberInfo={memberInfo}
					className={cn('overflow-y-hidden flex-1 px-2 w-full lg:px-4 max-w-fit', className)}
					publicTeam={false}
					tab="default"
				/>
			) : (
				<div className="px-6 w-full text-start">--</div>
			)}
		</>
	);
}
