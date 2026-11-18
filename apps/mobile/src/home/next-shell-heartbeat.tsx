import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerRunningTimeWriter } from '../../app/services/hooks/running-time-writer';
import type { RunningTimeWriter } from '../../app/services/hooks/running-time-writer';
import { queryClient } from '../data/query-client';
import { NEXT_SHELL_BUILD } from '../navigation/next-shell-build';
import { runIdOf, writeRunTimeBeforeStop } from './heartbeat';
import { RunHeartbeat } from './run-heartbeat';

/**
 * What the current screens' start and stop tell the new heartbeat. A start or a stop makes it read the timer at once,
 * instead of at its next read: it follows a run they started from then on, and lets go of one they stopped. Before
 * their stop, the time since its last write of that run is written, as the new Home's stop does, so a run's last
 * minute, or a run shorter than one, is written too, and once.
 */
export const heartbeatOfTheCurrentScreens: RunningTimeWriter = {
	async beforeStop(run, write) {
		try {
			await writeRunTimeBeforeStop(write, runIdOf(run));
		} catch {
			// the run's time up to the last heartbeat is written; the stop goes on
		}
	},
	afterChange() {
		void queryClient.invalidateQueries({ queryKey: ['home', 'timer-status'] });
	}
};

function NewHeartbeat() {
	useEffect(() => registerRunningTimeWriter(heartbeatOfTheCurrentScreens), []);
	return (
		<QueryClientProvider client={queryClient}>
			<RunHeartbeat />
		</QueryClientProvider>
	);
}

/**
 * In builds of the new app, its heartbeat writes the running time wherever the signed-in person is, as before the
 * switch. The current screens' five-second write stays out of those builds, so the same time is written once; their
 * start and stop tell the heartbeat (heartbeatOfTheCurrentScreens).
 */
export function NextShellHeartbeat() {
	if (!NEXT_SHELL_BUILD) {
		return null;
	}
	return <NewHeartbeat />;
}
