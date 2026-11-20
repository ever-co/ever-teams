import moment from 'moment-timezone';

/**
 * The time zone of a workspace, kept on the organization as `timeZone`. The API counts in it where no member is
 * involved (a client's time report, invoice dates and reminders), and reads it only when the zone database it shares
 * with this list knows the name: a label with its offset ("Europe/Paris (UTC +01:00)") counts as no zone at all.
 */
export interface WorkspaceTimeZoneOption {
	/** The zone's IANA name, the form the organization keeps. */
	value: string;
	/** The name and its offset at the time the list is drawn: `Europe/Paris (UTC+01:00)`. */
	label: string;
}

/** The choice of a workspace without a time zone. */
export const NO_WORKSPACE_TIME_ZONE = '';

function isKnownTimeZone(name: string): boolean {
	return moment.tz.zone(name) !== null;
}

type ZoneEntry = WorkspaceTimeZoneOption & { minutes: number };

function optionOf(name: string, at: Date): ZoneEntry {
	const zoned = moment.tz(at, name);
	return { value: name, label: `${name} (UTC${zoned.format('Z')})`, minutes: zoned.utcOffset() };
}

function byOffsetThenName(first: ZoneEntry, second: ZoneEntry): number {
	if (first.minutes !== second.minutes) {
		return first.minutes - second.minutes;
	}
	return first.value.localeCompare(second.value);
}

/**
 * Every zone the API reads, the most western first. A stored value the list does not know (saved by another app) is
 * kept as it is, first, so that the row shows what is stored rather than a zone nobody chose.
 */
export function workspaceTimeZoneOptionsOf(
	stored: string | null | undefined,
	at: Date = new Date()
): WorkspaceTimeZoneOption[] {
	const known = moment.tz
		.names()
		.map((name) => optionOf(name, at))
		.sort(byOffsetThenName)
		.map(({ value, label }) => ({ value, label }));
	const isStored = typeof stored === 'string' && stored !== '';
	const keepsUnknown = isStored && !isKnownTimeZone(stored);
	if (keepsUnknown) {
		return [{ value: stored, label: stored }, ...known];
	}
	return known;
}

/** The choice that shows a stored zone: its value, or the "not set" choice. */
export function workspaceTimeZoneChoiceOf(stored: string | null | undefined): string {
	return stored?.trim() || NO_WORKSPACE_TIME_ZONE;
}

/** The zone a choice saves: the IANA name picked, or none for "not set". */
export function workspaceTimeZoneOf(choice: string): string | null {
	if (choice === NO_WORKSPACE_TIME_ZONE) {
		return null;
	}
	return choice;
}

/** The words a read-only row shows for a stored zone: its label, or none when it is not set. */
export function workspaceTimeZoneLabelOf(stored: string | null | undefined, at: Date = new Date()): string | null {
	const choice = workspaceTimeZoneChoiceOf(stored);
	if (choice === NO_WORKSPACE_TIME_ZONE) {
		return null;
	}
	if (!isKnownTimeZone(choice)) {
		return choice;
	}
	return optionOf(choice, at).label;
}
