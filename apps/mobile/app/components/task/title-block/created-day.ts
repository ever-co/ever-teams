const CREATED_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** The day a task was created, in the phone's language (`19 Nov 2026`); nothing for a date the API did not give. */
export function createdDayOf(createdAt: string | undefined, locale?: string): string | undefined {
	if (!createdAt) {
		return undefined;
	}
	const date = new Date(createdAt);
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}
	return date.toLocaleDateString(locale, CREATED_DAY);
}
