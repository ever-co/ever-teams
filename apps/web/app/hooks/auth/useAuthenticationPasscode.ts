import { authFormValidate } from '@app/helpers/validations';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import {
	sendAuthCodeAPI,
	signInEmailAPI,
	signInEmailConfirmAPI,
	signInWithEmailAndCodeAPI,
	signInWorkspaceAPI
} from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '../useQuery';
import { useTranslation } from 'lib/i18n';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPasscode() {
	const { query, pathname } = useRouter();

	const { trans } = useTranslation();

	const loginFromQuery = useRef(false);
	const inputCodeRef = useRef<AuthCodeRef | null>(null);
	const [screen, setScreen] = useState<'email' | 'passcode' | 'workspace'>(
		'email'
	);
	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>(
		[]
	);
	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({ email: '', code: '' });

	const [errors, setErrors] = useState({} as { [x: string]: any });

	// Queries
	const { queryCall: sendCodeQueryCall, loading: sendCodeLoading } =
		useQuery(sendAuthCodeAPI);

	const { queryCall: signInEmailQueryCall, loading: signInEmailLoading } =
		useQuery(signInEmailAPI);
	const {
		queryCall: signInEmailConfirmQueryCall,
		loading: signInEmailConfirmLoading
	} = useQuery(signInEmailConfirmAPI);
	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading
	} = useQuery(signInWorkspaceAPI);

	const { queryCall, loading, infiniteLoading } = useQuery(
		signInWithEmailAndCodeAPI
	);

	const handleChange = (e: any) => {
		const { name, value } = e.target;
		setFormValues((prevState) => ({ ...prevState, [name]: value }));
	};

	/**
	 * Verify auth request
	 */
	const verifySignInEmailConfirmRequest = async ({
		email,
		code
	}: {
		email: string;
		code: string;
	}) => {
		signInEmailConfirmQueryCall(email, code)
			.then((res) => {
				if (res.data?.workspaces && res.data.workspaces.length) {
					setWorkspaces(res.data.workspaces);

					setScreen('workspace');
				}

				// If user tries to login from public Team Page as an Already a Member
				// Redirect to the current team automatically
				if (
					pathname === '/team/[teamId]/[profileLink]' &&
					res.data.workspaces.length
				) {
					if (query.teamId) {
						const currentWorkspace = res.data.workspaces.find((workspace) =>
							workspace.current_teams
								.map((item) => item.team_id)
								.includes(query.teamId as string)
						);

						signInToWorkspaceRequest({
							email: email,
							token: currentWorkspace?.token as string,
							selectedTeam: query.teamId as string
						});
					}
				}

				if (res.data?.status !== 200 && res.data?.status !== 201) {
					setErrors({ code: trans.pages.auth.INVALID_INVITE_CODE_MESSAGE });
				}
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	};

	const verifyPasscodeRequest = useCallback(
		({ email, code }: { email: string; code: string }) => {
			queryCall(email, code)
				.then(() => {
					window.location.reload();
					setAuthenticated(true);
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}

					inputCodeRef.current?.clear();
				});
		},
		[queryCall]
	);
	const signInToWorkspaceRequest = ({
		email,
		token,
		selectedTeam
	}: {
		email: string;
		token: string;
		selectedTeam: string;
	}) => {
		signInWorkspaceQueryCall(email, token, selectedTeam)
			.then(() => {
				window.location.reload();
				setAuthenticated(true);
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}

				inputCodeRef.current?.clear();
			});
	};

	const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors({});
		const { errors, valid } = authFormValidate(
			['email', 'code'],
			formValues as any
		);

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
		const { errors, valid } = authFormValidate(
			['email', 'code'],
			formValues as any
		);

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

	const handleWorkspaceSubmit = (
		e: any,
		token: string,
		selectedTeam: string
	) => {
		e.preventDefault();
		setErrors({});
		const { errors, valid } = authFormValidate(['email'], formValues as any);

		if (!valid) {
			setErrors(errors);
			return;
		}

		infiniteLoading.current = true;

		signInToWorkspaceRequest({
			email: formValues.email,
			token,
			selectedTeam
		});
	};

	/**
	 * Verifiy immediatly passcode if email and code were passed from url
	 */
	useEffect(() => {
		if (query.email && query.code && !loginFromQuery.current) {
			setScreen('passcode');

			verifyPasscodeRequest({
				email: query.email as string,
				code: query.code as string
			});

			loginFromQuery.current = true;
		}
	}, [query, verifyPasscodeRequest]);

	/**
	 * send a fresh auth request handler
	 * STEP1
	 */
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
		sendCodeQueryCall,
		signInWorkspaceLoading,
		queryCall,
		handleWorkspaceSubmit
	};
}

export type TAuthenticationPasscode = ReturnType<
	typeof useAuthenticationPasscode
>;
