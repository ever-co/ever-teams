import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { groupDataByHour } from '@/core/lib/helpers/array-data';
import { useTranslations } from 'next-intl';
import { useLiveTimerStatus } from '@/core/hooks';
import { ScreenshotPerHour, ScreenshotPerHourTeam } from './screenshoots-per-hour';
import { ScreenshootSkeleton } from './screenshoots-per-hour-skeleton';
import { ProgressBar } from '@/core/components/common/progress-bar';
import { SegmentedProgressBar } from '@/core/components/duplicated-components/_progress-bar';
import { TrackingSourceEmptyState } from '../tracking-source-empty-state';

export function ScreenshootTab() {
	const { loading, timeSlots } = useTimeSlots();
	const t = useTranslations();
	// The browser timer also creates time slots, without any screenshot attached.
	const hasScreenshots = timeSlots.some((slot) => slot.screenshots?.length);

	const activityPercent = timeSlots.reduce((acc, el) => acc + (el.percentage || 0), 0) / timeSlots.length;
	// const workedSeconds = timeSlots.reduce((acc, el) => acc + el.duration, 0);
	const {
		time: { h, m }
	} = useLiveTimerStatus();
	return (
		<div>
			<div className="flex items-center gap-4">
				{/* Activity */}
				<div className=" border-2 rounded-[1rem] p-6 min-h-[8rem] min-w-[20rem] flex flex-col justify-between gap-3  bg-white dark:bg-[#26272C]">
					<span>{t('timer.TIME_ACTIVITY')}</span>
					<div className="flex flex-col gap-3">
						<h2 className="text-3xl font-medium">
							{Number.isNaN(parseFloat(activityPercent.toFixed(2))) ? '0%' : activityPercent.toFixed(2)}
						</h2>
						<ProgressBar width={'80%'} progress={`${activityPercent}%`} />
					</div>
				</div>

				{/* Total hours */}
				<div className=" border-2 rounded-[1rem] p-6 min-h-[8rem] min-w-[20rem] flex flex-col justify-between gap-3  bg-white dark:bg-[#26272C]">
					<span>{t('timer.TOTAL_HOURS')}</span>
					<div className="flex flex-col gap-3">
						<h2 className="text-3xl font-medium">{`${h}:${m}:00`}</h2>
						<SegmentedProgressBar width={'80%'} progress={`${activityPercent}%`} />
					</div>
				</div>
			</div>

			{!hasScreenshots && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<TrackingSourceEmptyState label={t('timer.NO_SCREENSHOOT')} />
				</div>
			)}
			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshotPerHour
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
}

export function ScreenshootTeamTab() {
	const { timeSlots, loading } = useTimeSlots(true);
	const t = useTranslations();
	const hasScreenshots = timeSlots.some((slot) => slot.screenshots?.length);

	return (
		<div>
			{!hasScreenshots && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<TrackingSourceEmptyState label={t('timer.NO_SCREENSHOOT')} />
				</div>
			)}
			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshotPerHourTeam
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
}
