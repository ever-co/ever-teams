'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { useDocsScope } from './use-docs-scope';

/**
 * One page with its content. It is not refetched on focus: the editor holds the text, and a save that lost a
 * race is told by the platform (409), which is when the page is reloaded.
 */
export function useDocsPage(pageId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.page(scope?.tenantId, pageId),
		queryFn: ({ signal }) => docsService.getPage(pageId as string, signal),
		enabled: enabled && scope !== null && !!pageId,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		retry: false
	});
	const error = query.error;
	const isNotFound = ApiErrorService.isApiError(error) && (error.statusCode === 404 || error.statusCode === 403);
	return {
		page: query.data ?? null,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		isNotFound,
		retry: query.refetch
	};
}

/** The ancestors of a page, root first, for the breadcrumb. */
export function useDocsPath(pageId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.path(scope?.tenantId, pageId),
		queryFn: ({ signal }) => docsService.getPath(pageId as string, signal),
		enabled: enabled && scope !== null && !!pageId,
		staleTime: 60_000,
		retry: false
	});
	return { path: query.data ?? [] };
}
