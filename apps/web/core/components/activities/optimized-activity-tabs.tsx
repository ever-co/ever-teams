import { memo, useCallback, useMemo } from 'react';
import { useOptimizedActivityTabs } from '@/core/hooks/activities/use-optimized-activity-tabs';
import { LazyTaskCard } from '@/core/components/optimized-components';
import {
	DAY_GROUP_SURFACE_CLASS_NAME,
	DayGroupHeading,
	FLAT_TASK_ROW_CLASS_NAME
} from '@/core/components/tasks/daily-plan/day-group';
import { OptimizedTaskAccordion } from './optimized-task-accordion';
import { groupAppsByHour } from '@/core/lib/helpers/array-data';
import { useTranslations } from 'next-intl';
import { ScreenshotsTeamList } from '../pages/profile/screenshots/screenshoots';
import VisitedItem from '../pages/profile/visited-Item';
import { VisitedItemSkeleton } from '../pages/profile/visited-item-skeleton';
import { TrackingSourceEmptyState } from '../pages/profile/tracking-source-empty-state';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { ActivityListFrame } from './activity-list-frame';

/**
 * Optimized Screenshots Tab Component
 * Uses intelligent caching to prevent recalculation on tab switches
 */
export const OptimizedScreenshotsTab = memo(() => {
	const { screenshots } = useOptimizedActivityTabs();

	return <ScreenshotsTeamList timeSlots={screenshots.timeSlots} loading={screenshots.loading} />;
});

OptimizedScreenshotsTab.displayName = 'OptimizedScreenshotsTab';

/**
 * Optimized Apps Tab Component
 * Uses intelligent caching to prevent recalculation on tab switches
 */
export const OptimizedAppsTab = memo(() => {
	const { apps } = useOptimizedActivityTabs();
	const { visitedApps, loading } = apps;
	const t = useTranslations();
	const appsGrouped = groupAppsByHour(visitedApps ?? []);

	const headers = useMemo(
		() => [
			{
				title: t('timer.APPS'),
				width: '20%'
			},
			{
				title: t('timer.VISITED_DATES'),
				width: '25%'
			},
			{
				title: t('timer.PERCENT_USED'),
				width: '40%'
			},
			{
				title: t('timer.TIME_SPENT_IN_HOURS'),
				width: '15%'
			}
		],
		[t]
	);

	if (loading && visitedApps?.length < 1) {
		return <VisitedItemSkeleton />;
	}

	const hasNoApps = visitedApps.length < 1;
	const showsEmptyState = hasNoApps && !loading;
	const showsSkeleton = loading && hasNoApps;

	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<ActivityListFrame headers={headers}>
				<section className="hairline-divide-y divide-border">
					{appsGrouped?.map((app, i) => (
						<div key={i} className="hairline-divide-y divide-border px-4">
							{app?.apps?.map((item, i) => (
								<div key={i} className="w-full">
									<VisitedItem app={item} totalMilliseconds={app?.totalMilliseconds} type="APP" />
								</div>
							))}
						</div>
					))}
				</section>
				{showsEmptyState && (
					<div className="flex items-center justify-center px-4 py-12">
						<TrackingSourceEmptyState label={t('timer.THERE_IS_NO_APPS_VISITED')} />
					</div>
				)}
				{showsSkeleton && (
					<div className="px-4">
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</div>
				)}
			</ActivityListFrame>
		</div>
	);
});

OptimizedAppsTab.displayName = 'OptimizedAppsTab';

/**
 * Optimized Visited Sites Tab Component
 * Uses intelligent caching to prevent recalculation on tab switches
 */
export const OptimizedVisitedSitesTab = memo(() => {
	const { visitedSites } = useOptimizedActivityTabs();
	const { visitedSites: sites, loading } = visitedSites;
	const t = useTranslations();
	const sitesGrouped = groupAppsByHour(sites ?? []);

	const headers = useMemo(
		() => [
			{
				title: t('timer.VISITED_SITES'),
				width: '20%'
			},
			{
				title: t('timer.VISITED_DATES'),
				width: '25%'
			},
			{
				title: t('timer.PERCENT_USED'),
				width: '40%'
			},
			{
				title: t('timer.TIME_SPENT_IN_HOURS'),
				width: '15%'
			}
		],
		[t]
	);

	if (loading && sites.length < 1) {
		return <VisitedItemSkeleton />;
	}

	const hasNoSites = (sites?.length || 0) < 1;
	const showsEmptyState = hasNoSites && !loading;
	const showsSkeleton = loading && hasNoSites;

	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<ActivityListFrame headers={headers}>
				<section className="hairline-divide-y divide-border">
					{sitesGrouped?.map((site, i) => (
						<div key={i} className="hairline-divide-y divide-border px-4">
							{site?.apps?.map((item, i) => (
								<div key={i} className="w-full">
									<VisitedItem app={item} totalMilliseconds={site?.totalMilliseconds} type="SITE" />
								</div>
							))}
						</div>
					))}
				</section>
				{showsEmptyState && (
					<div className="flex items-center justify-center px-4 py-12">
						<TrackingSourceEmptyState label={t('timer.NO_VISITED_SITE_MESSAGE')} />
					</div>
				)}
				{showsSkeleton && (
					<div className="px-4">
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</div>
				)}
			</ActivityListFrame>
		</div>
	);
});

OptimizedVisitedSitesTab.displayName = 'OptimizedVisitedSitesTab';

/**
 * Optimized Tasks Tab Component - THE MAIN PERFORMANCE FIX
 * Uses intelligent caching to prevent recalculation on tab switches
 * This was the main bottleneck causing 80% of performance issues
 */
export const OptimizedTasksTab = memo(({ member, canSeeActivity }: { member?: any; canSeeActivity: boolean }) => {
	const t = useTranslations();
	const { tasks, profile } = useOptimizedActivityTabs({ member });
	const { firstFiveTasks, remainingTasks, totalCount } = tasks;
	const activeTaskId = profile?.activeUserTeamTask?.id;
	// Memoized render function for task items to prevent unnecessary re-renders
	// Include profile?.activeUserTeamTask?.id in dependencies to ensure re-render when active task changes
	// This prevents virtualized tasks from using stale timer handlers with old activeTeamTask values
	const renderTaskItem = useCallback(
		(task: TTask) => (
			<LazyTaskCard
				task={task}
				isAuthUser={profile?.isAuthUser}
				activeAuthTask={false}
				viewType="default"
				profile={profile}
				taskBadgeClassName={`${
					task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]'
				} rounded-sm`}
				taskTitleClassName="mt-[0.0625rem]"
				taskContentClassName="!w-72 !max-w-80"
				className={FLAT_TASK_ROW_CLASS_NAME}
			/>
		),
		[profile?.isAuthUser, profile, activeTaskId]
	);

	// Memoized scrolling indicator for virtualization
	const scrollingIndicator = useMemo(
		() => (
			<div className="flex gap-2 justify-center items-center">
				<span className="sr-only">Loading...</span>
				<div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
				<div className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
				<div className="size-2 rounded-full bg-primary animate-bounce" />
			</div>
		),
		[]
	);

	return (
		<div className="flex flex-col gap-3">
			{profile?.activeUserTeamTask && canSeeActivity && (
				<section className={DAY_GROUP_SURFACE_CLASS_NAME}>
					<div className="flex h-12 items-center px-4">
						<DayGroupHeading date={t('todayActivity.ACTIVE_TASK')} count={undefined} />
					</div>
					<div className="hairline-t border-border">
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
							className={FLAT_TASK_ROW_CLASS_NAME}
						/>
					</div>
				</section>
			)}

			{/* Optimized Task Accordion - First 5 tasks + remaining in accordion */}
			<OptimizedTaskAccordion
				firstFiveTasks={firstFiveTasks}
				remainingTasks={remainingTasks}
				totalCount={totalCount}
				profile={profile}
				canSeeActivity={canSeeActivity}
				useVirtualization={true}
				renderTaskItem={renderTaskItem}
				scrollingIndicator={scrollingIndicator}
			/>
		</div>
	);
});

OptimizedTasksTab.displayName = 'OptimizedTasksTab';
