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
import { Breadcrumb, Container } from '@/lib/components';
import { DashboardHeader } from '../../team-dashboard/[teamId]/components/dashboard-header';
import { useReportActivity } from '@/app/hooks/features/useReportActivity';
import { Card } from '@components/ui/card';

function AppUrls() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const { updateDateRange, updateFilters, isManage } = useReportActivity();

	const router = useRouter();
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;

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
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme-light">
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
							<Card className="w-full h-[403px] bg-white dark:bg-dark--theme-light border border-gray-200 rounded-xl">
								<div className="h-[105px] border-b-2 border-b-[rgba(40,32,72,0.08)] w-full flex justify-between items-center">
									<div className=" h-[105px] border-b-2 border-b-[rgba(40,32,72,0.08)] box-border">
										<div className="flex flex-col items-start p-0 gap-2 absolute left-4 top-6 w-[298px] h-12">
											<h3 className="w-[298px] h-6 font-inter font-semibold text-2xl leading-4 tracking-[-0.4px] text-[#282048] flex items-center">
												October 2024
											</h3>
											<p className="w-[298px] h-4 font-inter font-normal text-base leading-5 text-[#60646C] flex items-center">
												Productivity breakdown for October
											</p>
										</div>
									</div>
									<div className="flex">
										<div className=" w-[176px] h-[104px] bg-white dark:bg-dark--theme-light border-l border-[rgba(40,32,72,0.08)] box-border">
											<div className="flex flex-col items-start p-0 gap-2 absolute left-4 top-5.5 w-[102px] h-[61px]">
												<span className="w-[102px] h-7 font-inter font-bold text-4xl leading-9 text-[#282048] flex items-center">
													28%
												</span>
												<div className="flex items-center gap-2 w-[102px] h-6">
													<div className="flex items-center justify-center p-1 w-3 h-3 bg-[#FFB443] rounded-sm"></div>
													<span className="w-21 h-6 font-inter font-normal text-base leading-6 text-[#60646C] flex items-center">
														Neutral
													</span>
												</div>
											</div>
										</div>

										<div className=" w-[176px] h-[104px] bg-white dark:bg-dark--theme-light border-l border-[rgba(40,32,72,0.08)] box-border">
											<div className="flex flex-col items-start p-0 gap-2 absolute left-4 top-5.5 w-[102px] h-[61px]">
												<span className="w-[102px] h-7 font-inter font-bold text-4xl leading-9 text-[#282048] flex items-center">
													50%
												</span>
												<div className="flex items-center gap-2 w-[102px] h-6">
													<div className="flex items-center justify-center p-1 w-3 h-3 bg-[#1554E0] rounded-sm"></div>
													<span className="w-21 h-6 font-inter font-normal text-base leading-6 text-[#60646C] flex items-center">
														Productive
													</span>
												</div>
											</div>
										</div>

										<div className="w-[176px] h-[104px] border-l border-[rgba(40,32,72,0.08)] box-border">
											<div className="flex flex-col items-start p-0 gap-2 absolute left-4 top-5.5 w-[102px] h-[61px]">
												<span className="w-[102px] h-7 font-inter font-bold text-4xl leading-9 text-[#282048] flex items-center">
													22%
												</span>
												<div className="flex items-center gap-2 w-[102px] h-6">
													<div className="flex items-center justify-center p-1 w-3 h-3 bg-[#F56D58] rounded-sm"></div>
													<span className="w-26 h-6 font-inter font-normal text-base leading-6 text-[#60646C] flex items-center">
														Unproductive
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</Card>
						</div>
					</Container>
				</div>
			}
		></MainLayout>
	);
}

export default withAuthentication(AppUrls, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true
});
