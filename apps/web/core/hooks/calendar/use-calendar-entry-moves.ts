'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { writeErrorKeyOf } from '@/core/lib/utils/dashboards/time-write-error';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import {
	type CreatableSpot,
	creatableSpotAt,
	type DragRefusal,
	dragRefusalOf,
	type DragRules
} from '@/core/lib/utils/calendar-drag';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import { approvedDayKeysOf, isReducibleLog, type TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { memberIdOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { hasUnreadableInterval, overlapSummaryOf } from '@/core/lib/utils/time-log-overlap';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { CalendarPageState } from './use-calendar-page';

const MODIFY_TIME_PERMISSION = 'ALLOW_MODIFY_TIME';

const REFUSAL_MESSAGE_KEYS: Record<Exclude<DragRefusal, 'none'>, DottedLanguageObjectStringPaths> = {
	overlap: 'dashboard.calendar.DRAG.OVERLAP',
	future: 'dashboard.calendar.DRAG.FUTURE',
	approved: 'dashboard.calendar.DRAG.APPROVED'
};

/**
 * Whether the API holds another entry of the member on the new place. The grid only knows the entries of its last
 * read: one saved since, from another tab or by a manager, would be removed whole by the API without a word.
 */
async function isTakenOnServer(log: ITimeLog, next: TimeWindow): Promise<boolean> {
	const employeeId = memberIdOfLog(log);
	if (!employeeId) {
		return false;
	}
	const conflicts = await timeLogService.getTimeLogConflicts({
		employeeId,
		startDate: next.start,
		endDate: next.end,
		ignoreId: log.id
	});
	const others = conflicts.filter((conflict) => conflict.id !== log.id);
	const hasUnreadableEntry = others.some(hasUnreadableInterval);
	if (hasUnreadableEntry) {
		return true;
	}
	const period = { start: next.start, end: next.end };
	const overlap = overlapSummaryOf({ periods: [period], logs: others, ignoredLogId: log.id, now: new Date() });
	return overlap.entries.length > 0;
}

export interface CalendarEntryMoves {
	canDragEntry: (entry: CalendarEntry) => boolean;
	creatableSpot: (time: Date) => CreatableSpot;
	announceCreateRefusal: (refusal: DragRefusal) => void;
	moveEntry: (entry: CalendarEntry, next: TimeWindow) => void;
}

/**
 * What a drag in the Calendar grids may do and how it is saved. Only time added by hand and stopped moves, for
 * whoever may edit it. The new place follows the rules of the editable week sheet: the API deletes whatever a
 * manual entry overlaps, so a place on another entry of the member is refused here, first against the entries the
 * grid shows, then against what the API holds, before the update is sent. Moves are saved one at a time: a second
 * one could land on the place the first has not left yet on the API. The entry is drawn at its new place while it
 * is saved and comes back when the save fails.
 */
export function useCalendarEntryMoves(page: CalendarPageState, canEditLog: (log: ITimeLog) => boolean) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const organization = useAtomValue(currentOrganizationState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const { memberLogs, movedWindows, showEntryAt, showEntryAsSaved, isLoading, isShowingPreviousChoice } = page;

	const isSavingRef = useRef(false);

	const hasModifyPermission = myPermissions.includes(MODIFY_TIME_PERMISSION);
	const allowsModifyTime = organization?.allowModifyTime !== false;
	const allowsFutureDates = organization?.futureDateAllowed === true;
	const isShowingLoadedDays = !isLoading && !isShowingPreviousChoice;
	const mayModifyTime = hasModifyPermission && allowsModifyTime && isShowingLoadedDays;

	const approvedDayKeys = useMemo(() => approvedDayKeysOf(memberLogs), [memberLogs]);

	const rulesAt = useCallback(
		(now: Date): DragRules => ({ memberLogs, approvedDayKeys, allowsFutureDates, now }),
		[allowsFutureDates, approvedDayKeys, memberLogs]
	);

	const canDragEntry = useCallback(
		(entry: CalendarEntry) => {
			if (!mayModifyTime) {
				return false;
			}
			const isSavingAMove = movedWindows.size > 0;
			if (isSavingAMove) {
				return false;
			}
			if (!isReducibleLog(entry.log)) {
				return false;
			}
			return canEditLog(entry.log);
		},
		[canEditLog, mayModifyTime, movedWindows]
	);

	const creatableSpot = useCallback(
		(time: Date) => {
			const rules = rulesAt(new Date());
			return creatableSpotAt(time, rules);
		},
		[rulesAt]
	);

	const announceRefusal = useCallback(
		(titleKey: DottedLanguageObjectStringPaths, refusal: DragRefusal) => {
			if (refusal === 'none') {
				return;
			}
			const messageKey = REFUSAL_MESSAGE_KEYS[refusal];
			toast.error(t(titleKey), { description: t(messageKey) });
		},
		[t]
	);

	const announceCreateRefusal = useCallback(
		(refusal: DragRefusal) => announceRefusal('dashboard.calendar.DRAG.CREATE_REFUSED_TITLE', refusal),
		[announceRefusal]
	);

	const saveMove = useCallback(
		async (log: ITimeLog, next: TimeWindow) => {
			isSavingRef.current = true;
			showEntryAt(log.id, next);
			try {
				const isTaken = await isTakenOnServer(log, next);
				if (isTaken) {
					announceRefusal('dashboard.calendar.DRAG.REFUSED_TITLE', 'overlap');
					// The grid did not show that entry: its days are read again
					await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
					return;
				}
				await timeLogService.updateTimeLog({
					timeLogId: log.id,
					startedAt: next.start,
					stoppedAt: next.end,
					employeeId: memberIdOfLog(log) ?? undefined
				});
				void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
				void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			} catch (error) {
				const reasonKey = writeErrorKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('dashboard.calendar.DRAG.SAVE_FAILED'), { description: t(reasonKey) });
				// A failed request may still have reached the API (a timeout after the update was applied): the days are
				// read again, so the grid shows where the entry really is, not where the last read left it
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			} finally {
				isSavingRef.current = false;
				showEntryAsSaved(log.id);
			}
		},
		[announceRefusal, queryClient, showEntryAsSaved, showEntryAt, t]
	);

	const moveEntry = useCallback(
		(entry: CalendarEntry, next: TimeWindow) => {
			if (isSavingRef.current) {
				return;
			}
			const previous: TimeWindow = { start: entry.start, end: entry.end };
			const rules = rulesAt(new Date());
			const refusal = dragRefusalOf(entry.log.id, previous, next, rules);
			if (refusal !== 'none') {
				announceRefusal('dashboard.calendar.DRAG.REFUSED_TITLE', refusal);
				return;
			}
			void saveMove(entry.log, next);
		},
		[announceRefusal, rulesAt, saveMove]
	);

	return useMemo<CalendarEntryMoves>(
		() => ({ canDragEntry, creatableSpot, announceCreateRefusal, moveEntry }),
		[announceCreateRefusal, canDragEntry, creatableSpot, moveEntry]
	);
}
