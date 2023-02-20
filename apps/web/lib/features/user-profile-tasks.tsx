import { I_UserProfilePage, useLiveTimerStatus } from '@app/hooks';
import { Divider, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useMemo } from 'react';
import { TaskCard } from './task/task-card';
import { I_TaskFilter } from './task/task-filters';

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
	const { trans } = useTranslation();
	// Get current timer seconds
	const { time } = useLiveTimerStatus();

	/**
	 * When tab is worked, then filter it exclude the active task
	 */
	const tasks = useMemo(() => {
		let tasks = tabFiltered.tasksFiltered;
		if (tabFiltered.tab === 'worked' && profile.activeUserTeamTask) {
			tasks = tasks.filter((ts) => {
				return ts.id !== profile.activeUserTeamTask?.id;
			});
		}

		return tasks;
	}, [tabFiltered, profile]);

	return (
		<div className="mt-10">
			{tabFiltered.tab === 'worked' && (
				/* Displaying the current time. */
				<div className="flex space-x-2 items-center mb-3">
					<Text className="font-normal">{trans.common.NOW}</Text>
					<Divider className="flex-1" />
					<div className="flex space-x-4 items-center">
						<Text className="text-gray-500 text-xs font-normal">
							{trans.common.TOTAL_TIME}:
						</Text>

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

			{tabFiltered.tab === 'worked' && (
				<TaskCard
					active
					task={profile.activeUserTeamTask}
					isAuthUser={profile.isAuthUser}
					activeAuthTask={true}
				/>
			)}

			{tabFiltered.tab === 'worked' && (
				<div className="flex space-x-2 items-center my-6">
					<Text className="font-normal">
						{trans.common.LAST_24_HOURS} ({tasks.length})
					</Text>
					<Divider className="flex-1" />
				</div>
			)}

			<ul>
				{tasks.map((task) => {
					return (
						<li key={task.id} className="mb-8">
							<TaskCard
								task={task}
								isAuthUser={profile.isAuthUser && tabFiltered.tab === 'worked'}
								activeAuthTask={false}
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
