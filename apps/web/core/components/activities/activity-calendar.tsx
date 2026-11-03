'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, percentOf } from '@/core/lib/utils/dashboard-figures';
import { ActivityCalendarBodySkeleton } from '../common/skeleton/activity-calendar-skeleton';
import { getProfileActivityYearRange, useProfileActivity } from '@/core/hooks/activities/use-profile-activity';
import type {
	TProfileActivityRequest,
	TProfileActivityResponse,
	TProfileActivityScope
} from '@/core/types/schemas/activities/profile-activity.schema';
import { ActivityBlockError, ActivityFigurePair } from './activity-blocks';
import { ActivityYearGrid } from './activity-year-grid';
import {
	ACTIVITY_LEVEL_TONES,
	type ActivityDayEntry,
	bestMonthSecondsOf,
	MONTH_ROW_GRID,
	type MonthSummary,
	monthSummariesOf,
	todayKeyIn,
	YEAR_CELL,
	YEAR_FIGURES_LINE,
	YEAR_SURFACE_BODY,
	type YearFigures,
	yearFiguresOf,
	type YearLayout,
	yearLayoutOf
} from './activity-year';

type ActivityCalendarProps = {
	scope?: TProfileActivityScope;
};

type ProfileActivityRange = Pick<TProfileActivityRequest, 'startDate' | 'endDate'>;

const DEFAULT_TIME_ZONE = 'UTC';

const NO_VALUE = '–';

const YEAR_TRIGGER =
	'-ml-1.5 h-8 w-auto shrink-0 gap-1 rounded-md bg-transparent px-1.5 text-[15px] font-semibold tabular-nums text-foreground shadow-none ring-0 hover:bg-foreground/[0.05] dark:bg-transparent';

export function ActivityCalendar({ scope }: ActivityCalendarProps) {
	return <ProfileActivityCalendar scope={scope} />;
}

function yearRequestOf(scope: TProfileActivityScope | undefined, range: ProfileActivityRange) {
	if (!scope) {
		return null;
	}
	return { ...scope, ...range, includeDaily: true };
}

/** The days of the read, only when it answers for the member on screen (a switch can leave the previous one's). */
function dailyEntriesOf(
	profileActivityData: TProfileActivityResponse | undefined,
	employeeId: string | undefined
): ActivityDayEntry[] {
	if (!profileActivityData) {
		return [];
	}
	const isScopedToEmployee = profileActivityData.employeeId === employeeId;
	if (!isScopedToEmployee) {
		return [];
	}
	const daily = profileActivityData.daily ?? [];
	return daily.map(({ date, duration }) => ({
		value: Number((duration / 3600).toPrecision(2)),
		seconds: duration,
		day: date
	}));
}

function ProfileActivityCalendar({ scope }: ActivityCalendarProps) {
	const t = useTranslations();
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const timeZone = scope?.timeZone ?? DEFAULT_TIME_ZONE;
	const employeeId = scope?.employeeId;
	const range = useMemo(() => getProfileActivityYearRange(timeZone, selectedYear), [timeZone, selectedYear]);
	const request = useMemo(() => yearRequestOf(scope, range), [range, scope]);
	const profileActivity = useProfileActivity(request, { enabled: scope !== undefined });
	const profileActivityData = profileActivity.data;
	const entries = useMemo(() => dailyEntriesOf(profileActivityData, employeeId), [profileActivityData, employeeId]);
	const todayKey = todayKeyIn(timeZone);
	const layout = useMemo(() => yearLayoutOf(selectedYear, entries, todayKey), [selectedYear, entries, todayKey]);
	const figures = useMemo(() => yearFiguresOf(layout.days), [layout]);
	const months = useMemo(() => monthSummariesOf(layout.days), [layout]);
	const refetchYear = profileActivity.refetch;
	const retryYear = () => {
		void refetchYear();
	};

	let body = <YearBody layout={layout} figures={figures} months={months} />;
	if (profileActivity.isLoading) {
		body = <ActivityCalendarBodySkeleton />;
	}
	if (profileActivity.isError) {
		body = <ActivityBlockError title={t('profile.activity.YEAR_ERROR')} onRetry={retryYear} />;
	}

	return (
		<section className={cn(DASHBOARD_SURFACE, YEAR_SURFACE_BODY)}>
			<div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<YearMenu selectedYear={selectedYear} onSelectYear={setSelectedYear} />
				<LevelLegend />
			</div>
			<AnimatedHeight>{body}</AnimatedHeight>
		</section>
	);
}

/** The year, its figures, the grid and the months; a year without time keeps the empty grid and says so. */
function YearBody({
	layout,
	figures,
	months
}: Readonly<{ layout: YearLayout; figures: YearFigures; months: MonthSummary[] }>) {
	const t = useTranslations();
	const hasTime = figures.activeDays > 0;
	const yearText = String(layout.year);
	return (
		<div className="flex flex-col gap-5">
			{hasTime && <YearFiguresLine figures={figures} />}
			{!hasTime && (
				<p className="text-[13px] text-muted-foreground">
					{t('profile.activity.EMPTY_YEAR', { year: yearText })}
				</p>
			)}
			<ActivityYearGrid layout={layout} />
			{hasTime && <MonthRows months={months} year={layout.year} />}
		</div>
	);
}

function YearFiguresLine({ figures }: Readonly<{ figures: YearFigures }>) {
	const t = useTranslations();
	const locale = useLocale();
	const bestDayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
		[locale]
	);
	const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
	const bestDay = figures.bestDay;
	return (
		<dl className={YEAR_FIGURES_LINE}>
			<ActivityFigurePair label={t('common.TOTAL')}>
				{formatDurationShort(figures.totalSeconds)}
			</ActivityFigurePair>
			<ActivityFigurePair label={t('profile.activity.ACTIVE_DAYS')}>
				{numberFormat.format(figures.activeDays)}
			</ActivityFigurePair>
			<ActivityFigurePair label={t('profile.activity.LONGEST_STREAK')}>
				{t('profile.activity.DAY_COUNT', { count: figures.longestStreak })}
			</ActivityFigurePair>
			{bestDay && (
				<ActivityFigurePair label={t('profile.activity.BEST_DAY')} hint={bestDayFormat.format(bestDay.date)}>
					{formatDurationShort(bestDay.seconds)}
				</ActivityFigurePair>
			)}
		</dl>
	);
}

/** The twelve months as rows: a thin meter against the best month, the total and the active days. */
function MonthRows({ months, year }: Readonly<{ months: MonthSummary[]; year: number }>) {
	const t = useTranslations();
	const locale = useLocale();
	const monthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }), [locale]);
	const bestSeconds = bestMonthSecondsOf(months);
	const yearText = String(year);
	return (
		<ul
			aria-label={t('profile.activity.MONTHS_LABEL', { year: yearText })}
			className="hairline-divide-y divide-border"
		>
			{months.map((summary) => {
				const monthTime = Date.UTC(year, summary.month, 1);
				const monthName = monthFormat.format(new Date(monthTime));
				return (
					<li key={summary.month} className={MONTH_ROW_GRID}>
						<span className="truncate text-[13px] capitalize text-foreground">{monthName}</span>
						<MonthMeter summary={summary} bestSeconds={bestSeconds} />
						<MonthTotal summary={summary} />
						<MonthActiveDays summary={summary} />
					</li>
				);
			})}
		</ul>
	);
}

function MonthMeter({ summary, bestSeconds }: Readonly<{ summary: MonthSummary; bestSeconds: number }>) {
	if (summary.isAhead) {
		return <span className="max-sm:hidden" />;
	}
	const share = percentOf(summary.seconds, bestSeconds);
	return <ShareMeter share={share} className="max-sm:hidden" />;
}

function MonthTotal({ summary }: Readonly<{ summary: MonthSummary }>) {
	if (summary.isAhead) {
		return <span className="text-right text-[13px] text-muted-foreground">{NO_VALUE}</span>;
	}
	return (
		<span className="text-right text-[13px] font-medium tabular-nums text-foreground">
			{formatDurationShort(summary.seconds)}
		</span>
	);
}

function MonthActiveDays({ summary }: Readonly<{ summary: MonthSummary }>) {
	const t = useTranslations();
	if (summary.isAhead) {
		return <span className="text-right text-xs text-muted-foreground">{NO_VALUE}</span>;
	}
	return (
		<span className="text-right text-xs tabular-nums text-muted-foreground">
			{t('profile.activity.ACTIVE_DAY_COUNT', { count: summary.activeDays })}
		</span>
	);
}

function YearMenu({
	selectedYear,
	onSelectYear
}: Readonly<{ selectedYear: number; onSelectYear: (year: number) => void }>) {
	const t = useTranslations();

	const years = useMemo(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 5 }, (_, i) => currentYear - i);
	}, []);

	const handleValueChange = (value: string) => {
		const year = Number.parseInt(value, 10);
		if (Number.isNaN(year)) {
			return;
		}
		onSelectYear(year);
	};

	return (
		<Select value={String(selectedYear)} onValueChange={handleValueChange}>
			<SelectTrigger aria-label={t('profile.activity.YEAR')} className={YEAR_TRIGGER}>
				<SelectValue>{selectedYear}</SelectValue>
			</SelectTrigger>
			<SelectContent position="popper" sideOffset={4}>
				{years.map((year) => (
					<SelectItem key={year} value={String(year)} className="tabular-nums">
						{year}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** "Less" five steps "More", the scale written out for screen readers. */
function LevelLegend() {
	const t = useTranslations();
	return (
		<div
			role="img"
			aria-label={t('profile.activity.LEGEND_SCALE')}
			className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
		>
			<span>{t('profile.activity.LESS')}</span>
			<span className="flex gap-[3px]">
				{ACTIVITY_LEVEL_TONES.map((tone) => (
					<span key={tone} className={cn(YEAR_CELL, tone)} />
				))}
			</span>
			<span>{t('profile.activity.MORE')}</span>
		</div>
	);
}
