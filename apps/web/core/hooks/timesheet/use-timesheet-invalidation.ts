'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/core/query/keys';

/**
 * Shared cache invalidation logic for timesheet mutations.
 * Uses broad prefix invalidation (`queryKeys.timesheet.all`) to ensure
 * all timesheet-related queries (logs, dailyReport, timerLogsDailyReport, timeLog)
 * are invalidated consistently across all operations.
 *
 * @returns Object containing the invalidation function
 */
export function useTimesheetInvalidation() {
	const queryClient = useQueryClient();

	const invalidateTimesheetData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.timesheet.all
		});
	}, [queryClient]);

	return {
		invalidateTimesheetData
	};
}

