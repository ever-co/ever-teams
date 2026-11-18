/** @jsxImportSource theme-ui */

'use client';

import Pause from '../common/pause';
import Play from '../common/play';
import type TeamsBasicTimer from './timer';
import BaseAtom from './timer';
import { KitNotice } from '../../teams-ui-components/kit-notice';
import { TimeFormat } from '@lib/constants';
import { useTimerControl } from '../common/use-timer-control';

export interface TeamsEssentialTimerProps extends Omit<TeamsBasicTimer, 'time' | 'progress'> {
	progress?: boolean;
	format?: TimeFormat;
	separator?: string;
}

// TODO: Must move this to Atoms and integrate with gauzy api
export function TeamsEssentialTimer({ progress, ...props }: Readonly<TeamsEssentialTimerProps>) {
	// Timer hook - self-contained, fetches all dependencies internally
	const control = useTimerControl(props.caption);
	const ActionButton = control.isRunning ? Pause : Play;

	return (
		<>
			<BaseAtom
				{...control.action}
				{...control.defaults}
				{...props}
				{...control.state}
				{...(progress && { progress: (control.seconds / 100) * 60 })}
				customButtonIcon={<ActionButton />}
			/>
			{control.description}
			<KitNotice />
		</>
	);
}
