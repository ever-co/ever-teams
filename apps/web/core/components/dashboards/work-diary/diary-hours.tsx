'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { TrackingSourceEmptyState } from '@/core/components/pages/profile/tracking-source-empty-state';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import { type AppActivity, activitiesOfSlot, appSharesOf } from '@/core/lib/utils/dashboards/app-activity';
import type { DiaryDay, DiaryHour, DiarySlot } from '@/core/lib/utils/dashboards/work-diary';

const META_SEPARATOR = ' · ';

const SLOT_GRID = 'grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6';

const SHOT_FRAME = 'relative block aspect-[16/10] w-full overflow-hidden rounded-md';

const SKELETON_HOURS = 2;
const SKELETON_HOUR_KEYS = Array.from({ length: SKELETON_HOURS }, (_, index) => `hour-${index}`);

const SLOTS_PER_HOUR = 6;
const SKELETON_SLOT_KEYS = Array.from({ length: SLOTS_PER_HOUR }, (_, index) => `slot-${index}`);

function topAppOf(activities: ReadonlyArray<AppActivity>, slotId: string) {
	const ofSlot = activitiesOfSlot(activities, slotId);
	const shares = appSharesOf(ofSlot);
	return shares[0]?.title ?? '';
}

function ShotThumb({ slot, alt }: Readonly<{ slot: DiarySlot; alt: string }>) {
	const t = useTranslations();
	const [hasFailed, setHasFailed] = useState(false);
	const shot = slot.shots[0];
	const count = slot.shots.length;
	const hasSeveral = count > 1;
	if (!shot) {
		return (
			<span
				className={cn(
					SHOT_FRAME,
					'flex items-center justify-center hairline-border border-dashed border-foreground/20 text-xs text-muted-foreground'
				)}
			>
				{t('dashboard.timesheets.diary.NO_SCREENSHOT')}
			</span>
		);
	}
	return (
		<span className={cn(SHOT_FRAME, 'bg-foreground/5 hairline-ring ring-foreground/10')}>
			{!hasFailed && (
				<Image
					src={shot.thumbUrl}
					alt={alt}
					width={320}
					height={200}
					className="size-full object-cover"
					onError={() => setHasFailed(true)}
				/>
			)}
			{hasSeveral && (
				<span className="absolute right-1.5 bottom-1.5 rounded-sm bg-black/60 px-1 text-[11px] font-medium tabular-nums text-white">
					{count}
				</span>
			)}
		</span>
	);
}

const SlotCard = memo(function SlotCard({
	slot,
	topApp,
	timeFormat,
	onOpen
}: Readonly<{ slot: DiarySlot; topApp: string; timeFormat: Intl.DateTimeFormat; onOpen: (slot: DiarySlot) => void }>) {
	const t = useTranslations();
	const start = timeFormat.format(slot.start);
	const end = timeFormat.format(slot.end);
	const label = t('dashboard.timesheets.diary.SLOT_LABEL', { start, end });
	const alt = t('dashboard.timesheets.diary.SHOT_ALT', { time: start });
	const showsActivity = slot.activityPercent !== null;
	return (
		<button
			type="button"
			onClick={() => onOpen(slot)}
			aria-label={label}
			className="-m-1.5 flex w-[calc(100%+0.75rem)] flex-col gap-1.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<span className="text-xs tabular-nums text-muted-foreground">{start}</span>
			<ShotThumb slot={slot} alt={alt} />
			<span className="flex min-h-5 min-w-0 items-center justify-between gap-2">
				<span className="truncate text-xs text-muted-foreground">{topApp}</span>
				{showsActivity && <ActivityFigure percent={slot.activityPercent ?? 0} />}
			</span>
		</button>
	);
});

/** A ten-minute place with nothing tracked: kept so the slots of an hour line up by the minute. */
function EmptyPlace({ label }: Readonly<{ label: string }>) {
	return (
		<div aria-hidden="true" className="flex flex-col gap-1.5">
			<span className="text-xs tabular-nums text-muted-foreground/60">{label}</span>
			<span className={cn(SHOT_FRAME, 'hairline-border border-dashed border-foreground/10')} />
		</div>
	);
}

function placeLabelOf(hour: number, index: number, timeFormat: Intl.DateTimeFormat) {
	const date = new Date();
	const minutes = index * 10;
	date.setHours(hour, minutes, 0, 0);
	return timeFormat.format(date);
}

function HourGroup({
	hour,
	activities,
	timeFormat,
	hourFormat,
	onOpen
}: Readonly<{
	hour: DiaryHour;
	activities: ReadonlyArray<AppActivity>;
	timeFormat: Intl.DateTimeFormat;
	hourFormat: Intl.DateTimeFormat;
	onOpen: (slot: DiarySlot) => void;
}>) {
	const t = useTranslations();
	const date = new Date();
	date.setHours(hour.hour, 0, 0, 0);
	const hourLabel = hourFormat.format(date);
	const duration = formatDurationShort(hour.seconds);
	return (
		<section className="flex flex-col gap-2">
			<h3 className="flex items-baseline gap-2 text-[13px] font-medium text-foreground">
				<span className="tabular-nums">{hourLabel}</span>
				<span className="text-xs font-normal tabular-nums text-muted-foreground">
					{t('dashboard.timesheets.diary.TRACKED_META', { duration })}
				</span>
			</h3>
			<ol className={SLOT_GRID}>
				{hour.positions.map((slot, index) => {
					const placeKey = `${hour.hour}-${index}`;
					if (!slot) {
						return (
							<li key={placeKey}>
								<EmptyPlace label={placeLabelOf(hour.hour, index, timeFormat)} />
							</li>
						);
					}
					return (
						<li key={placeKey}>
							<SlotCard
								slot={slot}
								topApp={topAppOf(activities, slot.id)}
								timeFormat={timeFormat}
								onOpen={onOpen}
							/>
						</li>
					);
				})}
			</ol>
		</section>
	);
}

/** The hours' place while a diary day loads: two hours of six screenshot frames. */
export function DiaryHoursSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-6">
			{SKELETON_HOUR_KEYS.map((hourKey) => (
				<div key={hourKey} className="flex flex-col gap-2">
					<span className={cn('h-3 w-24', SKELETON_BAR)} />
					<div className={SLOT_GRID}>
						{SKELETON_SLOT_KEYS.map((slotKey) => (
							<div key={slotKey} className="flex flex-col gap-1.5">
								<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
								<span className={cn(SHOT_FRAME, 'animate-pulse bg-foreground/[0.04]')} />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * A day of the work diary, hour by hour in ten-minute slots, each with its screenshot, its activity and the app it was
 * spent in; a slot opens through `onOpen`. A day without slots says no time was tracked, and a day of slots without
 * screenshots (a browser timer records none) says where screenshots come from.
 */
export function DiaryBody({
	diary,
	activities,
	dayText,
	timeFormat,
	hourFormat,
	onOpen
}: Readonly<{
	diary: DiaryDay;
	activities: ReadonlyArray<AppActivity>;
	dayText: string;
	timeFormat: Intl.DateTimeFormat;
	hourFormat: Intl.DateTimeFormat;
	onOpen: (slot: DiarySlot) => void;
}>) {
	const t = useTranslations();
	const hasSlots = diary.slotCount > 0;
	const hasShots = diary.shotCount > 0;
	if (!hasSlots) {
		return <BlockEmptyMessage title={t('dashboard.timesheets.diary.NO_TIME_TITLE', { day: dayText })} />;
	}
	if (!hasShots) {
		return (
			<div className="py-10">
				<TrackingSourceEmptyState label={t('dashboard.timesheets.diary.NO_SHOTS_TITLE', { day: dayText })} />
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-6">
			{diary.hours.map((hour) => (
				<HourGroup
					key={hour.hour}
					hour={hour}
					activities={activities}
					timeFormat={timeFormat}
					hourFormat={hourFormat}
					onOpen={onOpen}
				/>
			))}
		</div>
	);
}

/** "Mon, Nov 10 · 6h tracked · 38 screenshots · 64% activity": the line over a diary day. */
export function diaryMetaOf(diary: DiaryDay, dayText: string, t: ReturnType<typeof useTranslations>) {
	const parts = [dayText];
	const hasTime = diary.seconds > 0;
	if (hasTime) {
		const duration = formatDurationShort(diary.seconds);
		parts.push(t('dashboard.timesheets.diary.TRACKED_META', { duration }));
	}
	const hasShots = diary.shotCount > 0;
	if (hasShots) {
		parts.push(t('dashboard.timesheets.diary.SHOT_COUNT', { count: diary.shotCount }));
	}
	if (diary.activityPercent !== null) {
		const value = formatPercent(diary.activityPercent);
		parts.push(t('dashboard.timesheets.diary.ACTIVITY_META', { value }));
	}
	return parts.join(META_SEPARATOR);
}
