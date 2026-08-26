import { getMyWorkNavigation } from './my-work-navigation';

describe('getMyWorkNavigation', () => {
	it('links Time & Activity and Work Diary to working report routes', () => {
		expect(getMyWorkNavigation('employee-1', 'Alex Smith')).toEqual({
			timeAndActivity: '/reports/time-and-activity',
			workDiary: '/reports/timesheet/employee-1?name=Alex%20Smith'
		});
	});

	it('keeps the Work Diary URL safe while user data is loading', () => {
		expect(getMyWorkNavigation(undefined, undefined).workDiary).toBe('/reports/timesheet');
	});
});
