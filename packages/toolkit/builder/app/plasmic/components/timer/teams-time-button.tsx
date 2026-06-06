import { TeamsButton, useTimer } from '@ever-teams/atoms';

interface IBasicTeamsButton {
	size: 'default' | 'sm' | 'lg';
}
export function BasicTeamsButton({ size }: IBasicTeamsButton) {
	const { isRunning, startTimer, stopTimer, timerLoading } = useTimer();
	return (
		<TeamsButton
			isRunning={isRunning}
			startTimer={startTimer}
			stopTimer={stopTimer}
			timerLoading={timerLoading}
			size={size == 'sm' ? 'sm' : 'default'}
		/>
	);
}
