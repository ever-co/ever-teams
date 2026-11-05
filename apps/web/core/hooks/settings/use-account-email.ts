'use client';

import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useEmailReset } from '@/core/hooks/users/use-email-reset';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';
import { userState } from '@/core/stores/user/user';
import type { TUser } from '@/core/types/schemas';

interface VerifyAddressInput {
	code: string;
	email: string;
}

export function useAccountEmail() {
	const userQuery = useUserQuery();
	const user = userQuery.data;
	const refetchUser = userQuery.refetch;
	const setUser = useSetAtom(userState);
	const {
		emailResetRequestQueryCall,
		emailResetRequestLoading,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading
	} = useEmailReset();

	const resendVerificationMutation = useMutation({
		mutationFn: (account: TUser) => authService.resendVerifyUserLink(account),
		meta: { handlesOwnError: true }
	});
	const verifyAddressMutation = useMutation({
		mutationFn: (input: VerifyAddressInput) => emailVerificationService.verifyUserEmailByCode(input),
		meta: { handlesOwnError: true }
	});
	const resendVerificationMutateAsync = resendVerificationMutation.mutateAsync;
	const verifyAddressMutateAsync = verifyAddressMutation.mutateAsync;

	const refreshUser = useCallback(async () => {
		const result = await refetchUser();
		if (result.data) {
			setUser(result.data);
		}
	}, [refetchUser, setUser]);

	const sendChangeCode = useCallback(
		async (email: string) => {
			await emailResetRequestQueryCall(email);
		},
		[emailResetRequestQueryCall]
	);

	const confirmChange = useCallback(
		async (code: string) => {
			await verifyChangeEmailRequestQueryCall(code);
			await refreshUser();
		},
		[verifyChangeEmailRequestQueryCall, refreshUser]
	);

	const sendVerificationCode = useCallback(async () => {
		if (!user) {
			return;
		}
		await resendVerificationMutateAsync(user);
	}, [resendVerificationMutateAsync, user]);

	const confirmVerification = useCallback(
		async (code: string) => {
			const email = user?.email;
			if (!email) {
				return;
			}
			await verifyAddressMutateAsync({ code, email });
			await refreshUser();
		},
		[refreshUser, user?.email, verifyAddressMutateAsync]
	);

	return {
		user,
		sendChangeCode,
		isSendingChangeCode: emailResetRequestLoading,
		confirmChange,
		isConfirmingChange: verifyChangeEmailRequestLoading,
		sendVerificationCode,
		isSendingVerificationCode: resendVerificationMutation.isPending,
		confirmVerification,
		isConfirmingVerification: verifyAddressMutation.isPending
	};
}
