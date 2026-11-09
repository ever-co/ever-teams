'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { buildDocTree, sortByUpdated, splitSpaces, type DocTree } from '@/core/lib/utils/docs-tree';
import { EDocumentKind, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

/** The tree refreshes on this cadence while the tab is visible; the actions update it at once. */
const TREE_STALE_MS = 30_000;

/** The kinds the tree shows: folders and pages, never the uploaded files of tasks and projects. */
export const TREE_KINDS = [EDocumentKind.FOLDER, EDocumentKind.PAGE];

export interface DocsTreeState {
	pages: IDocumentPage[];
	byId: Map<string, IDocumentPage>;
	/** The whole tree, every visibility. */
	tree: DocTree;
	/** The organization's pages. */
	workspaceTree: DocTree;
	/** The reader's private pages. */
	privateTree: DocTree;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	retry: () => void;
}

/** Every page and folder of the organization the reader may see, outside the trash. */
export function useDocsTree(enabled: boolean): DocsTreeState {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.tree(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => docsService.listAll({ kind: TREE_KINDS, archived: 'exclude', sort: 'name', sortOrder: 'ASC' }, signal),
		enabled: enabled && scope !== null,
		staleTime: TREE_STALE_MS,
		refetchOnWindowFocus: true,
		retry: false
	});

	const pages = useMemo(() => query.data ?? [], [query.data]);
	const trees = useMemo(() => {
		const { workspace, privatePages } = splitSpaces(pages);
		return { tree: buildDocTree(pages), workspaceTree: buildDocTree(workspace), privateTree: buildDocTree(privatePages) };
	}, [pages]);
	const byId = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

	return {
		pages,
		byId,
		...trees,
		isLoading: query.isPending && query.fetchStatus !== 'idle',
		isError: query.isError,
		error: query.error,
		retry: query.refetch
	};
}

/** The pages in the trash (archived), newest first. */
export function useDocsTrash(enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.trash(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => docsService.listAll({ kind: TREE_KINDS, archived: 'only', sort: 'updatedAt', sortOrder: 'DESC' }, signal),
		enabled: enabled && scope !== null,
		staleTime: TREE_STALE_MS,
		retry: false
	});
	const pages = useMemo(() => sortByUpdated(query.data ?? []), [query.data]);
	return { pages, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch };
}
