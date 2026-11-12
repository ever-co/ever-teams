import { BOARD_RETURN_PARAM, boardReturnUrl } from '@/core/lib/board/board-app';

/**
 * A sign-in the Board app started: the Board address to go back to once the person is signed in.
 *
 * The Board sends people to `/auth/passcode?redirect=<its address>` (core/lib/board/board-app.ts). The sign-in can
 * leave that URL before it ends (the password form, the sign-up, a social login round trip), so the auth pages keep
 * the address for this tab, and the end of the sign-in takes it (navigateAfterSignIn). It is checked against the
 * trusted Board origin when it arrives and again when it is used, and kept for 30 minutes at most, so it cannot send
 * a later, unrelated sign-in of the same tab to the Board.
 */

const STORAGE_KEY = 'ever-teams:board-return';
const MAX_AGE_MS = 30 * 60 * 1000;

interface KeptBoardReturn {
	url: string;
	savedAt: number;
}

/** The tab's sessionStorage, or null where there is none or the browser refuses it (blocked site data). */
function tabStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.sessionStorage;
	} catch {
		return null;
	}
}

function writeKept(storage: Storage, kept: KeptBoardReturn | null): void {
	try {
		if (kept) {
			storage.setItem(STORAGE_KEY, JSON.stringify(kept));
		} else {
			storage.removeItem(STORAGE_KEY);
		}
	} catch {
		// Storage full or refused: the sign-in then ends in the app, as it did before
	}
}

/** The kept address while it is recent and still on the trusted Board origin, otherwise null. */
function readKept(storage: Storage, now: number): string | null {
	try {
		const kept = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as Partial<KeptBoardReturn> | null;
		const age = typeof kept?.savedAt === 'number' ? now - kept.savedAt : Number.NaN;
		if (!(age >= 0 && age <= MAX_AGE_MS)) {
			return null;
		}
		return boardReturnUrl(kept?.url);
	} catch {
		return null;
	}
}

/**
 * Keeps the Board address of a sign-in page's query (`search`) for the end of the sign-in. A query without the
 * parameter changes nothing; one whose address is not on the trusted Board origin drops any address kept before,
 * as the latest sign-in page opened is the one the person is going through.
 */
export function rememberBoardReturn(search: string, now = Date.now()): void {
	const params = new URLSearchParams(search);
	if (!params.has(BOARD_RETURN_PARAM)) {
		return;
	}
	const storage = tabStorage();
	if (!storage) {
		return;
	}
	const url = boardReturnUrl(params.get(BOARD_RETURN_PARAM));
	writeKept(storage, url ? { url, savedAt: now } : null);
}

/**
 * The Board address a finished sign-in goes back to, removed from the tab: the one in the current page's query when
 * there is one, otherwise the one kept, or null when the sign-in was not started by the Board.
 */
export function takeBoardReturn(now = Date.now()): string | null {
	if (typeof window === 'undefined') {
		return null;
	}
	const params = new URLSearchParams(window.location.search);
	const storage = tabStorage();
	const kept = storage ? readKept(storage, now) : null;
	if (storage) {
		writeKept(storage, null);
	}
	if (params.has(BOARD_RETURN_PARAM)) {
		return boardReturnUrl(params.get(BOARD_RETURN_PARAM));
	}
	return kept;
}
