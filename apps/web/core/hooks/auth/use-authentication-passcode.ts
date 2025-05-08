'use client';

import { authFormValidate } from '@/core/lib/helpers/validations';
import { ISigninEmailConfirmResponse, ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces';
import { AxiosError, isAxiosError } from 'axios';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '../common/use-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authService } from '@/core/services/client/api/auth/auth.service';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPasscode() {
	const router = useRouter();
	// const pathname = usePathname();
	const query = useSearchParams();
	const t = useTranslations();

	// const queryTeamId = query?.get('teamId');

	const queryEmail = useMemo(() => {
		const emailQuery = query?.get('email') || '';

		if (typeof localStorage !== 'undefined') {
			localStorage?.setItem('ever-teams-start-email', emailQuery);
		}
		return emailQuery;
	}, [query]);

	const queryCode = useMemo(() => {
		return query?.get('code');
	}, [query]);

	const loginFromQuery = useRef(false);
	const inputCodeRef = useRef<AuthCodeRef | null>(null);
	const [screen, setScreen] = useState<'email' | 'passcode' | 'workspace'>('email');
	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);
	const [defaultTeamId, setDefaultTeamId] = useState<string | undefined>(undefined);
	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({
		email: queryEmail,
		code: ''
	});

	const [errors, setErrors] = useState({} as { [x: string]: any });

	// Queries
	const { queryCall: sendCodeQueryCall, loading: sendCodeLoading } = useQuery(authService.sendAuthCode);
	const { queryCall: signInEmailQueryCall, loading: signInEmailLoading } = useQuery(authService.signInEmail);
	const { queryCall: signInEmailConfirmQueryCall, loading: signInEmailConfirmLoading } = useQuery(
		authService.signInEmailConfirm
	);
	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading,
		infiniteLoading: infiniteWLoading
	} = useQuery(authService.signInWorkspace);
	const { queryCall, loading, infiniteLoading } = useQuery(authService.signInWithEmailAndCode);

	const handleChange = (e: any) => {
		const { name, value } = e.target;
		setFormValues((prevState) => ({ ...prevState, [name]: value }));
	};

	const signInToWorkspaceRequest = useCallback(
		(params: {
			email: string;
			token: string;
			selectedTeam: string;
			code?: string;
			defaultTeamId?: string;
			lastTeamId?: string;
		}) => {
			const workspaceParams = {
				email: params.email,
				token: params.token,
				selectedTeam: params.selectedTeam,
				defaultTeamId: params.defaultTeamId,
				lastTeamId: params.lastTeamId
			};

			signInWorkspaceQueryCall(workspaceParams)
				.then(() => {
					setAuthenticated(true);
					router.push('/');
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}
					inputCodeRef.current?.clear();
				});
		},
		[signInWorkspaceQueryCall, router]
	);

	/**
	 * Verify auth request
	 */
	const verifySignInEmailConfirmRequest = useCallback(
		async ({ email, code, lastTeamId }: { email: string; code: string; lastTeamId?: string }) => {
			try {
				const loginResponse = await queryCall(email, code);

				// Check for successful direct login
				if (loginResponse?.data) {
					const data = loginResponse.data;

					// If we have user data, redirect
					if (data.user || data.team) {
						setAuthenticated(true);
						router.replace('/');
						return;
					}
				}
			} catch (loginError) {
				// Continue to fallback
			}

			// Fallback to /auth/signin.email/confirm
			try {
				const response = await signInEmailConfirmQueryCall(email, code);

				if (response?.data) {
					const data = response.data as ISigninEmailConfirmResponse;

					// If we get workspaces, show workspace selection
					if (data.workspaces && data.workspaces.length > 0) {
						setWorkspaces(data.workspaces);
						setDefaultTeamId(data.defaultTeamId);
						setScreen('workspace');
						return;
					}

					// If we have team data, redirect
					if (data.team) {
						setAuthenticated(true);
						router.replace('/');
						return;
					}
				}

				// Handle 401 error - check the actual response object
				if (response?.status === 401) {
					setErrors({
						code: t('pages.auth.INVALID_CODE_TRY_AGAIN')
					});
				} else if (response?.data?.status === 401) {
					// Some APIs return status in the data object
					setErrors({
						code: t('pages.auth.INVALID_CODE_TRY_AGAIN')
					});
				}
			} catch (confirmError) {
				// Handle errors
				if (isAxiosError(confirmError) && confirmError.response?.status === 400) {
					setErrors(confirmError.response.data?.errors || {});
				} else {
					setErrors({
						code: t('pages.auth.INVALID_CODE_TRY_AGAIN')
					});
				}
			}
		},
		[queryCall, signInEmailConfirmQueryCall, router, t]
	);

	const verifyPasscodeRequest = useCallback(
		({ email, code }: { email: string; code: string }) => {
			queryCall(email, code)
				.then((res) => {
					if (res?.data?.user) {
						setAuthenticated(true);
						router.replace('/');
					} else {
						const errors = (res.data as any).errors ?? {};
						if (errors.email) {
							setErrors(errors);
						}
					}
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}
					inputCodeRef.current?.clear();
				});
		},
		[queryCall, router]
	);

	const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors({});
		const { errors, valid } = authFormValidate(['email', 'code'], formValues as any);
		if (!valid) {
			setErrors(errors);
			return;
		}
		infiniteLoading.current = true;

		verifySignInEmailConfirmRequest({
			email: formValues.email,
			code: formValues.code
		});
	};

	const handleSubmit = (e: any) => {
		e.preventDefault();
		setErrors({});
		const { errors, valid } = authFormValidate(['email', 'code'], formValues as any);

		if (!valid) {
			setErrors(errors);
			return;
		}

		infiniteLoading.current = true;

		verifyPasscodeRequest({
			email: formValues.email,
			code: formValues.code
		});
	};

	const handleWorkspaceSubmit = (e: any, token: string, selectedTeam: string) => {
		e.preventDefault();
		setErrors({});
		const { errors, valid } = authFormValidate(['email'], formValues as any);

		if (!valid) {
			setErrors(errors);
			return;
		}

		infiniteWLoading.current = true;

		signInToWorkspaceRequest({
			email: formValues.email,
			token,
			selectedTeam,
			defaultTeamId: selectedTeam,
			lastTeamId: selectedTeam
		});
	};

	useEffect(() => {
		if (queryEmail && queryCode && !loginFromQuery.current) {
			setScreen('passcode');
			verifySignInEmailConfirmRequest({ email: queryEmail, code: queryCode });
			loginFromQuery.current = true;
		}
	}, [query, verifySignInEmailConfirmRequest, queryEmail, queryCode]);

	const sendAuthCodeHandler = useCallback(() => {
		const promise = signInEmailQueryCall(formValues['email']);

		promise.then(() => setErrors({}));
		promise.catch((err: AxiosError) => {
			if (err.response?.status === 400) {
				setErrors((err.response?.data as any)?.errors || {});
			}
		});

		return promise;
	}, [formValues, signInEmailQueryCall]);

	const getLastTeamIdWithRecentLogout = useCallback(() => {
		if (workspaces.length === 0) {
			throw new Error('No workspaces found');
		}

		const mostRecentWorkspace = workspaces.reduce((prev, current) => {
			const prevDate = new Date(prev.user.lastLoginAt ?? '');
			const currentDate = new Date(current.user.lastLoginAt ?? '');
			return currentDate > prevDate ? current : prev;
		});

		return mostRecentWorkspace.user.lastTeamId;
	}, [workspaces]);

	return {
		sendAuthCodeHandler,
		errors,
		sendCodeLoading,
		handleSubmit,
		handleChange,
		loading,
		formValues,
		setFormValues,
		inputCodeRef,
		setErrors,
		authScreen: { screen, setScreen },
		authenticated,
		setAuthenticated,
		handleCodeSubmit,
		signInEmailQueryCall,
		signInEmailLoading,
		signInEmailConfirmQueryCall,
		signInEmailConfirmLoading,
		workspaces,
		defaultTeamId,
		sendCodeQueryCall,
		signInWorkspaceLoading,
		handleWorkspaceSubmit,
		getLastTeamIdWithRecentLogout
	};
}

export type TAuthenticationPasscode = ReturnType<typeof useAuthenticationPasscode>;
