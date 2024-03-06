'use client';

import { authFormValidate } from '@app/helpers/validations';
import { ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import { useRef, useState } from 'react';

type AuthCodeRef = {
	focus: () => void;
	clear: () => void;
};

export function useAuthenticationPassword() {
	const inputCodeRef = useRef<AuthCodeRef | null>(null);

	const [screen, setScreen] = useState<'login' | 'workspace'>('login');

	const [workspaces, setWorkspaces] = useState<ISigninEmailConfirmWorkspaces[]>([]);

	const [authenticated, setAuthenticated] = useState(false);

	const [formValues, setFormValues] = useState({
		email: '',
		password: ''
	});

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const handleChange = (e: any) => {
		const { name, value } = e.target;

		setFormValues((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleSubmit = (e: any) => {
		e.preventDefault();

		setErrors({});

		const { errors, valid } = authFormValidate(['email', 'password'], formValues as any);

		if (!valid) {
			setErrors(errors);
			return;
		}
	};

	return {
		errors,
		handleSubmit,
		handleChange,
		formValues,
		setFormValues,
		inputCodeRef,
		setErrors,
		authScreen: { screen, setScreen },
		authenticated,
		setAuthenticated,
		workspaces
	};
}

export type TAuthenticationPassword = ReturnType<typeof useAuthenticationPassword>;
