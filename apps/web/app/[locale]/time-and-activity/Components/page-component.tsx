'use client';
import { withAuthentication } from '@/lib/app/authenticator';
import { MainLayout } from '@/lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/app/stores/fullWidth';
import { useParams } from 'next/navigation';
import { Breadcrumb, Container } from '@/lib/components';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import React, { useMemo } from 'react';
import TimeActivityHeader, { ViewOption, defaultViewOptions } from './time-activity-header';
import CardTimeAndActivity from './card-time-and-activity';
import { Card } from '@components/ui/card';
import ActivityTable from './ActivityTable';
import { exampleData } from './example-usage';
import { useOrganizationProjects, useOrganizationTeams, useTeamTasks } from '@/app/hooks';
import { useOrganizationAndTeamManagers } from '@/app/hooks/features/useOrganizationTeamManagers';
import { useReportActivity } from '@/app/hooks/features/useReportActivity';

const STORAGE_KEY = 'ever-teams-activity-view-options';

const TimeActivityComponents = () => {
	const { rapportDailyActivity, updateDateRange } = useReportActivity({ types: 'TEAM-DASHBOARD' });
	// Memoize column visibility checks
	console.log('rapportDailyActivity', rapportDailyActivity);
	const [viewOptions, setViewOptions] = React.useState<ViewOption[]>(() => {
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

	const handleViewOptionsChange = React.useCallback((newOptions: ViewOption[]) => {
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
							<TimeActivityHeader
								viewOptions={viewOptions}
								onViewOptionsChange={handleViewOptionsChange}
								userManagedTeams={userManagedTeams}
								projects={organizationProjects}
								tasks={tasks}
								activeTeam={activeTeam}
								onUpdateDateRange={updateDateRange}
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
					<ActivityTable period={exampleData} viewOptions={viewOptions} />
				</Card>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(TimeActivityComponents, { displayName: 'Time and Activity' });
