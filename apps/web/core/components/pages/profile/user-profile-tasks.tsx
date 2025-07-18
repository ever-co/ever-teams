import { I_UserProfilePage, useLiveTimerStatus } from '@/core/hooks';
import { Divider, Text } from '@/core/components';
import { I_TaskFilter } from './task-filters';
import { useTranslations } from 'next-intl';
import { memo, Suspense, useEffect, useMemo, useState } from 'react';
import { cn } from '@/core/lib/helpers';
import { useScrollPagination } from '@/core/hooks/common/use-pagination';
import { UserProfilePlans } from '@/core/components/users/user-profile-plans';
import { EmptyPlans } from '@/core/components/daily-plan';
import { TUser } from '@/core/types/schemas';
import { LazyActivityCalendar, LazyTaskCard } from '@/core/components/optimized-components';
import { ActivityCalendarSkeleton } from '../../common/skeleton/activity-calendar-skeleton';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	paginateTasks?: boolean;
	user?: TUser;
};
/**
 * It displays a list of tasks, the first task being the active task and the rest being the last 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export const UserProfileTask = memo(({ profile, paginateTasks, tabFiltered, user }: Props) => {
	const [scrollableContainer, setScrollableContainer] = useState<HTMLDivElement | null>(null);

	const t = useTranslations();
	// Get current timer seconds
	const { time, timerStatus } = useLiveTimerStatus();

	/**
	 * When tab is worked, then filter exclude the active task
	 */
	const tasks = useMemo(() => tabFiltered.tasksFiltered, [tabFiltered.tasksFiltered]);

	const otherTasks = useMemo(
		() => tasks.filter((t) => (profile.member?.running == true ? t.id !== profile.activeUserTeamTask?.id : t)),
		[profile.activeUserTeamTask?.id, profile.member?.running, tasks]
	);

	const { slicedItems } = useScrollPagination({
		enabled: !!paginateTasks,
		items: otherTasks,
		scrollableElement: scrollableContainer,
		defaultItemsPerPage: 20
	});

	useEffect(() => {
		// Use the native element query since the ResizablePanel
		// does not forward any HTML reference
		const scrollable = document.querySelector<HTMLDivElement>('div.custom-scrollbar');
		if (scrollable) {
			setScrollableContainer(scrollable);
		}
	}, []);

	return (
		<div className="flex flex-col mt-5 w-full h-full">
			{tabFiltered.tab === 'worked' &&
				(profile.member?.employee?.isTrackingTime || (profile.isAuthUser && timerStatus?.running)) &&
				otherTasks.length > 0 && (
					/* Displaying the current time. */
					<div className="flex gap-x-2 items-center mb-3 w-fit">
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
				(profile.member?.employee?.isTrackingTime || (profile.isAuthUser && timerStatus?.running)) && (
					<LazyTaskCard
						active
						task={profile.activeUserTeamTask}
						isAuthUser={profile.isAuthUser}
						activeAuthTask={true}
						profile={profile}
						taskBadgeClassName={cn(
							profile.activeUserTeamTask?.issueType === 'Bug'
								? '!px-[0.3312rem] py-[0.2875rem]'
								: '!px-[0.375rem] py-[0.375rem]',
							'rounded-sm'
						)}
						taskTitleClassName="mt-[0.0625rem]"
					/>
				)}
			{tabFiltered.tab === 'stats' && (
				<Suspense fallback={<ActivityCalendarSkeleton />}>
					<LazyActivityCalendar />
				</Suspense>
			)}
			{tabFiltered.tab === 'dailyplan' && <UserProfilePlans user={user} />}

			{tabFiltered.tab === 'worked' && otherTasks.length > 0 && (
				<div className="flex items-center my-6 space-x-2">
					<Text className="font-normal">
						{t('common.LAST_24_HOURS')} ({otherTasks.length})
					</Text>
					<Divider className="flex-1" />
				</div>
			)}

			{tabFiltered.tab !== 'dailyplan' && (
				<ul className="flex flex-col gap-4">
					{slicedItems.length > 0
						? slicedItems.map((task) => {
								return (
									<li key={task.id}>
										<LazyTaskCard
											key={task.id}
											task={task}
											isAuthUser={profile.isAuthUser}
											activeAuthTask={false}
											viewType={tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'}
											profile={profile}
											taskBadgeClassName={cn(
												task.issueType === 'Bug'
													? '!px-[0.3312rem] py-[0.2875rem]'
													: '!px-[0.375rem] py-[0.375rem]',
												'rounded-sm'
											)}
											taskTitleClassName="mt-[0.0625rem]"
										/>
									</li>
								);
							})
						: tabFiltered.tab !== 'stats' && <EmptyPlans planMode="Today Tasks" />}
				</ul>
			)}
		</div>
	);
});
