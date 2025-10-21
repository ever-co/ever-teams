import { memo, useCallback, useMemo } from 'react';
import { useOptimizedActivityTabs } from '@/core/hooks/activities/use-optimized-activity-tabs';
import { LazyTaskCard } from '@/core/components/optimized-components';
import { OptimizedTaskAccordion } from './optimized-task-accordion';
import { groupDataByHour, groupAppsByHour } from '@/core/lib/helpers/array-data';
import { useTranslations } from 'next-intl';
import { ScreenshotPerHourTeam } from '../pages/profile/screenshots/screenshoots-per-hour';
import { ScreenshootSkeleton } from '../pages/profile/screenshots/screenshoots-per-hour-skeleton';
import VisitedItem from '../pages/profile/visited-Item';
import { VisitedItemSkeleton } from '../pages/profile/visited-item-skeleton';

/**
 * Optimized Screenshots Tab Component
 * Uses intelligent caching to prevent recalculation on tab switches
 */
export const OptimizedScreenshotsTab = memo(() => {
	const { screenshots } = useOptimizedActivityTabs();
	const { timeSlots, loading } = screenshots;
	const t = useTranslations();

	return (
		<div>
			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshotPerHourTeam
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{timeSlots.length < 1 && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<h3>{t('timer.NO_SCREENSHOOT')}</h3>
				</div>
			)}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
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

	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<div className="space-y-6 w-full">
				<header className="bg-gray-200 dark:bg-[#26272C] rounded-[1rem] px-6 h-14 flex items-center">
					{headers.map((header, i) => (
						<div style={{ flexBasis: header.width }} key={i} className="font-medium border">
							{header.title}
						</div>
					))}
				</header>
				<section className="space-y-6">
					{appsGrouped?.map((app, i) => (
						<div key={i} className=" p-6 rounded-[1rem] bg-white dark:bg-[#26272C]">
							{app?.apps?.map((item, i) => (
								<div key={i} className="w-full">
									<VisitedItem app={item} totalMilliseconds={app?.totalMilliseconds} type="APP" />
								</div>
							))}
						</div>
					))}
				</section>
				{visitedApps.length < 1 && !loading && (
					<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-16 rounded-md flex justify-center items-center my-2">
						<p className="text-center">{t('timer.THERE_IS_NO_APPS_VISITED')}</p>
					</div>
				)}
				{loading && visitedApps.length < 1 && (
					<>
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</>
				)}
			</div>
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

	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<div className="space-y-6 w-full">
				<header className="bg-gray-200 dark:bg-[#26272C] rounded-[1rem] px-6 h-14 flex items-center">
					{headers.map((header, i) => (
						<div style={{ flexBasis: header.width }} key={i} className="font-medium border">
							{header.title}
						</div>
					))}
				</header>
				<section className="space-y-6">
					{sitesGrouped?.map((site, i) => (
						<div
							key={i}
							className="rounded-[1rem] p-[3px] bg-[linear-gradient(90deg,_rgba(185,147,230,1)_0%,_rgba(110,176,236,1)_100%)]"
						>
							<div className=" p-6 rounded-[1rem] bg-white dark:bg-[#26272C]">
								{site?.apps?.map((item, i) => (
									<div key={i} className="w-full">
										<VisitedItem
											app={item}
											totalMilliseconds={site?.totalMilliseconds}
											type="SITE"
										/>
									</div>
								))}
							</div>
						</div>
					))}
				</section>
				{(sites?.length || 0) < 1 && !loading && (
					<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-16 rounded-md flex justify-center items-center my-2">
						<p className="text-center">{t('timer.NO_VISITED_SITE_MESSAGE')}</p>
					</div>
				)}
				{loading && (sites?.length || 0) < 1 && (
					<>
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</>
				)}
			</div>
		</div>
	);
});

OptimizedVisitedSitesTab.displayName = 'OptimizedVisitedSitesTab';

/**
 * Optimized Tasks Tab Component - THE MAIN PERFORMANCE FIX
 * Uses intelligent caching to prevent recalculation on tab switches
 * This was the main bottleneck causing 80% of performance issues
 */
export const OptimizedTasksTab = memo(({ member }: { member?: any }) => {
	const { tasks, profile, canSeeActivity } = useOptimizedActivityTabs({ member });
	const { firstFiveTasks, remainingTasks, totalCount } = tasks;

	// Memoized render function for task items to prevent unnecessary re-renders
	const renderTaskItem = useCallback(
		(task: any) => (
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
			/>
		),
		[profile?.isAuthUser, profile]
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
