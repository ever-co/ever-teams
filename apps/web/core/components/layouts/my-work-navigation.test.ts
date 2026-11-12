import { getMyWorkNavigation, workDiaryPathOf } from './my-work-navigation';

describe('getMyWorkNavigation', () => {
	it('links Work Diary to its own page, outside the team reports, and Time & Activity to its report', () => {
		expect(getMyWorkNavigation()).toEqual({
			timeAndActivity: '/reports/time-and-activity',
			workDiary: '/work-diary'
		});
	});

	it('keeps the Work Diary URL safe while user data is loading', () => {
		// The page is the signed-in person's own, so its link needs nothing from the user
		expect(getMyWorkNavigation().workDiary).toBe('/work-diary');
	});
});

describe('workDiaryPathOf', () => {
	const now = new Date(2026, 10, 11, 15, 30);

	it('opens a past day by its local date, and today without one', () => {
		expect(workDiaryPathOf(new Date(2026, 10, 9, 23, 50), now)).toBe('/work-diary?date=2026-11-09');
		expect(workDiaryPathOf(new Date(2026, 10, 11, 8, 0), now)).toBe('/work-diary');
	});
});
