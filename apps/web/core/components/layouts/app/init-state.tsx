import { DISABLE_AUTO_REFRESH } from '@/core/constants/config/constants';

import { useTimeLogsDailyReport } from '@/core/hooks/activities/time-logs/use-time-logs-daily-report';
import { publicState, userState } from '@/core/stores';
// import { useSyncLanguage } from 'ni18n';
import { useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTimer, useSyncTimer } from '@/core/hooks/activities';
import { useLanguageSettings, useRefreshIntervalV2, useOTRefreshInterval, useCallbackRef } from '@/core/hooks/common';
import { useDailyPlan } from '@/core/hooks/daily-plans';
import {
	useOrganizationTeams,
	useTeamTasks,
	useTeamInvitations,
	useOrganizationProjects,
	useEmployee
} from '@/core/hooks/organizations';
import { useWorkspaces, useCurrentOrg } from '@/core/hooks/auth';
import { useRoles } from '@/core/hooks/roles';
import {
	useTaskStatistics,
	useAutoAssignTask,
	useTaskStatus,
	useTaskVersion,
	useTaskPriorities,
	useTaskSizes,
	useTaskLabels,
	useIssueType,
	useTaskRelatedIssueType
} from '@/core/hooks/tasks';
import { useTimeLogs } from '@/core/hooks/activities/time-logs/use-time-logs';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';

export function AppState() {
	const user = useAtomValue(userState);

	// const { currentLanguage } = useLanguage();
	// useSyncLanguage(currentLanguage);
	return <>{user && <InitState />}</>;
}

function InitState() {
	const publicTeam = useAtomValue(publicState);
	const { loadTeamsData, firstLoadTeamsData } = useOrganizationTeams();
	const { firstLoadTasksData, loadTeamTasksData } = useTeamTasks();
	const { firstLoadTeamInvitationsData, myInvitations } = useTeamInvitations();
	const { getTimerStatus, firstLoadTimerData } = useTimer();
	const { firstLoadtasksStatisticsData } = useTaskStatistics();
	const { loadLanguagesData, firstLoadLanguagesData } = useLanguageSettings();
	const { firstLoadOrganizationProjectsData } = useOrganizationProjects();
	const { firstLoadData: firstLoadAutoAssignTask } = useAutoAssignTask();
	const { firstLoadRolesData } = useRoles();
	const { firstLoadTaskStatusesData, loadTaskStatuses: loadTaskStatusesData } = useTaskStatus();

	// Load workspaces data on app initialization
	const { firstLoadWorkspacesData } = useWorkspaces();

	// Current organization management and validation
	const { validateCurrentOrgAccess, handleOrgBranching } = useCurrentOrg();

	const { firstLoadTaskVersionData, loadTaskVersionData } = useTaskVersion();
	const { firstLoadTaskPrioritiesData, loadTaskPriorities } = useTaskPriorities();
	const { firstLoadTaskSizesData, loadTaskSizes } = useTaskSizes();
	const { firstLoadTaskLabelsData, loadTaskLabels } = useTaskLabels();
	const { firstLoadIssueTypeData } = useIssueType();
	const { firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData } = useTaskRelatedIssueType();

	const { firstLoadDailyPlanData, loadAllDayPlans, loadMyDailyPlans, loadEmployeeDayPlans } = useDailyPlan();

	const { firstLoadDataEmployee } = useEmployee();

	// Load time logs / daily report for the current year (global state)
	useTimeLogsDailyReport();
	// Load time logs for the current year (global state)
	useTimeLogs();
	// Load current organization
	useGetCurrentOrganization();

	useOneTimeLoad(() => {
		//To be called once, at the top level component (e.g main.tsx | _app.tsx);

		// Load workspaces first as they're fundamental to the app
		firstLoadWorkspacesData();

		// Load other data
		firstLoadTeamsData();
		firstLoadTasksData();
		firstLoadTeamInvitationsData();
		firstLoadTimerData();
		firstLoadtasksStatisticsData();
		firstLoadLanguagesData();
		firstLoadAutoAssignTask();
		firstLoadOrganizationProjectsData();
		firstLoadTaskStatusesData();
		firstLoadTaskVersionData();
		firstLoadTaskPrioritiesData();
		firstLoadTaskSizesData();
		firstLoadTaskLabelsData();
		firstLoadIssueTypeData();
		firstLoadTaskRelatedIssueTypeData();
		firstLoadDailyPlanData();
		firstLoadDataEmployee();
		firstLoadRolesData();
		// --------------

		getTimerStatus();
		loadTeamsData();
		loadLanguagesData();

		// Perform organization access validation (non-blocking)
		// This runs after initial data loading to avoid blocking the app startup
		setTimeout(async () => {
			try {
				const validationResult = await validateCurrentOrgAccess();
				console.log('InitState Organization Validation Result:', validationResult);

				// Handle validation results (non-blocking, informational only)
				if (!validationResult.isValid) {
					console.warn('InitState: Organization access validation failed', {
						reason: validationResult.reason,
						suggestedAction: validationResult.action,
						redirectTo: validationResult.redirectTo
					});

					// Note: We don't automatically redirect here to avoid breaking existing flows
					// The validation is primarily for logging and future enhancements
				}

				// Also run branching logic for informational purposes
				const branchingResult = handleOrgBranching();
				console.log('InitState Organization Branching Result:', branchingResult);
			} catch (error) {
				console.error('InitState: Non-critical validation error', error);
				// Don't throw - this is non-blocking validation
			}
		}, 2000); // Run after 2 seconds to allow initial loading to complete
	});

	const AutoRefresher = useMemo(() => {
		const five_minutes = 1000 * 60 * 5; // in milliseconds
		const one_minute = 1000 * 60; // in milliseconds

		// eslint-disable-next-line react/no-unstable-nested-components
		const Component = () => {
			useSyncTimer();

			/**
			 * Refresh Timer Running status,
			 * This will sync timer in all the open tabs
			 */
			useRefreshIntervalV2(getTimerStatus, one_minute);

			/**
			 * Refresh Teams data every 5 seconds.
			 *
			 * So that if Team is deleted by manager it updates the UI accordingly
			 */
			useOTRefreshInterval(loadTeamsData, one_minute, publicTeam);
			// Refresh tasks with a deep compare
			useRefreshIntervalV2(loadTeamTasksData, one_minute, true /* used as loadTeamTasksData deepCheck param */);

			// Timer status
			// useRefreshIntervalV2(
			// 	getTimerStatus,
			// 	5000,
			// 	true /* used as getTimerStatus deepCheck param */
			// );

			useRefreshIntervalV2(myInvitations, 60 * 1000, true /* used as loadTeamTasksData deepCheck param */);

			useRefreshIntervalV2(loadTaskStatusesData, five_minutes, true);
			useRefreshIntervalV2(loadTaskPriorities, five_minutes, true);
			useRefreshIntervalV2(loadTaskSizes, five_minutes, true);
			useRefreshIntervalV2(loadTaskLabels, five_minutes, true);
			useRefreshIntervalV2(loadTaskRelatedIssueTypeData, five_minutes, true);
			useRefreshIntervalV2(loadTaskVersionData, five_minutes, true);

			useRefreshIntervalV2(loadAllDayPlans, five_minutes, true);
			useRefreshIntervalV2(loadMyDailyPlans, five_minutes, true);
			useRefreshIntervalV2(loadEmployeeDayPlans, five_minutes, true);

			return <></>;
		};
		return Component;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return !DISABLE_AUTO_REFRESH.value ? <AutoRefresher /> : <></>;
}

function useOneTimeLoad(func: () => void) {
	const funcRef = useCallbackRef(func);

	useEffect(() => {
		funcRef.current && funcRef.current();
	}, [funcRef]);
}
