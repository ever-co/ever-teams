import { useTeamMemberCard, useTeamTasks } from '@app/hooks';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { TaskTimes } from 'lib/features/task/task-times';
import { useEffect, useState } from 'react';

export default function UserTeamActiveTaskTimesBlock({
	member,
	activeTaskId
}: {
	member: OT_Member;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);

	const { getTaskById } = useTeamTasks();

	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);

	useEffect(() => {
		getTaskById(activeTaskId || '')
			.then((response) => setActiveTask(response.data))
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
