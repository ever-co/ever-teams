import { LOCAL_TIMER_STORAGE_KEY, SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';

// Gauzy merges time slots into 10-minute windows and caps each merged slot at 600 seconds.
const MAX_TIME_SLOT_SECONDS = 600;

export const getLocalTimerStorageKey = (teamId?: string | null): string => {
	return teamId ? `${LOCAL_TIMER_STORAGE_KEY}-${teamId}` : LOCAL_TIMER_STORAGE_KEY;
};

/**
 * Seconds a time-slot sync credits. Falls back to one sync interval when the elapsed
 * time is unknown, and never exceeds what a single 10-minute slot can hold.
 */
export const toTimeSlotDuration = (elapsedSeconds: unknown): number => {
	if (typeof elapsedSeconds !== 'number' || !Number.isFinite(elapsedSeconds)) {
		return SYNC_TIMER_INTERVAL / 1000;
	}
	return Math.min(MAX_TIME_SLOT_SECONDS, Math.max(0, Math.round(elapsedSeconds)));
};
