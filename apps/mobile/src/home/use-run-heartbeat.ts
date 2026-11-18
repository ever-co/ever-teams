import { useEffect, useRef } from 'react';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import { sendTimeSlot } from '../data/timer';
import { followRun, forgetRun, HEARTBEAT_MS, writeRunTime } from './heartbeat';
import { useEmployeeId, useSignedInSession, useTimerStatus } from './use-home-timer';

/**
 * While the timer runs, tells the API every minute how long it went on, as the web and the current app do. The time
 * slots it writes are what the worked-time totals and reports count; a heartbeat that fails is covered by the next,
 * and a stop writes the time since the last one (useStopTimer).
 */
export function useRunHeartbeat(): void {
	const session = useSignedInSession();
	// A renewal replaces the session object: the heartbeats go on with the renewed token, from where they were
	const sessionRef = useRef(session);
	sessionRef.current = session;
	const signedIn = session !== undefined;
	const status = useTimerStatus();
	const employeeId = useEmployeeId().data;
	const running = status.data?.running === true;
	const lastLog = status.data?.lastLog;
	const runId = lastLog?.id ?? lastLog?.startedAt ?? '';
	const source = lastLog?.source ?? TimerSource.MOBILE;

	useEffect(() => {
		if (!signedIn || !employeeId || !running) {
			forgetRun();
			return undefined;
		}
		// counted from when the app sees the run going, as the web counts from when its page opens
		followRun(runId, Date.now());
		const beat = () => {
			const current = sessionRef.current;
			if (!current) {
				return;
			}
			// A stop lets go of the run once the API stopped it: until the status says so, nothing more is written
			writeRunTime((seconds) => sendTimeSlot(current, { employeeId, source, seconds })).catch(() => undefined);
		};
		const timer = setInterval(beat, HEARTBEAT_MS);
		return () => clearInterval(timer);
	}, [signedIn, employeeId, running, runId, source]);
}
