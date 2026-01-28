import { useTeamMemberCard, useTMCardTaskEdit } from '@/core/hooks';
import { useGetTaskByIdQueryLazy } from '@/core/hooks/organizations/teams/use-get-team-task.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { cn } from '@/core/lib/helpers';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useEffect, useState } from 'react';
import { TaskEstimateInfo } from '../../../team/team-members-views/user-team-card/task-estimate';

export default function UserTeamActiveTaskEstimate({
	member,
	className
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { setDetailedTaskId } = useDetailedTask();
	const { getTaskById } = useGetTaskByIdQueryLazy();

	useEffect(() => {
		if (!member.activeTaskId) {
			return;
		}
		getTaskById(member.activeTaskId)
			.then((response) => {
				setDetailedTaskId(member.activeTaskId ?? null);
				setActiveTask(response as TTask);
			})
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className={cn('w-1/5 lg:px-3 2xl:w-52 3xl:w-64', className)}
			useActiveTeamTaskByDefault={false}
			allowEmptyTask={false}
		/>
	);
}
