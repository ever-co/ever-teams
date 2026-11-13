import { PROTECTED_APP_URL_PATHS } from '@/core/constants/config/constants';
import { getMyWorkNavigation, workDiaryPathOf } from './my-work-navigation';

function isProtectedPath(pathname: string) {
	return PROTECTED_APP_URL_PATHS.some((pattern) => pattern.test(pathname));
}

describe('getMyWorkNavigation', () => {
	it('links Work Diary to its own page, outside the team reports, and Time & Activity to its report', () => {
		expect(getMyWorkNavigation()).toEqual({
			timeAndActivity: '/reports/time-and-activity',
			workDiary: '/work-diary',
			myWeek: '/my-week'
		});
	});

	it('keeps the Work Diary URL safe while user data is loading', () => {
		// The page is the signed-in person's own, so its link needs nothing from the user
		expect(getMyWorkNavigation().workDiary).toBe('/work-diary');
	});

	it('links My week to its own page, outside the reports only team managers may open', () => {
		const myWeek = getMyWorkNavigation().myWeek;

		expect(myWeek).toBe('/my-week');
		expect(myWeek.startsWith('/reports')).toBe(false);
	});

	it('keeps My week behind the sign-in, in every language', () => {
		expect(isProtectedPath('/my-week')).toBe(true);
		expect(isProtectedPath('/fr/my-week')).toBe(true);
	});
});

describe('workDiaryPathOf', () => {
	const now = new Date(2026, 10, 11, 15, 30);

	it('opens a past day by its local date, and today without one', () => {
		expect(workDiaryPathOf(new Date(2026, 10, 9, 23, 50), now)).toBe('/work-diary?date=2026-11-09');
		expect(workDiaryPathOf(new Date(2026, 10, 11, 8, 0), now)).toBe('/work-diary');
	});

	it('names the week view in the link, with the day when it is not today', () => {
		expect(workDiaryPathOf(new Date(2026, 10, 11, 8, 0), now, 'week')).toBe('/work-diary?view=week');
		expect(workDiaryPathOf(new Date(2026, 10, 9, 23, 50), now, 'week')).toBe(
			'/work-diary?date=2026-11-09&view=week'
		);
		expect(workDiaryPathOf(new Date(2026, 10, 9, 23, 50), now, 'day')).toBe('/work-diary?date=2026-11-09');
	});
});
