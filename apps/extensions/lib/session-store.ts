import browser from '~misc/browser';

import { isSamePerson, type Session } from '~lib/workspaces';

export const DEFAULT_API_URL = 'https://api.ever.team';
export const DEFAULT_APP_URL = 'https://app.ever.team';

/** Where the extension talks to: the API, and the web app it opens for the team page. */
export interface Settings {
	apiUrl: string;
	appUrl: string;
}

const KEYS = {
	session: 'session',
	settings: 'settings',
	recentTaskIds: 'recentTaskIds',
	selectedTaskId: 'selectedTaskId'
} as const;

/** The lock every change of the stored session takes, in the popup, the options page and the background alike. */
const SESSION_LOCK = 'ever-teams-session';

/**
 * Runs `work` while no other view of the extension, nor its background, changes the stored session: a renewal, a
 * sign-in, a sign-out, a team picked. Where the browser has no Web Locks, it runs at once. Not re-entrant: `work`
 * never calls a function that takes the lock itself.
 */
export function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
	const locks = (globalThis.navigator as Navigator | undefined)?.locks;
	if (!locks) {
		return work();
	}
	return locks.request(SESSION_LOCK, work) as Promise<T>;
}

async function read<T>(key: string): Promise<T | undefined> {
	const stored = await browser.storage.local.get(key);
	return stored[key] as T | undefined;
}

async function write(key: string, value: unknown): Promise<void> {
	await browser.storage.local.set({ [key]: value });
}

/** The signed-in person, or null: kept until they sign out. */
export async function loadSession(): Promise<Session | null> {
	return (await read<Session>(KEYS.session)) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
	await write(KEYS.session, session);
}

async function removeSession(): Promise<void> {
	await browser.storage.local.remove([KEYS.session, KEYS.selectedTaskId, KEYS.recentTaskIds]);
}

/** Signs out on this browser: the session and what was picked or started with it go, the settings stay. */
export function clearSession(): Promise<void> {
	return withSessionLock(removeSession);
}

/**
 * Signs out on this browser, as clearSession, and answers the session that was stored (to revoke it), or null when
 * there was none. With `isStill`, only a stored session it accepts is signed out: a sign-in made meanwhile stays.
 */
export function takeSessionOut(isStill?: (stored: Session) => boolean): Promise<Session | null> {
	return withSessionLock(async () => {
		const stored = await loadSession();
		if (!stored || (isStill && !isStill(stored))) {
			return null;
		}
		await removeSession();
		return stored;
	});
}

/** Keeps a session just signed in to. */
export function storeSignIn(session: Session): Promise<void> {
	return withSessionLock(() => saveSession(session));
}

/**
 * Makes `teamId` the active team of the stored session, when it is still the person `shown` is: the stored copy,
 * which holds the newest tokens, is patched, never the copy a view shows. Null when the person signed out meanwhile.
 */
export function selectStoredTeam(shown: Session, teamId: string): Promise<Session | null> {
	return withSessionLock(async () => {
		const stored = await loadSession();
		if (!stored || !isSamePerson(stored, shown)) {
			return null;
		}
		const next = { ...stored, teamId };
		await saveSelectedTaskId(null);
		await saveSession(next);
		return next;
	});
}

export async function loadSettings(): Promise<Settings> {
	const stored = await read<Partial<Settings>>(KEYS.settings);
	return {
		apiUrl: stored?.apiUrl || DEFAULT_API_URL,
		appUrl: stored?.appUrl || DEFAULT_APP_URL
	};
}

export async function saveSettings(settings: Settings): Promise<void> {
	await write(KEYS.settings, settings);
}

export async function loadRecentTaskIds(): Promise<string[]> {
	return (await read<string[]>(KEYS.recentTaskIds)) ?? [];
}

export async function saveRecentTaskIds(ids: string[]): Promise<void> {
	await write(KEYS.recentTaskIds, ids);
}

export async function loadSelectedTaskId(): Promise<string | null> {
	return (await read<string>(KEYS.selectedTaskId)) ?? null;
}

export async function saveSelectedTaskId(taskId: string | null): Promise<void> {
	await write(KEYS.selectedTaskId, taskId);
}
