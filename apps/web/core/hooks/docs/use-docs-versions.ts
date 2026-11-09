'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import type { IDocumentVersion } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

/** The history panel shows this many versions; older ones stay on the platform. */
export const DOCS_VERSIONS_PAGE = 50;

export interface DocsVersionDay {
	/** The calendar day (local), as `YYYY-MM-DD`. */
	day: string;
	versions: IDocumentVersion[];
}

/** The versions grouped by the day they were captured, newest day and newest version first. */
export function groupVersionsByDay(versions: readonly IDocumentVersion[]): DocsVersionDay[] {
	const sorted = [...versions].sort((a, b) => Date.parse(b.lastSavedAt) - Date.parse(a.lastSavedAt));
	const days: DocsVersionDay[] = [];
	for (const version of sorted) {
		const date = new Date(version.lastSavedAt);
		const day = Number.isNaN(date.getTime())
			? ''
			: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
		const last = days[days.length - 1];
		if (last && last.day === day) last.versions.push(version);
		else days.push({ day, versions: [version] });
	}
	return days;
}

export function useDocsVersions(pageId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.versions(scope?.tenantId, pageId),
		queryFn: ({ signal }) => docsService.versions(pageId as string, DOCS_VERSIONS_PAGE, 0, signal),
		enabled: enabled && scope !== null && !!pageId,
		staleTime: 15_000,
		retry: false
	});
	const versions = useMemo(() => query.data?.items ?? [], [query.data?.items]);
	const days = useMemo(() => groupVersionsByDay(versions), [versions]);
	return { versions, days, total: query.data?.total ?? 0, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, retry: query.refetch };
}

/** One version with its content, for the preview. */
export function useDocsVersion(pageId: string | null, versionId: string | null, enabled: boolean) {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: [...queryKeys.docs.versions(scope?.tenantId, pageId), versionId ?? null] as const,
		queryFn: ({ signal }) => docsService.version(pageId as string, versionId as string, signal),
		enabled: enabled && scope !== null && !!pageId && !!versionId,
		staleTime: 5 * 60_000,
		retry: false
	});
	return { version: query.data ?? null, isLoading: query.isPending && query.fetchStatus !== 'idle' };
}
