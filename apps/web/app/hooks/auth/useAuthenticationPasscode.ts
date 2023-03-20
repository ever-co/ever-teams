import { authFormValidate } from '@app/helpers/validations';
import {
	sendAuthCodeAPI,
	signInWithEmailAndCodeAPI,
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

	const [formValues, setFormValues] = useState({ email: '', code: '' });

	const [errors, setErrors] = useState({} as { [x: string]: any });

	// Queries
	const { queryCall: sendCodeQueryCall, loading: sendCodeLoading } =
		useQuery(sendAuthCodeAPI);

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
		queryCall(email, code)
			.then((res) => {
				window.location.reload();
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}

				inputCodeRef.current?.clear();
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
			code: formValues.code,
		});
	};

	/**
	 * Verifiy immediatly passcode if email and code were passed from url
	 */
	useEffect(() => {
		if (query.email && query.code && !loginFromQuery.current) {
			verifyPasscodeRequest({
				email: query.email as string,
				code: query.code as string,
			});

			loginFromQuery.current = true;
		}
	}, [query]);

	/**
	 * send a fresh auth request handler
	 */
	const sendAuthCodeHandler = useCallback(() => {
		sendCodeQueryCall(formValues['email'])
			.then(() => setErrors({}))
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	}, [formValues, sendCodeQueryCall]);

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
	};
}
