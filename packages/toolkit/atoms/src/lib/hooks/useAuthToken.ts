'use client';
import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@ever-teams/api';
import { IServerError, IUser } from '@ever-teams/toolkit-types';
import { useAccessToken } from './useAccessToken';
import { getErrorMessage, reportError } from '@ever-teams/toolkit-ui';

interface FormState {
	inputText: string;
	loading: boolean;
	error: boolean;
	open: boolean;
	user: IUser | IServerError | null;
}
interface UseAuthTokenParams {
	navigateFunc: (path: string) => void;
}
export const useAuthToken = ({ navigateFunc }: UseAuthTokenParams) => {
	const { accessToken, setAccessToken } = useAccessToken();
	const [formState, setFormState] = useState<FormState>({
		inputText: '',
		loading: false,
		error: false,
		open: true,
		user: null
	});

	const autoLogin = useCallback(
		async (storedToken: string) => {
			setFormState((prevState) => ({ ...prevState, loading: true }));
			try {
				const user = await getUser({
					token: storedToken,
					includeEmployee: true,
					includeOrganization: true
				});

				if (!user || !('error' in user)) reportError('User not found');
				// setFormState((prevState) => ({ ...prevState, open: false, user }));
				// navigateFunc('/home');
			} catch (error) {
				reportError(getErrorMessage(error));
				setFormState((prevState) => ({ ...prevState, error: true }));
			} finally {
				setFormState((prevState) => ({ ...prevState, loading: false }));
			}
		},
		[navigateFunc]
	);

	useEffect(() => {
		const handleTokenCheck = () => {
			if (!accessToken) {
				navigateFunc('/');
			} else {
				autoLogin(accessToken);
			}
		};
		handleTokenCheck();
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === 'auth-token' && !event.newValue) {
				navigateFunc('/');
			}
		};
		window.addEventListener('storage', handleStorageChange);
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	}, [accessToken, autoLogin]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormState((prevState) => ({
			...prevState,
			inputText: e.target.value,
			error: false // Reset error when input changes
		}));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormState((prevState) => ({ ...prevState, loading: true, error: false }));

		try {
			const user = await getUser({
				token: formState.inputText,
				includeEmployee: true,
				includeOrganization: true
			});

			if (!user) reportError('User not found');

			setAccessToken(formState.inputText); // Store token for future logins
			// setFormState((prevState) => ({ ...prevState, open: false, user: user }));
			navigateFunc('/home'); // Redirect to home on successful login
		} catch (error) {
			reportError(getErrorMessage(error));
			setFormState((prevState) => ({ ...prevState, error: true }));
		} finally {
			setFormState((prevState) => ({ ...prevState, loading: false }));
		}
	};

	return {
		formState,
		handleInputChange,
		handleSubmit,
		accessToken,
		setAccessToken
	};
};
export type TAutoLogin = ReturnType<typeof useAuthToken>;
