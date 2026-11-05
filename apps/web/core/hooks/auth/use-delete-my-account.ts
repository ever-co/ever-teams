'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import {
	accountDeletionService,
	isAccountDeletionPlanChanged
} from '@/core/services/client/api/auth/account-deletion.service';
import { useAuthenticateUser } from './use-authenticate-user';

/** The error deleteMyAccount throws when no preview (with its planHash) was read: nothing was sent. */
export const ACCOUNT_DELETION_PREVIEW_REQUIRED = 'The deletion preview must be shown before the deletion is confirmed';

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
		mutationFn: (planHash: string) => accountDeletionService.deleteMe(planHash),
		// The account is gone: no refetch with its token, straight to the signed-out state. The logout is returned so the
		// mutation stays pending until the session and the cache are cleared (logOut can wait for the timer to stop).
		onSuccess: () => logOut()
	});

	const planHash = preview.data?.planHash;
	const refetchPreview = preview.refetch;
	const deleteMyAccountMutateAsync = deletion.mutateAsync;
	/**
	 * Deletes what the preview showed. On a 409 (the outcome changed), reads the new preview and rethrows. Without the
	 * preview's planHash nothing is sent: the deletion must be the one the person saw (canDeleteMyAccount is false).
	 */
	const deleteMyAccount = useCallback(async () => {
		if (!planHash) throw new Error(ACCOUNT_DELETION_PREVIEW_REQUIRED);
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
		/** A preview with its planHash is shown: the only state in which the deletion may be confirmed. */
		canDeleteMyAccount: !!planHash && !preview.isFetching && !preview.error,
		retryPreview,
		deleteMyAccount,
		deleteMyAccountLoading: deletion.isPending
	};
}
