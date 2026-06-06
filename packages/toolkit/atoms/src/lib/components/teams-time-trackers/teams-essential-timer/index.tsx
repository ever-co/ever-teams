/** @jsxImportSource theme-ui */

'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type TeamsBasicTimer from './timer';
import BaseAtom from './timer';
import { useTeamsContext } from '@lib/context/teams-context';
import { TimeFormat } from '@lib/constants';
import { useTimer } from '@hooks/useTimer';

export interface TeamsEssentialTimerProps extends Omit<TeamsBasicTimer, 'time' | 'progress'> {
	progress?: boolean;
	format?: TimeFormat;
	separator?: string;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsEssentialTimer({ progress, ...props }: Readonly<TeamsEssentialTimerProps>) {
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
