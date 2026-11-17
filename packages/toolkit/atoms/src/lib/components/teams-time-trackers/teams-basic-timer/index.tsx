/** @jsxImportSource theme-ui */
'use client';

import type { BasicTimerProps } from './timer';
import BaseAtom from './timer';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';
import { useId } from 'react';
import { TimerDescription } from '../common/timer-description';

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
		timerActionLabel,
		stopTimer,
		isRunning,
		timerLoading
	} = useTimer();
	const timeId = useId();

	return (
		<>
			<BaseAtom
				onClick={isRunning ? stopTimer : startTimer}
				aria-label={timerActionLabel}
				aria-describedby={timeId}
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
			<TimerDescription id={timeId} hours={hours} minutes={minutes} seconds={seconds} />
		</>
	);
}
