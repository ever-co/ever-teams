import { cn } from '@/core/lib/helpers';
import { useTeamMemberCard, useTaskQueries } from '@/core/hooks';
import { TaskTimes } from '@/core/components/tasks/task-times';
import { useEffect, useState } from 'react';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveTaskTimes({
	member,
	className
}: {
	member: TOrganizationTeamEmployee;
	className?: string;
}) {
	const memberInfo = useTeamMemberCard(member);

	const { getTaskById } = useTaskQueries();

	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);

	useEffect(() => {
		if (!member.activeTaskId) {
			return;
		}
		// Pass false to prevent updating global state (which causes race conditions in lists)
		getTaskById(member.activeTaskId, false)
			.then((response) => setActiveTask(response as TTask))
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
