import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { TeamsTimerClientSelect } from '@components/teams-ui-components/inputs/timer-selects/teams-timer-client-select';
import { TeamsTimerProjectSelect } from '@components/teams-ui-components/inputs/timer-selects/teams-timer-project-select';
import { TeamsTimerTaskSelect } from '@components/teams-ui-components/inputs/timer-selects/teams-timer-task-select';
import { TeamsTimerTeamSelect } from '@components/teams-ui-components/inputs/timer-selects/teams-timer-team-select';

const TeamsTimerForm = ({
	size,
	isTimerRunning,
	currentTeamsState,
	setCurrentTeamsState
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	isTimerRunning?: boolean;
	currentTeamsState: ICurrentTeamsState;
	setCurrentTeamsState: React.Dispatch<React.SetStateAction<ICurrentTeamsState>>;
}) => {
	return (
		<div className=" flex flex-col gap-3 text-black dark:text-white ">
			<TeamsTimerClientSelect
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				size={size}
				isTimerRunning={isTimerRunning}
			/>
			<TeamsTimerProjectSelect
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				size={size}
				isTimerRunning={isTimerRunning}
			/>
			<TeamsTimerTeamSelect
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				size={size}
				isTimerRunning={isTimerRunning}
			/>
			<TeamsTimerTaskSelect
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				size={size}
				isTimerRunning={isTimerRunning}
			/>
		</div>
	);
};

export { TeamsTimerForm };
