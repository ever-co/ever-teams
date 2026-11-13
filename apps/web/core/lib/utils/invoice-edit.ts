import type { Period } from '@/core/lib/utils/dashboard-period';
import { dateOfDayKey } from '@/core/lib/utils/dashboards/payments-due';
import {
	compareNamedLines,
	invoiceDayOf,
	invoiceLineKeyOf,
	invoicePeriodOfTerms,
	invoiceStatusOf,
	lineDescriptionOf,
	type InvoiceGrouping,
	type InvoiceItemRequest,
	type InvoicePeriodDays,
	type InvoiceRequest,
	type InvoiceStatus,
	type NamedInvoiceLine
} from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import type { TSavedInvoice, TSavedInvoiceItem } from '@/core/types/schemas/organization/invoice.schema';

/** A gateway answers these in the API's place when it could not reach it, or not in time. */
const GATEWAY_FAILURES: ReadonlySet<number> = new Set([502, 504]);

/** Whether a failed request never reached the API: no answer at all (the network, a timeout), or a gateway's. */
export function didNotReachApi(error: unknown): boolean {
	if (!ApiErrorService.isApiError(error)) {
		return false;
	}
	const status = error.httpResponseStatus;
	if (status === undefined) {
		return true;
	}
	return GATEWAY_FAILURES.has(status);
}

/** The fields of an invoice an edit writes, and writes back when the edit fails half way. */
export interface InvoiceUpdate {
	invoiceNumber: number;
	invoiceDate: string;
	dueDate: string;
	currency: string;
	discountValue: number | null;
	discountType: string | null;
	tax: number | null;
	taxType: string | null;
	tax2: number | null;
	tax2Type: string | null;
	terms: string;
	totalValue: number;
	status: string;
	invoiceType: string | null;
	organizationContactId: string | null;
	toContactId: string;
	organizationId: string;
	tenantId: string;
}

/** The organization and tenant an invoice belongs to. */
export type InvoiceWorkspace = Pick<InvoiceUpdate, 'organizationId' | 'tenantId'>;

/** An edit is two writes: the invoice's own fields, then the whole set of its lines. */
export interface InvoiceRevision {
	update: InvoiceUpdate;
	lines: InvoiceItemRequest[];
}

export interface SavedInvoiceClient {
	id: string;
	name: string;
	primaryEmail: string | null;
	imageUrl: string | null;
}

/** An invoice made from billable time, read back to be edited or replaced. */
export interface SavedInvoice {
	id: string;
	/** Where it is edited or replaced: never in a workspace another tab chose since. */
	workspace: InvoiceWorkspace;
	number: number;
	status: InvoiceStatus;
	client: SavedInvoiceClient;
	period: InvoicePeriodDays;
	issueDay: string;
	dueDay: string;
	currency: string;
	discountPercent: number | null;
	taxPercent: number | null;
	note: string;
	total: number;
	grouping: InvoiceGrouping;
	lines: NamedInvoiceLine[];
	/** Each line's id on the invoice, by line key: the time logs that name it are the time the line bills. */
	lineIds: ReadonlyMap<string, string>;
	/** What each line states, by line key. */
	descriptions: ReadonlyMap<string, string>;
	/** The invoice as it was read: what is written back when an edit fails half way. */
	previous: InvoiceRevision;
	/** The id on the invoice of each line of `previous`, in its order. */
	previousLineIds: ReadonlyArray<string>;
}

export interface SavedInvoiceReading {
	/** The organization's zone, the one the API prints the invoice's days in. */
	timeZone: string | null | undefined;
	unnamedProject: string;
	/** Every client's name by id, archived ones included: the API drops an archived client from the invoice. */
	clientNames: ReadonlyMap<string, string>;
}

const PERCENT_TYPE = 'PERCENT';

/** The type every invoice made from billable time is saved with. */
const MADE_FROM_TIME_TYPE = 'BY_PROJECT_HOURS';

const SECONDS_PER_HOUR = 3600;

function trimmedOrNull(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

function isFiniteNumber(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isUnset(value: number | null | undefined) {
	if (value === null || value === undefined) {
		return true;
	}
	return value === 0;
}

/** A discount or a tax the screen shows and writes back as it is: none, or a percent. */
function isPercentOrNone(value: number | null | undefined, type: string | null | undefined) {
	if (isUnset(value)) {
		return true;
	}
	return type === PERCENT_TYPE;
}

function percentOrNull(value: number | null | undefined): number | null {
	if (isUnset(value)) {
		return null;
	}
	return value ?? null;
}

function wholeNumberOf(value: number | null | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}
	const isWhole = Number.isSafeInteger(value);
	if (!isWhole || value < 1) {
		return null;
	}
	return value;
}

interface SavedLineParts {
	projectId: string;
	employeeId: string | null;
	taskId: string | null;
	description: string;
	hours: number;
	rate: number;
	amount: number;
	projectName: string | null;
	item: TSavedInvoiceItem;
}

function savedLinePartsOf(item: TSavedInvoiceItem): SavedLineParts | null {
	const projectId = trimmedOrNull(item.projectId);
	const hours = item.quantity;
	const rate = item.price;
	const amount = item.totalValue;
	const hasFigures = isFiniteNumber(hours) && isFiniteNumber(rate);
	const isPriced = hasFigures && isFiniteNumber(amount);
	if (!projectId || !isPriced) {
		return null;
	}
	return {
		projectId,
		employeeId: trimmedOrNull(item.employeeId),
		taskId: trimmedOrNull(item.taskId),
		description: item.description?.trim() ?? '',
		hours,
		rate,
		amount,
		projectName: trimmedOrNull(item.project?.name),
		item
	};
}

/** Every line, or null when one of them was not made from a project's time. */
function savedLinePartsOfAll(items: ReadonlyArray<TSavedInvoiceItem>): SavedLineParts[] | null {
	const parts: SavedLineParts[] = [];
	for (const item of items) {
		const lineParts = savedLinePartsOf(item);
		if (!lineParts) {
			return null;
		}
		parts.push(lineParts);
	}
	return parts;
}

/**
 * The grouping an invoice was made with, read from what its lines carry, since the API records none: no line names a
 * member by project, a line naming a task by task, else by member. An invoice by task whose time had no task at all
 * reads as by member, which made the same lines.
 */
export function invoiceGroupingOfLines(
	lines: ReadonlyArray<{ employeeId: string | null; taskId: string | null }>
): InvoiceGrouping {
	if (lines.length === 0) {
		return 'member';
	}
	const namesMember = lines.some((line) => line.employeeId !== null);
	if (!namesMember) {
		return 'project';
	}
	const namesTask = lines.some((line) => line.taskId !== null);
	if (namesTask) {
		return 'task';
	}
	return 'member';
}

/** A key seen again gets a suffix: two saved lines never share the place of one. */
function uniqueKeyOf(key: string, seen: Map<string, number>) {
	const repeats = seen.get(key) ?? 0;
	seen.set(key, repeats + 1);
	if (repeats === 0) {
		return key;
	}
	return `${key}#${repeats}`;
}

interface SavedLinesContext {
	grouping: InvoiceGrouping;
	currency: string;
	unnamedProject: string;
}

function namedSavedLinesOf(parts: ReadonlyArray<SavedLineParts>, context: SavedLinesContext) {
	const seen = new Map<string, number>();
	const descriptions = new Map<string, string>();
	const lineIds = new Map<string, string>();
	const lines = parts.map((part) => {
		const baseKey = invoiceLineKeyOf({ ...part, currency: context.currency }, context.grouping);
		const key = uniqueKeyOf(baseKey, seen);
		const projectName = part.projectName ?? context.unnamedProject;
		let label = part.description;
		if (!label) {
			label = projectName;
		}
		descriptions.set(key, part.description);
		lineIds.set(key, part.item.id);
		const line: NamedInvoiceLine = {
			key,
			projectId: part.projectId,
			employeeId: part.employeeId,
			taskId: part.taskId,
			seconds: Math.round(part.hours * SECONDS_PER_HOUR),
			hours: part.hours,
			rate: part.rate,
			currency: context.currency,
			amount: part.amount,
			rateSource: 'saved',
			isAverageRate: false,
			projectName,
			memberName: '',
			label
		};
		return line;
	});
	lines.sort(compareNamedLines);
	return { lines, descriptions, lineIds };
}

/** The note an invoice states under its period: everything after the period's line. */
export function invoiceNoteOfTerms(terms: string | null | undefined): string {
	const text = terms ?? '';
	const lineBreak = text.indexOf('\n');
	if (lineBreak < 0) {
		return '';
	}
	return text.slice(lineBreak + 1).trim();
}

/** What a percent field holds for a saved discount or tax; empty for none. */
export function percentTextOf(percent: number | null): string {
	if (percent === null) {
		return '';
	}
	return String(percent);
}

/** The period an invoice states, as the range its time is read in. */
export function periodOfDays(days: InvoicePeriodDays): Period | null {
	const from = dateOfDayKey(days.fromDay);
	const to = dateOfDayKey(days.toDay);
	if (!from || !to) {
		return null;
	}
	return { from, to };
}

function clientOfInvoice(invoice: TSavedInvoice, clientId: string, reading: SavedInvoiceReading): SavedInvoiceClient {
	const contact = invoice.toContact;
	const relatedName = trimmedOrNull(contact?.name);
	const listedName = reading.clientNames.get(clientId) ?? '';
	return {
		id: clientId,
		name: relatedName ?? listedName,
		primaryEmail: trimmedOrNull(contact?.primaryEmail),
		imageUrl: contact?.imageUrl ?? null
	};
}

interface SavedInvoiceFacts {
	status: InvoiceStatus;
	number: number;
	clientId: string;
	period: InvoicePeriodDays;
	invoiceDate: string;
	dueDate: string;
	issueDay: string;
	dueDay: string;
	currency: string;
	total: number;
	organizationId: string;
	tenantId: string;
}

/** The fields every invoice made from billable time states; null as soon as one is missing. */
function factsOf(invoice: TSavedInvoice, timeZone: string | null | undefined): SavedInvoiceFacts | null {
	const status = invoiceStatusOf(invoice.status);
	const number = wholeNumberOf(invoice.invoiceNumber);
	const clientId = trimmedOrNull(invoice.toContactId);
	const period = invoicePeriodOfTerms(invoice.terms);
	const invoiceDate = invoice.invoiceDate ?? null;
	const dueDate = invoice.dueDate ?? null;
	const issueDay = invoiceDayOf(invoiceDate, timeZone);
	const dueDay = invoiceDayOf(dueDate, timeZone);
	const currency = trimmedOrNull(invoice.currency);
	const total = invoice.totalValue;
	const organizationId = trimmedOrNull(invoice.organizationId);
	const tenantId = trimmedOrNull(invoice.tenantId);
	const hasIdentity = status !== null && number !== null && clientId !== null;
	const hasDays = period !== null && issueDay !== null && dueDay !== null;
	const hasDates = invoiceDate !== null && dueDate !== null;
	const hasMoney = currency !== null && isFiniteNumber(total);
	const hasScope = organizationId !== null && tenantId !== null;
	const isComplete = hasIdentity && hasDays && hasDates && hasMoney && hasScope;
	if (!isComplete) {
		return null;
	}
	return {
		status,
		number,
		clientId,
		period,
		invoiceDate,
		dueDate,
		issueDay,
		dueDay,
		currency,
		total,
		organizationId,
		tenantId
	};
}

/** Made from billable time by this screen: by project hours, a percent discount and tax or none, no second tax. */
function isMadeFromTime(invoice: TSavedInvoice) {
	const type = invoice.invoiceType ?? MADE_FROM_TIME_TYPE;
	const isTimeType = type === MADE_FROM_TIME_TYPE;
	const isDiscountReadable = isPercentOrNone(invoice.discountValue, invoice.discountType);
	const isTaxReadable = isPercentOrNone(invoice.tax, invoice.taxType);
	const hasNoSecondTax = isUnset(invoice.tax2);
	return isTimeType && isDiscountReadable && isTaxReadable && hasNoSecondTax && appliesItsRatesToEveryLine(invoice);
}

/**
 * This screen applies the invoice's discount and tax to every line. A line that does not take a discount or tax the
 * invoice has (one set apart on the API's own screen) would be priced again on any save, so such an invoice is not
 * edited here.
 */
function appliesItsRatesToEveryLine(invoice: TSavedInvoice) {
	const hasDiscount = !isUnset(invoice.discountValue);
	const hasTax = !isUnset(invoice.tax);
	return (invoice.invoiceItems ?? []).every((item) => {
		const keepsDiscount = !hasDiscount || item.applyDiscount === true;
		const keepsTax = !hasTax || item.applyTax === true;
		return keepsDiscount && keepsTax;
	});
}

function previousLineOf(part: SavedLineParts, invoiceId: string, facts: SavedInvoiceFacts): InvoiceItemRequest {
	const line: InvoiceItemRequest = {
		description: part.item.description ?? '',
		price: part.rate,
		quantity: part.hours,
		totalValue: part.amount,
		invoiceId,
		projectId: part.projectId,
		applyTax: part.item.applyTax ?? false,
		applyDiscount: part.item.applyDiscount ?? false,
		organizationId: facts.organizationId,
		tenantId: facts.tenantId
	};
	if (part.employeeId) {
		line.employeeId = part.employeeId;
	}
	if (part.taskId) {
		line.taskId = part.taskId;
	}
	return line;
}

function previousRevisionOf(
	invoice: TSavedInvoice,
	facts: SavedInvoiceFacts,
	parts: ReadonlyArray<SavedLineParts>
): InvoiceRevision {
	const update: InvoiceUpdate = {
		invoiceNumber: facts.number,
		invoiceDate: facts.invoiceDate,
		dueDate: facts.dueDate,
		currency: facts.currency,
		discountValue: invoice.discountValue ?? null,
		discountType: invoice.discountType ?? null,
		tax: invoice.tax ?? null,
		taxType: invoice.taxType ?? null,
		tax2: invoice.tax2 ?? null,
		tax2Type: invoice.tax2Type ?? null,
		terms: invoice.terms ?? '',
		totalValue: facts.total,
		status: facts.status,
		invoiceType: invoice.invoiceType ?? null,
		organizationContactId: invoice.organizationContactId ?? null,
		toContactId: facts.clientId,
		organizationId: facts.organizationId,
		tenantId: facts.tenantId
	};
	const lines = parts.map((part) => previousLineOf(part, invoice.id, facts));
	return { update, lines };
}

/**
 * An invoice read back to be edited or replaced, or null when this screen did not make it from billable time: its
 * period, its lines and its adjustments could not be shown, nor written back, as they are.
 */
export function savedInvoiceOf(invoice: TSavedInvoice, reading: SavedInvoiceReading): SavedInvoice | null {
	const facts = factsOf(invoice, reading.timeZone);
	if (!facts || !isMadeFromTime(invoice)) {
		return null;
	}
	const parts = savedLinePartsOfAll(invoice.invoiceItems ?? []);
	if (!parts) {
		return null;
	}
	const grouping = invoiceGroupingOfLines(parts);
	const context = { grouping, currency: facts.currency, unnamedProject: reading.unnamedProject };
	const { lines, descriptions, lineIds } = namedSavedLinesOf(parts, context);
	return {
		id: invoice.id,
		workspace: { organizationId: facts.organizationId, tenantId: facts.tenantId },
		number: facts.number,
		status: facts.status,
		client: clientOfInvoice(invoice, facts.clientId, reading),
		period: facts.period,
		issueDay: facts.issueDay,
		dueDay: facts.dueDay,
		currency: facts.currency,
		discountPercent: percentOrNull(invoice.discountValue),
		taxPercent: percentOrNull(invoice.tax),
		note: invoiceNoteOfTerms(invoice.terms),
		total: facts.total,
		grouping,
		lines,
		lineIds,
		descriptions,
		previous: previousRevisionOf(invoice, facts, parts),
		previousLineIds: parts.map((part) => part.item.id)
	};
}

const NAMELESS_READING: SavedInvoiceReading = { timeZone: null, unnamedProject: '', clientNames: new Map() };

/** Whether the invoice screen can start from this invoice, to edit it or to replace it, as `savedInvoiceOf` reads it. */
export function isRebuildableInvoice(invoice: TSavedInvoice): boolean {
	return savedInvoiceOf(invoice, NAMELESS_READING) !== null;
}

/** The time logs that name a saved line, by the line's id on the invoice. */
export type BilledTimeOfLines = ReadonlyMap<string, ReadonlyArray<string>>;

export interface BilledLinesRead {
	/** The saved lines' ids on the invoice: a time log that names one is time the invoice bills. */
	lineIds: ReadonlySet<string>;
	/** Their projects, each once, in order. */
	projectIds: string[];
}

const NO_BILLED_LINES: BilledLinesRead = { lineIds: new Set(), projectIds: [] };

/** What reading the time a saved invoice bills needs; nothing for an invoice that is not saved yet. */
export function billedLinesReadOf(saved: SavedInvoice | null): BilledLinesRead {
	if (!saved) {
		return NO_BILLED_LINES;
	}
	const lineIds = new Set(saved.lineIds.values());
	const projects = new Set(saved.lines.map((line) => line.projectId));
	const projectIds = [...projects].sort((first, second) => first.localeCompare(second));
	return { lineIds, projectIds };
}

function billedTimeOfLine(lineId: string | undefined, billed: BilledTimeOfLines) {
	if (!lineId) {
		return undefined;
	}
	return billed.get(lineId);
}

/** The saved lines, each naming the time logs that name it; a line no time log names stays as it was saved. */
export function billedSavedLinesOf(saved: SavedInvoice, billed: BilledTimeOfLines): NamedInvoiceLine[] {
	return saved.lines.map((line) => {
		const lineId = saved.lineIds.get(line.key);
		const timeLogIds = billedTimeOfLine(lineId, billed);
		if (!timeLogIds) {
			return line;
		}
		return { ...line, timeLogIds };
	});
}

/**
 * The invoice as it was read, each line naming the time logs it bills when the API records billed time: an edit that
 * fails half way writes the lines back with their time, or the API would count that time as free.
 */
export function billedPreviousOf(
	saved: SavedInvoice,
	billed: BilledTimeOfLines,
	recordsBilledTime: boolean
): InvoiceRevision {
	if (!recordsBilledTime) {
		return saved.previous;
	}
	const lines = saved.previous.lines.map((line, index) => {
		const lineId = saved.previousLineIds[index];
		const timeLogIds = billedTimeOfLine(lineId, billed);
		if (!timeLogIds) {
			return line;
		}
		return { ...line, timeLogIds: [...timeLogIds] };
	});
	return { ...saved.previous, lines };
}

/**
 * What an edit writes: the invoice's fields as the screen built them, under the status it already has, and its lines
 * under its own id.
 */
export function invoiceRevisionOf(request: InvoiceRequest, saved: SavedInvoice): InvoiceRevision {
	const update: InvoiceUpdate = {
		invoiceNumber: request.invoiceNumber,
		invoiceDate: request.invoiceDate,
		dueDate: request.dueDate,
		currency: request.currency,
		discountValue: request.discountValue,
		discountType: request.discountType,
		tax: request.tax,
		taxType: request.taxType,
		tax2: request.tax2,
		tax2Type: request.tax2Type,
		terms: request.terms,
		totalValue: request.totalValue,
		status: saved.status,
		invoiceType: request.invoiceType,
		organizationContactId: request.organizationContactId,
		toContactId: request.toContactId,
		organizationId: request.organizationId,
		tenantId: request.tenantId
	};
	const lines = request.invoiceItems.map((item) => ({ ...item, invoiceId: saved.id }));
	return { update, lines };
}

/** A line as the invoice states it, to tell what an edit changes. */
export interface StatedInvoiceLine {
	key: string;
	description: string;
	hours: number;
	rate: number;
	amount: number;
}

export function statedLinesOf(
	lines: ReadonlyArray<NamedInvoiceLine>,
	descriptions: ReadonlyMap<string, string>
): StatedInvoiceLine[] {
	return lines.map((line) => ({
		key: line.key,
		description: lineDescriptionOf(line, descriptions),
		hours: line.hours,
		rate: line.rate,
		amount: line.amount
	}));
}

function recordedTimeLogIdsOf(billed: BilledTimeOfLines) {
	const recorded = new Set<string>();
	for (const timeLogIds of billed.values()) {
		for (const timeLogId of timeLogIds) {
			recorded.add(timeLogId);
		}
	}
	return recorded;
}

/**
 * Whether the lines bill a time log no saved line records yet. An invoice saved before billed time was recorded names
 * none: taken again with the same figures, saving it records the time it bills, a change of its own.
 */
export function billsUnrecordedTimeOf(
	lines: ReadonlyArray<Pick<NamedInvoiceLine, 'timeLogIds'>>,
	billed: BilledTimeOfLines
): boolean {
	const recorded = recordedTimeLogIdsOf(billed);
	return lines.some((line) => {
		const timeLogIds = line.timeLogIds ?? [];
		return timeLogIds.some((timeLogId) => !recorded.has(timeLogId));
	});
}

/** What the invoice on screen states, compared with the saved one. */
export interface InvoiceDraftFigures {
	lines: ReadonlyArray<StatedInvoiceLine>;
	number: number | null;
	issueDay: string;
	dueDay: string;
	currency: string | null;
	discountPercent: number | null;
	taxPercent: number | null;
	note: string;
	total: number;
	/** The lines bill a time log no saved line records yet. */
	billsUnrecordedTime: boolean;
}

export interface ValueChange<T> {
	before: T;
	after: T;
}

export interface InvoiceChanges {
	addedLines: number;
	removedLines: number;
	/** Lines still there with other hours, another rate or another amount. */
	repricedLines: number;
	/** Lines still there with the same figures and another description. */
	rewrittenDescriptions: number;
	total: ValueChange<number> | null;
	issueDay: ValueChange<string> | null;
	dueDay: ValueChange<string> | null;
	number: ValueChange<number> | null;
	discount: ValueChange<number> | null;
	tax: ValueChange<number> | null;
	currency: ValueChange<string> | null;
	isNoteRewritten: boolean;
	/** Saving records the time the lines bill, which the saved invoice does not record yet. */
	recordsBilledTime: boolean;
}

const CENTS_PER_UNIT = 100;

function changeOf<T>(before: T, after: T): ValueChange<T> | null {
	if (before === after) {
		return null;
	}
	return { before, after };
}

function hundredthsOf(value: number) {
	return Math.round(value * CENTS_PER_UNIT);
}

function amountChangeOf(before: number, after: number): ValueChange<number> | null {
	if (hundredthsOf(before) === hundredthsOf(after)) {
		return null;
	}
	return { before, after };
}

function haveSameFigures(first: StatedInvoiceLine, second: StatedInvoiceLine) {
	const sameHours = hundredthsOf(first.hours) === hundredthsOf(second.hours);
	const sameRate = hundredthsOf(first.rate) === hundredthsOf(second.rate);
	const sameAmount = hundredthsOf(first.amount) === hundredthsOf(second.amount);
	return sameHours && sameRate && sameAmount;
}

interface LineChanges {
	added: number;
	removed: number;
	repriced: number;
	rewritten: number;
}

/** Lines are matched by key: the same project, member and task, under the grouping the invoice was made with. */
function lineChangesOf(before: ReadonlyArray<StatedInvoiceLine>, after: ReadonlyArray<StatedInvoiceLine>): LineChanges {
	const beforeByKey = new Map(before.map((line) => [line.key, line]));
	const afterKeys = new Set(after.map((line) => line.key));
	const changes: LineChanges = { added: 0, removed: 0, repriced: 0, rewritten: 0 };
	for (const line of after) {
		const previous = beforeByKey.get(line.key);
		if (!previous) {
			changes.added += 1;
			continue;
		}
		if (!haveSameFigures(previous, line)) {
			changes.repriced += 1;
			continue;
		}
		const isRewritten = previous.description.trim() !== line.description.trim();
		if (isRewritten) {
			changes.rewritten += 1;
		}
	}
	const removedLines = before.filter((line) => !afterKeys.has(line.key));
	changes.removed = removedLines.length;
	return changes;
}

function optionalChangeOf<T>(before: T, after: T | null): ValueChange<T> | null {
	if (after === null) {
		return null;
	}
	return changeOf(before, after);
}

/** What saving the invoice on screen would change on the saved one. */
export function invoiceChangesOf(saved: SavedInvoice, draft: InvoiceDraftFigures): InvoiceChanges {
	const savedLines = statedLinesOf(saved.lines, saved.descriptions);
	const lines = lineChangesOf(savedLines, draft.lines);
	const savedDiscount = saved.discountPercent ?? 0;
	const savedTax = saved.taxPercent ?? 0;
	return {
		addedLines: lines.added,
		removedLines: lines.removed,
		repricedLines: lines.repriced,
		rewrittenDescriptions: lines.rewritten,
		total: amountChangeOf(saved.total, draft.total),
		issueDay: changeOf(saved.issueDay, draft.issueDay),
		dueDay: changeOf(saved.dueDay, draft.dueDay),
		number: optionalChangeOf(saved.number, draft.number),
		discount: changeOf(savedDiscount, draft.discountPercent ?? 0),
		tax: changeOf(savedTax, draft.taxPercent ?? 0),
		currency: optionalChangeOf(saved.currency, draft.currency),
		isNoteRewritten: saved.note.trim() !== draft.note.trim(),
		recordsBilledTime: draft.billsUnrecordedTime
	};
}

export function hasInvoiceChanges(changes: InvoiceChanges): boolean {
	const lineCounts = [changes.addedLines, changes.removedLines, changes.repricedLines, changes.rewrittenDescriptions];
	const hasLineChange = lineCounts.some((count) => count > 0);
	const values = [
		changes.total,
		changes.issueDay,
		changes.dueDay,
		changes.number,
		changes.discount,
		changes.tax,
		changes.currency
	];
	const hasValueChange = values.some((change) => change !== null);
	const kinds = [hasLineChange, hasValueChange, changes.isNoteRewritten, changes.recordsBilledTime];
	return kinds.some(Boolean);
}

function sortedLineIdsOf(ids: ReadonlyArray<string>) {
	return [...ids].sort((first, second) => first.localeCompare(second));
}

/** Whether the invoice still holds the lines the editor opened: lines written back after a failed save have new ids. */
export function haveSameLineIds(current: ReadonlyArray<{ id?: string | null }>, opened: ReadonlyArray<string>) {
	const currentIds = sortedLineIdsOf(current.map((line) => line.id ?? ''));
	const openedIds = sortedLineIdsOf(opened);
	if (currentIds.length !== openedIds.length) {
		return false;
	}
	return currentIds.every((id, index) => id === openedIds[index]);
}

/** A line as written to the API or read back from it. */
export interface WrittenInvoiceLine {
	description?: string | null;
	price?: number | null;
	quantity?: number | null;
	totalValue?: number | null;
	projectId?: string | null;
	employeeId?: string | null;
	taskId?: string | null;
	applyTax?: boolean | null;
	applyDiscount?: boolean | null;
}

function lineSignatureOf(line: WrittenInvoiceLine) {
	const parts = [
		line.projectId ?? '',
		line.employeeId ?? '',
		line.taskId ?? '',
		(line.description ?? '').trim(),
		hundredthsOf(line.quantity ?? 0),
		hundredthsOf(line.price ?? 0),
		hundredthsOf(line.totalValue ?? 0),
		line.applyTax ?? false,
		line.applyDiscount ?? false
	];
	return parts.join('|');
}

function sortedSignaturesOf(lines: ReadonlyArray<WrittenInvoiceLine>) {
	const signatures = lines.map(lineSignatureOf);
	return signatures.sort((first, second) => first.localeCompare(second));
}

/** Whether an invoice read back holds exactly these lines, in any order. */
export function haveSameLines(
	current: ReadonlyArray<WrittenInvoiceLine>,
	expected: ReadonlyArray<WrittenInvoiceLine>
): boolean {
	if (current.length !== expected.length) {
		return false;
	}
	const currentSignatures = sortedSignaturesOf(current);
	const expectedSignatures = sortedSignaturesOf(expected);
	return currentSignatures.every((signature, index) => signature === expectedSignatures[index]);
}

/** The fields of an invoice read back, as far as an edit writes them. */
export interface WrittenInvoiceFields {
	invoiceNumber?: number | null;
	invoiceDate?: string | null;
	dueDate?: string | null;
	currency?: string | null;
	discountValue?: number | null;
	discountType?: string | null;
	tax?: number | null;
	taxType?: string | null;
	tax2?: number | null;
	tax2Type?: string | null;
	terms?: string | null;
	totalValue?: number | null;
	invoiceType?: string | null;
	organizationContactId?: string | null;
	toContactId?: string | null;
}

/** A percent has at most four decimals (see `invoice-totals`): 12.341 % and 12.344 % are two rates. */
const PERCENT_SCALE = 10_000;

function instantOf(date: string | null | undefined) {
	if (!date) {
		return Number.NaN;
	}
	return new Date(date).getTime();
}

function tenThousandthsOf(percent: number | null | undefined) {
	return Math.round((percent ?? 0) * PERCENT_SCALE);
}

function haveSamePercents(
	first: ReadonlyArray<number | null | undefined>,
	second: ReadonlyArray<number | null | undefined>
) {
	return first.every((value, index) => tenThousandthsOf(value) === tenThousandthsOf(second[index]));
}

/** A text field an edit writes: unset reads the same whether the API leaves it out or answers null. */
function haveSameTexts(
	first: ReadonlyArray<string | null | undefined>,
	second: ReadonlyArray<string | null | undefined>
) {
	return first.every((value, index) => (value ?? null) === (second[index] ?? null));
}

/**
 * Whether an invoice read back states what the update writes: its number, dates, client, money and terms, each
 * percent to the ten-thousandth it is typed in and the total to the cent.
 */
export function haveSameFields(current: WrittenInvoiceFields, update: InvoiceUpdate): boolean {
	const sameNumber = current.invoiceNumber === update.invoiceNumber;
	const sameIssueDate = instantOf(current.invoiceDate) === instantOf(update.invoiceDate);
	const sameDueDate = instantOf(current.dueDate) === instantOf(update.dueDate);
	const sameCurrency = current.currency === update.currency;
	const sameTerms = (current.terms ?? '') === update.terms;
	const sameTotal = hundredthsOf(current.totalValue ?? 0) === hundredthsOf(update.totalValue);
	const currentPercents = [current.discountValue, current.tax, current.tax2];
	const updatePercents = [update.discountValue, update.tax, update.tax2];
	const samePercents = haveSamePercents(currentPercents, updatePercents);
	const currentTexts = [
		current.discountType,
		current.taxType,
		current.tax2Type,
		current.invoiceType,
		current.organizationContactId,
		current.toContactId
	];
	const updateTexts = [
		update.discountType,
		update.taxType,
		update.tax2Type,
		update.invoiceType,
		update.organizationContactId,
		update.toContactId
	];
	const sameTexts = haveSameTexts(currentTexts, updateTexts);
	const sameIdentity = sameNumber && sameCurrency && sameTerms && sameTexts;
	const sameDates = sameIssueDate && sameDueDate;
	const sameMoney = sameTotal && samePercents;
	return sameIdentity && sameDates && sameMoney;
}

/** What the screen of a saved invoice shows while it reads it. */
export type SavedInvoiceStatus =
	| 'loading'
	| 'workspaceError'
	| 'error'
	| 'missing'
	| 'otherWorkspace'
	| 'notFromTime'
	| 'ready';

export interface SavedInvoiceRead {
	/** The organization dates the invoice: its days are read in its zone. */
	hasOrganization: boolean;
	hasOrganizationFailed: boolean;
	isLoading: boolean;
	isMissing: boolean;
	isError: boolean;
	hasInvoice: boolean;
	/** Of the workspace it was read in: see `isInvoiceOfWorkspace`. */
	isOfWorkspace: boolean;
	isReadable: boolean;
}

/**
 * The API finds an invoice by its id across every organization of the tenant: an invoice of another organization,
 * opened by its link after another tab switched the workspace, is not edited or replaced from this one.
 */
export function isInvoiceOfWorkspace(invoice: TSavedInvoice | null, workspace: InvoiceWorkspace | null) {
	if (!invoice || !workspace) {
		return false;
	}
	const isSameOrganization = invoice.organizationId === workspace.organizationId;
	const isSameTenant = invoice.tenantId === workspace.tenantId;
	return isSameOrganization && isSameTenant;
}

export function savedInvoiceStatusOf(read: SavedInvoiceRead): SavedInvoiceStatus {
	if (!read.hasOrganization) {
		if (read.hasOrganizationFailed) {
			return 'workspaceError';
		}
		return 'loading';
	}
	if (read.isLoading) {
		return 'loading';
	}
	if (read.isMissing) {
		return 'missing';
	}
	// A read again that failed keeps the invoice it had: the screen, and what was typed on it, stay. A save reads the
	// invoice anew before it writes anything.
	if (!read.hasInvoice) {
		return 'error';
	}
	if (!read.isOfWorkspace) {
		return 'otherWorkspace';
	}
	if (!read.isReadable) {
		return 'notFromTime';
	}
	return 'ready';
}
