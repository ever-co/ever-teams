import { describe, expect, it } from '@jest/globals';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { weekNumberOf, weekStartsOfPeriod, weekWindowOf } from './time-activity';

const SUNDAY = 0;
const SATURDAY = 6;

const PERIOD = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 14) };

describe('the Time & Activity week grid follows the workspace week start', () => {
	it('opens Sunday weeks: Sunday 1 to Saturday 7 November, then Sunday 8', () => {
		const starts = weekStartsOfPeriod(PERIOD, SUNDAY);
		const window = weekWindowOf(starts[0], PERIOD, SUNDAY);

		expect(starts.map(localDayKeyOf)).toEqual(['2026-11-01', '2026-11-08']);
		expect([localDayKeyOf(window.from), localDayKeyOf(window.to)]).toEqual(['2026-11-01', '2026-11-07']);
	});

	it('numbers a week after the ISO week it mostly covers, whatever day it starts on', () => {
		expect(weekNumberOf(new Date(2026, 9, 26))).toBe(44);
		expect(weekNumberOf(new Date(2026, 10, 2))).toBe(45);
		expect(weekNumberOf(new Date(2026, 10, 1))).toBe(45);
		expect(weekNumberOf(new Date(2026, 9, 31))).toBe(45);
		expect(weekStartsOfPeriod(PERIOD, SATURDAY).map(localDayKeyOf)[0]).toBe('2026-10-31');
	});
});
