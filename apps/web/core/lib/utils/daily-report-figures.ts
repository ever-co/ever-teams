import type {
	ITimeEntryClientRates,
	ITimeLogGroupedDailyReport
} from '@/core/types/interfaces/activity/activity-report';
import { type EntryLabel, entryLabelsOf } from '@/core/lib/utils/time-log-labels';
import { numberFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';

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
	/** The time shown: rounded by the workspace's rule when it has one. */
	seconds: number;
	/**
	 * Seconds of activity in the tracked time, so averages are weighted by it: `trackedSeconds * activity% / 100`.
	 * Gauzy measures activity on the time as tracked, so a rounding rule never changes it.
	 */
	activeSeconds: number;
	/** Only when the workspace's rule rounded `seconds`: the time as tracked, which the activity is a share of. */
	trackedSeconds?: number;
	tasks: DailyReportTask[];
	/** Time a team member logged without a team, which a team report gathers in its own "No team" group. */
	isWithoutTeam?: boolean;
	/** Only on time without a team: the project it was logged on, which its client rates price it by. */
	loggedProjectId?: string | null;
	/** On the rows of a member's project day split by rate (#5212): the key they share, as one row had before. */
	keyAcrossRates?: string;
	/** On a report that states them (`withClientRates`): the client rates the row's entries keep, which price it. */
	keptClientRates?: ITimeEntryClientRates;
}

export interface DailyReportTask {
	key: string;
	title: string;
	seconds: number;
	/** The entry's own labels (Gauzy #12029), only when the report states them; a row is one entry. */
	labels?: EntryLabel[];
}

const NO_PROJECT_KEY = 'no-project';

const NO_TEAM_KEY = 'no-team';

type EmployeeLog = ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number];

type TaskLog = EmployeeLog['tasks'][number];

/** A billing rate and its currency, as a report row states them, and the client rates its entry keeps. */
interface StatedRate {
	value: number | null;
	currency: string | null;
	/** Only from a report that asks for them, on an entry that keeps its rates. */
	clientRates?: ITimeEntryClientRates;
}

/** The part of a member's project row that was logged with a team, or without one, at one rate. */
interface EmployeeLogPart {
	tasks: TaskLog[];
	seconds: number;
	/** The time as tracked: `seconds` until the workspace's rule rounds them. */
	trackedSeconds: number;
	isWithoutTeam: boolean;
	/** The rate its entries store; absent from a Gauzy that states none, which prices it at the current rate. */
	rate?: StatedRate;
	/** Set when the row's entries store several rates: it tells this part's key from the others'. */
	rateKey?: string;
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

export function taskKeyOf(task: ITimeLogGroupedDailyReport['logs'][number]['employeeLogs'][number]['tasks'][number]) {
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

function trackedSecondsOfTasks(tasks: ReadonlyArray<TaskLog>) {
	let seconds = 0;
	for (const task of tasks) {
		seconds += numberOrZero(task?.trackedDuration ?? task?.duration);
	}
	return seconds;
}

function partOfTasks(tasks: TaskLog[], isWithoutTeam: boolean): EmployeeLogPart {
	return { tasks, seconds: secondsOfTasks(tasks), trackedSeconds: trackedSecondsOfTasks(tasks), isWithoutTeam };
}

function positiveOrNull(value: unknown): number | null {
	const parsed = Number(value);
	const isRate = Number.isFinite(parsed) && parsed > 0;
	if (!isRate) {
		return null;
	}
	return parsed;
}

/**
 * The billing rate a task row states (#5212): the rate its time entry stores, or the member's current one for an
 * entry that stores none. Undefined from a Gauzy that states no rate on its rows, which are priced at the member's
 * current rate. A rate without a currency of its own is in the workspace's.
 */
export function statedRateOf(task: TaskLog): StatedRate | undefined {
	const statesRate = Boolean(task) && 'billRateValue' in task;
	if (!statesRate) {
		return undefined;
	}
	const currency = task.billRateCurrency?.trim() || null;
	const rate: StatedRate = { value: positiveOrNull(task.billRateValue), currency };
	const keepsClientRates = Boolean(task.clientRates) && task.ratesStored === true;
	if (keepsClientRates) {
		rate.clientRates = task.clientRates ?? undefined;
	}
	return rate;
}

/** A client rate in a key: the same number whether a database answered it as a number or as text ("90.00"). */
function clientRateKeyOf(value: number | string | null | undefined) {
	const isMissing = value === null || value === undefined || value === '';
	if (isMissing) {
		return 'none';
	}
	return String(Number(value));
}

/** The client rates of a key: each with its currency, as each prices on its own. */
function clientRatesKeyOf(clientRates: ITimeEntryClientRates | undefined) {
	if (!clientRates) {
		return '';
	}
	// A client rate of 0 bills nothing, where no client rate leaves the time to the billing rate: both stay apart
	const member = clientRateKeyOf(clientRates.projectMemberBillRateValue);
	const project = clientRateKeyOf(clientRates.projectBillRateValue);
	const currencies = `${clientRates.projectMemberBillRateCurrency ?? ''}/${clientRates.projectBillRateCurrency ?? ''}`;
	return `|client:${member}|${project}|${currencies}`;
}

function statedRateKeyOf(rate: StatedRate | undefined) {
	if (!rate) {
		return '';
	}
	return `${rate.value ?? 'none'}|${rate.currency ?? ''}${clientRatesKeyOf(rate.clientRates)}`;
}

/** A part whose entries store several rates becomes one part per rate, so each is priced at its own. */
function partsByRateOf(part: EmployeeLogPart): EmployeeLogPart[] {
	const byRate = new Map<string, { rate: StatedRate | undefined; tasks: TaskLog[] }>();
	for (const task of part.tasks) {
		const rate = statedRateOf(task);
		const key = statedRateKeyOf(rate);
		const group = byRate.get(key) ?? { rate, tasks: [] };
		group.tasks.push(task);
		byRate.set(key, group);
	}
	const groups = [...byRate.entries()];
	if (groups.length <= 1) {
		const rate = groups[0]?.[1].rate;
		if (!rate) {
			return [part];
		}
		return [{ ...part, rate }];
	}
	return groups.map(([rateKey, group]) => ({
		tasks: group.tasks,
		seconds: secondsOfTasks(group.tasks),
		trackedSeconds: trackedSecondsOfTasks(group.tasks),
		isWithoutTeam: part.isWithoutTeam,
		rate: group.rate,
		rateKey
	}));
}

/** A member's project row as Gauzy sends it, or split in two when part of its time was logged without a team. */
function partsOf(employeeLog: EmployeeLog): EmployeeLogPart[] {
	return teamPartsOf(employeeLog).flatMap(partsByRateOf);
}

function teamPartsOf(employeeLog: EmployeeLog): EmployeeLogPart[] {
	const tasks = employeeLog.tasks ?? [];
	const tasksWithoutTeam = tasks.filter(isWithoutTeamTask);
	if (tasksWithoutTeam.length === 0) {
		const seconds = numberOrZero(employeeLog.sum);
		const trackedSeconds = numberOrZero(employeeLog.trackedSum ?? employeeLog.sum);
		return [{ tasks, seconds, trackedSeconds, isWithoutTeam: false }];
	}
	const withoutTeamPart = partOfTasks(tasksWithoutTeam, true);
	const teamTasks = tasks.filter(isTeamTask);
	if (teamTasks.length === 0) {
		return [withoutTeamPart];
	}
	return [partOfTasks(teamTasks, false), withoutTeamPart];
}

// A report of an API without labels on entries states none: its rows keep the shape they always had
function labelsFieldOf(task: TaskLog): Pick<DailyReportTask, 'labels'> {
	if (!Array.isArray(task?.tags)) {
		return {};
	}
	return { labels: entryLabelsOf(task) };
}

function reportTaskOf(task: TaskLog): DailyReportTask {
	return {
		key: taskKeyOf(task),
		title: taskTitleOf(task),
		seconds: numberOrZero(task?.duration),
		...labelsFieldOf(task)
	};
}

type ProjectLog = ITimeLogGroupedDailyReport['logs'][number];

interface RowContext {
	dateKey: string;
	project: ProjectLog['project'];
	employeeLog: EmployeeLog;
	employeeId: string;
	withoutTeamLabel: string | null;
	workspaceCurrency: string | null;
}

/** Time without a team is listed apart from the projects, under its own name: its project is not this team's. */
function projectFieldsOf(context: RowContext, part: EmployeeLogPart) {
	if (part.isWithoutTeam) {
		return {
			projectId: null,
			projectName: context.withoutTeamLabel,
			projectImageUrl: null,
			projectColor: null,
			loggedProjectId: context.project?.id ?? null
		};
	}
	const project = context.project;
	return {
		projectId: project?.id ?? null,
		projectName: project?.name ?? null,
		projectImageUrl: project?.imageUrl ?? null,
		projectColor: project?.color ?? null
	};
}

function keyAcrossRatesOf(context: RowContext, part: EmployeeLogPart) {
	const projectKey = context.project?.id ?? NO_PROJECT_KEY;
	if (part.isWithoutTeam) {
		return `${context.dateKey}:${NO_TEAM_KEY}:${projectKey}:${context.employeeId}`;
	}
	return `${context.dateKey}:${projectKey}:${context.employeeId}`;
}

/** A row split by rate keeps the key the whole row had, beside its own; a row of one rate has only that key. */
function rowKeysOf(context: RowContext, part: EmployeeLogPart): Pick<DailyReportRow, 'key' | 'keyAcrossRates'> {
	const keyAcrossRates = keyAcrossRatesOf(context, part);
	if (part.rateKey === undefined) {
		return { key: keyAcrossRates };
	}
	return { key: `${keyAcrossRates}:${part.rateKey}`, keyAcrossRates };
}

/**
 * The rate a row is priced at: the one its entries store, else the member's current rate, as before (#5212), and the
 * client rates its entries keep when the report states them.
 */
function rowRateOf(
	context: RowContext,
	part: EmployeeLogPart
): Pick<DailyReportRow, 'billRateValue' | 'billRateCurrency' | 'keptClientRates'> {
	if (part.rate) {
		const rate = {
			billRateValue: part.rate.value,
			billRateCurrency: part.rate.currency || context.workspaceCurrency
		};
		if (!part.rate.clientRates) {
			return rate;
		}
		return { ...rate, keptClientRates: part.rate.clientRates };
	}
	const employee = context.employeeLog.employee;
	const ownCurrency = employee?.billRateCurrency ?? null;
	return {
		billRateValue: employee?.billRateValue ?? null,
		billRateCurrency: ownCurrency || context.workspaceCurrency
	};
}

// Rows with a team keep the shape they had before the report could count time without a team
function withoutTeamFlagOf(part: EmployeeLogPart): Pick<DailyReportRow, 'isWithoutTeam'> {
	if (!part.isWithoutTeam) {
		return {};
	}
	return { isWithoutTeam: true };
}

// Rows of time as tracked keep the shape they had before the workspace could round durations
function trackedFieldOf(part: EmployeeLogPart): Pick<DailyReportRow, 'trackedSeconds'> {
	if (part.trackedSeconds === part.seconds) {
		return {};
	}
	return { trackedSeconds: part.trackedSeconds };
}

function rowOf(context: RowContext, part: EmployeeLogPart): DailyReportRow {
	const employee = context.employeeLog.employee;
	const activity = numberOrZero(context.employeeLog.activity);
	return {
		...rowKeysOf(context, part),
		dateKey: context.dateKey,
		employeeId: context.employeeId,
		employeeName: employeeNameOf(employee),
		employeeImageUrl: employee?.user?.imageUrl ?? null,
		...rowRateOf(context, part),
		...projectFieldsOf(context, part),
		seconds: part.seconds,
		activeSeconds: (part.trackedSeconds * activity) / 100,
		...trackedFieldOf(part),
		tasks: part.tasks.map(reportTaskOf),
		...withoutTeamFlagOf(part)
	};
}

/**
 * One row per member, project and day. A team report that counts the time logged without a team (Gauzy states each
 * task row's team then) gets that time in rows of its own, named `withoutTeamLabel`. A rate without a currency of its
 * own is in the workspace's, as Gauzy counts it.
 */
export function flattenDailyReport(
	report: ReadonlyArray<ITimeLogGroupedDailyReport>,
	withoutTeamLabel: string | null = null,
	workspaceCurrency: string | null = null
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
				const context: RowContext = {
					dateKey,
					project: projectLog?.project,
					employeeLog,
					employeeId,
					withoutTeamLabel,
					workspaceCurrency
				};
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
	/** The time as tracked when `seconds` is rounded by the workspace's rule; `seconds` otherwise. */
	trackedSeconds?: number;
}

/** The time a figure's activity is a share of: the time as tracked, whatever rounding the shown time has. */
export function trackedSecondsOf(figure: Pick<FigureTotals, 'seconds' | 'trackedSeconds'>): number {
	return figure.trackedSeconds ?? figure.seconds;
}

/** The share of the tracked time that was active: a rounding rule changes the time shown, never the activity. */
export function activityPercentOf(totals: FigureTotals) {
	const trackedSeconds = trackedSecondsOf(totals);
	if (trackedSeconds <= 0) {
		return 0;
	}
	return (totals.activeSeconds / trackedSeconds) * 100;
}

/** The active part of the time shown, for a chart that draws it inside the shown time. */
export function shownActiveSecondsOf(figure: FigureTotals): number {
	const trackedSeconds = trackedSecondsOf(figure);
	if (trackedSeconds === figure.seconds) {
		return figure.activeSeconds;
	}
	return (figure.seconds * activityPercentOf(figure)) / 100;
}

export interface DayFigures extends FigureTotals {
	trackedSeconds: number;
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
			trackedSeconds: 0,
			memberCount: 0,
			projectCount: 0,
			members: new Set<string>(),
			projects: new Set<string>()
		};
		current.seconds += row.seconds;
		current.activeSeconds += row.activeSeconds;
		current.trackedSeconds += trackedSecondsOf(row);
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
			trackedSeconds: day.trackedSeconds,
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

export function projectKeyOf(row: Pick<DailyReportRow, 'projectId' | 'isWithoutTeam'>) {
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
export function formatAmount({ currency, amount }: CurrencyAmount, locale: FormatLocale): string {
	try {
		return numberFormatOf(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}

export function formatAmounts(amounts: ReadonlyArray<CurrencyAmount>, locale: FormatLocale): string {
	const formatted = amounts.map((amount) => formatAmount(amount, locale));
	return formatted.join(' · ');
}
