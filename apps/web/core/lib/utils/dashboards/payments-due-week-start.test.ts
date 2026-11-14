import { describe, expect, it } from '@jest/globals';
import { eachDayOfInterval } from 'date-fns';
import { owedTilesOf, type OwedCurrencyTotal, type OwedLine } from './payments-due';

const SUNDAY = 0;

const USD: OwedCurrencyTotal = { key: 'USD', currency: 'USD', amount: 30, seconds: 3 * 3600, memberCount: 1 };

function lineOf(day: Date, amount: number): OwedLine {
	return {
		key: `ana-${day.getDate()}`,
		dateKey: '',
		day,
		employeeId: 'ana',
		name: 'Ana',
		imageUrl: null,
		seconds: 3600,
		rate: 10,
		currency: 'USD',
		amount,
		rateSource: null,
		rateNote: null,
		ratePending: false
	};
}

/** Six weeks, from Sunday 1 November to Saturday 12 December 2026: long enough for weekly columns. */
const DAYS = eachDayOfInterval({ start: new Date(2026, 10, 1), end: new Date(2026, 11, 12) });

describe('the Payments due columns follow the workspace week start', () => {
	it('starts each weekly column on Sunday, and counts Sunday 8 November in the second week', () => {
		const lines = [lineOf(new Date(2026, 10, 7), 10), lineOf(new Date(2026, 10, 8), 20)];

		const [tile] = owedTilesOf({
			currencies: [USD],
			lines,
			days: DAYS,
			now: new Date(2026, 11, 20),
			weekStartsOn: SUNDAY
		});

		expect(tile.isWeekly).toBe(true);
		expect(tile.columns.map((column) => column.key).slice(0, 2)).toEqual(['2026-11-01', '2026-11-08']);
		expect(tile.columns.map((column) => column.amount).slice(0, 2)).toEqual([10, 20]);
	});

	it('keeps Monday weeks when no week start is given', () => {
		const lines = [lineOf(new Date(2026, 10, 7), 10), lineOf(new Date(2026, 10, 8), 20)];

		const [tile] = owedTilesOf({ currencies: [USD], lines, days: DAYS, now: new Date(2026, 11, 20) });

		expect(tile.columns[0].key).toBe('2026-10-26');
		expect(tile.columns[1].amount).toBe(30);
	});
});
