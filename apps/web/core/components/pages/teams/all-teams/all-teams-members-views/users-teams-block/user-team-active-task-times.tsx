import { TaskTimes } from '@/core/components/tasks/task-times';
import { useTeamMemberCard } from '@/core/hooks';
import { useGetTaskByIdQueryLazy } from '@/core/hooks/organizations/teams/use-get-team-task.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskTimesBlock({
	member,
	activeTaskId
}: {
	member: TOrganizationTeamEmployee;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);

	const { setDetailedTaskId } = useDetailedTask();
	const { getTaskById } = useGetTaskByIdQueryLazy();

	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);

	useEffect(() => {
		if (!activeTaskId) {
			return;
		}
		getTaskById(activeTaskId)
			.then((response) => {
				setDetailedTaskId(activeTaskId);
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
			className=" w-full  px-2 flex flex-col gap-y-[1.125rem] justify-center"
			isBlock={true}
		/>
	);
}
