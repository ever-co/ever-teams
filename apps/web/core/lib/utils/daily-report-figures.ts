import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

/** One member's time on one project on one day, the finest grain the daily report gives. */
export interface DailyReportRow {
	key: string;
	dateKey: string;
	employeeId: string;
	employeeName: string;
	employeeImageUrl: string | null;
	billRateValue: number | null;
	billRateCurrency: string | null;
	projectId: string | null;
	projectName: string | null;
	projectImageUrl: string | null;
	projectColor: string | null;
	seconds: number;
	/** Seconds of activity, so averages can be weighted by time: `seconds * activity% / 100`. */
	activeSeconds: number;
	tasks: DailyReportTask[];
	/** Time a team member logged without a team, which a team report gathers in its own "No team" group. */
	isWithoutTeam?: boolean;
}

export interface DailyReportTask {
	key: string;
	title: string;
	seconds: number;
}

const NO_PROJECT_KEY = 'no-project';

const NO_TEAM_KEY = 'no-team';

type EmployeeLog = ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number];

type TaskLog = EmployeeLog['tasks'][number];

/** The part of a member's project row that was logged with a team, or without one. */
interface EmployeeLogPart {
	tasks: TaskLog[];
	seconds: number;
	isWithoutTeam: boolean;
}

function numberOrZero(value: unknown) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

function employeeNameOf(employee: ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number]['employee']) {
	const fullName = employee?.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	const userName = employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return '';
}

function taskTitleOf(task: ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number]['tasks'][number]) {
	const title = task?.task?.title?.trim();
	if (title) {
		return title;
	}
	return task?.description?.trim() ?? '';
}

function taskKeyOf(task: ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number]['tasks'][number]) {
	const taskId = task?.task?.id;
	if (taskId) {
		return taskId;
	}
	return `description:${taskTitleOf(task)}`;
}

// Gauzy states a task row's team only for a report that counts the time without a team, null being that time
function isWithoutTeamTask(task: TaskLog) {
	return task?.organizationTeamId === null;
}

function isTeamTask(task: TaskLog) {
	return !isWithoutTeamTask(task);
}

function secondsOfTasks(tasks: ReadonlyArray<TaskLog>) {
	let seconds = 0;
	for (const task of tasks) {
		seconds += numberOrZero(task?.duration);
	}
	return seconds;
}

/** A member's project row as Gauzy sends it, or split in two when part of its time was logged without a team. */
function partsOf(employeeLog: EmployeeLog): EmployeeLogPart[] {
	const tasks = employeeLog.tasks ?? [];
	const tasksWithoutTeam = tasks.filter(isWithoutTeamTask);
	if (tasksWithoutTeam.length === 0) {
		return [{ tasks, seconds: numberOrZero(employeeLog.sum), isWithoutTeam: false }];
	}
	const withoutTeamPart = { tasks: tasksWithoutTeam, seconds: secondsOfTasks(tasksWithoutTeam), isWithoutTeam: true };
	const teamTasks = tasks.filter(isTeamTask);
	if (teamTasks.length === 0) {
		return [withoutTeamPart];
	}
	const teamPart = { tasks: teamTasks, seconds: secondsOfTasks(teamTasks), isWithoutTeam: false };
	return [teamPart, withoutTeamPart];
}

function reportTaskOf(task: TaskLog): DailyReportTask {
	return {
		key: taskKeyOf(task),
		title: taskTitleOf(task),
		seconds: numberOrZero(task?.duration)
	};
}

type ProjectLog = ITimeLogGroupedDailyReport['logs'][number];

interface RowContext {
	dateKey: string;
	project: ProjectLog['project'];
	employeeLog: EmployeeLog;
	employeeId: string;
	withoutTeamLabel: string | null;
}

/** Time without a team is listed apart from the projects, under its own name: its project is not this team's. */
function projectFieldsOf(context: RowContext, part: EmployeeLogPart) {
	if (part.isWithoutTeam) {
		return { projectId: null, projectName: context.withoutTeamLabel, projectImageUrl: null, projectColor: null };
	}
	const project = context.project;
	return {
		projectId: project?.id ?? null,
		projectName: project?.name ?? null,
		projectImageUrl: project?.imageUrl ?? null,
		projectColor: project?.color ?? null
	};
}

function rowKeyOf(context: RowContext, part: EmployeeLogPart) {
	const projectKey = context.project?.id ?? NO_PROJECT_KEY;
	if (part.isWithoutTeam) {
		return `${context.dateKey}:${NO_TEAM_KEY}:${projectKey}:${context.employeeId}`;
	}
	return `${context.dateKey}:${projectKey}:${context.employeeId}`;
}

// Rows with a team keep the shape they had before the report could count time without a team
function withoutTeamFlagOf(part: EmployeeLogPart): Pick<DailyReportRow, 'isWithoutTeam'> {
	if (!part.isWithoutTeam) {
		return {};
	}
	return { isWithoutTeam: true };
}

function rowOf(context: RowContext, part: EmployeeLogPart): DailyReportRow {
	const employee = context.employeeLog.employee;
	const activity = numberOrZero(context.employeeLog.activity);
	return {
		key: rowKeyOf(context, part),
		dateKey: context.dateKey,
		employeeId: context.employeeId,
		employeeName: employeeNameOf(employee),
		employeeImageUrl: employee?.user?.imageUrl ?? null,
		billRateValue: employee?.billRateValue ?? null,
		billRateCurrency: employee?.billRateCurrency ?? null,
		...projectFieldsOf(context, part),
		seconds: part.seconds,
		activeSeconds: (part.seconds * activity) / 100,
		tasks: part.tasks.map(reportTaskOf),
		...withoutTeamFlagOf(part)
	};
}

/**
 * One row per member, project and day. A team report that counts the time logged without a team (Gauzy states each
 * task row's team then) gets that time in rows of its own, named `withoutTeamLabel`.
 */
export function flattenDailyReport(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	withoutTeamLabel: string | null = null
): DailyReportRow[] {
	const rows: DailyReportRow[] = [];
	for (const day of report) {
		const dateKey = String(day?.date ?? '').slice(0, 10);
		for (const projectLog of day?.logs ?? []) {
			for (const employeeLog of projectLog?.employeeLogs ?? []) {
				const employeeId = employeeLog?.employee?.id;
				if (!employeeId) {
					continue;
				}
				const context = { dateKey, project: projectLog?.project, employeeLog, employeeId, withoutTeamLabel };
				for (const part of partsOf(employeeLog)) {
					rows.push(rowOf(context, part));
				}
			}
		}
	}
	return rows;
}

export interface FigureTotals {
	seconds: number;
	activeSeconds: number;
}

export function activityPercentOf(totals: FigureTotals) {
	if (totals.seconds <= 0) {
		return 0;
	}
	return (totals.activeSeconds / totals.seconds) * 100;
}

export interface DayFigures extends FigureTotals {
	dateKey: string;
	memberCount: number;
	projectCount: number;
}

export function dayFiguresOf(rows: ReadonlyArray<DailyReportRow>): Map<string, DayFigures> {
	const days = new Map<string, DayFigures & { members: Set<string>; projects: Set<string> }>();
	for (const row of rows) {
		const current = days.get(row.dateKey) ?? {
			dateKey: row.dateKey,
			seconds: 0,
			activeSeconds: 0,
			memberCount: 0,
			projectCount: 0,
			members: new Set<string>(),
			projects: new Set<string>()
		};
		current.seconds += row.seconds;
		current.activeSeconds += row.activeSeconds;
		current.members.add(row.employeeId);
		current.projects.add(row.projectId ?? NO_PROJECT_KEY);
		days.set(row.dateKey, current);
	}
	const result = new Map<string, DayFigures>();
	for (const [dateKey, day] of days) {
		result.set(dateKey, {
			dateKey,
			seconds: day.seconds,
			activeSeconds: day.activeSeconds,
			memberCount: day.members.size,
			projectCount: day.projects.size
		});
	}
	return result;
}

export interface GroupSummary extends FigureTotals {
	key: string;
	rows: DailyReportRow[];
}

/** Rows gathered under one key (a member, a project, a day), with their summed time, largest first. */
export function groupRowsBy(
	rows: ReadonlyArray<DailyReportRow>,
	keyOf: (row: DailyReportRow) => string
): GroupSummary[] {
	const groups = new Map<string, GroupSummary>();
	for (const row of rows) {
		const key = keyOf(row);
		const group = groups.get(key) ?? { key, seconds: 0, activeSeconds: 0, rows: [] };
		group.seconds += row.seconds;
		group.activeSeconds += row.activeSeconds;
		group.rows.push(row);
		groups.set(key, group);
	}
	return [...groups.values()].sort((first, second) => second.seconds - first.seconds);
}

export function projectKeyOf(row: DailyReportRow) {
	if (row.isWithoutTeam) {
		return NO_TEAM_KEY;
	}
	return row.projectId ?? NO_PROJECT_KEY;
}

export function isNoProjectKey(key: string) {
	return key === NO_PROJECT_KEY;
}

export function distinctCountOf<T>(rows: ReadonlyArray<DailyReportRow>, valueOf: (row: DailyReportRow) => T) {
	return new Set(rows.map(valueOf)).size;
}

/** Tasks of several rows merged by task, largest first. */
export function tasksOf(rows: ReadonlyArray<DailyReportRow>): DailyReportTask[] {
	const tasks = new Map<string, DailyReportTask>();
	for (const row of rows) {
		for (const task of row.tasks) {
			const current = tasks.get(task.key) ?? { key: task.key, title: task.title, seconds: 0 };
			current.seconds += task.seconds;
			tasks.set(task.key, current);
		}
	}
	return [...tasks.values()].sort((first, second) => second.seconds - first.seconds);
}

/** Earnings of a row from the member's hourly rate; null when the member has no rate. */
export function earningsOfRow(row: DailyReportRow): number | null {
	const rate = row.billRateValue;
	const hasRate = typeof rate === 'number' && rate > 0;
	if (!hasRate) {
		return null;
	}
	return (row.seconds / 3600) * rate;
}

export interface CurrencyAmount {
	currency: string;
	amount: number;
}

const DEFAULT_CURRENCY = 'USD';

/** Earnings summed per currency, never mixed: members can be paid in different currencies. */
export function earningsByCurrencyOf(rows: ReadonlyArray<DailyReportRow>): CurrencyAmount[] {
	const totals = new Map<string, number>();
	for (const row of rows) {
		const earnings = earningsOfRow(row);
		if (earnings === null) {
			continue;
		}
		const currency = row.billRateCurrency || DEFAULT_CURRENCY;
		totals.set(currency, (totals.get(currency) ?? 0) + earnings);
	}
	return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

/** A rate stored with an unknown currency code would make Intl throw; it is then written as the bare code. */
export function formatAmount({ currency, amount }: CurrencyAmount, locale: string): string {
	try {
		return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}

export function formatAmounts(amounts: ReadonlyArray<CurrencyAmount>, locale: string): string {
	const formatted = amounts.map((amount) => formatAmount(amount, locale));
	return formatted.join(' · ');
}
