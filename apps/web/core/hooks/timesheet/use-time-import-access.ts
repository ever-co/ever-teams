'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useInvalidateTeamTasks } from '@/core/hooks/organizations/teams/use-invalidate-team-tasks';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import {
	timeImportMembersOf,
	timeImportProjectsOf,
	timeImportRefusalOf,
	timeImportTasksOf
} from '@/core/lib/utils/time-import-access';
import type { TimeImportContext, TimeImportSaveScope } from '@/core/lib/utils/time-import-rows';
import { queryKeys } from '@/core/query/keys';
import { activeTeamState, isFlaggedTeamManagerState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState, teamTasksCompleteState } from '@/core/stores/teams/team-tasks';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

const ACT_FOR_ANYONE_PERMISSION = 'CHANGE_SELECTED_EMPLOYEE';

/**
 * Who may import time, and what a file is judged against. Importing follows adding manual time: it needs the
 * `ALLOW_MANUAL_TIME` permission and the organization's `allowManualTime`, and time for another member needs what
 * the API asks to act for them (the manager flag in the team, or `CHANGE_SELECTED_EMPLOYEE`). Projects and tasks
 * are the active team's, the team the time is saved with.
 */
export function useTimeImportAccess() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const organization = useAtomValue(currentOrganizationState);
	const organizationRead = useGetCurrentOrganization({ enabled: true });
	const teamTasks = useAtomValue(tasksByTeamState);
	const areTasksComplete = useAtomValue(teamTasksCompleteState);
	const tasksLoad = useTeamTasksLoadState();
	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const isFlaggedManager = useAtomValue(isFlaggedTeamManagerState);
	const { isTeamManager } = useIsMemberManager(user);
	const {
		myPermissions,
		isLoading: isLoadingPermissions,
		isLoaded: arePermissionsLoaded
	} = useMyRolePermissionsQuery();

	const isReadingTasks = tasksLoad.isFirstLoad || tasksLoad.isLoadingMorePages;
	const isLoadingTasks = !areTasksComplete && isReadingTasks;
	// A task missing from an incomplete list would read as unknown, and a second task of the same name could hide
	const areTasksIncomplete = !areTasksComplete && !isReadingTasks;
	const hasOrganizationFailed = !organization && organizationRead.isError;
	const isLoadingOrganization = !organization && !organizationRead.isError;
	const havePermissionsFailed = !arePermissionsLoaded && !isLoadingPermissions;
	const isLoadingUser = !user;
	const isLoading = isLoadingUser || isLoadingPermissions || isLoadingOrganization || isLoadingTasks;
	const hasLoadFailed = hasOrganizationFailed || havePermissionsFailed || areTasksIncomplete;

	const refetchOrganization = organizationRead.refetch;
	const retryLoad = useCallback(() => {
		void refetchOrganization();
		void queryClient.invalidateQueries({ queryKey: queryKeys.roles.myPermissions(getTenantIdCookie()) });
		invalidateTeamTasksData();
	}, [invalidateTeamTasksData, queryClient, refetchOrganization]);

	const hasManualTimePermission = myPermissions.includes(MANUAL_TIME_PERMISSION);
	const allowsManualTime = organization?.allowManualTime !== false;
	const refusal = timeImportRefusalOf(allowsManualTime, hasManualTimePermission);

	const canActForAnyone = myPermissions.includes(ACT_FOR_ANYONE_PERMISSION);
	const canImportForOthers = isFlaggedManager || canActForAnyone;

	const teamId = activeTeam?.id ?? '';
	const members = useMemo(() => timeImportMembersOf(activeTeam), [activeTeam]);
	const projects = useMemo(() => timeImportProjectsOf(activeTeam), [activeTeam]);
	const tasks = useMemo(() => timeImportTasksOf(teamTasks, teamId), [teamId, teamTasks]);

	const allowsFutureDates = organization?.futureDateAllowed === true;
	const requiresProject = organization?.requireProject === true;
	const teamHasDefaultProject = Boolean(activeTeam?.defaultProjectId);
	const viewerEmployeeId = user?.employee?.id ?? null;
	const viewerEmail = user?.email ?? null;

	const contextAt = useCallback(
		(now: Date): TimeImportContext => ({
			now,
			allowsFutureDates,
			requiresProject,
			teamHasDefaultProject,
			viewerEmployeeId,
			viewerEmail,
			canImportForOthers,
			matchesEveryTeamTask: isTeamManager,
			members,
			projects,
			tasks
		}),
		[
			allowsFutureDates,
			canImportForOthers,
			isTeamManager,
			members,
			projects,
			requiresProject,
			tasks,
			teamHasDefaultProject,
			viewerEmail,
			viewerEmployeeId
		]
	);

	const tenantId = user?.tenantId ?? '';
	const teamOrganizationId = activeTeam?.organizationId ?? null;
	const saveScope = useMemo<TimeImportSaveScope>(
		() => ({ tenantId, organizationId: teamOrganizationId, organizationTeamId: teamId }),
		[teamId, teamOrganizationId, tenantId]
	);

	return {
		isLoading,
		hasLoadFailed,
		retryLoad,
		refusal,
		canImportForOthers,
		matchesEveryTeamTask: isTeamManager,
		teamName: activeTeam?.name ?? '',
		organizationName: organization?.name ?? '',
		contextAt,
		saveScope
	};
}

export type TimeImportAccess = ReturnType<typeof useTimeImportAccess>;
