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

/** The window Gauzy merges time slots into, on the UTC clock. */
export const TIME_SLOT_WINDOW_MS = MAX_TIME_SLOT_SECONDS * 1000;

/** Where the 10-minute window Gauzy merges a slot starting at `ms` into starts. */
export function timeSlotWindowStartOf(ms: number): number {
	return Math.floor(ms / TIME_SLOT_WINDOW_MS) * TIME_SLOT_WINDOW_MS;
}

/**
 * A slot whose write was sent, with the seconds its window held just before (#5123). Gauzy adds every slot it is
 * sent, and a write whose answer was lost may have landed: it is sent again only if its window does not hold it.
 */
export interface SentTimeSlot {
	startedAt: string;
	untilMs: number;
	duration: number;
	/** The seconds the slot's window held before it was sent. */
	windowBefore: number;
	/** When it was sent, on the computer's clock. */
	sentAt: number;
}

/** How long a slot sent without an answer may still be landing on Gauzy: as long as the app waits for a request. */
const SENT_TIME_SLOT_MAY_LAND_FOR_MS = 60_000;

/**
 * Resolves once a slot sent without an answer can no longer be landing on Gauzy (a page that reloads gives up its
 * requests, which the API may still carry out): its window then tells whether it landed.
 */
export function whenSentTimeSlotSettled(slot: SentTimeSlot, now: number = Date.now()): Promise<void> {
	const landingFor = slot.sentAt + SENT_TIME_SLOT_MAY_LAND_FOR_MS - now;
	if (landingFor <= 0) return Promise.resolve();
	return new Promise((resolve) => {
		setTimeout(resolve, landingFor);
	});
}

/** Whether a window that holds `windowSeconds` holds the slot sent into it: Gauzy caps a window at 600 seconds. */
export function isSentTimeSlotHeld(slot: SentTimeSlot, windowSeconds: number): boolean {
	return windowSeconds >= Math.min(MAX_TIME_SLOT_SECONDS, slot.windowBefore + slot.duration);
}

/** A time slot to write: when it starts, on the API's clock, the seconds it holds, and where the time it holds ends. */
interface TimeSlotToWrite {
	startedAt: string;
	duration: number;
	untilMs: number;
}

/**
 * The time slots that hold the time from `fromMs` to `toMs`, both on the API's clock: one per 10-minute window that
 * time spans, starting where the time does in that window, with the seconds of it inside the window. A single slot
 * holds 600 seconds at most and is merged into the window it starts in, so a longer time takes several (#5123).
 */
export function timeSlotsBetween(fromMs: number, toMs: number): TimeSlotToWrite[] {
	const slots: TimeSlotToWrite[] = [];
	let start = fromMs;
	while (start < toMs) {
		const windowEnd = (Math.floor(start / TIME_SLOT_WINDOW_MS) + 1) * TIME_SLOT_WINDOW_MS;
		const end = Math.min(windowEnd, toMs);
		const duration = Math.round((end - start) / 1000);
		if (duration > 0) {
			slots.push({ startedAt: new Date(start).toISOString(), duration, untilMs: end });
		}
		start = end;
	}
	return slots;
}
