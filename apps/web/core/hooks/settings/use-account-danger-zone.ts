'use client';

import { useCallback } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useUser } from '@/core/hooks/users/use-user';
import { useDeleteMyAccount } from '@/core/hooks/auth/use-delete-my-account';
import { useDeleteOrganizationTeam } from '@/core/hooks/organizations/teams/use-delete-organization-team';

export type AccountDangerAction = 'leaveTeams' | 'deleteAccount' | 'deleteAllData';

/** Never `DELETE /user/reset`: that is Gauzy's factory reset of every member's data. */
export function useAccountDangerZone(openAction: AccountDangerAction | null) {
	const { data: user } = useUserQuery();
	const { deleteUser, deleteUserLoading } = useUser();
	const { removeUserFromAllTeam, removeUserFromAllTeamLoading } = useDeleteOrganizationTeam();
	const isDeletionPreviewOpen = openAction === 'deleteAllData';
	const { preview, previewLoading, previewError, retryPreview, deleteMyAccount, deleteMyAccountLoading } =
		useDeleteMyAccount(isDeletionPreviewOpen);
	const userId = user?.id;

	const leaveTeams = useCallback(async () => {
		if (!userId) {
			return;
		}
		await removeUserFromAllTeam(userId);
	}, [removeUserFromAllTeam, userId]);

	const deleteAccount = useCallback(async () => {
		await deleteUser();
	}, [deleteUser]);

	const deleteAllData = useCallback(async () => {
		await deleteMyAccount();
	}, [deleteMyAccount]);

	const accountCount = preview?.accounts?.length ?? 0;
	const hasPreviewAccounts = accountCount > 0;
	const isPreviewSettled = !previewLoading;
	const hasPreviewError = Boolean(previewError);
	const isPreviewReady = isPreviewSettled && !hasPreviewError && hasPreviewAccounts;

	return {
		user,
		leaveTeams,
		isLeavingTeams: removeUserFromAllTeamLoading,
		deleteAccount,
		isDeletingAccount: deleteUserLoading,
		deleteAllData,
		isDeletingAllData: deleteMyAccountLoading,
		preview,
		previewLoading,
		previewError,
		retryPreview,
		isPreviewReady
	};
}
