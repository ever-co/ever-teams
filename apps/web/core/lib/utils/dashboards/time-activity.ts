import { addDays, addWeeks, endOfDay, endOfWeek, max, min, startOfDay, startOfWeek } from 'date-fns';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { TTimeLogReportWeekly } from '@/core/types/schemas/timer/time-log.schema';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period, WeekStart } from '@/core/lib/utils/dashboard-period';
import {
	type CurrencyAmount,
	type DailyReportRow,
	type DayFigures,
	earningsByCurrencyOf,
	earningsOfRow,
	flattenDailyReport,
	projectKeyOf
} from '@/core/lib/utils/daily-report-figures';
import {
	type ProjectClientIds,
	type ReportProjectLog,
	clientIdOfProjectLog
} from '@/core/lib/utils/dashboards/report-filters';
import { NO_CLIENT_FILTER_VALUE } from '@/core/lib/utils/project-list';

export type TimeActivityGrouping = 'date' | 'member' | 'project' | 'task' | 'week' | 'client';

/** The groupings of the first table of this page, whose components stay in the folder. */
export type TableGrouping = 'date' | 'member' | 'project';

export type BreakdownGrouping = Exclude<TimeActivityGrouping, 'week'>;

export const TIME_ACTIVITY_GROUPINGS: ReadonlyArray<TimeActivityGrouping> = [
	'date',
	'member',
	'project',
	'task',
	'week'
];

export type TimeActivityColumn = 'project' | 'tracked' | 'earnings' | 'activity';

export const TIME_ACTIVITY_COLUMNS: ReadonlyArray<TimeActivityColumn> = ['project', 'tracked', 'earnings', 'activity'];

export interface TimeActivityFilters {
	teamIds: string[];
	employeeIds: string[];
	projectIds: string[];
	taskIds: string[];
	/** Kept in the page link, unlike the four above; `none` stands for the time without a client. */
	clientIds: string[];
	/** Kept in the page link; holds the one value that asks for billable time only. */
	billable: string[];
}

export type TimeActivityFilterField = keyof TimeActivityFilters;

export const TIME_ACTIVITY_FILTER_FIELDS: ReadonlyArray<TimeActivityFilterField> = [
	'teamIds',
	'employeeIds',
	'projectIds',
	'taskIds',
	'clientIds',
	'billable'
];

/** The filters the page saves in the browser, under the keys of the previous page. */
const STORED_FILTER_FIELDS = ['teamIds', 'employeeIds', 'projectIds', 'taskIds'] as const;

export type StoredTimeActivityFilterField = (typeof STORED_FILTER_FIELDS)[number];

export type StoredTimeActivityFilters = Pick<TimeActivityFilters, StoredTimeActivityFilterField>;

export function isStoredTimeActivityFilterField(
	field: TimeActivityFilterField
): field is StoredTimeActivityFilterField {
	const storedFields: ReadonlyArray<string> = STORED_FILTER_FIELDS;
	return storedFields.includes(field);
}

export const EMPTY_STORED_TIME_ACTIVITY_FILTERS: StoredTimeActivityFilters = {
	teamIds: [],
	employeeIds: [],
	projectIds: [],
	taskIds: []
};

/** The keys the previous page used; kept so filters and columns saved before the rebuild still apply. */
export const TIME_ACTIVITY_FILTERS_STORAGE_KEY = 'ever-teams-activity-filters';

export const TIME_ACTIVITY_COLUMNS_STORAGE_KEY = 'ever-teams-activity-view-options';

/** The previous page saved whole objects under these names; only their ids are read back. */
const LEGACY_FILTER_KEYS: Record<StoredTimeActivityFilterField, string> = {
	teamIds: 'teams',
	employeeIds: 'members',
	projectIds: 'projects',
	taskIds: 'tasks'
};

/** The previous page saved its view options with these ids, labels included. */
const LEGACY_COLUMN_IDS: Record<string, TimeActivityColumn> = {
	project: 'project',
	trackedHours: 'tracked',
	earnings: 'earnings',
	activityLevel: 'activity'
};

function isRecord(value: unknown): value is Record<string, unknown> {
	const isObject = typeof value === 'object';
	return isObject && value !== null;
}

function idOf(item: unknown): string | null {
	if (typeof item === 'string') {
		return item || null;
	}
	if (!isRecord(item)) {
		return null;
	}
	const id = item.id;
	if (typeof id === 'string') {
		return id || null;
	}
	return null;
}

function idsOf(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const ids = new Set<string>();
	for (const item of value) {
		const id = idOf(item);
		if (id) {
			ids.add(id);
		}
	}
	return [...ids];
}

function storedIdsOf(stored: Record<string, unknown>, field: StoredTimeActivityFilterField) {
	const hasCurrentField = Array.isArray(stored[field]);
	if (hasCurrentField) {
		return idsOf(stored[field]);
	}
	return idsOf(stored[LEGACY_FILTER_KEYS[field]]);
}

/** Saved filters as ids, whatever the version that saved them. */
export function filtersFromStorage(stored: unknown): StoredTimeActivityFilters {
	if (!isRecord(stored)) {
		return EMPTY_STORED_TIME_ACTIVITY_FILTERS;
	}
	return {
		teamIds: storedIdsOf(stored, 'teamIds'),
		employeeIds: storedIdsOf(stored, 'employeeIds'),
		projectIds: storedIdsOf(stored, 'projectIds'),
		taskIds: storedIdsOf(stored, 'taskIds')
	};
}

export function activeFilterCountOf(filters: TimeActivityFilters) {
	let count = 0;
	for (const field of TIME_ACTIVITY_FILTER_FIELDS) {
		count += filters[field].length;
	}
	return count;
}

function isColumn(value: unknown): value is TimeActivityColumn {
	return TIME_ACTIVITY_COLUMNS.includes(value as TimeActivityColumn);
}

function hiddenLegacyColumnsOf(stored: unknown[]): TimeActivityColumn[] {
	const hidden: TimeActivityColumn[] = [];
	for (const option of stored) {
		if (!isRecord(option)) {
			continue;
		}
		const column = LEGACY_COLUMN_IDS[String(option.id)];
		const isHidden = option.checked === false;
		const isKnownHidden = Boolean(column) && isHidden;
		if (isKnownHidden) {
			hidden.push(column);
		}
	}
	return hidden;
}

/** Hidden columns are saved as keys (`{ hiddenColumns: [...] }`), never as translated labels. */
export function hiddenColumnsFromStorage(stored: unknown): TimeActivityColumn[] {
	if (Array.isArray(stored)) {
		return hiddenLegacyColumnsOf(stored);
	}
	if (!isRecord(stored)) {
		return [];
	}
	const hiddenColumns = stored.hiddenColumns;
	if (!Array.isArray(hiddenColumns)) {
		return [];
	}
	return hiddenColumns.filter(isColumn);
}

export interface ReportProjectRef {
	key: string;
	name: string | null;
	imageUrl: string | null;
	color: string | null;
	seconds: number;
}

export type ReportSubject =
	| { kind: 'day'; dateKey: string }
	| { kind: 'member'; employeeId: string; name: string; imageUrl: string | null }
	| { kind: 'project'; project: ReportProjectRef };

export interface ReportLine {
	key: string;
	subject: ReportSubject;
	seconds: number;
	activeSeconds: number;
	earnings: CurrencyAmount[];
	projects: ReportProjectRef[];
	dayCount: number;
	memberCount: number;
}

export interface ReportGroup extends ReportLine {
	lines: ReportLine[];
}

type Dimension = ReportSubject['kind'];

const DIMENSIONS_OF: Record<TableGrouping, { outer: Dimension; inner: Dimension }> = {
	date: { outer: 'day', inner: 'member' },
	member: { outer: 'member', inner: 'day' },
	project: { outer: 'project', inner: 'member' }
};

export function innerDimensionOf(grouping: TableGrouping): Dimension {
	return DIMENSIONS_OF[grouping].inner;
}

function dimensionKeyOf(row: DailyReportRow, dimension: Dimension) {
	if (dimension === 'day') {
		return row.dateKey;
	}
	if (dimension === 'member') {
		return row.employeeId;
	}
	return projectKeyOf(row);
}

function projectRefOf(row: DailyReportRow, seconds: number): ReportProjectRef {
	return {
		key: projectKeyOf(row),
		name: row.projectName,
		imageUrl: row.projectImageUrl,
		color: row.projectColor,
		seconds
	};
}

function subjectOf(row: DailyReportRow, dimension: Dimension): ReportSubject {
	if (dimension === 'day') {
		return { kind: 'day', dateKey: row.dateKey };
	}
	if (dimension === 'member') {
		return {
			kind: 'member',
			employeeId: row.employeeId,
			name: row.employeeName,
			imageUrl: row.employeeImageUrl
		};
	}
	return { kind: 'project', project: projectRefOf(row, 0) };
}

function bucketsOf(rows: ReadonlyArray<DailyReportRow>, dimension: Dimension) {
	const buckets = new Map<string, DailyReportRow[]>();
	for (const row of rows) {
		const key = dimensionKeyOf(row, dimension);
		const bucket = buckets.get(key) ?? [];
		bucket.push(row);
		buckets.set(key, bucket);
	}
	return buckets;
}

function bySecondsDescending(first: { seconds: number }, second: { seconds: number }) {
	return second.seconds - first.seconds;
}

export function projectRefsOf(rows: ReadonlyArray<DailyReportRow>): ReportProjectRef[] {
	const projects = new Map<string, ReportProjectRef>();
	for (const row of rows) {
		const key = projectKeyOf(row);
		const current = projects.get(key) ?? projectRefOf(row, 0);
		current.seconds += row.seconds;
		projects.set(key, current);
	}
	return [...projects.values()].sort(bySecondsDescending);
}

function distinctCount(rows: ReadonlyArray<DailyReportRow>, valueOf: (row: DailyReportRow) => string) {
	const values = new Set<string>();
	for (const row of rows) {
		values.add(valueOf(row));
	}
	return values.size;
}

function dateKeyOfRow(row: DailyReportRow) {
	return row.dateKey;
}

function employeeIdOfRow(row: DailyReportRow) {
	return row.employeeId;
}

function withSeconds(subject: ReportSubject, seconds: number): ReportSubject {
	if (subject.kind !== 'project') {
		return subject;
	}
	return { kind: 'project', project: { ...subject.project, seconds } };
}

function lineOf(key: string, subject: ReportSubject, rows: ReadonlyArray<DailyReportRow>): ReportLine {
	let seconds = 0;
	let activeSeconds = 0;
	for (const row of rows) {
		seconds += row.seconds;
		activeSeconds += row.activeSeconds;
	}
	return {
		key,
		subject: withSeconds(subject, seconds),
		seconds,
		activeSeconds,
		earnings: earningsByCurrencyOf(rows),
		projects: projectRefsOf(rows),
		dayCount: distinctCount(rows, dateKeyOfRow),
		memberCount: distinctCount(rows, employeeIdOfRow)
	};
}

function compareLines(dimension: Dimension) {
	if (dimension === 'day') {
		return (first: ReportLine, second: ReportLine) => second.key.localeCompare(first.key);
	}
	return bySecondsDescending;
}

function linesOf(rows: ReadonlyArray<DailyReportRow>, dimension: Dimension): ReportLine[] {
	const lines: ReportLine[] = [];
	for (const [key, bucket] of bucketsOf(rows, dimension)) {
		const firstRow = bucket[0];
		lines.push(lineOf(key, subjectOf(firstRow, dimension), bucket));
	}
	return lines.sort(compareLines(dimension));
}

/** The table of a grouping: one group per outer value (days latest first, members and projects largest first). */
export function reportGroupsOf(rows: ReadonlyArray<DailyReportRow>, grouping: TableGrouping): ReportGroup[] {
	const { outer, inner } = DIMENSIONS_OF[grouping];
	const groups: ReportGroup[] = [];
	for (const [key, bucket] of bucketsOf(rows, outer)) {
		const firstRow = bucket[0];
		const line = lineOf(key, subjectOf(firstRow, outer), bucket);
		groups.push({ ...line, lines: linesOf(bucket, inner) });
	}
	return groups.sort(compareLines(outer));
}

export interface ReportTotals {
	seconds: number;
	activeSeconds: number;
	earnings: CurrencyAmount[];
	dayCount: number;
	memberCount: number;
	projectCount: number;
	membersWithoutRate: number;
}

function membersWithoutRateOf(rows: ReadonlyArray<DailyReportRow>) {
	const withoutRate = new Set<string>();
	for (const row of rows) {
		const hasRate = earningsOfRow(row) !== null;
		if (!hasRate) {
			withoutRate.add(row.employeeId);
		}
	}
	return withoutRate.size;
}

export function reportTotalsOf(rows: ReadonlyArray<DailyReportRow>): ReportTotals {
	const line = lineOf('total', { kind: 'day', dateKey: '' }, rows);
	return {
		seconds: line.seconds,
		activeSeconds: line.activeSeconds,
		earnings: line.earnings,
		dayCount: line.dayCount,
		memberCount: line.memberCount,
		projectCount: line.projects.length,
		membersWithoutRate: membersWithoutRateOf(rows)
	};
}

/** The time without a client: the key of the client filter's "No client", so a group and its filter value match. */
export const NO_CLIENT_KEY = NO_CLIENT_FILTER_VALUE;

/** A client of the report. `name` is null for the time without a client, and for a client no list names. */
export interface ReportClientRef {
	key: string;
	name: string | null;
}

export const NO_CLIENT: ReportClientRef = { key: NO_CLIENT_KEY, name: null };

export function hasClient(client: ReportClientRef) {
	return client.key !== NO_CLIENT_KEY;
}

export interface ClientLabels {
	noClient: string;
	/** For a client no list names, as the projects list writes it. */
	unnamedClient: string;
}

export function clientLabelOf(client: ReportClientRef, labels: ClientLabels) {
	if (!hasClient(client)) {
		return labels.noClient;
	}
	return client.name ?? labels.unnamedClient;
}

/** A row of the daily report, with the client of its project once the page groups by client. */
export type TimeActivityRow = DailyReportRow & { client?: ReportClientRef };

export type ClientOfProjectLog = (projectLog: ReportProjectLog) => ReportClientRef;

function statedClientNameOf(projectLog: ReportProjectLog, clientId: string) {
	const statedClient = projectLog?.project?.organizationContact;
	const isSameClient = statedClient?.id === clientId;
	if (!isSameClient) {
		return null;
	}
	return statedClient?.name ?? null;
}

/**
 * The client of a project's time, by the client filter's rule. The clients list names it, archived clients included;
 * the report names a client the list does not hold yet.
 */
export function clientOfProjectLogOf(
	clientIds: ProjectClientIds,
	clientNames: ReadonlyMap<string, string>
): ClientOfProjectLog {
	return (projectLog) => {
		const clientId = clientIdOfProjectLog(projectLog, clientIds);
		if (!clientId) {
			return NO_CLIENT;
		}
		const listedName = clientNames.get(clientId);
		const name = listedName ?? statedClientNameOf(projectLog, clientId);
		return { key: clientId, name };
	};
}

/**
 * The page's rows, in the same order, each with the client of its project. Time logged without a team keeps the
 * client of the project it was logged on, as the client filter keeps or drops a project's time whole.
 */
export function clientRowsOf(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	clientOf: ClientOfProjectLog,
	withoutTeamLabel: string | null
): TimeActivityRow[] {
	const rows: TimeActivityRow[] = [];
	for (const day of report) {
		for (const projectLog of day?.logs ?? []) {
			const client = clientOf(projectLog);
			const dayOfProject = { ...day, logs: [projectLog] };
			const projectRows = flattenDailyReport([dayOfProject], withoutTeamLabel);
			for (const row of projectRows) {
				rows.push({ ...row, client });
			}
		}
	}
	return rows;
}

export function lineCountOf(groups: ReadonlyArray<ReportGroup>) {
	let count = 0;
	for (const group of groups) {
		count += group.lines.length;
	}
	return count;
}

export interface ChartDayLabels {
	label: (day: Date) => string;
	axisLabel: (day: Date) => string;
}

export function chartDaysOf(
	days: ReadonlyArray<Date>,
	figures: ReadonlyMap<string, DayFigures>,
	todayKey: string,
	labels: ChartDayLabels
): DayBarDatum[] {
	return days.map((day) => {
		const key = localDayKeyOf(day);
		const figure = figures.get(key);
		const isFuture = key > todayKey;
		return {
			key,
			label: labels.label(day),
			axisLabel: labels.axisLabel(day),
			value: figure?.seconds ?? 0,
			part: figure?.activeSeconds ?? 0,
			isToday: key === todayKey,
			isFuture
		};
	});
}

export function maxSecondsOf(days: ReadonlyArray<DayBarDatum>) {
	let maxSeconds = 0;
	for (const day of days) {
		maxSeconds = Math.max(maxSeconds, day.value);
	}
	return maxSeconds;
}

/** One row of an export: a task of a member on a project on a day, the finest grain the daily report gives. */
export interface TimeActivityExportRow {
	dateKey: string;
	employeeId: string;
	member: string;
	project: string | null;
	task: string | null;
	status: string | null;
	seconds: number;
	earnings: number | null;
	currency: string | null;
	activity: number;
}

type EmployeeLog = ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number];
type TaskLog = EmployeeLog['tasks'][number];

const DEFAULT_CURRENCY = 'USD';

function finiteOrZero(value: unknown) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

function memberNameOf(employeeLog: EmployeeLog) {
	const fullName = employeeLog.employee?.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	return employeeLog.employee?.user?.name?.trim() ?? '';
}

function taskTitleOf(taskLog: TaskLog) {
	const title = taskLog?.task?.title?.trim();
	if (title) {
		return title;
	}
	const description = taskLog?.description?.trim();
	if (description) {
		return description;
	}
	return null;
}

function taskStatusOf(taskLog: TaskLog) {
	const statusName = taskLog?.task?.taskStatus?.name;
	if (statusName) {
		return statusName;
	}
	const status = taskLog?.task?.status;
	if (status) {
		return String(status);
	}
	return null;
}

interface MemberRate {
	rate: number | null;
	currency: string | null;
}

function rateOf(employeeLog: EmployeeLog): MemberRate {
	const rate = employeeLog.employee?.billRateValue;
	const hasRate = typeof rate === 'number' && rate > 0;
	if (!hasRate) {
		return { rate: null, currency: null };
	}
	return { rate, currency: employeeLog.employee?.billRateCurrency || DEFAULT_CURRENCY };
}

function earningsFor(seconds: number, rate: number | null) {
	if (rate === null) {
		return null;
	}
	return (seconds / 3600) * rate;
}

interface ExportRowContext {
	dateKey: string;
	employeeId: string;
	member: string;
	project: string | null;
	activity: number;
	memberRate: MemberRate;
	withoutTeamLabel: string | null;
}

function exportRowOf(
	context: ExportRowContext,
	task: string | null,
	status: string | null,
	seconds: number
): TimeActivityExportRow {
	return {
		dateKey: context.dateKey,
		employeeId: context.employeeId,
		member: context.member,
		project: context.project,
		task,
		status,
		seconds,
		earnings: earningsFor(seconds, context.memberRate.rate),
		currency: context.memberRate.currency,
		activity: context.activity
	};
}

// The page lists the time logged without a team under its own name rather than its project, and so does the export
function contextOfTask(context: ExportRowContext, taskLog: TaskLog): ExportRowContext {
	const isWithoutTeam = taskLog?.organizationTeamId === null;
	if (!isWithoutTeam) {
		return context;
	}
	return { ...context, project: context.withoutTeamLabel };
}

function exportRowsOfEmployeeLog(context: ExportRowContext, employeeLog: EmployeeLog): TimeActivityExportRow[] {
	const tasks = employeeLog.tasks ?? [];
	if (tasks.length === 0) {
		const seconds = finiteOrZero(employeeLog.sum);
		return [exportRowOf(context, null, null, seconds)];
	}
	return tasks.map((taskLog) => {
		const seconds = finiteOrZero(taskLog?.duration);
		const taskContext = contextOfTask(context, taskLog);
		return exportRowOf(taskContext, taskTitleOf(taskLog), taskStatusOf(taskLog), seconds);
	});
}

function compareExportRows(first: TimeActivityExportRow, second: TimeActivityExportRow) {
	const byDate = first.dateKey.localeCompare(second.dateKey);
	if (byDate !== 0) {
		return byDate;
	}
	const byMember = first.member.localeCompare(second.member);
	if (byMember !== 0) {
		return byMember;
	}
	return second.seconds - first.seconds;
}

/**
 * Export rows built from the raw daily report on the click. `onlyEmployeeId` keeps a member's own rows when the
 * reader does not manage the others.
 */
export function exportRowsOf(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	onlyEmployeeId: string | null,
	withoutTeamLabel: string | null = null
): TimeActivityExportRow[] {
	const rows: TimeActivityExportRow[] = [];
	for (const day of report) {
		const rawDate = String(day?.date ?? '');
		const dateKey = rawDate.slice(0, 10);
		for (const projectLog of day?.logs ?? []) {
			const project = projectLog?.project?.name ?? null;
			for (const employeeLog of projectLog?.employeeLogs ?? []) {
				const employeeId = employeeLog?.employee?.id;
				if (!employeeId) {
					continue;
				}
				const isSomeoneElse = onlyEmployeeId !== null && employeeId !== onlyEmployeeId;
				if (isSomeoneElse) {
					continue;
				}
				const context: ExportRowContext = {
					dateKey,
					employeeId,
					member: memberNameOf(employeeLog),
					project,
					activity: finiteOrZero(employeeLog.activity),
					memberRate: rateOf(employeeLog),
					withoutTeamLabel
				};
				rows.push(...exportRowsOfEmployeeLog(context, employeeLog));
			}
		}
	}
	return rows.sort(compareExportRows);
}

export function weekStartsOfPeriod(period: Period, weekStartsOn: WeekStart): Date[] {
	const weekStarts: Date[] = [];
	let weekStart = startOfWeek(period.from, { weekStartsOn });
	while (weekStart <= period.to) {
		weekStarts.push(weekStart);
		weekStart = addWeeks(weekStart, 1);
	}
	return weekStarts;
}

/** The last week of the period that has already started, so the grid never opens on an empty future week. */
export function initialWeekIndexOf(weekStarts: ReadonlyArray<Date>, now = new Date()) {
	let index = weekStarts.length - 1;
	while (index > 0 && weekStarts[index] > now) {
		index -= 1;
	}
	return Math.max(index, 0);
}

export function weekDaysOf(weekStart: Date): Date[] {
	return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** The part of a week that lies inside the period: what the grid asks the API for. */
export function weekWindowOf(weekStart: Date, period: Period, weekStartsOn: WeekStart): Period {
	const weekEnd = endOfWeek(weekStart, { weekStartsOn });
	const from = startOfDay(max([weekStart, period.from]));
	const to = endOfDay(min([weekEnd, period.to]));
	return { from, to };
}

export interface WeekGridRow {
	employeeId: string;
	name: string;
	imageUrl: string | null;
	seconds: number[];
	total: number;
}

function weeklyNameOf(entry: TTimeLogReportWeekly) {
	const fullName = entry.employee.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	return entry.employee.user?.name?.trim() ?? '';
}

function weeklySecondsOf(entry: TTimeLogReportWeekly, dayKey: string) {
	const value = entry.dates[dayKey];
	if (!value) {
		return 0;
	}
	return finiteOrZero(value.sum);
}

export function weekGridRowsOf(
	report: ReadonlyArray<TTimeLogReportWeekly>,
	dayKeys: ReadonlyArray<string>,
	locale: string
): WeekGridRow[] {
	const collator = new Intl.Collator(locale);
	const rows = report.map((entry) => {
		const seconds = dayKeys.map((dayKey) => weeklySecondsOf(entry, dayKey));
		let total = 0;
		for (const value of seconds) {
			total += value;
		}
		return {
			employeeId: entry.employee.id,
			name: weeklyNameOf(entry),
			imageUrl: entry.employee.user?.imageUrl ?? null,
			seconds,
			total
		};
	});
	return rows.sort((first, second) => collator.compare(first.name, second.name));
}

function emptyWeekGridRowOf(row: DailyReportRow, dayCount: number): WeekGridRow {
	const seconds = Array.from({ length: dayCount }, () => 0);
	return {
		employeeId: row.employeeId,
		name: row.employeeName,
		imageUrl: row.employeeImageUrl,
		seconds,
		total: 0
	};
}

/**
 * The week grid from the period's daily rows, for a filter the weekly report cannot apply: one row per member with
 * time on the days given, as the weekly report lists them.
 */
export function weekGridRowsOfDailyRows(
	rows: ReadonlyArray<DailyReportRow>,
	dayKeys: ReadonlyArray<string>,
	locale: string
): WeekGridRow[] {
	const indexByDay = new Map<string, number>();
	dayKeys.forEach((dayKey, index) => {
		indexByDay.set(dayKey, index);
	});
	const byMember = new Map<string, WeekGridRow>();
	for (const row of rows) {
		const dayIndex = indexByDay.get(row.dateKey);
		if (dayIndex === undefined) {
			continue;
		}
		const gridRow = byMember.get(row.employeeId) ?? emptyWeekGridRowOf(row, dayKeys.length);
		gridRow.seconds[dayIndex] += row.seconds;
		gridRow.total += row.seconds;
		byMember.set(row.employeeId, gridRow);
	}
	const collator = new Intl.Collator(locale);
	const gridRows = [...byMember.values()];
	return gridRows.sort((first, second) => collator.compare(first.name, second.name));
}

export function weekColumnTotalsOf(rows: ReadonlyArray<WeekGridRow>, dayCount: number) {
	const totals = Array.from({ length: dayCount }, () => 0);
	for (const row of rows) {
		row.seconds.forEach((value, index) => {
			totals[index] += value;
		});
	}
	return totals;
}

/** Weeks of this report start on Monday, as the previous date picker and week grid did. */
export const TIME_ACTIVITY_WEEK_START: WeekStart = 1;

export function todayKeyOf(now = new Date()) {
	return localDayKeyOf(now);
}

/** The first table had no task or client grouping: tasks sit under their project there, and so do clients. */
export function tableGroupingOf(grouping: TimeActivityGrouping): TableGrouping {
	if (grouping === 'week') {
		return 'date';
	}
	if (grouping === 'task') {
		return 'project';
	}
	if (grouping === 'client') {
		return 'project';
	}
	return grouping;
}

/** In the week grid the exports keep the date grouping, as they did before. */
export function breakdownGroupingOf(grouping: TimeActivityGrouping): BreakdownGrouping {
	if (grouping === 'week') {
		return 'date';
	}
	return grouping;
}

/** A `YYYY-MM-DD` key read back as the local midnight of that day. */
export function dateOfKey(dateKey: string) {
	const [year, month, day] = dateKey.split('-').map(Number);
	const safeYear = year || 1970;
	const safeMonth = month || 1;
	const safeDay = day || 1;
	return new Date(safeYear, safeMonth - 1, safeDay);
}

/** Groups open on their own while the table stays short; past this many rows they wait for a click. */
export const AUTO_OPEN_LINE_LIMIT = 40;

export interface ExportGroup {
	key: string;
	rows: TimeActivityExportRow[];
	seconds: number;
	activeSeconds: number;
	earnings: CurrencyAmount[];
}

function exportGroupKeyOf(row: TimeActivityExportRow, grouping: BreakdownGrouping) {
	if (grouping === 'date') {
		return row.dateKey;
	}
	if (grouping === 'member') {
		return row.employeeId;
	}
	if (grouping === 'task') {
		return row.task ?? '';
	}
	return row.project ?? '';
}

function earningsTotalsOf(rows: ReadonlyArray<TimeActivityExportRow>): CurrencyAmount[] {
	const totals = new Map<string, number>();
	for (const row of rows) {
		const hasEarnings = row.earnings !== null;
		const hasCurrency = row.currency !== null;
		const counts = hasEarnings && hasCurrency;
		if (!counts) {
			continue;
		}
		const currency = row.currency ?? DEFAULT_CURRENCY;
		const previous = totals.get(currency) ?? 0;
		const amount = row.earnings ?? 0;
		totals.set(currency, previous + amount);
	}
	return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

function exportGroupOf(key: string, rows: TimeActivityExportRow[]): ExportGroup {
	let seconds = 0;
	let activeSeconds = 0;
	for (const row of rows) {
		seconds += row.seconds;
		activeSeconds += (row.seconds * row.activity) / 100;
	}
	return { key, rows, seconds, activeSeconds, earnings: earningsTotalsOf(rows) };
}

function compareExportGroups(grouping: BreakdownGrouping) {
	if (grouping === 'date') {
		return (first: ExportGroup, second: ExportGroup) => second.key.localeCompare(first.key);
	}
	return bySecondsDescending;
}

export function exportGroupsOf(rows: ReadonlyArray<TimeActivityExportRow>, grouping: BreakdownGrouping): ExportGroup[] {
	const buckets = new Map<string, TimeActivityExportRow[]>();
	for (const row of rows) {
		const key = exportGroupKeyOf(row, grouping);
		const bucket = buckets.get(key) ?? [];
		bucket.push(row);
		buckets.set(key, bucket);
	}
	const groups: ExportGroup[] = [];
	for (const [key, bucket] of buckets) {
		groups.push(exportGroupOf(key, bucket));
	}
	return groups.sort(compareExportGroups(grouping));
}

export type BreakdownDimension = 'day' | 'member' | 'project' | 'task' | 'client';

export const BREAKDOWN_PATHS: Record<BreakdownGrouping, ReadonlyArray<BreakdownDimension>> = {
	date: ['day', 'member', 'project'],
	member: ['member', 'project', 'task'],
	project: ['project', 'task', 'member'],
	task: ['task', 'member', 'day'],
	client: ['client', 'project', 'member']
};

const NO_TASK_KEY = 'no-task';

/** One task of a member on a project on a day: the finest grain of the daily report, under every breakdown. */
export interface BreakdownFact {
	dateKey: string;
	employeeId: string;
	employeeName: string;
	employeeImageUrl: string | null;
	project: ReportProjectRef;
	client: ReportClientRef;
	taskKey: string;
	/** `null` for time logged without a task. */
	taskTitle: string | null;
	seconds: number;
	activeSeconds: number;
	rate: number | null;
	currency: string | null;
}

function shareOfRow(seconds: number, row: DailyReportRow) {
	if (row.seconds <= 0) {
		return 0;
	}
	return seconds / row.seconds;
}

function rateOfRow(row: DailyReportRow): MemberRate {
	const rate = row.billRateValue;
	const hasRate = typeof rate === 'number' && rate > 0;
	if (!hasRate) {
		return { rate: null, currency: null };
	}
	return { rate, currency: row.billRateCurrency || DEFAULT_CURRENCY };
}

/**
 * Gauzy measures activity per member, project and day. A task gets its time's share of it, so every level that
 * gathers whole rows adds up exactly; the task levels themselves never show it (`hasExactActivity`).
 */
function factOf(row: TimeActivityRow, taskKey: string, taskTitle: string | null, seconds: number): BreakdownFact {
	const share = shareOfRow(seconds, row);
	const memberRate = rateOfRow(row);
	return {
		dateKey: row.dateKey,
		employeeId: row.employeeId,
		employeeName: row.employeeName,
		employeeImageUrl: row.employeeImageUrl,
		project: projectRefOf(row, 0),
		client: row.client ?? NO_CLIENT,
		taskKey,
		taskTitle,
		seconds,
		activeSeconds: row.activeSeconds * share,
		rate: memberRate.rate,
		currency: memberRate.currency
	};
}

function taskTitleOrNull(title: string) {
	const trimmed = title.trim();
	if (trimmed) {
		return trimmed;
	}
	return null;
}

/** Time of a row that no task accounts for stays under "No task", so the tasks of a row add up to the row. */
function factsOfRow(row: TimeActivityRow): BreakdownFact[] {
	const facts: BreakdownFact[] = [];
	let taskSeconds = 0;
	for (const task of row.tasks) {
		if (task.seconds <= 0) {
			continue;
		}
		taskSeconds += task.seconds;
		const title = taskTitleOrNull(task.title);
		const fact = factOf(row, task.key, title, task.seconds);
		facts.push(fact);
	}
	const remainingSeconds = row.seconds - taskSeconds;
	const untaskedSeconds = Math.max(remainingSeconds, 0);
	const hasUntaskedTime = untaskedSeconds > 0;
	const hasNoFact = facts.length === 0;
	const keepsUntasked = hasUntaskedTime || hasNoFact;
	if (keepsUntasked) {
		const untaskedFact = factOf(row, NO_TASK_KEY, null, untaskedSeconds);
		facts.push(untaskedFact);
	}
	return facts;
}

export function breakdownFactsOf(rows: ReadonlyArray<TimeActivityRow>): BreakdownFact[] {
	const facts: BreakdownFact[] = [];
	for (const row of rows) {
		const rowFacts = factsOfRow(row);
		facts.push(...rowFacts);
	}
	return facts;
}

export type BreakdownSubject =
	| { kind: 'day'; dateKey: string }
	| { kind: 'member'; employeeId: string; name: string; imageUrl: string | null }
	| { kind: 'project'; project: ReportProjectRef }
	| { kind: 'task'; title: string | null }
	| { kind: 'client'; client: ReportClientRef };

export interface BreakdownNode {
	/** The keys from the top row down, so a row keeps its open state while the period changes. */
	key: string;
	dimension: BreakdownDimension;
	subject: BreakdownSubject;
	depth: number;
	seconds: number;
	activeSeconds: number;
	/** False at a task level and under it: there the activity would be an estimate. */
	hasExactActivity: boolean;
	earnings: CurrencyAmount[];
	projects: ReportProjectRef[];
	/** Share of the parent row, or of the whole period for a top row. */
	share: number;
	children: BreakdownNode[];
}

export interface BreakdownTotals {
	seconds: number;
	activeSeconds: number;
	earnings: CurrencyAmount[];
}

export interface BreakdownTree {
	nodes: BreakdownNode[];
	totals: BreakdownTotals;
}

function bucketKeyOf(fact: BreakdownFact, dimension: BreakdownDimension) {
	if (dimension === 'day') {
		return fact.dateKey;
	}
	if (dimension === 'member') {
		return fact.employeeId;
	}
	if (dimension === 'project') {
		return fact.project.key;
	}
	if (dimension === 'client') {
		return fact.client.key;
	}
	return fact.taskKey;
}

function subjectOfFact(fact: BreakdownFact, dimension: BreakdownDimension): BreakdownSubject {
	if (dimension === 'day') {
		return { kind: 'day', dateKey: fact.dateKey };
	}
	if (dimension === 'member') {
		return {
			kind: 'member',
			employeeId: fact.employeeId,
			name: fact.employeeName,
			imageUrl: fact.employeeImageUrl
		};
	}
	if (dimension === 'project') {
		return { kind: 'project', project: fact.project };
	}
	if (dimension === 'client') {
		return { kind: 'client', client: fact.client };
	}
	return { kind: 'task', title: fact.taskTitle };
}

function factBucketsOf(facts: ReadonlyArray<BreakdownFact>, dimension: BreakdownDimension) {
	const buckets = new Map<string, BreakdownFact[]>();
	for (const fact of facts) {
		const key = bucketKeyOf(fact, dimension);
		const bucket = buckets.get(key) ?? [];
		bucket.push(fact);
		buckets.set(key, bucket);
	}
	return buckets;
}

function figuresOfFacts(facts: ReadonlyArray<BreakdownFact>) {
	let seconds = 0;
	let activeSeconds = 0;
	for (const fact of facts) {
		seconds += fact.seconds;
		activeSeconds += fact.activeSeconds;
	}
	return { seconds, activeSeconds };
}

function factEarningsOf(facts: ReadonlyArray<BreakdownFact>): CurrencyAmount[] {
	const totals = new Map<string, number>();
	for (const fact of facts) {
		if (fact.rate === null) {
			continue;
		}
		const currency = fact.currency ?? DEFAULT_CURRENCY;
		const amount = (fact.seconds / 3600) * fact.rate;
		const previous = totals.get(currency) ?? 0;
		totals.set(currency, previous + amount);
	}
	return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

function factProjectsOf(facts: ReadonlyArray<BreakdownFact>): ReportProjectRef[] {
	const projects = new Map<string, ReportProjectRef>();
	for (const fact of facts) {
		const current = projects.get(fact.project.key) ?? { ...fact.project, seconds: 0 };
		current.seconds += fact.seconds;
		projects.set(fact.project.key, current);
	}
	return [...projects.values()].sort(bySecondsDescending);
}

/** Largest first; equal times keep a stable order, the latest day first. */
function compareNodes(first: BreakdownNode, second: BreakdownNode) {
	const bySeconds = second.seconds - first.seconds;
	if (bySeconds !== 0) {
		return bySeconds;
	}
	return second.key.localeCompare(first.key);
}

interface NodeLevel {
	path: ReadonlyArray<BreakdownDimension>;
	depth: number;
	parentKey: string;
	parentSeconds: number;
	isExactAbove: boolean;
}

function shareOfParent(seconds: number, parentSeconds: number) {
	if (parentSeconds <= 0) {
		return 0;
	}
	return (seconds / parentSeconds) * 100;
}

function nodesOf(facts: ReadonlyArray<BreakdownFact>, level: NodeLevel): BreakdownNode[] {
	const dimension = level.path[level.depth];
	if (!dimension) {
		return [];
	}
	const isTaskLevel = dimension === 'task';
	const hasExactActivity = level.isExactAbove && !isTaskLevel;
	const nodes: BreakdownNode[] = [];
	for (const [bucketKey, bucket] of factBucketsOf(facts, dimension)) {
		const key = `${level.parentKey}/${bucketKey}`;
		const figures = figuresOfFacts(bucket);
		const childLevel: NodeLevel = {
			path: level.path,
			depth: level.depth + 1,
			parentKey: key,
			parentSeconds: figures.seconds,
			isExactAbove: hasExactActivity
		};
		nodes.push({
			key,
			dimension,
			subject: subjectOfFact(bucket[0], dimension),
			depth: level.depth,
			seconds: figures.seconds,
			activeSeconds: figures.activeSeconds,
			hasExactActivity,
			earnings: factEarningsOf(bucket),
			projects: factProjectsOf(bucket),
			share: shareOfParent(figures.seconds, level.parentSeconds),
			children: nodesOf(bucket, childLevel)
		});
	}
	return nodes.sort(compareNodes);
}

export function breakdownTreeOf(facts: ReadonlyArray<BreakdownFact>, grouping: BreakdownGrouping): BreakdownTree {
	const figures = figuresOfFacts(facts);
	const nodes = nodesOf(facts, {
		path: BREAKDOWN_PATHS[grouping],
		depth: 0,
		parentKey: grouping,
		parentSeconds: figures.seconds,
		isExactAbove: true
	});
	return {
		nodes,
		totals: { seconds: figures.seconds, activeSeconds: figures.activeSeconds, earnings: factEarningsOf(facts) }
	};
}

export function openableKeysOf(nodes: ReadonlyArray<BreakdownNode>): string[] {
	const keys: string[] = [];
	for (const node of nodes) {
		const hasChildren = node.children.length > 0;
		if (!hasChildren) {
			continue;
		}
		keys.push(node.key);
		const childKeys = openableKeysOf(node.children);
		keys.push(...childKeys);
	}
	return keys;
}

function partOfDay(day: DayBarDatum) {
	return day.part ?? 0;
}

/** A day without time has no activity percentage at all, not 0%. */
export function dayActivityPercentOf(day: DayBarDatum): number | null {
	if (day.value <= 0) {
		return null;
	}
	const activeSeconds = partOfDay(day);
	return (activeSeconds / day.value) * 100;
}

/** The web timer records no activity: a period without any is drawn without the activity line. */
export function hasActivityIn(days: ReadonlyArray<DayBarDatum>) {
	return days.some((day) => partOfDay(day) > 0);
}

/** A period without measured activity reads "–", never 0%: the web timer simply does not measure it. */
export function recordedActivityOf(percent: number | null, trackedSeconds: number | null): number | null {
	if (percent === null) {
		return null;
	}
	const tracked = trackedSeconds ?? 0;
	const hasTime = tracked > 0;
	const hasActivity = percent > 0;
	const isRecorded = hasTime && hasActivity;
	if (!isRecorded) {
		return null;
	}
	return percent;
}

/** Projects are rows of every breakdown but the task one, where a column says which project each task belongs to. */
export function offersProjectsColumn(grouping: TimeActivityGrouping) {
	return grouping === 'task';
}
