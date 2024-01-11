import { ProgressBar } from 'lib/components';
import { ScreenshootPerHour } from './components/screenshoots-per-hour';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
import { groupDataByHour } from '@app/helpers/array-data';
import { useTranslations } from 'next-intl';
import { ScreenshootSkeleton } from './components/screenshoots-per-hour-skeleton';


export function ScreenshootTab() {
	const { timeSlots, loading } = useTimeSlots();
	const t = useTranslations();


	const hourPercent = timeSlots.reduce((acc, el) => acc + el.percentage, 0) / timeSlots.length;
	const activityPercent = hourPercent ?? 0;
	const totaHours = '1:20:34';
	return (
		<div>
			<div className="flex items-center gap-4">
				{/* Stats cards */}
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-32 bg-white dark:bg-[#26272C]">
					<span>{t('timer.TIME_ACTIVITY')}</span>
					<h2 className="text-3xl font-bold my-3">{activityPercent.toFixed(2)} %</h2>
					<ProgressBar width={'80%'} progress={`${activityPercent}%`} className="my-2" />
				</div>
				<div className="shadow rounded-md sm:w-1/2 lg:w-1/3 xl:w-1/4 p-4 h-32 bg-white dark:bg-[#26272C]">
					<span>{t('timer.TOTAL_HOURS')}</span>
					<h2 className="text-3xl font-bold my-3">{totaHours}</h2>
					<ProgressBar width={'80%'} progress={`${hourPercent}%`} />
				</div>
			</div>
			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshootPerHour
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{timeSlots.length < 1 && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<h3>{t('timer.NO_SCREENSHOOT')}</h3>
				</div>
			)}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
}
