import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emailResetService } from '@/core/services/client/api/users/emails/email-reset.service';
import { queryKeys } from '@/core/query/keys';
import { TEmailResetSuccessResponse } from '@/core/types/schemas';

export const useEmailReset = () => {
	const queryClient = useQueryClient();

	// React Query mutation for email reset request
	const emailResetRequestMutation = useMutation({
		mutationFn: (email: string) => emailResetService.resetEmail(email),
		mutationKey: queryKeys.users.emailReset.request(undefined), // Use undefined for mutation key
		onSuccess: () => {
			// Optionally invalidate related queries if needed
			queryClient.invalidateQueries({ queryKey: queryKeys.users.emailReset.all });
		}
	});

	// React Query mutation for verify change email
	const verifyChangeEmailRequestMutation = useMutation({
		mutationFn: (code: string) => emailResetService.verifyChangeEmail(code),
		mutationKey: queryKeys.users.emailReset.verify(undefined), // Use undefined for mutation key
		onSuccess: () => {
			// Optionally invalidate related queries if needed
			queryClient.invalidateQueries({ queryKey: queryKeys.users.emailReset.all });
		}
	});

	// Preserve exact interface - email reset request function
	const emailResetRequestQueryCall = useCallback(
		async (email: string): Promise<TEmailResetSuccessResponse> => {
			return await emailResetRequestMutation.mutateAsync(email);
		},
		[emailResetRequestMutation]
	);

	// Preserve exact interface - verify change email function
	const verifyChangeEmailRequestQueryCall = useCallback(
		async (code: string): Promise<TEmailResetSuccessResponse> => {
			return await verifyChangeEmailRequestMutation.mutateAsync(code);
		},
		[verifyChangeEmailRequestMutation]
	);

	return {
		// Preserve exact interface names and behavior
		emailResetRequestQueryCall,
		emailResetRequestLoading: emailResetRequestMutation.isPending,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading: verifyChangeEmailRequestMutation.isPending
	};
};
