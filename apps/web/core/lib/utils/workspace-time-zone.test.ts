import {
	NO_WORKSPACE_TIME_ZONE,
	workspaceTimeZoneChoiceOf,
	workspaceTimeZoneLabelOf,
	workspaceTimeZoneOf,
	workspaceTimeZoneOptionsOf
} from './workspace-time-zone';

const WINTER = new Date('2026-01-15T12:00:00Z');
const SUMMER = new Date('2026-07-15T12:00:00Z');

const offsetMinutesOf = (label: string): number => {
	const [, sign, hours, minutes] = /\(UTC([+-])(\d{2}):(\d{2})\)$/.exec(label) ?? [];
	const total = Number(hours) * 60 + Number(minutes);
	if (sign === '-') {
		return -total;
	}
	return total;
};

describe('the time zones a workspace can take (#5649)', () => {
	it('keeps the IANA name and shows the offset of the day the list is drawn', () => {
		const paris = (at: Date) =>
			workspaceTimeZoneOptionsOf(null, at).find((option) => option.value === 'Europe/Paris');

		expect(paris(WINTER)).toEqual({ value: 'Europe/Paris', label: 'Europe/Paris (UTC+01:00)' });
		expect(paris(SUMMER)?.label).toBe('Europe/Paris (UTC+02:00)');
	});

	it('lists the most western zones first, and only names the API reads', () => {
		const options = workspaceTimeZoneOptionsOf(null, WINTER);
		const offsets = options.map((option) => offsetMinutesOf(option.label));

		expect(offsets).toEqual([...offsets].sort((first, second) => first - second));
		expect(options.every((option) => !option.value.includes('('))).toBe(true);
		expect(options.map((option) => option.value)).toContain('Asia/Tokyo');
	});

	it('keeps a stored value it does not know, first and as it is, rather than showing another zone', () => {
		const stored = 'Europe/Paris (UTC +01:00)';
		const options = workspaceTimeZoneOptionsOf(stored, WINTER);

		expect(options[0]).toEqual({ value: stored, label: stored });
		expect(workspaceTimeZoneOptionsOf('Asia/Tokyo', WINTER)[0].value).not.toBe('Asia/Tokyo');
	});

	it('shows a padded stored value by the option that holds it, and lists no blank one', () => {
		const padded = ' Somewhere/Else ';
		const options = workspaceTimeZoneOptionsOf(padded, WINTER);

		expect(options[0]).toEqual({ value: padded, label: padded });
		expect(options.map((option) => option.value)).toContain(workspaceTimeZoneChoiceOf(padded));
		expect(workspaceTimeZoneOptionsOf('  ', WINTER)).toEqual(workspaceTimeZoneOptionsOf(null, WINTER));
	});

	it('shows no zone as the "not set" choice, and saves that choice as no zone', () => {
		expect(workspaceTimeZoneChoiceOf(null)).toBe(NO_WORKSPACE_TIME_ZONE);
		expect(workspaceTimeZoneChoiceOf('  ')).toBe(NO_WORKSPACE_TIME_ZONE);
		expect(workspaceTimeZoneChoiceOf('Asia/Tokyo')).toBe('Asia/Tokyo');
		expect(workspaceTimeZoneOf(NO_WORKSPACE_TIME_ZONE)).toBeNull();
		expect(workspaceTimeZoneOf('Asia/Tokyo')).toBe('Asia/Tokyo');
	});

	it('gives a read-only row the zone with its offset, or nothing when none is set', () => {
		expect(workspaceTimeZoneLabelOf('Asia/Tokyo', WINTER)).toBe('Asia/Tokyo (UTC+09:00)');
		expect(workspaceTimeZoneLabelOf(undefined, WINTER)).toBeNull();
		expect(workspaceTimeZoneLabelOf('Somewhere/Else', WINTER)).toBe('Somewhere/Else');
	});
});
