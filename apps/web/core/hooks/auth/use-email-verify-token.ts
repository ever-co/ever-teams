'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';
import { queryKeys } from '@/core/query/keys';

export function useEmailVerifyToken() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const email = searchParams?.get('email');
	const token = searchParams?.get('token');

	// SECURE - Memoized parameters to prevent infinite re-renders
	const verificationParams = useMemo(() => {
		if (!email || !token) return null;
		return { email, token };
	}, [email, token]);

	// React Query for email verification
	const emailVerificationQuery = useQuery({
		queryKey: queryKeys.emailVerification.verifyToken(verificationParams?.email, verificationParams?.token),
		queryFn: async () => {
			if (!verificationParams) {
				throw new Error('Email and token are required for verification');
			}
			return await emailVerificationService.verifyUserEmailByToken({
				email: verificationParams.email,
				token: verificationParams.token
			});
		},
		enabled: !!verificationParams, // Only run when email and token are available
		retry: 1, // Only retry once for email verification
		staleTime: Infinity, // Email verification should not be cached/retried
		gcTime: 0 // Don't cache email verification results
	});

	// Handle success - redirect to home
	useEffect(() => {
		if (emailVerificationQuery.data) {
			router.replace('/');
		}
	}, [emailVerificationQuery.data, router]);

	return {
		// A link without email or token never starts the query, so it counts as a failed verification too.
		failed: !verificationParams || emailVerificationQuery.isError,
		loading: emailVerificationQuery.isLoading
	};
}
