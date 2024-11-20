import { I_UserProfilePage, useLiveTimerStatus } from '@app/hooks';
import { Divider, Text } from 'lib/components';
import { UserProfilePlans } from 'lib/features';
import { TaskCard } from './task/task-card';
import { I_TaskFilter } from './task/task-filters';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { ScreenCalendar } from './activity/screen-calendar';
import { cn } from 'lib/utils';
import { useScrollPagination } from '@app/hooks/features/usePagination';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	paginateTasks?: boolean;
};

/**
 * It displays a list of tasks, the first task being the active task and the rest being the last 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export function UserProfileTask({ profile, paginateTasks, tabFiltered }: Props) {
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
		<div className="flex flex-col w-full h-full mt-10">
			{tabFiltered.tab === 'worked' &&
				(profile.member?.employee?.isTrackingTime || (profile.isAuthUser && timerStatus?.running)) &&
				otherTasks.length > 0 && (
					/* Displaying the current time. */
					<div className="flex items-center mb-3 gap-x-2 w-fit">
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
					<TaskCard
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
			{tabFiltered.tab === 'stats' && <ScreenCalendar />}
			{tabFiltered.tab === 'dailyplan' && <UserProfilePlans />}

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
					{slicedItems.map((task) => {
						return (
							<li key={task.id}>
								<TaskCard
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
					})}
				</ul>
			)}
		</div>
	);
}
