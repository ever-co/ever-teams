'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useStore } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	logDurationSeconds,
	startOfLog,
	type TimesheetFormatters,
	timeRangeTextOf,
	timesheetFormattersOf
} from '@/core/lib/utils/dashboards/timesheets';
import {
	type CheckTimeEntrySave,
	copiedFieldsOf,
	copySecondsOf,
	duplicateIntervalOf,
	overlappedLogOf,
	type TimeEntryCopy,
	type TimeWindow,
	unplacedIntervalOf,
	withRunningLog
} from '@/core/lib/utils/time-entry-reuse';
import type { OverlappedEntry, OverlapSummary } from '@/core/lib/utils/time-log-overlap';
import { timerStatusState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

import { dayAndEveScopeOf, memberTimeLogsQueryOf } from './member-time-logs-query';

function runningLogOf(status: ITimerStatus | null): ITimeLog | null {
	if (!status?.running) {
		return null;
	}
	return status.lastLog ?? null;
}

/** When the entry ran, for the refusal. A running entry runs to now, whatever end its last heartbeat wrote. */
/** When an entry the save's own overlap lookup found ran, for the refusal: a running one runs to now. */
function overlappedRangeTextOf(entry: OverlappedEntry, formatters: TimesheetFormatters, runningLabel: string) {
	const startText = formatters.time(entry.start);
	let endText = runningLabel;
	if (!entry.isRunning) {
		endText = formatters.time(entry.end);
	}
	return `${startText} – ${endText}`;
}

function ranTextOf(log: ITimeLog, formatters: TimesheetFormatters, runningLabel: string) {
	if (!log.isRunning) {
		return timeRangeTextOf(log, formatters, runningLabel);
	}
	const withoutEnd = { ...log, stoppedAt: undefined };
	return timeRangeTextOf(withoutEnd, formatters, runningLabel);
}

export interface TimeEntryDuplicateSource {
	log: ITimeLog;
	/** The time to copy when the row adds several entries up; the entry's own time otherwise. */
	seconds?: number;
}

export interface TimeEntryDuplicateDraft extends TimeEntryCopy {
	/** Changes with every Duplicate, so the dialog opens on the new copy and never on the fields of the last one. */
	id: number;
}

/**
 * Duplicate for the time entries of a page: the copy an Add time dialog opens with, and the check that dialog asks
 * before it saves. The copy goes today, where the member it is for has no entry; nothing is saved here. The check
 * reads the member's entries again, so a copy moved over an entry is refused, and so is one whose day cannot be read.
 * The viewer's own running timer counts as an entry from its first second.
 *
 * `stepMinutes` is the step of the dialog's time fields: the copy lasts and starts on whole steps.
 */
export function useTimeEntryDuplicate({ stepMinutes }: Readonly<{ stepMinutes: number }>) {
	const t = useTranslations();
	const locale = useLocale();
	const store = useStore();
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const [draft, setDraft] = useState<TimeEntryDuplicateDraft | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const latestRequestRef = useRef(0);

	const tenantId = user?.tenantId;
	const organizationId = user?.employee?.organizationId;
	const ownEmployeeId = user?.employee?.id;
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);

	const readMemberLogs = useCallback(
		async (employeeId: string, day: Date): Promise<ITimeLog[]> => {
			if (!employeeId) {
				throw new Error('The entries of a day are read for one employee');
			}
			const scope = dayAndEveScopeOf({ tenantId, organizationId }, employeeId, day);
			const logs = await queryClient.fetchQuery({ ...memberTimeLogsQueryOf(scope), staleTime: 0 });
			const isOwnTime = employeeId === ownEmployeeId;
			if (!isOwnTime) {
				return logs;
			}
			const timerStatus = store.get(timerStatusState);
			const runningLog = runningLogOf(timerStatus);
			return withRunningLog(logs, runningLog);
		},
		[organizationId, ownEmployeeId, queryClient, store, tenantId]
	);

	const open = useCallback(
		async (source: TimeEntryDuplicateSource) => {
			const requestId = latestRequestRef.current + 1;
			latestRequestRef.current = requestId;

			const { log } = source;
			const fields = copiedFieldsOf(log);
			const now = new Date();
			const sourceSeconds = source.seconds ?? logDurationSeconds(log);
			const seconds = copySecondsOf(sourceSeconds, stepMinutes);
			const sourceStart = startOfLog(log);

			let freeInterval: TimeWindow | null = null;
			try {
				const memberLogs = await readMemberLogs(fields.employeeId, now);
				freeInterval = duplicateIntervalOf({ seconds, sourceStart, memberLogs, now, stepMinutes });
			} catch (error) {
				// The copy still opens, at the entry's own time of day: the check before the save reads the day again
				logErrorInDev('[Duplicate] The entries of today could not be read:', error);
			}

			const isLatestRequest = latestRequestRef.current === requestId;
			if (!isLatestRequest) {
				return;
			}
			const interval = freeInterval ?? unplacedIntervalOf(sourceStart, seconds, now, stepMinutes);
			setDraft({ id: requestId, ...fields, start: interval.start, end: interval.end });
			setIsOpen(true);
		},
		[readMemberLogs, stepMinutes]
	);

	const close = useCallback(() => setIsOpen(false), []);

	const checkBeforeSave = useCallback<CheckTimeEntrySave>(
		async ({ employeeId, periods }) => {
			try {
				for (const period of periods) {
					const memberLogs = await readMemberLogs(employeeId, period.start);
					const overlapped = overlappedLogOf(period, memberLogs, new Date());
					if (overlapped) {
						const range = ranTextOf(overlapped, formatters, t('dashboard.timesheets.RUNNING'));
						return t('timeEntryActions.duplicate.OVERLAPS', { range });
					}
				}
				return null;
			} catch (error) {
				logErrorInDev('[Duplicate] The entries of the day could not be checked:', error);
				return t('timeEntryActions.duplicate.CHECK_FAILED');
			}
		},
		[formatters, readMemberLogs, t]
	);

	/**
	 * The refusal of a copy that the dialog's overlap lookup, run after `checkBeforeSave`, finds over an entry recorded
	 * meanwhile: refused like one the check found, never offered to be saved over that entry.
	 */
	const refusalOfOverlap = useCallback(
		(overlap: OverlapSummary) => {
			const firstEntry = overlap.entries[0];
			if (!firstEntry) {
				return t('timeEntryActions.duplicate.CHECK_FAILED');
			}
			const range = overlappedRangeTextOf(firstEntry, formatters, t('dashboard.timesheets.RUNNING'));
			return t('timeEntryActions.duplicate.OVERLAPS', { range });
		},
		[formatters, t]
	);

	return { draft, isOpen, open, close, checkBeforeSave, refusalOfOverlap };
}

export type TimeEntryDuplicateState = ReturnType<typeof useTimeEntryDuplicate>;
