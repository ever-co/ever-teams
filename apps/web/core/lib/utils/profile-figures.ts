import moment from 'moment-timezone';

const LOCAL_DATE_FORMAT = 'YYYY-MM-DD';

type NamedPerson = { firstName?: string | null; lastName?: string | null } | null | undefined;

/** First and last name as one string, with no stray space when one of them is missing. */
export function personFullName(person: NamedPerson): string {
	const firstName = person?.firstName ?? '';
	const lastName = person?.lastName ?? '';
	const spacedName = `${firstName} ${lastName}`;
	return spacedName.trim();
}

type LastActiveKind = 'none' | 'today' | 'yesterday' | 'earlier';

/** Where a member's last active day sits against today, both read in the time zone of the activity summary. */
export function lastActiveKindOf(
	lastActiveOn: string | null | undefined,
	timeZone: string,
	now: Date = new Date()
): LastActiveKind {
	if (!lastActiveOn) {
		return 'none';
	}
	const today = moment(now).tz(timeZone);
	const todayKey = today.format(LOCAL_DATE_FORMAT);
	const yesterdayKey = today.clone().subtract(1, 'day').format(LOCAL_DATE_FORMAT);
	if (lastActiveOn === todayKey) {
		return 'today';
	}
	if (lastActiveOn === yesterdayKey) {
		return 'yesterday';
	}
	return 'earlier';
}

/** A local calendar day (`2026-10-28`) written in the page locale, with the year only when it is not this year. */
export function formatLocalDay(localDay: string, locale: string, now: Date = new Date()): string {
	const date = new Date(`${localDay}T00:00:00Z`);
	const isThisYear = date.getUTCFullYear() === now.getFullYear();
	const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
	if (!isThisYear) {
		options.year = 'numeric';
	}
	return new Intl.DateTimeFormat(locale, options).format(date);
}
