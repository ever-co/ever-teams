'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { overlapOfPeriods } from '@/core/hooks/timesheet/use-time-overlap-guard';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { writeErrorKeyOf } from '@/core/lib/utils/dashboards/time-write-error';
import {
	type BulkEditOutcome,
	type BulkEditPayload,
	bulkEditPayloadOf,
	type BulkEditSave
} from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';

export interface BulkEditProgress {
	/** The entries gone through so far, saved or not. */
	done: number;
	total: number;
}

/** Whether saving the entry would make the API remove other recorded time; null when the API could not say. */
async function removesRecordedTime(queryClient: QueryClient, payload: BulkEditPayload): Promise<boolean | null> {
	try {
		const overlap = await overlapOfPeriods(queryClient, {
			employeeId: payload.employeeId,
			periods: [{ start: payload.startedAt, end: payload.stoppedAt }],
			ignoredLogId: payload.timeLogId
		});
		return overlap.entries.length > 0;
	} catch (error) {
		logErrorInDev('Time overlap check failed', error);
		return null;
	}
}

interface Workspace {
	organizationId: string;
	tenantId: string;
}

function currentWorkspace(): Workspace {
	return { organizationId: getOrganizationIdCookie(), tenantId: getTenantIdCookie() };
}

/**
 * Whether the requests now go to the workspace the entry belongs to. They take the organization and tenant from the
 * cookies, which another tab may have switched since the page read the entry; its own ids win over the run's start.
 */
function isInCurrentWorkspace(save: BulkEditSave, atStart: Workspace): boolean {
	const now = currentWorkspace();
	const organizationId = save.log.organizationId || atStart.organizationId;
	const tenantId = save.log.tenantId || atStart.tenantId;
	return now.organizationId === organizationId && now.tenantId === tenantId;
}

/** A save that ended in an error may still have been applied: a request that timed out after the update, for one. */
function mayHaveChangedEntry(outcome: BulkEditOutcome): boolean {
	const isUpdated = outcome.status === 'updated';
	const isFailed = outcome.status === 'failed';
	return isUpdated || isFailed;
}

/** Null when the page was left during the overlap lookup: the entry is never sent. */
async function outcomeOfSave(
	queryClient: QueryClient,
	save: BulkEditSave,
	isPageOpen: () => boolean,
	workspaceAtStart: Workspace
): Promise<BulkEditOutcome | null> {
	const logId = save.log.id;
	const payload = bulkEditPayloadOf(save);
	// An entry of another workspace than the one requests now go to is neither looked up nor written
	if (!payload || !isInCurrentWorkspace(save, workspaceAtStart)) {
		return { logId, status: 'failed' };
	}
	const removesTime = await removesRecordedTime(queryClient, payload);
	if (removesTime === null) {
		return { logId, status: 'checkFailed' };
	}
	if (removesTime) {
		return { logId, status: 'overlap' };
	}
	if (!isPageOpen()) {
		return null;
	}
	if (!isInCurrentWorkspace(save, workspaceAtStart)) {
		return { logId, status: 'failed' };
	}
	try {
		await timeLogService.updateTimeLog(payload);
	} catch (error) {
		return { logId, status: 'failed', detailKey: writeErrorKeyOf(error) };
	}
	return { logId, status: 'updated' };
}

/**
 * Saves the entries of a bulk edit. The API removes whatever a saved entry overlaps, so each entry is asked about
 * first and is saved only when nothing would go. A refused entry does not stop the next ones, and the views are
 * read again once at the end.
 */
export function useBulkEditRun() {
	const queryClient = useQueryClient();
	const [progress, setProgress] = useState<BulkEditProgress | null>(null);
	const isRunningRef = useRef(false);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const refreshViews = useCallback(async () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
		await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
	}, [queryClient]);

	/** The outcome of each entry in order, or null when a run is already going. */
	const run = useCallback(
		async (saves: ReadonlyArray<BulkEditSave>): Promise<BulkEditOutcome[] | null> => {
			if (isRunningRef.current) {
				return null;
			}
			isRunningRef.current = true;
			const total = saves.length;
			const outcomes: BulkEditOutcome[] = [];
			const isPageOpen = () => isMountedRef.current;
			const workspaceAtStart = currentWorkspace();
			setProgress({ done: 0, total });
			try {
				for (const save of saves) {
					// A page left in the middle of a run sends nothing more
					if (!isPageOpen()) {
						break;
					}
					// One at a time: the API's overlap cleanup is not safe under concurrent saves
					const outcome = await outcomeOfSave(queryClient, save, isPageOpen, workspaceAtStart);
					if (!outcome) {
						break;
					}
					outcomes.push(outcome);
					setProgress({ done: outcomes.length, total });
				}
			} finally {
				const hasChangedEntry = outcomes.some(mayHaveChangedEntry);
				if (hasChangedEntry) {
					await refreshViews().catch(() => undefined);
				}
				isRunningRef.current = false;
			}
			return outcomes;
		},
		[queryClient, refreshViews]
	);

	return { run, progress };
}
