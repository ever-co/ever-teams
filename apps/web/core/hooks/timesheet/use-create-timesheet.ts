'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { manualTimeRefusalKeyOf } from '@/core/lib/utils/dashboards/manual-time-entry';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { useAuthenticateUser } from '../auth';
import { queryKeys } from '@/core/query/keys';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

/** One toast for the periods of one save, replaced instead of stacked. */
const ENTRY_NOT_SAVED_TOAST_ID = 'time-entry-not-saved';

/**
 * Hook for creating timesheet entries.
 * Handles the create mutation with automatic cache invalidation.
 */
export function useCreateTimesheet() {
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	const queryClient = useQueryClient();
	// The dashboards read the same time logs through the activity reports, which stay fresh for 10 minutes.
	const invalidateDashboardFigures = () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });

	const createTimesheetMutation = useMutation({
		mutationFn: async (timesheetParams: IUpdateTimesheetRequest) => {
			return await timeLogService.createTimesheetFrom(timesheetParams);
		},
		onSuccess: () => {
			invalidateTimesheetData();
			invalidateDashboardFigures();
		},
		// The failure toast of every mutation, with the field the organization requires when the entry misses one
		onError: (error) => {
			const reasonKey = manualTimeRefusalKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.MUTATION_FAILED'), { id: ENTRY_NOT_SAVED_TOAST_ID, description: t(reasonKey) });
		}
	});

	const createTimesheetMutate = createTimesheetMutation.mutateAsync;
	const createTimesheet = useCallback(
		async ({ ...timesheetParams }: IUpdateTimesheetRequest) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			try {
				const response = await createTimesheetMutate(timesheetParams);
				return response.data;
			} catch (error) {
				if (axios.isAxiosError(error)) {
					console.error('Axios Error:', {
						status: error.response?.status,
						statusText: error.response?.statusText,
						data: error.response?.data
					});
					throw new Error(`Request failed: ${error.message}`);
				}
				console.error('Error:', error instanceof Error ? error.message : error);
				throw error;
			}
		},
		[createTimesheetMutate, user]
	);

	return {
		createTimesheet,
		loadingCreateTimesheet: createTimesheetMutation.isPending
	};
}
