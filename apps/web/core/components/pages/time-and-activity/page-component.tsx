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
import { ViewOption } from '../../common/view-select';
import { Breadcrumb } from '../../duplicated-components/breadcrumb';
import dynamic from 'next/dynamic';
import { TimeActivityPageSkeleton } from '@/core/components/common/skeleton/time-activity-page-skeleton';

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

const defaultViewOptions: ViewOption[] = [
	{ id: 'member', label: 'Member', checked: true },
	{ id: 'project', label: 'Project', checked: true },
	{ id: 'task', label: 'Task', checked: true },
	{ id: 'trackedHours', label: 'Tracked Hours', checked: true },
	{ id: 'earnings', label: 'Earnings', checked: true },
	{ id: 'activityLevel', label: 'Activity Level', checked: true }
];

const TimeActivityComponents = () => {
	const { rapportDailyActivity, updateDateRange, loading } = useReportActivity({ types: 'TEAM-DASHBOARD' });
	const [groupByType, setGroupByType] = useState<GroupByType>('daily');

	const handleGroupByChange = useCallback((type: GroupByType) => {
		setGroupByType(type);
	}, []);

	// Memoize column visibility checks
	const [viewOptions, setViewOptions] = useState<ViewOption[]>(() => {
		if (typeof window === 'undefined') return defaultViewOptions;

		const savedOptions = localStorage.getItem(STORAGE_KEY);
		if (!savedOptions) return defaultViewOptions;

		try {
			const parsedOptions = JSON.parse(savedOptions);
			if (!Array.isArray(parsedOptions)) return defaultViewOptions;
			return parsedOptions;
		} catch {
			return defaultViewOptions;
		}
	});

	const handleViewOptionsChange = useCallback((newOptions: ViewOption[]) => {
		setViewOptions(newOptions);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(newOptions));
	}, []);

	const t = useTranslations();
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
			{ title: 'Time and Activity', href: `/${currentLocale}/time-and-activity` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	// Show unified skeleton while data is loading
	if (loading || !rapportDailyActivity) {
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
							/>

							{/* Statistics Cards */}
							<div className="grid grid-cols-3 gap-[30px] w-full">
								<LazyCardTimeAndActivity title="Total Hours" value="1,020h" showProgress={false} />
								<LazyCardTimeAndActivity
									title="Average Activity"
									value="74%"
									showProgress={true}
									progress={74}
									progressColor="bg-[#0088CC]"
									isLoading={false}
								/>
								<LazyCardTimeAndActivity
									title="Total Earnings"
									value="1,200.00 USD"
									showProgress={false}
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
