'use client';

import { useCallback } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations } from 'next-intl';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';

const LONG_DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;

const LONG_DAY_WITH_YEAR = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;

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
			const day = moment(getDailyPlanDay(date), 'YYYY-MM-DD');
			if (day.isSame(moment(), 'day')) {
				return t('common.TODAY');
			}
			if (day.isSame(moment().add(1, 'day'), 'day')) {
				return t('common.TOMORROW');
			}
			if (day.isSame(moment().subtract(1, 'day'), 'day')) {
				return t('common.YESTERDAY');
			}
			return format.dateTime(day.toDate(), longDayFormatOf(day));
		},
		[t, format]
	);
}
