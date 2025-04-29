'use client';
import { MainLayout } from '@/lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/app/stores/fullWidth';
import { Breadcrumb, Container } from '@/lib/components';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useMemo, useState, useCallback } from 'react';
import { Card } from '@components/ui/card';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@/app/hooks';
import { useOrganizationAndTeamManagers } from '@/app/hooks/features/useOrganizationTeamManagers';
import { GroupByType, useReportActivity } from '@/app/hooks/features/useReportActivity';
import CardTimeAndActivity from './card-time-and-activity';
import { TimeActivityTable } from './time-activity-table';
import ActivityTable from './activity-table';
import { ViewOption } from './view-select';
import { TimeActivityHeader } from './time-activity-header';

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

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark-high">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 items-center w-full')}>
						<div className="flex items-center w-full pt-6">
							<button
								onClick={handleBack}
								className="p-1 transition-colors rounded-full hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex flex-col w-full gap-6">
							<TimeActivityHeader
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
							<div className="grid grid-cols-3 gap-[30px] w-full">
								<CardTimeAndActivity title="Total Hours" value="1,020h" showProgress={false} />
								<CardTimeAndActivity
									title="Average Activity"
									value="74%"
									showProgress={true}
									progress={74}
									progressColor="bg-[#0088CC]"
									isLoading={false}
								/>
								<CardTimeAndActivity title="Total Earnings" value="1,200.00 USD" showProgress={false} />
							</div>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<Card className="w-full dark:bg-dark--theme-light min-h-[600px]">
					{(() => {
						switch (groupByType) {
							case 'daily':
								return (
									<ActivityTable
										rapportDailyActivity={rapportDailyActivity}
										viewOptions={viewOptions}
										isLoading={loading}
									/>
								);
							case 'weekly':
								return <TimeActivityTable data={rapportDailyActivity as any} loading={loading} />;
							default:
								return (
									<ActivityTable
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
