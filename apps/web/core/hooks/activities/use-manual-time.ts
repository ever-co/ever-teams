import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { TAddManualTimeRequest, TTimeLog } from '@/core/types/schemas';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';

export function useManualTime() {
	const { user } = useAuthenticateUser();
	const queryClient = useQueryClient();
	const [timeLog, setTimeLog] = useState<TTimeLog>();

	// React Query mutation for adding manual time
	const addManualTimeMutation = useMutation({
		mutationFn: async (request: TAddManualTimeRequest) => {
			return await timeLogService.addManualTime(request);
		},
		onSuccess: (data) => {
			setTimeLog(data);
			// Invalidate related queries to refresh data
			queryClient.invalidateQueries({ queryKey: queryKeys.timer.timeLogs.all });

			// Format dates for display
			const startDate = new Date(data.startedAt);
			const endDate = new Date(data.stoppedAt);
			const dateStr = startDate.toLocaleDateString();
			const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

			toast.success('Time added successfully', {
				description: `Time added successfully for ${user?.firstName} ${user?.lastName} on ${dateStr} from ${startTimeStr} to ${endTimeStr}`
			});
		},
		onError: (error) => {
			console.log(error);
			toast.error('Add manual time failed', {
				description: error.message
			});
		}
	});

	// Preserve exact same interface for existing consumers
	const addManualTime = useCallback(
		(data: Omit<TAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'>) => {
			const requestData: TAddManualTimeRequest = {
				tenantId: user?.tenantId ?? '',
				employeeId: user?.employee?.id ?? '',
				logType: ETimeLogType.MANUAL,
				source: ETimeLogSource.BROWSER,
				...data
			};

			addManualTimeMutation.mutate(requestData);
		},
		[addManualTimeMutation, user?.employee?.id, user?.tenantId]
	);

	return {
		addManualTimeLoading: addManualTimeMutation.isPending,
		addManualTimeSuccess: addManualTimeMutation.isSuccess,
		addManualTimeError: addManualTimeMutation.isError,
		addManualTimeErrorMessage: addManualTimeMutation.error?.message,
		addManualTime,
		timeLog,
		// Reset function to clear states when modal reopens
		resetManualTimeState: () => {
			addManualTimeMutation.reset();
			setTimeLog(undefined);
		}
	};
}
