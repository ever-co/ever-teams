'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { differenceInCalendarDays, subWeeks } from 'date-fns';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	type CellLock,
	type CopyCellPlan,
	copyPlanOf,
	type PreviousWeekRow,
	sheetCellKeyOf,
	totalSecondsOfPlans
} from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import {
	memberIdOfLog,
	type SheetDay,
	type SheetRow,
	type SheetRowIdentity,
	weekSheetOf
} from '@/core/lib/utils/dashboards/timesheets';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { type TimesheetPageLogsScope, timesheetPageLogsRequestOf } from './use-timesheet-page-logs';
import type { SheetCellWrites } from './use-sheet-cell-writes';

const DAYS_IN_A_WEEK = 7;

export interface PendingCopy {
	plans: CopyCellPlan[];
	totalSeconds: number;
	/** Cells of last week that land on a closed day of this one (future, approved, running). */
	lockedCount: number;
}

export interface CopyPreviousWeekInput {
	period: Period;
	logsScope: Omit<TimesheetPageLogsScope, 'isEnabled' | 'employeeIds'>;
	memberId: string | null;
	days: ReadonlyArray<SheetDay>;
	rows: ReadonlyArray<SheetRow>;
	dayLockOf: (day: SheetDay) => CellLock;
	addRows: (identities: ReadonlyArray<SheetRowIdentity>) => void;
	writes: SheetCellWrites;
}

function isOneWeek(period: Period) {
	const daysAfterFirst = differenceInCalendarDays(period.to, period.from);
	const length = daysAfterFirst + 1;
	return length === DAYS_IN_A_WEEK;
}

function previousWeekOf(period: Period): Period {
	const from = subWeeks(period.from, 1);
	const to = subWeeks(period.to, 1);
	return { from, to };
}

function previousRowOf(row: SheetRow): PreviousWeekRow {
	const secondsByDayKey = new Map<string, number>();
	for (const [dayKey, cell] of row.cells) {
		secondsByDayKey.set(dayKey, cell.seconds);
	}
	return { identity: row.identity, secondsByDayKey };
}

function filledCellKeysOf(rows: ReadonlyArray<SheetRow>) {
	const keys = new Set<string>();
	for (const row of rows) {
		for (const dayKey of row.cells.keys()) {
			const cellKey = sheetCellKeyOf(row.key, dayKey);
			keys.add(cellKey);
		}
	}
	return keys;
}

export function useCopyPreviousWeek(input: CopyPreviousWeekInput) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [isReading, setIsReading] = useState(false);
	const [pendingCopy, setPendingCopy] = useState<PendingCopy | null>(null);
	const { period, logsScope, memberId, days, rows, dayLockOf, addRows, writes } = input;
	const hasMember = Boolean(memberId);
	const isAvailable = hasMember && isOneWeek(period);

	const readPreviousRows = useCallback(async (): Promise<PreviousWeekRow[] | null> => {
		if (!memberId) {
			return null;
		}
		const previousWeek = previousWeekOf(period);
		const request = timesheetPageLogsRequestOf(previousWeek, { ...logsScope, employeeIds: [memberId] });
		setIsReading(true);
		try {
			const logs = await queryClient.fetchQuery({
				queryKey: request.queryKey,
				queryFn: request.queryFn,
				staleTime: request.staleTime
			});
			const memberLogs = logs.filter((log) => memberIdOfLog(log) === memberId);
			const previousSheet = weekSheetOf(memberLogs);
			return previousSheet.rows.map(previousRowOf);
		} catch (error) {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('dashboard.timesheets.SHEET.COPY.READ_FAILED'), { description: t(reasonKey) });
			return null;
		} finally {
			setIsReading(false);
		}
	}, [logsScope, memberId, period, queryClient, t]);

	const copyRows = useCallback(async () => {
		const previousRows = await readPreviousRows();
		if (!previousRows) {
			return;
		}
		if (previousRows.length === 0) {
			toast(t('dashboard.timesheets.SHEET.COPY.NOTHING'));
			return;
		}
		const shownKeys = new Set(rows.map((row) => row.key));
		const identities = previousRows.map((row) => row.identity);
		const newIdentities = identities.filter((identity) => !shownKeys.has(identity.key));
		addRows(newIdentities);
		toast.success(t('dashboard.timesheets.SHEET.COPY.ROWS_ADDED', { count: newIdentities.length }));
	}, [addRows, readPreviousRows, rows, t]);

	const prepareRowsAndTime = useCallback(async () => {
		const previousRows = await readPreviousRows();
		if (!previousRows) {
			return;
		}
		if (previousRows.length === 0) {
			toast(t('dashboard.timesheets.SHEET.COPY.NOTHING'));
			return;
		}
		const filled = filledCellKeysOf(rows);
		const candidates = copyPlanOf(previousRows, days, filled);
		const plans = candidates.filter((plan) => dayLockOf(plan.day) === 'none');
		const lockedCount = candidates.length - plans.length;
		const identities = previousRows.map((row) => row.identity);
		addRows(identities);
		if (plans.length === 0) {
			toast(t('dashboard.timesheets.SHEET.COPY.NO_OPEN_CELL'));
			return;
		}
		const totalSeconds = totalSecondsOfPlans(plans);
		setPendingCopy({ plans, totalSeconds, lockedCount });
	}, [addRows, days, dayLockOf, readPreviousRows, rows, t]);

	const cancelCopy = useCallback(() => {
		setPendingCopy(null);
	}, []);

	const confirmCopy = useCallback(async () => {
		if (!pendingCopy) {
			return;
		}
		const { plans, lockedCount } = pendingCopy;
		setPendingCopy(null);
		const result = await writes.applyCopyPlan(plans);
		if (result.savedCount > 0) {
			const total = formatDurationShort(result.savedSeconds);
			toast.success(t('dashboard.timesheets.SHEET.COPY.DONE', { total, count: result.savedCount }));
		}
		const leftOut = result.skippedCount + lockedCount;
		if (leftOut > 0) {
			toast(t('dashboard.timesheets.SHEET.COPY.LEFT_OUT', { count: leftOut }));
		}
	}, [pendingCopy, t, writes]);

	return {
		isAvailable,
		isReading,
		isRunning: writes.isCopying,
		pendingCopy,
		copyRows,
		prepareRowsAndTime,
		confirmCopy,
		cancelCopy
	};
}

export type CopyPreviousWeek = ReturnType<typeof useCopyPreviousWeek>;
