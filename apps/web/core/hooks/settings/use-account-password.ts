'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { userService } from '@/core/services/client/api/users/user.service';

export function useAccountPassword() {
	const { data: user } = useUserQuery();
	const userId = user?.id;

	const passwordMutation = useMutation({
		mutationFn: (input: { userId: string; password: string }) => userService.updateUserPassword(input),
		meta: { handlesOwnError: true }
	});
	const passwordMutateAsync = passwordMutation.mutateAsync;

	const savePassword = useCallback(
		async (password: string) => {
			if (!userId) {
				throw new Error('No signed-in account');
			}
			await passwordMutateAsync({ userId, password });
		},
		[passwordMutateAsync, userId]
	);

	return { savePassword, isSavingPassword: passwordMutation.isPending };
}
