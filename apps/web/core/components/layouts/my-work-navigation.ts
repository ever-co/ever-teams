import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { DiaryView } from '@/core/lib/utils/dashboards/work-diary';

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

/** The Work diary open on a day, by its local date, in one of its views; today's day view needs no parameter. */
export function workDiaryPathOf(day: Date, now: Date = new Date(), view: DiaryView = 'day') {
	const dayKey = localDayKeyOf(day);
	const isToday = dayKey === localDayKeyOf(now);
	const params = new URLSearchParams();
	if (!isToday) {
		params.set('date', dayKey);
	}
	if (view === 'week') {
		params.set('view', view);
	}
	const query = params.toString();
	if (!query) {
		return WORK_DIARY_PATH;
	}
	return `${WORK_DIARY_PATH}?${query}`;
}
