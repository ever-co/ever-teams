'use client';

import { validateForm } from '@app/helpers';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import { useRef, useState } from 'react';
import { useQuery } from '../useQuery';
import { signInEmailPasswordAPI, signInWorkspaceAPI } from '@app/services/client/api';
import { AxiosError, isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPassword() {
	const router = useRouter();

	const inputCodeRef = useRef<AuthCodeRef | null>(null);

	const [screen, setScreen] = useState<'login' | 'workspace'>('login');

	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);

	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({ email: '', password: '' });

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const { queryCall: signInQueryCall, loading: signInLoading } = useQuery(signInEmailPasswordAPI);

	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading,
		infiniteLoading
	} = useQuery(signInWorkspaceAPI);

	const handleChange = (e: any) => {
		const { name, value } = e.target;
		setFormValues((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleSubmit = (e: any) => {
		e.preventDefault();

		setErrors({});

		const { errors, isValid } = validateForm(['email', 'password'], formValues);

		if (!isValid) {
			setErrors(errors);
			return;
		}

		signInQueryCall(formValues.email, formValues.password)
			.then(({ data }) => {
				setErrors({});

				if (data.status?.toString().startsWith('4')) {
					setErrors({ email: 'Email address or password invalid' });
					return;
				}

				if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
					setScreen('workspace');
					setWorkspaces(data.workspaces);
				}
			})
			.catch((err: AxiosError<{ errors: Record<string, any> }, any> | { errors: Record<string, any> }) => {
				if (isAxiosError(err)) {
					if (err.response?.status === 400) {
						setErrors(err.response.data?.errors || {});
					}
				} else {
					setErrors(err.errors || {});
				}
			});
	};

	const signInToWorkspaceRequest = ({
		email,
		token,
		selectedTeam
	}: {
		email: string;
		token: string;
		selectedTeam: string;
	}) => {
		signInWorkspaceQueryCall({ email, token, selectedTeam })
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
	};

	const handleWorkspaceSubmit = (e: any, token: string, selectedTeam: string) => {
		e.preventDefault();
		setErrors({});
		const { errors, isValid } = validateForm(['email'], formValues);

		if (!isValid) {
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

	return {
		errors,
		setErrors,
		handleSubmit,
		handleWorkspaceSubmit,
		handleChange,
		formValues,
		setFormValues,
		inputCodeRef,
		authScreen: { screen, setScreen },
		workspaces,
		signInQueryCall,
		signInLoading,
		signInWorkspaceLoading,
		authenticated
	};
}

export type TAuthenticationPassword = ReturnType<typeof useAuthenticationPassword>;
