'use client';

import { useCallback, useRef, useState } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { overlapSummaryOf, type OverlapSummary, type TimePeriod } from '@/core/lib/utils/time-log-overlap';
import type { TTimeLogConflict } from '@/core/types/schemas';

type Save = () => void | Promise<void>;

export interface TimeOverlapGuardRequest {
	/** The member the time is saved for: the lookup reads that member's entries. */
	employeeId: string;
	periods: ReadonlyArray<TimePeriod>;
	/** The entry being edited, which its own new interval never removes. */
	ignoredLogId?: string;
	save: Save;
}

const NO_OVERLAP: OverlapSummary = { totalSeconds: 0, entries: [] };

function conflictsOfPeriod(
	queryClient: QueryClient,
	employeeId: string,
	period: TimePeriod,
	ignoredLogId: string | undefined
): Promise<TTimeLogConflict[]> {
	const queryKey = queryKeys.timesheet.conflicts({
		tenantId: getTenantIdCookie() || null,
		organizationId: getOrganizationIdCookie() || null,
		employeeId,
		startDate: period.start.toISOString(),
		endDate: period.end.toISOString(),
		ignoreId: ignoredLogId ?? null
	});
	// Never answered from the cache: the timer may have recorded time since the last lookup
	return queryClient.fetchQuery({
		queryKey,
		queryFn: () =>
			timeLogService.getTimeLogConflicts({
				employeeId,
				startDate: period.start,
				endDate: period.end,
				ignoreId: ignoredLogId
			}),
		staleTime: 0,
		retry: false
	});
}

/**
 * Stands between a manual time dialog and its save. The API removes, without a word, the time a manual entry
 * overlaps in the member's other entries: this asks the API what overlaps first, saves at once when nothing
 * does, and otherwise holds the save until the member confirms what would be removed. A lookup that fails
 * saves nothing.
 */
export function useTimeOverlapGuard() {
	const queryClient = useQueryClient();
	const [isChecking, setIsChecking] = useState(false);
	const [hasCheckFailed, setHasCheckFailed] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	// Kept after the confirmation closes, so its closing transition still shows the same figures
	const [summary, setSummary] = useState<OverlapSummary>(NO_OVERLAP);
	const heldSaveRef = useRef<Save | null>(null);
	const isCheckingRef = useRef(false);

	const saveAfterCheck = useCallback(
		async ({ employeeId, periods, ignoredLogId, save }: TimeOverlapGuardRequest) => {
			if (isCheckingRef.current) {
				return;
			}
			setHasCheckFailed(false);
			// Without a member there is no entry the API could remove time from: it refuses the save itself
			if (!employeeId) {
				await save();
				return;
			}
			isCheckingRef.current = true;
			setIsChecking(true);
			let overlap: OverlapSummary;
			try {
				const lookups = periods.map((period) =>
					conflictsOfPeriod(queryClient, employeeId, period, ignoredLogId)
				);
				const conflictsPerPeriod = await Promise.all(lookups);
				const logs = conflictsPerPeriod.flat();
				overlap = overlapSummaryOf({ periods, logs, ignoredLogId, now: new Date() });
			} catch (error) {
				logErrorInDev('Time overlap check failed', error);
				setHasCheckFailed(true);
				return;
			} finally {
				isCheckingRef.current = false;
				setIsChecking(false);
			}
			const removesNothing = overlap.entries.length === 0;
			if (removesNothing) {
				await save();
				return;
			}
			heldSaveRef.current = save;
			setSummary(overlap);
			setIsConfirmOpen(true);
		},
		[queryClient]
	);

	const confirm = useCallback(() => {
		const save = heldSaveRef.current;
		heldSaveRef.current = null;
		setIsConfirmOpen(false);
		if (save) {
			void save();
		}
	}, []);

	const cancel = useCallback(() => {
		heldSaveRef.current = null;
		setIsConfirmOpen(false);
	}, []);

	return { saveAfterCheck, isChecking, hasCheckFailed, isConfirmOpen, summary, confirm, cancel };
}

export type TimeOverlapGuard = ReturnType<typeof useTimeOverlapGuard>;
