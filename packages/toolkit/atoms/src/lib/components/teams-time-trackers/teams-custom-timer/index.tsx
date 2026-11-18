'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type { TeamsCustomBaseTimerProps } from './timer';
import BaseAtom from './timer';
import { KitNotice } from '../../teams-ui-components/kit-notice';

import { useTimerControl } from '../common/use-timer-control';

export interface TeamsCustomTimerProps extends Omit<TeamsCustomBaseTimerProps, 'time' | 'progress'> {
	progress?: boolean;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsCustomTimer({ progress, ...props }: Readonly<TeamsCustomTimerProps>) {
	// Timer hook - self-contained, fetches all dependencies internally
	const control = useTimerControl(props.caption);
	const ActionButton = control.isRunning ? Pause : Play;

	return (
		<>
			<BaseAtom
				{...control.action}
				{...props}
				caption={control.caption}
				{...control.state}
				{...(progress && { progress: (control.seconds / 100) * 60 })}
				customButtonIcon={<ActionButton />}
			/>
			{control.description}
			<KitNotice />
		</>
	);
}
