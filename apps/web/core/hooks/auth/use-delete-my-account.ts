'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	accountDeletionService,
	isAccountDeletionPlanChanged
} from '@/core/services/client/api/auth/account-deletion.service';
import { useAuthenticateUser } from './use-authenticate-user';

/**
 * Settings → Danger Zone → "Delete all data": deletes the signed-in account with the e-mail link's semantics (Gauzy
 * `POST /account-deletion/me`), after showing what will happen (`GET /account-deletion/me`, read only while `enabled`,
 * i.e. while the confirm modal is open), then `POST` with that preview's `planHash`. On success the user is signed out: cookies and cached queries are cleared and
 * the app goes to the sign-in page (useAuthenticateUser().logOut).
 */
export function useDeleteMyAccount(enabled: boolean) {
	const { user, logOut } = useAuthenticateUser();

	const preview = useQuery({
		queryKey: queryKeys.users.operations.deletionPreview(user?.id),
		queryFn: () => accountDeletionService.previewMe(),
		enabled: enabled && !!user?.id,
		retry: false,
		staleTime: 0,
		gcTime: 0
	});

	const deletion = useMutation({
		mutationKey: queryKeys.users.operations.deleteMe,
		// The preview the person saw: Gauzy deletes only if the outcome is still the one it described (else 409)
		mutationFn: (planHash?: string) => accountDeletionService.deleteMe(planHash),
		onSuccess: () => {
			// The account is gone: no refetch with its token, straight to the signed-out state.
			void logOut();
		}
	});

	const planHash = preview.data?.planHash;
	const refetchPreview = preview.refetch;
	const deleteMyAccountMutateAsync = deletion.mutateAsync;
	/** Deletes what the preview showed. On a 409 (the outcome changed), reads the new preview and rethrows. */
	const deleteMyAccount = useCallback(async () => {
		try {
			return await deleteMyAccountMutateAsync(planHash);
		} catch (error) {
			if (isAccountDeletionPlanChanged(error)) await refetchPreview();
			throw error;
		}
	}, [deleteMyAccountMutateAsync, planHash, refetchPreview]);

	const retryPreview = useCallback(() => void refetchPreview(), [refetchPreview]);

	return {
		preview: preview.data,
		previewLoading: preview.isFetching,
		// Set after a failed read even when an earlier preview is still cached: that one must not be confirmed
		previewError: preview.error,
		retryPreview,
		deleteMyAccount,
		deleteMyAccountLoading: deletion.isPending
	};
}
