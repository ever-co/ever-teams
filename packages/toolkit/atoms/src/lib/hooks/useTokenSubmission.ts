import { getUser } from '@ever-teams/api';
import { useState, useCallback } from 'react';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { toast } from '@ever-teams/toolkit-ui';
import { updateSession } from './useAuthUser';

export const useTokenSubmission = (redirectHandler?: () => void) => {
	const [tokenInput, setTokenInput] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>('');
	const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
	const { setAccessToken } = useAccessToken();
	const { setToken, setAuthenticatedUser: setUser } = useTeamsContext();

	// Event handler for input change
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setTokenInput(e.target.value);
			if (error) setError('');
		},
		[error]
	);

	// Event handler for form submission
	const handleSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			setIsLoading(true);
			setError('');

			try {
				if (tokenInput.trim() === '') throw new Error('Token can not be empty.');
				const user = await getUser({
					token: tokenInput,
					includeEmployee: true,
					includeOrganization: true
				});

				if ('message' in user || 'error' in user) {
					const isServerError = 'statusCode' in user;

					if (isServerError && user.statusCode === 401) {
						setError('Invalid token');
						setUser((prev) => ({ ...prev, loading: false }));
						return;
					}
					const errorMessage =
						'message' in user
							? Array.isArray(user.message)
								? user.message.join(', ')
								: user.message
							: String(user.error);

					setUser((prev) => ({ ...prev, loading: false }));
					setError(errorMessage);

					toast({
						description: errorMessage,
						variant: 'destructive'
					});
					return;
				}

				setToken(tokenInput);
				setAccessToken(tokenInput);
				setIsFormOpen(false);
				setUser({ data: user, loading: false });
				updateSession(user, tokenInput);
				redirectHandler && redirectHandler();
			} catch (err) {
				setError((err as Error).message);
				toast({
					description: (err as Error).message,
					variant: 'destructive'
				});
			} finally {
				setIsLoading(false);
			}
		},
		[tokenInput, setToken]
	);

	return {
		tokenInput,
		isLoading,
		error,
		isFormOpen,
		handleInputChange,
		handleSubmit
	};
};
export type TTokenSubmission = ReturnType<typeof useTokenSubmission>;
