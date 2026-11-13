import { addDays, endOfDay, startOfDay } from 'date-fns';
import { endOfDayInTimeZone, startOfDayInTimeZone } from '@/core/lib/helpers/format-date-range';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	currencyKeyOf,
	currencyOf,
	currencyTotalsOf,
	dateOfDayKey,
	dayDateOf,
	decimalHoursOf,
	roundedAmountOf,
	type OwedCurrencyTotal
} from '@/core/lib/utils/dashboards/payments-due';
import { invoiceTotalsOf, NO_ADJUSTMENTS, type InvoiceAdjustments } from '@/core/lib/utils/invoice-totals';
import { effectiveBillRate, employeeRateValueOf, rateValueOf } from '@/core/lib/utils/rates';
import { ApiErrorService } from '@/core/services/client/api-error.service';

export interface BillableLogLike {
	projectId?: string | null;
	employeeId?: string | null;
	taskId?: string | null;
	isBillable?: boolean | null;
	duration?: number | null;
	startedAt?: string | Date | null;
	stoppedAt?: string | Date | null;
}

export interface BillableEntry {
	projectId: string;
	employeeId: string;
	taskId: string | null;
	seconds: number;
}

const MILLISECONDS_PER_SECOND = 1000;

function timeOf(value: string | Date | null | undefined) {
	if (!value) {
		return Number.NaN;
	}
	return new Date(value).getTime();
}

function secondsBetween(log: BillableLogLike) {
	const elapsed = timeOf(log.stoppedAt) - timeOf(log.startedAt);
	if (!Number.isFinite(elapsed)) {
		return 0;
	}
	return Math.round(elapsed / MILLISECONDS_PER_SECOND);
}

function secondsOfLog(log: BillableLogLike) {
	const duration = Number(log.duration);
	const hasDuration = log.duration !== null && log.duration !== undefined;
	const isReadable = hasDuration && Number.isFinite(duration);
	let seconds = secondsBetween(log);
	if (isReadable) {
		seconds = duration;
	}
	return Math.max(seconds, 0);
}

function entryKeyOf(projectId: string, employeeId: string, taskId: string | null) {
	return [projectId, employeeId, taskId ?? ''].join('|');
}

/**
 * The billable time of the given projects, per project, member and task. A log counts only when the API states it is
 * billable: the filter the request also asks for is not trusted alone, an older API ignores it.
 */
export function billableEntriesOf(
	logs: ReadonlyArray<BillableLogLike>,
	projectIds: ReadonlySet<string>
): BillableEntry[] {
	const byKey = new Map<string, BillableEntry>();
	for (const log of logs) {
		const projectId = log.projectId;
		const employeeId = log.employeeId;
		if (log.isBillable !== true) {
			continue;
		}
		if (!projectId || !employeeId) {
			continue;
		}
		if (!projectIds.has(projectId)) {
			continue;
		}
		const seconds = secondsOfLog(log);
		if (seconds <= 0) {
			continue;
		}
		const taskId = log.taskId ?? null;
		const key = entryKeyOf(projectId, employeeId, taskId);
		const entry = byKey.get(key) ?? { projectId, employeeId, taskId, seconds: 0 };
		entry.seconds += seconds;
		byKey.set(key, entry);
	}
	return [...byKey.values()];
}

export interface ProjectClientRates {
	billRateValue?: unknown;
	currency?: string | null;
	members?: ReadonlyArray<{ employeeId: string; billRateValue?: unknown }>;
}

export interface EmployeeBillingRate {
	billRateValue?: unknown;
	billRateCurrency?: string | null;
}

export type InvoiceRateSource = 'member' | 'project' | 'employee';

export interface LinePrice {
	rate: number | null;
	currency: string | null;
	source: InvoiceRateSource | null;
}

const NO_PRICE: LinePrice = { rate: null, currency: null, source: null };

function memberClientRateOf(rates: ProjectClientRates | null | undefined, employeeId: string) {
	const members = rates?.members ?? [];
	const row = members.find((member) => member.employeeId === employeeId);
	return rateValueOf(row?.billRateValue);
}

function rateSourceOf(memberRate: number | null, projectRate: number | null): InvoiceRateSource {
	if (memberRate !== null) {
		return 'member';
	}
	if (projectRate !== null) {
		return 'project';
	}
	return 'employee';
}

/**
 * What an hour of a member's time on a project is billed: their client rate on the project, else the project's, else
 * their own billing rate. Client rates are in the project's currency, a member's own rate in theirs; each falls back
 * on the organization's.
 */
export function linePriceOf({
	employeeId,
	projectRates,
	projectCurrency,
	employeeRate,
	organizationCurrency
}: Readonly<{
	employeeId: string;
	projectRates: ProjectClientRates | null | undefined;
	projectCurrency: string | null | undefined;
	employeeRate: EmployeeBillingRate | null | undefined;
	organizationCurrency: string | null;
}>): LinePrice {
	const memberRate = memberClientRateOf(projectRates, employeeId);
	const projectRate = rateValueOf(projectRates?.billRateValue);
	const ownRate = employeeRateValueOf(employeeRate?.billRateValue);
	const rate = effectiveBillRate({ memberRate, projectRate, employeeRate: ownRate });
	if (rate === null) {
		return NO_PRICE;
	}
	const source = rateSourceOf(memberRate, projectRate);
	if (source === 'employee') {
		return { rate, source, currency: currencyOf(employeeRate?.billRateCurrency, organizationCurrency) };
	}
	const clientCurrency = projectRates?.currency ?? projectCurrency;
	return { rate, source, currency: currencyOf(clientCurrency, organizationCurrency) };
}

export type InvoiceGrouping = 'project' | 'member' | 'task';

export interface InvoiceLine {
	key: string;
	projectId: string;
	/** Null on a line that gathers the time of every member of the project. */
	employeeId: string | null;
	/** Null on a line that gathers a member's time on the project, whatever the task. */
	taskId: string | null;
	seconds: number;
	/** The quantity the invoice states: decimal hours, to the hundredth. */
	hours: number;
	rate: number;
	currency: string | null;
	/** Hours times rate, to the cent: the arithmetic a reader checks on the invoice. */
	amount: number;
	rateSource: InvoiceRateSource;
	/** The members of the project are billed different rates: the line states their average, weighted by time. */
	isAverageRate: boolean;
}

export interface UnpricedTime {
	key: string;
	projectId: string;
	employeeId: string;
	seconds: number;
}

export interface InvoiceTime {
	lines: InvoiceLine[];
	unpriced: UnpricedTime[];
}

function memberKeyOf(projectId: string, employeeId: string) {
	return [projectId, employeeId].join('|');
}

function groupedEntriesOf(entries: ReadonlyArray<BillableEntry>, grouping: InvoiceGrouping): BillableEntry[] {
	if (grouping === 'task') {
		return [...entries];
	}
	const byMember = new Map<string, BillableEntry>();
	for (const entry of entries) {
		const key = memberKeyOf(entry.projectId, entry.employeeId);
		const current = byMember.get(key) ?? { ...entry, taskId: null, seconds: 0 };
		current.seconds += entry.seconds;
		byMember.set(key, current);
	}
	return [...byMember.values()];
}

function lineKeyOf(entry: BillableEntry, grouping: InvoiceGrouping) {
	if (grouping === 'task') {
		return entryKeyOf(entry.projectId, entry.employeeId, entry.taskId);
	}
	return memberKeyOf(entry.projectId, entry.employeeId);
}

function addUnpriced(byMember: Map<string, UnpricedTime>, entry: BillableEntry) {
	const key = memberKeyOf(entry.projectId, entry.employeeId);
	const current = byMember.get(key) ?? {
		key,
		projectId: entry.projectId,
		employeeId: entry.employeeId,
		seconds: 0
	};
	current.seconds += entry.seconds;
	byMember.set(key, current);
}

/** Hours times rate to the cent, half up: the product's binary error is cleared first (1.15 h at 12.50 is 14.38). */
export function lineAmountOf(hours: number, rate: number) {
	const cents = Number((hours * rate * 100).toPrecision(12));
	return Math.round(cents) / 100;
}

type LinePriceOf = (projectId: string, employeeId: string) => LinePrice;

const SECONDS_PER_HOUR = 3600;

const RATE_SOURCE_ORDER: ReadonlyArray<InvoiceRateSource> = ['member', 'project', 'employee'];

/** The time of one project priced in one currency, at each member's own rate. */
interface ProjectWorth {
	key: string;
	projectId: string;
	currency: string | null;
	seconds: number;
	/** What the time is worth before any rounding: each member's hours times their rate. */
	worth: number;
	rates: Set<number>;
	secondsBySource: Map<InvoiceRateSource, number>;
}

function projectWorthKeyOf(projectId: string, currency: string | null) {
	return [projectId, currencyKeyOf(currency)].join('|');
}

interface KnownPrice {
	rate: number;
	source: InvoiceRateSource;
	currency: string | null;
}

function addProjectWorth(byProject: Map<string, ProjectWorth>, entry: BillableEntry, price: KnownPrice) {
	const key = projectWorthKeyOf(entry.projectId, price.currency);
	const current = byProject.get(key) ?? {
		key,
		projectId: entry.projectId,
		currency: price.currency,
		seconds: 0,
		worth: 0,
		rates: new Set<number>(),
		secondsBySource: new Map<InvoiceRateSource, number>()
	};
	current.seconds += entry.seconds;
	current.worth += (entry.seconds / SECONDS_PER_HOUR) * price.rate;
	current.rates.add(price.rate);
	const sourceSeconds = current.secondsBySource.get(price.source) ?? 0;
	current.secondsBySource.set(price.source, sourceSeconds + entry.seconds);
	byProject.set(key, current);
}

/** The source pricing the most time; a tie goes to the more specific rate. */
function mainRateSourceOf(secondsBySource: ReadonlyMap<InvoiceRateSource, number>): InvoiceRateSource {
	let mainSource: InvoiceRateSource = 'employee';
	let mainSeconds = -1;
	for (const source of RATE_SOURCE_ORDER) {
		const seconds = secondsBySource.get(source) ?? -1;
		if (seconds > mainSeconds) {
			mainSource = source;
			mainSeconds = seconds;
		}
	}
	return mainSource;
}

/**
 * One line for a project: its hours, the amount they are worth divided by those hours as the rate, to the cent, and
 * hours times that rate as the amount, so the arithmetic on the document holds.
 */
function projectLineOf(project: ProjectWorth): InvoiceLine | null {
	const hours = decimalHoursOf(project.seconds);
	if (hours <= 0) {
		return null;
	}
	const exactHours = project.seconds / SECONDS_PER_HOUR;
	const rate = roundedAmountOf(project.worth / exactHours);
	return {
		key: project.key,
		projectId: project.projectId,
		employeeId: null,
		taskId: null,
		seconds: project.seconds,
		hours,
		rate,
		currency: project.currency,
		amount: roundedAmountOf(hours * rate),
		rateSource: mainRateSourceOf(project.secondsBySource),
		isAverageRate: project.rates.size > 1
	};
}

/** Each member's time is priced at their own rate first, then gathered per project and currency. */
function projectTimeOf(entries: ReadonlyArray<BillableEntry>, priceOf: LinePriceOf): InvoiceTime {
	const byProject = new Map<string, ProjectWorth>();
	const unpricedByMember = new Map<string, UnpricedTime>();
	for (const entry of groupedEntriesOf(entries, 'member')) {
		const { rate, source, currency } = priceOf(entry.projectId, entry.employeeId);
		if (rate === null || source === null) {
			addUnpriced(unpricedByMember, entry);
			continue;
		}
		addProjectWorth(byProject, entry, { rate, source, currency });
	}
	const lines: InvoiceLine[] = [];
	for (const project of byProject.values()) {
		const line = projectLineOf(project);
		if (line) {
			lines.push(line);
		}
	}
	return { lines, unpriced: [...unpricedByMember.values()] };
}

/**
 * The lines an invoice can hold and the time it cannot price. Time too short to make a hundredth of an hour states no
 * quantity, so it makes no line.
 */
export function invoiceTimeOf({
	entries,
	grouping,
	priceOf
}: Readonly<{
	entries: ReadonlyArray<BillableEntry>;
	grouping: InvoiceGrouping;
	priceOf: LinePriceOf;
}>): InvoiceTime {
	if (grouping === 'project') {
		return projectTimeOf(entries, priceOf);
	}
	const lines: InvoiceLine[] = [];
	const unpricedByMember = new Map<string, UnpricedTime>();
	for (const entry of groupedEntriesOf(entries, grouping)) {
		const { rate, source, currency } = priceOf(entry.projectId, entry.employeeId);
		if (rate === null || source === null) {
			addUnpriced(unpricedByMember, entry);
			continue;
		}
		const hours = decimalHoursOf(entry.seconds);
		if (hours <= 0) {
			continue;
		}
		lines.push({
			key: lineKeyOf(entry, grouping),
			projectId: entry.projectId,
			employeeId: entry.employeeId,
			taskId: entry.taskId,
			seconds: entry.seconds,
			hours,
			rate,
			currency,
			amount: lineAmountOf(hours, rate),
			rateSource: source,
			isAverageRate: false
		});
	}
	return { lines, unpriced: [...unpricedByMember.values()] };
}

const HUNDREDTHS = 100;

/** The hours an invoice adds up are the hours its lines state, so a reader's own sum finds the same figure. */
export function hoursOfLines(lines: ReadonlyArray<InvoiceLine>) {
	let hundredths = 0;
	for (const line of lines) {
		hundredths += Math.round(line.hours * HUNDREDTHS);
	}
	return hundredths / HUNDREDTHS;
}

export interface InvoiceCurrencyTotal extends OwedCurrencyTotal {
	hours: number;
	lineCount: number;
}

/** One total per currency, the one pricing the most time first. Amounts in two currencies are never added. */
export function invoiceCurrenciesOf(lines: ReadonlyArray<InvoiceLine>): InvoiceCurrencyTotal[] {
	const totals = currencyTotalsOf(lines);
	return totals.map((total) => {
		const currencyLines = lines.filter((line) => currencyKeyOf(line.currency) === total.key);
		return {
			...total,
			amount: roundedAmountOf(total.amount),
			hours: hoursOfLines(currencyLines),
			lineCount: currencyLines.length
		};
	});
}

export function invoiceCurrencyKeyOf(
	currencies: ReadonlyArray<InvoiceCurrencyTotal>,
	pickedKey: string | null
): string | null {
	const isPickedPresent = currencies.some((total) => total.key === pickedKey);
	if (isPickedPresent) {
		return pickedKey;
	}
	return currencies[0]?.key ?? null;
}

export function removedLineCountOf(lines: ReadonlyArray<InvoiceLine>, removedKeys: ReadonlySet<string>) {
	const removedLines = lines.filter((line) => removedKeys.has(line.key));
	return removedLines.length;
}

export function keptLinesOf<T extends InvoiceLine>(lines: ReadonlyArray<T>, removedKeys: ReadonlySet<string>): T[] {
	return lines.filter((line) => !removedKeys.has(line.key));
}

export interface InvoiceLineNames {
	projectNames: ReadonlyMap<string, string>;
	memberNames: ReadonlyMap<string, string>;
	taskTitles: ReadonlyMap<string, string>;
	unnamedProject: string;
	unnamedMember: string;
	noTask: string;
}

export interface NamedInvoiceLine extends InvoiceLine {
	projectName: string;
	/** Empty on a line that gathers every member of the project. */
	memberName: string;
	/** The description the line starts with, until the user writes another. */
	label: string;
}

function taskLabelOf(line: InvoiceLine, memberName: string, names: InvoiceLineNames) {
	let taskTitle = names.noTask;
	if (line.taskId) {
		taskTitle = names.taskTitles.get(line.taskId) ?? names.noTask;
	}
	return `${taskTitle} · ${memberName}`;
}

function memberNameOf(line: InvoiceLine, names: InvoiceLineNames) {
	if (!line.employeeId) {
		return '';
	}
	return names.memberNames.get(line.employeeId) ?? names.unnamedMember;
}

interface LineNaming {
	projectName: string;
	memberName: string;
	grouping: InvoiceGrouping;
}

function labelOf(line: InvoiceLine, naming: LineNaming, names: InvoiceLineNames) {
	if (naming.grouping === 'project') {
		return naming.projectName;
	}
	if (naming.grouping === 'task') {
		return taskLabelOf(line, naming.memberName, names);
	}
	return naming.memberName;
}

function compareNamedLines(first: NamedInvoiceLine, second: NamedInvoiceLine) {
	const projectOrder = first.projectName.localeCompare(second.projectName);
	if (projectOrder !== 0) {
		return projectOrder;
	}
	const labelOrder = first.label.localeCompare(second.label);
	if (labelOrder !== 0) {
		return labelOrder;
	}
	return first.key.localeCompare(second.key);
}

export function namedLinesOf(
	lines: ReadonlyArray<InvoiceLine>,
	grouping: InvoiceGrouping,
	names: InvoiceLineNames
): NamedInvoiceLine[] {
	const named = lines.map((line) => {
		const projectName = names.projectNames.get(line.projectId) ?? names.unnamedProject;
		const memberName = memberNameOf(line, names);
		const label = labelOf(line, { projectName, memberName, grouping }, names);
		return { ...line, projectName, memberName, label };
	});
	named.sort(compareNamedLines);
	return named;
}

export interface InvoiceProjectGroup {
	projectId: string;
	projectName: string;
	lines: NamedInvoiceLine[];
	hours: number;
	amount: number;
}

/** The lines of one currency, project by project, each with its own subtotal. */
export function projectGroupsOf(lines: ReadonlyArray<NamedInvoiceLine>): InvoiceProjectGroup[] {
	const byProject = new Map<string, InvoiceProjectGroup>();
	for (const line of lines) {
		const group = byProject.get(line.projectId) ?? {
			projectId: line.projectId,
			projectName: line.projectName,
			lines: [],
			hours: 0,
			amount: 0
		};
		group.lines.push(line);
		group.hours = hoursOfLines(group.lines);
		group.amount = roundedAmountOf(group.amount + line.amount);
		byProject.set(line.projectId, group);
	}
	return [...byProject.values()];
}

/** What the invoice states for a line: what the user wrote, or the line's own label when the field is left empty. */
export function lineDescriptionOf(line: NamedInvoiceLine, descriptions: ReadonlyMap<string, string>) {
	const written = descriptions.get(line.key)?.trim();
	if (written) {
		return written;
	}
	return line.label;
}

export interface InvoicePeriodDays {
	fromDay: string;
	toDay: string;
}

const TERMS_PREFIX = 'Billable time from';

const TERMS_PATTERN = /^Billable time from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/;

export function invoicePeriodDaysOf(period: Period): InvoicePeriodDays {
	return { fromDay: localDayKeyOf(period.from), toDay: localDayKeyOf(period.to) };
}

const NOTE_SEPARATOR = '\n\n';

/**
 * The API stores no period on an invoice. The period is written as the first line of the invoice's terms, which the
 * PDF prints, in one fixed form so the list can read it back whatever the reader's language. A note to the client
 * follows it, after a blank line.
 */
export function invoiceTermsOf(days: InvoicePeriodDays, note = '') {
	const periodLine = `${TERMS_PREFIX} ${days.fromDay} to ${days.toDay}`;
	const trimmedNote = note.trim();
	if (!trimmedNote) {
		return periodLine;
	}
	return `${periodLine}${NOTE_SEPARATOR}${trimmedNote}`;
}

function isRealDay(dayKey: string) {
	const day = dateOfDayKey(dayKey);
	if (!day) {
		return false;
	}
	return localDayKeyOf(day) === dayKey;
}

export function invoicePeriodOfTerms(terms: string | null | undefined): InvoicePeriodDays | null {
	const match = TERMS_PATTERN.exec(terms ?? '');
	if (!match) {
		return null;
	}
	const fromDay = match[1];
	const toDay = match[2];
	const areRealDays = isRealDay(fromDay) && isRealDay(toDay);
	if (!areRealDays || fromDay > toDay) {
		return null;
	}
	return { fromDay, toDay };
}

export function periodsOverlap(first: InvoicePeriodDays, second: InvoicePeriodDays) {
	const startsBeforeOtherEnds = first.fromDay <= second.toDay;
	const endsAfterOtherStarts = first.toDay >= second.fromDay;
	return startsBeforeOtherEnds && endsAfterOtherStarts;
}

export interface StatedInvoicePeriod {
	terms?: string | null;
	status?: string | null;
}

function isVoidInvoice(invoice: StatedInvoicePeriod) {
	return invoiceStatusOf(invoice.status) === 'VOID';
}

/**
 * The saved invoices whose stated period shares a day with the given one. An invoice that states none is left out, and
 * so is a void one: it billed nothing.
 */
export function overlappingInvoicesOf<T extends StatedInvoicePeriod>(
	invoices: ReadonlyArray<T>,
	days: InvoicePeriodDays
): T[] {
	return invoices.filter((invoice) => {
		if (isVoidInvoice(invoice)) {
			return false;
		}
		const stated = invoicePeriodOfTerms(invoice.terms);
		if (!stated) {
			return false;
		}
		return periodsOverlap(stated, days);
	});
}

const INVOICE_NUMBER_PATTERN = /^\d{1,15}$/;

/** A whole number from 1, as the API asks for; null for anything else. */
export function parseInvoiceNumber(text: string): number | null {
	const trimmed = text.trim();
	if (!INVOICE_NUMBER_PATTERN.test(trimmed)) {
		return null;
	}
	const number = Number(trimmed);
	if (number < 1) {
		return null;
	}
	return number;
}

/** The number after the highest one the workspace holds, invoices and estimates together. */
export function nextInvoiceNumberOf(highest: unknown): number | null {
	const number = Number(highest);
	const isCount = Number.isSafeInteger(number) && number >= 0;
	if (!isCount) {
		return null;
	}
	return number + 1;
}

/** Today in the organization's zone, the one that dates an invoice: the browser can already be on another day. */
export function todayDayKey(timeZone: string | null | undefined, now = new Date()) {
	const zonedDay = invoiceDayOf(now.toISOString(), timeZone);
	return zonedDay ?? localDayKeyOf(now);
}

export type InvoiceDueTermSource = 'client' | 'organization' | 'standard';

export interface InvoiceDueTerm {
	source: InvoiceDueTermSource;
	days: number;
}

/** The term of an invoice whose client and organization state none. */
export const STANDARD_DUE_DAYS = 30;

function termDaysOf(value: number | null | undefined, minimum: number): number | null {
	if (typeof value !== 'number') {
		return null;
	}
	const isWhole = Number.isInteger(value);
	const isLongEnough = value >= minimum;
	if (!isWhole || !isLongEnough) {
		return null;
	}
	return value;
}

/**
 * How many days after its issue an invoice is due: the client's own payment terms, where zero is due on receipt,
 * else the organization's setting, where zero is no setting as on the API's own screen, else thirty days.
 */
export function invoiceDueTermOf(
	clientTermDays: number | null | undefined,
	organizationDaysUntilDue: number | null | undefined
): InvoiceDueTerm {
	const clientDays = termDaysOf(clientTermDays, 0);
	if (clientDays !== null) {
		return { source: 'client', days: clientDays };
	}
	const organizationDays = termDaysOf(organizationDaysUntilDue, 1);
	if (organizationDays !== null) {
		return { source: 'organization', days: organizationDays };
	}
	return { source: 'standard', days: STANDARD_DUE_DAYS };
}

/** The day `days` after the issue day; empty while the issue day is not a real day. */
export function dueDayAfter(issueDay: string, days: number): string {
	const issueDate = dateOfDayKey(issueDay);
	if (!issueDate || !isRealDay(issueDay)) {
		return '';
	}
	return localDayKeyOf(addDays(issueDate, days));
}

export type InvoiceProblem =
	| 'number'
	| 'issueDay'
	| 'dueDay'
	| 'dueBeforeIssue'
	| 'noLines'
	| 'noCurrency'
	| 'readingEarlier'
	| 'readingTime';

export interface InvoiceDraftFacts {
	numberText: string;
	issueDay: string;
	dueDay: string;
	currency: string | null;
	lineCount: number;
}

export function invoiceProblemsOf(facts: InvoiceDraftFacts): InvoiceProblem[] {
	const problems: InvoiceProblem[] = [];
	if (facts.lineCount === 0) {
		problems.push('noLines');
	}
	if (facts.lineCount > 0 && !facts.currency) {
		problems.push('noCurrency');
	}
	if (parseInvoiceNumber(facts.numberText) === null) {
		problems.push('number');
	}
	const hasIssueDay = isRealDay(facts.issueDay);
	const hasDueDay = isRealDay(facts.dueDay);
	if (!hasIssueDay) {
		problems.push('issueDay');
	}
	if (!hasDueDay) {
		problems.push('dueDay');
	}
	const isDueBeforeIssue = hasIssueDay && hasDueDay && facts.dueDay < facts.issueDay;
	if (isDueBeforeIssue) {
		problems.push('dueBeforeIssue');
	}
	return problems;
}

export type InvoiceSaveFailure = 'refused' | 'unconfirmed';

function isRefusalStatus(status: number) {
	return status >= 400 && status < 500;
}

/**
 * Whether a failed save created nothing. Only the API's own refusal says so: it refuses before anything is written,
 * and a failed write is answered 400. Without an answer (the network, a timeout, a gateway's 502 or 504), with a
 * server failure, or with an answer that could not be read, the invoice may have been saved all the same.
 */
export function invoiceSaveFailureOf(error: unknown): InvoiceSaveFailure {
	if (!ApiErrorService.isApiError(error)) {
		return 'unconfirmed';
	}
	const answeredStatus = error.httpResponseStatus;
	if (answeredStatus === undefined) {
		return 'unconfirmed';
	}
	if (isRefusalStatus(answeredStatus)) {
		return 'refused';
	}
	return 'unconfirmed';
}

export interface InvoiceReads {
	/** The invoices already saved for the client, whose overlap with the period is shown before saving. */
	isReadingEarlier: boolean;
	/** The billable time, the members' rates or the client rates, read again while their last answer is shown. */
	isReadingTimeAgain: boolean;
}

/** What a save waits for: a read still under way, whose answer can change what the invoice states or warns about. */
export function invoiceWaitsOf(reads: InvoiceReads): InvoiceProblem[] {
	const waits: InvoiceProblem[] = [];
	if (reads.isReadingEarlier) {
		waits.push('readingEarlier');
	}
	if (reads.isReadingTimeAgain) {
		waits.push('readingTime');
	}
	return waits;
}

function dayStartOf(dayKey: string, timeZone: string | null | undefined) {
	const zoned = startOfDayInTimeZone(dayKey, timeZone);
	if (zoned) {
		return zoned;
	}
	const day = dateOfDayKey(dayKey) ?? new Date(dayKey);
	return startOfDay(day).toISOString();
}

function dayEndOf(dayKey: string, timeZone: string | null | undefined) {
	const zoned = endOfDayInTimeZone(dayKey, timeZone);
	if (zoned) {
		return zoned;
	}
	const day = dateOfDayKey(dayKey) ?? new Date(dayKey);
	return endOfDay(day).toISOString();
}

/** The calendar day an invoice date stands for in the organization's zone, the one the API's PDF prints it in. */
export function invoiceDayOf(date: string | null | undefined, timeZone: string | null | undefined): string | null {
	if (!date) {
		return null;
	}
	const instant = new Date(date);
	if (Number.isNaN(instant.getTime())) {
		return null;
	}
	const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
	const zone = timeZone?.trim();
	if (zone) {
		options.timeZone = zone;
	}
	try {
		// The Canadian English form of a date is the day key itself: 2026-10-05.
		const format = new Intl.DateTimeFormat('en-CA', options);
		return format.format(instant);
	} catch {
		return localDayKeyOf(instant);
	}
}

export interface InvoiceItemRequest {
	description: string;
	price: number;
	quantity: number;
	totalValue: number;
	invoiceId: string;
	projectId: string;
	employeeId?: string;
	taskId?: string;
	applyTax: boolean;
	applyDiscount: boolean;
	organizationId: string;
	tenantId: string;
}

export interface InvoiceRequest {
	id: string;
	invoiceNumber: number;
	invoiceDate: string;
	dueDate: string;
	currency: string;
	discountValue: number;
	discountType: 'PERCENT';
	tax: number;
	taxType: 'PERCENT';
	tax2: number;
	tax2Type: 'PERCENT';
	terms: string;
	paid: boolean;
	totalValue: number;
	status: 'DRAFT';
	isEstimate: boolean;
	invoiceType: 'BY_PROJECT_HOURS';
	organizationContactId: string;
	toContactId: string;
	fromOrganizationId: string;
	organizationId: string;
	tenantId: string;
	invoiceItems: InvoiceItemRequest[];
}

export interface InvoiceRequestInput {
	/** The invoice's id, chosen here so the lines name their invoice in the one request that creates both. */
	id: string;
	organizationId: string;
	tenantId: string;
	clientId: string;
	invoiceNumber: number;
	issueDay: string;
	dueDay: string;
	currency: string;
	period: InvoicePeriodDays;
	/** The organization's zone, in which the API prints the invoice's days. */
	timeZone: string | null | undefined;
	lines: ReadonlyArray<NamedInvoiceLine>;
	descriptions: ReadonlyMap<string, string>;
	adjustments?: InvoiceAdjustments;
	note?: string;
}

function isAboveZero(percent: number | null) {
	const value = percent ?? 0;
	return value > 0;
}

function itemRequestOf(
	line: NamedInvoiceLine,
	input: InvoiceRequestInput,
	adjustments: InvoiceAdjustments
): InvoiceItemRequest {
	const item: InvoiceItemRequest = {
		description: lineDescriptionOf(line, input.descriptions),
		price: line.rate,
		quantity: line.hours,
		totalValue: line.amount,
		invoiceId: input.id,
		projectId: line.projectId,
		// The invoice's tax and discount apply to every line; the API's own screen totals the lines that say so.
		applyTax: isAboveZero(adjustments.taxPercent),
		applyDiscount: isAboveZero(adjustments.discountPercent),
		organizationId: input.organizationId,
		tenantId: input.tenantId
	};
	if (line.employeeId) {
		item.employeeId = line.employeeId;
	}
	if (line.taskId) {
		item.taskId = line.taskId;
	}
	return item;
}

function totalOfLines(lines: ReadonlyArray<NamedInvoiceLine>) {
	let total = 0;
	for (const line of lines) {
		total += line.amount;
	}
	return roundedAmountOf(total);
}

/**
 * The invoice and its lines as the API's create route takes them, a draft billed by project hours. Lines priced in
 * another currency than the invoice's are refused: an invoice has one currency and never adds two. The API's PDF
 * prints the total as it is stored, so it is stored with the discount and the tax in it.
 */
export function buildInvoiceRequest(input: InvoiceRequestInput): InvoiceRequest {
	const lines = input.lines.filter((line) => line.currency === input.currency);
	const { adjustments = NO_ADJUSTMENTS } = input;
	const totals = invoiceTotalsOf(totalOfLines(lines), adjustments);
	return {
		id: input.id,
		invoiceNumber: input.invoiceNumber,
		invoiceDate: dayStartOf(input.issueDay, input.timeZone),
		dueDate: dayEndOf(input.dueDay, input.timeZone),
		currency: input.currency,
		// The API's PDF prints these values as they are: left out, the document reads "null".
		discountValue: adjustments.discountPercent ?? 0,
		discountType: 'PERCENT',
		tax: adjustments.taxPercent ?? 0,
		taxType: 'PERCENT',
		tax2: 0,
		tax2Type: 'PERCENT',
		terms: invoiceTermsOf(input.period, input.note),
		paid: false,
		totalValue: totals.total,
		status: 'DRAFT',
		isEstimate: false,
		invoiceType: 'BY_PROJECT_HOURS',
		organizationContactId: input.clientId,
		toContactId: input.clientId,
		fromOrganizationId: input.organizationId,
		organizationId: input.organizationId,
		tenantId: input.tenantId,
		invoiceItems: lines.map((line) => itemRequestOf(line, input, adjustments))
	};
}

export const INVOICE_STATUSES = [
	'DRAFT',
	'SENT',
	'VIEWED',
	'FULLY_PAID',
	'PARTIALLY_PAID',
	'OVERPAID',
	'VOID'
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function invoiceStatusOf(raw: string | null | undefined): InvoiceStatus | null {
	const trimmed = raw?.trim();
	const upper = trimmed?.toUpperCase();
	const known = INVOICE_STATUSES.find((status) => status === upper);
	return known ?? null;
}

export type InvoiceStatusTone = 'neutral' | 'info' | 'success' | 'warning';

const STATUS_TONES: Record<InvoiceStatus, InvoiceStatusTone> = {
	DRAFT: 'neutral',
	SENT: 'info',
	VIEWED: 'info',
	FULLY_PAID: 'success',
	PARTIALLY_PAID: 'warning',
	OVERPAID: 'warning',
	VOID: 'neutral'
};

export function invoiceStatusToneOf(status: InvoiceStatus | null): InvoiceStatusTone {
	if (!status) {
		return 'neutral';
	}
	return STATUS_TONES[status];
}

export function invoiceDayTextOf(dayKey: string | null, locale: string): string | null {
	const day = dateOfDayKey(dayKey ?? '');
	if (!day) {
		return null;
	}
	return dayDateOf(day, locale);
}

export function invoicePeriodTextOf(days: InvoicePeriodDays, locale: string): string | null {
	const from = dateOfDayKey(days.fromDay);
	const to = dateOfDayKey(days.toDay);
	if (!from || !to) {
		return null;
	}
	return formatPeriod({ from, to }, locale);
}

/** The month a `YYYY-MM` key stands for, in words; null for the key of the invoices that state no date. */
export function invoiceMonthTextOf(monthKey: string, locale: string): string | null {
	const firstDay = dateOfDayKey(`${monthKey}-01`);
	if (!firstDay) {
		return null;
	}
	const format = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
	return format.format(firstDay);
}

/** Hours as the invoice states them, always to the hundredth: 10.50, never 10.5. */
export function formatInvoiceHours(hours: number, locale: string) {
	const format = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return format.format(hours);
}

export interface DatedInvoice {
	invoiceDate?: string | null;
}

export interface InvoiceMonthGroup<T> {
	/** `YYYY-MM`, or an empty key for the invoices that state no date. */
	key: string;
	invoices: T[];
}

const MONTH_KEY_LENGTH = 7;

/** Invoices under the month they were issued in, in the order they came (the API sorts them, newest first). */
export function invoiceMonthGroupsOf<T extends DatedInvoice>(
	invoices: ReadonlyArray<T>,
	timeZone: string | null | undefined
): InvoiceMonthGroup<T>[] {
	const byMonth = new Map<string, InvoiceMonthGroup<T>>();
	for (const invoice of invoices) {
		const day = invoiceDayOf(invoice.invoiceDate, timeZone) ?? '';
		const key = day.slice(0, MONTH_KEY_LENGTH);
		const group = byMonth.get(key) ?? { key, invoices: [] };
		group.invoices.push(invoice);
		byMonth.set(key, group);
	}
	return [...byMonth.values()];
}
