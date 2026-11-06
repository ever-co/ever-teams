'use client';

import { useCallback } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations } from 'next-intl';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';

// A plan's day is a calendar day, not an instant: it is formatted at UTC midnight in UTC, so the label names
// that day whatever zone the formatter has (the intl provider sets its own) and whatever zone the browser is in.
const LONG_DAY = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } as const;

const LONG_DAY_WITH_YEAR = { ...LONG_DAY, year: 'numeric' } as const;

function longDayFormatOf(day: moment.Moment) {
	const isThisYear = day.year() === moment().year();
	if (isThisYear) {
		return LONG_DAY;
	}
	return LONG_DAY_WITH_YEAR;
}

export function usePlanDayLabel() {
	const t = useTranslations();
	const format = useFormatter();

	return useCallback(
		(date: string | Date) => {
			const planDay = getDailyPlanDay(date);
			const day = moment(planDay, 'YYYY-MM-DD');
			if (day.isSame(moment(), 'day')) {
				return t('common.TODAY');
			}
			if (day.isSame(moment().add(1, 'day'), 'day')) {
				return t('common.TOMORROW');
			}
			if (day.isSame(moment().subtract(1, 'day'), 'day')) {
				return t('common.YESTERDAY');
			}
			return format.dateTime(moment.utc(planDay, 'YYYY-MM-DD').toDate(), longDayFormatOf(day));
		},
		[t, format]
	);
}
