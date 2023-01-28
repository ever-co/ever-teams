import { I_UserProfilePage } from '@app/hooks';
import { Divider, Text } from 'lib/components';
import { TaskCard } from './task/task-card';

export function UserProfileTask({ profile }: { profile: I_UserProfilePage }) {
	return (
		<div className="mt-10">
			<div className="flex space-x-2 items-center mb-3">
				<Text className="font-normal">Now</Text>
				<Divider className="flex-1" />
				<div className="flex space-x-4 items-center">
					<Text className="text-gray-500 text-xs font-normal">Total time:</Text>
					<Text className="font-normal">20h : 30m</Text>
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
					Last 24 Hours ({profile.otherTasks.length})
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
