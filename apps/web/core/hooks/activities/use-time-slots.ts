'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { timeSlotsState } from '@/core/stores/timer/time-slot';
import moment from 'moment';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { timeSlotService } from '@/core/services/client/api/timesheets/time-slot.service';
import { useAuthenticateUser } from '../auth';

import { queryKeys } from '@/core/query/keys';
import { TGetTimerLogsRequest, TDeleteTimeSlotsRequest } from '@/core/types/schemas';
import { toast } from 'sonner';

export function useTimeSlots(hasFilter?: boolean) {
	const { user } = useAuthenticateUser();
	const [timeSlots, setTimeSlots] = useAtom(timeSlotsState);
	const activityFilter = useAtomValue(activityTypeState);
	const queryClient = useQueryClient();

	// Memoized parameters to avoid unnecessary re-renders
	const queryParams = useMemo(() => {
		if (!user?.tenantId || !user?.employee?.organizationId) return null;

		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();
		const employeeId = activityFilter.member ? activityFilter.member?.employeeId : user?.employee?.id;

		return {
			tenantId: user.tenantId,
			organizationId: user.employee.organizationId,
			employeeId: employeeId ?? '',
			todayEnd,
			todayStart
		} as TGetTimerLogsRequest;
	}, [user?.tenantId, user?.employee?.organizationId, user?.employee?.id, activityFilter.member?.employeeId]);

	// Check if user is authorized to view time slots
	const isAuthorized = useMemo(() => {
		return (
			activityFilter.member?.employeeId === user?.employee?.id || user?.role?.name?.toUpperCase() === 'MANAGER'
		);
	}, [activityFilter.member?.employeeId, user?.employee?.id, user?.role?.name]);
	const invalidateTimeSlots = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: queryKeys.timer.timeSlots.all });
	}, [queryClient]);
	// React Query for time slots data
	const timeSlotsQuery = useQuery({
		queryKey: queryKeys.timer.timeSlots.byParams(queryParams),
		queryFn: async () => {
			if (!queryParams) {
				throw new Error('Time slots parameters are required');
			}
			const response = await statisticsService.getTimerLogsRequest(queryParams);
			return response;
		},
		enabled: !!(queryParams && isAuthorized),
		staleTime: 1000 * 60 * 5, // Increased to 5 minutes to prevent recalculation on tab switch
		gcTime: 1000 * 60 * 30, // Increased to 30 minutes for better caching
		refetchOnWindowFocus: false, // Disable aggressive refetching
		refetchOnReconnect: false // Disable aggressive refetching
	});

	// React Query mutation for deleting time slots
	const deleteTimeSlotsMutation = useMutation({
		mutationFn: (params: TDeleteTimeSlotsRequest) => timeSlotService.deleteTimeSlots(params),
		mutationKey: queryKeys.timer.timeSlots.operations.delete(undefined),
		onSuccess: () => {
			invalidateTimeSlots();
			toast.success('Time slots deleted successfully');
		},
		onError: (error, variables) => {
			toast.error(`Failed to delete time slots ${variables.ids.length}`, {
				description: error.message
			});
		}
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (timeSlotsQuery.data && Array.isArray(timeSlotsQuery.data)) {
			const extractedTimeSlots = timeSlotsQuery.data[0]?.timeSlots || [];
			// Convert string dates to Date objects for compatibility with ITimeSlot interface
			const convertedTimeSlots = extractedTimeSlots.map((slot) => ({
				...slot,
				startedAt: typeof slot.startedAt === 'string' ? new Date(slot.startedAt) : slot.startedAt,
				stoppedAt: slot.stoppedAt
					? typeof slot.stoppedAt === 'string'
						? new Date(slot.stoppedAt)
						: slot.stoppedAt
					: undefined
			}));
			setTimeSlots(convertedTimeSlots);
		} else if (!isAuthorized) {
			setTimeSlots([]);
		}
	}, [timeSlotsQuery.data, isAuthorized, setTimeSlots]);

	// Preserve exact interface - getTimeSlots function
	const getTimeSlots = useCallback(() => {
		if (!queryParams || !isAuthorized) {
			setTimeSlots([]);
			return;
		}

		// React Query will handle the actual fetching automatically
	}, [queryParams, isAuthorized, setTimeSlots]);

	// Preserve exact interface - deleteTimeSlots function
	const deleteTimeSlots = useCallback(
		async (ids: string[]) => {
			if (!user?.tenantId || !user?.employee?.organizationId) {
				return;
			}

			const deleteParams: TDeleteTimeSlotsRequest = {
				tenantId: user.tenantId,
				organizationId: user.employee.organizationId,
				ids
			};

			try {
				await deleteTimeSlotsMutation.mutateAsync(deleteParams);
				// Update local state immediately for better UX
				setTimeSlots((currentTimeSlots) => currentTimeSlots.filter((slot) => !ids.includes(slot.id)));
				invalidateTimeSlots();
			} catch (error: any) {
				console.log('==> ERROR ==>', error);
			}
		},
		[user?.tenantId, user?.employee?.organizationId, deleteTimeSlotsMutation, setTimeSlots]
	);

	// Auto-fetch on mount and dependency changes
	useEffect(() => {
		getTimeSlots();
	}, [getTimeSlots]);

	return {
		// Preserve exact interface names and behavior
		timeSlots,
		getTimeSlots,
		deleteTimeSlots,
		loadingDelete: deleteTimeSlotsMutation.isPending,
		loading: timeSlotsQuery.isLoading
	};
}
