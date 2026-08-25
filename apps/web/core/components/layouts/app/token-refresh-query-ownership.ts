import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

function getOwnedQueryKeys(queryClient: QueryClient, explicitQueryKeys: QueryKey[]): QueryKey[] {
	const keysByHash = new Map(explicitQueryKeys.map((queryKey) => [hashKey(queryKey), queryKey]));
	queryClient
		.getQueryCache()
		.findAll({ predicate: (query) => query.meta?.fastCredentialScoped === true })
		.forEach((query) => keysByHash.set(query.queryHash, query.queryKey));
	return [...keysByHash.values()];
}

/** Cancels old-token work before refetching the same active keys with their latest query functions. */
export async function reownActiveQueriesAfterTokenRefresh(
	queryClient: QueryClient,
	queryKeys: QueryKey[],
	isCurrent: () => boolean
) {
	const ownedQueryKeys = getOwnedQueryKeys(queryClient, queryKeys);
	await Promise.all(ownedQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })));
	if (!isCurrent()) return;
	await Promise.all(
		ownedQueryKeys.map((queryKey) =>
			queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'active' })
		)
	);
}
