import { describe, expect, it } from '@jest/globals';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { TTimeLimitReportList } from '@/core/types/schemas';
import { apiLimitDurationOf, limitEntriesOf, requestPeriodOf, weeklyReportsOfDays } from './weekly-limit';

const SUNDAY = 0;
const MONDAY = 1;
const HOUR = 3600;

function dayReportOf(date: string, hours: number): TTimeLimitReportList {
	return {
		date,
		employees: [
			{
				employee: { id: 'marie', fullName: 'Marie' } as never,
				duration: hours * HOUR,
				durationPercentage: 0,
				limit: 8 * HOUR
			}
		]
	};
}

describe('the Weekly limit counts weeks from the workspace week start', () => {
	it('asks Gauzy for whole Sunday weeks around the period', () => {
		const period = { from: new Date(2026, 10, 4), to: new Date(2026, 10, 10) };

		const request = requestPeriodOf(period, 'week', SUNDAY);

		expect([localDayKeyOf(request.from), localDayKeyOf(request.to)]).toEqual(['2026-11-01', '2026-11-14']);
	});

	it('asks Gauzy for its Monday weeks as they are, and for days to add up into any other week', () => {
		expect(apiLimitDurationOf('week', MONDAY)).toBe('week');
		expect(apiLimitDurationOf('week', SUNDAY)).toBe('day');
		expect(apiLimitDurationOf('day', SUNDAY)).toBe('day');
	});

	it('adds the days of Sunday 1 to Saturday 7 November into one week, and starts the next with Sunday 8', () => {
		const days = [dayReportOf('2026-11-01', 2), dayReportOf('2026-11-07', 3), dayReportOf('2026-11-08', 4)];

		const weeks = weeklyReportsOfDays(days, SUNDAY);

		expect(weeks.map((week) => week.date)).toEqual(['2026-11-01', '2026-11-08']);
		expect(weeks[0].employees[0].duration).toBe(5 * HOUR);
		expect(weeks[0].employees[0].limit).toBe(40 * HOUR);
		expect(weeks[0].employees[0].durationPercentage).toBe(12.5);
		expect(weeks[1].employees[0].duration).toBe(4 * HOUR);
	});

	it('keeps the Sunday weeks as the periods of the report', () => {
		const weeks = weeklyReportsOfDays([dayReportOf('2026-11-01', 2), dayReportOf('2026-11-08', 4)], SUNDAY);

		const entries = limitEntriesOf({
			reports: weeks,
			duration: 'week',
			period: { from: new Date(2026, 10, 1), to: new Date(2026, 10, 14) },
			standardLimit: 40 * HOUR,
			members: new Map(),
			unnamedLabel: 'Unnamed',
			weekStartsOn: SUNDAY
		});

		expect(entries.map((entry) => entry.periodKey)).toEqual(['2026-11-01', '2026-11-08']);
	});
});
