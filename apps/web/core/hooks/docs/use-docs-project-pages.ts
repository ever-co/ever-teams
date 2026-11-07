'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { entityFilesService } from '@/core/services/client/api/documents/entity-files.service';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

export interface ProjectDocPage {
	linkId: string;
	pageId: string;
	name: string;
	icon: string | null;
	updatedAt: string | null;
}

/** The pages attached to a project (the project's Docs tab), through the records' document links. */
export function useDocsProjectPages(projectId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.projectPages(scope?.tenantId, scope?.organizationId, projectId),
		queryFn: ({ signal }) => entityFilesService.listFiles({ entity: 'OrganizationProject', entityId: projectId as string }, signal),
		enabled: enabled && scope !== null && !!projectId,
		staleTime: 30_000,
		retry: false
	});

	const pages = useMemo<ProjectDocPage[]>(() => {
		const links = query.data?.items ?? [];
		return links
			.filter((link) => link.document?.kind === EDocumentKind.PAGE)
			.map((link) => ({
				linkId: link.id,
				pageId: link.documentId,
				name: link.document?.name ?? '',
				icon: ((link.document as { icon?: string | null } | null | undefined)?.icon ?? null) as string | null,
				updatedAt: ((link.document as { updatedAt?: string | null } | null | undefined)?.updatedAt ?? link.createdAt ?? null) as string | null
			}))
			.sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''));
	}, [query.data?.items]);

	return { pages, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch };
}
