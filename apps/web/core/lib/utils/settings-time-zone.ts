/**
 * Gauzy's readers of `user.timeZone` (timesheets, profile activity, mobile, the Gauzy UI) keep what comes before
 * ` (UTC ±hh:mm)`, so the IANA name is written untouched.
 */

const UTC_ZONE = 'UTC';
const ZERO_OFFSET = '+00:00';
const MINUTES_PER_HOUR = 60;

export interface TimeZoneOption {
	zone: string;
	label: string;
	offset: string;
	offsetMinutes: number;
}

let cachedZones: string[] | null = null;

function supportedZones(): string[] {
	const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
	if (typeof intl.supportedValuesOf !== 'function') {
		return [UTC_ZONE];
	}
	return intl.supportedValuesOf('timeZone');
}

export function listTimeZones(): string[] {
	if (cachedZones) {
		return cachedZones;
	}
	const zones = supportedZones();
	const hasUtc = zones.includes(UTC_ZONE);
	if (!hasUtc) {
		zones.push(UTC_ZONE);
	}
	cachedZones = zones;
	return zones;
}

export function zoneNameOf(storedValue: string | null | undefined): string | null {
	if (!storedValue) {
		return null;
	}
	const beforeOffset = storedValue.split('(')[0];
	const zone = beforeOffset.trim();
	if (!zone) {
		return null;
	}
	return zone;
}

/** Old values were lowercased or had a space for the first underscore: compare without case nor separator. */
function comparableZone(zone: string): string {
	const lowered = zone.toLowerCase();
	return lowered.replace(/[\s_]+/g, '_');
}

export function matchTimeZone(storedValue: string | null | undefined, zones: readonly string[]): string | null {
	const storedZone = zoneNameOf(storedValue);
	if (!storedZone) {
		return null;
	}
	const wanted = comparableZone(storedZone);
	const match = zones.find((zone) => comparableZone(zone) === wanted);
	if (!match) {
		return null;
	}
	return match;
}

function normalizedMinusSign(text: string): string {
	return text.replace(/−/g, '-');
}

export function utcOffsetOf(zone: string, date: Date = new Date()): string | null {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
		const parts = formatter.formatToParts(date);
		const namePart = parts.find((part) => part.type === 'timeZoneName');
		const rawName = namePart?.value ?? '';
		const name = normalizedMinusSign(rawName);
		const offset = name.replace('GMT', '');
		if (!offset) {
			return ZERO_OFFSET;
		}
		return offset;
	} catch {
		return null;
	}
}

export function offsetMinutesOf(offset: string): number {
	const isNegative = offset.startsWith('-');
	const digits = offset.replace(/^[+-]/, '');
	const [hours, minutes] = digits.split(':');
	const hourCount = Number(hours) || 0;
	const minuteCount = Number(minutes) || 0;
	const total = hourCount * MINUTES_PER_HOUR + minuteCount;
	if (isNegative) {
		return -total;
	}
	return total;
}

export function timeZoneLabelOf(zone: string): string {
	return zone.replace(/_/g, ' ');
}

export function formatStoredTimeZone(zone: string, date: Date = new Date()): string {
	const offset = utcOffsetOf(zone, date) ?? ZERO_OFFSET;
	return `${zone} (UTC ${offset})`;
}

export function detectTimeZone(): string {
	try {
		const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!detected) {
			return UTC_ZONE;
		}
		return detected;
	} catch {
		return UTC_ZONE;
	}
}

function optionOf(zone: string, date: Date): TimeZoneOption | null {
	const offset = utcOffsetOf(zone, date);
	if (offset === null) {
		return null;
	}
	const label = timeZoneLabelOf(zone);
	const offsetMinutes = offsetMinutesOf(offset);
	return { zone, label, offset, offsetMinutes };
}

function byOffsetThenName(first: TimeZoneOption, second: TimeZoneOption): number {
	const offsetDifference = first.offsetMinutes - second.offsetMinutes;
	if (offsetDifference !== 0) {
		return offsetDifference;
	}
	return first.label.localeCompare(second.label);
}

export function timeZoneOptions(extraZone: string | null, date: Date = new Date()): TimeZoneOption[] {
	const zones = [...listTimeZones()];
	if (extraZone) {
		const isListed = zones.includes(extraZone);
		if (!isListed) {
			zones.push(extraZone);
		}
	}
	const options: TimeZoneOption[] = [];
	for (const zone of zones) {
		const option = optionOf(zone, date);
		if (option) {
			options.push(option);
		}
	}
	options.sort(byOffsetThenName);
	return options;
}

export function timeZoneDisplayOf(storedValue: string | null | undefined): TimeZoneOption | null {
	const zones = listTimeZones();
	const matchedZone = matchTimeZone(storedValue, zones);
	const zone = matchedZone ?? zoneNameOf(storedValue);
	if (!zone) {
		return null;
	}
	return optionOf(zone, new Date());
}
