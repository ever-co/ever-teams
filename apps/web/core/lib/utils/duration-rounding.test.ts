import {
	durationRoundingRuleOf,
	roundedSecondsOf,
	roundingChangesOf,
	roundedTotalOf,
	type DurationRoundingRule
} from './duration-rounding';

const QUARTER_UP: DurationRoundingRule = { intervalMinutes: 15, direction: 'UP' };
const QUARTER_DOWN: DurationRoundingRule = { intervalMinutes: 15, direction: 'DOWN' };
const QUARTER_NEAREST: DurationRoundingRule = { intervalMinutes: 15, direction: 'NEAREST' };

const MINUTE = 60;

describe('durationRoundingRuleOf', () => {
	it('reads the rule an organization stores', () => {
		const rule = durationRoundingRuleOf({ durationRoundingInterval: 15, durationRoundingDirection: 'UP' });

		expect(rule).toEqual(QUARTER_UP);
	});

	it('reads a stored interval sent as text', () => {
		const rule = durationRoundingRuleOf({ durationRoundingInterval: '6', durationRoundingDirection: 'NEAREST' });

		expect(rule).toEqual({ intervalMinutes: 6, direction: 'NEAREST' });
	});

	it.each([
		['no organization', null],
		['an API without the fields', {}],
		['an interval without a direction', { durationRoundingInterval: 15, durationRoundingDirection: null }],
		['a direction without an interval', { durationRoundingInterval: null, durationRoundingDirection: 'UP' }],
		['an interval the API does not allow', { durationRoundingInterval: 7, durationRoundingDirection: 'UP' }],
		['an unknown direction', { durationRoundingInterval: 15, durationRoundingDirection: 'SIDEWAYS' }]
	])('reads %s as no rounding', (_case, organization) => {
		expect(durationRoundingRuleOf(organization)).toBeNull();
	});
});

describe('roundedSecondsOf', () => {
	it('rounds 1 h 07 min up to 1 h 15 min', () => {
		expect(roundedSecondsOf(67 * MINUTE, QUARTER_UP)).toBe(75 * MINUTE);
	});

	it('rounds 1 h 07 min down to 1 h 00 min', () => {
		expect(roundedSecondsOf(67 * MINUTE, QUARTER_DOWN)).toBe(60 * MINUTE);
	});

	it('rounds to the nearest interval, a half going up', () => {
		expect(roundedSecondsOf(67 * MINUTE, QUARTER_NEAREST)).toBe(60 * MINUTE);
		expect(roundedSecondsOf(68 * MINUTE, QUARTER_NEAREST)).toBe(75 * MINUTE);
		expect(roundedSecondsOf(67 * MINUTE + 30, QUARTER_NEAREST)).toBe(75 * MINUTE);
	});

	it('keeps a duration that already falls on the interval', () => {
		expect(roundedSecondsOf(45 * MINUTE, QUARTER_UP)).toBe(45 * MINUTE);
		expect(roundedSecondsOf(45 * MINUTE, QUARTER_DOWN)).toBe(45 * MINUTE);
	});

	it('keeps nothing as nothing', () => {
		expect(roundedSecondsOf(0, QUARTER_UP)).toBe(0);
	});

	it('returns the duration as tracked without a rule', () => {
		expect(roundedSecondsOf(67 * MINUTE + 13, null)).toBe(67 * MINUTE + 13);
	});

	it('rounds a few seconds up to a whole interval', () => {
		expect(roundedSecondsOf(1, { intervalMinutes: 6, direction: 'UP' })).toBe(6 * MINUTE);
	});
});

describe('roundedTotalOf', () => {
	it('adds each entry once rounded, so 7, 8 and 22 min at 15 min up make 1 h', () => {
		const total = roundedTotalOf([7 * MINUTE, 8 * MINUTE, 22 * MINUTE], QUARTER_UP);

		expect(total).toBe(60 * MINUTE);
	});

	it('adds the entries as tracked without a rule', () => {
		expect(roundedTotalOf([7 * MINUTE, 8 * MINUTE, 22 * MINUTE], null)).toBe(37 * MINUTE);
	});
});

describe('roundingChangesOf', () => {
	it('says a rule changes the figures', () => {
		expect(roundingChangesOf(QUARTER_UP)).toBe(true);
	});

	it('says no rule leaves them as tracked', () => {
		expect(roundingChangesOf(null)).toBe(false);
	});
});
