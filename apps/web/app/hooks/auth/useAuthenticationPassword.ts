'use client';

import { validateForm } from '@app/helpers';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import { useRef, useState } from 'react';
import { useQuery } from '../useQuery';
import { signInEmailPasswordAPI } from '@app/services/client/api';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPassword() {
	const inputCodeRef = useRef<AuthCodeRef | null>(null);

	const [screen, setScreen] = useState<'login' | 'workspace'>('login');

	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);

	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({ email: '', password: '' });

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const { queryCall: signInQueryCall, loading: signInLoading } = useQuery(signInEmailPasswordAPI);

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

		signInQueryCall(formValues.email, formValues.password).then(({ data }) => {
			console.log(data);
		});
	};

	return {
		errors,
		setErrors,
		handleSubmit,
		handleChange,
		formValues,
		setFormValues,
		inputCodeRef,
		authScreen: { screen, setScreen },
		workspaces,
		signInQueryCall,
		signInLoading
	};
}

export type TAuthenticationPassword = ReturnType<typeof useAuthenticationPassword>;
