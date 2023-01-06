import { authFormValidate } from '@app/helpers/validations';
import {
	sendAuthCodeAPI,
	signInWithEmailAndCodeAPI,
} from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';

export function useAuthenticationPasscode() {
	const { query } = useRouter();
	const [formValues, setFormValues] = useState({
		email: (query.email as string) || '',
		code: (query.email as string) || '',
	});

	const formValuesRef = useSyncRef(formValues);

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
	const verifyPasscodeRequest = () => {
		queryCall(formValues.email, formValues.code)
			.then((res) => {
				console.log(res.data);
				window.location.reload();
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
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

		verifyPasscodeRequest();
	};

	/**
	 * Verifiy immediatly passcode if email and code were passed from url
	 */
	useEffect(() => {
		const { email, code } = formValuesRef.current;
		if (
			email.trim().length &&
			code.trim().length &&
			query.email &&
			query.code
		) {
			verifyPasscodeRequest();
		}
	}, []);

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
	};
}
