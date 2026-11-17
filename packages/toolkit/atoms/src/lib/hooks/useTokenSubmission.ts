import { apiConfigManager, getUser } from '@ever-teams/api';
import { useState, useCallback } from 'react';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { toast } from '@ever-teams/toolkit-ui';
import { updateSession } from './useAuthUser';
import { useTranslation } from 'react-i18next';
import { KIT_ERROR_MESSAGE_KEYS, kindOfFailedRequest } from '@lib/errors/kit-error';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';

export const useTokenSubmission = (redirectHandler?: () => void) => {
	const [tokenInput, setTokenInput] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>('');
	const { t } = useTranslation();
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
					// No status: the request got no answer (the API package turns a network error into this shape).
					if (!('statusCode' in user)) {
						const kind = await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl);
						setError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
						setUser((prev) => ({ ...prev, loading: false }));
						return;
					}
					const isServerError = 'statusCode' in user;

					if (isServerError && user.statusCode === 401) {
						setError('Invalid token');
						setUser((prev) => ({ ...prev, loading: false }));
						return;
					}
					const errorMessage = errorMessageOf(user);

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
			} catch {
				// No answer: say whether this site is not allowed or Ever Teams is unreachable, inside the form.
				const kind = await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl);
				setError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
			} finally {
				setIsLoading(false);
			}
		},
		[tokenInput, setToken, t]
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
