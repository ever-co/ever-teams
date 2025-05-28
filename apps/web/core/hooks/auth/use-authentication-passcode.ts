'use client';

import { authFormValidate } from '@/core/lib/helpers/validations';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/IAuth';
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
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
			// Mobile's workspace signin - just use token, no code validation
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
				setStatus('loading');
				const loginResponse = await queryCall(email, code);

				if (loginResponse?.data?.user || loginResponse?.data?.team) {
					setAuthenticated(true);
					setStatus('success');
					router.replace('/');
					return;
				}
			} catch (loginError) {
				setStatus('error');
				if (isAxiosError(loginError) && loginError.response?.status === 400) {
					setErrors(loginError.response.data?.errors || {});
				} else {
					setErrors({ code: t('pages.auth.INVALID_CODE_TRY_AGAIN') });
				}
			}

			// Second attempt: signInEmailConfirmQueryCall
			try {
				const response = await signInEmailConfirmQueryCall(email, code);

				if (response?.data?.user || (response?.data?.workspaces?.length ?? 0) > 0) {
					setAuthenticated(true);
					setStatus('success');
					if (response.data.workspaces?.length > 0) {
						setWorkspaces(response.data.workspaces);
						setDefaultTeamId(response.data.defaultTeamId);
						setScreen('workspace');
					} else {
						router.replace('/');
					}
					return;
				}

				if (response?.status === 401 || response?.data?.status === 401) {
					setStatus('error');
					setErrors({ code: t('pages.auth.INVALID_CODE_TRY_AGAIN') });
				}
			} catch (confirmError) {
				setStatus('error');
				if (isAxiosError(confirmError) && confirmError.response?.status === 400) {
					setErrors(confirmError.response.data?.errors || {});
				} else {
					setErrors({ code: t('pages.auth.INVALID_CODE_TRY_AGAIN') });
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
		setStatus('loading');

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
		status,
		setStatus,
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
