import { verifyUserEmailByTokenAPI } from '@app/services/client/api';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '../useQuery';

export function useEmailVerifyToken() {
	const { query } = useRouter();
	const loginFromQuery = useRef(false);

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const { queryCall, loading, infiniteLoading } = useQuery(
		verifyUserEmailByTokenAPI
	);

	/**
	 * Verify Email by token request
	 */
	const verifyEmailRequest = ({
		email,
		token,
	}: {
		email: string;
		token: string;
	}) => {
		queryCall(email, token)
			.then(() => {
				window.location.replace('/');
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	};

	/**
	 * Verifiy token immediatly if email and token were passed from url
	 */
	useEffect(() => {
		if (query.email && query.token) {
			verifyEmailRequest({
				email: query.email as string,
				token: query.token as string,
			});

			loginFromQuery.current = true;
		}
	}, [query]);

	return {
		errors,
		infiniteLoading,
		loading,
	};
}
