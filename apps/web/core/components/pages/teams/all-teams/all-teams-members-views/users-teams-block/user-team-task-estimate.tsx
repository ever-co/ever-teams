import { useTeamMemberCard, useTMCardTaskEdit } from '@/core/hooks';
import { useGetTaskByIdQueryLazy } from '@/core/hooks/organizations/teams/use-get-team-task.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useEffect, useState } from 'react';
import { TaskEstimateInfo } from '../../../team/team-members-views/user-team-card/task-estimate';

export default function UserTeamActiveTaskEstimateBlock({
	member,
	activeTaskId
}: {
	member: TOrganizationTeamEmployee;
	activeTaskId: string;
}) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { setDetailedTaskId } = useDetailedTask();
	const { getTaskById } = useGetTaskByIdQueryLazy();

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
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			showTime={false}
			className="w-1/5"
			radial={true}
			useActiveTeamTaskByDefault={false}
			allowEmptyTask={false}
		/>
	);
}
