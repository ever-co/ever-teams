import { getUser } from '@ever-teams/api';
import { useState, useCallback, useRef } from 'react';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { toast } from '@ever-teams/toolkit-ui';
import { updateSession } from './useAuthUser';
import { useTranslation } from 'react-i18next';
import { KIT_ERROR_MESSAGE_KEYS, kindOfFailedRequest, kindOfSignInFailure } from '@lib/errors/kit-error';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';

export const useTokenSubmission = (redirectHandler?: () => void) => {
	const [tokenInput, setTokenInput] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>('');
	const { t } = useTranslation();
	const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
	const { setAccessToken } = useAccessToken();
	const { setToken, setAuthenticatedUser: setUser } = useTeamsContext();
	const { api } = useKitOptions();
	// Counts the edits: a failure that comes back after an edit is not shown, since the edit cleared the error.
	const edits = useRef(0);

	// Event handler for input change
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			edits.current += 1;
			setTokenInput(e.target.value);
			if (error) setError('');
		},
		[error]
	);

	// Event handler for form submission
	const handleSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			// An empty token is the form's own mistake, said before any request (not a request with no answer).
			if (tokenInput.trim() === '') {
				setError('Token can not be empty.');
				return;
			}
			setIsLoading(true);
			setError('');
			const editsAtSubmit = edits.current;
			const showError = (message: string) => {
				if (edits.current === editsAtSubmit) {
					setError(message);
				}
			};

			try {
				const user = await getUser(
					{
						token: tokenInput,
						includeEmployee: true,
						includeOrganization: true
					},
					api
				);

				if ('message' in user || 'error' in user) {
					// No answer (the API package returns it with no status), the site not allowed, a missing permission
					// or the API down: the kit's own words, inside the form and with no toast on the host page.
					const kind = await kindOfSignInFailure(user, apiUrlOf(api));
					if (kind) {
						showError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
						setUser((prev) => ({ ...prev, loading: false }));
						return;
					}

					if ('statusCode' in user && user.statusCode === 401) {
						showError('Invalid token');
						setUser((prev) => ({ ...prev, loading: false }));
						return;
					}
					const errorMessage = errorMessageOf(user);

					setUser((prev) => ({ ...prev, loading: false }));
					showError(errorMessage);

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
				const kind = await kindOfFailedRequest(apiUrlOf(api));
				showError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
			} finally {
				setIsLoading(false);
			}
		},
		[tokenInput, setToken, t, api]
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
