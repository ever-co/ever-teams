'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/core/query/keys';

/**
 * Shared cache invalidation logic for timesheet and time log mutations.
 * Uses broad prefix invalidation on both namespaces that read time logs:
 * `queryKeys.timesheet.all` (logs, dailyReport, timerLogsDailyReport, timeLog)
 * and `queryKeys.timeLogs.all` (time logs and their daily report, e.g. the daily plan worked time),
 * so every operation refreshes the same views.
 *
 * @returns Object containing the invalidation function
 */
export function useTimesheetInvalidation() {
	const queryClient = useQueryClient();

	const invalidateTimesheetData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.timesheet.all
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.timeLogs.all
		});
	}, [queryClient]);

	return {
		invalidateTimesheetData
	};
}

