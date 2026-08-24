import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Cancels old-token work before refetching the same active keys with their latest query functions. */
export async function reownActiveQueriesAfterTokenRefresh(
	queryClient: QueryClient,
	queryKeys: QueryKey[],
	isCurrent: () => boolean
) {
	await Promise.all(queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })));
	if (!isCurrent()) return;
	await Promise.all(
		queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'active' }))
	);
}
