import { Locale, format, parseISO, intervalToDuration } from 'date-fns';
import I18n from 'i18n-js';

import ar from 'date-fns/locale/ar-SA';
import ko from 'date-fns/locale/ko';
import en from 'date-fns/locale/en-US';

type Options = Parameters<typeof format>[2];

const getLocale = (): Locale => {
	const locale = I18n.currentLocale().split('-')[0];
	return locale === 'ar' ? ar : locale === 'ko' ? ko : en;
};

export const formatDate = (date: string, dateFormat?: string, options?: Options) => {
	const locale = getLocale();
	const dateOptions = {
		...options,
		locale
	};
	return format(parseISO(date), dateFormat ?? 'MMM dd, yyyy', dateOptions);
};

/**
 *
 * @param duration The duration in miliseconds
 * @returns formattedDuration:string The duration in the format of "hh:mm:ss"
 */
export const formatDuration = (duration: number) => {
	console.log('duration', duration);
	const time = intervalToDuration({ start: 0, end: Number(duration) || 0 });
	const hours = time.hours ? `${time.hours}:` : '00:';
	const minutes = time.minutes ? `${time.minutes}:` : '00:';
	const seconds = time.seconds ? `${time.seconds}:` : '00';
	return `${hours}${minutes}${seconds}`;
};
