'use client';

import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import { TrackingSourceEmptyState } from '@/core/components/pages/profile/tracking-source-empty-state';
import { useWorkDiaryDay } from '@/core/hooks/dashboards/work-diary/use-work-diary-day';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { clampedDayOfPeriod, defaultDayOfPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { type AppActivity, activitiesOfSlot, appSharesOf } from '@/core/lib/utils/dashboards/app-activity';
import {
	type DiaryDay,
	type DiaryHour,
	type DiarySlot,
	diaryStripDaysOf,
	hasLongStripOf,
	latestLogDayOf,
	shiftedDiaryWeekOf,
	trackedDayKeysOf
} from '@/core/lib/utils/dashboards/work-diary';
import type { SheetMember } from '@/core/lib/utils/dashboards/timesheets';
import { DiarySlotSheet } from './diary-slot-sheet';
import {
	memberNameOrFallback,
	TimesheetsMemberPicker,
	TimesheetsMemberRail,
	TimesheetsMemberRailSkeleton
} from './timesheets-member-rail';
import { RAIL_CELL, SHEET_HEADER, WITH_RAIL } from './timesheets-sheet-view';

const META_SEPARATOR = ' · ';

const SLOT_GRID = 'grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6';

const SHOT_FRAME = 'relative block aspect-[16/10] w-full overflow-hidden rounded-md';

const SKELETON_HOURS = 2;
const SKELETON_HOUR_KEYS = Array.from({ length: SKELETON_HOURS }, (_, index) => `hour-${index}`);

const SLOTS_PER_HOUR = 6;
const SKELETON_SLOT_KEYS = Array.from({ length: SLOTS_PER_HOUR }, (_, index) => `slot-${index}`);

const STRIP_SKELETON_DAYS = 7;
const STRIP_SKELETON_DAY_KEYS = Array.from({ length: STRIP_SKELETON_DAYS }, (_, index) => `day-${index}`);

function DayStrip({
	days,
	day,
	trackedKeys,
	period,
	onPick
}: Readonly<{
	days: ReadonlyArray<Date>;
	day: Date;
	trackedKeys: ReadonlySet<string>;
	period: Period;
	onPick: (day: Date) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const weekdayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
	const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric' }), [locale]);
	const longFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
		[locale]
	);
	const pickedKey = localDayKeyOf(day);
	const todayKey = localDayKeyOf(new Date());
	const isLong = hasLongStripOf(period);
	const firstKey = localDayKeyOf(period.from);
	const lastKey = localDayKeyOf(period.to);
	const firstShownKey = localDayKeyOf(days[0] ?? day);
	const lastShownKey = localDayKeyOf(days.at(-1) ?? day);
	const canGoBack = firstShownKey > firstKey;
	const canGoForward = lastShownKey < lastKey;
	return (
		<div className="flex min-w-0 items-center gap-1">
			{isLong && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={!canGoBack}
					onClick={() => onPick(shiftedDiaryWeekOf(day, -1, period))}
					aria-label={t('dashboard.timesheets.diary.PREVIOUS_WEEK')}
				>
					<ChevronLeft aria-hidden="true" />
				</Button>
			)}
			<ol
				aria-label={t('dashboard.timesheets.diary.DAY_STRIP')}
				className="flex flex-wrap items-stretch gap-0.5 sm:gap-1"
			>
				{days.map((item) => {
					const key = localDayKeyOf(item);
					const isPicked = key === pickedKey;
					const isTracked = trackedKeys.has(key);
					const isAhead = key > todayKey;
					const longLabel = longFormat.format(item);
					const showsTrackedMark = isTracked && !isPicked;
					let label = t('dashboard.timesheets.diary.DAY_NO_TIME', { day: longLabel });
					if (isTracked) {
						label = t('dashboard.timesheets.diary.DAY_TRACKED', { day: longLabel });
					}
					return (
						<li key={key}>
							<button
								type="button"
								aria-pressed={isPicked}
								aria-label={label}
								disabled={isAhead}
								onClick={() => onPick(item)}
								className={cn(
									'flex w-10 flex-col items-center gap-0.5 rounded-md pt-1.5 pb-1 outline-none sm:w-11 transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50',
									isPicked && 'bg-foreground/[0.05] text-foreground',
									!isPicked && 'text-muted-foreground'
								)}
							>
								<span className="text-[11px] capitalize">{weekdayFormat.format(item)}</span>
								<span className="text-[13px] font-medium tabular-nums">{dateFormat.format(item)}</span>
								<span
									aria-hidden="true"
									className={cn(
										'mt-0.5 h-0.5 w-4 rounded-full',
										isPicked && 'bg-primary',
										showsTrackedMark && 'bg-success/70'
									)}
								/>
							</button>
						</li>
					);
				})}
			</ol>
			{isLong && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={!canGoForward}
					onClick={() => onPick(shiftedDiaryWeekOf(day, 1, period))}
					aria-label={t('dashboard.timesheets.diary.NEXT_WEEK')}
				>
					<ChevronRight aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}

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

function HoursSkeleton() {
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

/** Drawn by the timesheets skeleton for this view: the member rail, the member header, the day strip, the hours. */
export function TimesheetsScreenshotsSkeleton() {
	return (
		<div aria-hidden="true" className={WITH_RAIL}>
			<div className={RAIL_CELL}>
				<div className="lg:absolute lg:inset-0">
					<TimesheetsMemberRailSkeleton />
				</div>
			</div>
			<div className="flex min-w-0 flex-col">
				<div className={SHEET_HEADER}>
					<span className="flex items-center gap-2.5">
						<span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />
						<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
					</span>
				</div>
				<div className="flex flex-col gap-4 px-4 pb-4">
					<div className="flex gap-1">
						{STRIP_SKELETON_DAY_KEYS.map((slotKey) => (
							<span key={slotKey} className="h-12 w-11 animate-pulse rounded-md bg-foreground/[0.04]" />
						))}
					</div>
					<HoursSkeleton />
				</div>
			</div>
		</div>
	);
}

function DiaryBody({
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

function metaOf(diary: DiaryDay, dayText: string, t: ReturnType<typeof useTranslations>) {
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

/** The one member the filter holds, then the viewer, then the first member with time in the period. */
function defaultMemberIdOf(
	members: ReadonlyArray<SheetMember>,
	preferredEmployeeId: string | null,
	ownEmployeeId: string | null
) {
	const ids = new Set(members.map((member) => member.id));
	const hasPreferred = Boolean(preferredEmployeeId) && ids.has(preferredEmployeeId ?? '');
	if (hasPreferred) {
		return preferredEmployeeId;
	}
	const hasOwn = Boolean(ownEmployeeId) && ids.has(ownEmployeeId ?? '');
	if (hasOwn) {
		return ownEmployeeId;
	}
	return members[0]?.id ?? null;
}

function shownMemberIdOf(
	members: ReadonlyArray<SheetMember>,
	pickedMemberId: string | null,
	preferredEmployeeId: string | null,
	ownEmployeeId: string | null
) {
	const isPickedKnown = members.some((member) => member.id === pickedMemberId);
	if (isPickedKnown) {
		return pickedMemberId;
	}
	return defaultMemberIdOf(members, preferredEmployeeId, ownEmployeeId);
}

interface PickedDay {
	memberId: string | null;
	day: Date;
}

/** A day picked for one member does not follow to the next: each member opens on their own latest day with time. */
function wantedDayOf(pickedDay: PickedDay | null, member: SheetMember | null, period: Period) {
	const memberId = member?.id ?? null;
	const isForMember = pickedDay !== null && pickedDay.memberId === memberId;
	if (isForMember) {
		return pickedDay.day;
	}
	const latest = latestLogDayOf(member?.logs ?? []);
	if (latest) {
		return latest;
	}
	return defaultDayOfPeriod(period, new Date());
}

/**
 * The work diary's screenshots: the members with time in the period in the page's member rail (a menu below `lg`),
 * and the picked member's day in ten-minute slots, hour by hour, each slot with its screenshot, its activity and the
 * app it was spent in; a slot opens in a side sheet. From the references' work diaries (good-not-bad-timeline's slot
 * row, the Ship Code cards). A browser timer records no screenshot, and the empty state says so.
 */
export function TimesheetsScreenshotsView({
	period,
	members,
	ownEmployeeId,
	preferredEmployeeId,
	teamId,
	emptyContent
}: Readonly<{
	period: Period;
	members: ReadonlyArray<SheetMember>;
	ownEmployeeId: string | null;
	preferredEmployeeId: string | null;
	teamId: string | null;
	emptyContent: ReactNode;
}>) {
	const locale = useLocale();
	const t = useTranslations();
	const [pickedMemberId, setPickedMemberId] = useState<string | null>(null);
	const [pickedDay, setPickedDay] = useState<PickedDay | null>(null);
	const [openSlot, setOpenSlot] = useState<DiarySlot | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const employeeId = shownMemberIdOf(members, pickedMemberId, preferredEmployeeId, ownEmployeeId);
	const member = members.find((item) => item.id === employeeId) ?? null;
	const isOwn = employeeId === ownEmployeeId;
	const wantedDay = wantedDayOf(pickedDay, member, period);
	const day = clampedDayOfPeriod(wantedDay, period);
	const days = diaryStripDaysOf(period, day);
	const memberLogs = member?.logs ?? [];
	const trackedKeys = trackedDayKeysOf(memberLogs, employeeId);
	const state = useWorkDiaryDay({ employeeId, isOwn, teamId, day });

	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric' }), [locale]);
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	const dayText = dayFormat.format(day);

	const openSlotSheet = useCallback((slot: DiarySlot) => {
		setOpenSlot(slot);
		setIsSheetOpen(true);
	}, []);
	const closeSlotSheet = useCallback(() => setIsSheetOpen(false), []);
	const pickMember = useCallback((nextId: string) => {
		setPickedMemberId(nextId);
		setIsSheetOpen(false);
	}, []);
	const pickDay = (nextDay: Date) => {
		setPickedDay({ memberId: employeeId, day: nextDay });
	};

	if (!member) {
		return <>{emptyContent}</>;
	}

	const showsRail = members.length > 1;
	const memberName = memberNameOrFallback(member, t('dashboard.timesheets.SHEET.UNNAMED_MEMBER'));
	let body = (
		<DiaryBody
			diary={state.diary}
			activities={state.activities}
			dayText={dayText}
			timeFormat={timeFormat}
			hourFormat={hourFormat}
			onOpen={openSlotSheet}
		/>
	);
	if (state.isError) {
		body = <DashboardErrorNotice onRetry={() => void state.refetch()} />;
	}
	if (state.isLoading) {
		body = <HoursSkeleton />;
	}
	const isSettled = !state.isLoading && !state.isError;
	const hasSlots = state.diary.slotCount > 0;
	const showsMeta = isSettled && hasSlots;

	return (
		<div className={cn(showsRail && WITH_RAIL)}>
			{showsRail && (
				<div className={RAIL_CELL}>
					<div className="lg:absolute lg:inset-0">
						<TimesheetsMemberRail members={members} pickedId={member.id} onPick={pickMember} />
					</div>
				</div>
			)}
			<div className="flex min-w-0 flex-col" aria-busy={state.isLoading}>
				<div className={SHEET_HEADER}>
					<div className="flex min-w-0 items-center">
						{showsRail && (
							<span className="flex min-w-0 lg:hidden">
								<TimesheetsMemberPicker members={members} picked={member} onPick={pickMember} />
							</span>
						)}
						<MemberCell
							name={memberName}
							imageUrl={member.imageUrl}
							className={cn(showsRail && 'max-lg:hidden')}
						/>
					</div>
					{showsMeta && (
						<span className="truncate text-xs tabular-nums text-muted-foreground">
							{metaOf(state.diary, dayText, t)}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-4 px-4 pb-4">
					<DayStrip days={days} day={day} trackedKeys={trackedKeys} period={period} onPick={pickDay} />
					{body}
				</div>
			</div>
			<DiarySlotSheet
				slot={openSlot}
				day={day}
				activities={state.activities}
				isAppsLoading={state.isAppsLoading}
				isOpen={isSheetOpen}
				onClose={closeSlotSheet}
			/>
		</div>
	);
}
