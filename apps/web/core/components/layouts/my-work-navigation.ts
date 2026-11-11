import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';

/** The signed-in person's own Work diary: their day of tracked time, tasks, screenshots and apps. */
export const WORK_DIARY_PATH = '/work-diary';

/**
 * The links of the sidebar's My work group. Work diary is the person's own page, outside Reports (only team managers
 * may open Reports); the team's timesheets stay under Reports › Timesheets.
 */
export function getMyWorkNavigation() {
	return {
		timeAndActivity: '/reports/time-and-activity',
		workDiary: WORK_DIARY_PATH
	};
}

/** The Work diary open on a day, by its local date; today's needs no date. */
export function workDiaryPathOf(day: Date, now: Date = new Date()) {
	const dayKey = localDayKeyOf(day);
	const isToday = dayKey === localDayKeyOf(now);
	if (isToday) {
		return WORK_DIARY_PATH;
	}
	return `${WORK_DIARY_PATH}?date=${dayKey}`;
}
