import { describe, expect, it } from '@jest/globals';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { monthsOfPeriod, periodForView, weeksOfPeriod } from './timesheets';
import { diaryStripDaysOf } from './work-diary';

const SUNDAY = 0;
const SATURDAY = 6;

/** Wednesday 4 November 2026. */
const WEDNESDAY = new Date(2026, 10, 4, 12, 0);

function dayKeysOf(dates: ReadonlyArray<Date>): string[] {
	return dates.map((date) => localDayKeyOf(date));
}

describe('the Timesheets and Work diary weeks follow the workspace week start', () => {
	it('opens the week view on the Monday week by default, and on the Sunday week when the workspace says so', () => {
		const day = { from: WEDNESDAY, to: WEDNESDAY };

		const mondayWeek = periodForView(day, 'week');
		const sundayWeek = periodForView(day, 'week', SUNDAY);

		expect(dayKeysOf([mondayWeek.from, mondayWeek.to])).toEqual(['2026-11-02', '2026-11-08']);
		expect(dayKeysOf([sundayWeek.from, sundayWeek.to])).toEqual(['2026-11-01', '2026-11-07']);
	});

	it('puts Sunday 8 November in the week after Sunday 1 to Saturday 7 November', () => {
		const period = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 8) };

		const weeks = weeksOfPeriod(period, WEDNESDAY, SUNDAY);

		expect(weeks.map((week) => week.key)).toEqual(['2026-11-01', '2026-11-08']);
		expect(dayKeysOf([weeks[0].from, weeks[0].to])).toEqual(['2026-11-01', '2026-11-07']);
	});

	it("starts each row of a month grid on the workspace's first day", () => {
		const period = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 30) };

		const [november] = monthsOfPeriod(period, WEDNESDAY, SATURDAY);

		expect(localDayKeyOf(november.days[0].date)).toBe('2026-10-31');
	});

	it("shows the Work diary strip's week from the workspace's first day", () => {
		const period = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 30) };

		const strip = diaryStripDaysOf(period, WEDNESDAY, SUNDAY);

		expect(dayKeysOf([strip[0], strip[strip.length - 1]])).toEqual(['2026-11-01', '2026-11-07']);
	});
});
