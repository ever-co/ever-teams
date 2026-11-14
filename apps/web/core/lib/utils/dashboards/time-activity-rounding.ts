import type { DottedLanguageObjectStringPaths } from 'next-intl';
import {
	roundedSecondsOf,
	type DurationRoundingDirection,
	type DurationRoundingRule
} from '@/core/lib/utils/duration-rounding';
import type {
	ITimeLogGroupedDailyReport,
	ITimerEmployeeLog,
	ITimerTaskLog
} from '@/core/types/interfaces/activity/activity-report';

/** What the page and its PDF say beside a rounded total, with the rule's minutes. */
export const ROUNDING_NOTE_KEYS: Record<DurationRoundingDirection, DottedLanguageObjectStringPaths> = {
	UP: 'dashboard.timeActivity.sheet.ROUNDED_UP',
	DOWN: 'dashboard.timeActivity.sheet.ROUNDED_DOWN',
	NEAREST: 'dashboard.timeActivity.sheet.ROUNDED_NEAREST'
};

function secondsOf(value: unknown): number {
	const seconds = Number(value);
	if (!Number.isFinite(seconds)) {
		return 0;
	}
	return Math.max(seconds, 0);
}

function sumOfTasks(tasks: ReadonlyArray<ITimerTaskLog>): number {
	let seconds = 0;
	for (const task of tasks) {
		seconds += secondsOf(task?.duration);
	}
	return seconds;
}

/**
 * A member's time on a project and day with each entry rounded. The daily report lists one task row per entry, so
 * each row is rounded on its own and the member's time adds them; the activity percent stays what was tracked.
 */
function roundedEmployeeLogOf(employeeLog: ITimerEmployeeLog, rule: DurationRoundingRule): ITimerEmployeeLog {
	const tasks = employeeLog?.tasks ?? [];
	const roundedTasks = tasks.map((task) => ({
		...task,
		duration: roundedSecondsOf(secondsOf(task?.duration), rule)
	}));
	let sum = sumOfTasks(roundedTasks);
	// Time the rows do not account for is rounded as one entry
	const timeOutsideTasks = secondsOf(employeeLog?.sum) - sumOfTasks(tasks);
	if (timeOutsideTasks > 0) {
		sum += roundedSecondsOf(timeOutsideTasks, rule);
	}
	return { ...employeeLog, tasks: roundedTasks, sum };
}

/**
 * The daily report with each entry rounded; without a rule, the report as the API gives it. Every row, total and
 * export of Time & activity is built from it, so a total matches its lines.
 */
export function roundedDailyReportOf(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	rule: DurationRoundingRule | null
): ReadonlyArray<ITimeLogGroupedDailyReport> {
	if (!rule) {
		return report;
	}
	return report.map((day) => {
		const logs = (day?.logs ?? []).map((projectLog) => {
			const employeeLogs = (projectLog?.employeeLogs ?? []).map((log) => roundedEmployeeLogOf(log, rule));
			return { ...projectLog, employeeLogs };
		});
		return { ...day, logs };
	});
}
