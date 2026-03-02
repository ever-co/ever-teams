import { I_UserProfilePage, useLiveTimerStatus } from '@/core/hooks';
import { Divider, Text } from '@/core/components';
import { I_TaskFilter } from './task-filters';
import { useTranslations } from 'next-intl';
import { ComponentProps, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/core/lib/helpers';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useTaskFilterCache } from '@/core/hooks/common/use-memoized-cache';
import { UserProfilePlans } from '@/core/components/users/user-profile-plans';
import { EmptyPlans } from '@/core/components/daily-plan';
import { TUser } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { LazyActivityCalendar, LazyTaskCard } from '@/core/components/optimized-components';
import { ActivityCalendarSkeleton } from '../../common/skeleton/activity-calendar-skeleton';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { TaskCardSkeleton } from '../../common/skeleton/profile-component-skeletons';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
	paginateTasks?: boolean;
	useVirtualization?: boolean;
	user?: TUser;
	employeeId?: string; // Accept employeeId to pass to UserProfilePlans
};
/**
 * It displays a list of tasks, the first task being the active task and the rest being the last 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export const UserProfileTask = memo(
	({ profile, tabFiltered, useVirtualization = false, user, employeeId }: Props) => {
		const t = useTranslations();
		// Get current timer seconds
		const { time, timerStatus } = useLiveTimerStatus();

		// Initialize cache for expensive operations
		const { memoizeTaskFilter } = useTaskFilterCache();

		// Use direct values for critical updates (task assignments) to ensure immediate sync
		// Only defer for non-critical rendering optimizations
		const deferredTabFiltered = tabFiltered; // Direct value for immediate task updates
		const deferredProfile = profile; // Direct value for immediate task updates

		/**
		 * Optimized task filtering with intelligent caching (PRESERVE EXISTING LOGIC)
		 */
		const otherTasks = useMemo(() => {
			return memoizeTaskFilter(
				() => {
					const tasks = deferredTabFiltered.tasksFiltered;
					const isRunning = deferredProfile.member?.running === true;
					const activeTaskId = deferredProfile.activeUserTeamTask?.id;

					// Deduplicate tasks to prevent duplicate keys in React rendering
					// This fixes the "Encountered two children with the same key" error
					const seen = new Set();
					const uniqueTasks = tasks.filter((task) => {
						if (seen.has(task.id)) {
							return false;
						}
						seen.add(task.id);
						return true;
					});

					// Early return if no filtering needed
					if (!isRunning || !activeTaskId) {
						return uniqueTasks;
					}

					return uniqueTasks.filter((task) => task.id !== activeTaskId);
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
				{tabFiltered.tab === 'dailyplan' && (
					<UserProfilePlans filteredTasks={otherTasks} user={user} employeeId={employeeId} />
				)}

				{tabFiltered.tab === 'worked' && otherTasks.length > 0 && (
					<div className="flex items-center my-6 space-x-2">
						<Text className="font-normal">
							{t('common.LAST_24_HOURS')} ({otherTasks.length})
						</Text>
						<Divider className="flex-1" />
					</div>
				)}

				{tabFiltered.tab !== 'dailyplan' && (
					<TaskList
						enableVirtualization={useVirtualization || otherTasks.length > ITEMS_LENGTH_TO_VIRTUALIZED}
						items={otherTasks as TTask[]}
						tabFiltered={tabFiltered}
						profile={profile}
					/>
				)}
			</div>
		);
	}
);
/**
 * Cache to track which tasks have already been rendered.
 * Prevents showing skeleton for tasks that were already displayed.
 */
const renderedTasksCache = new Set<string>();

/**
 * Deferred TaskCard — shows a skeleton on FIRST frame,
 * then swaps to the real card on the NEXT frame.
 *
 * Why? Because the virtualizer mounts new items during scroll.
 * If TaskCard is heavy (50-100ms), the user sees a freeze.
 * With this wrapper, they see a skeleton instantly → no freeze.
 *
 * Cache optimization: Once a task has been rendered, it won't show
 * the skeleton again when scrolling back to it. This prevents flickering.
 */
const DeferredTaskCard = memo((props: ComponentProps<typeof LazyTaskCard>) => {
	const taskId = props.task?.id;
	const wasRendered = taskId ? renderedTasksCache.has(taskId) : false;
	const [isReady, setIsReady] = useState(wasRendered);

	useEffect(() => {
		// Skip animation frame if task was already rendered or task is null
		if (wasRendered || !taskId) return;

		// Schedule the real render for the NEXT animation frame
		//    This lets the browser paint the placeholder FIRST
		const frameId = requestAnimationFrame(() => {
			setIsReady(true);
			renderedTasksCache.add(taskId);
		});

		return () => cancelAnimationFrame(frameId);
	}, [taskId, wasRendered]);

	if (!isReady) {
		return (
			<div className="min-h-28">
				<TaskCardSkeleton />
			</div>
		);
	}

	return <LazyTaskCard {...props} />;
});
DeferredTaskCard.displayName = 'DeferredTaskCard';

const LIST_GAP = 16;
// Optimized TaskList component to prevent unnecessary re-renders
const TaskList = memo(
	({
		items,
		tabFiltered,
		profile,
		enableVirtualization
	}: {
		items: TTask[];
		tabFiltered: I_TaskFilter;
		profile: I_UserProfilePage;
		enableVirtualization?: boolean;
	}) => {
		// Track the offset element height dynamically
		const [scrollMargin, setScrollMargin] = useState(0);

		// Memoize computed values to prevent recalculation
		const viewType = useMemo(() => (tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'), [tabFiltered.tab]);

		const isAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);

		// Virtualizer with options - use 0 if items is null
		const virtualiser = useWindowVirtualizer({
			count: items?.length ?? 0,
			estimateSize: () => 112 + LIST_GAP,
			overscan: 4,
			scrollMargin,
			enabled: enableVirtualization
		});

		useEffect(() => {
			const offsetEl = document.querySelector<HTMLElement>('[data-layout="main-scroll-offset"]');
			if (!offsetEl) return;

			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					setScrollMargin(entry.contentRect.height);
				}
			});

			// Set initial value
			setScrollMargin(offsetEl.getBoundingClientRect().height);
			observer.observe(offsetEl);

			return () => observer.disconnect();
		}, []);

		// Memoize the task badge class calculation
		const getTaskBadgeClassName = useCallback(
			(issueType: string) =>
				cn(
					issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
					'rounded-sm'
				),
			[]
		);

		// Early return if items is null/undefined or empty
		const hasActiveTask =
			tabFiltered.tab === 'worked' &&
			(profile.member?.employee?.isTrackingTime || (profile.isAuthUser && profile.activeUserTeamTask));

		if (!items || items.length === 0) {
			// Only show EmptyPlans for task-related tabs, not for dailyplan or stats
			if (tabFiltered.tab === 'stats' || tabFiltered.tab === 'dailyplan') {
				return null;
			}

			// Don't show EmptyPlans if there's an active task displayed above
			if (hasActiveTask) {
				return null; // Active task is already shown, no need for empty state
			}

			// Show appropriate empty state based on tab
			const planMode = tabFiltered.tab === 'worked' ? 'Today Tasks' : 'All Tasks';
			return <EmptyPlans planMode={planMode} />;
		}

		if (!enableVirtualization) {
			return (
				<ul className="flex flex-col gap-4">
					{items.map((task) => {
						return (
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
						);
					})}
				</ul>
			);
		}
		return (
			<ul
				style={{
					height: `${virtualiser.getTotalSize()}px`,
					width: '100%',
					position: 'relative'
				}}
			>
				{virtualiser.getVirtualItems().map((virtualItem) => {
					const task = items[virtualItem.index];
					return (
						<li
							key={virtualItem.key}
							data-index={virtualItem.index}
							ref={virtualiser.measureElement}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								transform: `translateY(${virtualItem.start - scrollMargin}px)`,
								boxSizing: 'border-box',
								paddingBottom: `${LIST_GAP}px`
							}}
						>
							<DeferredTaskCard
								task={task}
								isAuthUser={isAuthUser}
								activeAuthTask={false}
								viewType={viewType}
								profile={profile}
								taskBadgeClassName={getTaskBadgeClassName(task.issueType || '')}
								taskTitleClassName="mt-[0.0625rem]"
							/>
						</li>
					);
				})}
			</ul>
		);
	}
);

TaskList.displayName = 'TaskList';
