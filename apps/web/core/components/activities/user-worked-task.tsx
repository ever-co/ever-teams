import { memo } from 'react';
import { TaskCard } from '../tasks/task-card';
import { Divider, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useUserSelectedPage } from '@/core/hooks/users';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { Member } from '../pages/teams/all-teams/all-teams-members-views/users-teams-block/member-block';

const UserWorkedTaskTab = ({ member }: { member?: Member }) => {
	const profile = useUserSelectedPage(member?.employee?.userId);
	const hook = useTaskFilter(profile);
	const { user } = useAuthenticateUser();

	const t = useTranslations();

	const tasks = hook.tasksFiltered;
	const canSeeActivity = profile.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER';
	const otherTasks = tasks.filter((t) =>
		profile.member?.running == true ? t.id !== profile.activeUserTeamTask?.id : t
	);

	return (
		<div>
			{profile.activeUserTeamTask && canSeeActivity && (
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

			{otherTasks.length > 0 && canSeeActivity && (
				<div className="flex items-center my-6 space-x-2">
					<Text className="font-normal">
						{t('common.LAST_24_HOURS')} ({otherTasks.length})
					</Text>
					<Divider className="flex-1" />
				</div>
			)}

			<ul className="flex flex-col gap-6">
				{canSeeActivity &&
					otherTasks.map((task) => {
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
};

export default memo(UserWorkedTaskTab);
