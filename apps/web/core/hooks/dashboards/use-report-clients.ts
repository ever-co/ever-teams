'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { projectClientIdsOf, reportClientChoicesOf } from '@/core/lib/utils/dashboards/report-filters';
import { queryKeys } from '@/core/query/keys';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import type { TOrganizationProject } from '@/core/types/schemas';

// The API lists archived projects only when asked, while the time logged on them stays in every report
const ARCHIVED_PROJECTS_QUERY: Record<string, string> = { 'where[isArchived]': 'true' };

const NO_PROJECTS: TOrganizationProject[] = [];

/** The clients a report's Client filter offers, from the clients list and from the projects given. */
export function useReportClientChoices(projects: ReadonlyArray<TOrganizationProject>) {
	const { clients } = useActiveClients();
	return useMemo(() => reportClientChoicesOf(clients, projects), [clients, projects]);
}

/**
 * The current client of every project, which a report filtered by client reads for each of its rows.
 * `includesArchived` adds the archived projects, for a report whose rows name a project and nothing about its
 * client; they are read only while `isEnabled`, so a report without a client filter asks for nothing more.
 */
export function useReportProjectClients({
	includesArchived,
	isEnabled
}: Readonly<{ includesArchived: boolean; isEnabled: boolean }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const {
		organizationProjects,
		isOrganizationProjectsLoaded,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery();

	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const wantsArchived = includesArchived && isEnabled;
	const readsArchived = wantsArchived && hasScope;
	const archivedQuery = useQuery({
		queryKey: queryKeys.organizationProjects.withQueriesByScope(tenantId, organizationId, ARCHIVED_PROJECTS_QUERY),
		queryFn: ({ signal }) =>
			organizationProjectService.getOrganizationProjects({ queries: ARCHIVED_PROJECTS_QUERY, signal }),
		enabled: readsArchived
	});
	const archivedProjects = archivedQuery.data?.items ?? NO_PROJECTS;

	const clientIds = useMemo(() => {
		const projects = [...organizationProjects, ...archivedProjects];
		return projectClientIdsOf(projects);
	}, [archivedProjects, organizationProjects]);

	const isListSettled = isOrganizationProjectsLoaded || isOrganizationProjectsError;
	const isArchivedPending = readsArchived && archivedQuery.isPending;
	const isPending = !isListSettled || isArchivedPending;
	const isArchivedError = readsArchived && archivedQuery.isError;
	const isError = isOrganizationProjectsError || isArchivedError;

	const { refetch: refetchArchived } = archivedQuery;
	const refetch = useCallback(() => {
		void refetchOrganizationProjects();
		if (readsArchived) {
			void refetchArchived();
		}
	}, [readsArchived, refetchArchived, refetchOrganizationProjects]);

	return {
		projects: organizationProjects,
		clientIds,
		isPending,
		isError,
		/** False when the projects cannot be read at all: no client can then be told for any time. */
		canTellClients: !isOrganizationProjectsError,
		refetch
	};
}
