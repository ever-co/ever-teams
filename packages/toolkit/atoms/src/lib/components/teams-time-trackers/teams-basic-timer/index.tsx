/** @jsxImportSource theme-ui */
'use client';

import type { BasicTimerProps } from './timer';
import BaseAtom from './timer';
import { useTimerControl } from '../common/use-timer-control';

export interface TeamsBasicTimerProps extends Omit<BasicTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsBasicTimer({ progress, ...props }: TeamsBasicTimerProps) {
	// Timer hook - self-contained, fetches all dependencies internally
	const control = useTimerControl();
	return (
		<>
			<BaseAtom
				{...control.action}
				{...props}
				{...control.state}
				{...(progress && { progress: (control.seconds / 100) * 60 })}
			/>
			{control.description}
		</>
	);
}
