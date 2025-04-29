'use client';
import { fullWidthState } from '@/app/stores/fullWidth';
import { withAuthentication } from '@/lib/app/authenticator';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/lib/utils';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Container } from '@/core/components';
import { DashboardHeader } from '../../team-dashboard/[teamId]/components/dashboard-header';
import { GroupByType, useReportActivity } from '@/app/hooks/features/useReportActivity';
import { Card } from '@/core/components/ui/card';
import { useLocalStorageState, useModal } from '@/app/hooks';
import {
	ProductivityApplicationTable,
	ProductivityEmployeeTable,
	ProductivityProjectTable,
	ProductivityHeader,
	ProductivityChart,
	ProductivityStats,
	ProductivityTable
} from '../components';

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

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: 'Apps & URLs', href: `/${currentLocale}/dashboard/app-url` }
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
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark--theme">
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
							<DashboardHeader
								onUpdateDateRangeAction={updateDateRange}
								onUpdateFilters={updateFilters}
								onGroupByChange={handleGroupTypeChange}
								showGroupBy={true}
								title="Apps & URLs Dashboard"
								teamName="APPS-URLS"
								isManage={isManage}
								groupByType={groupByType}
								reportData={activityReport}
								startDate={new Date(currentFilters.startDate || '')}
								endDate={new Date(currentFilters.endDate || '')}
								closeModal={closeModal}
								isOpen={isOpen}
								openModal={openModal}
							/>
							<Card className="bg-white rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light h-[403px] p-8 py-0 px-0">
								<div className="flex flex-col w-full gap-6">
									<div className="flex justify-between items-center h-[105px] w-full border-b border-b-gray-200 dark:border-b-gray-700 pl-8">
										<ProductivityHeader month="October" year={2024} />
										<ProductivityStats
											productivePercentage={productivePercentage}
											neutralPercentage={neutralPercentage}
											unproductivePercentage={unproductivePercentage}
										/>
									</div>
									<div className="flex flex-col w-full px-8">
										<ProductivityChart data={monthData} />
									</div>
								</div>
							</Card>
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				{(() => {
					switch (groupByType) {
						case 'project':
							return <ProductivityProjectTable data={activityReport} isLoading={loading} />;
						case 'date':
							return <ProductivityTable data={activityReport} isLoading={loading} />;
						case 'employee':
							return <ProductivityEmployeeTable data={activityReport} isLoading={loading} />;
						case 'application':
							return <ProductivityApplicationTable data={activityReport} isLoading={loading} />;
					}
				})()}
			</Container>
		</MainLayout>
	);
}

export default withAuthentication(AppUrls, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true
});
