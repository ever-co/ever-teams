import {
	useLanguageSettings,
	useOrganizationTeams,
	useTaskStatistics,
	useTeamInvitations,
	useTeamTasks,
	useTimer,
	useAutoAssignTask,
	useTaskStatus,
	useTaskPriorities,
	useTaskSizes,
	useTaskLabels,
	useOTRefreshInterval,
	useIssueType,
	useRefreshInterval,
	useCallbackRef,
	useSyncTimer,
	useTaskRelatedIssueType,
	useTaskVersion,
} from '@app/hooks';
import { publicState, userState } from '@app/stores';
import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';

export function AppState() {
	const user = useRecoilValue(userState);

	return <>{user && <InitState />}</>;
}

function InitState() {
	const publicTeam = useRecoilValue(publicState);
	const { loadTeamsData, firstLoadTeamsData } = useOrganizationTeams();
	const { firstLoadTasksData, loadTeamTasksData } = useTeamTasks();
	const { firstLoadTeamInvitationsData, myInvitations } = useTeamInvitations();
	const { getTimerStatus, firstLoadTimerData } = useTimer();
	const { firstLoadtasksStatisticsData } = useTaskStatistics();
	const { loadLanguagesData, firstLoadLanguagesData } = useLanguageSettings();

	const { firstLoadData: firstLoadAutoAssignTask } = useAutoAssignTask();

	const { firstLoadTaskStatusData, loadTaskStatusData } = useTaskStatus();
	const { firstLoadTaskVersionData, loadTaskVersionData } = useTaskVersion();
	const { firstLoadTaskPrioritiesData, loadTaskPriorities } =
		useTaskPriorities();
	const { firstLoadTaskSizesData, loadTaskSizes } = useTaskSizes();
	const { firstLoadTaskLabelsData, loadTaskLabels } = useTaskLabels();
	const { firstLoadIssueTypeData } = useIssueType();
	const { firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData } =
		useTaskRelatedIssueType();

	useOneTimeLoad(() => {
		//To be called once, at the top level component (e.g main.tsx | _app.tsx);
		firstLoadTeamsData();
		firstLoadTasksData();
		firstLoadTeamInvitationsData();
		firstLoadTimerData();
		firstLoadtasksStatisticsData();
		firstLoadLanguagesData();
		firstLoadAutoAssignTask();

		firstLoadTaskStatusData();
		firstLoadTaskVersionData();
		firstLoadTaskPrioritiesData();
		firstLoadTaskSizesData();
		firstLoadTaskLabelsData();
		firstLoadIssueTypeData();
		firstLoadTaskRelatedIssueTypeData();
		// --------------

		getTimerStatus();
		loadTeamsData();
		loadLanguagesData();
	});

	useSyncTimer();

	/**
	 * Refresh Timer Running status,
	 * This will sync timer in all the open tabs
	 */
	useRefreshInterval(getTimerStatus, 5000);

	/**
	 * Refresh Teams data every 5 seconds.
	 *
	 * So that if Team is deleted by manager it updates the UI accordingly
	 */
	useOTRefreshInterval(loadTeamsData, 5000, publicTeam);
	// Refresh tasks with a deep compare
	useRefreshInterval(
		loadTeamTasksData,
		5000,
		true /* used as loadTeamTasksData deepCheck param */
	);

	// Timer status
	// useRefreshInterval(
	// 	getTimerStatus,
	// 	5000,
	// 	true /* used as getTimerStatus deepCheck param */
	// );

	useRefreshInterval(
		myInvitations,
		5000,
		true /* used as loadTeamTasksData deepCheck param */
	);

	useRefreshInterval(loadTaskStatusData, 5000, true);
	useRefreshInterval(loadTaskPriorities, 5000, true);
	useRefreshInterval(loadTaskSizes, 5000, true);
	useRefreshInterval(loadTaskLabels, 5000, true);
	useRefreshInterval(loadTaskRelatedIssueTypeData, 5000, true);
	useRefreshInterval(loadTaskVersionData, 5000, true);

	return <></>;
}

function useOneTimeLoad(func: () => void) {
	const funcRef = useCallbackRef(func);

	useEffect(() => {
		funcRef.current && funcRef.current();
	}, [funcRef]);
}
