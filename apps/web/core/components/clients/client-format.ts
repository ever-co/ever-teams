const SINCE_FORMATS = new Map<string, Intl.DateTimeFormat>();

const RELATIVE_FORMATS = new Map<string, Intl.RelativeTimeFormat>();

const DAYS_IN_A_MONTH = 30;

const DAYS_IN_A_YEAR = 365;

function sinceFormatOf(locale: string) {
	const cached = SINCE_FORMATS.get(locale);
	if (cached) {
		return cached;
	}
	const format = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' });
	SINCE_FORMATS.set(locale, format);
	return format;
}

function relativeFormatOf(locale: string) {
	const cached = RELATIVE_FORMATS.get(locale);
	if (cached) {
		return cached;
	}
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	RELATIVE_FORMATS.set(locale, format);
	return format;
}

/** The month and year a client was added, "Mar 2024": one formatter per locale, shared by every row. */
export function clientSinceTextOf(date: Date, locale: string) {
	const format = sinceFormatOf(locale);
	return format.format(date);
}

export function daysAgoTextOf(daysAgo: number, locale: string) {
	const format = relativeFormatOf(locale);
	if (daysAgo < DAYS_IN_A_MONTH) {
		return format.format(-daysAgo, 'day');
	}
	if (daysAgo < DAYS_IN_A_YEAR) {
		const monthsAgo = Math.round(daysAgo / DAYS_IN_A_MONTH);
		return format.format(-monthsAgo, 'month');
	}
	const yearsAgo = Math.round(daysAgo / DAYS_IN_A_YEAR);
	return format.format(-yearsAgo, 'year');
}
