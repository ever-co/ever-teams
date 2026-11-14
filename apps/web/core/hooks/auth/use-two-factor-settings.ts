'use client';

import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { twoFactorService } from '@/core/services/client/api/auth/two-factor.service';
import { twoFactorStatusFailureOf } from '@/core/lib/auth/two-factor';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { userState } from '@/core/stores/user/user';
import type { ITwoFactorProof } from '@/core/types/interfaces/auth/two-factor';

/**
 * What the settings can offer: `ready` (the state is read), `unsupported` (an API without these routes: no entry, as
 * before), `error` (the page says so and offers to try again) or `loading`.
 */
export type TwoFactorAvailability = 'loading' | 'ready' | 'unsupported' | 'error';

function shouldRetryStatus(failureCount: number, error: unknown): boolean {
	return twoFactorStatusFailureOf(error) === 'error' && failureCount < 2;
}

/** The signed-in person's own two-factor state, read once per sign-in and organization. */
export function useTwoFactorStatus(enabled = true) {
	const user = useAtomValue(userState);
	const organizationId = getOrganizationIdCookie();
	const query = useQuery({
		queryKey: queryKeys.users.twoFactor.status(user?.tenantId, organizationId, user?.id),
		queryFn: () => twoFactorService.getStatus(),
		enabled: enabled && Boolean(user?.id),
		staleTime: 5 * 60_000,
		retry: shouldRetryStatus
	});
	let availability: TwoFactorAvailability = 'loading';
	if (query.isSuccess) {
		availability = 'ready';
	} else if (query.isError) {
		availability = twoFactorStatusFailureOf(query.error);
	}
	return { status: query.data ?? null, availability, retry: query.refetch };
}

/** The Security settings: the state, and the writes that change it (each reads the state again once done). */
export function useTwoFactorSettings() {
	const queryClient = useQueryClient();
	const status = useTwoFactorStatus();
	const readAgain = () => queryClient.invalidateQueries({ queryKey: queryKeys.users.twoFactor.all });

	const enroll = useMutation({ mutationFn: () => twoFactorService.enroll() });
	const confirm = useMutation({ mutationFn: (code: string) => twoFactorService.confirm(code), onSuccess: readAgain });
	const disable = useMutation({
		mutationFn: (proof: ITwoFactorProof) => twoFactorService.disable(proof),
		onSuccess: readAgain
	});
	const regenerate = useMutation({
		mutationFn: (proof: ITwoFactorProof) => twoFactorService.regenerateRecoveryCodes(proof),
		onSuccess: readAgain
	});

	return { ...status, enroll, confirm, disable, regenerate };
}
