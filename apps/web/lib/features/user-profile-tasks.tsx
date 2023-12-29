import { I_UserProfilePage, useLiveTimerStatus } from '@app/hooks';
import { Divider, Text } from 'lib/components';
import { TaskCard } from './task/task-card';
import { I_TaskFilter } from './task/task-filters';
import { useTranslations } from 'next-intl';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
};

/**
 * It renders a list of tasks, with the first task being the active task, and the rest being the last
 * 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export function UserProfileTask({ profile, tabFiltered }: Props) {
	const t = useTranslations();
	// Get current timer seconds
	const { time, timerStatus } = useLiveTimerStatus();

	/**
	 * When tab is worked, then filter exclude the active task
	 */
	const tasks = tabFiltered.tasksFiltered;

	const otherTasks = tasks.filter((t) =>
		profile.member?.running == true ? t.id !== profile.activeUserTeamTask?.id : t
	);

	return (
		<div className="mt-10">
			{tabFiltered.tab === 'worked' &&
				(profile.member?.timerStatus === 'running' || (profile.isAuthUser && timerStatus?.running)) &&
				otherTasks.length > 0 && (
					/* Displaying the current time. */
					<div className="flex items-center mb-3 space-x-2">
						<Text className="font-normal">{t('common.NOW')}</Text>
						<Divider className="flex-1" />
						<div className="flex items-center space-x-4">
							<Text className="text-xs font-normal text-gray-500">{t('common.TOTAL_TIME')}:</Text>

							{profile.isAuthUser ? (
								<Text className="font-normal">
									{time.h}h : {time.m}m
								</Text>
							) : (
								<Text className="font-normal">00h : 00m</Text>
							)}
						</div>
					</div>
				)}

			{tabFiltered.tab === 'worked' &&
				(profile.member?.timerStatus === 'running' || (profile.isAuthUser && timerStatus?.running)) && (
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

			{tabFiltered.tab === 'worked' && otherTasks.length > 0 && (
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
								viewType={tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'}
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
}
