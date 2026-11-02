import { createElement, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { ERequestStatus } from '@/core/types/generics/enums';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { useInvalidateRequestToJoin } from './use-invalidate-request-to-join';
import { toastMoment } from '@/core/components/common/toast-moment';
import { UserCheck } from '@/core/components/icons';

function isAccepting(action: ERequestStatus): boolean {
	return action === ERequestStatus.ACCEPTED;
}

/**
 * Hook for the "accept/reject" mutation.
 *
 * @returns Object containing:
 * - `acceptRejectRequestToJoin` — async function(id, action) to accept or reject a request
 * - `acceptRejectRequestToJoinLoading` — whether the mutation is pending
 * - `acceptRejectMutation` — raw React Query mutation for advanced usage
 */
export function useAcceptRejectRequestToJoin() {
	const { invalidateRequestToJoinData } = useInvalidateRequestToJoin();
	const t = useTranslations();

	const acceptRejectMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.acceptReject,
		mutationFn: async ({ id, action }: { id: string; action: ERequestStatus }) => {
			return await requestToJoinTeamService.acceptRejectRequestToJoin({ id, action });
		},
		onSuccess: (_data, { action }) => {
			invalidateRequestToJoinData();
			if (isAccepting(action)) {
				toastMoment(t('toasts.teams.REQUEST_ACCEPTED'), createElement(UserCheck));
				return;
			}
			toast.success(t('toasts.teams.REQUEST_REJECTED'));
		},
		onError: (error, { action }) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			let titleKey: DottedLanguageObjectStringPaths = 'toasts.teams.REQUEST_NOT_REJECTED';
			if (isAccepting(action)) {
				titleKey = 'toasts.teams.REQUEST_NOT_ACCEPTED';
			}
			toast.error(t(titleKey), { description: t(reasonKey) });
		}
	});

	// Depend on the STABLE mutateAsync, not the mutation object (recreated on every state change).
	const acceptRejectMutateAsync = acceptRejectMutation.mutateAsync;
	const acceptRejectRequestToJoin = useCallback(
		async (id: string, action: ERequestStatus) => {
			await acceptRejectMutateAsync({ id, action });
		},
		[acceptRejectMutateAsync]
	);

	return {
		acceptRejectRequestToJoin,
		acceptRejectRequestToJoinLoading: acceptRejectMutation.isPending,
		acceptRejectMutation
	};
}
