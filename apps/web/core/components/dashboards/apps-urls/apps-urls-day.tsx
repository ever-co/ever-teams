'use client';

import { type CSSProperties, memo, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { MemberPickerMenu } from '@/core/components/dashboards/kit/member-picker';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { HourAxis } from '@/core/components/dashboards/kit/hour-axis';
import { rankedToneOf } from '@/core/components/dashboards/team/team-series-tone';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, ChevronLeft, ChevronRight } from '@/core/components/icons';
import type { AppsUrlsDayState } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-day';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import type { AppDay, AppDaySegment, AppHourRow, AppShare } from '@/core/lib/utils/dashboards/app-activity';

const OTHER_TONE = 'hsl(var(--foreground) / 0.22)';

const HOUR_ROW = 'grid min-h-9 w-full grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] items-center gap-3';

const SHOWN_NAMES = 3;

const SKELETON_HOUR_ROWS = 4;

type ToneMap = ReadonlyMap<string, string>;

function tonesOf(legend: ReadonlyArray<AppShare>): ToneMap {
	const tones = new Map<string, string>();
	legend.forEach((share, rank) => {
		tones.set(share.key, rankedToneOf(rank));
	});
	return tones;
}

function toneOf(tones: ToneMap, appKey: string) {
	return tones.get(appKey) ?? OTHER_TONE;
}

function shareRowsOf(shares: ReadonlyArray<AppShare>): ShareRow<AppShare>[] {
	return shares.map((share) => ({
		key: share.key,
		item: share,
		value: share.seconds,
		share: share.share,
		isOther: false,
		otherCount: 0
	}));
}

function AppName({ share }: Readonly<{ share: AppShare }>) {
	return (
		<span className="flex min-w-0 items-baseline gap-1.5">
			<span className="truncate">{share.title}</span>
			{share.detail && <span className="truncate text-xs text-muted-foreground">{share.detail}</span>}
		</span>
	);
}

function renderAppName(share: AppShare) {
	return <AppName share={share} />;
}

function segmentStyleOf(segment: AppDaySegment, tones: ToneMap): CSSProperties {
	return {
		left: `${segment.leftPercent}%`,
		width: `${segment.widthPercent}%`,
		backgroundColor: toneOf(tones, segment.appKey)
	};
}

const AppTrack = memo(function AppTrack({
	appDay,
	tones,
	timeFormat
}: Readonly<{ appDay: AppDay; tones: ToneMap; timeFormat: Intl.DateTimeFormat }>) {
	const t = useTranslations();
	const showsNow = appDay.nowPercent !== null;
	return (
		<div className="relative h-8 overflow-hidden rounded-md bg-foreground/[0.03]">
			{appDay.segments.map((segment) => {
				const label = t('dashboard.appsUrls.day.SEGMENT_LABEL', {
					start: timeFormat.format(segment.start),
					end: timeFormat.format(segment.end),
					title: segment.title,
					duration: formatDurationShort(segment.seconds)
				});
				return (
					<span
						key={segment.key}
						role="img"
						aria-label={label}
						title={label}
						style={segmentStyleOf(segment, tones)}
						className="absolute inset-y-1.5 min-w-[2px] rounded-[3px]"
					/>
				);
			})}
			{showsNow && (
				<span
					aria-hidden="true"
					style={{ left: `${appDay.nowPercent}%` }}
					className="absolute inset-y-0 w-px bg-destructive/70"
				/>
			)}
		</div>
	);
});

function DayLegend({
	legend,
	otherCount,
	tones,
	seconds
}: Readonly<{ legend: ReadonlyArray<AppShare>; otherCount: number; tones: ToneMap; seconds: number }>) {
	const t = useTranslations();
	const locale = useLocale();
	let legendSeconds = 0;
	for (const share of legend) {
		legendSeconds += share.seconds;
	}
	const otherSeconds = Math.max(seconds - legendSeconds, 0);
	const divisor = Math.max(seconds, 1);
	const otherRatio = otherSeconds / divisor;
	const otherShare = otherRatio * 100;
	const hasOther = otherCount > 0;
	return (
		<ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
			{legend.map((share) => (
				<li key={share.key} className="flex min-w-0 items-center gap-1.5 text-xs">
					<span
						aria-hidden="true"
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: toneOf(tones, share.key) }}
					/>
					<span className="tabular-nums text-foreground">{formatPercent(share.share, locale)}</span>
					<span className="max-w-48 truncate text-muted-foreground">{share.title}</span>
				</li>
			))}
			{hasOther && (
				<li className="flex min-w-0 items-center gap-1.5 text-xs">
					<span
						aria-hidden="true"
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: OTHER_TONE }}
					/>
					<span className="tabular-nums text-foreground">{formatPercent(otherShare, locale)}</span>
					<span className="truncate text-muted-foreground">
						{t('dashboard.appsUrls.day.OTHER', { count: otherCount })}
					</span>
				</li>
			)}
		</ul>
	);
}

function HourBar({ row, tones }: Readonly<{ row: AppHourRow; tones: ToneMap }>) {
	const divisor = Math.max(row.seconds, 1);
	return (
		<span aria-hidden="true" className="flex h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-foreground/[0.06]">
			{row.apps.map((share) => {
				const ratio = share.seconds / divisor;
				const percent = ratio * 100;
				const width = `${percent}%`;
				return <span key={share.key} style={{ width, backgroundColor: toneOf(tones, share.key) }} />;
			})}
		</span>
	);
}

function namesOf(row: AppHourRow) {
	const shown = row.apps.slice(0, SHOWN_NAMES);
	const titles = shown.map((share) => share.title);
	return titles.join(', ');
}

const HourItem = memo(function HourItem({
	row,
	tones,
	hourFormat,
	isOpen,
	onToggle
}: Readonly<{
	row: AppHourRow;
	tones: ToneMap;
	hourFormat: Intl.DateTimeFormat;
	isOpen: boolean;
	onToggle: (hour: number) => void;
}>) {
	const t = useTranslations();
	const date = new Date();
	date.setHours(row.hour, 0, 0, 0);
	const hourLabel = hourFormat.format(date);
	const duration = formatDurationShort(row.seconds);
	const label = t('dashboard.appsUrls.day.HOUR_TOGGLE', { hour: hourLabel, duration, count: row.apps.length });
	const rows = useMemo(() => shareRowsOf(row.apps), [row.apps]);
	return (
		<li>
			<button
				type="button"
				aria-expanded={isOpen}
				aria-label={label}
				onClick={() => onToggle(row.hour)}
				className={cn(
					HOUR_ROW,
					'rounded-md px-2 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25'
				)}
			>
				<span className="text-xs tabular-nums text-muted-foreground">{hourLabel}</span>
				<span className="flex min-w-0 items-center gap-3">
					<HourBar row={row} tones={tones} />
					<span className="truncate text-[13px] text-foreground">{namesOf(row)}</span>
				</span>
				<span className="flex items-center justify-end gap-1.5 text-[13px] tabular-nums text-foreground">
					{duration}
					<ChevronDown
						aria-hidden="true"
						className={cn(
							'size-3.5 text-muted-foreground transition-transform duration-200',
							isOpen && 'rotate-180'
						)}
					/>
				</span>
			</button>
			<AnimatedHeight>
				{isOpen && (
					<div className="pb-2 pl-[4.25rem]">
						<ShareRows
							rows={rows}
							renderName={renderAppName}
							formatValue={formatDurationShort}
							otherLabel={() => ''}
							className="-mx-4"
						/>
					</div>
				)}
			</AnimatedHeight>
		</li>
	);
});

function DaySkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<span className={cn('h-2.5 w-full', SKELETON_BAR)} />
				<span className="h-8 animate-pulse rounded-md bg-foreground/[0.04]" />
			</div>
			<span className={cn('h-2.5 w-2/3', SKELETON_BAR)} />
			<div className="flex flex-col gap-2">
				{Array.from({ length: SKELETON_HOUR_ROWS }).map((_, index) => (
					<span key={index} className={cn('h-3 w-full', SKELETON_BAR)} />
				))}
			</div>
		</div>
	);
}

function DayStepper({ state, dayText }: Readonly<{ state: AppsUrlsDayState; dayText: string }>) {
	const t = useTranslations();
	return (
		<div className="flex items-center gap-0.5">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				disabled={!state.canGoBack}
				onClick={state.goToPreviousDay}
				aria-label={t('dashboard.appsUrls.day.PREVIOUS_DAY')}
			>
				<ChevronLeft aria-hidden="true" />
			</Button>
			<span className="min-w-24 text-center text-[13px] tabular-nums text-foreground">{dayText}</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				disabled={!state.canGoForward}
				onClick={state.goToNextDay}
				aria-label={t('dashboard.appsUrls.day.NEXT_DAY')}
			>
				<ChevronRight aria-hidden="true" />
			</Button>
		</div>
	);
}

function DayBody({
	state,
	dayText,
	memberName
}: Readonly<{ state: AppsUrlsDayState; dayText: string; memberName: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [openHours, setOpenHours] = useState<ReadonlySet<number>>(() => new Set());
	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric' }), [locale]);
	const { appDay } = state;
	const tones = useMemo(() => tonesOf(appDay.legend), [appDay.legend]);
	const toggleHour = useCallback((hour: number) => {
		setOpenHours((current) => {
			const next = new Set(current);
			if (next.has(hour)) {
				next.delete(hour);
				return next;
			}
			next.add(hour);
			return next;
		});
	}, []);

	if (state.isLoading) {
		return <DaySkeleton />;
	}
	if (state.isError) {
		return <DashboardErrorNotice onRetry={() => void state.refetch()} />;
	}
	const hasEntries = appDay.segments.length > 0;
	if (!hasEntries) {
		return (
			<BlockEmptyMessage title={t('dashboard.appsUrls.day.EMPTY_TITLE', { name: memberName, day: dayText })} />
		);
	}
	let nowLabel: string | null = null;
	if (appDay.nowPercent !== null) {
		nowLabel = timeFormat.format(new Date());
	}
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<HourAxis timeline={appDay} nowLabel={nowLabel} />
				<AppTrack appDay={appDay} tones={tones} timeFormat={timeFormat} />
			</div>
			<DayLegend legend={appDay.legend} otherCount={appDay.otherCount} tones={tones} seconds={appDay.seconds} />
			<ul className="-mx-2 flex flex-col gap-0.5">
				{appDay.hourRows.map((row) => (
					<HourItem
						key={row.hour}
						row={row}
						tones={tones}
						hourFormat={hourFormat}
						isOpen={openHours.has(row.hour)}
						onToggle={toggleHour}
					/>
				))}
			</ul>
		</div>
	);
}

/**
 * One member's day in apps and sites, hour by hour: every entry on a strip of the day in the colour of its app (the
 * five longest have their own), the shares under it, then the hours, each opening onto its apps and sites. From the
 * references' day timelines (good-not-bad-timeline's strip and shares, solidtime's breakdown of a window).
 */
export function AppsUrlsDay({ state, canPickMember }: Readonly<{ state: AppsUrlsDayState; canPickMember: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	if (!state.hasDay) {
		return null;
	}
	const { member } = state;
	const memberName = member?.name ?? '';
	const dayText = dayFormat.format(state.day);
	const showsPicker = canPickMember && state.members.length > 1;
	const parts = [memberName, dayText];
	const hasTime = state.appDay.seconds > 0;
	if (hasTime) {
		parts.push(formatDurationShort(state.appDay.seconds));
	}
	const namedParts = parts.filter(Boolean);
	const meta = namedParts.join(' · ');
	return (
		<DashboardSection
			title={t('dashboard.appsUrls.day.TITLE')}
			meta={meta}
			actions={
				<>
					{showsPicker && (
						<MemberPickerMenu
							members={state.members}
							member={member}
							onPick={state.pickMember}
							ariaLabel={t('dashboard.appsUrls.day.MEMBER_PICKER', { name: memberName })}
						/>
					)}
					<DayStepper state={state} dayText={dayText} />
				</>
			}
			bodyClassName="px-4 pb-4"
		>
			<DayBody key={`${member?.id ?? ''}-${dayText}`} state={state} dayText={dayText} memberName={memberName} />
		</DashboardSection>
	);
}
