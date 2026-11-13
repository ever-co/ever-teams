'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	hasUnreadableInterval,
	overlapSummaryOf,
	type OverlapSummary,
	type TimePeriod
} from '@/core/lib/utils/time-log-overlap';
import type { TTimeLogConflict } from '@/core/types/schemas';

type Save = () => void | Promise<void>;

export interface TimeOverlapGuardRequest {
	/** The member the time is saved for: the lookup reads that member's entries. */
	employeeId: string;
	periods: ReadonlyArray<TimePeriod>;
	/** The entry being edited, which its own new interval never removes. */
	ignoredLogId?: string;
	save: Save;
	/**
	 * For a save that may remove no entry (a copied entry): an overlap the lookup finds is handed here instead of the
	 * confirmation, and nothing is saved.
	 */
	refuseOverlap?: (overlap: OverlapSummary) => void;
}

export interface TimeOverlapGuardOptions {
	/** Whether the dialog is open: closing it drops a lookup still running and a save still waiting to be confirmed. */
	isOpen?: boolean;
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

export interface OverlapLookup {
	/** The member the time is saved for: the lookup reads that member's entries. */
	employeeId: string;
	periods: ReadonlyArray<TimePeriod>;
	/** The entry being edited, which its own interval never removes. */
	ignoredLogId?: string;
}

/** What saving the periods would remove, asked to the API. It fails when a lookup does. */
export async function overlapOfPeriods(queryClient: QueryClient, lookup: OverlapLookup): Promise<OverlapSummary> {
	const { employeeId, periods, ignoredLogId } = lookup;
	const lookups = periods.map((period) => conflictsOfPeriod(queryClient, employeeId, period, ignoredLogId));
	const conflictsPerPeriod = await Promise.all(lookups);
	const logs = conflictsPerPeriod.flat();
	// An entry the save would remove but the warning cannot show: an incomplete answer, not an empty one
	const hasUnreadableEntry = logs.some((log) => log.id !== ignoredLogId && hasUnreadableInterval(log));
	if (hasUnreadableEntry) {
		throw new Error('The overlap lookup returned an entry whose time cannot be read');
	}
	return overlapSummaryOf({ periods, logs, ignoredLogId, now: new Date() });
}

/**
 * Stands between a manual time dialog and its save. The API removes, without a word, every other entry of the
 * member that a manual entry overlaps, whole: this asks the API what overlaps first, saves at once when nothing
 * does, and otherwise holds the save until the member confirms what would be removed. A lookup that fails
 * saves nothing. A dialog closed or unmounted while its lookup runs saves nothing either, and opens again
 * without the confirmation.
 */
export function useTimeOverlapGuard({ isOpen = true }: TimeOverlapGuardOptions = {}) {
	const queryClient = useQueryClient();
	const [isChecking, setIsChecking] = useState(false);
	const [hasCheckFailed, setHasCheckFailed] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	// Kept after the confirmation closes, so its closing transition still shows the same figures
	const [summary, setSummary] = useState<OverlapSummary>(NO_OVERLAP);
	const heldSaveRef = useRef<Save | null>(null);
	const isCheckingRef = useRef(false);
	// Raised by every lookup, and when the dialog closes or unmounts: the answer to an earlier lookup is dropped
	const attemptRef = useRef(0);

	// The dialog closed: what it showed of a lookup or a confirmation goes with it
	const [wasOpen, setWasOpen] = useState(isOpen);
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen);
		if (!isOpen) {
			setIsChecking(false);
			setHasCheckFailed(false);
			setIsConfirmOpen(false);
		}
	}
	useEffect(() => {
		if (isOpen) {
			return;
		}
		attemptRef.current += 1;
		heldSaveRef.current = null;
		isCheckingRef.current = false;
	}, [isOpen]);
	useEffect(
		() => () => {
			attemptRef.current += 1;
			heldSaveRef.current = null;
		},
		[]
	);

	const saveAfterCheck = useCallback(
		async ({ employeeId, periods, ignoredLogId, save, refuseOverlap }: TimeOverlapGuardRequest) => {
			if (isCheckingRef.current) {
				return;
			}
			setHasCheckFailed(false);
			// Without a member there is no entry the API could remove time from: it refuses the save itself
			if (!employeeId) {
				await save();
				return;
			}
			attemptRef.current += 1;
			const attempt = attemptRef.current;
			isCheckingRef.current = true;
			setIsChecking(true);
			let overlap: OverlapSummary;
			try {
				overlap = await overlapOfPeriods(queryClient, { employeeId, periods, ignoredLogId });
			} catch (error) {
				if (attempt === attemptRef.current) {
					logErrorInDev('Time overlap check failed', error);
					setHasCheckFailed(true);
				}
				return;
			} finally {
				// A dialog closed meanwhile already reset these, and may have started a lookup of its own since
				if (attempt === attemptRef.current) {
					isCheckingRef.current = false;
					setIsChecking(false);
				}
			}
			// Closed while the lookup ran: the member dismissed this save, so it is neither sent nor asked about
			if (attempt !== attemptRef.current) {
				return;
			}
			const removesNothing = overlap.entries.length === 0;
			if (removesNothing) {
				await save();
				return;
			}
			// Recorded after the opener's own check: refused, never offered to be saved over
			if (refuseOverlap) {
				refuseOverlap(overlap);
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
