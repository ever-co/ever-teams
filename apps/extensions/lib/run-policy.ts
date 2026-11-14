/** The time log source the API records for runs started here. */
export const EXTENSION_SOURCE = 'BROWSER_EXTENSION';

// The web credits at most one time slot (ten minutes) per heartbeat, whatever the gap since the last one
const MAX_HEARTBEAT_SECONDS = 600;

interface RunTimes {
	startedAt: string;
	/** Moved to the time of each heartbeat while the run goes on. */
	stoppedAt?: string | null;
}

/** A run started by another app keeps its time through that app, as the desktop app does with its own. */
export function sendsHeartbeat(run: { source?: string | null }): boolean {
	return run.source === EXTENSION_SOURCE;
}

/**
 * The seconds a heartbeat credits: those since the run's last heartbeat, whichever client sent it (the web sends
 * one each minute while it shows the run), so a run open in both is not counted twice.
 */
export function heartbeatSecondsOf(run: RunTimes, now: number): number {
	const lastHeartbeat = new Date(run.stoppedAt ?? run.startedAt).getTime();
	if (Number.isNaN(lastHeartbeat)) {
		return 0;
	}
	const seconds = Math.round((now - lastHeartbeat) / 1000);
	return Math.min(MAX_HEARTBEAT_SECONDS, Math.max(0, seconds));
}

/** The source a stop sends: the run's own, as the web does, so the API applies that app's stop rules. */
export function stopSourceOf(run: { source?: string | null }): string {
	return run.source || EXTENSION_SOURCE;
}
