'use client';
import { IAuthLogin, IServerError } from '@ever-teams/toolkit-types';
import { useState } from 'react';

import { authLogin } from '@ever-teams/api';
import { getErrorMessage, reportError, toast } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';

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
				const isServerError = 'statusCode' in authResponse;

				if (isServerError && authResponse.statusCode === 401) {
					setError(t('ERROR.invalid_password_or_email'));
					reportError(t('ERROR.invalid_password_or_email'));
					setLoading(false);
					return;
				}
				const errorMessage =
					'message' in authResponse
						? Array.isArray(authResponse.message)
							? authResponse.message.join(', ')
							: authResponse.message
						: String(authResponse.error);

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
		} catch (error) {
			reportError(getErrorMessage(error));
			setError(getErrorMessage(error));
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
