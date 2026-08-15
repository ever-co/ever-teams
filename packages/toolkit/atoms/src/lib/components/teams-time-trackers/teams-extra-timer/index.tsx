'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type { TeamsExtraBaseTimerProps } from './timer';
import BaseAtom from './timer';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';

export interface TeamsExtraTimerProps extends Omit<TeamsExtraBaseTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsExtraTimer({ progress, ...props }: Readonly<TeamsExtraTimerProps>) {
	const { authenticatedUser } = useTeamsContext();

	// Timer hook - self-contained, fetches all dependencies internally
	const {
		todayTrackedTime: { hours, minutes, seconds, totalSeconds },
		startTimer,
		stopTimer,
		isRunning,
		timerLoading
	} = useTimer();

	const ActionButton = isRunning ? Pause : Play;

	return (
		<BaseAtom
			onClick={isRunning ? stopTimer : startTimer}
			{...props}
			isRunning={isRunning}
			{...(progress && { progress: (seconds / 100) * 60 })}
			customButtonIcon={<ActionButton />}
			time={{
				hours,
				minutes,
				seconds,
				totalSeconds
			}}
			disabled={timerLoading || !authenticatedUser}
		/>
	);
}
