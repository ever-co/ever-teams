'use client';

import { AxiosError } from 'axios';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryCall } from '../common/use-query';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';

export function useEmailVerifyToken() {
	const searchParams = useSearchParams();
	const email = searchParams?.get('email');
	const token = searchParams?.get('token');

	const loginFromQuery = useRef(false);

	const [errors, setErrors] = useState({} as { [x: string]: any });

	const { queryCall, loading, infiniteLoading } = useQueryCall(emailVerificationService.verifyUserEmailByToken);

	/**
	 * Verify Email by token request
	 */
	const verifyEmailRequest = useCallback(
		({ email, token }: { email: string; token: string }) => {
			queryCall(email, token)
				.then(() => {
					window.location.replace('/');
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}
				});
		},
		[queryCall]
	);

	/**
	 * Verify token immediately if email and token were passed from url
	 */
	useEffect(() => {
		if (email && token) {
			verifyEmailRequest({
				email: email as string,
				token: token as string
			});

			loginFromQuery.current = true;
		}
	}, [email, token, verifyEmailRequest]);

	return {
		errors,
		infiniteLoading,
		loading
	};
}
