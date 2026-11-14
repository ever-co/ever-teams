'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isSavedTeamLoading } from '@/core/lib/helpers/saved-team';
import { listReadStateOf } from '@/core/lib/utils/clients';
import { projectsListedForTeam } from '@/core/lib/utils/project-list';
import { activeTeamState } from '@/core/stores';

export function useListedProjects() {
	const activeTeam = useAtomValue(activeTeamState);
	const {
		organizationProjects,
		isOrganizationProjectsLoaded,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery();

	const activeTeamId = activeTeam?.id;
	const listedProjects = useMemo(
		() => projectsListedForTeam(organizationProjects, activeTeamId),
		[activeTeamId, organizationProjects]
	);

	// The counts are the active team's: while the saved team loads they would be every team's, then narrow.
	const isTeamLoading = isSavedTeamLoading(Boolean(activeTeam));
	const hasProjects = organizationProjects.length > 0;
	const haveProjectsArrived = isOrganizationProjectsLoaded || hasProjects;
	const haveProjectsFailed = isOrganizationProjectsError && !haveProjectsArrived;
	const areProjectsRead = haveProjectsArrived && !isTeamLoading;
	const state = listReadStateOf(areProjectsRead, haveProjectsFailed);

	const retry = useCallback(() => void refetchOrganizationProjects(), [refetchOrganizationProjects]);

	return { listedProjects, state, retry };
}
