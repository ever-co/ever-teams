import { useTeamMemberCard, useTeamTasks } from '@/core/hooks';
import { TaskTimes } from '@/core/components/tasks/task-times';
import { useEffect, useState } from 'react';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveTaskTimesBlock({
	member,
	activeTaskId
}: {
	member: TOrganizationTeamEmployee;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);

	const { getTaskById } = useTeamTasks();

	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);

	useEffect(() => {
		if (!activeTaskId) {
			return;
		}
		getTaskById(activeTaskId)
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
			className=" w-full  px-2 flex flex-col gap-y-[1.125rem] justify-center"
			isBlock={true}
		/>
	);
}
