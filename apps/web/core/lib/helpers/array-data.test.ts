/**
 * groupAppsByHour — the Apps and Visited sites tabs list the day's usage hour by hour, latest hour first.
 *
 * Regression: the groups were sorted with `new Date("14:00")`, which is an Invalid Date, so the comparator never
 * saw two real dates and the hours came out in an arbitrary order.
 */
import type { TDailyActivity } from '@/core/types/schemas';
import { groupAppsByHour } from './array-data';

const activity = (time: string | null | undefined, duration: number | null, title = 'App'): TDailyActivity =>
	({ title, date: '2024-05-01', time, duration, sessions: 1, employeeId: 'e1' }) as TDailyActivity;

describe('groupAppsByHour', () => {
	it('orders the hours latest first whatever order the rows arrive in', () => {
		const groups = groupAppsByHour([
			activity('09:00:00', 10),
			activity('17:00:00', 10),
			activity('12:00:00', 10),
			activity('08:00:00', 10),
			activity('23:00:00', 10)
		]);

		expect(groups.map((group) => group.hour)).toEqual(['23:00', '17:00', '12:00', '09:00', '08:00']);
	});

	it('sums the durations of rows sharing an hour', () => {
		const groups = groupAppsByHour([activity('10:00:00', 5, 'A'), activity('10:00:00', 7, 'B')]);

		expect(groups).toHaveLength(1);
		expect(groups[0].totalMilliseconds).toBe(12);
		expect(groups[0].apps.map((app) => app.title)).toEqual(['A', 'B']);
	});

	it('drops rows without a duration and tolerates a missing time', () => {
		const groups = groupAppsByHour([activity('10:00:00', null), activity(undefined, 3)]);

		expect(groups).toHaveLength(1);
		expect(groups[0].hour).toBe('');
	});
});
