import { memo } from 'react';
import { TaskCard } from '../tasks/task-card';
import { Divider, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useUserSelectedPage } from '@/core/hooks/users';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { VirtualizedList } from '../common/virtualized-list';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';

const UserWorkedTaskTab = ({ member, useVirtualization = false }: { member?: any; useVirtualization?: boolean }) => {
	const profile = useUserSelectedPage(member?.employee?.userId);
	const hook = useTaskFilter(profile);
	const { user } = useAuthenticateUser();

	const t = useTranslations();

	const tasks = hook.tasksFiltered;
	const canSeeActivity = profile?.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER';
	const otherTasks = tasks.filter((t) =>
		profile?.member?.running == true ? t.id !== profile?.activeUserTeamTask?.id : t
	);

	// Determine if virtualization should be used
	const shouldUseVirtualization = useVirtualization && otherTasks.length > ITEMS_LENGTH_TO_VIRTUALIZED;

	// Render function for virtualized items
	const renderTaskItem = (task: any, index: number) => (
		<TaskCard
			task={task}
			isAuthUser={profile?.isAuthUser}
			activeAuthTask={false}
			viewType={hook.tab === 'unassigned' ? 'unassign' : 'default'}
			profile={profile}
			taskBadgeClassName={`${
				task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
			} rounded-sm`}
			taskTitleClassName="mt-[0.0625rem]"
		/>
	);

	return (
		<div>
			{profile?.activeUserTeamTask && canSeeActivity && (
				<TaskCard
					active
					task={profile?.activeUserTeamTask}
					isAuthUser={profile?.isAuthUser}
					activeAuthTask={true}
					profile={profile}
					taskBadgeClassName={`	${
						profile?.activeUserTeamTask?.issueType === 'Bug'
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

			{canSeeActivity &&
				(shouldUseVirtualization ? (
					<VirtualizedList
						items={otherTasks}
						itemHeight={120} // Approximate height of TaskCard
						containerHeight={600}
						useVirtualization={true}
						useSmoothVirtualization={true}
						renderItem={renderTaskItem}
						className="w-full"
						listClassName="flex flex-col gap-6"
						itemClassName="px-1 pb-6" // Match original gap-6 spacing
						listTag="ul"
						itemTag="li"
						bufferSize={8} // Larger buffer for smoother scrolling
						cacheSize={100} // Larger cache for better performance
						overscanMultiplier={2}
						scrollingIndicator={
							<div className="flex gap-2 items-center">
								<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
								<span>Loading tasks...</span>
							</div>
						}
					/>
				) : (
					<ul className="flex flex-col gap-6">
						{otherTasks.map((task) => (
							<li key={task.id}>{renderTaskItem(task, 0)}</li>
						))}
					</ul>
				))}
		</div>
	);
};

export default memo(UserWorkedTaskTab);
