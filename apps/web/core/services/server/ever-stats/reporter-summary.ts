import { reporterState, type StatsAttemptRecord } from './state';

/**
 * What the settings show about this web app's own reporter, to the operator only (the routes add it
 * after the paired API answered 200 to the person's own token).
 */
export function reporterSummary(): { reporter: string; next_send_at: string | null } {
	const state = reporterState();
	return { reporter: state.status, next_send_at: state.nextSendAt ? state.nextSendAt.toISOString() : null };
}

/** The last attempts of this process (newest first), with the exact bytes sent. */
export function reporterAttempts(): StatsAttemptRecord[] {
	return [...reporterState().attempts];
}
