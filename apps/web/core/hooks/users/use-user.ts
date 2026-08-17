import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/core/services/client/api';
import { useAuthenticateUser } from '../auth';
import { queryKeys } from '@/core/query/keys';
import { TDeleteResponse } from '@/core/types/schemas';

export const useUser = () => {
	const { user, logOut } = useAuthenticateUser();
	const queryClient = useQueryClient();
	const invalidateUser = useCallback(() => {
		// Invalidate only user-related queries before logout
		queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
		logOut();
	}, [queryClient, logOut]);
	// React Query mutation for delete user
	const deleteUserMutation = useMutation({
		mutationFn: (id: string) => userService.deleteUser(id),
		mutationKey: queryKeys.users.operations.delete(undefined), // Use undefined for mutation key
		onSuccess: () => {
			invalidateUser();
		}
	});

	// React Query mutation for reset user
	const resetUserMutation = useMutation({
		mutationFn: () => userService.resetUser(),
		mutationKey: queryKeys.users.operations.reset,
		onSuccess: () => {
			invalidateUser();
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change)
	const deleteUserMutateAsync = deleteUserMutation.mutateAsync;
	const resetUserMutateAsync = resetUserMutation.mutateAsync;

	// Preserve exact interface - delete user function
	const deleteUser = useCallback(async () => {
		if (user) {
			return await deleteUserMutateAsync(user.id);
		}
	}, [user, deleteUserMutateAsync]);

	// Preserve exact interface - reset user function
	const resetUser = useCallback(async () => {
		if (user) {
			return await resetUserMutateAsync();
		}
	}, [user, resetUserMutateAsync]);

	// Preserve exact interface - delete query call function
	const deleteQueryCall = useCallback(
		async (id: string): Promise<TDeleteResponse> => {
			return await deleteUserMutateAsync(id);
		},
		[deleteUserMutateAsync]
	);

	// Preserve exact interface - reset query call function
	const resetQueryCall = useCallback(async (): Promise<TDeleteResponse> => {
		return await resetUserMutateAsync();
	}, [resetUserMutateAsync]);

	return {
		// Preserve exact interface names and behavior
		deleteUser,
		deleteUserLoading: deleteUserMutation.isPending,
		deleteQueryCall,
		resetUser,
		resetUserLoading: resetUserMutation.isPending,
		resetQueryCall
	};
};
