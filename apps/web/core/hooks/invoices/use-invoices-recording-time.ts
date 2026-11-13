'use client';

import { useMemo } from 'react';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { queryKeys } from '@/core/query/keys';
import { invoiceService } from '@/core/services/client/api/organizations/invoice.service';
import {
	timeLogReportService,
	type TimeLogReportRange
} from '@/core/services/client/api/timesheets/time-log-report.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import {
	invoicesRecordingTimeOf,
	recordingReadDaysOf,
	type InvoiceLineIds,
	type OverlapRecording
} from '@/core/lib/utils/invoice-billed-time';
import { periodOfDays } from '@/core/lib/utils/invoice-edit';
import { invoicePeriodOfTerms, type InvoicePeriodDays } from '@/core/lib/utils/invoices';
import type { TBillableTimeLog, TInvoice, TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

const NO_LOGS: TBillableTimeLog[] = [];

const NO_RELATIONS: ReadonlyArray<string> = [];

const NO_IDS: ReadonlySet<string> = new Set();

interface InvoiceLinesRead {
	invoices: InvoiceLineIds[];
	/** The projects of their lines, each once, in order. */
	projectIds: string[];
	/** Every invoice was read. */
	isComplete: boolean;
	isLoading: boolean;
	isError: boolean;
}

function lineIdsOfInvoice(invoice: TSavedInvoice): InvoiceLineIds {
	const items = invoice.invoiceItems ?? [];
	return { invoiceId: invoice.id, lineIds: items.map((item) => item.id) };
}

function projectIdsOfInvoices(invoices: ReadonlyArray<TSavedInvoice>) {
	const projectIds = new Set<string>();
	for (const invoice of invoices) {
		for (const item of invoice.invoiceItems ?? []) {
			if (item.projectId) {
				projectIds.add(item.projectId);
			}
		}
	}
	return [...projectIds].sort((first, second) => first.localeCompare(second));
}

function invoiceLinesReadOf(results: ReadonlyArray<UseQueryResult<TSavedInvoice>>): InvoiceLinesRead {
	const invoices: TSavedInvoice[] = [];
	for (const result of results) {
		if (result.data) {
			invoices.push(result.data);
		}
	}
	return {
		invoices: invoices.map(lineIdsOfInvoice),
		projectIds: projectIdsOfInvoices(invoices),
		isComplete: invoices.length === results.length,
		isLoading: results.some((result) => result.isLoading),
		isError: results.some((result) => result.isError)
	};
}

function statedPeriodsOf(invoices: ReadonlyArray<TInvoice>) {
	const periods: InvoicePeriodDays[] = [];
	for (const invoice of invoices) {
		const period = invoicePeriodOfTerms(invoice.terms);
		if (period) {
			periods.push(period);
		}
	}
	return periods;
}

function instantKeyOf(date: Date | undefined) {
	if (!date) {
		return null;
	}
	return date.toISOString();
}

function readRangeOf(days: InvoicePeriodDays | null, timeZone: string, projectIds: string[]) {
	if (!days) {
		return null;
	}
	const period = periodOfDays(days);
	if (!period) {
		return null;
	}
	const range: TimeLogReportRange = { from: startOfDay(period.from), to: endOfDay(period.to), timeZone, projectIds };
	return range;
}

/**
 * Which of these earlier invoices record the time they bill, read from their lines and from all of the time of their
 * periods. Only an API that records billed time can tell: nothing is read for another one.
 */
export function useInvoicesRecordingTime(invoices: ReadonlyArray<TInvoice>, enabled: boolean): OverlapRecording {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);
	const scope = useMemo(() => ({ tenantId, organizationId }), [organizationId, tenantId]);
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasInvoices = invoices.length > 0;
	const readsLines = enabled && hasScope && hasInvoices;

	// Read again whenever the screen opens: an invoice edited elsewhere may have released its time since
	const linesRead = useQueries({
		queries: invoices.map((invoice) => ({
			queryKey: queryKeys.invoices.detail(tenantId, organizationId, invoice.id),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				invoiceService.getInvoice(invoice.id, { signal, tenantId }),
			enabled: readsLines,
			staleTime: 0
		})),
		combine: invoiceLinesReadOf
	});

	const days = useMemo(() => recordingReadDaysOf(statedPeriodsOf(invoices)), [invoices]);
	const projectIds = linesRead.projectIds;
	const range = useMemo(() => readRangeOf(days, timeZone, projectIds), [days, projectIds, timeZone]);
	const hasLineProjects = projectIds.length > 0;
	const canReadTime = linesRead.isComplete && hasLineProjects;
	const readsTime = readsLines && canReadTime && range !== null;

	const timeQuery = useQuery({
		queryKey: queryKeys.timesheet.reports.billableLogs({
			tenantId,
			organizationId,
			projectIds,
			from: instantKeyOf(range?.from),
			to: instantKeyOf(range?.to),
			timeZone,
			namesTasks: false,
			notInvoiced: false
		}),
		queryFn: () =>
			timeLogReportService.getBillableTimeLogs(range as TimeLogReportRange, NO_RELATIONS, {
				notInvoiced: false,
				scope
			}),
		enabled: readsTime,
		staleTime: 0
	});

	const logs = timeQuery.data ?? NO_LOGS;
	const isComplete = linesRead.isComplete;
	const lineInvoices = linesRead.invoices;
	const recordedIds = useMemo(() => {
		if (!readsLines || !isComplete) {
			return NO_IDS;
		}
		return invoicesRecordingTimeOf(lineInvoices, logs);
	}, [isComplete, lineInvoices, logs, readsLines]);

	const isReading = linesRead.isLoading || timeQuery.isLoading;
	const hasFailed = linesRead.isError || timeQuery.isError;
	const isLoading = readsLines && isReading;
	const isError = readsLines && hasFailed;
	return { recordedIds, isLoading, isError };
}
