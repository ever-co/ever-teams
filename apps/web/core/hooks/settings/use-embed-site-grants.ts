'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { isSiteGrantsUnavailable, siteGrantsInOrder } from '@/core/lib/utils/embed-site-grants';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { embedsService } from '@/core/services/client/api/embeds/embeds.service';

/**
 * How many times a failed read is tried again. A refusal (4xx) never is: a 404 says the server has no list of
 * allowed sites, and a 401 was already answered by the session renewal.
 */
const LIST_RETRIES = 2;

function isRefusal(error: unknown): boolean {
	const status = errorStatusOf(error);
	return status !== null && status >= 400 && status < 500;
}

function shouldRetryList(failureCount: number, error: unknown): boolean {
	if (isRefusal(error)) {
		return false;
	}
	return failureCount < LIST_RETRIES;
}

/**
 * The sites the signed-in person allowed to use their timer (Settings > Security > Sites you signed in from), the one
 * that can renew its sign-in the longest first. Against a server without embeds (404) `isUnavailable` is true and
 * nothing is shown. `isLoading` stays true until the first answer, the wait for the user included.
 */
export function useEmbedSiteGrants() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const userId = user?.id;
	const [endingId, setEndingId] = useState<string | null>(null);

	const grantsQuery = useQuery({
		queryKey: queryKeys.embeds.siteGrants(userId),
		queryFn: ({ signal }) => embedsService.listSiteGrants(signal),
		enabled: Boolean(userId),
		retry: shouldRetryList,
		// A site can be allowed from its own tab at any time: the list is read again whenever the page is shown, and
		// when the person comes back to the tab (the app's default turns focus refreshes off)
		staleTime: 0,
		refetchOnWindowFocus: true
	});
	const listed = grantsQuery.data;
	const grants = useMemo(() => siteGrantsInOrder(listed ?? []), [listed]);
	const isUnavailable = grantsQuery.isError && isSiteGrantsUnavailable(grantsQuery.error);
	const isError = grantsQuery.isError && !isUnavailable;

	// Started, not awaited: the confirmation closes on the answer of the end request, and never waits for a list that
	// a lost connection keeps from coming back
	const readAgain = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.embeds.siteGrants(userId) });
	}, [queryClient, userId]);

	const endMutation = useMutation({
		mutationFn: (grantId: string) => embedsService.endSiteGrant(grantId),
		// Sent at once even when the browser reports no network: held back until the network returns, it would keep the
		// confirmation locked with nothing to cancel. A request that cannot leave fails, and the dialog says so.
		networkMode: 'always',
		onSettled: readAgain,
		meta: { handlesOwnError: true }
	});
	const endAsync = endMutation.mutateAsync;

	const endSite = useCallback(
		async (grantId: string) => {
			setEndingId(grantId);
			try {
				await endAsync(grantId);
			} finally {
				setEndingId(null);
			}
		},
		[endAsync]
	);

	const refetchGrants = grantsQuery.refetch;
	const retry = useCallback(() => {
		void refetchGrants();
	}, [refetchGrants]);

	return {
		grants,
		isLoading: grantsQuery.isPending,
		isError,
		isUnavailable,
		retry,
		endSite,
		endingId
	};
}
