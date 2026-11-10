import { DEFAULT_INTL_TIME_ZONE, browserIntlTimeZone, toIntlTimeZone } from './intl-time-zone';

describe('toIntlTimeZone', () => {
	it('accepts an IANA id and keeps it as given', () => {
		expect(toIntlTimeZone('Europe/Kyiv')).toBe('Europe/Kyiv');
		expect(toIntlTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
		expect(toIntlTimeZone(' America/New_York ')).toBe('America/New_York');
	});

	it('rejects what is not a zone', () => {
		expect(toIntlTimeZone(undefined)).toBeNull();
		expect(toIntlTimeZone(null)).toBeNull();
		expect(toIntlTimeZone('')).toBeNull();
		expect(toIntlTimeZone('Not/A_Zone')).toBeNull();
		expect(toIntlTimeZone('UTF')).toBeNull();
	});
});

describe('browserIntlTimeZone', () => {
	it('uses the zone the browser reports', () => {
		expect(browserIntlTimeZone(() => 'Pacific/Auckland')).toBe('Pacific/Auckland');
	});

	it('falls back to UTC when the browser reports nothing usable or throws', () => {
		expect(browserIntlTimeZone(() => undefined)).toBe(DEFAULT_INTL_TIME_ZONE);
		expect(browserIntlTimeZone(() => 'garbage')).toBe('UTC');
		expect(
			browserIntlTimeZone(() => {
				throw new Error('no Intl');
			})
		).toBe('UTC');
	});

	it('reads the real runtime zone by default', () => {
		expect(toIntlTimeZone(browserIntlTimeZone())).not.toBeNull();
	});

	it('keeps a plan day (a local midnight) on its calendar day, unlike the old pinned zone', () => {
		// An Auckland browser builds 2026-03-10 as local midnight = 2026-03-09T11:00:00Z.
		const aucklandPlanDay = new Date('2026-03-09T11:00:00Z');
		const day = (timeZone: string) =>
			new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
				aucklandPlanDay
			);
		expect(day('Asia/Kolkata')).toBe('2026-03-09');
		expect(day(browserIntlTimeZone(() => 'Pacific/Auckland'))).toBe('2026-03-10');
	});
});
