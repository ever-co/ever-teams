/** How often a running timer tells the API it goes on, as the web does. */
export const HEARTBEAT_MS = 60_000;

// Gauzy merges time slots into 10-minute windows and caps each merged slot at 600 seconds
const MAX_SLOT_SECONDS = 600;
const DEFAULT_SLOT_SECONDS = HEARTBEAT_MS / 1000;

/**
 * The seconds a heartbeat credits: the time since the previous one of the same run, or one interval when there was
 * none yet, never more than one 10-minute slot holds.
 */
export function slotSeconds(previousAt: number | null, now: number): number {
	if (previousAt === null) {
		return DEFAULT_SLOT_SECONDS;
	}
	const elapsed = Math.round((now - previousAt) / 1000);
	return Math.min(MAX_SLOT_SECONDS, Math.max(0, elapsed));
}
