import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { useTeamInvitations } from '@app/hooks/features/useTeamInvitations';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import { useTimer } from '@app/hooks/features/useTimer';
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

	useEffect(() => {
		//To be called once, at the top level component (e.g main.tsx);
		firstLoadTeamsData();
		firstLoadTasksData();
		firstLoadTeamInvitationsData();
		firstLoadTimerData();
		firstLoadtasksStatisticsData();
		// --------------

		getTimerStatus();
		loadTeamsData();
	}, [
		firstLoadTasksData,
		firstLoadTeamInvitationsData,
		firstLoadTeamsData,
		loadTeamsData,
		getTimerStatus,
		firstLoadTimerData,
		firstLoadtasksStatisticsData,
	]);
	return <></>;
}
