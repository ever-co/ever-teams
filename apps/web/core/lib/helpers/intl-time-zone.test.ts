import { DEFAULT_INTL_TIME_ZONE, browserIntlTimeZone, toIntlTimeZone, viewerTimeZone } from './intl-time-zone';

describe('toIntlTimeZone', () => {
	it('accepts a bare IANA id', () => {
		expect(toIntlTimeZone('Europe/Kyiv')).toBe('Europe/Kyiv');
		expect(toIntlTimeZone('America/New_York')).toBe('America/New_York');
	});

	it('reads the label the settings screens store (spaces and an offset suffix)', () => {
		expect(toIntlTimeZone('America/New York (UTC -05:00)')).toBe('America/New_York');
		expect(toIntlTimeZone('Asia/Kolkata (UTC +05:30)')).toBe('Asia/Kolkata');
	});

	it('rejects what is not a zone', () => {
		expect(toIntlTimeZone(undefined)).toBeNull();
		expect(toIntlTimeZone(null)).toBeNull();
		expect(toIntlTimeZone('')).toBeNull();
		expect(toIntlTimeZone('   (UTC +01:00)')).toBeNull();
		expect(toIntlTimeZone('Not/A_Zone')).toBeNull();
		expect(toIntlTimeZone('UTF')).toBeNull();
	});
});

describe('viewerTimeZone', () => {
	it('prefers the zone the viewer chose in Settings', () => {
		expect(viewerTimeZone('Pacific/Auckland (UTC +13:00)', 'Europe/Paris')).toBe('Pacific/Auckland');
	});

	it('falls back to the browser zone when nothing (or nothing valid) is stored', () => {
		expect(viewerTimeZone(undefined, 'Europe/Paris')).toBe('Europe/Paris');
		expect(viewerTimeZone('garbage', 'Europe/Paris')).toBe('Europe/Paris');
	});

	it('ends at UTC when neither is usable', () => {
		expect(viewerTimeZone(undefined, null)).toBe(DEFAULT_INTL_TIME_ZONE);
		expect(viewerTimeZone('garbage', 'also garbage')).toBe('UTC');
	});

	it('no longer renders a midnight east of Kolkata as the previous day', () => {
		// 2026-03-10 00:00 in Auckland is 2026-03-09 16:30 in Kolkata: the old pinned zone showed the 9th.
		const aucklandMidnight = new Date('2026-03-09T11:00:00Z');
		const day = (timeZone: string) =>
			new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
				aucklandMidnight
			);
		expect(day('Asia/Kolkata')).toBe('2026-03-09');
		expect(day(viewerTimeZone('Pacific/Auckland', null))).toBe('2026-03-10');
	});
});

describe('browserIntlTimeZone', () => {
	it('returns the runtime zone as a valid id', () => {
		const zone = browserIntlTimeZone();
		expect(zone === null || toIntlTimeZone(zone) === zone).toBe(true);
	});
});
