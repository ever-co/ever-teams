'use client';
import { IAuthLogin, IServerError } from '@ever-teams/toolkit-types';
import { useState } from 'react';

import { apiConfigManager, authLogin } from '@ever-teams/api';
import { reportError, toast } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { KIT_ERROR_MESSAGE_KEYS, kindOfFailedRequest } from '@lib/errors/kit-error';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';

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

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		if (error) setError(undefined);
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(undefined);

		try {
			const { email, password } = formData;
			const authResponse: IAuthLogin | IServerError = await authLogin({ email, password });

			if ('message' in authResponse || 'error' in authResponse) {
				// No status: the request got no answer (the API package turns a network error into this shape).
				if (!('statusCode' in authResponse)) {
					const kind = await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl);
					setError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
					setLoading(false);
					return;
				}
				const isServerError = 'statusCode' in authResponse;

				if (isServerError && authResponse.statusCode === 401) {
					setError(t('ERROR.invalid_password_or_email'));
					reportError(t('ERROR.invalid_password_or_email'));
					setLoading(false);
					return;
				}
				const errorMessage = errorMessageOf(authResponse);

				setError(errorMessage);
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
			const kind = await kindOfFailedRequest(apiConfigManager.getConfig().apiUrl);
			setError(t(KIT_ERROR_MESSAGE_KEYS[kind]));
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
