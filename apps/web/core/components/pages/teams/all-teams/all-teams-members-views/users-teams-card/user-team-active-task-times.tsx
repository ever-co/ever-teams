import { TaskTimes } from '@/core/components/tasks/task-times';
import { useTeamMemberCard } from '@/core/hooks';
import { useGetTaskByIdQueryLazy } from '@/core/hooks/organizations/teams/use-get-team-task.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { cn } from '@/core/lib/helpers';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskTimes({
	member,
	className
}: {
	member: TOrganizationTeamEmployee;
	className?: string;
}) {
	const memberInfo = useTeamMemberCard(member);

	const { setDetailedTaskId } = useDetailedTask();
	const { getTaskById } = useGetTaskByIdQueryLazy();

	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);

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
		<TaskTimes
			activeAuthTask={true}
			memberInfo={memberInfo}
			task={activeTask}
			isAuthUser={memberInfo.isAuthUser}
			className={cn(
				'2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center',
				className
			)}
		/>
	);
}
