import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { TAddManualTimeRequest, TTimeLog } from '@/core/types/schemas';
import { useTimesheetInvalidation } from '@/core/hooks/timesheet/use-timesheet-invalidation';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { logErrorInDev } from '@/core/lib/helpers/error-message';

export function useManualTime() {
	const t = useTranslations();
	const locale = useLocale();
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	const [timeLog, setTimeLog] = useState<TTimeLog>();

	// React Query mutation for adding manual time
	const addManualTimeMutation = useMutation({
		mutationFn: async (request: TAddManualTimeRequest) => {
			return await timeLogService.addManualTime(request);
		},
		onSuccess: (data) => {
			setTimeLog(data);
			// Invalidate related queries to refresh data
			invalidateTimesheetData();

			const startDate = new Date(data.startedAt);
			const endDate = new Date(data.stoppedAt);
			const date = startDate.toLocaleDateString(locale, { dateStyle: 'medium' });
			const start = startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
			const end = endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

			toast.success(t('toasts.time.MANUAL_ADDED'), {
				description: t('toasts.time.MANUAL_ADDED_RANGE', { date, start, end })
			});
		},
		// The modal shows the failure next to its form, so no toast repeats it
		onError: (error) => {
			logErrorInDev('Add manual time failed', error);
		}
	});

	// Depend on the STABLE mutate, never on the mutation result object (recreated on every state change).
	const addManualTimeMutate = addManualTimeMutation.mutate;
	// Preserve exact same interface for existing consumers
	const addManualTime = useCallback(
		(
			data: Omit<TAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'> & {
				employeeId?: string;
			}
		) => {
			const requestData: TAddManualTimeRequest = {
				tenantId: user?.tenantId ?? '',
				employeeId: user?.employee?.id ?? '',
				logType: ETimeLogType.MANUAL,
				source: ETimeLogSource.BROWSER,
				...data
			};

			addManualTimeMutate(requestData);
		},
		[addManualTimeMutate, user?.employee?.id, user?.tenantId]
	);

	return {
		addManualTimeLoading: addManualTimeMutation.isPending,
		addManualTimeSuccess: addManualTimeMutation.isSuccess,
		addManualTimeError: addManualTimeMutation.isError,
		addManualTimeErrorMessage: addManualTimeMutation.error?.message,
		addManualTimeFailure: addManualTimeMutation.error,
		addManualTime,
		timeLog,
		// Reset function to clear states when modal reopens
		resetManualTimeState: () => {
			addManualTimeMutation.reset();
			setTimeLog(undefined);
		}
	};
}
