import {
	addDays,
	addMilliseconds,
	addMinutes,
	addMonths,
	addWeeks,
	endOfDay,
	max,
	min,
	endOfWeek,
	isSameMonth,
	startOfDay,
	startOfMonth,
	startOfWeek
} from 'date-fns';
import { daysOfPeriod, type Period, type WeekStart } from '@/core/lib/utils/dashboard-period';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	endOfLog,
	isManualLog,
	logDurationSeconds,
	manualReasonOf,
	startOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { EWeekDays } from '@/core/types/generics/enums/date';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TDailyPlan, TOrganizationTeam } from '@/core/types/schemas';

export type CalendarView = 'month' | 'week' | 'day';

export const DEFAULT_CALENDAR_VIEW: CalendarView = 'month';

export const HOURS_IN_DAY = 24;

const ADD_TIME_SLOT_MINUTES = 30;
const ADD_TIME_DEFAULT_MINUTES = 60;

export interface AddTimeRange {
	start: Date;
	end: Date;
}

/** A click in the time grid starts Add time on the half hour under the pointer. */
export function slotStartAt(day: Date, minutesFromMidnight: number) {
	const slotIndex = Math.floor(minutesFromMidnight / ADD_TIME_SLOT_MINUTES);
	const slotMinutes = slotIndex * ADD_TIME_SLOT_MINUTES;
	const dayStart = startOfDay(day);
	return addMinutes(dayStart, slotMinutes);
}

/** Add time from a day (not a slot) starts on that day at the current time of day. */
export function dayAtCurrentTime(day: Date, now = new Date()) {
	const minutesFromMidnight = now.getHours() * 60 + now.getMinutes();
	const dayStart = startOfDay(day);
	return addMinutes(dayStart, minutesFromMidnight);
}

/** The dialog holds one date, so the prefilled hour never runs past the end of the start's day. */
export function addTimeRangeFrom(start: Date): AddTimeRange {
	const hourLater = addMinutes(start, ADD_TIME_DEFAULT_MINUTES);
	const lastMinute = startOfDay(addDays(start, 1));
	const dayEnd = addMinutes(lastMinute, -1);
	const end = min([hourLater, dayEnd]);
	return { start, end };
}

export const MINUTES_IN_DAY = 1440;

/** The hour the week and day grids scroll to when the range holds no entry. */
export const DEFAULT_SCROLL_HOUR = 8;

const DAYS_IN_MONTH_GRID = 42;

const SECONDS_PER_HOUR = 3600;

const MILLISECONDS_PER_SECOND = 1000;

const MILLISECONDS_PER_MINUTE = 60_000;

const MINUTES_PER_HOUR = 60;

const SUNDAY_INDEX = 0;

const SATURDAY_INDEX = 6;

const MONDAY_START: WeekStart = 1;

const WEEK_START_OF_DAY: Record<EWeekDays, WeekStart> = {
	[EWeekDays.SUNDAY]: 0,
	[EWeekDays.MONDAY]: 1,
	[EWeekDays.TUESDAY]: 2,
	[EWeekDays.WEDNESDAY]: 3,
	[EWeekDays.THURSDAY]: 4,
	[EWeekDays.FRIDAY]: 5,
	[EWeekDays.SATURDAY]: 6
};

export interface CalendarMember {
	employeeId: string;
	userId: string | null;
	name: string;
	imageUrl: string | null;
}

export interface CalendarEntry {
	id: string;
	log: ITimeLog;
	start: Date;
	end: Date;
	/** The local day this entry is drawn on: a log crossing midnight gives one entry per day it covers. */
	dayKey: string;
	/** The whole log, shown on each of its days. */
	durationSeconds: number;
	/** The part of the log inside `dayKey`, the one the day's totals count. */
	daySeconds: number;
	isManual: boolean;
	isRunning: boolean;
	isBillable: boolean;
	taskTitle: string | null;
	/**
	 * The id of the project the log came with, what its colour is derived from when it has none. Null for time
	 * without a project, and for a log that names a project Gauzy no longer returns: it has no name to show.
	 */
	projectKey: string | null;
	projectName: string | null;
	projectColor: string | null;
	reason: string | null;
}

/** The time one project took over the counted days. `key` is null for the time without a project. */
export interface CalendarProjectTotal {
	key: string | null;
	name: string | null;
	color: string | null;
	seconds: number;
}

export interface CalendarPlanTask {
	id: string;
	title: string;
	estimateSeconds: number | null;
}

export interface CalendarDayPlan {
	/** The planned time of the day; when the plan has none, the sum of its tasks' estimates. */
	expectedSeconds: number | null;
	isFromEstimates: boolean;
	tasks: CalendarPlanTask[];
}

export interface CalendarDay {
	key: string;
	date: Date;
	entries: CalendarEntry[];
	trackedSeconds: number;
	manualSeconds: number;
	plan: CalendarDayPlan | null;
}

export interface PlacedEntry {
	entry: CalendarEntry;
	startMinute: number;
	endMinute: number;
	column: number;
	columnCount: number;
}

/** The organisation's first day of the week, Monday when it has none. */
export function weekStartOf(startWeekOn: EWeekDays | null | undefined): WeekStart {
	if (!startWeekOn) {
		return MONDAY_START;
	}
	return WEEK_START_OF_DAY[startWeekOn] ?? MONDAY_START;
}

/** The days a view shows: six whole weeks for a month, so the grid never changes height between months. */
export function visibleRangeOf(view: CalendarView, anchor: Date, weekStartsOn: WeekStart): Period {
	if (view === 'month') {
		const firstOfMonth = startOfMonth(anchor);
		const from = startOfWeek(firstOfMonth, { weekStartsOn });
		const lastDay = addDays(from, DAYS_IN_MONTH_GRID - 1);
		return { from, to: endOfDay(lastDay) };
	}
	if (view === 'week') {
		const from = startOfWeek(anchor, { weekStartsOn });
		const to = endOfWeek(anchor, { weekStartsOn });
		return { from, to };
	}
	return { from: startOfDay(anchor), to: endOfDay(anchor) };
}

/**
 * The days sent to Gauzy: the time-log list reads its bounds as midnight UTC of the dates, so one more day on each
 * side covers every time zone, and the entries are then kept by the local days they cover.
 */
export function requestDaysOf(range: Period) {
	const firstDay = addDays(range.from, -1);
	const lastDay = addDays(range.to, 1);
	return { startDate: localDayKeyOf(firstDay), endDate: localDayKeyOf(lastDay) };
}

export function shiftedAnchorOf(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
	if (view === 'month') {
		return addMonths(anchor, direction);
	}
	if (view === 'week') {
		return addWeeks(anchor, direction);
	}
	return addDays(anchor, direction);
}

export function isWeekendDay(date: Date) {
	const weekday = date.getDay();
	const isSunday = weekday === SUNDAY_INDEX;
	const isSaturday = weekday === SATURDAY_INDEX;
	return isSunday || isSaturday;
}

export function isInAnchorMonth(date: Date, anchor: Date) {
	return isSameMonth(date, anchor);
}

function memberNameOf(member: NonNullable<TOrganizationTeam['members']>[number]) {
	const employeeName = member.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = member.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return member.fullName?.trim() ?? '';
}

function memberImageOf(member: NonNullable<TOrganizationTeam['members']>[number]) {
	const employeeImage = member.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return member.user?.imageUrl ?? null;
}

function memberUserIdOf(member: NonNullable<TOrganizationTeam['members']>[number]) {
	const employeeUserId = member.employee?.userId;
	if (employeeUserId) {
		return employeeUserId;
	}
	return member.user?.id ?? null;
}

/** The active team's members, once each, sorted by name. */
export function calendarMembersOf(members: TOrganizationTeam['members']): CalendarMember[] {
	const byEmployee = new Map<string, CalendarMember>();
	for (const member of members ?? []) {
		const employeeId = member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		byEmployee.set(employeeId, {
			employeeId,
			userId: memberUserIdOf(member),
			name: memberNameOf(member),
			imageUrl: memberImageOf(member)
		});
	}
	const list = [...byEmployee.values()];
	list.sort((first, second) => first.name.localeCompare(second.name));
	return list;
}

function employeeIdOfLog(log: ITimeLog) {
	return log.employeeId ?? log.employee?.id ?? null;
}

function trimmedOrNull(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

function runningEndOf(start: Date, now: Date) {
	const isAfterStart = now.getTime() > start.getTime();
	if (isAfterStart) {
		return now;
	}
	return start;
}

function stoppedEndOf(log: ITimeLog, start: Date, durationSeconds: number) {
	const end = endOfLog(log);
	const hasEnd = end !== null;
	if (hasEnd && end.getTime() > start.getTime()) {
		return end;
	}
	const durationMilliseconds = durationSeconds * MILLISECONDS_PER_SECOND;
	const endTime = start.getTime() + durationMilliseconds;
	return new Date(endTime);
}

function secondsBetween(start: Date, end: Date) {
	const elapsedMilliseconds = end.getTime() - start.getTime();
	const elapsedSeconds = Math.round(elapsedMilliseconds / MILLISECONDS_PER_SECOND);
	return Math.max(0, elapsedSeconds);
}

function isInRange(date: Date, range: Period) {
	const time = date.getTime();
	const isAfterStart = time >= range.from.getTime();
	const isBeforeEnd = time <= range.to.getTime();
	return isAfterStart && isBeforeEnd;
}

function entryOf(log: ITimeLog, start: Date, now: Date): CalendarEntry {
	const isRunning = log.isRunning === true;
	let durationSeconds = logDurationSeconds(log);
	let end = stoppedEndOf(log, start, durationSeconds);
	if (isRunning) {
		end = runningEndOf(start, now);
		durationSeconds = secondsBetween(start, end);
	}
	return {
		id: log.id,
		log,
		start,
		end,
		dayKey: localDayKeyOf(start),
		durationSeconds,
		daySeconds: durationSeconds,
		isManual: isManualLog(log),
		isRunning,
		isBillable: log.isBillable === true,
		taskTitle: trimmedOrNull(log.task?.title),
		projectKey: log.project?.id || null,
		projectName: trimmedOrNull(log.project?.name),
		projectColor: trimmedOrNull(log.project?.color),
		reason: manualReasonOf(log)
	};
}

function overlapsRange(entry: CalendarEntry, range: Period) {
	if (isInRange(entry.start, range)) {
		return true;
	}
	const startsBeforeRange = entry.start.getTime() < range.from.getTime();
	const endsInsideRange = entry.end.getTime() > range.from.getTime();
	return startsBeforeRange && endsInsideRange;
}

/** An entry ending at midnight belongs to the day before, not to the next one. */
function lastMomentOf(entry: CalendarEntry) {
	const hasLength = entry.end.getTime() > entry.start.getTime();
	if (!hasLength) {
		return entry.start;
	}
	return addMilliseconds(entry.end, -1);
}

function daySegmentOf(entry: CalendarEntry, dayStart: Date): CalendarEntry {
	const nextDayStart = addDays(dayStart, 1);
	const segmentStart = max([entry.start, dayStart]);
	const segmentEnd = min([entry.end, nextDayStart]);
	const daySeconds = secondsBetween(segmentStart, segmentEnd);
	const dayKey = localDayKeyOf(dayStart);
	return { ...entry, dayKey, daySeconds };
}

/** One entry per visible local day the log covers, each counting only its own part of the log. */
function daySegmentsOf(entry: CalendarEntry, range: Period): CalendarEntry[] {
	const shownStart = max([entry.start, range.from]);
	const shownLastMoment = min([lastMomentOf(entry), range.to]);
	const firstDay = startOfDay(shownStart);
	const lastDay = startOfDay(shownLastMoment);
	const startDay = startOfDay(entry.start);
	const isOnStartDay = firstDay.getTime() === startDay.getTime();
	const isOneDay = firstDay.getTime() === lastDay.getTime();
	if (isOnStartDay && isOneDay) {
		return [entry];
	}
	const segments: CalendarEntry[] = [];
	for (let day = firstDay; day.getTime() <= lastDay.getTime(); day = addDays(day, 1)) {
		const segment = daySegmentOf(entry, day);
		segments.push(segment);
	}
	return segments;
}

/**
 * The member's logs that cover the visible days, a log crossing midnight on each of its days. Logs of anyone else are dropped: Gauzy answers a caller who
 * may not read the asked member with the caller's own logs, and those must never be drawn under another name.
 */
export function calendarEntriesOf(
	logs: ReadonlyArray<ITimeLog>,
	range: Period,
	employeeId: string,
	now: Date
): CalendarEntry[] {
	const entries: CalendarEntry[] = [];
	for (const log of logs) {
		const isMemberLog = employeeIdOfLog(log) === employeeId;
		if (!isMemberLog) {
			continue;
		}
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const entry = entryOf(log, start, now);
		if (!overlapsRange(entry, range)) {
			continue;
		}
		const segments = daySegmentsOf(entry, range);
		entries.push(...segments);
	}
	entries.sort((first, second) => first.start.getTime() - second.start.getTime());
	return entries;
}

function estimateSecondsOf(estimate: number | null | undefined) {
	const seconds = Number(estimate);
	const isUsable = Number.isFinite(seconds) && seconds > 0;
	if (!isUsable) {
		return null;
	}
	return seconds;
}

function planTasksOf(plan: TDailyPlan): CalendarPlanTask[] {
	const tasks: CalendarPlanTask[] = [];
	for (const task of plan.tasks ?? []) {
		tasks.push({
			id: task.id,
			title: task.title?.trim() ?? '',
			estimateSeconds: estimateSecondsOf(task.estimate)
		});
	}
	return tasks;
}

function estimatesTotalOf(tasks: ReadonlyArray<CalendarPlanTask>) {
	let total = 0;
	for (const task of tasks) {
		total += task.estimateSeconds ?? 0;
	}
	return total;
}

function plannedSecondsOf(plans: ReadonlyArray<TDailyPlan>) {
	let total = 0;
	for (const plan of plans) {
		const hours = Number(plan.workTimePlanned);
		const isUsable = Number.isFinite(hours) && hours > 0;
		if (isUsable) {
			total += hours * SECONDS_PER_HOUR;
		}
	}
	return total;
}

function dayPlanOf(plans: ReadonlyArray<TDailyPlan>): CalendarDayPlan {
	const tasks = plans.flatMap(planTasksOf);
	const plannedSeconds = plannedSecondsOf(plans);
	if (plannedSeconds > 0) {
		return { expectedSeconds: plannedSeconds, isFromEstimates: false, tasks };
	}
	const estimatesSeconds = estimatesTotalOf(tasks);
	if (estimatesSeconds > 0) {
		return { expectedSeconds: estimatesSeconds, isFromEstimates: true, tasks };
	}
	return { expectedSeconds: null, isFromEstimates: false, tasks };
}

/** The member's daily plans of the visible days, from the team plans already loaded, one per day. */
export function plansByDayOf(
	plans: ReadonlyArray<TDailyPlan>,
	employeeId: string,
	range: Period
): Map<string, CalendarDayPlan> {
	const firstKey = localDayKeyOf(range.from);
	const lastKey = localDayKeyOf(range.to);
	const plansOfDay = new Map<string, TDailyPlan[]>();
	for (const plan of plans) {
		const isMemberPlan = plan.employeeId === employeeId;
		if (!isMemberPlan) {
			continue;
		}
		const dayKey = getDailyPlanDay(plan.date);
		const isBeforeRange = dayKey < firstKey;
		const isAfterRange = dayKey > lastKey;
		if (isBeforeRange || isAfterRange) {
			continue;
		}
		const sameDay = plansOfDay.get(dayKey) ?? [];
		sameDay.push(plan);
		plansOfDay.set(dayKey, sameDay);
	}
	const byDay = new Map<string, CalendarDayPlan>();
	for (const [dayKey, dayPlans] of plansOfDay) {
		const dayPlan = dayPlanOf(dayPlans);
		byDay.set(dayKey, dayPlan);
	}
	return byDay;
}

function entriesByDayOf(entries: ReadonlyArray<CalendarEntry>) {
	const byDay = new Map<string, CalendarEntry[]>();
	for (const entry of entries) {
		const sameDay = byDay.get(entry.dayKey) ?? [];
		sameDay.push(entry);
		byDay.set(entry.dayKey, sameDay);
	}
	return byDay;
}

function totalsOf(entries: ReadonlyArray<CalendarEntry>) {
	let trackedSeconds = 0;
	let manualSeconds = 0;
	for (const entry of entries) {
		trackedSeconds += entry.daySeconds;
		if (entry.isManual) {
			manualSeconds += entry.daySeconds;
		}
	}
	return { trackedSeconds, manualSeconds };
}

export function calendarDaysOf(
	range: Period,
	entries: ReadonlyArray<CalendarEntry>,
	plansByDay: ReadonlyMap<string, CalendarDayPlan>
): CalendarDay[] {
	const entriesByDay = entriesByDayOf(entries);
	return daysOfPeriod(range).map((date) => {
		const key = localDayKeyOf(date);
		const dayEntries = entriesByDay.get(key) ?? [];
		const { trackedSeconds, manualSeconds } = totalsOf(dayEntries);
		return {
			key,
			date,
			entries: dayEntries,
			trackedSeconds,
			manualSeconds,
			plan: plansByDay.get(key) ?? null
		};
	});
}

/** The days the toolbar total counts: the month itself in the month view, every shown day otherwise. */
export function countedDaysOf(view: CalendarView, days: ReadonlyArray<CalendarDay>, anchor: Date): CalendarDay[] {
	if (view !== 'month') {
		return [...days];
	}
	return days.filter((day) => isInAnchorMonth(day.date, anchor));
}

export function trackedTotalOf(days: ReadonlyArray<CalendarDay>) {
	let total = 0;
	for (const day of days) {
		total += day.trackedSeconds;
	}
	return total;
}

const WITHOUT_PROJECT = '';

function isWithoutProject(total: CalendarProjectTotal) {
	return total.key === null;
}

/** Largest first; the time without a project closes the list, whatever its size. */
function compareProjectTotals(first: CalendarProjectTotal, second: CalendarProjectTotal) {
	const firstIsLast = isWithoutProject(first);
	const secondIsLast = isWithoutProject(second);
	if (firstIsLast !== secondIsLast) {
		return Number(firstIsLast) - Number(secondIsLast);
	}
	return second.seconds - first.seconds;
}

/**
 * Where the time of the given days went, one total per project. Each entry counts the part of its log inside its
 * day (`daySeconds`), as the days' own totals do, so the totals add up to `trackedTotalOf` of the same days.
 */
export function projectTotalsOf(days: ReadonlyArray<CalendarDay>): CalendarProjectTotal[] {
	const byProject = new Map<string, CalendarProjectTotal>();
	for (const day of days) {
		for (const entry of day.entries) {
			const projectKey = entry.projectKey;
			const mapKey = projectKey ?? WITHOUT_PROJECT;
			const existing = byProject.get(mapKey);
			if (existing) {
				existing.seconds += entry.daySeconds;
				existing.name ??= entry.projectName;
				existing.color ??= entry.projectColor;
				continue;
			}
			byProject.set(mapKey, {
				key: projectKey,
				name: entry.projectName,
				color: entry.projectColor,
				seconds: entry.daySeconds
			});
		}
	}
	const totals = [...byProject.values()];
	const withTime = totals.filter((total) => total.seconds > 0);
	return withTime.sort(compareProjectTotals);
}

function minuteOfDay(date: Date, dayStart: Date) {
	const elapsedMilliseconds = date.getTime() - dayStart.getTime();
	const elapsedMinutes = elapsedMilliseconds / MILLISECONDS_PER_MINUTE;
	const notBeforeMidnight = Math.max(elapsedMinutes, 0);
	return Math.min(notBeforeMidnight, MINUTES_IN_DAY);
}

interface OpenColumn {
	endMinute: number;
}

function columnFor(columns: OpenColumn[], startMinute: number) {
	const freeIndex = columns.findIndex((column) => column.endMinute <= startMinute);
	if (freeIndex >= 0) {
		return freeIndex;
	}
	columns.push({ endMinute: 0 });
	return columns.length - 1;
}

function closeCluster(cluster: PlacedEntry[], columnCount: number, placed: PlacedEntry[]) {
	for (const item of cluster) {
		item.columnCount = columnCount;
		placed.push(item);
	}
}

/**
 * Where each entry of one day sits in its column: minutes from the top, and side by side with the entries it
 * overlaps. A run of overlapping entries shares its columns; the next run starts again at full width.
 */
export function placedEntriesOf(entries: ReadonlyArray<CalendarEntry>, dayStart: Date): PlacedEntry[] {
	const placed: PlacedEntry[] = [];
	let cluster: PlacedEntry[] = [];
	let columns: OpenColumn[] = [];
	let clusterEnd = 0;
	for (const entry of entries) {
		const startMinute = minuteOfDay(entry.start, dayStart);
		const rawEndMinute = minuteOfDay(entry.end, dayStart);
		const endMinute = Math.max(rawEndMinute, startMinute);
		const startsAfterCluster = startMinute >= clusterEnd;
		const hasCluster = cluster.length > 0;
		if (startsAfterCluster && hasCluster) {
			closeCluster(cluster, columns.length, placed);
			cluster = [];
			columns = [];
		}
		const column = columnFor(columns, startMinute);
		columns[column] = { endMinute };
		cluster.push({ entry, startMinute, endMinute, column, columnCount: 1 });
		clusterEnd = Math.max(clusterEnd, endMinute);
	}
	closeCluster(cluster, columns.length, placed);
	return placed;
}

/** The hour the grid opens on: the first entry of the shown days, else 08:00. */
export function scrollHourOf(days: ReadonlyArray<CalendarDay>) {
	let firstMinute = MINUTES_IN_DAY;
	for (const day of days) {
		const firstEntry = day.entries[0];
		if (!firstEntry) {
			continue;
		}
		const minute = minuteOfDay(firstEntry.start, day.date);
		firstMinute = Math.min(firstMinute, minute);
	}
	const hasEntry = firstMinute < MINUTES_IN_DAY;
	if (!hasEntry) {
		return DEFAULT_SCROLL_HOUR;
	}
	return Math.floor(firstMinute / MINUTES_PER_HOUR);
}

export function nowMinuteOf(now: Date) {
	const dayStart = startOfDay(now);
	return minuteOfDay(now, dayStart);
}

/** The day a week strip or a day list opens on: today when it is shown, else the first day of the range. */
export function defaultSelectedDayOf(view: CalendarView, anchor: Date, range: Period, now: Date): Date {
	if (isInRange(now, range)) {
		const isTodayInMonth = isInAnchorMonth(now, anchor);
		const fitsView = view !== 'month' || isTodayInMonth;
		if (fitsView) {
			return startOfDay(now);
		}
	}
	if (view === 'month') {
		return startOfMonth(anchor);
	}
	return startOfDay(range.from);
}

export function weekOfDay(date: Date, weekStartsOn: WeekStart): Date[] {
	const from = startOfWeek(date, { weekStartsOn });
	const to = endOfWeek(date, { weekStartsOn });
	return daysOfPeriod({ from, to });
}

/** "GMT+1", "CET": the zone the hour gutter is written in. */
export function shortTimeZoneNameOf(locale: string, timeZone: string, date: Date) {
	const format = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' });
	const parts = format.formatToParts(date);
	const zonePart = parts.find((part) => part.type === 'timeZoneName');
	return zonePart?.value ?? timeZone;
}

/** The labels of the hour gutter, in the reader's locale ("9 AM", "09"), one per hour from 1 to 23. */
export function hourLabelsOf(locale: string, day: Date) {
	const format = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
	const labels: { hour: number; label: string }[] = [];
	for (let hour = 1; hour < HOURS_IN_DAY; hour++) {
		const time = new Date(day);
		time.setHours(hour, 0, 0, 0);
		const label = format.format(time);
		labels.push({ hour, label });
	}
	return labels;
}
