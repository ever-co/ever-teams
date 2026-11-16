'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	timeLogReportService,
	type TimeLogReportRange
} from '@/core/services/client/api/timesheets/time-log-report.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { isRatesReadUnavailable } from '@/core/lib/utils/rates';
import type { TBillableTimeLog } from '@/core/types/schemas/organization/invoice.schema';
import { retriesRatesRead } from './use-project-client-rates';

const NO_LOGS: TBillableTimeLog[] = [];

const NO_RELATIONS: ReadonlyArray<string> = [];

export interface KeptClientRates {
	/** The billable entries of the range, by id, each with the rates it keeps when the API answers them. */
	keptById: ReadonlyMap<string, TBillableTimeLog>;
	isLoading: boolean;
	hasFailed: boolean;
	refetch: () => void;
}

/**
 * The client rates the billable entries of a range keep, read for a page that prices time where it shows it (My week),
 * so it bills each hour at the price it was worked at, as a draft invoice of the same time does. An API that does not
 * answer them, or refuses them (403), leaves every entry at today's rates, as before.
 */
export function useKeptClientRates(range: TimeLogReportRange | null, isEnabled: boolean): KeptClientRates {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const scope = useMemo(() => ({ tenantId, organizationId }), [organizationId, tenantId]);
	// Time without a project keeps its billing rate too: the caller does not narrow the read to projects
	const reads = isEnabled && range !== null;
	const query = useQuery({
		queryKey: queryKeys.timesheet.reports.billableLogs({
			tenantId,
			organizationId,
			from: range?.from.toISOString(),
			to: range?.to.toISOString(),
			timeZone: range?.timeZone,
			employeeIds: range?.employeeIds,
			projectIds: range?.projectIds,
			teamIds: range?.teamIds,
			notInvoiced: false,
			withClientRates: true,
			purpose: 'kept-client-rates'
		}),
		queryFn: () =>
			timeLogReportService.getBillableTimeLogs(range as TimeLogReportRange, NO_RELATIONS, {
				notInvoiced: false,
				scope,
				withClientRates: true
			}),
		enabled: reads,
		retry: retriesRatesRead
	});

	// Rates read before the API refused them are not used: they may no longer apply
	const isUnavailable = isRatesReadUnavailable(query.error);
	let logs = query.data ?? NO_LOGS;
	if (isUnavailable) {
		logs = NO_LOGS;
	}
	const keptById = useMemo(() => new Map(logs.map((log) => [log.id, log])), [logs]);
	const { refetch: refetchQuery } = query;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);
	// A first read paused while offline has not answered yet: it waits, it does not price at today's rates meanwhile
	const isPausedFirstRead = query.isPending && query.fetchStatus === 'paused';
	return {
		keptById,
		isLoading: reads && (query.isLoading || isPausedFirstRead),
		hasFailed: reads && query.isError && !isUnavailable,
		refetch
	};
}
