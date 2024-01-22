import { useTeamTasks } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { employeeTasksState } from '@app/stores';
import React from 'react';
import { useRecoilValue } from 'recoil';
import { TaskCard } from '../task/task-card';

export function UserWorkedTaskTab({ member }: { member?: OT_Member }) {
	const { getTasksByEmployeeId, getTasksByEmployeeIdLoading } = useTeamTasks();
	const employeeTasks = useRecoilValue(employeeTasksState);

	React.useEffect(() => {
		getTasksByEmployeeId(member?.employeeId!, member?.organizationTeamId!);
	}, [getTasksByEmployeeId, member?.employeeId!, member?.organizationTeamId!]);
	return getTasksByEmployeeIdLoading ? (
		<div> Loading ... </div>
	) : (
		<div>
			{employeeTasks?.map((task) => (
				<div key={task.id}>
					<TaskCard
						task={task}
						isAuthUser={false}
						activeAuthTask={false}
						viewType={'default'}
						// profile={profile}
						taskBadgeClassName={`	${
							task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
						} rounded-sm`}
						taskTitleClassName="mt-[0.0625rem]"
					/>
				</div>
			))}
		</div>
	);
}
