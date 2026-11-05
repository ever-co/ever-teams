'use client';

import { useAtom, useAtomValue, useStore } from 'jotai';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { findTaskProject, pickedBillableOf, timerBillableOf } from '@/core/lib/helpers/timer-billable';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';
import { queryKeys } from '@/core/query/keys';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { activeTeamTaskState, timerBillableChoicesState, timerStatusState } from '@/core/stores';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { useOrganizationProjectsQuery } from '../organizations/projects/use-organization-projects-query';

const NO_PROJECTS: TOrganizationProject[] = [];

/** One read of a project for the start and the switch alike, so both land in the same cache entry. */
function projectQueryOptions(projectId: string, tenantId: string, organizationId: string) {
	const accessToken = getAccessTokenCookie();
	const scope = { tenantId, organizationId, accessToken };
	return {
		queryKey: queryKeys.organizationProjects.detailByScope(tenantId, organizationId, projectId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }: { signal: AbortSignal }) =>
			organizationProjectService.getOrganizationProject(projectId, { scope, signal })
	};
}

function projectsWithUnlisted(
	projects: TOrganizationProject[],
	unlistedProject: TOrganizationProject | undefined
): TOrganizationProject[] {
	if (!unlistedProject) {
		return projects;
	}
	return [...projects, unlistedProject];
}

/** The task's project when the projects list does not hold it, to read on its own. */
function unlistedProjectIdOf(task: TTask | null | undefined, projects: TOrganizationProject[]): string | undefined {
	if (!task?.projectId) {
		return undefined;
	}
	const listedProject = findTaskProject(task, projects);
	if (listedProject) {
		return undefined;
	}
	return task.projectId;
}

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
			try {
				return await queryClient.fetchQuery(projectQueryOptions(projectId, tenantId, organizationId));
			} catch (error) {
				logErrorInDev('[Timer] Reading the project billable setting failed:', error);
				// A project that no longer exists bills nothing; any other failure leaves the value unknown.
				return errorStatusOf(error) === 404 ? null : undefined;
			}
		},
		[queryClient]
	);

	// `undefined` means the project could not be read: the caller must not start with a guessed billable value.
	return useCallback(
		async (task: TTask | null | undefined): Promise<boolean | undefined> => {
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
			if (fetchedProject === undefined) {
				return undefined;
			}
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
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const accessToken = useReactiveAccessTokenCookie();
	const unlistedProjectId = unlistedProjectIdOf(activeTask, organizationProjects);
	const hasProjectToRead = Boolean(unlistedProjectId);
	const hasWorkspace = Boolean(tenantId && organizationId);
	const isSignedIn = Boolean(accessToken);
	const readsUnlistedProject = hasProjectToRead && hasWorkspace && isSignedIn;
	const unlistedProjectQuery = useQuery({
		...projectQueryOptions(unlistedProjectId ?? '', tenantId, organizationId),
		enabled: readsUnlistedProject
	});
	const knownProjects = projectsWithUnlisted(organizationProjects, unlistedProjectQuery.data);

	const activeTaskId = activeTask?.id;
	const isTimerRunning = timerStatus?.running === true;
	const pickedBillable = timerBillableOf(activeTask, knownProjects, choices);
	const runningLogBillable = timerStatus?.lastLog?.isBillable;
	const isBillable = displayedBillableOf(isTimerRunning, runningLogBillable, pickedBillable);
	const hasActiveTask = Boolean(activeTaskId);
	// Until the task's project is read, the switch shows off while a start would send that project's value
	const isReadingProject = readsUnlistedProject && unlistedProjectQuery.isPending;
	const isLocked = isTimerRunning || !hasActiveTask || isReadingProject;

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
