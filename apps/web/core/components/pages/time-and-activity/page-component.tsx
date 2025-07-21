'use client';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { Container } from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/core/components/common/card';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@/core/hooks';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { GroupByType, useReportActivity } from '@/core/hooks/activities/use-report-activity';
import { useTimeActivityStats } from '@/core/hooks/activities/use-time-activity-stats';
import { ViewOption } from '@/core/components/common/view-select';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import dynamic from 'next/dynamic';
import { TimeActivityPageSkeleton } from '@/core/components/common/skeleton/time-activity-page-skeleton';
import { FilterState } from '@/core/types/interfaces/timesheet/time-limit-report';

const LazyTimeActivityHeader = dynamic(
	() => import('./time-activity-header').then((mod) => ({ default: mod.TimeActivityHeader })),
	{
		ssr: false
	}
);

const LazyCardTimeAndActivity = dynamic(() => import('./card-time-and-activity'), {
	ssr: false
});

const LazyActivityTable = dynamic(() => import('./activity-table'), {
	ssr: false
});

const LazyTimeActivityTable = dynamic(
	() => import('./time-activity-table').then((mod) => ({ default: mod.TimeActivityTable })),
	{
		ssr: false
	}
);

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
	const { rapportDailyActivity, updateDateRange, loading, statisticsCounts, isManage, updateFilters } =
		useReportActivity({
			types: 'TEAM-DASHBOARD'
		});
	const [groupByType, setGroupByType] = useState<GroupByType>('daily');
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
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;
	const { isTrackingEnabled } = useOrganizationTeams();
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { activeTeam } = useOrganizationTeams();
	const { organizationProjects } = useOrganizationProjects();
	const { tasks } = useTeamTasks();

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: t('timeActivity.TIME_AND_ACTIVITY'), href: `/${currentLocale}/time-and-activity` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	// Show unified skeleton while data is loading
	if (loading && (!rapportDailyActivity || !activeTeam)) {
		return <TimeActivityPageSkeleton showTimer={isTrackingEnabled} fullWidth={fullWidth} />;
	}

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark-high">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 items-center w-full')}>
						<div className="flex items-center pt-6 w-full">
							<button
								onClick={handleBack}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex flex-col gap-6 w-full">
							{/* TimeActivityHeader with filters */}
							<LazyTimeActivityHeader
								viewOptions={viewOptions}
								onViewOptionsChange={handleViewOptionsChange}
								userManagedTeams={userManagedTeams}
								projects={organizationProjects}
								tasks={tasks}
								activeTeam={activeTeam}
								onUpdateDateRange={updateDateRange}
								onGroupByChange={handleGroupByChange}
								groupByType={groupByType}
								onFiltersApply={handleFiltersApply}
							/>

							{/* Statistics Cards */}
							<div className="grid grid-cols-3 gap-[30px] w-full">
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
									progressColor="bg-[#0088CC]"
									isLoading={statsLoading}
								/>
								<LazyCardTimeAndActivity
									title={t('timeActivity.TOTAL_EARNINGS')}
									value={totalEarnings}
									showProgress={false}
									isLoading={statsLoading}
								/>
							</div>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<Card className="w-full dark:bg-dark--theme-light min-h-[600px]">
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
								return <LazyTimeActivityTable data={rapportDailyActivity as any} loading={loading} />;
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
			</Container>
		</MainLayout>
	);
};
export { TimeActivityComponents };
