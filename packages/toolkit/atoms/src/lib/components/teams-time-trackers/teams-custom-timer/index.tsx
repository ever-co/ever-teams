'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type { TeamsCustomBaseTimerProps } from './timer';
import BaseAtom from './timer';

import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';
import { useId } from 'react';
import { TimerDescription } from '../common/timer-description';

export interface TeamsCustomTimerProps extends Omit<TeamsCustomBaseTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsCustomTimer({ progress, ...props }: Readonly<TeamsCustomTimerProps>) {
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

	const ActionButton = isRunning ? Pause : Play;

	return (
		<>
			<BaseAtom
				onClick={isRunning ? stopTimer : startTimer}
				aria-label={timerActionLabel}
				aria-describedby={timeId}
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
			<TimerDescription id={timeId} hours={hours} minutes={minutes} seconds={seconds} />
		</>
	);
}
