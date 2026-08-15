/** @jsxImportSource theme-ui */
'use client';

import type { BasicTimerProps } from './timer';
import BaseAtom from './timer';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';

export interface TeamsBasicTimerProps extends Omit<BasicTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsBasicTimer({ progress, ...props }: TeamsBasicTimerProps) {
	const { authenticatedUser } = useTeamsContext();

	// Timer hook - self-contained, fetches all dependencies internally
	const {
		todayTrackedTime: { hours, minutes, seconds, totalSeconds },
		startTimer,
		stopTimer,
		isRunning,
		timerLoading
	} = useTimer();

	return (
		<BaseAtom
			onClick={isRunning ? stopTimer : startTimer}
			{...props}
			isRunning={isRunning}
			{...(progress && { progress: (seconds / 100) * 60 })}
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
