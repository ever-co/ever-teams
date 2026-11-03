'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	type ChangedTimeLogKind,
	type TimeLogReportRange,
	timeLogReportService
} from '@/core/services/client/api/timesheets/time-log-report.service';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import type { Period } from '@/core/lib/utils/dashboard-period';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/** Everything both reads send, ids included, so their cache keys name the tenant, organisation, team and members. */
export interface ChangedLogsKeyParams {
	tenantId: string;
	organizationId: string;
	teamId: string;
	employeeIds: string[];
	from: string;
	to: string;
	timeZone: string;
}

export interface ChangedLogsRequest {
	range: TimeLogReportRange;
	period: Period;
	keyParams: ChangedLogsKeyParams;
	/** Tenant, organisation and team: the previous entries stay on screen only while these do not change. */
	scopeKey: string;
	/** The whole request in one string, so the two reads can be told to answer the same question. */
	requestKey: string;
}

export interface ChangedLogsResult {
	request: ChangedLogsRequest;
	logs: ITimeLog[];
}

export interface ChangedLogsPair {
	request: ChangedLogsRequest;
	addedLogs: ITimeLog[];
	editedLogs: ITimeLog[];
}

interface KeptPair {
	added: ChangedLogsResult;
	edited: ChangedLogsResult;
}

async function fetchChangedLogs(kind: ChangedTimeLogKind, request: ChangedLogsRequest): Promise<ChangedLogsResult> {
	const logs = await timeLogReportService.getChangedTimeLogs(request.range, kind);
	return { request, logs };
}

function previousOfSameScope(previous: ChangedLogsResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

function useChangedLogsQuery(
	kind: ChangedTimeLogKind,
	request: ChangedLogsRequest,
	isEnabled: boolean,
	isLive: boolean
) {
	return useQuery({
		queryKey: queryKeys.timesheet.reports.changedLogs({ kind, ...request.keyParams }),
		queryFn: () => fetchChangedLogs(kind, request),
		enabled: isEnabled,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});
}

function alignedResultsOf(
	added: ChangedLogsResult | undefined,
	edited: ChangedLogsResult | undefined
): KeptPair | null {
	if (!added || !edited) {
		return null;
	}
	const isSameRequest = added.request.requestKey === edited.request.requestKey;
	if (!isSameRequest) {
		return null;
	}
	return { added, edited };
}

function pairOfResults(
	added: ChangedLogsResult | undefined,
	edited: ChangedLogsResult | undefined
): ChangedLogsPair | null {
	if (!added || !edited) {
		return null;
	}
	return { request: added.request, addedLogs: added.logs, editedLogs: edited.logs };
}

function keptOfScope(kept: KeptPair | null, scopeKey: string) {
	const isSameScope = kept?.added.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return null;
	}
	return kept;
}

function shownResultsOf(aligned: KeptPair | null, kept: KeptPair | null, scopeKey: string) {
	if (aligned) {
		return aligned;
	}
	return keptOfScope(kept, scopeKey);
}

/**
 * The two reads answer separately: while one has moved to a new period and the other has not, the page keeps the
 * last pair that answered the same request, so added and edited time of two different periods are never mixed.
 */
function useAlignedPair(
	added: ChangedLogsResult | undefined,
	edited: ChangedLogsResult | undefined,
	scopeKey: string
): ChangedLogsPair | null {
	const [kept, setKept] = useState<KeptPair | null>(null);
	const aligned = alignedResultsOf(added, edited);
	const isAnotherPair = kept?.added !== added || kept?.edited !== edited;
	if (aligned && isAnotherPair) {
		setKept(aligned);
	}
	const shown = shownResultsOf(aligned, kept, scopeKey);
	const shownAdded = shown?.added;
	const shownEdited = shown?.edited;
	return useMemo(() => pairOfResults(shownAdded, shownEdited), [shownAdded, shownEdited]);
}

export function useChangedTimeLogs(request: ChangedLogsRequest, isEnabled: boolean) {
	const startKey = localDayKeyOf(request.period.from);
	const endKey = localDayKeyOf(request.period.to);
	const isLive = isLiveDayRange(startKey, endKey);
	const addedQuery = useChangedLogsQuery('added', request, isEnabled, isLive);
	const editedQuery = useChangedLogsQuery('edited', request, isEnabled, isLive);
	const pair = useAlignedPair(addedQuery.data, editedQuery.data, request.scopeKey);

	const hasPair = pair !== null;
	const isAnyError = addedQuery.isError || editedQuery.isError;
	const isAnyFetching = addedQuery.isFetching || editedQuery.isFetching;
	const isShowingCurrent = pair?.request.requestKey === request.requestKey;
	const isBehindRequest = isAnyFetching || !isShowingCurrent;
	const isUpdating = hasPair && isBehindRequest;
	const showsError = isAnyError && !hasPair;

	const refetchAdded = addedQuery.refetch;
	const refetchEdited = editedQuery.refetch;
	const refetch = useCallback(() => {
		void refetchAdded();
		void refetchEdited();
	}, [refetchAdded, refetchEdited]);

	return { pair, isUpdating, showsError, refetch };
}
