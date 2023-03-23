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
} from '@app/hooks';
import { userState } from '@app/stores';
import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';

export function AppState() {
	const user = useRecoilValue(userState);

	return <>{user && <InitState />}</>;
}

function InitState() {
	const { loadTeamsData, firstLoadTeamsData } = useOrganizationTeams();
	const { firstLoadTasksData } = useTeamTasks();
	const { firstLoadTeamInvitationsData } = useTeamInvitations();
	const { getTimerStatus, firstLoadTimerData } = useTimer();
	const { firstLoadtasksStatisticsData } = useTaskStatistics();
	const { loadLanguagesData, firstLoadLanguagesData } = useLanguageSettings();

	const { firstLoadData: firstLoadAutoAssignTask } = useAutoAssignTask();

	const { firstLoadTaskStatusData } = useTaskStatus();
	const { firstLoadTaskPrioritiesData } = useTaskPriorities();
	const { firstLoadTaskSizesData } = useTaskSizes();

	useEffect(() => {
		//To be called once, at the top level component (e.g main.tsx | _app.tsx);
		firstLoadTeamsData();
		firstLoadTasksData();
		firstLoadTeamInvitationsData();
		firstLoadTimerData();
		firstLoadtasksStatisticsData();
		firstLoadLanguagesData();
		firstLoadAutoAssignTask();

		firstLoadTaskStatusData();
		firstLoadTaskPrioritiesData();
		firstLoadTaskSizesData();
		// --------------

		getTimerStatus();
		loadTeamsData();
		loadLanguagesData();
	}, [
		firstLoadTasksData,
		firstLoadTeamInvitationsData,
		firstLoadTeamsData,
		loadTeamsData,
		getTimerStatus,
		firstLoadTimerData,
		firstLoadtasksStatisticsData,
		firstLoadLanguagesData,
		loadLanguagesData,
		firstLoadAutoAssignTask,
		firstLoadTaskStatusData,
		firstLoadTaskPrioritiesData,
		firstLoadTaskSizesData,
	]);
	return <></>;
}
