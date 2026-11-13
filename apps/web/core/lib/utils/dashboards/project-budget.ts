import { endOfDay, parseISO } from 'date-fns';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';
import { durationPartsOf, type LimitVerdict, limitVerdictOf, percentOf } from '@/core/lib/utils/dashboard-figures';
import { formatAmount } from '@/core/lib/utils/daily-report-figures';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { numberFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';

export type BudgetScope = 'whole' | 'period';

export type BudgetRisk = 'over' | 'near' | 'within' | 'noTime' | 'noBudget';

export const BUDGET_RISKS: ReadonlyArray<BudgetRisk> = ['over', 'near', 'within', 'noTime', 'noBudget'];

export const BUDGET_WEEK_START = 1;

/** Cost figures in the strip stop at this many currencies; the table keeps a totals row for every one. */
export const MAX_COST_FIGURES = 3;

const SECONDS_PER_HOUR = 3600;
const CENTS_PER_UNIT = 100;

export interface BudgetPerson {
	id: string;
	name: string;
	imageUrl: string | null;
}

export interface BudgetProject {
	id: string;
	name: string;
	imageUrl: string | null;
	color: string | null;
	membersCount: number | null;
	/** Members as the projects list carries them; empty when the list did not load them. */
	people: BudgetPerson[];
}

export interface BudgetAmounts {
	budgetType: EProjectBudgetType;
	currency: string | null;
	hasBudget: boolean;
	budget: number;
	spent: number;
	/** Budget minus spent, negative once the budget is passed (Gauzy floors its own value at zero). */
	remaining: number;
	share: number;
	verdict: LimitVerdict;
}

export interface BudgetRow extends BudgetAmounts {
	key: string;
	project: BudgetProject;
	hasTime: boolean;
	risk: BudgetRisk;
}

export interface BudgetTotal extends BudgetAmounts {
	key: string;
	projectCount: number;
}

export interface BudgetGroup {
	risk: BudgetRisk;
	rows: BudgetRow[];
}

/** The rows on screen with the scope and period of the request they answer. */
export interface ProjectBudgetShown {
	scope: BudgetScope;
	period: Period;
	rows: BudgetRow[];
}

export interface BudgetFigures {
	overCount: number;
	nearCount: number;
	budgetedCount: number;
	withoutBudgetCount: number;
	hoursTotal: BudgetTotal | null;
	costTotals: BudgetTotal[];
	hasCostRows: boolean;
}

export type BudgetFilterField = 'projects' | 'budgetTypes' | 'statuses';

export type BudgetFilters = Record<BudgetFilterField, string[]>;

export const EMPTY_BUDGET_FILTERS: BudgetFilters = { projects: [], budgetTypes: [], statuses: [] };

/** A link to the report names one project with `?project=<id>`: the report then opens filtered on it. */
export const BUDGET_PROJECT_PARAM = 'project';

const PROJECT_BUDGET_PATH = '/reports/project-budget';

export function projectBudgetPathOf(projectId: string) {
	const params = new URLSearchParams({ [BUDGET_PROJECT_PARAM]: projectId });
	const query = params.toString();
	return `${PROJECT_BUDGET_PATH}?${query}`;
}

export function budgetFiltersOfLink(linkedProjectId: string | null | undefined): BudgetFilters {
	const projectId = linkedProjectId?.trim();
	if (!projectId) {
		return EMPTY_BUDGET_FILTERS;
	}
	return { ...EMPTY_BUDGET_FILTERS, projects: [projectId] };
}

/** A budget covers the project's whole life, and Gauzy needs a start: no Ever Teams time log is older than this. */
export function wholeProjectPeriodOf(todayKey: string): Period {
	const from = new Date(2000, 0, 1, 0, 0, 0, 0);
	const today = parseISO(todayKey);
	const to = endOfDay(today);
	return { from, to };
}

/** Gauzy prices the logs of every project whose budget type is not hours, so anything else reads as a cost. */
export function budgetTypeOf(raw: string | null | undefined): EProjectBudgetType {
	if (raw === EProjectBudgetType.HOURS) {
		return EProjectBudgetType.HOURS;
	}
	return EProjectBudgetType.COST;
}

export function isHoursBudget(amounts: Pick<BudgetAmounts, 'budgetType'>) {
	return amounts.budgetType === EProjectBudgetType.HOURS;
}

export function secondsOfHours(hours: number) {
	return Math.round(hours * SECONDS_PER_HOUR);
}

/** The meter compares integers, so hours go in as seconds and money in cents: a half-hour budget still fills it. */
export function meterUnitsOf(value: number, amounts: Pick<BudgetAmounts, 'budgetType'>) {
	if (isHoursBudget(amounts)) {
		return secondsOfHours(value);
	}
	return Math.round(value * CENTS_PER_UNIT);
}

export function formatBudgetMoney(amount: number, currency: string | null, locale: FormatLocale): string {
	if (currency) {
		return formatAmount({ currency, amount }, locale);
	}
	const formatter = numberFormatOf(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return formatter.format(amount);
}

type AmountUnit = Pick<BudgetAmounts, 'budgetType' | 'currency'>;

/** Budgets can run into thousands of hours: the hour count takes the reader's digit grouping ("6,021,000h"). */
function groupedHoursOf(seconds: number, locale: FormatLocale, keepsMinutes: boolean) {
	const { hours, minutes } = durationPartsOf(seconds);
	const groupedHours = numberFormatOf(locale).format(hours);
	const showsMinutes = keepsMinutes || minutes > 0;
	if (!showsMinutes) {
		return `${groupedHours}h`;
	}
	return `${groupedHours}h ${minutes}m`;
}

export function budgetTextOf(value: number, unit: AmountUnit, locale: FormatLocale): string {
	if (isHoursBudget(unit)) {
		const seconds = secondsOfHours(value);
		return groupedHoursOf(seconds, locale, false);
	}
	return formatBudgetMoney(value, unit.currency, locale);
}

export function amountTextOf(value: number, unit: AmountUnit, locale: FormatLocale): string {
	if (isHoursBudget(unit)) {
		const seconds = secondsOfHours(value);
		return groupedHoursOf(seconds, locale, true);
	}
	return formatBudgetMoney(value, unit.currency, locale);
}

function firstTextOf(values: ReadonlyArray<string | null | undefined>): string | null {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) {
			return trimmed;
		}
	}
	return null;
}

function membersCountOf(listed: TOrganizationProject | undefined, reported: number | null | undefined) {
	const members = listed?.members;
	if (Array.isArray(members)) {
		return members.length;
	}
	if (typeof reported === 'number') {
		return reported;
	}
	const listedCount = listed?.membersCount;
	if (typeof listedCount === 'number') {
		return listedCount;
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	const isObject = typeof value === 'object';
	const isPresent = value !== null;
	return isObject && isPresent;
}

function textValueOf(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	return firstTextOf([value]);
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
	if (isRecord(value)) {
		return value;
	}
	return {};
}

function joinedNameOf(user: Record<string, unknown>): string | null {
	const firstName = textValueOf(user.firstName) ?? '';
	const lastName = textValueOf(user.lastName) ?? '';
	const joined = `${firstName} ${lastName}`;
	return firstTextOf([joined]);
}

/** A project member is `{ employee: { fullName, user } }` once the list asks for `members.employee.user`. */
function personOfMember(member: unknown): BudgetPerson | null {
	if (!isRecord(member)) {
		return null;
	}
	const employee = recordOrEmpty(member.employee);
	const user = recordOrEmpty(employee.user);
	const id = firstTextOf([textValueOf(employee.id), textValueOf(member.employeeId), textValueOf(member.id)]);
	const name = firstTextOf([textValueOf(employee.fullName), textValueOf(user.name), joinedNameOf(user)]);
	if (!id) {
		return null;
	}
	if (!name) {
		return null;
	}
	return { id, name, imageUrl: textValueOf(user.imageUrl) };
}

function peopleOf(listed: TOrganizationProject | undefined): BudgetPerson[] {
	const members: ReadonlyArray<unknown> = listed?.members ?? [];
	const people: BudgetPerson[] = [];
	for (const member of members) {
		const person = personOfMember(member);
		if (person) {
			people.push(person);
		}
	}
	return people;
}

function currencyOf(
	budgetType: EProjectBudgetType,
	candidates: ReadonlyArray<string | null | undefined>
): string | null {
	if (budgetType === EProjectBudgetType.HOURS) {
		return null;
	}
	return firstTextOf(candidates);
}

function riskOf(hasBudget: boolean, hasTime: boolean, verdict: LimitVerdict): BudgetRisk {
	if (!hasBudget) {
		return 'noBudget';
	}
	if (!hasTime) {
		return 'noTime';
	}
	return verdict;
}

interface BudgetRowInput {
	project: BudgetProject;
	budgetType: EProjectBudgetType;
	currency: string | null;
	budget: number;
	spent: number;
	hasTime: boolean;
}

function budgetRowOf(input: BudgetRowInput): BudgetRow {
	const hasBudget = input.budget > 0;
	const remaining = input.budget - input.spent;
	const share = percentOf(input.spent, input.budget);
	const verdict = limitVerdictOf(input.spent, input.budget);
	const risk = riskOf(hasBudget, input.hasTime, verdict);
	return {
		key: input.project.id,
		project: input.project,
		budgetType: input.budgetType,
		currency: input.currency,
		hasBudget,
		hasTime: input.hasTime,
		budget: input.budget,
		spent: input.spent,
		remaining,
		share,
		verdict,
		risk
	};
}

interface RowContext {
	organizationCurrency: string | null | undefined;
	unnamedLabel: string;
}

/** `currency` and `color` arrive with a Gauzy fix still in review: until then the projects list fills them in. */
function reportedRowOf(
	report: TProjectBudgetReport,
	listed: TOrganizationProject | undefined,
	context: RowContext
): BudgetRow {
	const reported = report.project;
	const budgetType = budgetTypeOf(report.budgetType);
	const name = firstTextOf([reported.name, listed?.name]) ?? context.unnamedLabel;
	const project: BudgetProject = {
		id: reported.id,
		name,
		imageUrl: firstTextOf([reported.imageUrl, listed?.imageUrl]),
		color: firstTextOf([reported.color, listed?.color]),
		membersCount: membersCountOf(listed, reported.membersCount),
		people: peopleOf(listed)
	};
	const currency = currencyOf(budgetType, [reported.currency, listed?.currency, context.organizationCurrency]);
	return budgetRowOf({ project, budgetType, currency, budget: report.budget, spent: report.spent, hasTime: true });
}

function untrackedRowOf(listed: TOrganizationProject, context: RowContext): BudgetRow {
	const budgetType = budgetTypeOf(listed.budgetType);
	const name = firstTextOf([listed.name]) ?? context.unnamedLabel;
	const project: BudgetProject = {
		id: listed.id,
		name,
		imageUrl: firstTextOf([listed.imageUrl]),
		color: firstTextOf([listed.color]),
		membersCount: membersCountOf(listed, null),
		people: peopleOf(listed)
	};
	const currency = currencyOf(budgetType, [listed.currency, context.organizationCurrency]);
	const budget = listed.budget ?? 0;
	return budgetRowOf({ project, budgetType, currency, budget, spent: 0, hasTime: false });
}

function listedProjectsByIdOf(projects: ReadonlyArray<TOrganizationProject>) {
	const byId = new Map<string, TOrganizationProject>();
	for (const project of projects) {
		byId.set(project.id, project);
	}
	return byId;
}

/** A filter chip names its project from the organisation list when the scope on screen has no row for it. */
export function projectNamesByIdOf(projects: ReadonlyArray<TOrganizationProject>): Record<string, string> {
	const namesById: Record<string, string> = {};
	for (const project of projects) {
		const name = firstTextOf([project.name]);
		if (name) {
			namesById[project.id] = name;
		}
	}
	return namesById;
}

function hasListedBudget(project: TOrganizationProject) {
	const budget = project.budget ?? 0;
	return budget > 0;
}

/**
 * One row per project: those Gauzy reports (time logged in the range, with or without a budget), then the projects
 * of the organisation list that have a budget and no time in the range, spent zero.
 */
export function budgetRowsOf({
	reports,
	projects,
	organizationCurrency,
	unnamedLabel
}: Readonly<{
	reports: ReadonlyArray<TProjectBudgetReport>;
	projects: ReadonlyArray<TOrganizationProject>;
	organizationCurrency: string | null | undefined;
	unnamedLabel: string;
}>): BudgetRow[] {
	const context: RowContext = { organizationCurrency, unnamedLabel };
	const listedById = listedProjectsByIdOf(projects);
	const reportedIds = new Set<string>();
	const rows: BudgetRow[] = [];
	for (const report of reports) {
		const projectId = report.project.id;
		const isRepeated = reportedIds.has(projectId);
		if (isRepeated) {
			continue;
		}
		reportedIds.add(projectId);
		const listed = listedById.get(projectId);
		rows.push(reportedRowOf(report, listed, context));
	}
	for (const listed of projects) {
		const isReported = reportedIds.has(listed.id);
		if (isReported) {
			continue;
		}
		if (!hasListedBudget(listed)) {
			continue;
		}
		rows.push(untrackedRowOf(listed, context));
	}
	return rows;
}

function matchesPicked(picked: ReadonlyArray<string>, value: string) {
	if (picked.length === 0) {
		return true;
	}
	return picked.includes(value);
}

function rowMatchesFilters(row: BudgetRow, filters: BudgetFilters) {
	const matchesProject = matchesPicked(filters.projects, row.project.id);
	const matchesType = matchesPicked(filters.budgetTypes, row.budgetType);
	const matchesStatus = matchesPicked(filters.statuses, row.risk);
	return matchesProject && matchesType && matchesStatus;
}

export function filteredBudgetRowsOf(rows: ReadonlyArray<BudgetRow>, filters: BudgetFilters): BudgetRow[] {
	return rows.filter((row) => rowMatchesFilters(row, filters));
}

export function hasBudgetFilters(filters: BudgetFilters) {
	const hasProjects = filters.projects.length > 0;
	const hasTypes = filters.budgetTypes.length > 0;
	const hasStatuses = filters.statuses.length > 0;
	return hasProjects || hasTypes || hasStatuses;
}

function byShareThenName(first: BudgetRow, second: BudgetRow) {
	const shareGap = second.share - first.share;
	if (shareGap !== 0) {
		return shareGap;
	}
	return first.project.name.localeCompare(second.project.name);
}

/** Groups in the order of risk, each sorted by the share of its budget used, the highest first. */
export function budgetGroupsOf(rows: ReadonlyArray<BudgetRow>): BudgetGroup[] {
	const groups: BudgetGroup[] = [];
	for (const risk of BUDGET_RISKS) {
		const groupRows = rows.filter((row) => row.risk === risk);
		if (groupRows.length === 0) {
			continue;
		}
		groupRows.sort(byShareThenName);
		groups.push({ risk, rows: groupRows });
	}
	return groups;
}

/** The lanes of the risk board, always the four of them; projects without a budget sit in their own section. */
export const BOARD_RISKS: ReadonlyArray<BudgetRisk> = ['over', 'near', 'within', 'noTime'];

export interface BudgetLane {
	risk: BudgetRisk;
	rows: BudgetRow[];
}

function rowsOfRisk(groups: ReadonlyArray<BudgetGroup>, risk: BudgetRisk): BudgetRow[] {
	const group = groups.find((candidate) => candidate.risk === risk);
	return group?.rows ?? [];
}

export function budgetLanesOf(groups: ReadonlyArray<BudgetGroup>): BudgetLane[] {
	return BOARD_RISKS.map((risk) => ({ risk, rows: rowsOfRisk(groups, risk) }));
}

export function unbudgetedRowsOf(groups: ReadonlyArray<BudgetGroup>): BudgetRow[] {
	return rowsOfRisk(groups, 'noBudget');
}

function totalKeyOf(row: BudgetRow) {
	if (isHoursBudget(row)) {
		return 'hours';
	}
	const currencyPart = row.currency ?? '';
	return `cost:${currencyPart}`;
}

interface TotalSums {
	key: string;
	budgetType: EProjectBudgetType;
	currency: string | null;
	projectCount: number;
	budget: number;
	spent: number;
}

function budgetTotalOf(sums: TotalSums): BudgetTotal {
	const remaining = sums.budget - sums.spent;
	const share = percentOf(sums.spent, sums.budget);
	const verdict = limitVerdictOf(sums.spent, sums.budget);
	return { ...sums, hasBudget: true, remaining, share, verdict };
}

function byHoursThenBudget(first: BudgetTotal, second: BudgetTotal) {
	const firstIsHours = isHoursBudget(first);
	const secondIsHours = isHoursBudget(second);
	if (firstIsHours === secondIsHours) {
		return second.budget - first.budget;
	}
	if (firstIsHours) {
		return -1;
	}
	return 1;
}

/** Amounts in different currencies are never added: one total for hours, one per currency for costs. */
export function budgetTotalsOf(rows: ReadonlyArray<BudgetRow>): BudgetTotal[] {
	const sumsByKey = new Map<string, TotalSums>();
	for (const row of rows) {
		if (!row.hasBudget) {
			continue;
		}
		const key = totalKeyOf(row);
		const sums = sumsByKey.get(key) ?? {
			key,
			budgetType: row.budgetType,
			currency: row.currency,
			projectCount: 0,
			budget: 0,
			spent: 0
		};
		sums.projectCount += 1;
		sums.budget += row.budget;
		sums.spent += row.spent;
		sumsByKey.set(key, sums);
	}
	const totals = [...sumsByKey.values()].map(budgetTotalOf);
	totals.sort(byHoursThenBudget);
	return totals;
}

export const PILL_SEGMENT_COUNT = 20;

export type PillTone = 'empty' | 'within' | 'near' | 'over';

function segmentCountOf(value: number, scale: number) {
	const share = value / scale;
	const exact = share * PILL_SEGMENT_COUNT;
	return Math.round(exact);
}

function filledSegmentsOf(spent: number, budget: number, scale: number) {
	const rounded = segmentCountOf(spent, scale);
	const hasSpent = spent > 0;
	const isUnderBudget = spent < budget;
	if (hasSpent && rounded === 0) {
		return 1;
	}
	if (isUnderBudget && rounded === PILL_SEGMENT_COUNT) {
		return PILL_SEGMENT_COUNT - 1;
	}
	return rounded;
}

function budgetSegmentsOf(budget: number, scale: number, isOver: boolean) {
	const rounded = segmentCountOf(budget, scale);
	if (isOver) {
		return Math.min(rounded, PILL_SEGMENT_COUNT - 1);
	}
	return rounded;
}

function fillToneOf(verdict: LimitVerdict): PillTone {
	if (verdict === 'near') {
		return 'near';
	}
	return 'within';
}

/**
 * The tone of each segment of a card's pill meter. Past the budget the scale grows to the spent and the segments
 * beyond the budget turn to the over tone, so a passed budget reads without a legend; a project that spent anything
 * fills at least one segment, and one below its budget never fills them all.
 */
export function pillTonesOf(amounts: Pick<BudgetAmounts, 'hasBudget' | 'budget' | 'spent' | 'verdict'>): PillTone[] {
	if (!amounts.hasBudget) {
		return new Array<PillTone>(PILL_SEGMENT_COUNT).fill('empty');
	}
	const tones: PillTone[] = [];
	const isOver = amounts.spent > amounts.budget;
	const scale = Math.max(amounts.budget, amounts.spent);
	const filled = filledSegmentsOf(amounts.spent, amounts.budget, scale);
	const withinBudget = budgetSegmentsOf(amounts.budget, scale, isOver);
	const fillTone = fillToneOf(amounts.verdict);
	for (let index = 0; index < PILL_SEGMENT_COUNT; index += 1) {
		const isFilled = index < filled;
		const isPastBudget = isOver && index >= withinBudget;
		if (!isFilled) {
			tones.push('empty');
			continue;
		}
		if (isPastBudget) {
			tones.push('over');
			continue;
		}
		tones.push(fillTone);
	}
	return tones;
}

/** Legend entries named under a portfolio meter; the rest are counted together. */
export const PORTFOLIO_LEGEND_SIZE = 3;

export interface PortfolioSegment {
	key: string;
	project: BudgetProject;
	spent: number;
	/** Where the segment starts and how wide it is, in percent of the meter's scale. */
	start: number;
	width: number;
}

export interface PortfolioMeter {
	total: BudgetTotal;
	segments: PortfolioSegment[];
	legend: PortfolioSegment[];
	otherCount: number;
	otherSpent: number;
	/** The budget's place on the meter in percent: below 100 once the projects together spent more than it. */
	budgetEnd: number;
	isOver: boolean;
}

function bySpentThenName(first: BudgetRow, second: BudgetRow) {
	const spentGap = second.spent - first.spent;
	if (spentGap !== 0) {
		return spentGap;
	}
	return first.project.name.localeCompare(second.project.name);
}

function spendingRowsOf(rows: ReadonlyArray<BudgetRow>, total: BudgetTotal): BudgetRow[] {
	const spending = rows.filter((row) => {
		const isBudgeted = row.hasBudget;
		const isSameUnit = totalKeyOf(row) === total.key;
		const hasSpent = row.spent > 0;
		return isBudgeted && isSameUnit && hasSpent;
	});
	spending.sort(bySpentThenName);
	return spending;
}

function segmentsOf(rows: ReadonlyArray<BudgetRow>, scale: number): PortfolioSegment[] {
	const segments: PortfolioSegment[] = [];
	let start = 0;
	for (const row of rows) {
		const width = percentOf(row.spent, scale);
		segments.push({ key: row.key, project: row.project, spent: row.spent, start, width });
		start += width;
	}
	return segments;
}

function sumOfSpent(segments: ReadonlyArray<PortfolioSegment>) {
	let sum = 0;
	for (const segment of segments) {
		sum += segment.spent;
	}
	return sum;
}

function portfolioMeterOf(rows: ReadonlyArray<BudgetRow>, total: BudgetTotal): PortfolioMeter {
	const scale = Math.max(total.budget, total.spent);
	const segments = segmentsOf(spendingRowsOf(rows, total), scale);
	const legend = segments.slice(0, PORTFOLIO_LEGEND_SIZE);
	const others = segments.slice(PORTFOLIO_LEGEND_SIZE);
	return {
		total,
		segments,
		legend,
		otherCount: others.length,
		otherSpent: sumOfSpent(others),
		budgetEnd: percentOf(total.budget, scale),
		isOver: total.spent > total.budget
	};
}

/** One meter per unit (hours, then each currency), each project's spent a segment of it, never added across units. */
export function portfolioMetersOf(
	rows: ReadonlyArray<BudgetRow>,
	totals: ReadonlyArray<BudgetTotal>
): PortfolioMeter[] {
	return totals.map((total) => portfolioMeterOf(rows, total));
}

function countOfRisk(rows: ReadonlyArray<BudgetRow>, risk: BudgetRisk) {
	return rows.filter((row) => row.risk === risk).length;
}

export function budgetFiguresOf(rows: ReadonlyArray<BudgetRow>, totals: ReadonlyArray<BudgetTotal>): BudgetFigures {
	const budgetedCount = rows.filter((row) => row.hasBudget).length;
	const hoursTotal = totals.find((total) => isHoursBudget(total)) ?? null;
	const costTotals = totals.filter((total) => !isHoursBudget(total));
	const hasCostRows = rows.some((row) => !isHoursBudget(row));
	return {
		overCount: countOfRisk(rows, 'over'),
		nearCount: countOfRisk(rows, 'near'),
		budgetedCount,
		withoutBudgetCount: countOfRisk(rows, 'noBudget'),
		hoursTotal,
		costTotals,
		hasCostRows
	};
}

/** Decimal hours or money, kept to cents: the precision Gauzy itself rounds to. */
export function exportNumberOf(value: number) {
	return Math.round(value * CENTS_PER_UNIT) / CENTS_PER_UNIT;
}

export function exportShareOf(share: number) {
	const tenths = Math.round(share * 10);
	return tenths / 10;
}
