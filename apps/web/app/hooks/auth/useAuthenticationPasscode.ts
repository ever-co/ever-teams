import { authFormValidate } from '@app/helpers/validations';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import {
	sendAuthCodeAPI,
	signInEmailAPI,
	signInEmailConfirmAPI,
	signInWithEmailAndCodeAPI,
	signInWorkspaceAPI,
} from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '../useQuery';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPasscode() {
	const { query } = useRouter();
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
		loading: signInEmailConfirmLoading,
	} = useQuery(signInEmailConfirmAPI);
	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading,
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
	const verifyPasscodeRequest = ({
		email,
		code,
	}: {
		email: string;
		code: string;
	}) => {
		signInEmailConfirmQueryCall(email, code)
			.then((res) => {
				console.log('<res>', res);
				// window.location.reload();
				// setAuthenticated(true);

				// TODO
				// Update state with tenant details
				// Remove window reload
				if (res.data?.workspaces && res.data.workspaces.length) {
					setWorkspaces(res.data.workspaces);
				}
				setScreen('workspace');
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}

				inputCodeRef.current?.clear();
			});
	};
	const signInToWorkspaceRequest = ({
		email,
		token,
	}: {
		email: string;
		token: string;
	}) => {
		signInWorkspaceQueryCall(email, token)
			.then((res) => {
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

	const handleCodeSubmit = (e: any) => {
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
			code: formValues.code,
		});
	};

	const handleSubmit = (e: any, token: string) => {
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

		signInToWorkspaceRequest({
			email: formValues.email,
			token,
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
				code: query.code as string,
			});

			loginFromQuery.current = true;
		}
	}, [query]);

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
	};
}

export type TAuthenticationPasscode = ReturnType<
	typeof useAuthenticationPasscode
>;
