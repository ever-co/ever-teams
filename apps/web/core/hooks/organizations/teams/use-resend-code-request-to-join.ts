import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { TJoinTeamRequest } from '@/core/types/schemas';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

/**
 * Hook for the "resend code" mutation.
 *
 * @returns Object containing:
 * - `resendCodeRequestToJoinTeam` — async function to resend the join code
 * - `resendCodeRequestToJoinLoading` — whether the mutation is pending
 * - `resendCodeRequestToJoinQueryCall` — backward compat wrapper returning `{ data }`
 * - `resendCodeMutation` — raw React Query mutation for advanced usage
 */
export function useResendCodeRequestToJoin() {
	const t = useTranslations();
	const resendCodeMutation = useMutation({
		mutationKey: queryKeys.organizationTeams.requestToJoin.mutations.resendCode,
		mutationFn: async (data: TJoinTeamRequest) => {
			return await requestToJoinTeamService.resendCodeRequestToJoin(data);
		},
		onSuccess: (_data, { email }) => {
			toast.success(t('toasts.teams.JOIN_CODE_RESENT', { email }));
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.teams.JOIN_CODE_NOT_RESENT'), { description: t(reasonKey) });
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const resendCodeMutateAsync = resendCodeMutation.mutateAsync;
	const resendCodeRequestToJoinTeam = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutateAsync(data);
			return result;
		},
		[resendCodeMutateAsync]
	);

	const resendCodeRequestToJoinQueryCall = useCallback(
		async (data: TJoinTeamRequest) => {
			const result = await resendCodeMutateAsync(data);
			return { data: result };
		},
		[resendCodeMutateAsync]
	);

	return {
		resendCodeRequestToJoinTeam,
		resendCodeRequestToJoinLoading: resendCodeMutation.isPending,
		resendCodeRequestToJoinQueryCall,
		resendCodeMutation
	};
}
