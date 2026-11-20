'use client';
import { IAuthLogin, IServerError } from '@ever-teams/toolkit-types';
import { useRef, useState } from 'react';

import { authLogin } from '@ever-teams/api';
import { reportError, toast } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { kindOfFailedRequest, kindOfSignInFailure, SIGN_IN_ERROR_MESSAGE_KEYS } from '@lib/errors/kit-error';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';

interface UsePasswordLoginFormReturn {
	formData: {
		email: string;
		password: string;
	};
	loading: boolean;
	error?: string;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

interface UsePasswordLoginFormParams {
	redirectHandler?: () => void;
}

export const usePasswordLoginForm = ({ redirectHandler }: UsePasswordLoginFormParams): UsePasswordLoginFormReturn => {
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<undefined | string>(undefined);
	const { t } = useTranslation();
	const { setAccessToken } = useAccessToken();
	const { setToken, setAuthenticatedUser: setUser } = useTeamsContext();
	const { api } = useKitOptions();
	// Counts the edits: a failure that comes back after an edit is not shown, since the edit cleared the error.
	const edits = useRef(0);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		edits.current += 1;
		if (error) setError(undefined);
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(undefined);
		const editsAtSubmit = edits.current;
		const showError = (message: string) => {
			if (edits.current === editsAtSubmit) {
				setError(message);
			}
		};

		try {
			const { email, password } = formData;
			const authResponse: IAuthLogin | IServerError = await authLogin({ email, password }, api);

			if ('message' in authResponse || 'error' in authResponse) {
				// No answer (the API package returns it with no status), the site not allowed, a missing permission or
				// the API down: the kit's own words, inside the form and with no toast on the host page.
				const kind = await kindOfSignInFailure(authResponse, apiUrlOf(api));
				if (kind) {
					showError(t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]));
					setLoading(false);
					return;
				}

				if ('statusCode' in authResponse && authResponse.statusCode === 401) {
					showError(t('ERROR.invalid_password_or_email'));
					reportError(t('ERROR.invalid_password_or_email'));
					setLoading(false);
					return;
				}
				const errorMessage = errorMessageOf(authResponse);

				showError(errorMessage);
				toast({
					variant: 'destructive',
					description: errorMessage
				});
				setLoading(false);
				return;
			}

			// Set both token and user data from authResponse
			setToken(authResponse.token);
			setAccessToken(authResponse.token);
			setUser(() => ({ data: authResponse.user, loading: false }));

			redirectHandler && redirectHandler();
		} catch {
			// No answer: say whether this site is not allowed or Ever Teams is unreachable, inside the form.
			const kind = await kindOfFailedRequest(apiUrlOf(api));
			showError(t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]));
		} finally {
			setLoading(false);
		}
	};

	return {
		formData,
		loading,
		error,
		handleInputChange,
		handleSubmit
	};
};

export type TPasswordLoginForm = ReturnType<typeof usePasswordLoginForm>;
