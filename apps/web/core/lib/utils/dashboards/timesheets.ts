import {
	addDays,
	addMonths,
	differenceInCalendarDays,
	endOfMonth,
	endOfWeek,
	isAfter,
	isBefore,
	isSameDay,
	isSameMonth,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays
} from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period, WeekStart } from '@/core/lib/utils/dashboard-period';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ERoleName } from '@/core/types/generics/enums/role';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { dateFormatOf, localeTagOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';

export const TIMESHEET_WEEK_START: WeekStart = 1;

/** The order of the status strip and of every status menu: what needs a decision first. */
export const TIMESHEET_STATUS_ORDER: ReadonlyArray<ETimesheetStatus> = [
	ETimesheetStatus.PENDING,
	ETimesheetStatus.APPROVED,
	ETimesheetStatus.DENIED,
	ETimesheetStatus.DRAFT,
	ETimesheetStatus.IN_REVIEW
];

export const ALL_STATUSES = 'ALL';

export type TimesheetStatusFilter = typeof ALL_STATUSES | ETimesheetStatus;

export type TimesheetView = 'sheet' | 'list' | 'week' | 'month' | 'screenshots';

export const TIMESHEET_VIEWS: ReadonlyArray<TimesheetView> = ['sheet', 'list', 'week', 'month', 'screenshots'];

/** Filter values for logs without a project or a task, which Gauzy cannot be asked for by id. */
export const NO_PROJECT_VALUE = '__no-project__';
export const NO_TASK_VALUE = '__no-task__';

const ORGANIZATION_ROLES: ReadonlySet<string> = new Set([ERoleName.SUPER_ADMIN, ERoleName.ADMIN, ERoleName.MANAGER]);

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;

/** Gauzy's DELETE /timesheet/time-log takes at most this many ids per call (the service refuses more). */
export const DELETE_BATCH_SIZE = 100;

export function isTimesheetView(value: unknown): value is TimesheetView {
	const views: ReadonlyArray<unknown> = TIMESHEET_VIEWS;
	return views.includes(value);
}

export function isOrganizationRole(roleName: string | null | undefined) {
	if (!roleName) {
		return false;
	}
	return ORGANIZATION_ROLES.has(roleName);
}

function isTimesheetStatus(value: unknown): value is ETimesheetStatus {
	const statuses: ReadonlyArray<unknown> = TIMESHEET_STATUS_ORDER;
	return statuses.includes(value);
}

export function statusOfLog(log: ITimeLog): ETimesheetStatus | null {
	const status = log.timesheet?.status;
	if (isTimesheetStatus(status)) {
		return status;
	}
	return null;
}

function dateOf(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	const isInvalid = Number.isNaN(date.getTime());
	if (isInvalid) {
		return null;
	}
	return date;
}

export function startOfLog(log: ITimeLog): Date | null {
	return dateOf(log.startedAt);
}

export function endOfLog(log: ITimeLog): Date | null {
	return dateOf(log.stoppedAt);
}

/** The duration of a log as the old table counted it (stop minus start), Gauzy's own figure for a running log. */
export function logDurationSeconds(log: ITimeLog): number {
	const start = startOfLog(log);
	const end = endOfLog(log);
	if (start && end) {
		const elapsedMilliseconds = end.getTime() - start.getTime();
		const elapsedSeconds = Math.round(elapsedMilliseconds / MILLISECONDS_PER_SECOND);
		return Math.max(0, elapsedSeconds);
	}
	const reported = Number(log.duration);
	if (Number.isFinite(reported)) {
		return Math.max(0, reported);
	}
	return 0;
}

export function isManualLog(log: ITimeLog) {
	return log.logType === ETimeLogType.MANUAL;
}

export function manualReasonOf(log: ITimeLog): string | null {
	if (!isManualLog(log)) {
		return null;
	}
	const reason = log.reason?.trim();
	if (!reason) {
		return null;
	}
	return reason;
}

/** Gauzy records only when a log was last changed: neither its previous start and end nor who changed it. */
export function editedAtOfLog(log: ITimeLog): Date | null {
	return dateOf(log.editedAt);
}

/** The local calendar day the time was worked, which is the day a log belongs to in every view of the page. */
export function workDayOfLog(log: ITimeLog): Date | null {
	const candidates = [log.startedAt, log.timesheet?.startedAt, log.createdAt];
	for (const candidate of candidates) {
		const date = dateOf(candidate);
		if (date) {
			return startOfDay(date);
		}
	}
	return null;
}

function startTimeOf(log: ITimeLog) {
	const start = startOfLog(log);
	if (!start) {
		return 0;
	}
	return start.getTime();
}

function byStartAscending(first: ITimeLog, second: ITimeLog) {
	return startTimeOf(first) - startTimeOf(second);
}

export interface TimesheetDay {
	key: string;
	date: Date;
	logs: ITimeLog[];
	totalSeconds: number;
	statuses: ETimesheetStatus[];
}

function statusesPresentIn(logs: ReadonlyArray<ITimeLog>): ETimesheetStatus[] {
	const present = new Set<ETimesheetStatus>();
	for (const log of logs) {
		const status = statusOfLog(log);
		if (status) {
			present.add(status);
		}
	}
	return TIMESHEET_STATUS_ORDER.filter((status) => present.has(status));
}

function totalSecondsOf(logs: ReadonlyArray<ITimeLog>) {
	let total = 0;
	for (const log of logs) {
		total += logDurationSeconds(log);
	}
	return total;
}

/** One group per local day the time was worked, most recent day first, the logs of a day in the order they started. */
export function groupLogsByWorkDay(logs: ReadonlyArray<ITimeLog>): TimesheetDay[] {
	const byDay = new Map<string, { date: Date; logs: ITimeLog[] }>();
	for (const log of logs) {
		const day = workDayOfLog(log);
		if (!day) {
			continue;
		}
		const key = localDayKeyOf(day);
		const existing = byDay.get(key);
		if (existing) {
			existing.logs.push(log);
			continue;
		}
		byDay.set(key, { date: day, logs: [log] });
	}
	const days: TimesheetDay[] = [];
	for (const [key, entry] of byDay) {
		const sortedLogs = [...entry.logs].sort(byStartAscending);
		days.push({
			key,
			date: entry.date,
			logs: sortedLogs,
			totalSeconds: totalSecondsOf(sortedLogs),
			statuses: statusesPresentIn(sortedLogs)
		});
	}
	days.sort((first, second) => second.date.getTime() - first.date.getTime());
	return days;
}

export interface StatusFigure {
	count: number;
	seconds: number;
}

export type StatusSummary = Record<TimesheetStatusFilter, StatusFigure>;

function emptySummary(): StatusSummary {
	return {
		[ALL_STATUSES]: { count: 0, seconds: 0 },
		[ETimesheetStatus.PENDING]: { count: 0, seconds: 0 },
		[ETimesheetStatus.APPROVED]: { count: 0, seconds: 0 },
		[ETimesheetStatus.DENIED]: { count: 0, seconds: 0 },
		[ETimesheetStatus.DRAFT]: { count: 0, seconds: 0 },
		[ETimesheetStatus.IN_REVIEW]: { count: 0, seconds: 0 }
	};
}

/** The number of logs and the time per status, over every log given (never a page of them). */
export function statusSummaryOf(logs: ReadonlyArray<ITimeLog>): StatusSummary {
	const summary = emptySummary();
	for (const log of logs) {
		const seconds = logDurationSeconds(log);
		summary[ALL_STATUSES].count += 1;
		summary[ALL_STATUSES].seconds += seconds;
		const status = statusOfLog(log);
		if (!status) {
			continue;
		}
		summary[status].count += 1;
		summary[status].seconds += seconds;
	}
	return summary;
}

export function logMatchesStatus(log: ITimeLog, filter: TimesheetStatusFilter) {
	if (filter === ALL_STATUSES) {
		return true;
	}
	return statusOfLog(log) === filter;
}

/** Lower case without accents, so "Généré" is found by "genere". */
export function normalizedSearchTextOf(text: string | null | undefined): string {
	if (!text) {
		return '';
	}
	const lowerCased = text.toLowerCase();
	const decomposed = lowerCased.normalize('NFD');
	const withoutAccents = decomposed.replace(/[̀-ͯ]/g, '');
	return withoutAccents.trim();
}

export function logMatchesSearch(log: ITimeLog, normalizedQuery: string) {
	if (!normalizedQuery) {
		return true;
	}
	const fields = [log.task?.title, log.employee?.fullName, log.project?.name, log.task?.taskNumber];
	return fields.some((field) => normalizedSearchTextOf(field).includes(normalizedQuery));
}

export function projectValueOf(log: ITimeLog) {
	const projectId = log.project?.id ?? log.projectId;
	if (projectId) {
		return projectId;
	}
	return NO_PROJECT_VALUE;
}

export function taskValueOf(log: ITimeLog) {
	const taskId = log.task?.id ?? log.taskId;
	if (taskId) {
		return taskId;
	}
	return NO_TASK_VALUE;
}

function matchesPicked(value: string, picked: ReadonlyArray<string>) {
	if (picked.length === 0) {
		return true;
	}
	return picked.includes(value);
}

export function logMatchesPickedProjectsAndTasks(
	log: ITimeLog,
	projects: ReadonlyArray<string>,
	tasks: ReadonlyArray<string>
) {
	const matchesProject = matchesPicked(projectValueOf(log), projects);
	const matchesTask = matchesPicked(taskValueOf(log), tasks);
	return matchesProject && matchesTask;
}

export function distinctMemberCountOf(logs: ReadonlyArray<ITimeLog>) {
	const members = new Set<string>();
	for (const log of logs) {
		const employeeId = log.employee?.id ?? log.employeeId;
		if (employeeId) {
			members.add(employeeId);
		}
	}
	return members.size;
}

export function totalDurationOf(logs: ReadonlyArray<ITimeLog>) {
	return totalSecondsOf(logs);
}

/** The timesheets behind some logs: Gauzy approves and rejects whole timesheets, never a single log. */
export function timesheetIdsOf(logs: ReadonlyArray<ITimeLog>): string[] {
	const ids = new Set<string>();
	for (const log of logs) {
		const timesheetId = log.timesheetId ?? log.timesheet?.id;
		if (timesheetId) {
			ids.add(timesheetId);
		}
	}
	return [...ids];
}

export function chunksOf<T>(items: ReadonlyArray<T>, size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

export interface LogOwner {
	userId: string | null | undefined;
	employeeId: string | null | undefined;
}

export function isOwnLog(log: ITimeLog, owner: LogOwner) {
	const logEmployeeId = log.employee?.id ?? log.employeeId;
	const logUserId = log.employee?.user?.id ?? log.employee?.userId;
	const isSameEmployee = Boolean(owner.employeeId) && logEmployeeId === owner.employeeId;
	const isSameUser = Boolean(owner.userId) && logUserId === owner.userId;
	return isSameEmployee || isSameUser;
}

/** `7:05`, the spreadsheet-friendly duration of the CSV export. */
export function hoursMinutesOf(seconds: number) {
	const safeSeconds = Math.max(0, Math.round(seconds));
	const hours = Math.floor(safeSeconds / SECONDS_PER_HOUR);
	const minutes = Math.floor((safeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	const paddedMinutes = String(minutes).padStart(2, '0');
	return `${hours}:${paddedMinutes}`;
}

export function isDayInPeriod(day: Date, period: Period) {
	const startsAfterEnd = isAfter(startOfDay(day), period.to);
	const endsBeforeStart = isBefore(startOfDay(day), startOfDay(period.from));
	return !startsAfterEnd && !endsBeforeStart;
}

export interface CalendarDay {
	key: string;
	date: Date;
	isInPeriod: boolean;
	isInMonth: boolean;
	isToday: boolean;
}

function calendarDayOf(date: Date, period: Period, month: Date | null, today: Date): CalendarDay {
	let isInMonth = true;
	if (month) {
		isInMonth = isSameMonth(date, month);
	}
	return {
		key: localDayKeyOf(date),
		date,
		isInPeriod: isDayInPeriod(date, period),
		isInMonth,
		isToday: isSameDay(date, today)
	};
}

function daysBetween(first: Date, last: Date): Date[] {
	const days: Date[] = [];
	let current = startOfDay(first);
	while (!isAfter(current, last)) {
		days.push(current);
		current = addDays(current, 1);
	}
	return days;
}

export interface CalendarWeek {
	key: string;
	from: Date;
	to: Date;
	days: CalendarDay[];
}

/** The whole weeks that cover a period, so a column always means the same weekday. */
export function weeksOfPeriod(period: Period, today = new Date()): CalendarWeek[] {
	const weeks: CalendarWeek[] = [];
	let weekStart = startOfWeek(period.from, { weekStartsOn: TIMESHEET_WEEK_START });
	while (!isAfter(weekStart, period.to)) {
		const weekEnd = endOfWeek(weekStart, { weekStartsOn: TIMESHEET_WEEK_START });
		const dates = daysBetween(weekStart, weekEnd);
		weeks.push({
			key: localDayKeyOf(weekStart),
			from: weekStart,
			to: weekEnd,
			days: dates.map((date) => calendarDayOf(date, period, null, today))
		});
		weekStart = addDays(weekStart, 7);
	}
	return weeks;
}

export interface CalendarMonth {
	key: string;
	month: Date;
	days: CalendarDay[];
}

/** Every month the period touches, each as whole weeks so the grid keeps seven columns. */
export function monthsOfPeriod(period: Period, today = new Date()): CalendarMonth[] {
	const months: CalendarMonth[] = [];
	let month = startOfMonth(period.from);
	while (!isAfter(month, period.to)) {
		const gridStart = startOfWeek(month, { weekStartsOn: TIMESHEET_WEEK_START });
		const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: TIMESHEET_WEEK_START });
		const dates = daysBetween(gridStart, gridEnd);
		months.push({
			key: localDayKeyOf(month),
			month,
			days: dates.map((date) => calendarDayOf(date, period, month, today))
		});
		month = addMonths(month, 1);
	}
	return months;
}

export function totalOfDays(days: ReadonlyArray<CalendarDay>, dayByKey: ReadonlyMap<string, TimesheetDay>) {
	let total = 0;
	for (const day of days) {
		const workDay = dayByKey.get(day.key);
		if (workDay) {
			total += workDay.totalSeconds;
		}
	}
	return total;
}

export interface TimesheetFormatters {
	time: (date: Date) => string;
	dayDate: (date: Date) => string;
	/** "Monday", capitalised for a label that starts with it. */
	weekday: (date: Date) => string;
	weekdayShort: (date: Date) => string;
	monthTitle: (date: Date) => string;
	dayNumber: (date: Date) => string;
}

function dayDateOptions(showsYear: boolean): Intl.DateTimeFormatOptions {
	if (showsYear) {
		return { month: 'short', day: 'numeric', year: 'numeric' };
	}
	return { month: 'short', day: 'numeric' };
}

/** One set of `Intl` formatters per locale, built once per page and shared by every row. */
export function timesheetFormattersOf(locale: FormatLocale, now = new Date()): TimesheetFormatters {
	const timeFormat = dateFormatOf(locale, { hour: '2-digit', minute: '2-digit' });
	const currentYearFormat = dateFormatOf(locale, dayDateOptions(false));
	const otherYearFormat = dateFormatOf(locale, dayDateOptions(true));
	const weekdayFormat = dateFormatOf(locale, { weekday: 'long' });
	const weekdayShortFormat = dateFormatOf(locale, { weekday: 'short' });
	const monthFormat = dateFormatOf(locale, { month: 'long', year: 'numeric' });
	const dayNumberFormat = dateFormatOf(locale, { day: 'numeric' });
	const tag = localeTagOf(locale);
	const currentYear = now.getFullYear();
	return {
		time: (date) => timeFormat.format(date),
		dayDate: (date) => {
			const isCurrentYear = date.getFullYear() === currentYear;
			if (isCurrentYear) {
				return currentYearFormat.format(date);
			}
			return otherYearFormat.format(date);
		},
		weekday: (date) => capitalizedOf(weekdayFormat.format(date), tag),
		weekdayShort: (date) => weekdayShortFormat.format(date),
		monthTitle: (date) => capitalizedOf(monthFormat.format(date), tag),
		dayNumber: (date) => dayNumberFormat.format(date)
	};
}

export type RelativeDay = 'today' | 'yesterday' | null;

export function relativeDayOf(date: Date, now = new Date()): RelativeDay {
	if (isSameDay(date, now)) {
		return 'today';
	}
	const yesterday = subDays(now, 1);
	if (isSameDay(date, yesterday)) {
		return 'yesterday';
	}
	return null;
}

const DAYS_IN_A_WEEK = 7;
const SHORTEST_MONTH = 28;

/**
 * The period a view opens on: the week sheet and the week view need at least a week and a month view a month, so a
 * shorter period grows to the week or the month it starts in. A longer period is kept as it is.
 */
export function periodForView(period: Period, view: TimesheetView): Period {
	const length = differenceInCalendarDays(period.to, period.from) + 1;
	const needsAWeek = view === 'week' || view === 'sheet';
	if (needsAWeek) {
		const isShorterThanAWeek = length < DAYS_IN_A_WEEK;
		if (isShorterThanAWeek) {
			const from = startOfWeek(period.from, { weekStartsOn: TIMESHEET_WEEK_START });
			const to = endOfWeek(period.from, { weekStartsOn: TIMESHEET_WEEK_START });
			return { from, to };
		}
		return period;
	}
	if (view === 'month') {
		const isShorterThanAMonth = length < SHORTEST_MONTH;
		if (isShorterThanAMonth) {
			return { from: startOfMonth(period.from), to: endOfMonth(period.from) };
		}
		return period;
	}
	return period;
}

/** Weekday and month names come lower case in some locales ("lundi"); a label that starts with one is capitalised. */
export function capitalizedOf(text: string, locale: string) {
	const first = text.charAt(0);
	const rest = text.slice(1);
	return `${first.toLocaleUpperCase(locale)}${rest}`;
}

/** "09:12 – 11:30", or "09:12 – now" for a log still running. */
export function timeRangeTextOf(log: ITimeLog, formatters: TimesheetFormatters, runningLabel: string) {
	const start = startOfLog(log);
	if (!start) {
		return '–';
	}
	const end = endOfLog(log);
	const startText = formatters.time(start);
	let endText = runningLabel;
	if (end) {
		endText = formatters.time(end);
	}
	return `${startText} – ${endText}`;
}

/** `09:05`, local and 24-hour whatever the reader's locale, for files read by spreadsheets. */
export function clockTimeOf(date: Date | null) {
	if (!date) {
		return '';
	}
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

export type TimesheetSortKey = 'status' | 'task' | 'project' | 'member' | 'time' | 'duration';

export type SortDirection = 'asc' | 'desc';

export interface TimesheetSort {
	key: TimesheetSortKey;
	direction: SortDirection;
}

/** A column header cycles ascending, descending, then back to the order the logs started in. */
export function nextSortOf(current: TimesheetSort | null, key: TimesheetSortKey): TimesheetSort | null {
	const isSameKey = current?.key === key;
	if (!isSameKey) {
		return { key, direction: 'asc' };
	}
	if (current?.direction === 'asc') {
		return { key, direction: 'desc' };
	}
	return null;
}

function statusRankOf(log: ITimeLog) {
	const status = statusOfLog(log);
	if (!status) {
		return TIMESHEET_STATUS_ORDER.length;
	}
	return TIMESHEET_STATUS_ORDER.indexOf(status);
}

function sortTextOf(log: ITimeLog, key: TimesheetSortKey) {
	if (key === 'task') {
		return log.task?.title ?? '';
	}
	if (key === 'project') {
		return log.project?.name ?? '';
	}
	return log.employee?.fullName ?? '';
}

function compareByKey(first: ITimeLog, second: ITimeLog, key: TimesheetSortKey) {
	if (key === 'status') {
		return statusRankOf(first) - statusRankOf(second);
	}
	if (key === 'time') {
		return startTimeOf(first) - startTimeOf(second);
	}
	if (key === 'duration') {
		return logDurationSeconds(first) - logDurationSeconds(second);
	}
	const firstText = sortTextOf(first, key);
	const secondText = sortTextOf(second, key);
	return firstText.localeCompare(secondText, undefined, { numeric: true, sensitivity: 'base' });
}

function directionFactorOf(direction: SortDirection) {
	if (direction === 'asc') {
		return 1;
	}
	return -1;
}

function sortedLogsOf(logs: ReadonlyArray<ITimeLog>, sort: TimesheetSort) {
	const factor = directionFactorOf(sort.direction);
	const compare = (first: ITimeLog, second: ITimeLog) => {
		const order = compareByKey(first, second, sort.key);
		return order * factor;
	};
	return [...logs].sort(compare);
}

function withSortedLogs(day: TimesheetDay, sort: TimesheetSort): TimesheetDay {
	const logs = sortedLogsOf(day.logs, sort);
	return { ...day, logs };
}

/** The logs of every day in the order of the picked column; the days keep their own order, most recent first. */
export function sortedWithinDays(days: ReadonlyArray<TimesheetDay>, sort: TimesheetSort | null): TimesheetDay[] {
	if (!sort) {
		return [...days];
	}
	return days.map((day) => withSortedLogs(day, sort));
}

/**
 * The one status a member or a sheet row shows when its logs mix several: what still needs someone comes first, and
 * approved only when every log is approved.
 */
const LEADING_STATUS_ORDER: ReadonlyArray<ETimesheetStatus> = [
	ETimesheetStatus.PENDING,
	ETimesheetStatus.IN_REVIEW,
	ETimesheetStatus.DENIED,
	ETimesheetStatus.DRAFT,
	ETimesheetStatus.APPROVED
];

export function leadingStatusOf(logs: ReadonlyArray<ITimeLog>): ETimesheetStatus | null {
	const present = statusesPresentIn(logs);
	for (const status of LEADING_STATUS_ORDER) {
		if (present.includes(status)) {
			return status;
		}
	}
	return null;
}

export function isPendingLog(log: ITimeLog) {
	return statusOfLog(log) === ETimesheetStatus.PENDING;
}

export function pendingLogsOf(logs: ReadonlyArray<ITimeLog>): ITimeLog[] {
	return logs.filter(isPendingLog);
}

export function memberIdOfLog(log: ITimeLog): string | null {
	const employeeId = log.employee?.id ?? log.employeeId;
	if (employeeId) {
		return employeeId;
	}
	return null;
}

function memberNameOf(log: ITimeLog | undefined) {
	const fullName = log?.employee?.fullName;
	if (!fullName) {
		return '';
	}
	return fullName.trim();
}

function memberImageOf(log: ITimeLog | undefined) {
	const imageUrl = log?.employee?.user?.imageUrl;
	if (!imageUrl) {
		return null;
	}
	return imageUrl;
}

export interface SheetMember {
	id: string;
	name: string;
	imageUrl: string | null;
	totalSeconds: number;
	logs: ITimeLog[];
	status: ETimesheetStatus | null;
}

function byMemberName(first: SheetMember, second: SheetMember) {
	return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
}

/** Everyone with time in the logs given, by name, each with their logs, their total and their leading status. */
export function sheetMembersOf(logs: ReadonlyArray<ITimeLog>): SheetMember[] {
	const logsByMember = new Map<string, ITimeLog[]>();
	for (const log of logs) {
		const memberId = memberIdOfLog(log);
		if (!memberId) {
			continue;
		}
		const memberLogs = logsByMember.get(memberId);
		if (memberLogs) {
			memberLogs.push(log);
			continue;
		}
		logsByMember.set(memberId, [log]);
	}
	const members: SheetMember[] = [];
	for (const [id, memberLogs] of logsByMember) {
		const firstLog = memberLogs[0];
		members.push({
			id,
			name: memberNameOf(firstLog),
			imageUrl: memberImageOf(firstLog),
			totalSeconds: totalSecondsOf(memberLogs),
			logs: memberLogs,
			status: leadingStatusOf(memberLogs)
		});
	}
	members.sort(byMemberName);
	return members;
}

function isPendingMember(member: SheetMember) {
	return member.status === ETimesheetStatus.PENDING;
}

function hasLogs(member: SheetMember) {
	return member.logs.length > 0;
}

/**
 * The member a sheet opens on: the first one with time waiting for approval, otherwise the first by name with time,
 * otherwise the first one offered without time (the viewer's own empty week).
 */
export function defaultSheetMemberOf(members: ReadonlyArray<SheetMember>): SheetMember | null {
	const firstPending = members.find(isPendingMember);
	if (firstPending) {
		return firstPending;
	}
	const firstWithTime = members.find(hasLogs);
	if (firstWithTime) {
		return firstWithTime;
	}
	return members[0] ?? null;
}

export function withEmptyMembers(
	members: ReadonlyArray<SheetMember>,
	emptyMembers: ReadonlyArray<SheetMember>
): SheetMember[] {
	const knownIds = new Set(members.map((member) => member.id));
	const missing = emptyMembers.filter((member) => !knownIds.has(member.id));
	if (missing.length === 0) {
		return [...members];
	}
	const merged = [...members, ...missing];
	merged.sort(byMemberName);
	return merged;
}

export function emptySheetMemberOf(id: string, name: string, imageUrl: string | null): SheetMember {
	return { id, name: name.trim(), imageUrl, totalSeconds: 0, logs: [], status: null };
}

export interface SheetDay {
	key: string;
	date: Date;
	isToday: boolean;
	isWeekend: boolean;
}

const SUNDAY = 0;
const SATURDAY = 6;

function isWeekendDay(date: Date) {
	const weekday = date.getDay();
	const isSunday = weekday === SUNDAY;
	const isSaturday = weekday === SATURDAY;
	return isSunday || isSaturday;
}

function byDateAscending(first: Date, second: Date) {
	return first.getTime() - second.getTime();
}

/**
 * The columns of the sheet: every day of the period, plus any day a log fell on outside it (a log read in another
 * time zone than the browser's), so the row and day totals always add up to the member's total.
 */
export function sheetDaysOf(period: Period, logs: ReadonlyArray<ITimeLog>, today = new Date()): SheetDay[] {
	const datesByKey = new Map<string, Date>();
	for (const date of daysBetween(period.from, period.to)) {
		datesByKey.set(localDayKeyOf(date), date);
	}
	for (const log of logs) {
		const day = workDayOfLog(log);
		if (!day) {
			continue;
		}
		const key = localDayKeyOf(day);
		if (!datesByKey.has(key)) {
			datesByKey.set(key, day);
		}
	}
	const dates = [...datesByKey.values()];
	dates.sort(byDateAscending);
	return dates.map((date) => ({
		key: localDayKeyOf(date),
		date,
		isToday: isSameDay(date, today),
		isWeekend: isWeekendDay(date)
	}));
}

export interface SheetCell {
	logs: ITimeLog[];
	seconds: number;
}

/**
 * What a sheet row stands for and how it reads, without its logs: a row added by hand or copied from another week
 * has no log yet. Plain values only, so it can be kept on the device.
 */
export interface SheetRowIdentity {
	key: string;
	projectId: string | null;
	taskId: string | null;
	organizationTeamId: string | null;
	projectName: string | null;
	projectColor: string | null;
	projectImageUrl: string | null;
	taskTitle: string | null;
	taskNumber: string | null;
	issueType: string | null;
	isBillable: boolean;
}

export interface SheetRow {
	key: string;
	/** The first log of the row, which carries the task and the project every log of the row shares. */
	sample: ITimeLog;
	identity: SheetRowIdentity;
	logs: ITimeLog[];
	cells: ReadonlyMap<string, SheetCell>;
	totalSeconds: number;
	status: ETimesheetStatus | null;
}

export interface WeekSheet {
	rows: SheetRow[];
	dayTotals: ReadonlyMap<string, number>;
	totalSeconds: number;
	logCount: number;
}

export function sheetRowKeyOf(log: ITimeLog) {
	const projectValue = projectValueOf(log);
	const taskValue = taskValueOf(log);
	return `${projectValue}:${taskValue}`;
}

export function sheetRowKeyFor(projectId: string | null, taskId: string | null) {
	const projectValue = projectId ?? NO_PROJECT_VALUE;
	const taskValue = taskId ?? NO_TASK_VALUE;
	return `${projectValue}:${taskValue}`;
}

function textOrNull(value: string | number | null | undefined): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	return String(value);
}

function rowTaskNumberOf(log: ITimeLog): string | null {
	const taskNumber = textOrNull(log.task?.taskNumber);
	if (taskNumber) {
		return taskNumber;
	}
	const number = textOrNull(log.task?.number);
	if (number) {
		return `#${number}`;
	}
	return null;
}

function idOrNull(value: string): string | null {
	const isPlaceholder = value === NO_PROJECT_VALUE || value === NO_TASK_VALUE;
	if (isPlaceholder) {
		return null;
	}
	return value;
}

export function rowIdentityOfLog(log: ITimeLog): SheetRowIdentity {
	const project = log.project;
	return {
		key: sheetRowKeyOf(log),
		projectId: idOrNull(projectValueOf(log)),
		taskId: idOrNull(taskValueOf(log)),
		organizationTeamId: log.organizationTeamId ?? null,
		projectName: textOrNull(project?.name),
		projectColor: textOrNull(project?.color),
		projectImageUrl: textOrNull(project?.imageUrl),
		taskTitle: textOrNull(log.task?.title),
		taskNumber: rowTaskNumberOf(log),
		issueType: textOrNull(log.task?.issueType),
		isBillable: log.isBillable === true
	};
}

function latestLogOf(logs: ReadonlyArray<ITimeLog>): ITimeLog | undefined {
	let latest: ITimeLog | undefined;
	for (const log of logs) {
		const isLater = !latest || startTimeOf(log) > startTimeOf(latest);
		if (isLater) {
			latest = log;
		}
	}
	return latest;
}

function cellsOf(logs: ReadonlyArray<ITimeLog>): Map<string, SheetCell> {
	const cells = new Map<string, SheetCell>();
	for (const log of logs) {
		const day = workDayOfLog(log);
		if (!day) {
			continue;
		}
		const key = localDayKeyOf(day);
		const seconds = logDurationSeconds(log);
		const cell = cells.get(key);
		if (cell) {
			cell.logs.push(log);
			cell.seconds += seconds;
			continue;
		}
		cells.set(key, { logs: [log], seconds });
	}
	for (const cell of cells.values()) {
		cell.logs.sort(byStartAscending);
	}
	return cells;
}

function cellsTotalOf(cells: ReadonlyMap<string, SheetCell>) {
	let total = 0;
	for (const cell of cells.values()) {
		total += cell.seconds;
	}
	return total;
}

function rowProjectNameOf(row: Pick<SheetRow, 'identity'>) {
	return row.identity.projectName ?? '';
}

function rowTaskTitleOf(row: Pick<SheetRow, 'identity'>) {
	return row.identity.taskTitle ?? '';
}

/** Sorting order of two rows of which only one has a value: the one that has it comes first. */
function presentFirst(isFirstPresent: boolean) {
	if (isFirstPresent) {
		return -1;
	}
	return 1;
}

/** Rows read like a timesheet: grouped by project, then by task, logs without a project or a task last. */
export function bySheetRow(first: Pick<SheetRow, 'identity'>, second: Pick<SheetRow, 'identity'>) {
	const firstProject = rowProjectNameOf(first);
	const secondProject = rowProjectNameOf(second);
	const firstHasProject = firstProject.length > 0;
	const secondHasProject = secondProject.length > 0;
	if (firstHasProject !== secondHasProject) {
		return presentFirst(firstHasProject);
	}
	const projectOrder = firstProject.localeCompare(secondProject, undefined, { sensitivity: 'base' });
	if (projectOrder !== 0) {
		return projectOrder;
	}
	const firstTask = rowTaskTitleOf(first);
	const secondTask = rowTaskTitleOf(second);
	const firstHasTask = firstTask.length > 0;
	const secondHasTask = secondTask.length > 0;
	if (firstHasTask !== secondHasTask) {
		return presentFirst(firstHasTask);
	}
	return firstTask.localeCompare(secondTask, undefined, { numeric: true, sensitivity: 'base' });
}

/** One member's sheet: a row per task and project pair, its time per day, the totals of each day and of the period. */
export function weekSheetOf(logs: ReadonlyArray<ITimeLog>): WeekSheet {
	const logsByRow = new Map<string, ITimeLog[]>();
	for (const log of logs) {
		const key = sheetRowKeyOf(log);
		const rowLogs = logsByRow.get(key);
		if (rowLogs) {
			rowLogs.push(log);
			continue;
		}
		logsByRow.set(key, [log]);
	}
	const rows: SheetRow[] = [];
	for (const [key, rowLogs] of logsByRow) {
		const sample = rowLogs[0];
		if (!sample) {
			continue;
		}
		const cells = cellsOf(rowLogs);
		const identitySource = latestLogOf(rowLogs) ?? sample;
		rows.push({
			key,
			sample,
			identity: rowIdentityOfLog(identitySource),
			logs: rowLogs,
			cells,
			totalSeconds: cellsTotalOf(cells),
			status: leadingStatusOf(rowLogs)
		});
	}
	rows.sort(bySheetRow);
	const dayTotals = new Map<string, number>();
	let totalSeconds = 0;
	for (const row of rows) {
		totalSeconds += row.totalSeconds;
		for (const [dayKey, cell] of row.cells) {
			const dayTotal = dayTotals.get(dayKey) ?? 0;
			const nextDayTotal = dayTotal + cell.seconds;
			dayTotals.set(dayKey, nextDayTotal);
		}
	}
	return { rows, dayTotals, totalSeconds, logCount: logs.length };
}

export interface LogsSelection {
	isChecked: boolean;
	isPartial: boolean;
}

/** Whether every, some or none of some logs are selected, for the checkbox that selects them together. */
export function logsSelectionOf(logs: ReadonlyArray<ITimeLog>, selectedIdSet: ReadonlySet<string>): LogsSelection {
	let selectedCount = 0;
	for (const log of logs) {
		if (selectedIdSet.has(log.id)) {
			selectedCount += 1;
		}
	}
	const hasLogs = logs.length > 0;
	const hasEverySelected = selectedCount === logs.length;
	const isChecked = hasLogs && hasEverySelected;
	const hasSome = selectedCount > 0;
	const isPartial = hasSome && !isChecked;
	return { isChecked, isPartial };
}
