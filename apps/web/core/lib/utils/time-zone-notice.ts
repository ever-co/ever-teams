import { listTimeZones, matchTimeZone, utcOffsetOf, zoneNameOf } from './settings-time-zone';

/** The pair a person chose to keep: the notice comes back only once one of its two zones changes. */
export const KEPT_TIME_ZONE_PAIR_STORAGE_KEY = 'ever-teams:time-zone-notice:kept';

/** The pair a person closed: hidden for the rest of the browser session. */
export const DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY = 'ever-teams:time-zone-notice:dismissed';

const PAIR_SEPARATOR = '|';
const DAYS_COMPARED = 366;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface TimeZoneNotice {
	/** The profile's zone, or null when the profile has none. */
	profileZone: string | null;
	profileOffset: string | null;
	browserZone: string;
	browserOffset: string;
	/** The two zones as one key, for what the browser remembers about this notice. */
	pairKey: string;
}

export interface TimeZoneNoticeInput {
	/** `user.timeZone` as stored, e.g. "Africa/Kinshasa (UTC +01:00)". */
	profileValue: string | null | undefined;
	browserZone: string | null;
	keptPair: string | null;
	dismissedPair: string | null;
	now: Date;
}

export function timeZonePairKeyOf(profileZone: string | null, browserZone: string): string {
	const profileSide = profileZone ?? '';
	return `${profileSide}${PAIR_SEPARATOR}${browserZone}`;
}

function profileZoneOf(profileValue: string | null | undefined): string | null {
	const matched = matchTimeZone(profileValue, listTimeZones());
	if (matched) {
		return matched;
	}
	return zoneNameOf(profileValue);
}

function offsetFormatterOf(zone: string): Intl.DateTimeFormat | null {
	try {
		return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
	} catch {
		return null;
	}
}

function offsetNameAt(formatter: Intl.DateTimeFormat, date: Date): string {
	const parts = formatter.formatToParts(date);
	const namePart = parts.find((part) => part.type === 'timeZoneName');
	return namePart?.value ?? '';
}

/**
 * Two names of one zone (or two zones on the same rules, like Brussels and Paris) give every day the same hours:
 * reports then count the same days whichever of the two the profile names, and the notice has nothing to say.
 */
function keepTheSameTime(firstZone: string, secondZone: string, from: Date): boolean {
	const first = offsetFormatterOf(firstZone);
	const second = offsetFormatterOf(secondZone);
	if (!first || !second) {
		return false;
	}
	for (let day = 0; day < DAYS_COMPARED; day += 1) {
		const date = new Date(from.getTime() + day * DAY_IN_MS);
		const isDifferent = offsetNameAt(first, date) !== offsetNameAt(second, date);
		if (isDifferent) {
			return false;
		}
	}
	return true;
}

/** What the time zone notice says, or null when the profile and the browser agree or the person answered already. */
export function timeZoneNoticeOf(input: TimeZoneNoticeInput): TimeZoneNotice | null {
	const { browserZone, now } = input;
	if (!browserZone) {
		return null;
	}
	const browserOffset = utcOffsetOf(browserZone, now);
	if (browserOffset === null) {
		return null;
	}
	// A stored name that no zone answers to has no offset to show: the notice reads it as no zone
	const storedZone = profileZoneOf(input.profileValue);
	let profileZone: string | null = null;
	let profileOffset: string | null = null;
	if (storedZone) {
		profileOffset = utcOffsetOf(storedZone, now);
	}
	if (profileOffset !== null) {
		profileZone = storedZone;
	}
	const isSameTime = profileZone !== null && keepTheSameTime(profileZone, browserZone, now);
	if (isSameTime) {
		return null;
	}
	const pairKey = timeZonePairKeyOf(profileZone, browserZone);
	const isAnswered = input.keptPair === pairKey || input.dismissedPair === pairKey;
	if (isAnswered) {
		return null;
	}
	return { profileZone, profileOffset, browserZone, browserOffset, pairKey };
}

/** A browser may refuse its storage (private window, blocked site data): it then remembers nothing. */
export function readStoredPair(storage: Storage | null, key: string): string | null {
	if (!storage) {
		return null;
	}
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

export function writeStoredPair(storage: Storage | null, key: string, pairKey: string): boolean {
	if (!storage) {
		return false;
	}
	try {
		storage.setItem(key, pairKey);
		return true;
	} catch {
		return false;
	}
}
