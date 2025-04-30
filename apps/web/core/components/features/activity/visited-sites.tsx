import { useTimeDailyActivity } from '@/core/hooks/features/useTimeDailyActivity';
import { VisitedItemSkeleton } from './components/visited-item-skeleton';
import { groupAppsByHour } from '@app/helpers/array-data';
import { useTranslations } from 'next-intl';
import VisitedItem from './components/visited-Item';
import { useMemo } from 'react';
// import { AppVisitedModal } from './components/app-visited-details';

export function VisitedSitesTab() {
	const { visitedSites, loading } = useTimeDailyActivity('SITE');
	const t = useTranslations();
	const sites = groupAppsByHour(visitedSites ?? []);

	const headers = useMemo(
		() => [
			{
				title: t('timer.VISITED_SITES'),
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
					{sites?.map((site, i) => (
						<div
							key={i}
							className="rounded-[1rem] p-[3px] bg-[linear-gradient(90deg,_rgba(185,147,230,1)_0%,_rgba(110,176,236,1)_100%)]"
						>
							<div className=" p-6 rounded-[1rem] bg-white dark:bg-[#26272C]">
								{site?.apps?.map((item, i) => (
									<div key={i} className="w-full">
										<VisitedItem
											app={item}
											totalMilliseconds={site?.totalMilliseconds}
											type="SITE"
										/>
									</div>
								))}
							</div>
						</div>
					))}
				</section>
				{visitedSites?.length < 1 && !loading && (
					<div className="hover:dark:bg-[#26272C] border dark:border-[#26272C] dark:bg-[#191a20] p-4 py-16 rounded-md flex justify-center items-center my-2">
						<p className="text-center">{t('timer.NO_VISITED_SITE_MESSAGE')}</p>
					</div>
				)}
				{loading && visitedSites?.length < 1 && (
					<>
						<VisitedItemSkeleton />
						<VisitedItemSkeleton />
					</>
				)}
			</div>
		</div>
	);
}
