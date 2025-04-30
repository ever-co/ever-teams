import { useTimeDailyActivity } from '@/core/hooks/features/useTimeDailyActivity';
import { VisitedItemSkeleton } from './components/visited-item-skeleton';
import { groupAppsByHour } from '@app/helpers/array-data';
import { useTranslations } from 'next-intl';
import VisitedItem from './components/visited-Item';
import { useMemo } from 'react';
// import { AppVisitedModal } from './components/app-visited-details';

export function AppsTab() {
	const { visitedApps, loading } = useTimeDailyActivity('APP');
	const t = useTranslations();
	const apps = groupAppsByHour(visitedApps ?? []);

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
	return (
		<div>
			<div className="flex justify-end w-full">{/* TODO: Filters components */}</div>
			<div className="w-full space-y-6">
				<header className="bg-gray-200 dark:bg-[#26272C] rounded-[1rem] px-6 h-14 flex items-center">
					{headers.map((header, i) => (
						<div style={{ flexBasis: header.width }} key={i} className="border font-medium">
							{header.title}
						</div>
					))}
				</header>
				<section className="space-y-6">
					{apps?.map((app, i) => (
						<div key={i} className=" p-6 rounded-[1rem] bg-white dark:bg-[#26272C]">
							{app?.apps?.map((item, i) => (
								<div key={i} className="w-full">
									{/* <AppVisitedModal> */}
									<VisitedItem app={item} totalMilliseconds={app?.totalMilliseconds} type="APP" />
									{/* </AppVisitedModal> */}
								</div>
							))}
						</div>
					))}
				</section>
				{visitedApps?.length < 1 && !loading && (
					<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-16 rounded-md flex justify-center items-center my-2">
						<p className="text-center">{t('timer.THERE_IS_NO_APPS_VISITED')}</p>
					</div>
				)}
				{loading && visitedApps?.length < 1 && (
					<>
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</>
				)}
			</div>
		</div>
	);
}
