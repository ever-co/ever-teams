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
				task={profile.activeTeamTask}
				isAuthUser={profile.isAuthUser}
				activeAuthTask={true}
			/>
		</div>
	);
}
