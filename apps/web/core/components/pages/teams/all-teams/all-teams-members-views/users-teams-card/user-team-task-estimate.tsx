import { cn } from '@/core/lib/helpers';
import { useMemberIdentity, useMemberActiveTask, useTaskQueries, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useMemo, useState } from 'react';
import { TaskEstimateInfo } from '../../../team/team-members-views/user-team-card/task-estimate';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export default function UserTeamActiveTaskEstimate({
	member,
	className
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	// Only identity + memberTask needed — TaskEstimateInfo consumes memberTask, isAuthUser, isAuthTeamManager
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const memberInfo = useMemo(
		() => ({ memberTask, isAuthUser: identity.isAuthUser, isAuthTeamManager: identity.isAuthTeamManager }),
		[memberTask, identity.isAuthUser, identity.isAuthTeamManager]
	);
	const [activeTask, setActiveTask] = useState<TTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTaskQueries();

	useEffect(() => {
		if (!member.activeTaskId) {
			return;
		}
		getTaskById(member.activeTaskId)
			.then((response) => setActiveTask(response as TTask))
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
