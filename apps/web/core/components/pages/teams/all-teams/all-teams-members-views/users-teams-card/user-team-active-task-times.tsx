import { cn } from '@/core/lib/helpers';
import { useMemberIdentity, useTaskQueries } from '@/core/hooks';
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
	const memberInfo = useMemberIdentity(member);

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
			className={cn('flex min-w-0 flex-col items-end justify-center gap-y-1 tabular-nums', className)}
		/>
	);
}
