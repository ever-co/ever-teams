'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay } from 'date-fns';
import { queryKeys } from '@/core/query/keys';
import {
	changesByEntryOf,
	type DeletedEntry,
	deletedEntryOf,
	historyChangesOf,
	type TimeLogHistoryChange
} from '@/core/lib/utils/time-log-history';
import { timeLogHistoryService } from '@/core/services/client/api/timesheets/time-log-history.service';

/** The changes of a period's entries: by entry, and the entries deleted, once read; or why they are not shown. */
export type PeriodHistoryState =
	| { status: 'loading' }
	| { status: 'unsupported' }
	| { status: 'error' }
	| { status: 'ready'; byEntry: ReadonlyMap<string, TimeLogHistoryChange[]>; deleted: DeletedEntry[] };

export type PeriodHistoryStatus = PeriodHistoryState['status'];

export interface PeriodHistoryRequest {
	tenantId: string;
	organizationId: string;
	employeeIds: ReadonlyArray<string>;
	from: Date;
	to: Date;
}

interface PeriodHistoryResult {
	isSupported: boolean;
	changes: TimeLogHistoryChange[];
}

const HISTORY_STALE_MS = 30_000;

/** An entry of the period is often edited after it ends (a week checked on Monday): the read runs up to today. */
function readUntilOf(periodEnd: Date) {
	const endOfToday = endOfDay(new Date());
	if (periodEnd.getTime() > endOfToday.getTime()) {
		return periodEnd;
	}
	return endOfToday;
}

async function readPeriodHistory(request: PeriodHistoryRequest, until: Date): Promise<PeriodHistoryResult> {
	const read = await timeLogHistoryService.getPeriodHistory({
		from: request.from,
		to: until,
		employeeIds: request.employeeIds
	});
	if (read.kind === 'unsupported') {
		return { isSupported: false, changes: [] };
	}
	return { isSupported: true, changes: historyChangesOf(read.value) };
}

function isWithin(date: Date | null, from: Date, to: Date) {
	if (!date) {
		return false;
	}
	const time = date.getTime();
	return time >= from.getTime() && time <= to.getTime();
}

/** The entries whose last change deleted them and whose time was in the period. */
function deletedOfPeriod(byEntry: ReadonlyMap<string, TimeLogHistoryChange[]>, from: Date, to: Date) {
	const deleted: DeletedEntry[] = [];
	for (const changes of byEntry.values()) {
		const [latest] = changes;
		const entry = deletedEntryOf(latest);
		const isInPeriod = isWithin(entry?.startedAt ?? null, from, to);
		if (entry && isInPeriod) {
			deleted.push(entry);
		}
	}
	return deleted;
}

/** The history of the report's entries, read once for the whole period and its members. */
export function useTimeLogPeriodHistory(
	request: PeriodHistoryRequest,
	isEnabled: boolean
): PeriodHistoryState & {
	refetch: () => void;
} {
	// Read again on each render: a report left open overnight reads up to the new day.
	const until = readUntilOf(request.to);
	const keyParams = {
		tenantId: request.tenantId,
		organizationId: request.organizationId,
		employeeIds: [...request.employeeIds],
		from: request.from.toISOString(),
		until: until.toISOString()
	};
	const query = useQuery({
		queryKey: queryKeys.timesheet.history.period(keyParams),
		queryFn: () => readPeriodHistory(request, until),
		enabled: isEnabled,
		staleTime: HISTORY_STALE_MS,
		retry: false
	});
	const data = query.data;
	const from = request.from;
	const to = request.to;
	const ready = useMemo(() => {
		if (!data?.isSupported) {
			return null;
		}
		const byEntry = changesByEntryOf(data.changes);
		return { byEntry, deleted: deletedOfPeriod(byEntry, from, to) };
	}, [data, from, to]);
	const refetch = () => {
		void query.refetch();
	};
	if (query.isError) {
		return { status: 'error', refetch };
	}
	if (!data) {
		return { status: 'loading', refetch };
	}
	if (!ready) {
		return { status: 'unsupported', refetch };
	}
	return { status: 'ready', ...ready, refetch };
}
