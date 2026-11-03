import { isSameYear, subDays } from 'date-fns';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { durationPartsOf, formatHoursLabel, percentOf } from '@/core/lib/utils/dashboard-figures';
import { daysOfPeriod, type Period, type WeekStart } from '@/core/lib/utils/dashboard-period';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTimeLogReportWeekly } from '@/core/types/schemas/timer/time-log.schema';

export type PlanGrouping = 'member' | 'day';

/** Gauzy starts its weeks on Monday, as the other reports do. */
export const PLAN_WEEK_START: WeekStart = 1;

const SECONDS_PER_HOUR = 3600;

/**
 * Where a member day's expected time comes from: the hours written on the daily plan, the sum of its tasks'
 * estimates when no hours are written, nothing when the plan has neither, or no plan at all that day.
 */
export type ExpectedSource = 'planned' | 'estimates' | 'withoutTime' | 'noPlan';

export interface PlanMember {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

export interface MemberDay {
	key: string;
	dayKey: string;
	day: Date;
	employeeId: string;
	name: string;
	imageUrl: string | null;
	source: ExpectedSource;
	/** Seconds; null when the day has no plan or a plan without time. */
	expected: number | null;
	/** Seconds; null when the plan's tasks carry no estimate. */
	taskEstimates: number | null;
	actual: number;
}

export interface PlanTotals {
	expected: number;
	hasExpected: boolean;
	actual: number;
	/** Seconds over plan, summed day by day: never netted against the days under plan. */
	over: number;
	under: number;
	overDays: number;
	underDays: number;
	/** Member days with time tracked and no plan. */
	unplannedDays: number;
	/** Member days whose plan gave an expected time. */
	plannedDays: number;
	/** Member days whose plan holds neither hours nor estimates. */
	withoutTimeDays: number;
	taskEstimates: number;
	hasTaskEstimates: boolean;
	share: number;
}

export interface PlanGroup {
	key: string;
	member: PlanMember | null;
	day: Date | null;
	rows: MemberDay[];
	totals: PlanTotals;
}

export interface PlanFigures {
	totals: PlanTotals;
	/** Planned time of the days still ahead in the period, which the comparisons leave out. */
	aheadExpected: number;
	aheadPlannedDays: number;
	hasAnyPlan: boolean;
}

export interface PlanDay {
	dayKey: string;
	day: Date;
	isToday: boolean;
	isFuture: boolean;
	expected: number;
	hasExpected: boolean;
	actual: number;
}

export interface MergedPlan {
	plannedSeconds: number;
	estimateSeconds: number;
	hasEstimates: boolean;
}

function finiteOrZero(value: unknown) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

function memberDayKeyOf(employeeId: string, dayKey: string) {
	return `${employeeId}:${dayKey}`;
}

/** Seconds of the plan's own tasks, each task counted once even when two plans of the day hold it. */
function addTaskEstimates(plan: TDailyPlan, merged: MergedPlan, seenTaskIds: Set<string>) {
	for (const task of plan.tasks ?? []) {
		const isSeen = seenTaskIds.has(task.id);
		if (isSeen) {
			continue;
		}
		seenTaskIds.add(task.id);
		const estimate = finiteOrZero(task.estimate);
		if (estimate <= 0) {
			continue;
		}
		merged.estimateSeconds += estimate;
		merged.hasEstimates = true;
	}
}

function plannedSecondsOf(plan: TDailyPlan) {
	const hours = finiteOrZero(plan.workTimePlanned);
	const seconds = hours * SECONDS_PER_HOUR;
	const roundedSeconds = Math.round(seconds);
	return Math.max(0, roundedSeconds);
}

export function plansByMemberDayOf(
	plans: ReadonlyArray<TDailyPlan>,
	employeeIds: ReadonlySet<string>
): Map<string, MergedPlan> {
	const merged = new Map<string, MergedPlan>();
	const seenTasks = new Map<string, Set<string>>();
	for (const plan of plans) {
		const employeeId = plan.employeeId;
		if (!employeeId) {
			continue;
		}
		const isReported = employeeIds.has(employeeId);
		if (!isReported) {
			continue;
		}
		const dayKey = getDailyPlanDay(plan.date);
		const key = memberDayKeyOf(employeeId, dayKey);
		const entry = merged.get(key) ?? { plannedSeconds: 0, estimateSeconds: 0, hasEstimates: false };
		const seenTaskIds = seenTasks.get(key) ?? new Set<string>();
		entry.plannedSeconds += plannedSecondsOf(plan);
		addTaskEstimates(plan, entry, seenTaskIds);
		merged.set(key, entry);
		seenTasks.set(key, seenTaskIds);
	}
	return merged;
}

function weeklySecondsOf(value: TTimeLogReportWeekly['dates'][string] | undefined) {
	if (!value) {
		return 0;
	}
	const seconds = finiteOrZero(value.sum);
	return Math.max(0, seconds);
}

/** Tracked seconds per member and per day, from the weekly report's day keys (`YYYY-MM-DD` in the reader's zone). */
export function actualByMemberDayOf(report: ReadonlyArray<TTimeLogReportWeekly>): Map<string, number> {
	const actual = new Map<string, number>();
	for (const entry of report) {
		const employeeId = entry.employee.id;
		for (const [rawDayKey, value] of Object.entries(entry.dates)) {
			const dayKey = rawDayKey.slice(0, 10);
			const key = memberDayKeyOf(employeeId, dayKey);
			const previous = actual.get(key) ?? 0;
			const seconds = weeklySecondsOf(value);
			actual.set(key, previous + seconds);
		}
	}
	return actual;
}

function sourceOf(plan: MergedPlan | undefined): ExpectedSource {
	if (!plan) {
		return 'noPlan';
	}
	if (plan.plannedSeconds > 0) {
		return 'planned';
	}
	if (plan.estimateSeconds > 0) {
		return 'estimates';
	}
	return 'withoutTime';
}

function expectedOf(plan: MergedPlan | undefined, source: ExpectedSource): number | null {
	if (!plan) {
		return null;
	}
	if (source === 'planned') {
		return plan.plannedSeconds;
	}
	if (source === 'estimates') {
		return plan.estimateSeconds;
	}
	return null;
}

function taskEstimatesOf(plan: MergedPlan | undefined): number | null {
	if (!plan) {
		return null;
	}
	if (!plan.hasEstimates) {
		return null;
	}
	return plan.estimateSeconds;
}

function memberDayOf(
	member: PlanMember,
	day: Date,
	plans: ReadonlyMap<string, MergedPlan>,
	actual: ReadonlyMap<string, number>
): MemberDay {
	const dayKey = localDayKeyOf(day);
	const key = memberDayKeyOf(member.employeeId, dayKey);
	const plan = plans.get(key);
	const source = sourceOf(plan);
	return {
		key,
		dayKey,
		day,
		employeeId: member.employeeId,
		name: member.name,
		imageUrl: member.imageUrl,
		source,
		expected: expectedOf(plan, source),
		taskEstimates: taskEstimatesOf(plan),
		actual: actual.get(key) ?? 0
	};
}

function hasPlanOrTime(memberDay: MemberDay) {
	const hasPlan = memberDay.source !== 'noPlan';
	const hasTime = memberDay.actual > 0;
	return hasPlan || hasTime;
}

function isAfterDay(day: Date, todayKey: string) {
	const dayKey = localDayKeyOf(day);
	return dayKey > todayKey;
}

/** Days of the period that have begun: the comparisons stop at today, a day still ahead has nothing to compare. */
export function begunDaysOf(period: Period, todayKey: string): Date[] {
	return daysOfPeriod(period).filter((day) => !isAfterDay(day, todayKey));
}

export function futureDaysOf(period: Period, todayKey: string): Date[] {
	return daysOfPeriod(period).filter((day) => isAfterDay(day, todayKey));
}

export interface MemberDaysInput {
	members: ReadonlyArray<PlanMember>;
	days: ReadonlyArray<Date>;
	plans: ReadonlyMap<string, MergedPlan>;
	actual: ReadonlyMap<string, number>;
}

/** One entry per member and per day that holds a plan or tracked time; a day with neither is not a row. */
export function memberDaysOf({ members, days, plans, actual }: MemberDaysInput): MemberDay[] {
	const memberDays: MemberDay[] = [];
	for (const member of members) {
		for (const day of days) {
			const memberDay = memberDayOf(member, day, plans, actual);
			const isListed = hasPlanOrTime(memberDay);
			if (isListed) {
				memberDays.push(memberDay);
			}
		}
	}
	return memberDays;
}

/** The signed gap of a day or a total: positive over plan, negative under. Null when nothing was expected. */
export function differenceOf(expected: number | null, actual: number): number | null {
	if (expected === null) {
		return null;
	}
	return actual - expected;
}

function addDayToTotals(totals: PlanTotals, memberDay: MemberDay) {
	totals.actual += memberDay.actual;
	const taskEstimates = memberDay.taskEstimates;
	if (taskEstimates !== null) {
		totals.taskEstimates += taskEstimates;
		totals.hasTaskEstimates = true;
	}
	const isUnplanned = memberDay.source === 'noPlan';
	const hasTime = memberDay.actual > 0;
	const isUnplannedWithTime = isUnplanned && hasTime;
	if (isUnplannedWithTime) {
		totals.unplannedDays += 1;
	}
	if (memberDay.source === 'withoutTime') {
		totals.withoutTimeDays += 1;
	}
	const expected = memberDay.expected;
	if (expected === null) {
		return;
	}
	totals.expected += expected;
	totals.hasExpected = true;
	totals.plannedDays += 1;
	const gap = memberDay.actual - expected;
	if (gap > 0) {
		totals.over += gap;
		totals.overDays += 1;
	}
	if (gap < 0) {
		totals.under -= gap;
		totals.underDays += 1;
	}
}

function emptyTotals(): PlanTotals {
	return {
		expected: 0,
		hasExpected: false,
		actual: 0,
		over: 0,
		under: 0,
		overDays: 0,
		underDays: 0,
		unplannedDays: 0,
		plannedDays: 0,
		withoutTimeDays: 0,
		taskEstimates: 0,
		hasTaskEstimates: false,
		share: 0
	};
}

export function planTotalsOf(memberDays: ReadonlyArray<MemberDay>): PlanTotals {
	const totals = emptyTotals();
	for (const memberDay of memberDays) {
		addDayToTotals(totals, memberDay);
	}
	totals.share = percentOf(totals.actual, totals.expected);
	return totals;
}

export function shareOfDay(memberDay: MemberDay) {
	const expected = memberDay.expected ?? 0;
	return percentOf(memberDay.actual, expected);
}

function aheadFiguresOf(futureDays: ReadonlyArray<MemberDay>) {
	let aheadExpected = 0;
	let aheadPlannedDays = 0;
	for (const memberDay of futureDays) {
		const expected = memberDay.expected;
		if (expected === null) {
			continue;
		}
		aheadExpected += expected;
		aheadPlannedDays += 1;
	}
	return { aheadExpected, aheadPlannedDays };
}

function isPlanned(memberDay: MemberDay) {
	return memberDay.source !== 'noPlan';
}

export function planFiguresOf(
	memberDays: ReadonlyArray<MemberDay>,
	futureMemberDays: ReadonlyArray<MemberDay>
): PlanFigures {
	const totals = planTotalsOf(memberDays);
	const ahead = aheadFiguresOf(futureMemberDays);
	const hasPlanBefore = memberDays.some(isPlanned);
	const hasPlanAhead = futureMemberDays.some(isPlanned);
	return {
		totals,
		aheadExpected: ahead.aheadExpected,
		aheadPlannedDays: ahead.aheadPlannedDays,
		hasAnyPlan: hasPlanBefore || hasPlanAhead
	};
}

function bucketsOf(memberDays: ReadonlyArray<MemberDay>, keyOf: (memberDay: MemberDay) => string) {
	const buckets = new Map<string, MemberDay[]>();
	for (const memberDay of memberDays) {
		const key = keyOf(memberDay);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.push(memberDay);
			continue;
		}
		buckets.set(key, [memberDay]);
	}
	return buckets;
}

function byDay(first: MemberDay, second: MemberDay) {
	return first.day.getTime() - second.day.getTime();
}

function memberDayKey(memberDay: MemberDay) {
	return memberDay.employeeId;
}

function dayKeyOfMemberDay(memberDay: MemberDay) {
	return memberDay.dayKey;
}

/** Every member of the population has a group, so a member with no plan and no time still reads as such. */
export function groupsByMemberOf(
	members: ReadonlyArray<PlanMember>,
	memberDays: ReadonlyArray<MemberDay>
): PlanGroup[] {
	const buckets = bucketsOf(memberDays, memberDayKey);
	return members.map((member) => {
		const bucket = buckets.get(member.employeeId) ?? [];
		const rows = [...bucket].sort(byDay);
		return {
			key: member.employeeId,
			member,
			day: null,
			rows,
			totals: planTotalsOf(rows)
		};
	});
}

export function groupsByDayOf(memberDays: ReadonlyArray<MemberDay>, collator: Intl.Collator): PlanGroup[] {
	const buckets = bucketsOf(memberDays, dayKeyOfMemberDay);
	const groups: PlanGroup[] = [];
	for (const [key, bucket] of buckets) {
		const rows = [...bucket].sort((first, second) => collator.compare(first.name, second.name));
		const day = rows[0]?.day ?? null;
		groups.push({ key, member: null, day, rows, totals: planTotalsOf(rows) });
	}
	groups.sort((first, second) => first.key.localeCompare(second.key));
	return groups;
}

function sumOfDay(memberDays: ReadonlyArray<MemberDay>) {
	let expected = 0;
	let hasExpected = false;
	let actual = 0;
	for (const memberDay of memberDays) {
		actual += memberDay.actual;
		const dayExpected = memberDay.expected;
		if (dayExpected === null) {
			continue;
		}
		expected += dayExpected;
		hasExpected = true;
	}
	return { expected, hasExpected, actual };
}

/** The team's actual and expected per day of the whole period, days ahead included for their planned marker. */
export function planDaysOf(
	period: Period,
	memberDays: ReadonlyArray<MemberDay>,
	futureMemberDays: ReadonlyArray<MemberDay>,
	todayKey: string
): PlanDay[] {
	const allMemberDays = [...memberDays, ...futureMemberDays];
	const buckets = bucketsOf(allMemberDays, dayKeyOfMemberDay);
	return daysOfPeriod(period).map((day) => {
		const dayKey = localDayKeyOf(day);
		const bucket = buckets.get(dayKey) ?? [];
		const sum = sumOfDay(bucket);
		return {
			dayKey,
			day,
			isToday: dayKey === todayKey,
			isFuture: dayKey > todayKey,
			expected: sum.expected,
			hasExpected: sum.hasExpected,
			actual: sum.actual
		};
	});
}

export interface PlanChartLabels {
	label: (day: Date) => string;
	axisLabel: (day: Date) => string;
}

/** Bars for the team's actual, the planned marker for its expected; a day ahead keeps only its marker. */
export function planChartDaysOf(days: ReadonlyArray<PlanDay>, labels: PlanChartLabels): DayBarDatum[] {
	return days.map((day) => {
		const datum: DayBarDatum = {
			key: day.dayKey,
			label: labels.label(day.day),
			axisLabel: labels.axisLabel(day.day),
			value: day.actual,
			isToday: day.isToday,
			isFuture: day.isFuture
		};
		if (day.hasExpected) {
			datum.target = day.expected;
		}
		return datum;
	});
}

export type RelativeDay = 'today' | 'yesterday' | null;

export function relativeDayOf(dayKey: string, now = new Date()): RelativeDay {
	const todayKey = localDayKeyOf(now);
	if (dayKey === todayKey) {
		return 'today';
	}
	const yesterdayKey = localDayKeyOf(subDays(now, 1));
	if (dayKey === yesterdayKey) {
		return 'yesterday';
	}
	return null;
}

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function weekdayFormatterOf(locale: string) {
	const cached = weekdayFormatters.get(locale);
	if (cached) {
		return cached;
	}
	const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
	weekdayFormatters.set(locale, formatter);
	return formatter;
}

function dateFormatterOf(locale: string, showsYear: boolean) {
	const cacheKey = `${locale}:${showsYear}`;
	const cached = dateFormatters.get(cacheKey);
	if (cached) {
		return cached;
	}
	const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
	if (showsYear) {
		options.year = 'numeric';
	}
	const formatter = new Intl.DateTimeFormat(locale, options);
	dateFormatters.set(cacheKey, formatter);
	return formatter;
}

export function dayLabelPartsOf(day: Date, locale: string) {
	const showsYear = !isSameYear(day, new Date());
	const weekday = weekdayFormatterOf(locale).format(day);
	const date = dateFormatterOf(locale, showsYear).format(day);
	return { weekday, date };
}

export function clockHoursOf(seconds: number): string {
	const absoluteSeconds = Math.abs(seconds);
	const { hours, minutes } = durationPartsOf(absoluteSeconds);
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${hours}:${paddedMinutes}`;
}

export function signedClockHoursOf(seconds: number): string {
	const clock = clockHoursOf(seconds);
	if (seconds < 0) {
		return `-${clock}`;
	}
	return clock;
}

export function wholePercentOf(share: number) {
	return Math.round(share);
}

/** Whether the team planned hours on a day: some member with hours, only plans without hours, or no plan at all. */
export type DayPlanState = 'planned' | 'withoutTime' | 'none';

export interface VarianceDay {
	dayKey: string;
	label: string;
	axisLabel: string;
	day: Date;
	isToday: boolean;
	isFuture: boolean;
	planState: DayPlanState;
	expected: number;
	actual: number;
	/** Seconds over plan on the day, summed member by member: never netted against the members under plan. */
	over: number;
	under: number;
	/** Tracked on member days without planned hours, which the comparison leaves out. */
	uncomparedActual: number;
}

interface VarianceSums {
	expected: number;
	hasExpected: boolean;
	hasWithoutTime: boolean;
	actual: number;
	over: number;
	under: number;
	uncomparedActual: number;
}

function emptyVarianceSums(): VarianceSums {
	return {
		expected: 0,
		hasExpected: false,
		hasWithoutTime: false,
		actual: 0,
		over: 0,
		under: 0,
		uncomparedActual: 0
	};
}

function addGapToSums(sums: VarianceSums, gap: number) {
	if (gap > 0) {
		sums.over += gap;
	}
	if (gap < 0) {
		sums.under -= gap;
	}
}

/** A day ahead keeps its planned hours for the tooltip, but has no gap yet: its plan is not under-reached. */
function addMemberDayToSums(sums: VarianceSums, memberDay: MemberDay, isFuture: boolean) {
	sums.actual += memberDay.actual;
	if (memberDay.source === 'withoutTime') {
		sums.hasWithoutTime = true;
	}
	const expected = memberDay.expected;
	if (expected === null) {
		sums.uncomparedActual += memberDay.actual;
		return;
	}
	sums.expected += expected;
	sums.hasExpected = true;
	if (isFuture) {
		return;
	}
	const gap = memberDay.actual - expected;
	addGapToSums(sums, gap);
}

function planStateOf(sums: VarianceSums): DayPlanState {
	if (sums.hasExpected) {
		return 'planned';
	}
	if (sums.hasWithoutTime) {
		return 'withoutTime';
	}
	return 'none';
}

export interface VarianceDaysInput {
	period: Period;
	memberDays: ReadonlyArray<MemberDay>;
	futureMemberDays: ReadonlyArray<MemberDay>;
	todayKey: string;
	labels: PlanChartLabels;
}

export function varianceDaysOf({
	period,
	memberDays,
	futureMemberDays,
	todayKey,
	labels
}: VarianceDaysInput): VarianceDay[] {
	const allMemberDays = [...memberDays, ...futureMemberDays];
	const buckets = bucketsOf(allMemberDays, dayKeyOfMemberDay);
	return daysOfPeriod(period).map((day) => {
		const dayKey = localDayKeyOf(day);
		const isFuture = dayKey > todayKey;
		const sums = emptyVarianceSums();
		const bucket = buckets.get(dayKey) ?? [];
		for (const memberDay of bucket) {
			addMemberDayToSums(sums, memberDay, isFuture);
		}
		return {
			dayKey,
			label: labels.label(day),
			axisLabel: labels.axisLabel(day),
			day,
			isToday: dayKey === todayKey,
			isFuture,
			planState: planStateOf(sums),
			expected: sums.expected,
			actual: sums.actual,
			over: sums.over,
			under: sums.under,
			uncomparedActual: sums.uncomparedActual
		};
	});
}

export interface VarianceAxis {
	/** Seconds, negative: the bottom of the axis, under plan. */
	min: number;
	max: number;
	ticks: number[];
}

/** Hour steps that keep the signed axis to five lines at most, zero included. */
const VARIANCE_HOUR_STEPS = [1, 2, 4, 6, 8, 12, 24, 48];

const MAX_VARIANCE_STEPS = 4;

function largestOverOf(days: ReadonlyArray<VarianceDay>) {
	let largest = 0;
	for (const day of days) {
		largest = Math.max(largest, day.over);
	}
	return largest;
}

function largestUnderOf(days: ReadonlyArray<VarianceDay>) {
	let largest = 0;
	for (const day of days) {
		largest = Math.max(largest, day.under);
	}
	return largest;
}

function stepCountOf(seconds: number, stepHours: number) {
	const hours = seconds / SECONDS_PER_HOUR;
	const steps = Math.ceil(hours / stepHours);
	return Math.max(1, steps);
}

/** Each side keeps at least one step, so the chart reads around its zero line even with nothing under plan. */
export function varianceAxisOf(days: ReadonlyArray<VarianceDay>): VarianceAxis {
	const largestOver = largestOverOf(days);
	const largestUnder = largestUnderOf(days);
	const lastStep = VARIANCE_HOUR_STEPS[VARIANCE_HOUR_STEPS.length - 1];
	let stepHours = lastStep;
	for (const candidate of VARIANCE_HOUR_STEPS) {
		const upSteps = stepCountOf(largestOver, candidate);
		const downSteps = stepCountOf(largestUnder, candidate);
		const fits = upSteps + downSteps <= MAX_VARIANCE_STEPS;
		if (fits) {
			stepHours = candidate;
			break;
		}
	}
	const upSteps = stepCountOf(largestOver, stepHours);
	const downSteps = stepCountOf(largestUnder, stepHours);
	const stepSeconds = stepHours * SECONDS_PER_HOUR;
	const ticks: number[] = [];
	for (let index = -downSteps; index <= upSteps; index += 1) {
		ticks.push(index * stepSeconds);
	}
	return { min: -downSteps * stepSeconds, max: upSteps * stepSeconds, ticks };
}

export function signedHoursLabelOf(seconds: number): string {
	if (seconds > 0) {
		const label = formatHoursLabel(seconds);
		return `+${label}`;
	}
	if (seconds < 0) {
		const label = formatHoursLabel(-seconds);
		return `−${label}`;
	}
	return '0';
}

/** The common length of the bullet rows: the largest of planned and tracked among them, so rows compare. */
export function bulletScaleOf(groups: ReadonlyArray<PlanGroup>): number {
	let scale = 0;
	for (const group of groups) {
		const groupReach = Math.max(group.totals.expected, group.totals.actual);
		scale = Math.max(scale, groupReach);
	}
	return Math.max(scale, 1);
}

export const SECONDS_PER_DOT = 1800;

/** A day holds 24 hours, so a meter never needs more dots than that. */
const MAX_DOTS = 48;

export interface DotCounts {
	planDots: number;
	filledDots: number;
	extraDots: number;
}

function planDotsOf(expected: number) {
	const rounded = Math.round(expected / SECONDS_PER_DOT);
	const atLeastOne = Math.max(1, rounded);
	return Math.min(atLeastOne, MAX_DOTS);
}

export function dotCountsOf(expected: number, actual: number): DotCounts {
	const planDots = planDotsOf(expected);
	const trackedDots = Math.round(actual / SECONDS_PER_DOT);
	const filledDots = Math.min(trackedDots, planDots);
	const pastPlanDots = Math.max(0, trackedDots - planDots);
	const roomLeft = MAX_DOTS - planDots;
	const extraDots = Math.min(pastPlanDots, roomLeft);
	return { planDots, filledDots, extraDots };
}

function hasGroupRows(group: PlanGroup) {
	return group.rows.length > 0;
}

/** The groups that hold a plan or tracked time, in their order; the others fold into one closing line. */
export function activeGroupsOf(groups: ReadonlyArray<PlanGroup>): PlanGroup[] {
	return groups.filter(hasGroupRows);
}

export function idleMembersOf(groups: ReadonlyArray<PlanGroup>): PlanMember[] {
	const members: PlanMember[] = [];
	for (const group of groups) {
		const isIdle = !hasGroupRows(group);
		const member = group.member;
		if (isIdle && member) {
			members.push(member);
		}
	}
	return members;
}

function isIdleDay(day: VarianceDay) {
	const hasBegun = !day.isFuture;
	const hasNoPlan = day.planState === 'none';
	const hasNoTime = day.actual <= 0;
	return hasBegun && hasNoPlan && hasNoTime;
}

/** Begun days where nobody planned or tracked anything: they hold no row of the By day view. */
export function idleDaysOf(days: ReadonlyArray<VarianceDay>): VarianceDay[] {
	return days.filter(isIdleDay);
}
