import {
	ALL_TIME_APPLY_FROM,
	applyFromOfChoice,
	changesRateIn,
	memberRateSaveFailureKeyOf,
	pastTimeRuleOf,
	rateApplyChoiceOf,
	rateApplyChoicesOf,
	rateSavedDescriptionOf,
	startOfPickedDayOf
} from './rate-apply';

describe('pastTimeRuleOf', () => {
	it("reads the organization's rule, off unless it is on", () => {
		expect(pastTimeRuleOf({ timeLogsKeepTheirRates: true })).toBe('keepsItsRate');
		expect(pastTimeRuleOf({ timeLogsKeepTheirRates: false })).toBe('takesNewRate');
		expect(pastTimeRuleOf({ timeLogsKeepTheirRates: null })).toBe('takesNewRate');
	});

	it('is unknown for a Gauzy that answers without the field, and before the organization is read', () => {
		expect(pastTimeRuleOf({})).toBeNull();
		expect(pastTimeRuleOf(null)).toBeNull();
		expect(pastTimeRuleOf(undefined)).toBeNull();
	});
});

describe('the answers offered', () => {
	it('offers "from now on" first where time keeps its rate, "all of it" first where it does not', () => {
		expect(rateApplyChoicesOf('keepsItsRate')).toEqual(['fromNow', 'fromDay']);
		expect(rateApplyChoicesOf('takesNewRate')).toEqual(['allTime', 'fromDay']);
	});

	it('starts on the first answer, keeps a picked one, and drops one the rule no longer offers', () => {
		expect(rateApplyChoiceOf('keepsItsRate', null)).toBe('fromNow');
		expect(rateApplyChoiceOf('takesNewRate', null)).toBe('allTime');
		expect(rateApplyChoiceOf('keepsItsRate', 'fromDay')).toBe('fromDay');
		expect(rateApplyChoiceOf('takesNewRate', 'fromNow')).toBe('allTime');
		expect(rateApplyChoiceOf(null, 'fromDay')).toBeNull();
	});
});

describe('startOfPickedDayOf', () => {
	it('is the start of the picked day where the editor is, with its offset', () => {
		const start = startOfPickedDayOf('2026-10-01');

		expect(start).toMatch(/^2026-10-01T00:00:00(Z|[+-]\d{2}:\d{2})$/);
		expect(new Date(start as string).getTime()).toBe(new Date(2026, 9, 1).getTime());
	});

	it('is nothing for a field left empty or a day that does not exist', () => {
		expect(startOfPickedDayOf('')).toBeNull();
		expect(startOfPickedDayOf('2026-02-30')).toBeNull();
		expect(startOfPickedDayOf('1 October')).toBeNull();
	});
});

describe('applyFromOfChoice', () => {
	it('sends no day for "from now on", where the organization\'s rule keeps the price of past time', () => {
		expect(applyFromOfChoice('fromNow', '2026-10-01')).toEqual({ isDayMissing: false });
	});

	it('sends a day before any entry for "all of it", so time an invoice already bills keeps its price', () => {
		// Without a day Gauzy re-prices invoiced time too; with one it leaves the time a live invoice bills
		expect(applyFromOfChoice('allTime', '')).toEqual({ isDayMissing: false, applyFrom: ALL_TIME_APPLY_FROM });
		expect(applyFromOfChoice('allTime', '2026-10-01')).toEqual({
			isDayMissing: false,
			applyFrom: ALL_TIME_APPLY_FROM
		});
		expect(new Date(ALL_TIME_APPLY_FROM).getTime()).toBe(0);
	});

	it('sends the start of the picked day for "from a date"', () => {
		expect(applyFromOfChoice('fromDay', '2026-10-01')).toEqual({
			isDayMissing: false,
			applyFrom: startOfPickedDayOf('2026-10-01')
		});
	});

	it('says the day is missing when "from a date" has none', () => {
		expect(applyFromOfChoice('fromDay', '')).toEqual({ isDayMissing: true });
	});
});

describe('rateSavedDescriptionOf', () => {
	it('says how many entries changed price when Gauzy re-priced some', () => {
		expect(rateSavedDescriptionOf('fromDay', { repricedTimeLogs: 12 })).toEqual({
			key: 'rates.ENTRIES_REPRICED',
			count: 12
		});
		expect(rateSavedDescriptionOf('allTime', { repricedTimeLogs: 0 })).toEqual({
			key: 'rates.ENTRIES_REPRICED',
			count: 0
		});
	});

	it('says time already tracked keeps its price for "from now on"', () => {
		expect(rateSavedDescriptionOf('fromNow', { repricedTimeLogs: null })).toEqual({
			key: 'rates.PAST_TIME_KEPT',
			count: 0
		});
	});

	it('says nothing it does not know', () => {
		expect(rateSavedDescriptionOf('allTime', { repricedTimeLogs: null })).toBeNull();
	});
});

describe('changesRateIn', () => {
	it('is true for a billing or pay rate or its currency, not for a weekly limit alone', () => {
		expect(changesRateIn({ billRateValue: 50 })).toBe(true);
		expect(changesRateIn({ billRateCurrency: 'EUR' })).toBe(true);
		expect(changesRateIn({ payRateValue: null })).toBe(true);
		expect(changesRateIn({ payRateCurrency: 'EUR' })).toBe(true);
		expect(changesRateIn({ reWeeklyLimit: 30 } as Record<string, unknown>)).toBe(false);
	});
});

describe('memberRateSaveFailureKeyOf', () => {
	it('says the rate may be saved without past time re-priced when the server failed a re-pricing save', () => {
		// Gauzy writes a member's rates first and re-prices their time apart: a 5xx or a lost answer may follow the save
		expect(memberRateSaveFailureKeyOf({ status: 500 }, true)).toBe('rates.REPRICE_UNFINISHED');
		expect(memberRateSaveFailureKeyOf({ statusCode: 503 }, true)).toBe('rates.REPRICE_UNFINISHED');
		expect(memberRateSaveFailureKeyOf(new Error('Network Error'), true)).toBe('rates.REPRICE_UNFINISHED');
	});

	it('gives the plain reason for a refusal, which comes before anything is written', () => {
		expect(memberRateSaveFailureKeyOf({ status: 403 }, true)).toBe('toasts.REASONS.PERMISSION');
		expect(memberRateSaveFailureKeyOf({ status: 400 }, true)).toBe('toasts.REASONS.INVALID');
	});

	it('gives the plain reason for a save that asked for no re-pricing', () => {
		expect(memberRateSaveFailureKeyOf({ status: 500 }, false)).toBe('toasts.REASONS.SERVER');
	});
});
