import { I_UserProfilePage, useLiveTimerStatus } from '@/core/hooks';
import { Divider, Text } from '@/core/components';
import { I_TaskFilter } from './task-filters';
import { useTranslations } from 'next-intl';
import { memo, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
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

// Memoized components to avoid unnecessary re-renders
const CurrentTimeDisplay = memo(({ time, t }: { time: any; t: any }) => (
	<div className="flex gap-x-2 items-center mb-3 w-fit">
		<Text className="font-normal">{t('common.NOW')}</Text>
		<Divider className="flex-1" />
		<div className="flex items-center space-x-4">
			<Text className="text-xs font-normal text-gray-500">{t('common.TOTAL_TIME')}:</Text>
			<Text className="font-normal">
				{time.h}h : {time.m}m
			</Text>
		</div>
	</div>
));

const NonAuthTimeDisplay = memo(({ t }: { t: any }) => (
	<div className="flex gap-x-2 items-center mb-3 w-fit">
		<Text className="font-normal">{t('common.NOW')}</Text>
		<Divider className="flex-1" />
		<div className="flex items-center space-x-4">
			<Text className="text-xs font-normal text-gray-500">{t('common.TOTAL_TIME')}:</Text>
			<Text className="font-normal">00h : 00m</Text>
		</div>
	</div>
));

const ActiveTaskCard = memo(
	({
		profile,
		taskBadgeClassName,
		taskTitleClassName
	}: {
		profile: I_UserProfilePage;
		taskBadgeClassName: string;
		taskTitleClassName: string;
	}) => (
		<LazyTaskCard
			active
			task={profile.activeUserTeamTask}
			isAuthUser={profile.isAuthUser}
			activeAuthTask={true}
			profile={profile}
			taskBadgeClassName={taskBadgeClassName}
			taskTitleClassName={taskTitleClassName}
		/>
	)
);

const Last24HoursHeader = memo(({ t, otherTasksLength }: { t: any; otherTasksLength: number }) => (
	<div className="flex items-center my-6 space-x-2">
		<Text className="font-normal">
			{t('common.LAST_24_HOURS')} ({otherTasksLength})
		</Text>
		<Divider className="flex-1" />
	</div>
));

const TasksList = memo(
	({
		slicedItems,
		tabFiltered,
		profile,
		taskBadgeClassName,
		taskTitleClassName
	}: {
		slicedItems: any[];
		tabFiltered: I_TaskFilter;
		profile: I_UserProfilePage;
		taskBadgeClassName: (task: any) => string;
		taskTitleClassName: string;
	}) => (
		<ul className="flex flex-col gap-4">
			{slicedItems.length > 0
				? slicedItems.map((task) => (
						<li key={task.id}>
							<LazyTaskCard
								key={task.id}
								task={task}
								isAuthUser={profile.isAuthUser}
								activeAuthTask={false}
								viewType={tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'}
								profile={profile}
								taskBadgeClassName={taskBadgeClassName(task)}
								taskTitleClassName={taskTitleClassName}
							/>
						</li>
					))
				: tabFiltered.tab !== 'stats' && <EmptyPlans planMode="Today Tasks" />}
		</ul>
	)
);

/**
 * It displays a list of tasks, the first task being the active task and the rest being the last 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export const UserProfileTask = memo(({ profile, paginateTasks, tabFiltered, user }: Props) => {
	const [scrollableContainer, setScrollableContainer] = useState<HTMLDivElement | null>(null);
	const t = useTranslations();
	const { time, timerStatus } = useLiveTimerStatus();

	// Memoization of filtered tasks
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

	// Memoization of complex conditions
	const isTrackingTime = useMemo(
		() => profile.member?.employee?.isTrackingTime || (profile.isAuthUser && timerStatus?.running),
		[profile.member?.employee?.isTrackingTime, profile.isAuthUser, timerStatus?.running]
	);

	const shouldShowCurrentTime = useMemo(
		() => tabFiltered.tab === 'worked' && isTrackingTime && otherTasks.length > 0,
		[tabFiltered.tab, isTrackingTime, otherTasks.length]
	);

	const shouldShowActiveTask = useMemo(
		() => tabFiltered.tab === 'worked' && isTrackingTime,
		[tabFiltered.tab, isTrackingTime]
	);

	const shouldShowLast24Hours = useMemo(
		() => tabFiltered.tab === 'worked' && otherTasks.length > 0,
		[tabFiltered.tab, otherTasks.length]
	);

	const shouldShowTasksList = useMemo(() => tabFiltered.tab !== 'dailyplan', [tabFiltered.tab]);

	// Memoization of className functions
	const getTaskBadgeClassName = useCallback(
		(task: any) =>
			cn(
				task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
				'rounded-sm'
			),
		[]
	);

	const activeTaskBadgeClassName = useMemo(
		() =>
			cn(
				profile.activeUserTeamTask?.issueType === 'Bug'
					? '!px-[0.3312rem] py-[0.2875rem]'
					: '!px-[0.375rem] py-[0.375rem]',
				'rounded-sm'
			),
		[profile.activeUserTeamTask?.issueType]
	);

	const taskTitleClassName = 'mt-[0.0625rem]';

	// Map of conditional renders to optimize performances
	const tabContentMap = useMemo(
		() => ({
			stats: () => (
				<Suspense fallback={<ActivityCalendarSkeleton />}>
					<LazyActivityCalendar />
				</Suspense>
			),
			dailyplan: () => <UserProfilePlans user={user} />
		}),
		[user]
	);

	useEffect(() => {
		const scrollable = document.querySelector<HTMLDivElement>('div.custom-scrollbar');
		if (scrollable) {
			setScrollableContainer(scrollable);
		}
	}, []);

	return (
		<div className="flex flex-col mt-5 w-full h-full">
			{/* Display of current time */}
			{shouldShowCurrentTime &&
				(profile.isAuthUser ? <CurrentTimeDisplay time={time} t={t} /> : <NonAuthTimeDisplay t={t} />)}

			{/* Active task */}
			{shouldShowActiveTask && (
				<ActiveTaskCard
					profile={profile}
					taskBadgeClassName={activeTaskBadgeClassName}
					taskTitleClassName={taskTitleClassName}
				/>
			)}

			{/* Specific content for tabs */}
			{tabContentMap[tabFiltered.tab as keyof typeof tabContentMap]?.()}

			{/* Header for the last 24 hours*/}
			{shouldShowLast24Hours && <Last24HoursHeader t={t} otherTasksLength={otherTasks.length} />}

			{/* Tasks list */}
			{shouldShowTasksList && (
				<TasksList
					slicedItems={slicedItems}
					tabFiltered={tabFiltered}
					profile={profile}
					taskBadgeClassName={getTaskBadgeClassName}
					taskTitleClassName={taskTitleClassName}
				/>
			)}
		</div>
	);
});
