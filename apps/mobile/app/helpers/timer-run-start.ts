/** What a timer status says of its run, as far as the clock goes. */
type TRunStatus = {
	running?: boolean;
	lastLog?: { startedAt?: string | null } | null;
} | null;

/**
 * When the running timer's run started, in milliseconds: its log's `startedAt`, which a start moved on the web or on
 * the phone changes. Null when no timer runs, or when the status does not say when the run started.
 */
export function runStartOf(status: TRunStatus | undefined): number | null {
	const isRunning = status?.running === true;
	const startedAt = status?.lastLog?.startedAt;
	if (!isRunning || !startedAt) {
		return null;
	}
	const start = Date.parse(startedAt);
	if (Number.isNaN(start)) {
		return null;
	}
	return start;
}
