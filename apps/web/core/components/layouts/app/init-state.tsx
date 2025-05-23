import { DISABLE_AUTO_REFRESH } from '@/core/constants/config/constants';

import { useTimeLogs } from '@/core/hooks/activities/use-time-logs';
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
	const { firstLoadTaskVersionData, loadTaskVersionData } = useTaskVersion();
	const { firstLoadTaskPrioritiesData, loadTaskPriorities } = useTaskPriorities();
	const { firstLoadTaskSizesData, loadTaskSizes } = useTaskSizes();
	const { firstLoadTaskLabelsData, loadTaskLabels } = useTaskLabels();
	const { firstLoadIssueTypeData } = useIssueType();
	const { firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData } = useTaskRelatedIssueType();

	const { firstLoadDailyPlanData, loadAllDayPlans, loadMyDailyPlans, loadEmployeeDayPlans } = useDailyPlan();
	const { firstLoadTimeLogs } = useTimeLogs();

	const { firstLoadDataEmployee } = useEmployee();

	useOneTimeLoad(() => {
		//To be called once, at the top level component (e.g main.tsx | _app.tsx);
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
		firstLoadTimeLogs();
		firstLoadDataEmployee();
		firstLoadRolesData();
		// --------------

		getTimerStatus();
		loadTeamsData();
		loadLanguagesData();
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
