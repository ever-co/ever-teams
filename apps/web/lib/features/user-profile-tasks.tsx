import { I_UserProfilePage, useLiveTimerStatus } from '@app/hooks';
import { Divider, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { TaskCard } from './task/task-card';

/**
 * It renders a list of tasks, with the first task being the active task, and the rest being the last
 * 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export function UserProfileTask({ profile }: { profile: I_UserProfilePage }) {
	const { trans } = useTranslation();
	// Get current timer seconds
	const { time } = useLiveTimerStatus();

	return (
		<div className="mt-10">
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

			<TaskCard
				active
				task={profile.activeUserTeamTask}
				isAuthUser={profile.isAuthUser}
				activeAuthTask={true}
			/>

			<div className="flex space-x-2 items-center my-6">
				<Text className="font-normal">
					{trans.common.LAST_24_HOURS} ({profile.otherTasks.length})
				</Text>
				<Divider className="flex-1" />
			</div>

			<ul>
				{profile.otherTasks.map((task) => {
					return (
						<li key={task.id} className="mb-8">
							<TaskCard
								task={task}
								isAuthUser={profile.isAuthUser}
								activeAuthTask={false}
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
