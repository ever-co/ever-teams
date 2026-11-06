'use client';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { ArrowLeft, Chart } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/core/components/common/card';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import {
	type GroupByType,
	getAppliedTeamsReportProps,
	useActivityFilters
} from '@/core/hooks/activities/use-activity-filters';
import { useActivityDailyReportQuery } from '@/core/hooks/activities/queries/use-activity-daily-report-query';
import { useActivityStatisticsQuery } from '@/core/hooks/activities/queries/use-activity-statistics-query';
import { useTimeActivityStats } from '@/core/hooks/activities/use-time-activity-stats';
import { ViewOption } from '@/core/components/common/view-select';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { TimeActivityPageSkeleton } from '@/core/components/common/skeleton/time-activity-page-skeleton';
import { FilterState } from '@/core/types/interfaces/timesheet/time-limit-report';
import {
	LazyTimeActivityHeader,
	LazyCardTimeAndActivity,
	LazyActivityTable,
	LazyWeeklyReportTable
} from '@/core/components/optimized-components/reports';
import { activeTeamState, isTrackingEnabledState, tasksByTeamState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';

const STORAGE_KEY = 'ever-teams-activity-view-options';

const getDefaultViewOptions = (t: any): ViewOption[] => [
	{ id: 'member', label: t('common.MEMBER'), checked: true },
	{ id: 'project', label: t('sidebar.PROJECTS'), checked: true },
	{ id: 'task', label: t('common.TASK'), checked: true },
	{ id: 'trackedHours', label: t('timeActivity.TRACKED_HOURS'), checked: true },
	{ id: 'earnings', label: t('timeActivity.EARNINGS'), checked: true },
	{ id: 'activityLevel', label: t('timeActivity.ACTIVITY_LEVEL'), checked: true }
];

const TimeActivityComponents = () => {
	const {
		mergedProps,
		enabled,
		currentFilters,
		updateDateRange,
		updateFilters,
		isManage,
		hasOrganizationWideAccess
	} = useActivityFilters();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	// The counts resolve the members of the applied teams from their ids; the time log reports have to name them
	const reportProps = useMemo(
		() => getAppliedTeamsReportProps(mergedProps, userManagedTeams, hasOrganizationWideAccess),
		[mergedProps, userManagedTeams, hasOrganizationWideAccess]
	);
	const { rapportDailyActivity, isLoading: isDailyLoading } = useActivityDailyReportQuery({
		mergedProps: reportProps,
		enabled
	});
	const { statisticsCounts, isLoading: isStatsLoading } = useActivityStatisticsQuery({ mergedProps, enabled });
	const loading = isDailyLoading || isStatsLoading;
	const [groupByType, setGroupByType] = useState<GroupByType>('daily');
	const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>(() => {
		// Initialize with current filter dates if available
		if (currentFilters?.startDate && currentFilters?.endDate) {
			return {
				startDate: new Date(currentFilters.startDate),
				endDate: new Date(currentFilters.endDate)
			};
		}
		return {};
	});
	const t = useTranslations();

	// Handle filter application from the filter popover
	const handleFiltersApply = useCallback(
		(filters: FilterState) => {
			// Convert filter state to the format expected by useReportActivity
			const filterParams = {
				// Extract IDs from the filter objects
				teamIds: filters.teams.map((team) => team.id),
				employeeIds: filters.members.map((member) => member.employee?.id || member.id).filter(Boolean),
				projectIds: filters.projects.map((project) => project.id),
				taskIds: filters.tasks.map((task) => task.id)
			};

			// Update the report activity filters
			updateFilters(filterParams);
		},
		[updateFilters]
	);

	// mergedProps takes its team ids from the team dashboard filter, so the teams picked in this page's filter are passed to the weekly report here
	const weeklyProps = useMemo(() => {
		const appliedTeamIds = currentFilters.teamIds;

		if (!reportProps || !appliedTeamIds?.length) return reportProps;

		return { ...reportProps, teamIds: appliedTeamIds };
	}, [reportProps, currentFilters.teamIds]);

	// Calculate dynamic statistics from real data
	const {
		totalHours,
		averageActivity,
		totalEarnings,
		isLoading: statsLoading
	} = useTimeActivityStats({
		statisticsCounts,
		rapportDailyActivity,
		isManage: isManage || false,
		loading
	});

	const handleGroupByChange = useCallback((type: GroupByType) => {
		setGroupByType(type);
	}, []);

	// Handle date range updates
	const handleUpdateDateRange = useCallback(
		(startDate: Date, endDate: Date) => {
			setDateRange({ startDate, endDate });
			updateDateRange(startDate, endDate);
		},
		[updateDateRange]
	);

	// Memoize column visibility checks
	const [viewOptions, setViewOptions] = useState<ViewOption[]>(() => {
		const defaultOptions = getDefaultViewOptions(t);
		if (typeof window === 'undefined') return defaultOptions;

		const savedOptions = localStorage.getItem(STORAGE_KEY);
		if (!savedOptions) return defaultOptions;

		try {
			const parsedOptions = JSON.parse(savedOptions);
			if (!Array.isArray(parsedOptions)) return defaultOptions;
			return parsedOptions;
		} catch {
			return defaultOptions;
		}
	});

	const handleViewOptionsChange = useCallback((newOptions: ViewOption[]) => {
		setViewOptions(newOptions);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(newOptions));
	}, []);

	const router = useRouter();
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;
	const { organizationProjects } = useOrganizationProjectsQuery();

	const tasks = useAtomValue(tasksByTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const activeTeam = useAtomValue(activeTeamState);

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: t('timeActivity.TIME_AND_ACTIVITY'), href: `/${currentLocale}/reports/time-and-activity` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	// Show unified skeleton while data is loading
	if (loading && (!rapportDailyActivity || !activeTeam)) {
		return <TimeActivityPageSkeleton showTimer={isTrackingEnabled} />;
	}

	return (
		<PageLayout
			showTimer={isTrackingEnabled}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleBack}
						className="shrink-0 text-muted-foreground"
						aria-label={t('common.BACK')}
					>
						<ArrowLeft />
					</Button>
					<Chart className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumbPath} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<div className="px-4 py-3">
					{/* TimeActivityHeader with filters */}
					<LazyTimeActivityHeader
						viewOptions={viewOptions}
						onViewOptionsChange={handleViewOptionsChange}
						userManagedTeams={userManagedTeams}
						projects={organizationProjects}
						tasks={tasks}
						activeTeam={activeTeam}
						onUpdateDateRange={handleUpdateDateRange}
						onGroupByChange={handleGroupByChange}
						groupByType={groupByType}
						onFiltersApply={handleFiltersApply}
						// Export-related props
						rapportDailyActivity={rapportDailyActivity}
						isManage={isManage || false}
						currentFilters={currentFilters as FilterState}
						startDate={dateRange.startDate}
						endDate={dateRange.endDate}
					/>
				</div>
			}
		>
			<div className="flex w-full flex-col gap-4">
				{/* Statistics Cards */}
				<Card className="grid w-full grid-cols-1 overflow-hidden hairline-divide-y divide-dashed divide-border sm:grid-cols-3 sm:hairline-divide-x sm:divide-y-0">
					<LazyCardTimeAndActivity
						title={t('timeActivity.TOTAL_HOURS')}
						value={totalHours}
						showProgress={false}
						isLoading={statsLoading}
					/>
					<LazyCardTimeAndActivity
						title={t('timeActivity.AVERAGE_ACTIVITY')}
						value={averageActivity}
						showProgress={true}
						progress={parseInt(averageActivity.replace('%', '')) || 0}
						progressColor="bg-primary"
						isLoading={statsLoading}
					/>
					<LazyCardTimeAndActivity
						title={t('timeActivity.TOTAL_EARNINGS')}
						value={totalEarnings}
						showProgress={false}
						isLoading={statsLoading}
					/>
				</Card>
				<Card className="w-full min-h-[600px] overflow-hidden">
					{/* Conditional table rendering based on groupByType */}
					{(() => {
						switch (groupByType) {
							case 'daily':
								return (
									<LazyActivityTable
										rapportDailyActivity={rapportDailyActivity}
										viewOptions={viewOptions}
										isLoading={loading}
									/>
								);
							case 'weekly':
								return (
									<LazyWeeklyReportTable
										mergedProps={weeklyProps}
										enabled={enabled}
										initialDate={dateRange.startDate}
									/>
								);
							default:
								return (
									<LazyActivityTable
										rapportDailyActivity={rapportDailyActivity}
										viewOptions={viewOptions}
										isLoading={loading}
									/>
								);
						}
					})()}
				</Card>
			</div>
		</PageLayout>
	);
};
export { TimeActivityComponents };
