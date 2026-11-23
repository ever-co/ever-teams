import moment from 'moment';
import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { hoursToHMM, parseStringInputToHours } from '@/core/lib/helpers/date-and-time';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** Past this gap between the planned hours and the tasks' estimates, the plan asks to be adjusted. */
const PLAN_GAP_HOURS = 1;

const SECONDS_PER_HOUR = 3600;

function hasEstimate(task: Pick<TTask, 'estimate'>) {
	const estimate = task.estimate;
	if (typeof estimate !== 'number') {
		return false;
	}
	return estimate > 0;
}

/** A plan started from one task plans its estimate, rounded up to the whole hours the field takes; none plans zero. */
export function plannedHoursForTask(task: Pick<TTask, 'estimate'>) {
	if (!hasEstimate(task)) {
		return 0;
	}
	const estimateSeconds = task.estimate as number;
	return Math.ceil(estimateSeconds / SECONDS_PER_HOUR);
}

/** Tasks still waiting for an estimate come first, so the person sees what blocks the plan. */
export function tasksMissingEstimateFirst(tasks: TTask[]) {
	const missing = tasks.filter((task) => !hasEstimate(task));
	const estimated = tasks.filter(hasEstimate);
	return [...missing, ...estimated];
}

export function todayKey() {
	return moment().format('YYYY-MM-DD');
}

export function isTodayPlan(plan: Pick<TDailyPlan, 'date'> | undefined) {
	if (!plan) {
		return false;
	}
	return getDailyPlanDay(plan.date) === todayKey();
}

export function isSameDay(first: Date | string | number, second: Date | string | number) {
	return getDailyPlanDay(first) === getDailyPlanDay(second);
}

/**
 * The plan's estimate in hours, read from the team's task list: an estimate edited in a plan row lands there first,
 * while the plan's own copy of the task waits for the next fetch.
 */
export function planEstimateHours(plan: TDailyPlan | undefined, teamTasks: TTask[]) {
	const planTaskIds = new Set<string>();
	for (const task of plan?.tasks ?? []) {
		planTaskIds.add(task.id);
	}
	let seconds = 0;
	for (const task of teamTasks) {
		const isPlanned = planTaskIds.has(task.id);
		if (isPlanned) {
			seconds += task.estimate ?? 0;
		}
	}
	return seconds / SECONDS_PER_HOUR;
}

/** `totalWorkedTime` is in seconds, as the plan header reads it. */
export function planTrackedHours(plan: TDailyPlan | undefined) {
	let seconds = 0;
	for (const task of plan?.tasks ?? []) {
		seconds += task.totalWorkedTime ?? 0;
	}
	return seconds / SECONDS_PER_HOUR;
}

function gapWarningKey(plannedHours: number, estimateHours: number): DottedLanguageObjectStringPaths {
	const plansMoreThanEstimated = plannedHours > estimateHours;
	if (plansMoreThanEstimated) {
		return 'dailyPlan.planned_tasks_popup.warning.PLAN_MORE_TASKS';
	}
	return 'dailyPlan.planned_tasks_popup.warning.OPTIMIZE_PLAN';
}

/** The first thing the plan still needs, in the order the previous dialog checked them; null once it is ready. */
export function planWarningKey(
	tasks: TTask[],
	plannedHours: number,
	estimateHours: number
): DottedLanguageObjectStringPaths | null {
	const hasNoTask = tasks.length === 0;
	if (hasNoTask) {
		return 'dailyPlan.planned_tasks_popup.warning.PLEASE_ADD_TASKS';
	}
	const hasNoPlannedTime = plannedHours <= 0;
	if (hasNoPlannedTime) {
		return 'dailyPlan.planned_tasks_popup.warning.PLANNED_TIME';
	}
	const hasUnestimatedTask = tasks.some((task) => !hasEstimate(task));
	if (hasUnestimatedTask) {
		return 'dailyPlan.planned_tasks_popup.warning.TASKS_ESTIMATION';
	}
	const gap = Math.abs(plannedHours - estimateHours);
	const isFarFromEstimate = gap > PLAN_GAP_HOURS;
	if (isFarFromEstimate) {
		return gapWarningKey(plannedHours, estimateHours);
	}
	return null;
}

/**
 * The task the timer starts on: the active task when the plan holds it, otherwise the last estimated task of the
 * list, as the previous dialog picked it.
 */
export function automaticDefaultTask(sortedTasks: TTask[], activeTask: TTask | null) {
	const holdsActiveTask = sortedTasks.some((task) => task.id === activeTask?.id);
	if (holdsActiveTask) {
		return activeTask;
	}
	const estimated = sortedTasks.filter(hasEstimate);
	return estimated.at(-1) ?? null;
}

/** For each planned task, the other upcoming plans (today and later) that also hold it. */
export function otherPlanIdsByTask(tasks: TTask[], upcomingPlans: TDailyPlan[], currentPlanId: string | undefined) {
	const otherPlans = upcomingPlans.filter((plan) => plan.id !== currentPlanId);
	const idsByTask = new Map<string, string[]>();
	for (const task of tasks) {
		const planIds: string[] = [];
		for (const plan of otherPlans) {
			const holdsTask = (plan.tasks ?? []).some((planned) => planned.id === task.id);
			if (holdsTask && plan.id) {
				planIds.push(plan.id);
			}
		}
		idsByTask.set(task.id, planIds);
	}
	return idsByTask;
}

/**
 * The hours typed in the editor's Planned time, read like the Set hours box of the same plan reads them: 2,5, 2.5 and
 * 2:30 are all 2 h 30 min (#5713). Null for an entry that cannot be read.
 */
export function plannedHoursFromInput(raw: string): number | null {
	const { hours, error } = parseStringInputToHours(raw);
	if (error || hours === undefined) {
		return null;
	}
	const isUsable = Number.isFinite(hours) && hours >= 0;
	if (!isUsable) {
		return null;
	}
	return hours;
}

/** What the Planned time field shows for the plan's hours: whole hours as a number, anything else as H:MM. */
export function plannedHoursText(hours: number): string {
	if (Number.isInteger(hours)) {
		return String(hours);
	}
	return hoursToHMM(hours);
}

/** One hour less, never below none: a plan of half an hour steps down to nothing. */
export function oneHourLess(hours: number): number {
	return Math.max(0, hours - 1);
}
