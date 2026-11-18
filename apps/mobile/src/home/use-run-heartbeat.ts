import { useEffect, useRef } from 'react';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import { sendTimeSlot } from '../data/timer';
import { HEARTBEAT_MS, slotSeconds } from './heartbeat';
import { useEmployeeId, useSignedInSession, useTimerStatus } from './use-home-timer';

/**
 * While the timer runs, tells the API every minute how long it went on, as the web and the current app do. The time
 * slots it writes are what the worked-time totals and reports count; a heartbeat that fails is covered by the next.
 */
export function useRunHeartbeat(): void {
	const session = useSignedInSession();
	const status = useTimerStatus();
	const employeeId = useEmployeeId().data;
	const running = status.data?.running === true;
	const runId = status.data?.lastLog?.id ?? '';
	const source = status.data?.lastLog?.source ?? TimerSource.MOBILE;
	const lastBeat = useRef<number | null>(null);

	useEffect(() => {
		if (!session || !employeeId || !running) {
			lastBeat.current = null;
			return undefined;
		}
		// counted from when the app sees the run going, as the web counts from when its page opens
		lastBeat.current = Date.now();
		const beat = () => {
			const now = Date.now();
			const previous = lastBeat.current;
			lastBeat.current = now;
			sendTimeSlot(session, { employeeId, source, seconds: slotSeconds(previous, now) }).catch(() => {
				// nothing was credited: unless a later heartbeat took over, the next one covers this interval too
				if (lastBeat.current === now) {
					lastBeat.current = previous;
				}
			});
		};
		const timer = setInterval(beat, HEARTBEAT_MS);
		return () => clearInterval(timer);
	}, [session, employeeId, running, runId, source]);
}
