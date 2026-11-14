/**
 * The note the app leaves for the sign-in page when it ends the session itself: the API refuses the refresh token, or
 * the session's cookies are gone (handle-unauthorized.ts). The person lands on the sign-in page without having asked
 * for it, and the page says why (session-ended-notice.tsx).
 *
 * It is kept in the tab's own storage: it follows the tab to the sign-in page, each tab the session ended in has its
 * own, and it goes with the tab. A sign-out the person asked for leaves none, and the note is removed once someone is
 * signed in again in the tab.
 */
const NOTICE_KEY = 'ever-teams.session-ended';

export interface SessionEndedNotice {
	/** When the app ended the session, on the computer's clock. */
	at: number;
}

/** The tab's storage, or null where there is none (the server's render) or the browser blocks it. */
function tabStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.sessionStorage;
	} catch {
		return null;
	}
}

/** Leaves the note, as the app ends the session. */
export function leaveSessionEndedNotice(): void {
	const notice: SessionEndedNotice = { at: Date.now() };
	try {
		tabStorage()?.setItem(NOTICE_KEY, JSON.stringify(notice));
	} catch {
		// A full or blocked storage: the sign-in page then says nothing, as before the note existed
	}
}

/** The note as it is stored, or null when the app did not end a session in this tab. */
export function storedSessionEndedNotice(): string | null {
	try {
		return tabStorage()?.getItem(NOTICE_KEY) ?? null;
	} catch {
		return null;
	}
}

/** Reads a stored note; null for anything that is not one. */
export function parseSessionEndedNotice(stored: string | null): SessionEndedNotice | null {
	if (!stored) {
		return null;
	}
	try {
		const notice = JSON.parse(stored) as Partial<SessionEndedNotice> | null;
		if (typeof notice?.at !== 'number') {
			return null;
		}
		return { at: notice.at };
	} catch {
		return null;
	}
}

/** Removes the note: someone is signed in again, or no sign-in page follows the end of the session. */
export function clearSessionEndedNotice(): void {
	try {
		tabStorage()?.removeItem(NOTICE_KEY);
	} catch {
		// Nothing to remove from a storage that cannot be reached
	}
}
