'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_TAKE = 20;

/** The value as it was a moment ago, so a search does not fire on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [delayMs, value]);
	return debounced;
}

/** The pages whose title or text matches, through the platform (its index covers the text). */
export function useDocsSearch(input: string, enabled: boolean) {
	const scope = useDocsScope();
	const query = useDebouncedValue(input.trim(), SEARCH_DEBOUNCE_MS);
	const isActive = enabled && scope !== null && query.length >= SEARCH_MIN_LENGTH;
	const result = useQuery({
		queryKey: queryKeys.docs.search(scope?.tenantId, scope?.organizationId, query),
		queryFn: ({ signal }) =>
			docsService.list(
				{ q: query, searchIn: 'content', kind: [EDocumentKind.PAGE], archived: 'exclude', sort: 'updatedAt', sortOrder: 'DESC', take: SEARCH_TAKE },
				signal
			),
		enabled: isActive,
		staleTime: 30_000,
		retry: false
	});
	return {
		query,
		isActive,
		results: isActive ? (result.data?.items ?? []) : [],
		total: isActive ? (result.data?.total ?? 0) : 0,
		isSearching: isActive && result.isPending && result.fetchStatus !== 'idle',
		isError: isActive && result.isError
	};
}
