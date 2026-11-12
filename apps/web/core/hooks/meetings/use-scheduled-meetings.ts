'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduledMeetingService } from '@/core/services/client/api/meetings';
import { queryKeys } from '@/core/query/keys';
import {
	appointmentInputOf,
	appointmentUpdateOf,
	scheduledMeetingOf,
	type RescheduleMeetingDraft,
	type ScheduledMeeting,
	type ScheduleMeetingDraft
} from '@/core/lib/utils/meetings';
import { useUserQuery } from '../queries/user-user.query';

const isMeeting = (meeting: ScheduledMeeting | null): meeting is ScheduledMeeting => meeting !== null;

/**
 * The meetings the signed-in member scheduled, and scheduling, rescheduling or cancelling one. A person without an
 * employee record (an owner who never joined a team as a member) has no appointments: `canSchedule` is false for them.
 */
export function useScheduledMeetings() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id || user?.employeeId || '';
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: queryKeys.meetings.scheduled(employeeId),
		queryFn: () => scheduledMeetingService.getScheduledMeetings(employeeId),
		enabled: Boolean(employeeId),
		staleTime: 60 * 1000
	});

	const meetings = useMemo(() => (query.data ?? []).map(scheduledMeetingOf).filter(isMeeting), [query.data]);

	const invalidateMeetings = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all }),
		[queryClient]
	);

	const scheduleMutation = useMutation({
		mutationFn: (draft: ScheduleMeetingDraft) =>
			scheduledMeetingService.scheduleMeeting(appointmentInputOf(draft, employeeId)),
		onSuccess: invalidateMeetings
	});

	const rescheduleMutation = useMutation({
		mutationFn: ({ appointmentId, draft }: { appointmentId: string; draft: RescheduleMeetingDraft }) =>
			scheduledMeetingService.rescheduleMeeting(appointmentId, appointmentUpdateOf(draft)),
		onSuccess: invalidateMeetings
	});

	const { mutateAsync: reschedule } = rescheduleMutation;
	const rescheduleMeeting = useCallback(
		(appointmentId: string, draft: RescheduleMeetingDraft) => reschedule({ appointmentId, draft }),
		[reschedule]
	);

	const cancelMutation = useMutation({
		mutationFn: (appointmentId: string) => scheduledMeetingService.cancelScheduledMeeting(appointmentId),
		onSuccess: invalidateMeetings
	});

	return {
		meetings,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
		canSchedule: Boolean(employeeId),
		// Gauzy lists a member's own appointments only: the person hosts every meeting of the agenda
		hostName: user?.name || user?.email || '',
		scheduleMeeting: scheduleMutation.mutateAsync,
		isScheduling: scheduleMutation.isPending,
		rescheduleMeeting,
		isRescheduling: rescheduleMutation.isPending,
		cancelMeeting: cancelMutation.mutateAsync,
		cancellingId: cancelMutation.isPending ? cancelMutation.variables : undefined
	};
}
