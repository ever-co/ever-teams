'use client';

import { authFormValidate } from '@/core/lib/helpers/validations';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { AxiosError, isAxiosError } from 'axios';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryCall } from '../common/use-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { findMostRecentWorkspace } from '@/core/lib/utils/date-comparison.utils';
import { EVER_ID_STEP_PARAM, isEverIdStep } from '@/core/lib/auth/ever-id/step';
import {
	isExpiredWorkspaceTokenError,
	isWorkspaceTokenExpired,
	toEverIdChooserData
} from '@/core/lib/auth/ever-id/session';
import { restartEverIdSignIn } from '@/core/lib/auth/ever-id/restart';
import { everIdService } from '@/core/services/client/api/auth/ever-id.service';

/** The message for each answer of the Ever ID code confirmation that is not a success. */
const EVER_ID_CONFIRM_ERRORS = {
	400: 'pages.auth.INVALID_CODE_TRY_AGAIN',
	410: 'pages.auth.everId.CODE_EXPIRED',
	429: 'pages.auth.everId.TOO_MANY_ATTEMPTS'
} as const;

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

/** Drops the Ever ID step marker from the address bar (Next.js keeps its router in step with replaceState). */
function removeEverIdStepFromUrl() {
	if (typeof window === 'undefined') return;
	const url = new URL(window.location.href);
	if (!url.searchParams.has(EVER_ID_STEP_PARAM)) return;
	url.searchParams.delete(EVER_ID_STEP_PARAM);
	window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

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

	// Ever ID sign-in that needs Gauzy's one-time e-mail code first: the URL only carries the step marker (the
	// one-time key is in a cookie this page cannot read). Read once: leaving the step ends it.
	const [everIdConfirm, setEverIdConfirm] = useState(() => isEverIdStep(query?.get(EVER_ID_STEP_PARAM), 'confirm'));
	const everIdStepActive = useRef(everIdConfirm);
	// The workspaces on screen came from an Ever ID confirmation (their tokens last 15 minutes).
	const everIdWorkspaces = useRef(false);

	const loginFromQuery = useRef(false);
	const inputCodeRef = useRef<AuthCodeRef | null>(null);
	const [screen, setScreen] = useState<'email' | 'passcode' | 'workspace'>(everIdConfirm ? 'passcode' : 'email');
	const [everIdConfirmLoading, setEverIdConfirmLoading] = useState(false);
	const [everIdTeamsUnavailable, setEverIdTeamsUnavailable] = useState(false);
	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);
	const [defaultTeamId, setDefaultTeamId] = useState<string | undefined>(undefined);
	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({
		email: queryEmail,
		code: ''
	});

	const [errors, setErrors] = useState({} as { [x: string]: any });

	// Queries
	const { queryCall: sendCodeQueryCall, loading: sendCodeLoading } = useQueryCall(authService.sendAuthCode);
	const { queryCall: signInEmailQueryCall, loading: signInEmailLoading } = useQueryCall(authService.signInEmail);
	const { queryCall: signInEmailConfirmQueryCall, loading: signInEmailConfirmLoading } = useQueryCall(
		authService.signInEmailConfirm
	);
	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading,
		infiniteLoading: infiniteWLoading
	} = useQueryCall(authService.signInWorkspace);
	const { queryCall, loading, infiniteLoading } = useQueryCall(authService.signInWithEmailAndCode);

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
					// Reset infinite loading before navigation to ensure clean state
					infiniteWLoading.current = false;
					router.push('/');
				})
				.catch((err: AxiosError) => {
					// Reset infinite loading on error to stop the loading state
					infiniteWLoading.current = false;
					// Ever ID: a workspace token that expired meanwhile starts the Ever ID sign-in again
					if (everIdWorkspaces.current && isExpiredWorkspaceTokenError(err)) {
						restartEverIdSignIn();
						return;
					}
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}
					inputCodeRef.current?.clear();
				});
		},
		[signInWorkspaceQueryCall, router, infiniteWLoading]
	);

	/**
	 * Verify auth request
	 */
	const verifySignInEmailConfirmRequest = useCallback(
		async ({ email, code, lastTeamId }: { email: string; code: string; lastTeamId?: string }) => {
			// Attempt 1 — the Gauzy auth-code confirmation (signin.email/confirm). This is the normal path:
			// it returns the user's workspaces so multi-workspace users get the chooser and single-workspace
			// users are signed straight in.
			//
			// Attempt 2 — the Next.js /api/auth/login route, which understands INVITE codes typed into this
			// box (and auth codes, but then it signs into the FIRST workspace without a chooser). It used to run
			// FIRST: with GAUZY_API_BASE_SERVER_URL set the client posts it straight to Gauzy, whose /auth/login
			// wants {email,password}, so every passcode login began with a guaranteed 400 (WEB-012 / Q17).
			// Order swapped 2026-08-17: confirm first, invite-code route only when confirm does not sign in.
			let confirmError: unknown;
			try {
				setStatus('loading');
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
			} catch (error) {
				confirmError = error;
			}

			// Attempt 2: invite-code path (Next.js route). Only reached when attempt 1 did not sign the user in.
			try {
				const loginResponse = await queryCall(email, code);
				if (loginResponse?.data?.user || loginResponse?.data?.team) {
					setAuthenticated(true);
					setStatus('success');
					router.replace('/');
					return;
				}
				setStatus('error');
				setErrors({ code: t('pages.auth.INVALID_CODE_TRY_AGAIN') });
			} catch (loginError) {
				setStatus('error');
				if (isAxiosError(confirmError) && confirmError.response?.status === 400) {
					setErrors(confirmError.response.data?.errors || {});
				} else if (isAxiosError(loginError) && loginError.response?.status === 400) {
					setErrors(loginError.response.data?.errors || {});
				} else {
					setErrors({ code: t('pages.auth.INVALID_CODE_TRY_AGAIN') });
				}
			}
			void lastTeamId;
		},
		[queryCall, signInEmailConfirmQueryCall, router, t]
	);

	/**
	 * Leaves the Ever ID step (after it succeeded, or when the person goes back): the marker leaves the URL and the
	 * code is emptied, so the e-mail sign-in on this page works as usual again. Does nothing on any other sign-in.
	 */
	const leaveEverIdStep = useCallback(() => {
		if (!everIdStepActive.current) return;
		everIdStepActive.current = false;
		setEverIdConfirm(false);
		setFormValues((values) => ({ ...values, code: '' }));
		inputCodeRef.current?.clear();
		removeEverIdStepFromUrl();
	}, []);

	/**
	 * Ever ID: the code from Gauzy's e-mail completes the link, then the usual workspace chooser follows.
	 * The account's e-mail address arrives with the answer; it is never part of the URL.
	 */
	const verifyEverIdCodeRequest = useCallback(
		async (code: string) => {
			setStatus('loading');
			setEverIdConfirmLoading(true);
			try {
				const { status: httpStatus, data } = await everIdService.confirmLink(code);
				const chooser = httpStatus === 200 ? toEverIdChooserData(data.workspaces, data.confirmed_email) : null;
				if (chooser) {
					everIdWorkspaces.current = true;
					setWorkspaces(chooser.workspaces);
					setEverIdTeamsUnavailable(chooser.teamsUnavailable);
					setFormValues((values) => ({ ...values, email: chooser.confirmedEmail }));
					setAuthenticated(true);
					setStatus('success');
					setScreen('workspace');
					// The key is used up: a later code on this page is an e-mail sign-in again.
					leaveEverIdStep();
					return;
				}
				setStatus('error');
				const message =
					EVER_ID_CONFIRM_ERRORS[httpStatus as keyof typeof EVER_ID_CONFIRM_ERRORS] ??
					'pages.auth.everId.UNAVAILABLE';
				setErrors({ code: t(message) });
				inputCodeRef.current?.clear();
			} catch {
				setStatus('error');
				setErrors({ code: t('pages.auth.everId.UNAVAILABLE') });
			} finally {
				setEverIdConfirmLoading(false);
			}
		},
		[leaveEverIdStep, t]
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

		if (everIdConfirm) {
			const { errors, valid } = authFormValidate(['code'], formValues as any);
			if (!valid) {
				setStatus('error');
				setErrors(errors);
				return;
			}
			void verifyEverIdCodeRequest(formValues.code);
			return;
		}

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

		// Ever ID: a workspace token past its 15 minutes starts the Ever ID sign-in again instead of failing
		if (everIdWorkspaces.current && isWorkspaceTokenExpired(token)) {
			restartEverIdSignIn();
			return;
		}

		infiniteWLoading.current = true;

		signInToWorkspaceRequest({
			email: formValues.email,
			token,
			selectedTeam,
			defaultTeamId: selectedTeam,
			// Only send lastTeamId if selectedTeam is not empty
			// Empty string causes 400 Bad Request: "lastTeamId must be a UUID"
			lastTeamId: selectedTeam || undefined
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
		const { errors, valid } = authFormValidate(['email'], formValues as any);
		if (!valid) {
			setErrors(errors);
			return;
		}
		const promise = signInEmailQueryCall(formValues['email']);

		void promise.then(() => setErrors({}));
		promise.catch((err: AxiosError) => {
			if (err.response?.status === 400) {
				setErrors((err.response?.data as any)?.errors || {});
			}
		});

		return promise;
	}, [formValues, signInEmailQueryCall]);

	const getLastTeamIdWithRecentLogout = useCallback((): string | null => {
		if (workspaces.length === 0) {
			throw new Error('No workspaces found');
		}
		const mostRecentWorkspace = findMostRecentWorkspace(workspaces);
		return mostRecentWorkspace.user.lastTeamId ?? null;
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
		getLastTeamIdWithRecentLogout,
		everIdConfirm,
		everIdConfirmLoading,
		everIdTeamsUnavailable,
		leaveEverIdStep
	};
}

export type TAuthenticationPasscode = ReturnType<typeof useAuthenticationPasscode>;
