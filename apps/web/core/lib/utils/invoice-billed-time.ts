import { addDays } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { dateOfDayKey } from '@/core/lib/utils/dashboards/payments-due';
import type { InvoicePeriodDays } from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';

/** The code the API's refusal starts with when a line names a time log it cannot bill. */
const TIME_LOG_NOT_BILLABLE = 'INVOICE_TIME_LOG_NOT_BILLABLE';

const BAD_REQUEST = 400;

/**
 * Whether the API refused a save because a line names time it can no longer bill: an invoice that is not void bills
 * it, or it was deleted, since it was read. The API saves nothing then.
 */
export function isTimeBilledElsewhere(error: unknown): boolean {
	if (!ApiErrorService.isApiError(error)) {
		return false;
	}
	const isRefusal = error.httpResponseStatus === BAD_REQUEST;
	const namesTimeLog = error.message.includes(TIME_LOG_NOT_BILLABLE);
	return isRefusal && namesTimeLog;
}

export interface BilledLogLike {
	id?: string | null;
	/** The invoice line that bills the log, null when none does; left out by an API that does not record it. */
	invoiceItemId?: string | null;
}

/**
 * Whether the API records the time each invoice line bills: such an API states `invoiceItemId` on every time log, an
 * older one leaves the key out. Not known, null, until a time log was read.
 */
export function recordsBilledTimeOf(logs: ReadonlyArray<BilledLogLike>): boolean | null {
	if (logs.length === 0) {
		return null;
	}
	return logs.every((log) => log.invoiceItemId !== undefined);
}

function lineIdAmong(log: BilledLogLike, lineIds: ReadonlySet<string>): string | null {
	const lineId = log.invoiceItemId;
	if (!lineId) {
		return null;
	}
	if (!lineIds.has(lineId)) {
		return null;
	}
	return lineId;
}

/** The time logs that name each of these lines, by line id: the time each line bills. */
export function timeLogIdsByLineOf(
	logs: ReadonlyArray<BilledLogLike>,
	lineIds: ReadonlySet<string>
): Map<string, string[]> {
	const byLine = new Map<string, string[]>();
	for (const log of logs) {
		const lineId = lineIdAmong(log, lineIds);
		const logId = log.id;
		if (!lineId || !logId) {
			continue;
		}
		const ids = byLine.get(lineId) ?? [];
		ids.push(logId);
		byLine.set(lineId, ids);
	}
	return byLine;
}

/**
 * The time an invoice can bill: the time no live invoice bills, and the time its own saved lines bill, each time log
 * once. The read of the free time leaves out what a live invoice bills, the invoice being edited included.
 */
export function offeredLogsOf<T extends BilledLogLike>(
	freeLogs: ReadonlyArray<T>,
	allLogs: ReadonlyArray<T>,
	lineIds: ReadonlySet<string>
): T[] {
	const offered = [...freeLogs];
	const offeredIds = new Set(freeLogs.map((log) => log.id));
	for (const log of allLogs) {
		const lineId = lineIdAmong(log, lineIds);
		const isOffered = offeredIds.has(log.id);
		if (!lineId || isOffered) {
			continue;
		}
		offered.push(log);
		offeredIds.add(log.id);
	}
	return offered;
}

export interface InvoiceLineIds {
	invoiceId: string;
	lineIds: ReadonlyArray<string>;
}

/**
 * The invoices that record the time they bill: a time log names every one of their lines. An invoice saved before
 * billed time was recorded names none, so the read of the free time still offers the hours it billed.
 */
export function invoicesRecordingTimeOf(
	invoices: ReadonlyArray<InvoiceLineIds>,
	logs: ReadonlyArray<BilledLogLike>
): Set<string> {
	const namedLineIds = new Set<string>();
	for (const log of logs) {
		if (log.invoiceItemId) {
			namedLineIds.add(log.invoiceItemId);
		}
	}
	const recording = new Set<string>();
	for (const invoice of invoices) {
		const namesEveryLine = invoice.lineIds.every((lineId) => namedLineIds.has(lineId));
		if (namesEveryLine) {
			recording.add(invoice.invoiceId);
		}
	}
	return recording;
}

export interface OverlapRecording {
	/** The overlapping invoices that record the time they bill. */
	recordedIds: ReadonlySet<string>;
	isLoading: boolean;
	isError: boolean;
}

export interface OverlapFacts {
	/** The earlier invoices of the client whose stated period shares a day with this one. */
	overlappingIds: ReadonlyArray<string>;
	/** The API records billed time: the time read for the invoice leaves out what a live invoice bills. */
	recordsBilledTime: boolean;
	recording: OverlapRecording;
}

export type OverlapNotice =
	| { kind: 'none' }
	/** Every overlapping invoice records its time: the hours they bill are not offered here. */
	| { kind: 'leftOut'; count: number }
	/** These overlapping invoices may bill hours offered here; `isUnrecorded` when they record none of their time. */
	| { kind: 'mayBillTwice'; count: number; isUnrecorded: boolean };

const NO_OVERLAP_NOTICE: OverlapNotice = { kind: 'none' };

/** Whether the overlapping invoices are being checked for the time they record. */
export function isCheckingOverlaps(facts: OverlapFacts): boolean {
	const hasOverlaps = facts.overlappingIds.length > 0;
	const isChecking = facts.recordsBilledTime && facts.recording.isLoading;
	return hasOverlaps && isChecking;
}

/**
 * The overlapping invoices whose hours may be offered here again: all of them when the API does not record billed
 * time or their record could not be read, else the ones that do not record their time. None while they are checked.
 */
export function overlapsAtRiskOf(facts: OverlapFacts): string[] {
	const isUnknown = !facts.recordsBilledTime || facts.recording.isError;
	if (isUnknown) {
		return [...facts.overlappingIds];
	}
	if (facts.recording.isLoading) {
		return [];
	}
	return facts.overlappingIds.filter((invoiceId) => !facts.recording.recordedIds.has(invoiceId));
}

export function overlapNoticeOf(facts: OverlapFacts): OverlapNotice {
	const count = facts.overlappingIds.length;
	if (count === 0) {
		return NO_OVERLAP_NOTICE;
	}
	const atRisk = overlapsAtRiskOf(facts);
	if (atRisk.length > 0) {
		const isUnrecorded = facts.recordsBilledTime && !facts.recording.isError;
		return { kind: 'mayBillTwice', count: atRisk.length, isUnrecorded };
	}
	if (isCheckingOverlaps(facts)) {
		return NO_OVERLAP_NOTICE;
	}
	return { kind: 'leftOut', count };
}

function shiftedDayKey(dayKey: string, days: number) {
	const day = dateOfDayKey(dayKey);
	if (!day) {
		return dayKey;
	}
	return localDayKeyOf(addDays(day, days));
}

/**
 * The days that hold the time of every one of these periods. They are read a day wider on each side: whoever made an
 * invoice read its period's days in their own time zone.
 */
export function recordingReadDaysOf(periods: ReadonlyArray<InvoicePeriodDays>): InvoicePeriodDays | null {
	if (periods.length === 0) {
		return null;
	}
	let fromDay = periods[0].fromDay;
	let toDay = periods[0].toDay;
	for (const period of periods) {
		if (period.fromDay < fromDay) {
			fromDay = period.fromDay;
		}
		if (period.toDay > toDay) {
			toDay = period.toDay;
		}
	}
	return { fromDay: shiftedDayKey(fromDay, -1), toDay: shiftedDayKey(toDay, 1) };
}

export interface StartedLogLike {
	startedAt?: string | null;
}

/**
 * The logs that start within these bounds, the bounds included, from a read a day wider on each side. A log whose
 * start is not stated stays: the read already chose it.
 */
export function logsStartedWithin<T extends StartedLogLike>(logs: ReadonlyArray<T>, from: Date, to: Date): T[] {
	const fromTime = from.getTime();
	const toTime = to.getTime();
	return logs.filter((log) => {
		const startedTime = Date.parse(log.startedAt ?? '');
		if (Number.isNaN(startedTime)) {
			return true;
		}
		const isAfterStart = startedTime >= fromTime;
		const isBeforeEnd = startedTime <= toTime;
		return isAfterStart && isBeforeEnd;
	});
}
