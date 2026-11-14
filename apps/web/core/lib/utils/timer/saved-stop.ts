import { ETimeLogSource } from '@/core/types/generics/enums/timer';

/**
 * The stop a person asked for, kept in the browser from the moment it is asked until the API answers it. A stop sent
 * as the session turns out to have ended is refused, and the page leaves for the sign-in page: without this record
 * nothing would remember that the person asked to stop, or when. It is applied at the next sign-in of the same
 * person, at the time it was asked for (use-stale-timer-guard.ts).
 *
 * The record is in the storage the tabs of the browser share, so the tab the person signs in again in applies it,
 * whichever tab the stop was asked in, and it outlives that tab. It holds ids and a time only, nothing the person
 * typed: the notes of the timer are not kept in the browser.
 */
const SAVED_STOP_KEY = 'ever-teams.timer.saved-stop';

interface SavedStop {
	/** The employee who asked for the stop: it is applied for that employee only. */
	employeeId: string;
	/** The run the stop is for: it never ends another one. */
	timeLogId: string;
	/** The app the run was started with, which a stop names. */
	source: ETimeLogSource;
	/** When the stop was asked for, on the computer's clock. */
	pressedAt: string;
}

/** The browser's storage, or null where there is none (the server's render) or the browser blocks it. */
function browserStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/** Keeps the stop. One at a time: the latest stop asked for is the one that counts. */
export function saveStop(stop: SavedStop): void {
	try {
		browserStorage()?.setItem(SAVED_STOP_KEY, JSON.stringify(stop));
	} catch {
		// A full or blocked storage: the stop is sent all the same, and is lost only if the session ended
	}
}

/** The record as it is stored, or null when no stop is kept. */
export function storedSavedStop(): string | null {
	try {
		return browserStorage()?.getItem(SAVED_STOP_KEY) ?? null;
	} catch {
		return null;
	}
}

/** Reads a stored record; null for anything that is not one. */
export function parseSavedStop(stored: string | null): SavedStop | null {
	if (!stored) {
		return null;
	}
	try {
		const stop = JSON.parse(stored) as Partial<SavedStop> | null;
		const isSavedStop =
			isText(stop?.employeeId) &&
			isText(stop.timeLogId) &&
			isText(stop.source) &&
			isText(stop.pressedAt) &&
			!Number.isNaN(Date.parse(stop.pressedAt));
		if (!isSavedStop) {
			return null;
		}
		return {
			employeeId: stop.employeeId as string,
			timeLogId: stop.timeLogId as string,
			source: stop.source as ETimeLogSource,
			pressedAt: stop.pressedAt as string
		};
	} catch {
		return null;
	}
}

/**
 * Forgets the stop: the API answered it, or it no longer has a run to end.
 *
 * @param timeLogId When given, only the stop kept for that run is forgotten: a later stop, for another run, stays.
 */
export function forgetSavedStop(timeLogId?: string): void {
	try {
		if (timeLogId && parseSavedStop(storedSavedStop())?.timeLogId !== timeLogId) {
			return;
		}
		browserStorage()?.removeItem(SAVED_STOP_KEY);
	} catch {
		// Nothing to remove from a storage that cannot be reached
	}
}
