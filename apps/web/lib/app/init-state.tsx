import { DISABLE_AUTO_REFRESH } from '@app/constants';
import {
	useAutoAssignTask,
	useCallbackRef,
	useIssueType,
	useLanguage,
	useLanguageSettings,
	useOTRefreshInterval,
	useOrganizationTeams,
	useRefreshInterval,
	useSyncTimer,
	useTaskLabels,
	useTaskPriorities,
	useTaskRelatedIssueType,
	useTaskSizes,
	useTaskStatistics,
	useTaskStatus,
	useTaskVersion,
	useTeamInvitations,
	useTeamTasks,
	useTimer,
	useHealthCheck
} from '@app/hooks';
import { publicState, userState } from '@app/stores';
import { useSyncLanguage } from 'ni18n';
import { useEffect, useMemo } from 'react';
import { useRecoilValue } from 'recoil';

export function AppState() {
	const user = useRecoilValue(userState);

	const { currentLanguage } = useLanguage();
	useSyncLanguage(currentLanguage);
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
	const { firstLoadTaskPrioritiesData, loadTaskPriorities } = useTaskPriorities();
	const { firstLoadTaskSizesData, loadTaskSizes } = useTaskSizes();
	const { firstLoadTaskLabelsData, loadTaskLabels } = useTaskLabels();
	const { firstLoadIssueTypeData } = useIssueType();
	const { firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData } = useTaskRelatedIssueType();
	const { getHealthCheck } = useHealthCheck();

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

	const AutoRefresher = useMemo(() => {
		const sixty_two_seconds = 1000 * 62;
		const five_seconds = 1000 * 5;

		// eslint-disable-next-line react/no-unstable-nested-components
		const Component = () => {
			useSyncTimer();

			/**
			 * Refresh Timer Running status,
			 * This will sync timer in all the open tabs
			 */
			useRefreshInterval(getTimerStatus, five_seconds);

			/**
			 * Refresh Teams data every 5 seconds.
			 *
			 * So that if Team is deleted by manager it updates the UI accordingly
			 */
			useOTRefreshInterval(loadTeamsData, five_seconds, publicTeam);
			// Refresh tasks with a deep compare
			useRefreshInterval(loadTeamTasksData, five_seconds, true /* used as loadTeamTasksData deepCheck param */);

			useOTRefreshInterval(getHealthCheck, five_seconds, false);

			// Timer status
			// useRefreshInterval(
			// 	getTimerStatus,
			// 	5000,
			// 	true /* used as getTimerStatus deepCheck param */
			// );

			useRefreshInterval(myInvitations, 10 * 1000, true /* used as loadTeamTasksData deepCheck param */);

			useRefreshInterval(loadTaskStatusData, sixty_two_seconds, true);
			useRefreshInterval(loadTaskPriorities, sixty_two_seconds, true);
			useRefreshInterval(loadTaskSizes, sixty_two_seconds, true);
			useRefreshInterval(loadTaskLabels, sixty_two_seconds, true);
			useRefreshInterval(loadTaskRelatedIssueTypeData, sixty_two_seconds, true);
			useRefreshInterval(loadTaskVersionData, sixty_two_seconds, true);

			return <></>;
		};
		return Component;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return DISABLE_AUTO_REFRESH !== true ? <AutoRefresher /> : <></>;
}

function useOneTimeLoad(func: () => void) {
	const funcRef = useCallbackRef(func);

	useEffect(() => {
		funcRef.current && funcRef.current();
	}, [funcRef]);
}
