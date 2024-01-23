// import { useTeamTasks } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
// import { employeeTasksState } from '@app/stores';
import React from 'react';
import { TaskCard } from '../task/task-card';
import { useUserSelectedPage } from '@app/hooks/features/useUserSelectedPage';
import { useTaskFilter } from '../task/task-filters';
import { Divider, Text } from 'lib/components';
import { useTranslations } from 'next-intl';

export const UserWorkedTaskTab = React.memo(function UserWorkedTask({ member }: { member?: OT_Member }) {
	const profile = useUserSelectedPage(member?.employee?.userId);
	const hook = useTaskFilter(profile);
	// const { getTasksByEmployeeId, getTasksByEmployeeIdLoading } = useTeamTasks();

	const t = useTranslations();

	const tasks = hook.tasksFiltered;
	const otherTasks = tasks.filter((t) =>
		profile.member?.running == true ? t.id !== profile.activeUserTeamTask?.id : t
	);

	console.log({ hook, profile });

	return (
		<div>
			{profile.member?.timerStatus === 'running' && (
				<TaskCard
					active
					task={profile.activeUserTeamTask}
					isAuthUser={profile.isAuthUser}
					activeAuthTask={true}
					profile={profile}
					taskBadgeClassName={`	${
						profile.activeUserTeamTask?.issueType === 'Bug'
							? '!px-[0.3312rem] py-[0.2875rem]'
							: '!px-[0.375rem] py-[0.375rem]'
					} rounded-sm`}
					taskTitleClassName="mt-[0.0625rem]"
				/>
			)}

			{otherTasks.length > 0 && (
				<div className="flex items-center my-6 space-x-2">
					<Text className="font-normal">
						{t('common.LAST_24_HOURS')} ({otherTasks.length})
					</Text>
					<Divider className="flex-1" />
				</div>
			)}

			<ul className="flex flex-col gap-6">
				{otherTasks.map((task) => {
					return (
						<li key={task.id}>
							<TaskCard
								task={task}
								isAuthUser={profile.isAuthUser}
								activeAuthTask={false}
								viewType={hook.tab === 'unassigned' ? 'unassign' : 'default'}
								profile={profile}
								taskBadgeClassName={`	${
									task.issueType === 'Bug'
										? '!px-[0.3312rem] py-[0.2875rem]'
										: '!px-[0.375rem] py-[0.375rem]'
								} rounded-sm`}
								taskTitleClassName="mt-[0.0625rem]"
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);
});
