import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerRunningTimeWriter } from '../../app/services/hooks/running-time-writer';
import type { RunningTimeWriter } from '../../app/services/hooks/running-time-writer';
import { queryClient } from '../data/query-client';
import { NEXT_SHELL_BUILD } from '../navigation/next-shell-build';
import { followRun, forgetRun, runIdOf, writeRunTimeBeforeStop } from './heartbeat';
import { RunHeartbeat } from './run-heartbeat';

function readTheTimerAgain(): void {
	void queryClient.invalidateQueries({ queryKey: ['home', 'timer-status'] });
}

/**
 * What the current screens' start and stop tell the new heartbeat. It follows a run they started from the start's
 * answer, not from its next read of the timer, which it makes at once. Before their stop, the time since its last write
 * of that run is written, as the new Home's stop does, so a run's last minute, or a run shorter than one, is written
 * too, and once. After their stop it lets go of the run the API stopped, so no heartbeat writes it again before the
 * next read of the timer, which it makes at once.
 */
export const heartbeatOfTheCurrentScreens: RunningTimeWriter = {
	afterStart(run) {
		const runId = runIdOf(run);
		if (runId) {
			followRun(runId, Date.now());
		}
		readTheTimerAgain();
	},
	async beforeStop(run, write) {
		try {
			await writeRunTimeBeforeStop(write, runIdOf(run));
		} catch {
			// the run's time up to the last heartbeat is written; the stop goes on
		}
	},
	afterStop(stoppedRun) {
		const runId = runIdOf(stoppedRun);
		if (runId) {
			forgetRun(runId);
		}
		readTheTimerAgain();
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
