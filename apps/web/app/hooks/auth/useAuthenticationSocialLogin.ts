'use client';

import { validateForm } from '@app/helpers';
import { useRef, useState } from 'react';
import { useQuery } from '../useQuery';
import { signInWorkspaceAPI } from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationSocialLogin() {
	const router = useRouter();

	const inputCodeRef = useRef<AuthCodeRef | null>(null);

	const [authenticated, setAuthenticated] = useState(false);

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const {
		queryCall: signInWorkspaceQueryCall,
		loading: signInWorkspaceLoading,
		infiniteLoading
	} = useQuery(signInWorkspaceAPI);

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

	const handleWorkspaceSubmit = (e: any, token: string, selectedTeam: string, email: string) => {
		e.preventDefault();
		setErrors({});
		const { errors, isValid } = validateForm(['email'], { email });

		if (!isValid) {
			setErrors(errors);
			return;
		}

		infiniteLoading.current = true;

		signInToWorkspaceRequest({
			email,
			token,
			selectedTeam
		});
	};

	return {
		errors,
		setErrors,
		handleWorkspaceSubmit,
		inputCodeRef,
		signInWorkspaceLoading,
		authenticated
	};
}

export type TAuthenticationSocial = ReturnType<typeof useAuthenticationSocialLogin>;
