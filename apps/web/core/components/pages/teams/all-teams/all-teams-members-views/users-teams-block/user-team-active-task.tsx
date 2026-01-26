import { useTeamMemberCard, useTMCardTaskEdit } from '@/core/hooks';
import { useGetTaskByIdQueryLazy } from '@/core/hooks/organizations/teams/use-get-team-task.query';
import { useDetailedTask } from '@/core/hooks/tasks/use-detailed-task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useEffect, useState } from 'react';
import { TaskBlockInfo } from '../../../team/team-members-views/user-team-block/task-info';

export default function UserTeamActiveBlockTaskInfo({
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
			.then((task) => {
				setDetailedTaskId(activeTaskId);
				setActiveTask(task as TTask);
			})
			.catch(console.error);
	}, [activeTaskId, getTaskById]);

	return (
		<>
			{activeTask?.id ? (
				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className="w-full px-1 py-2 overflow-hidden "
					publicTeam={false}
				/>
			) : (
				<div className="w-full px-6 text-sm font-medium text-start">No active task</div>
			)}
		</>
	);
}
