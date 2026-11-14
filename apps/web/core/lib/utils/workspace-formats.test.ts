import {
	WORKSPACE_DATE_FORMATS,
	WORKSPACE_NUMBER_FORMATS,
	localeKeyOf,
	workspaceClockOf,
	workspaceCurrencyPositionOf,
	dateFormatOf,
	hasDateFormat,
	hasNumberFormat,
	localeTagOf,
	numberFormatOf,
	workspaceDateFormatOf,
	workspaceNumberFormatOf,
	type WorkspaceDateFormat,
	type WorkspaceClock,
	type WorkspaceCurrencyPosition,
	type WorkspaceLocale,
	type WorkspaceNumberFormat
} from './workspace-formats';

const APP_LANGUAGES = ['ar', 'bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'];

/** Monday 9 November 2026, 14:05:07 UTC. */
const MONDAY = new Date(Date.UTC(2026, 10, 9, 14, 5, 7));
const NEXT_SUNDAY = new Date(Date.UTC(2026, 10, 15, 9, 0, 0));

function localeOf(
	tag: string,
	dateFormat: WorkspaceDateFormat | null,
	numberFormat: WorkspaceNumberFormat | null = null
): WorkspaceLocale {
	return { tag, dateFormat, numberFormat };
}

describe('the formats an organization stores', () => {
	it('reads the date and number formats this app writes', () => {
		for (const format of WORKSPACE_DATE_FORMATS) {
			expect(workspaceDateFormatOf(format)).toBe(format);
		}
		for (const format of WORKSPACE_NUMBER_FORMATS) {
			expect(workspaceNumberFormatOf(format)).toBe(format);
		}
	});

	it("leaves a missing value, and the ones Gauzy's own apps write, to each reader's language", () => {
		expect(workspaceDateFormatOf(null)).toBeNull();
		expect(workspaceDateFormatOf(undefined)).toBeNull();
		expect(workspaceDateFormatOf('L')).toBeNull();
		expect(workspaceDateFormatOf('dddd, LL')).toBeNull();
		expect(workspaceNumberFormatOf(null)).toBeNull();
		expect(workspaceNumberFormatOf('USD')).toBeNull();
		expect(workspaceNumberFormatOf('')).toBeNull();
	});

	it('gives the language tag of a bare language and of a workspace locale', () => {
		expect(localeTagOf('fr')).toBe('fr');
		expect(localeTagOf(localeOf('de', 'DD.MM.YYYY'))).toBe('de');
	});

	it('tells a workspace that chose a date format from a bare language and from one that chose none', () => {
		expect(hasDateFormat(localeOf('fr', 'DD/MM/YYYY'))).toBe(true);
		expect(hasDateFormat(localeOf('fr', null, '1,234.56'))).toBe(false);
		expect(hasDateFormat('fr')).toBe(false);
	});

	it('tells a workspace that chose a number format from a bare language and from one that chose none', () => {
		expect(hasNumberFormat(localeOf('fr', null, '1,234.56'))).toBe(true);
		expect(hasNumberFormat(localeOf('fr', 'DD/MM/YYYY'))).toBe(false);
		expect(hasNumberFormat('fr')).toBe(false);
	});
});

describe('dateFormatOf without a workspace date format', () => {
	const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' };

	it("writes as the reader's language does, for a bare language and for a workspace that chose nothing", () => {
		const expected = new Intl.DateTimeFormat('fr', options).format(MONDAY);

		expect(dateFormatOf('fr', options).format(MONDAY)).toBe(expected);
		expect(dateFormatOf(localeOf('fr', null), options).format(MONDAY)).toBe(expected);
	});
});

describe('dateFormatOf with a workspace date format', () => {
	const fullDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };

	it('writes a day, its month and its year in each pattern', () => {
		const written = WORKSPACE_DATE_FORMATS.map((format) =>
			dateFormatOf(localeOf('en', format), fullDate).format(MONDAY)
		);

		expect(written).toEqual(['11/09/2026', '09/11/2026', '09-11-2026', '09.11.2026', '2026-11-09']);
	});

	it('leaves the year out when the options do not ask for it', () => {
		const monthDay: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
		const written = WORKSPACE_DATE_FORMATS.map((format) =>
			dateFormatOf(localeOf('en', format), monthDay).format(MONDAY)
		);

		expect(written).toEqual(['11/09', '09/11', '09-11', '09.11', '11-09']);
	});

	it("keeps the weekday, in the reader's language, before the date", () => {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		};

		expect(dateFormatOf(localeOf('en', 'DD/MM/YYYY'), options).format(MONDAY)).toBe('Mon 09/11');
		for (const tag of APP_LANGUAGES) {
			const weekday = new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' }).format(MONDAY);

			expect(dateFormatOf(localeOf(tag, 'DD.MM.YYYY'), options).format(MONDAY)).toBe(`${weekday} 09.11`);
		}
	});

	it('writes the same date in every language of the app, with nothing of the language left around it', () => {
		for (const tag of APP_LANGUAGES) {
			const written = dateFormatOf(localeOf(tag, 'YYYY-MM-DD'), fullDate).format(MONDAY);

			expect(written).toBe('2026-11-09');
		}
	});

	it('writes the date of a date style, with the time after it when one is asked', () => {
		const medium = dateFormatOf(localeOf('en', 'DD/MM/YYYY'), { dateStyle: 'medium', timeZone: 'UTC' });
		const withTime = dateFormatOf(localeOf('fr', 'DD/MM/YYYY'), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		});
		const full = dateFormatOf(localeOf('en', 'MM/DD/YYYY'), { dateStyle: 'full', timeZone: 'UTC' });

		expect(medium.format(MONDAY)).toBe('09/11/2026');
		expect(withTime.format(MONDAY)).toBe('09/11/2026 14:05');
		expect(full.format(MONDAY)).toBe('Monday 11/09/2026');
	});

	it("writes the time of the options' own fields after the date", () => {
		const options: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: 'UTC'
		};

		expect(dateFormatOf(localeOf('en', 'DD/MM/YYYY'), options).format(MONDAY)).toBe('09/11 14:05');
	});

	it('writes the default numeric date in the pattern', () => {
		expect(dateFormatOf(localeOf('en', 'DD.MM.YYYY'), { timeZone: 'UTC' }).format(MONDAY)).toBe('09.11.2026');
	});

	it("follows the options' time zone", () => {
		const lateEvening = new Date(Date.UTC(2026, 10, 9, 23, 30));
		const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
		const inTokyo = dateFormatOf(localeOf('en', 'DD/MM/YYYY'), { ...options, timeZone: 'Asia/Tokyo' });
		const inUtc = dateFormatOf(localeOf('en', 'DD/MM/YYYY'), { ...options, timeZone: 'UTC' });

		expect(inTokyo.format(lateEvening)).toBe('10/11/2026');
		expect(inUtc.format(lateEvening)).toBe('09/11/2026');
	});

	it("leaves what is not a plain calendar date to the reader's language", () => {
		const locale = localeOf('fr', 'DD/MM/YYYY');
		const shapes: Intl.DateTimeFormatOptions[] = [
			{ weekday: 'long', timeZone: 'UTC' },
			{ month: 'long', year: 'numeric', timeZone: 'UTC' },
			{ day: 'numeric', timeZone: 'UTC' },
			{ hour: 'numeric', minute: '2-digit', timeZone: 'UTC' },
			{ timeStyle: 'short', timeZone: 'UTC' },
			{ weekday: 'short', day: 'numeric', timeZone: 'UTC' },
			{ era: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
			{ month: 'short', day: 'numeric', timeZoneName: 'short', timeZone: 'UTC' }
		];

		for (const options of shapes) {
			const expected = new Intl.DateTimeFormat('fr', options).format(MONDAY);

			expect(dateFormatOf(locale, options).format(MONDAY)).toBe(expected);
		}
	});

	it('names its parts, so a screen can style the weekday apart from the date', () => {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		};
		const parts = dateFormatOf(localeOf('en', 'MM/DD/YYYY'), options).formatToParts(MONDAY);

		expect(parts).toEqual([
			{ type: 'weekday', value: 'Mon' },
			{ type: 'literal', value: ' ' },
			{ type: 'month', value: '11' },
			{ type: 'literal', value: '/' },
			{ type: 'day', value: '09' }
		]);
	});

	it('writes a range as both dates, and one date when both ends are the same day', () => {
		const format = dateFormatOf(localeOf('en', 'DD/MM/YYYY'), fullDate);
		const laterThatDay = new Date(Date.UTC(2026, 10, 9, 20, 0));

		expect(format.formatRange(MONDAY, NEXT_SUNDAY)).toBe('09/11/2026 \u2013 15/11/2026');
		expect(format.formatRange(MONDAY, laterThatDay)).toBe('09/11/2026');
		expect(format.formatRangeToParts(MONDAY, NEXT_SUNDAY).map((part) => part.source)).toEqual([
			'startRange',
			'startRange',
			'startRange',
			'startRange',
			'startRange',
			'shared',
			'endRange',
			'endRange',
			'endRange',
			'endRange',
			'endRange'
		]);
	});

	it("still answers the reader's language in its resolved options", () => {
		const format = dateFormatOf(localeOf('pt', 'DD/MM/YYYY'), fullDate);

		expect(format.resolvedOptions().locale).toBe('pt');
	});
});

describe('numberFormatOf without a workspace number format', () => {
	it("writes as the reader's language does", () => {
		const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'EUR' };
		const expected = new Intl.NumberFormat('de', options).format(1234567.891);

		expect(numberFormatOf('de', options).format(1234567.891)).toBe(expected);
		expect(numberFormatOf(localeOf('de', 'DD.MM.YYYY', null), options).format(1234567.891)).toBe(expected);
	});
});

describe('numberFormatOf with a workspace number format', () => {
	const twoDecimals: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

	it('groups thousands and marks decimals in each format', () => {
		const written = WORKSPACE_NUMBER_FORMATS.map((format) =>
			numberFormatOf(localeOf('en', null, format), twoDecimals).format(1234567.891)
		);

		expect(written).toEqual(['1,234,567.89', '1.234.567,89', '1\u00A0234\u00A0567,89', '1\u2019234\u2019567.89']);
	});

	it('writes the same digits and separators in every language of the app', () => {
		for (const tag of APP_LANGUAGES) {
			const written = numberFormatOf(localeOf(tag, null, '1.234,56'), twoDecimals).format(1234567.891);

			expect(written).toBe('1.234.567,89');
		}
	});

	it('groups a four-digit amount in every language, the ones that write it ungrouped on their own too', () => {
		const ungroupedAlone = ['bg', 'es', 'it', 'pl'].map((tag) => new Intl.NumberFormat(tag).format(1234));

		expect(ungroupedAlone).toEqual(['1234', '1234', '1234', '1234']);
		for (const tag of APP_LANGUAGES) {
			const written = numberFormatOf(localeOf(tag, null, '1,234.56'), twoDecimals).format(1234.5);

			expect(written).toBe('1,234.50');
		}
	});

	it('leaves a number ungrouped when the caller asks for it', () => {
		const options: Intl.NumberFormatOptions = { ...twoDecimals, useGrouping: false };

		expect(numberFormatOf(localeOf('en', null, '1.234,56'), options).format(1234.5)).toBe('1234,50');
	});

	it("keeps the currency sign where the reader's language puts it", () => {
		const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'EUR' };
		const french = numberFormatOf(localeOf('fr', null, '1,234.56'), options).format(1234.5);
		const english = numberFormatOf(localeOf('en', null, '1.234,56'), options).format(1234.5);

		expect(french).toBe('1,234.50\u00A0€');
		expect(english).toBe('€1.234,50');
	});

	it('marks the decimals of a short and of a negative amount too', () => {
		const compact: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 };
		const locale = localeOf('en', null, '1.234,56');

		expect(numberFormatOf(locale, compact).format(1500)).toBe('1,5K');
		expect(numberFormatOf(locale, twoDecimals).format(-1234.5)).toBe('-1.234,50');
	});

	it('names its parts, so a screen can set the cents apart', () => {
		const parts = numberFormatOf(localeOf('en', null, '1 234,56'), twoDecimals).formatToParts(1234.5);

		expect(parts).toEqual([
			{ type: 'integer', value: '1' },
			{ type: 'group', value: '\u00A0' },
			{ type: 'integer', value: '234' },
			{ type: 'decimal', value: ',' },
			{ type: 'fraction', value: '50' }
		]);
	});

	it('writes a range with the same separators', () => {
		const written = numberFormatOf(localeOf('en', null, '1.234,56'), twoDecimals).formatRange(1000, 2500.5);

		expect(written).toBe('1.000,00\u20132.500,50');
	});
});

/** ICU versions differ on the space before AM and PM (a plain or a narrow no-break space): compare with plain ones. */
function withPlainSpaces(text: string): string {
	return text.replace(/\s/gu, ' ');
}

function clockLocaleOf(
	tag: string,
	clock: WorkspaceClock | null,
	dateFormat: WorkspaceDateFormat | null = null
): WorkspaceLocale {
	return { tag, dateFormat, numberFormat: null, clock, currencyPosition: null };
}

function positionLocaleOf(
	tag: string,
	currencyPosition: WorkspaceCurrencyPosition | null,
	numberFormat: WorkspaceNumberFormat | null = null
): WorkspaceLocale {
	return { tag, dateFormat: null, numberFormat, clock: null, currencyPosition };
}

describe('the clock and the currency side an organization stores', () => {
	it('reads the clock Gauzy stores, as a number or as text', () => {
		expect(workspaceClockOf(12)).toBe(12);
		expect(workspaceClockOf(24)).toBe(24);
		expect(workspaceClockOf('24')).toBe(24);
		expect(workspaceClockOf(null)).toBeNull();
		expect(workspaceClockOf(13)).toBeNull();
	});

	it('reads the two sides Gauzy stores for the currency sign', () => {
		expect(workspaceCurrencyPositionOf('LEFT')).toBe('LEFT');
		expect(workspaceCurrencyPositionOf('RIGHT')).toBe('RIGHT');
		expect(workspaceCurrencyPositionOf('MIDDLE')).toBeNull();
		expect(workspaceCurrencyPositionOf(undefined)).toBeNull();
	});

	it('keys a cache of formats apart when only the clock or the currency side differs', () => {
		const keys = new Set([
			localeKeyOf(clockLocaleOf('en', 12)),
			localeKeyOf(clockLocaleOf('en', 24)),
			localeKeyOf(positionLocaleOf('en', 'LEFT')),
			localeKeyOf(positionLocaleOf('en', 'RIGHT'))
		]);

		expect(keys.size).toBe(4);
	});
});

describe('dateFormatOf with a workspace clock', () => {
	const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };

	it('writes every time of day on the 24-hour clock, whatever the language', () => {
		for (const tag of APP_LANGUAGES) {
			expect(dateFormatOf(clockLocaleOf(tag, 24), time).format(MONDAY)).toContain('14:05');
		}
	});

	it('writes every time of day on the 12-hour clock, without a leading zero', () => {
		expect(withPlainSpaces(dateFormatOf(clockLocaleOf('en', 12), time).format(MONDAY))).toBe('2:05 PM');
		expect(withPlainSpaces(dateFormatOf(clockLocaleOf('fr', 12), time).format(MONDAY))).toBe('2:05 PM');
	});

	it('overrides a clock the caller asked for', () => {
		const options: Intl.DateTimeFormatOptions = { ...time, hour12: false };

		expect(withPlainSpaces(dateFormatOf(clockLocaleOf('en', 12), options).format(MONDAY))).toBe('2:05 PM');
	});

	it('puts the clock after a date written in the workspace pattern', () => {
		const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', ...time };

		expect(dateFormatOf(clockLocaleOf('en', 24, 'DD/MM/YYYY'), options).format(MONDAY)).toBe('09/11/2026 14:05');
	});

	it('leaves a date without a time, and a reader without a workspace clock, as they were', () => {
		const day: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', timeZone: 'UTC' };

		expect(dateFormatOf(clockLocaleOf('en', 24), day).format(MONDAY)).toBe('November 9');
		expect(withPlainSpaces(dateFormatOf(clockLocaleOf('en', null), time).format(MONDAY))).toBe('02:05 PM');
	});
});

describe('numberFormatOf with a workspace currency side', () => {
	const euros: Intl.NumberFormatOptions = { style: 'currency', currency: 'EUR' };

	it('puts the sign after the amount for a language that writes it before', () => {
		expect(numberFormatOf(positionLocaleOf('en', 'RIGHT'), euros).format(1234.5)).toBe('1,234.50\u00a0\u20ac');
		expect(numberFormatOf(positionLocaleOf('en', 'RIGHT'), euros).format(-1234.5)).toBe('-1,234.50\u00a0\u20ac');
	});

	it('puts the sign before the amount for a language that writes it after', () => {
		expect(numberFormatOf(positionLocaleOf('fr', 'LEFT'), euros).format(1234.5)).toBe('\u20ac1\u202f234,50');
		expect(numberFormatOf(positionLocaleOf('fr', 'LEFT'), euros).format(-1234.5)).toBe('-\u20ac1\u202f234,50');
	});

	it('keeps a space between a currency code and the amount it now leads', () => {
		const code: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD', currencyDisplay: 'code' };

		expect(numberFormatOf(positionLocaleOf('de', 'LEFT'), code).format(12)).toBe('USD\u00a012,00');
	});

	it("moves the sign together with the workspace's separators", () => {
		const written = numberFormatOf(positionLocaleOf('en', 'RIGHT', '1.234,56'), euros).format(1234.5);

		expect(written).toBe('1.234,50\u00a0\u20ac');
	});

	it('leaves an amount where the language already puts it, and a plain number, as they were', () => {
		const plain: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };

		expect(numberFormatOf(positionLocaleOf('en', 'LEFT'), euros).format(12)).toBe('\u20ac12.00');
		expect(numberFormatOf(positionLocaleOf('fr', 'RIGHT'), euros).format(12)).toBe('12,00\u00a0\u20ac');
		expect(numberFormatOf(positionLocaleOf('en', 'RIGHT'), plain).format(1234.5)).toBe('1,234.5');
	});

	it('names the moved sign among its parts', () => {
		const parts = numberFormatOf(positionLocaleOf('en', 'RIGHT'), euros).formatToParts(12);

		expect(parts.map((part) => part.type)).toEqual(['integer', 'decimal', 'fraction', 'literal', 'currency']);
	});
});
