'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { heatCellKeyOf, type HourHeat } from '@/core/lib/utils/dashboards/team-day';
import { TeamCard } from './team-card';
import { NARROW_SPAN } from './team-grid';

type Translate = ReturnType<typeof useTranslations>;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** 1 January 2024 is a Monday: the seven days after it name the weekdays in the reader's language. */
const MONDAY_REFERENCE = new Date(2024, 0, 1);

const LEVEL_TONES = ['bg-foreground/[0.04]', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary'];

const LEGEND_LEVELS = [1, 2, 3, 4];

const HEAT_GRID = 'grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1';

const SKELETON_ROWS = 10;

function weekdayDateOf(weekday: number) {
	const date = new Date(MONDAY_REFERENCE);
	date.setDate(MONDAY_REFERENCE.getDate() + weekday);
	return date;
}

function levelToneOf(level: number) {
	return LEVEL_TONES[level] ?? LEVEL_TONES[0];
}

function hourDateOf(hour: number) {
	const date = new Date();
	date.setHours(hour, 0, 0, 0);
	return date;
}

function cellLabelOf(
	weekday: number,
	hour: number,
	hourStep: number,
	seconds: number,
	formats: { weekday: Intl.DateTimeFormat; hour: Intl.DateTimeFormat },
	t: Translate
) {
	const day = formats.weekday.format(weekdayDateOf(weekday));
	const from = formats.hour.format(hourDateOf(hour));
	const endHour = hour + hourStep;
	const to = formats.hour.format(hourDateOf(endHour));
	const duration = formatDurationShort(seconds);
	return t('dashboard.team.heatmap.CELL', { day, from, to, duration });
}

const HeatRow = memo(function HeatRow({
	hour,
	heat,
	formats
}: Readonly<{
	hour: number;
	heat: HourHeat;
	formats: { weekday: Intl.DateTimeFormat; hour: Intl.DateTimeFormat; short: Intl.DateTimeFormat };
}>) {
	const t = useTranslations();
	return (
		<>
			<span className="flex h-4 items-center justify-end text-[10px] tabular-nums text-muted-foreground">
				{formats.hour.format(hourDateOf(hour))}
			</span>
			{WEEKDAYS.map((weekday) => {
				const cell = heat.cells.get(heatCellKeyOf(weekday, hour));
				const seconds = cell?.seconds ?? 0;
				const level = cell?.level ?? 0;
				const label = cellLabelOf(weekday, hour, heat.hourStep, seconds, formats, t);
				return (
					<span
						key={weekday}
						role="img"
						title={label}
						aria-label={label}
						className={cn('h-4 rounded-[3px]', levelToneOf(level))}
					/>
				);
			})}
		</>
	);
});

export function TeamHourHeatmapSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.heatmap.TITLE')} className={NARROW_SPAN} isBusy>
			<div className={HEAT_GRID} aria-hidden="true">
				{Array.from({ length: SKELETON_ROWS * 8 }).map((_, index) => (
					<span key={index} className={cn('h-4', SKELETON_BAR, 'rounded-[3px]')} />
				))}
			</div>
		</TeamCard>
	);
}

/**
 * When the team tracks time: the period's hours by weekday and hour of the day, four tint steps of the brand by the
 * share of the busiest hour (the productivity heatmap of not-bad.webp). Hours come from the time logs.
 */
export function TeamHourHeatmap({
	heat,
	isLoading,
	isError,
	onRetry
}: Readonly<{ heat: HourHeat; isLoading: boolean; isError: boolean; onRetry: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(
		() => ({
			weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
			short: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }),
			hour: new Intl.DateTimeFormat(locale, { hour: 'numeric' })
		}),
		[locale]
	);

	if (isLoading) {
		return <TeamHourHeatmapSkeleton />;
	}

	const title = t('dashboard.team.heatmap.TITLE');
	if (isError) {
		return (
			<TeamCard title={title} className={NARROW_SPAN}>
				<DashboardErrorNotice onRetry={onRetry} />
			</TeamCard>
		);
	}

	const meta = t('dashboard.team.heatmap.META');
	return (
		<TeamCard title={title} meta={meta} className={NARROW_SPAN} bodyClassName="flex flex-col gap-4">
			<div className={HEAT_GRID}>
				<span aria-hidden="true" />
				{WEEKDAYS.map((weekday) => (
					<span
						key={weekday}
						aria-hidden="true"
						className="text-center text-[11px] font-medium text-muted-foreground"
					>
						{formats.short.format(weekdayDateOf(weekday))}
					</span>
				))}
				{heat.hours.map((hour) => (
					<HeatRow key={hour} hour={hour} heat={heat} formats={formats} />
				))}
			</div>
			<HeatLegend heat={heat} />
		</TeamCard>
	);
}

function HeatLegend({ heat }: Readonly<{ heat: HourHeat }>) {
	const t = useTranslations();
	if (!heat.hasTime) {
		return <p className="text-xs text-muted-foreground">{t('dashboard.team.heatmap.EMPTY')}</p>;
	}
	return (
		<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
			<span>{t('dashboard.team.heatmap.LESS')}</span>
			<span aria-hidden="true" className="flex gap-1">
				{LEGEND_LEVELS.map((level) => (
					<span key={level} className={cn('size-3 rounded-[3px]', levelToneOf(level))} />
				))}
			</span>
			<span>{t('dashboard.team.heatmap.MORE')}</span>
			<span className="ml-auto tabular-nums">
				{t('dashboard.team.heatmap.BUSIEST', { duration: formatDurationShort(heat.maxSeconds) })}
			</span>
		</div>
	);
}
