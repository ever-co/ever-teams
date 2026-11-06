import type { useTranslations } from 'next-intl';
import { relativeDayOf, type TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';

type Translate = ReturnType<typeof useTranslations>;

/** "Today", "Yesterday", then the weekday: how a worked day is named everywhere on the page. */
export function dayNameOf(date: Date, t: Translate, formatters: TimesheetFormatters) {
	const relative = relativeDayOf(date);
	if (relative === 'today') {
		return t('common.TODAY');
	}
	if (relative === 'yesterday') {
		return t('common.YESTERDAY');
	}
	return formatters.weekday(date);
}

/** "Today, Nov 2", "Monday, Oct 27". */
export function dayLabelOf(date: Date, t: Translate, formatters: TimesheetFormatters) {
	const day = dayNameOf(date, t, formatters);
	const dayDate = formatters.dayDate(date);
	return t('dashboard.timesheets.DAY_LABEL', { day, date: dayDate });
}
