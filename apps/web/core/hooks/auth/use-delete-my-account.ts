'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { accountDeletionService } from '@/core/services/client/api/auth/account-deletion.service';
import { useAuthenticateUser } from './use-authenticate-user';

/**
 * Settings → Danger Zone → "Delete all data": deletes the signed-in account with the e-mail link's semantics (Gauzy
 * `POST /account-deletion/me`), after showing what will happen (`GET /account-deletion/me`, read only while `enabled`,
 * i.e. while the confirm modal is open). On success the user is signed out: cookies and cached queries are cleared and
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
		mutationFn: () => accountDeletionService.deleteMe(),
		onSuccess: () => {
			// The account is gone: no refetch with its token, straight to the signed-out state.
			void logOut();
		}
	});

	const deleteMyAccountMutateAsync = deletion.mutateAsync;
	const deleteMyAccount = useCallback(() => deleteMyAccountMutateAsync(), [deleteMyAccountMutateAsync]);

	return {
		preview: preview.data,
		previewLoading: preview.isFetching,
		previewError: preview.error,
		deleteMyAccount,
		deleteMyAccountLoading: deletion.isPending
	};
}
