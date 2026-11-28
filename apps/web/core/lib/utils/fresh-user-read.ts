/**
 * In proxy mode the web app's server answers the user from a session check it keeps for a few seconds, per server
 * instance. After a profile save, the read that follows must not be that kept answer: the page would show the value
 * just replaced (#5728). The save forgets the check where it ran; another instance may still hold one, so for a
 * while after a save the browser asks for a check made anew, whichever instance answers.
 */

/** The longest a server instance may keep a session check (SESSION_CHECK_MEMO_MAX_TTL_MS on the server). */
export const FRESH_USER_READ_WINDOW_MS = 60_000;

/** The query parameter that asks `/api/user/me` for a check made anew. */
export const FRESH_USER_READ_PARAM = 'fresh';

let lastProfileSaveAt: number | null = null;

/** Called once a save of the signed-in profile was accepted. */
export function noteProfileSaved(now: number = Date.now()): void {
	lastProfileSaveAt = now;
}

/**
 * Called once a stop of the timer was accepted. The stop turns the person's tracking flag off, and the user read
 * answers that flag: read from an instance that still keeps the check made before the stop, the app took the flag
 * for stuck and refused the next start (#5684). The same window applies as after a profile save.
 */
export function noteTimerStopped(now: number = Date.now()): void {
	noteProfileSaved(now);
}

/** Whether a user read made now must ask for a check made anew. */
export function asksFreshUserRead(now: number = Date.now()): boolean {
	if (lastProfileSaveAt === null) {
		return false;
	}
	const sinceSave = now - lastProfileSaveAt;
	return sinceSave >= 0 && sinceSave < FRESH_USER_READ_WINDOW_MS;
}

/** For tests: as if no profile had been saved. */
export function forgetProfileSave(): void {
	lastProfileSaveAt = null;
}

/** Whether a request to `/api/user/me` asks for a check made anew. */
export function requestAsksFreshUserRead(requestUrl: string): boolean {
	return new URL(requestUrl).searchParams.get(FRESH_USER_READ_PARAM) === '1';
}
