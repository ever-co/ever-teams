'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { useModal } from '@/core/hooks';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { ActivityMeter } from '@/core/components/dashboards/kit/meters';
import {
	ActivityBlockError,
	ActivityFigurePair,
	ActivityFigurePulse,
	type ActivityReadFailure,
	failureOfActivityRead
} from '@/core/components/activities/activity-blocks';
import { TASK_LIST_STACK } from '@/core/components/tasks/task-row-recipes';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import { TTimeSlot } from '@/core/types/schemas';
import { TrackingSourceEmptyState } from '../tracking-source-empty-state';
import ScreenshotDetailsModal from './screenshot-details';
import { ScreenshotHourGroup, type ScreenshotDensity } from './screenshoots-per-hour';
import { ScreenshootSkeleton } from './screenshoots-per-hour-skeleton';
import {
	averageActivityOf,
	hasAnyScreenshot,
	type ScreenshotSlotActions,
	screenshotHoursOf,
	slotRangeTextOf,
	useScreenshotSlotActions
} from './screenshot-slots';

type ScreenshotsListProps = Readonly<{
	timeSlots: TTimeSlot[];
	loading: boolean;
	slotActions?: ScreenshotSlotActions;
}>;

type ScreenshotsDayProps = Readonly<{
	timeSlots: TTimeSlot[];
	loading: boolean;
	slotActions: ScreenshotSlotActions;
	failure?: ActivityReadFailure;
	density: ScreenshotDensity;
}>;

const NO_VALUE = '–';

const HOUR_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function labelledHoursOf(timeSlots: ReadonlyArray<TTimeSlot>, format: Intl.DateTimeFormat) {
	const hours = screenshotHoursOf(timeSlots);
	return hours.map((hour) => {
		const label = slotRangeTextOf(format, hour.start, hour.end);
		return { ...hour, label };
	});
}

function ActivityValue({ timeSlots, loading }: Readonly<{ timeSlots: TTimeSlot[]; loading: boolean }>) {
	const locale = useLocale();
	const isFirstLoad = loading && timeSlots.length === 0;
	if (isFirstLoad) {
		return <ActivityFigurePulse className="w-20" />;
	}
	const average = averageActivityOf(timeSlots);
	if (average === null) {
		return <span className="text-muted-foreground">{NO_VALUE}</span>;
	}
	return (
		<>
			<ActivityMeter percent={average} />
			<span>{formatPercent(average, locale)}</span>
		</>
	);
}

/** The day at a glance: the mean activity of its slots and the member's own worked time today. */
function ScreenshotsHeadLine({
	timeSlots,
	loading,
	workedSeconds
}: Readonly<{ timeSlots: TTimeSlot[]; loading: boolean; workedSeconds: number }>) {
	const t = useTranslations();
	return (
		<dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
			<ActivityFigurePair label={t('timer.TIME_ACTIVITY')}>
				<ActivityValue timeSlots={timeSlots} loading={loading} />
			</ActivityFigurePair>
			<ActivityFigurePair label={t('profile.activity.WORKED_TODAY')}>
				{formatDurationShort(workedSeconds)}
			</ActivityFigurePair>
		</dl>
	);
}

function NoScreenshotsState() {
	const t = useTranslations();
	return (
		<div className="flex items-center justify-center px-4 py-12">
			<TrackingSourceEmptyState label={t('timer.NO_SCREENSHOOT')} />
		</div>
	);
}

/**
 * The slots of the day hour by hour, one detail dialog for all of them. The empty state shows only when the day has
 * no slot at all; a day whose slots carry no screenshot (a browser timer) says where screenshots come from.
 */
function ScreenshotsDay({ timeSlots, loading, slotActions, failure, density }: ScreenshotsDayProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { isOpen, openModal, closeModal } = useModal();
	const [openedSlot, setOpenedSlot] = useState<TTimeSlot | null>(null);
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, HOUR_OPTIONS), [locale]);
	const hours = useMemo(() => labelledHoursOf(timeSlots, hourFormat), [hourFormat, timeSlots]);

	const openSlot = useCallback(
		(slot: TTimeSlot) => {
			setOpenedSlot(slot);
			openModal();
		},
		[openModal]
	);

	const hasSlots = timeSlots.length > 0;
	const isFirstLoad = loading && !hasSlots;
	if (isFirstLoad) {
		return <ScreenshootSkeleton />;
	}
	if (failure && !hasSlots) {
		return <ActivityBlockError title={t('profile.activity.SCREENSHOTS_ERROR')} onRetry={failure.onRetry} />;
	}
	if (!hasSlots) {
		return <NoScreenshotsState />;
	}
	const showsSourceHint = !hasAnyScreenshot(timeSlots);
	return (
		<div className={TASK_LIST_STACK}>
			{showsSourceHint && (
				<p className="max-w-prose text-xs text-muted-foreground text-pretty">
					{t('timer.TRACKING_SOURCE_HINT')}
				</p>
			)}
			{hours.map((hour) => (
				<ScreenshotHourGroup
					key={hour.key}
					label={hour.label}
					slots={hour.slots}
					slotActions={slotActions}
					onOpenSlot={openSlot}
					density={density}
				/>
			))}
			<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={openedSlot} />
		</div>
	);
}

/** The profiled member's screenshots of today, under the day's activity and worked time. */
export function ScreenshootTab() {
	const timeSlotsState = useTimeSlots();
	const slotActions = useScreenshotSlotActions(timeSlotsState);
	const failure = failureOfActivityRead(timeSlotsState);
	const { member } = useAtomValue(activityTypeState);
	const { totalSeconds } = useTodayWorkedTime({ id: member?.id });
	const { timeSlots, loading } = timeSlotsState;

	return (
		<div className="flex flex-col gap-5">
			<ScreenshotsHeadLine timeSlots={timeSlots} loading={loading} workedSeconds={totalSeconds} />
			<ScreenshotsDay
				timeSlots={timeSlots}
				loading={loading}
				slotActions={slotActions}
				failure={failure}
				density="regular"
			/>
		</div>
	);
}

function ScreenshotsTeamDay({ timeSlots, loading }: Readonly<{ timeSlots: TTimeSlot[]; loading: boolean }>) {
	const timeSlotsState = useTimeSlots();
	const slotActions = useScreenshotSlotActions(timeSlotsState);
	return <ScreenshotsDay timeSlots={timeSlots} loading={loading} slotActions={slotActions} density="dense" />;
}

/** Hourly screenshots of a member's card, shared by the team tab and the optimized activity panel. */
export function ScreenshotsTeamList({ timeSlots, loading, slotActions }: ScreenshotsListProps) {
	if (slotActions) {
		return <ScreenshotsDay timeSlots={timeSlots} loading={loading} slotActions={slotActions} density="dense" />;
	}
	return <ScreenshotsTeamDay timeSlots={timeSlots} loading={loading} />;
}

export function ScreenshootTeamTab() {
	const timeSlotsState = useTimeSlots(true);
	const slotActions = useScreenshotSlotActions(timeSlotsState);
	const failure = failureOfActivityRead(timeSlotsState);

	return (
		<ScreenshotsDay
			timeSlots={timeSlotsState.timeSlots}
			loading={timeSlotsState.loading}
			slotActions={slotActions}
			failure={failure}
			density="dense"
		/>
	);
}
