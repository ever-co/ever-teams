'use client';

import { useAtom, useAtomValue, useStore } from 'jotai';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { findTaskProject, pickedBillableOf, timerBillableOf } from '@/core/lib/helpers/timer-billable';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';
import { queryKeys } from '@/core/query/keys';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { activeTeamTaskState, timerBillableChoicesState, timerStatusState } from '@/core/stores';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

import { useOrganizationProjectsQuery } from '../organizations/projects/use-organization-projects-query';

const NO_PROJECTS: TOrganizationProject[] = [];

function displayedBillableOf(
	isRunning: boolean,
	runningLogBillable: boolean | null | undefined,
	pickedBillable: boolean
): boolean {
	if (!isRunning) {
		return pickedBillable;
	}
	if (typeof runningLogBillable !== 'boolean') {
		return pickedBillable;
	}
	return runningLogBillable;
}

/**
 * The billable value a start sends for a task, read when the start runs: the callers (every timer instance)
 * do not re-render with the projects list or the switch. A project not in the list cache yet is fetched, so a
 * cold start never sends a billable project's time as non-billable.
 */
export function useResolveTimerBillable() {
	const store = useStore();
	const queryClient = useQueryClient();

	const fetchProject = useCallback(
		async (projectId: string, tenantId: string, organizationId: string) => {
			const accessToken = getAccessTokenCookie();
			const scope = { tenantId, organizationId, accessToken };
			try {
				return await queryClient.fetchQuery({
					queryKey: queryKeys.organizationProjects.detailByScope(tenantId, organizationId, projectId),
					meta: CREDENTIAL_SCOPED_QUERY_META,
					queryFn: ({ signal }) =>
						organizationProjectService.getOrganizationProject(projectId, { scope, signal })
				});
			} catch (error) {
				logErrorInDev('[Timer] Reading the project billable setting failed:', error);
				return undefined;
			}
		},
		[queryClient]
	);

	return useCallback(
		async (task: TTask | null | undefined): Promise<boolean> => {
			if (!task) {
				return false;
			}
			const choices = store.get(timerBillableChoicesState);
			const picked = pickedBillableOf(task, choices);
			if (picked !== undefined) {
				return picked;
			}
			if (!task.projectId) {
				return false;
			}

			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const projectsKey = queryKeys.organizationProjects.byScope(tenantId, organizationId);
			const projectsPage = queryClient.getQueryData<PaginationResponse<TOrganizationProject>>(projectsKey);
			const projects = projectsPage?.items ?? NO_PROJECTS;
			const cachedProject = findTaskProject(task, projects);
			if (cachedProject) {
				return cachedProject.billable === true;
			}
			const fetchedProject = await fetchProject(task.projectId, tenantId, organizationId);
			return fetchedProject?.billable === true;
		},
		[fetchProject, queryClient, store]
	);
}

export function useTimerBillable() {
	const activeTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(timerStatusState);
	const [choices, setChoices] = useAtom(timerBillableChoicesState);
	const { organizationProjects } = useOrganizationProjectsQuery();

	const activeTaskId = activeTask?.id;
	const isTimerRunning = timerStatus?.running === true;
	const pickedBillable = timerBillableOf(activeTask, organizationProjects, choices);
	const runningLogBillable = timerStatus?.lastLog?.isBillable;
	const isBillable = displayedBillableOf(isTimerRunning, runningLogBillable, pickedBillable);
	const hasActiveTask = Boolean(activeTaskId);
	const isLocked = isTimerRunning || !hasActiveTask;

	const setIsBillable = useCallback(
		(nextIsBillable: boolean) => {
			if (!activeTaskId) {
				return;
			}
			setChoices((current) => ({ ...current, [activeTaskId]: nextIsBillable }));
		},
		[activeTaskId, setChoices]
	);

	return { isBillable, isLocked, setIsBillable };
}
