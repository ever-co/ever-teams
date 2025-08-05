import { TUser } from '@/core/types/schemas';
import { userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';

export function useSettings() {
	const [, setUser] = useAtom(userState);
	const queryClient = useQueryClient();

	// Optimized invalidation function for user-related queries
	const invalidateUserQueries = useCallback(() => {
		// Invalidate all user-related queries to ensure fresh data
		queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
	}, [queryClient]);

	// React Query mutation for update user avatar
	const updateAvatarMutation = useMutation({
		mutationFn: ({ userId, body }: { userId: string; body: Partial<TUser> }) =>
			userService.updateUserAvatar({ userId, body }),
		mutationKey: queryKeys.users.settings.updateAvatar(undefined), // Use undefined for mutation key
		onSuccess: () => {
			// Invalidate user queries to ensure UI reflects the updated avatar
			invalidateUserQueries();
		}
	});

	// React Query mutation for refresh user data
	const refreshUserMutation = useMutation({
		mutationFn: () => userService.getAuthenticatedUserData(),
		mutationKey: queryKeys.users.settings.refreshUser,
		onSuccess: (data) => {
			// Update Jotai state with fresh user data
			setUser(data);
		}
	});

	// Preserve exact interface - update avatar function
	const updateAvatar = useCallback(
		(userData: Partial<TUser> & { id: string }) => {
			return updateAvatarMutation.mutateAsync({ userId: userData.id, body: userData }).then((res) => {
				// Chain the refresh user call to maintain existing behavior
				refreshUserMutation.mutateAsync().then((result) => {
					setUser(result);
				});
				return res;
			});
		},
		[updateAvatarMutation, refreshUserMutation, setUser]
	);

	return {
		// Preserve exact interface names and behavior
		updateAvatar,
		setUser,
		updateLoading: updateAvatarMutation.isPending,
		refreshUserLoading: refreshUserMutation.isPending
	};
}
