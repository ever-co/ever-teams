'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	isSessionsUnavailable,
	sessionsInOrder,
	type IUserSessionSignOutOthersInput
} from '@/core/lib/auth/user-sessions';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { userSessionService } from '@/core/services/client/api/auth/user-session.service';

/**
 * How many times a failed read is tried again. A refusal (4xx) never is: a 404 says the API has no sessions, and a
 * 401 was already answered by the session renewal, which signs a session signed out elsewhere out of this tab.
 */
const LIST_RETRIES = 2;

function isRefusal(error: unknown): boolean {
	const status = errorStatusOf(error);
	return status !== null && status >= 400 && status < 500;
}

function shouldRetryList(failureCount: number, error: unknown): boolean {
	if (isSessionsUnavailable(error) || isRefusal(error)) {
		return false;
	}
	return failureCount < LIST_RETRIES;
}

/**
 * The signed-in user's sessions (Settings > Profile > Sessions): this browser's first, then the others from the most
 * recently active. Against an API without sessions (404) `isUnavailable` is true and nothing is shown.
 */
export function useUserSessions() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const userId = user?.id;
	const email = user?.email ?? '';
	const queryKey = queryKeys.users.auth.sessions(userId);
	const [signingOutId, setSigningOutId] = useState<string | null>(null);

	const sessionsQuery = useQuery({
		queryKey,
		queryFn: ({ signal }) => userSessionService.list(signal),
		enabled: Boolean(userId),
		retry: shouldRetryList,
		// Another device can sign in or out at any time: the list is read again whenever the page is shown, and when
		// the person comes back to the tab (the app's default turns focus refreshes off)
		staleTime: 0,
		refetchOnWindowFocus: true
	});
	const listed = sessionsQuery.data;
	const sessions = useMemo(() => sessionsInOrder(listed ?? []), [listed]);
	const isUnavailable = sessionsQuery.isError && isSessionsUnavailable(sessionsQuery.error);
	const isError = sessionsQuery.isError && !isUnavailable;

	const readAgain = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.users.auth.sessions(userId) }),
		[queryClient, userId]
	);

	const signOutOthersMutation = useMutation({
		mutationFn: (input: IUserSessionSignOutOthersInput) => userSessionService.signOutOthers(input),
		onSettled: readAgain,
		meta: { handlesOwnError: true }
	});
	const signOutOthersAsync = signOutOthersMutation.mutateAsync;

	const signOutMutation = useMutation({
		mutationFn: (sessionId: string) => userSessionService.signOut(sessionId),
		onSettled: readAgain,
		meta: { handlesOwnError: true }
	});
	const signOutAsync = signOutMutation.mutateAsync;

	/** Signs every other session out with the proof given; answers how many went. */
	const signOutOthers = useCallback(
		async (input: IUserSessionSignOutOthersInput) => {
			const answer = await signOutOthersAsync(input);
			return answer.signedOut;
		},
		[signOutOthersAsync]
	);

	const signOut = useCallback(
		async (sessionId: string) => {
			setSigningOutId(sessionId);
			try {
				await signOutAsync(sessionId);
			} finally {
				setSigningOutId(null);
			}
		},
		[signOutAsync]
	);

	/**
	 * Sends the sign-in code e-mail to the user's own address: its code proves it is them, for an account without a
	 * password.
	 */
	const sendCode = useCallback(async () => {
		await authService.signInEmail(email);
	}, [email]);

	const refetchSessions = sessionsQuery.refetch;
	const retry = useCallback(() => {
		void refetchSessions();
	}, [refetchSessions]);

	return {
		sessions,
		isLoading: sessionsQuery.isLoading,
		isError,
		isUnavailable,
		retry,
		signOutOthers,
		signOut,
		signingOutId,
		sendCode,
		email
	};
}
