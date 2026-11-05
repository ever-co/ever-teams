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
}

export interface DailyReportTask {
	key: string;
	title: string;
	seconds: number;
}

const NO_PROJECT_KEY = 'no-project';

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

export function flattenDailyReport(report: ReadonlyArray<ITimeLogGroupedDailyReport>): DailyReportRow[] {
	const rows: DailyReportRow[] = [];
	for (const day of report) {
		const dateKey = String(day?.date ?? '').slice(0, 10);
		for (const projectLog of day?.logs ?? []) {
			const project = projectLog?.project;
			const projectId = project?.id ?? null;
			for (const employeeLog of projectLog?.employeeLogs ?? []) {
				const employee = employeeLog?.employee;
				const employeeId = employee?.id;
				if (!employeeId) {
					continue;
				}
				const seconds = numberOrZero(employeeLog.sum);
				const activity = numberOrZero(employeeLog.activity);
				const tasks = (employeeLog.tasks ?? []).map((task) => ({
					key: taskKeyOf(task),
					title: taskTitleOf(task),
					seconds: numberOrZero(task?.duration)
				}));
				rows.push({
					key: `${dateKey}:${projectId ?? NO_PROJECT_KEY}:${employeeId}`,
					dateKey,
					employeeId,
					employeeName: employeeNameOf(employee),
					employeeImageUrl: employee?.user?.imageUrl ?? null,
					billRateValue: employee?.billRateValue ?? null,
					billRateCurrency: employee?.billRateCurrency ?? null,
					projectId,
					projectName: project?.name ?? null,
					projectImageUrl: project?.imageUrl ?? null,
					projectColor: project?.color ?? null,
					seconds,
					activeSeconds: (seconds * activity) / 100,
					tasks
				});
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
