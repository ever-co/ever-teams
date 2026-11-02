'use client';

import { useCallback, useMemo, useState } from 'react';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import type { TEditProjectRequest } from '@/core/types/schemas';

export function useBulkProjectUpdate(projectIds: string[]) {
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { editOrganizationProject } = useEditOrganizationProject();
	const [isUpdating, setIsUpdating] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);

	const projects = useMemo(
		() => organizationProjects.filter((project) => projectIds.includes(project.id)),
		[organizationProjects, projectIds]
	);

	const updateAll = useCallback(
		async (patch: TEditProjectRequest) => {
			setIsUpdating(true);
			setHasFailed(false);
			const results = await Promise.all(projectIds.map((projectId) => editOrganizationProject(projectId, patch)));
			setIsUpdating(false);
			const hasFailure = results.some((result) => !result);
			setHasFailed(hasFailure);
			return !hasFailure;
		},
		[editOrganizationProject, projectIds]
	);

	return { projects, updateAll, isUpdating, hasFailed };
}
