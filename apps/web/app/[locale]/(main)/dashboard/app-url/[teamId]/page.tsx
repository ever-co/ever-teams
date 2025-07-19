'use client';
import { fullWidthState } from '@/core/stores/common/full-width';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { Container } from '@/core/components';

import { GroupByType, useReportActivity } from '@/core/hooks/activities/use-report-activity';
import { Card } from '@/core/components/common/card';
import { useOrganizationTeams } from '@/core/hooks/organizations';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useLocalStorageState, useModal } from '@/core/hooks/common';
import {
	ProductivityApplicationTable,
	ProductivityEmployeeTable,
	ProductivityProjectTable,
	ProductivityTable
} from '@/core/components/pages/dashboard/app-url';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { LazyDashboardHeader } from '@/core/components/pages/dashboard/team-dashboard/lazy-components';
import {
	ProductivityProjectTableSkeleton,
	ProductivityTableSkeleton,
	ProductivityEmployeeTableSkeleton,
	ProductivityApplicationTableSkeleton
} from '@/core/components/common/skeleton/productivity-skeletons';
import { ChartSkeleton } from '@/core/components/common/skeleton/chart-skeleton';
import { AppUrlsDashboardPageSkeleton } from '@/core/components/common/skeleton/app-urls-dashboard-page-skeleton';
import { ProductivityHeaderSkeleton } from '@/core/components/common/skeleton/productivity-header-skeleton';
import { ProductivityStatsSkeleton } from '@/core/components/common/skeleton/productivity-stats-skeleton';
import dynamic from 'next/dynamic';

const LazyProductivityChart = dynamic(
	() =>
		import('@/core/components/pages/dashboard/app-url/productivity-chart').then((mod) => ({
			default: mod.ProductivityChart
		})),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
);

// Lazy load ProductivityHeader for performance optimization
const LazyProductivityHeader = dynamic(
	() =>
		import('@/core/components/pages/dashboard/app-url').then((mod) => ({
			default: mod.ProductivityHeader
		})),
	{
		ssr: false,
		loading: () => <ProductivityHeaderSkeleton />
	}
);

// Lazy load ProductivityStats for performance optimization
const LazyProductivityStats = dynamic(
	() =>
		import('@/core/components/pages/dashboard/app-url').then((mod) => ({
			default: mod.ProductivityStats
		})),
	{
		ssr: false,
		loading: () => <ProductivityStatsSkeleton />
	}
);
interface ProductivityData {
	date: string;
	productive: number;
	neutral: number;
	unproductive: number;
}

function AppUrls() {
	const t = useTranslations();
	const router = useRouter();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;
	const { isTrackingEnabled } = useOrganizationTeams();
	const [groupByType, setGroupByType] = useLocalStorageState<GroupByType>('group-by-type', 'date');
	const { closeModal, isOpen, openModal } = useModal();
	const { user } = useAuthenticateUser();

	const { activityReport, handleGroupByChange, updateDateRange, updateFilters, currentFilters, isManage, loading } =
		useReportActivity({ types: 'APPS-URLS' });

	const handleGroupTypeChange = (type: GroupByType) => {
		setGroupByType(type);
		handleGroupByChange(type);
	};

	const generateMonthData = (date: Date): ProductivityData[] => {
		const year = date.getFullYear();
		const month = date.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		return Array.from({ length: daysInMonth }, (_, i) => ({
			date: new Date(year, month, i + 1).toISOString().split('T')[0],
			productive: Math.floor(Math.random() * 50) + 25,
			neutral: Math.floor(Math.random() * 40) + 20,
			unproductive: Math.floor(Math.random() * 35) + 15
		}));
	};

	const monthData = generateMonthData(new Date());
	const monthTotals = monthData.reduce(
		(acc, day) => ({
			productive: acc.productive + day.productive,
			neutral: acc.neutral + day.neutral,
			unproductive: acc.unproductive + day.unproductive
		}),
		{ productive: 0, neutral: 0, unproductive: 0 }
	);

	const totalTime = monthTotals.productive + monthTotals.neutral + monthTotals.unproductive;
	const productivePercentage = Math.round((monthTotals.productive / totalTime) * 100);
	const neutralPercentage = Math.round((monthTotals.neutral / totalTime) * 100);
	const unproductivePercentage = Math.round((monthTotals.unproductive / totalTime) * 100);

	// Transform UI data to PDF-compatible format when API data is empty
	const createPDFCompatibleData = () => {
		// If we have real API data, use it
		if (activityReport && activityReport.length > 0) {
			return activityReport;
		}

		// Get real user information
		const currentUser = user || null;
		const userFullName =
			currentUser?.fullName ||
			(currentUser?.firstName && currentUser?.lastName
				? `${currentUser.firstName} ${currentUser.lastName}`
				: currentUser?.name || 'Unknown User');

		const userFirstName = currentUser?.firstName || 'Unknown';
		const userLastName = currentUser?.lastName || 'User';
		const userId = currentUser?.id || 'unknown-user-id';
		const employeeId = currentUser?.employee?.id || 'unknown-employee-id';

		// Otherwise, create PDF-compatible data from UI data
		return monthData.slice(0, 7).map((day) => ({
			date: day.date,
			employees: [
				{
					employee: {
						id: employeeId,
						fullName: userFullName,
						user: {
							firstName: userFirstName,
							lastName: userLastName,
							id: userId
						}
					},
					projects: [
						{
							project: { name: 'Productivity Activities' },
							activity: [
								{
									title: 'Productive Work',
									duration: day.productive * 60, // Convert minutes to seconds
									duration_percentage: (
										(day.productive / (day.productive + day.neutral + day.unproductive)) *
										100
									).toFixed(1),
									employee: { fullName: userFullName },
									date: day.date,
									sessions: 1,
									employeeId: employeeId,
									projectId: 'productivity-project'
								},
								{
									title: 'Neutral Activities',
									duration: day.neutral * 60,
									duration_percentage: (
										(day.neutral / (day.productive + day.neutral + day.unproductive)) *
										100
									).toFixed(1),
									employee: { fullName: userFullName },
									date: day.date,
									sessions: 1,
									employeeId: employeeId,
									projectId: 'productivity-project'
								},
								{
									title: 'Unproductive Time',
									duration: day.unproductive * 60,
									duration_percentage: (
										(day.unproductive / (day.productive + day.neutral + day.unproductive)) *
										100
									).toFixed(1),
									employee: { fullName: userFullName },
									date: day.date,
									sessions: 1,
									employeeId: employeeId,
									projectId: 'productivity-project'
								}
							]
						}
					]
				}
			]
		}));
	};

	const pdfCompatibleData = createPDFCompatibleData();

	// Calculate current month and year from filters
	const startDate = new Date(currentFilters.startDate || new Date());
	const endDate = new Date(currentFilters.endDate || new Date());

	// Check if the date range spans multiple months
	const isSameMonth =
		startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

	const currentMonth = isSameMonth
		? startDate.toLocaleDateString('en-US', { month: 'long' })
		: `${startDate.toLocaleDateString('en-US', { month: 'short' })} - ${endDate.toLocaleDateString('en-US', { month: 'short' })}`;

	const currentYear = isSameMonth
		? startDate.getFullYear()
		: startDate.getFullYear() === endDate.getFullYear()
			? startDate.getFullYear()
			: `${startDate.getFullYear()}-${endDate.getFullYear()}`;

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: 'Apps & URLs', href: `/${currentLocale}/dashboard/app-url` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();
	const groupByMap = {
		project: (
			<Suspense fallback={<ProductivityProjectTableSkeleton />}>
				<ProductivityProjectTable data={activityReport} isLoading={loading} />
			</Suspense>
		),
		date: (
			<Suspense fallback={<ProductivityTableSkeleton />}>
				<ProductivityTable data={activityReport} isLoading={loading} />
			</Suspense>
		),
		employee: (
			<Suspense fallback={<ProductivityEmployeeTableSkeleton />}>
				<ProductivityEmployeeTable data={activityReport} isLoading={loading} />
			</Suspense>
		),
		member: (
			<Suspense fallback={<ProductivityEmployeeTableSkeleton />}>
				<ProductivityEmployeeTable data={activityReport} isLoading={loading} />
			</Suspense>
		),
		application: (
			<Suspense fallback={<ProductivityApplicationTableSkeleton />}>
				<ProductivityApplicationTable data={activityReport} isLoading={loading} />
			</Suspense>
		)
	};
	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (loading && (!activityReport || activityReport.length === 0)) {
		return <AppUrlsDashboardPageSkeleton showTimer={isTrackingEnabled} fullWidth={fullWidth} />;
	}

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark--theme">
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
							<LazyDashboardHeader
								onUpdateDateRangeAction={updateDateRange}
								onUpdateFilters={updateFilters}
								onGroupByChange={handleGroupTypeChange}
								showGroupBy={true}
								title={t('dashboard.APPS_URLS_DASHBOARD')}
								teamName="APPS-URLS"
								isManage={isManage}
								groupByType={groupByType}
								reportData={pdfCompatibleData}
								startDate={new Date(currentFilters.startDate || '')}
								endDate={new Date(currentFilters.endDate || '')}
								closeModal={closeModal}
								isOpen={isOpen}
								openModal={openModal}
							/>
							<Card className="bg-white rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light h-[403px] p-8 py-0 px-0">
								<div className="flex flex-col gap-6 w-full">
									<div className="flex justify-between items-center h-[105px] w-full border-b border-b-gray-200 dark:border-b-gray-700 pl-8">
										<LazyProductivityHeader month={currentMonth} year={currentYear} />
										<LazyProductivityStats
											productivePercentage={productivePercentage}
											neutralPercentage={neutralPercentage}
											unproductivePercentage={unproductivePercentage}
										/>
									</div>
									<div className="flex flex-col px-8 w-full">
										<LazyProductivityChart data={monthData} />
									</div>
								</div>
							</Card>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				{groupByMap[groupByType as keyof typeof groupByMap] || groupByMap.date}
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(AppUrls, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true
});
