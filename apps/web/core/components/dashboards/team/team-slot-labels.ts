import type { useTranslations } from 'next-intl';
import type { ChartGranularity } from '@/core/lib/utils/dashboards/team';

type Translate = ReturnType<typeof useTranslations>;

const SHORT_PERIOD_DAYS = 7;

export interface SlotFormats {
	dayLong: Intl.DateTimeFormat;
	dayLongWithYear: Intl.DateTimeFormat;
	dayShort: Intl.DateTimeFormat;
	weekdayShort: Intl.DateTimeFormat;
	monthDay: Intl.DateTimeFormat;
	monthDayYear: Intl.DateTimeFormat;
	monthYear: Intl.DateTimeFormat;
	monthShort: Intl.DateTimeFormat;
	dayNumber: Intl.DateTimeFormat;
	number: Intl.NumberFormat;
}

export function slotFormatsOf(locale: string): SlotFormats {
	return {
		dayLong: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
		dayLongWithYear: new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}),
		dayShort: new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
		monthDayYear: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
		monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
		monthShort: new Intl.DateTimeFormat(locale, { month: 'short' }),
		dayNumber: new Intl.DateTimeFormat(locale, { day: 'numeric' }),
		number: new Intl.NumberFormat(locale)
	};
}

function isCurrentYear(date: Date) {
	const currentYear = new Date().getFullYear();
	return date.getFullYear() === currentYear;
}

function dayLabelOf(date: Date, formats: SlotFormats) {
	if (isCurrentYear(date)) {
		return formats.dayLong.format(date);
	}
	return formats.dayLongWithYear.format(date);
}

function dayAxisLabelOf(date: Date, formats: SlotFormats, periodDays: number) {
	if (periodDays <= SHORT_PERIOD_DAYS) {
		return formats.weekdayShort.format(date);
	}
	const isFirstOfMonth = date.getDate() === 1;
	if (isFirstOfMonth) {
		return formats.monthDay.format(date);
	}
	return formats.dayNumber.format(date);
}

export interface SlotLabels {
	label: string;
	axisLabel: string;
}

export function slotLabelsOf(
	start: Date,
	granularity: ChartGranularity,
	formats: SlotFormats,
	periodDays: number,
	t: Translate
): SlotLabels {
	if (granularity === 'week') {
		const weekStart = formats.monthDay.format(start);
		const weekLabel = t('dashboard.team.chart.WEEK_OF', { date: weekStart });
		return { label: weekLabel, axisLabel: weekStart };
	}
	if (granularity === 'month') {
		const monthLabel = formats.monthYear.format(start);
		const monthAxisLabel = formats.monthShort.format(start);
		return { label: monthLabel, axisLabel: monthAxisLabel };
	}
	const dayLabel = dayLabelOf(start, formats);
	const dayAxisLabel = dayAxisLabelOf(start, formats, periodDays);
	return { label: dayLabel, axisLabel: dayAxisLabel };
}
