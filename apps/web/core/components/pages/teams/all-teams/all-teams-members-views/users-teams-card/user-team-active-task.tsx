import { cn } from '@/core/lib/helpers';
import { useTaskQueries, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { TaskInfo } from '../../../team/team-members-views/user-team-card/task-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveTaskInfo({
	member,
	className
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTaskQueries();

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
					className={cn('w-full min-w-0 flex-1 overflow-y-hidden', className)}
					publicTeam={false}
					tab="default"
				/>
			) : (
				<div className="w-full text-start text-sm text-muted-foreground">--</div>
			)}
		</>
	);
}
