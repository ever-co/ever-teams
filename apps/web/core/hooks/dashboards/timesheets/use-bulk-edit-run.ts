'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { overlapOfPeriods } from '@/core/hooks/timesheet/use-time-overlap-guard';
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

/** How far the run going on, or the last one, went. */
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

async function outcomeOfSave(queryClient: QueryClient, save: BulkEditSave): Promise<BulkEditOutcome> {
	const logId = save.log.id;
	const payload = bulkEditPayloadOf(save);
	if (!payload) {
		return { logId, status: 'failed' };
	}
	const removesTime = await removesRecordedTime(queryClient, payload);
	if (removesTime === null) {
		return { logId, status: 'checkFailed' };
	}
	if (removesTime) {
		return { logId, status: 'overlap' };
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
			setProgress({ done: 0, total });
			try {
				for (const save of saves) {
					// A page left in the middle of a run sends nothing more
					if (!isMountedRef.current) {
						break;
					}
					// One at a time: the API's overlap cleanup is not safe under concurrent saves
					const outcome = await outcomeOfSave(queryClient, save);
					outcomes.push(outcome);
					setProgress({ done: outcomes.length, total });
				}
			} finally {
				const hasSavedEntry = outcomes.some((outcome) => outcome.status === 'updated');
				if (hasSavedEntry) {
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
