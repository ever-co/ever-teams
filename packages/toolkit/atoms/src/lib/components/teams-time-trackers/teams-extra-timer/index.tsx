'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type { TeamsExtraBaseTimerProps } from './timer';
import BaseAtom from './timer';
import { useTimerControl } from '../common/use-timer-control';

export interface TeamsExtraTimerProps extends Omit<TeamsExtraBaseTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsExtraTimer({ progress, ...props }: Readonly<TeamsExtraTimerProps>) {
	// Timer hook - self-contained, fetches all dependencies internally
	const control = useTimerControl();
	const ActionButton = control.isRunning ? Pause : Play;

	return (
		<>
			<BaseAtom
				{...control.action}
				{...props}
				{...control.state}
				{...(progress && { progress: (control.seconds / 100) * 60 })}
				customButtonIcon={<ActionButton />}
			/>
			{control.description}
		</>
	);
}
