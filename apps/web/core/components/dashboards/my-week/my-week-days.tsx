'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { type DayBarDatum, DayBarsChart } from '@/core/components/dashboards/kit/day-bars-chart';
import { SECTION_META, SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import { formatDurationShort, formatHoursLabel, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { isWeekPeriod, type MyWeekDay, type MyWeekPeriodKey } from '@/core/lib/utils/dashboards/my-week';
import { MY_WEEK_CHART_HEIGHT, MY_WEEK_CHART_PANE } from './my-week-recipes';

interface DayFormats {
	full: Intl.DateTimeFormat;
	weekday: Intl.DateTimeFormat;
	dayNumber: Intl.DateTimeFormat;
}

function dayFormatsOf(locale: string): DayFormats {
	return {
		full: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
		weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		dayNumber: new Intl.DateTimeFormat(locale, { day: 'numeric' })
	};
}

/** A week names its seven days; a month has room for the day numbers only. */
function axisFormatOf(formats: DayFormats, shownKey: MyWeekPeriodKey) {
	if (isWeekPeriod(shownKey)) {
		return formats.weekday;
	}
	return formats.dayNumber;
}

function datumOf(day: MyWeekDay, formats: DayFormats, axisFormat: Intl.DateTimeFormat): DayBarDatum {
	return {
		key: day.key,
		label: formats.full.format(day.date),
		axisLabel: axisFormat.format(day.date),
		value: day.seconds,
		isToday: day.isToday,
		isFuture: day.isFuture
	};
}

function longestDayOf(days: ReadonlyArray<MyWeekDay>) {
	let longest = 0;
	for (const day of days) {
		longest = Math.max(longest, day.seconds);
	}
	return longest;
}

/**
 * A bar per day of the period. With a weekly limit, a dashed line marks the fifth of it a day is measured against, and
 * the days above it take the warning tone, as in the Weekly limit report.
 */
export function MyWeekDays({
	days,
	dailyLimitSeconds,
	shownKey
}: Readonly<{ days: ReadonlyArray<MyWeekDay>; dailyLimitSeconds: number | null; shownKey: MyWeekPeriodKey }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(() => dayFormatsOf(locale), [locale]);
	const data = useMemo(() => {
		const axisFormat = axisFormatOf(formats, shownKey);
		return days.map((day) => datumOf(day, formats, axisFormat));
	}, [days, formats, shownKey]);

	const title = t('dashboard.team.cards.TIME_BY_DAY');
	const longestDay = longestDayOf(days);
	const dayLimit = dailyLimitSeconds ?? 0;
	const axisCeiling = Math.max(longestDay, dayLimit);
	const axis = timeAxisOf(axisCeiling);
	let limit: number | undefined;
	let limitLabel: string | undefined;
	let limitHint: string | undefined;
	if (dailyLimitSeconds !== null) {
		const dailyLimit = formatHoursLabel(dailyLimitSeconds);
		limit = dailyLimitSeconds;
		limitLabel = t('dashboard.myWeek.DAILY_LIMIT_LINE', { limit: dailyLimit });
		limitHint = t('dashboard.myWeek.DAILY_LIMIT_HINT');
	}

	return (
		<div className={MY_WEEK_CHART_PANE}>
			<div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
				<h2 className={SECTION_TITLE}>{title}</h2>
				{limitHint && <span className={SECTION_META}>{limitHint}</span>}
			</div>
			<DayBarsChart
				data={data}
				axis={axis}
				ariaLabel={title}
				valueLabel={t('dashboard.weeklyLimit.TRACKED')}
				formatValue={formatDurationShort}
				formatTick={formatHoursLabel}
				limit={limit}
				limitLabel={limitLabel}
				heightClassName={MY_WEEK_CHART_HEIGHT}
			/>
		</div>
	);
}
