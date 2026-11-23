/**
 * The mark a tab leaves as the person signs out in it. A sign-out ends the session for every tab of the browser, and
 * it stops the running timer first: another tab, which finds its session ended, reads here that the person signed out
 * and which run that sign-out stopped (#5721).
 *
 * It is kept in the browser's storage, which the tabs share, and removed once someone is signed in again.
 */
const MARK_KEY = 'ever-teams.own-sign-out';

export interface OwnSignOutMark {
	/** When the person signed out, on the computer's clock. */
	at: number;
	/** The timer run the sign-out stopped in the API, when it stopped one. */
	stoppedTimeLogId: string | null;
}

/** The browser's storage, or null where there is none (the server's render) or the browser blocks it. */
function sharedStorage(): Storage | null {
	try {
		if (typeof window === 'undefined') {
			return null;
		}
		return window.localStorage;
	} catch {
		return null;
	}
}

/** Leaves the mark, as the person signs out. */
export function leaveOwnSignOutMark(stoppedTimeLogId: string | null): void {
	const mark: OwnSignOutMark = { at: Date.now(), stoppedTimeLogId };
	try {
		sharedStorage()?.setItem(MARK_KEY, JSON.stringify(mark));
	} catch {
		// A full or blocked storage: the other tabs then say what they said before the mark existed
	}
}

/** The mark of the person's last sign-out in this browser; null when there is none, or for anything that is not one. */
export function ownSignOutMark(): OwnSignOutMark | null {
	try {
		const stored = sharedStorage()?.getItem(MARK_KEY);
		if (!stored) {
			return null;
		}
		const mark = JSON.parse(stored) as Partial<OwnSignOutMark> | null;
		if (typeof mark?.at !== 'number') {
			return null;
		}
		if (typeof mark.stoppedTimeLogId !== 'string') {
			return { at: mark.at, stoppedTimeLogId: null };
		}
		return { at: mark.at, stoppedTimeLogId: mark.stoppedTimeLogId };
	} catch {
		return null;
	}
}

/** Whether the person's own sign-out stopped this timer run. */
export function wasStoppedByOwnSignOut(timeLogId: string | null): boolean {
	if (!timeLogId) {
		return false;
	}
	return ownSignOutMark()?.stoppedTimeLogId === timeLogId;
}

/** Removes the mark: someone is signed in again. */
export function clearOwnSignOutMark(): void {
	try {
		sharedStorage()?.removeItem(MARK_KEY);
	} catch {
		// Nothing to remove from a storage that cannot be reached
	}
}
