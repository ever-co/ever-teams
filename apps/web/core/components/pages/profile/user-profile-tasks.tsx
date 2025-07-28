import { I_UserProfilePage, useLiveTimerStatus } from '@/core/hooks';
import { Divider, Text } from '@/core/components';
import { I_TaskFilter } from './task-filters';
import { useTranslations } from 'next-intl';
import { memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { cn } from '@/core/lib/helpers';
import { useScrollPagination } from '@/core/hooks/common/use-pagination';
import { useTaskFilterCache } from '@/core/hooks/common/use-memoized-cache';
import { useTaskVirtualization } from '@/core/hooks/common/use-tanstack-virtual';
import { UserProfilePlans } from '@/core/components/users/user-profile-plans';
import { EmptyPlans } from '@/core/components/daily-plan';
import { TUser } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { LazyActivityCalendar, LazyTaskCard } from '@/core/components/optimized-components';
import { ActivityCalendarSkeleton } from '../../common/skeleton/activity-calendar-skeleton';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	paginateTasks?: boolean;
	useVirtualization?: boolean;
	user?: TUser;
};
/**
 * It displays a list of tasks, the first task being the active task and the rest being the last 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export const UserProfileTask = memo(
	({ profile, paginateTasks, tabFiltered, useVirtualization = false, user }: Props) => {
		const [scrollableContainer, setScrollableContainer] = useState<HTMLDivElement | null>(null);

		const t = useTranslations();
		// Get current timer seconds
		const { time, timerStatus } = useLiveTimerStatus();

		// Initialize cache for expensive operations
		const { memoizeTaskFilter } = useTaskFilterCache();

		// Defer non-critical updates to improve responsiveness (OPTIMISATION CONSERVATIVE)
		const deferredTabFiltered = useDeferredValue(tabFiltered);
		const deferredProfile = useDeferredValue(profile);

		/**
		 * Optimized task filtering with intelligent caching (PRESERVE EXISTING LOGIC)
		 */
		const otherTasks = useMemo(() => {
			return memoizeTaskFilter(
				() => {
					const tasks = deferredTabFiltered.tasksFiltered;
					const isRunning = deferredProfile.member?.running === true;
					const activeTaskId = deferredProfile.activeUserTeamTask?.id;

					// Early return if no filtering needed
					if (!isRunning || !activeTaskId) {
						return tasks;
					}

					return tasks.filter((task: any) => task.id !== activeTaskId);
				},
				deferredTabFiltered.tasksFiltered,
				{
					isRunning: deferredProfile.member?.running,
					activeTaskId: deferredProfile.activeUserTeamTask?.id,
					tab: deferredTabFiltered.tab
				}
			);
		}, [
			memoizeTaskFilter,
			deferredTabFiltered.tasksFiltered,
			deferredTabFiltered.tab,
			deferredProfile.member?.running,
			deferredProfile.activeUserTeamTask?.id
		]);

		const { slicedItems } = useScrollPagination({
			enabled: !!paginateTasks && !useVirtualization,
			items: otherTasks,
			scrollableElement: scrollableContainer,
			defaultItemsPerPage: 20
		});

		// Optimized scroll container setup with useCallback
		const setupScrollContainer = useCallback(() => {
			const scrollable = document.querySelector<HTMLDivElement>('div.custom-scrollbar');
			if (scrollable && scrollable !== scrollableContainer) {
				setScrollableContainer(scrollable);
			}
		}, [scrollableContainer]);

		useEffect(() => {
			setupScrollContainer();

			// Setup ResizeObserver for dynamic container detection
			const resizeObserver = new ResizeObserver(() => {
				setupScrollContainer();
			});

			const targetElement = document.body;
			resizeObserver.observe(targetElement);

			return () => {
				resizeObserver.disconnect();
			};
		}, [setupScrollContainer]);

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

				{tabFiltered.tab !== 'dailyplan' &&
					(useVirtualization && otherTasks.length > 20 ? (
						<TanStackVirtualizedTaskList
							tasks={otherTasks as TTask[]}
							tabFiltered={tabFiltered}
							profile={profile}
						/>
					) : (
						<TaskList slicedItems={slicedItems as TTask[]} tabFiltered={tabFiltered} profile={profile} />
					))}
			</div>
		);
	}
);

// Optimized TaskList component to prevent unnecessary re-renders
const TaskList = memo(
	({
		slicedItems,
		tabFiltered,
		profile
	}: {
		slicedItems: TTask[];
		tabFiltered: I_TaskFilter;
		profile: I_UserProfilePage;
	}) => {
		// Memoize computed values to prevent recalculation
		const viewType = useMemo(() => (tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'), [tabFiltered.tab]);

		const isAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);

		// Memoize the task badge class calculation
		const getTaskBadgeClassName = useCallback(
			(issueType: string) =>
				cn(
					issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
					'rounded-sm'
				),
			[]
		);

		if (slicedItems.length === 0) {
			return tabFiltered.tab !== 'stats' ? <EmptyPlans planMode="Today Tasks" /> : null;
		}

		return (
			<ul className="flex flex-col gap-4">
				{slicedItems.map((task) => (
					<li key={task.id}>
						<LazyTaskCard
							task={task}
							isAuthUser={isAuthUser}
							activeAuthTask={false}
							viewType={viewType}
							profile={profile}
							taskBadgeClassName={getTaskBadgeClassName(task.issueType || '')}
							taskTitleClassName="mt-[0.0625rem]"
						/>
					</li>
				))}
			</ul>
		);
	}
);

TaskList.displayName = 'TaskList';

// TanStack Virtualized TaskList for large datasets
const TanStackVirtualizedTaskList = memo(
	({ tasks, tabFiltered, profile }: { tasks: TTask[]; tabFiltered: I_TaskFilter; profile: I_UserProfilePage }) => {
		const containerHeight = 600; // Adjust based on your layout
		const itemHeight = 120; // Approximate height of each TaskCard

		const virtualizationResult = useTaskVirtualization(
			tasks,
			containerHeight,
			itemHeight,
			true,
			tasks.length > 100 // Use window virtualization for very large lists
		);

		const { virtualItems, isScrolling } = virtualizationResult;

		// Handle both container and window virtualization
		const isWindowVirtualization = tasks.length > 100;
		const parentRef = 'parentRef' in virtualizationResult ? virtualizationResult.parentRef : null;
		const containerStyle =
			'containerStyle' in virtualizationResult
				? virtualizationResult.containerStyle
				: { height: containerHeight };
		const innerStyle =
			'innerStyle' in virtualizationResult
				? virtualizationResult.innerStyle
				: { height: virtualizationResult.totalSize };

		// Memoize computed values
		const viewType = useMemo(() => (tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'), [tabFiltered.tab]);

		const isAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);

		const getTaskBadgeClassName = useCallback(
			(issueType: string) =>
				cn(
					issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
					'rounded-sm'
				),
			[]
		);

		if (tasks.length === 0) {
			return tabFiltered.tab !== 'stats' ? <EmptyPlans planMode="Today Tasks" /> : null;
		}

		// Render based on virtualization type
		if (isWindowVirtualization) {
			// Window virtualization - no container needed
			return (
				<div style={{ height: virtualizationResult.totalSize, position: 'relative' }}>
					{virtualItems.map((virtualItem) => (
						<div
							key={virtualItem.key}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`
							}}
						>
							<div className="px-1 pb-4">
								<LazyTaskCard
									task={virtualItem.item}
									isAuthUser={isAuthUser}
									activeAuthTask={false}
									viewType={viewType}
									profile={profile}
									taskBadgeClassName={getTaskBadgeClassName(virtualItem.item.issueType || '')}
									taskTitleClassName="mt-[0.0625rem]"
								/>
							</div>
						</div>
					))}
					{isScrolling && (
						<div className="fixed top-2 right-2 z-50 px-2 py-1 text-xs rounded h-50 dark:text-white bg-black/50">
							Scrolling...
						</div>
					)}
				</div>
			);
		}

		// Container virtualization
		return (
			<div style={containerStyle} ref={parentRef} className="custom-scrollbar">
				<div style={innerStyle}>
					{virtualItems.map((virtualItem) => (
						<div
							key={virtualItem.key}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`
							}}
						>
							<div className="px-1 pb-4">
								<LazyTaskCard
									task={virtualItem.item}
									isAuthUser={isAuthUser}
									activeAuthTask={false}
									viewType={viewType}
									profile={profile}
									taskBadgeClassName={getTaskBadgeClassName(virtualItem.item.issueType || '')}
									taskTitleClassName="mt-[0.0625rem]"
								/>
							</div>
						</div>
					))}
				</div>
				{isScrolling && (
					<div className="absolute top-2 right-2 px-2 py-1 text-xs text-white rounded bg-black/50">
						Scrolling...
					</div>
				)}
			</div>
		);
	}
);

TanStackVirtualizedTaskList.displayName = 'TanStackVirtualizedTaskList';
