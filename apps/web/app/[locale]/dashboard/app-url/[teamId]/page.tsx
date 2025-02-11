'use client';
import { fullWidthState } from '@/app/stores/fullWidth';
import { withAuthentication } from '@/lib/app/authenticator';
import { MainLayout } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Card, Container } from '@/lib/components';
import { DashboardHeader } from '../../team-dashboard/[teamId]/components/dashboard-header';
import { useReportActivity } from '@/app/hooks/features/useReportActivity';

interface ProductivityData {
  date: string;
  productive: number;
  neutral: number;
  unproductive: number;
}

function AppUrls() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const { updateDateRange, updateFilters, isManage } = useReportActivity();

	const router = useRouter();
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;

	const monthData: ProductivityData[] = [
		{ date: '2024-10-01', productive: 70, neutral: 20, unproductive: 10 },
		{ date: '2024-10-02', productive: 75, neutral: 15, unproductive: 10 },
		{ date: '2024-10-03', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-04', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-05', productive: 75, neutral: 20, unproductive: 5 },
		{ date: '2024-10-06', productive: 65, neutral: 25, unproductive: 10 },
		{ date: '2024-10-07', productive: 90, neutral: 5, unproductive: 5 },
		{ date: '2024-10-08', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-09', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-10', productive: 70, neutral: 20, unproductive: 10 },
		{ date: '2024-10-11', productive: 60, neutral: 30, unproductive: 10 },
		{ date: '2024-10-12', productive: 75, neutral: 15, unproductive: 10 },
		{ date: '2024-10-13', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-14', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-15', productive: 75, neutral: 20, unproductive: 5 },
		{ date: '2024-10-16', productive: 70, neutral: 20, unproductive: 10 },
		{ date: '2024-10-17', productive: 65, neutral: 25, unproductive: 10 },
		{ date: '2024-10-18', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-19', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-20', productive: 90, neutral: 5, unproductive: 5 },
		{ date: '2024-10-21', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-22', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-23', productive: 75, neutral: 20, unproductive: 5 },
		{ date: '2024-10-24', productive: 70, neutral: 20, unproductive: 10 },
		{ date: '2024-10-25', productive: 85, neutral: 10, unproductive: 5 },
		{ date: '2024-10-26', productive: 80, neutral: 15, unproductive: 5 },
		{ date: '2024-10-27', productive: 75, neutral: 20, unproductive: 5 },
		{ date: '2024-10-28', productive: 70, neutral: 20, unproductive: 10 },
		{ date: '2024-10-29', productive: 90, neutral: 5, unproductive: 5 },
		{ date: '2024-10-30', productive: 85, neutral: 10, unproductive: 5 }
	];

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
								onClick={() => router.back()}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex flex-col gap-6 w-full">
							<DashboardHeader
								onUpdateDateRange={updateDateRange}
								onUpdateFilters={updateFilters}
								title="Apps & URLs Dashboard"
								isManage={isManage}
							/>
							<Card shadow="bigger" className=" bg-white rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light h-[403px] p-8 py-0 px-0">
								<div className="flex flex-col gap-6 w-full">
									<div className="flex justify-between items-center h-[105px] w-full border-b border-b-gray-200 dark:border-b-gray-700">
										<div className="flex flex-col">
											<h2 className="text-xl font-semibold">October 2024</h2>
											<p className="text-gray-500">Productivity breakdown for October</p>
										</div>
										<div className="flex gap-4">
											<div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
												<span>{productivePercentage}% Productive</span>
												<div className="w-3 h-3 bg-blue-600 rounded"></div>
											</div>
											<div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
												<span>{neutralPercentage}% Neutral</span>
												<div className="w-3 h-3 bg-yellow-400 rounded"></div>
											</div>
											<div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
												<span>{unproductivePercentage}% Unproductive</span>
												<div className="w-3 h-3 bg-red-500 rounded"></div>
											</div>
										</div>
									</div>
									<div className="flex flex-col px-8 w-full">
										<div className="flex gap-[2px] h-[220px] w-full justify-between">
											{monthData.map((day) => (
												<div
													key={day.date}
													className="flex relative flex-col flex-1 justify-end cursor-pointer group">
													<div className="flex overflow-hidden absolute inset-0 flex-col justify-end">
														<div
															style={{ height: `${day.productive}%` }}
															className="w-full bg-[#1554E0] rounded-t-lg group-hover:opacity-80 transition-opacity duration-200"
														></div>
														<div
															style={{ height: `${day.unproductive}%` }}
															className="w-full bg-[#F56D58]  group-hover:opacity-80 transition-opacity duration-200"
														></div>
														<div
															style={{ height: `${day.neutral}%` }}
															className="w-full bg-[#FFB443] group-hover:opacity-80 transition-opacity duration-200"
														></div>
													</div>
												</div>
											))}
										</div>
										<div className="flex gap-[2px] w-full justify-between">
											{monthData.map((_, index) => (
												<div key={index} className="flex flex-1 justify-center">
													<span className="text-xs text-gray-500">
														{index + 1}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</Card>
						</div>
					</Container>
				</div>}
		></MainLayout>
	);
}

export default withAuthentication(AppUrls, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true
});
