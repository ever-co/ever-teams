import { memo, useCallback, useMemo } from 'react';
import { LazyTaskCard } from '@/core/components/optimized-components';
import { useUserSelectedPage } from '@/core/hooks/users';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { useOptimizedTaskCache } from '@/core/hooks/activities/use-optimized-task-cache';
import { OptimizedTaskAccordion } from './optimized-task-accordion';

import { TTask } from '@/core/types/schemas/task/task.schema';
const UserWorkedTaskTab = ({ member, useVirtualization = false }: { member?: any; useVirtualization?: boolean }) => {
	const profile = useUserSelectedPage(member?.employee?.userId);
	const hook = useTaskFilter(profile);
	const { user } = useAuthenticateUser();

	const tasks = hook.tasksFiltered;
	const canSeeActivity = profile?.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER';

	// Use optimized task cache with tab-specific caching
	const tabKey = `user-worked-tasks-${hook.tab || 'default'}`;
	const optimizedTaskData = useOptimizedTaskCache({
		tasks,
		activeTaskId: profile?.activeUserTeamTask?.id,
		tabKey,
		cacheTimeout: 5 * 60 * 1000 // 5 minutes cache
	});

	// Memoized render function for task items to prevent unnecessary re-renders
	const renderTaskItem = useCallback(
		(task: TTask) => (
			<LazyTaskCard
				task={task}
				isAuthUser={profile?.isAuthUser}
				activeAuthTask={false}
				viewType={hook.tab === 'unassigned' ? 'unassign' : 'default'}
				profile={profile}
				taskBadgeClassName={`${
					task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
				} rounded-sm`}
				taskTitleClassName="mt-[0.0625rem]"
				taskContentClassName="!w-72 !max-w-80"
			/>
		),
		[profile?.isAuthUser, hook.tab, profile]
	);

	// Memoized scrolling indicator for virtualization
	const scrollingIndicator = useMemo(
		() => (
			<div className="flex gap-2 justify-center items-center">
				<span className="sr-only">Loading...</span>
				<div className="size-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
				<div className="size-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
				<div className="bg-purple-500 rounded-full animate-bounce size-2" />
			</div>
		),
		[]
	);

	return (
		<div className="space-y-6">
			{/* Active Task - Always displayed first */}
			{profile?.activeUserTeamTask && canSeeActivity && (
				<LazyTaskCard
					active
					task={profile?.activeUserTeamTask}
					isAuthUser={profile?.isAuthUser}
					activeAuthTask={true}
					profile={profile}
					taskBadgeClassName={`${
						profile?.activeUserTeamTask?.issueType === 'Bug'
							? '!px-[0.3312rem] py-[0.2875rem]'
							: '!px-[0.375rem] py-[0.375rem]'
					} rounded-sm`}
					taskTitleClassName="mt-[0.0625rem]"
					taskContentClassName="!w-72 !max-w-80"
				/>
			)}

			{/* Optimized Task Accordion - First 5 tasks + remaining in accordion */}
			<OptimizedTaskAccordion
				firstFiveTasks={optimizedTaskData.firstFiveTasks}
				remainingTasks={optimizedTaskData.remainingTasks}
				totalCount={optimizedTaskData.totalCount}
				profile={profile}
				canSeeActivity={canSeeActivity}
				useVirtualization={useVirtualization}
				renderTaskItem={renderTaskItem}
				scrollingIndicator={scrollingIndicator}
			/>
		</div>
	);
};

export default memo(UserWorkedTaskTab);
