import type { IUser } from '@ever-teams/toolkit-types';

// A sign-in made with the kit's own forms (without the host's getToken) is kept in the browser under this key, for the
// whole site. Its top level keeps the shape it always had, { app: { user }, persist: { token, expiry } }, and names the
// API address that issued the token (persist.apiUrl); the sessions of other addresses sit under `servers`, by address.
// A provider reads, renews and removes only the session of the address it sends its requests to.
export const STORED_SESSION_KEY = '_teams-store';

// A session is read back for this long after it was last saved.
const SESSION_LIFE_MS = 24 * 60 * 60 * 1000;

interface StoredSession {
	app?: { user: IUser | null };
	persist?: { token: string | null; expiry?: number; apiUrl?: string };
}

interface StoredSessions extends StoredSession {
	servers?: Record<string, StoredSession>;
}

const SIGNED_OUT: StoredSession = { app: { user: null }, persist: { token: null } };

function isStore(value: unknown): value is StoredSessions {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	return !Array.isArray(value);
}

function readStore(): StoredSessions | null {
	let saved: string | null = null;
	try {
		saved = window.localStorage.getItem(STORED_SESSION_KEY);
	} catch {
		// Storage unavailable (blocked by the browser's settings): there is no saved session to read.
		return null;
	}
	if (!saved) {
		return null;
	}
	try {
		const store: unknown = JSON.parse(saved);
		if (isStore(store)) {
			return store;
		}
		return null;
	} catch (error) {
		console.error('Error parsing _teams-store from localStorage:', error);
		return null;
	}
}

function writeStore(store: StoredSessions): void {
	try {
		window.localStorage.setItem(STORED_SESSION_KEY, JSON.stringify(store));
	} catch {
		// Storage unavailable (private mode, quota): the session goes on in memory all the same.
	}
}

// Whether the top level holds this address's session: one saved for it, or one saved before the kit kept the address,
// which the first provider to read or save a session takes as its own.
function topLevelIsOf(store: StoredSessions, address: string): boolean {
	if (!store.persist?.token) {
		return false;
	}
	const savedFor = store.persist.apiUrl;
	if (savedFor === undefined) {
		return true;
	}
	return savedFor === address;
}

function sessionOf(store: StoredSessions, address: string): StoredSession | undefined {
	if (topLevelIsOf(store, address)) {
		return store;
	}
	return store.servers?.[address];
}

function serversOtherThan(store: StoredSessions, address: string): Record<string, StoredSession> {
	const servers = { ...store.servers };
	delete servers[address];
	return servers;
}

// `servers` is written only while another address has a session: a site with one server keeps the shape it had.
function withServers(store: StoredSessions, servers: Record<string, StoredSession>): StoredSessions {
	const next: StoredSessions = { ...store };
	delete next.servers;
	if (Object.keys(servers).length > 0) {
		next.servers = servers;
	}
	return next;
}

// Stamps a top-level session that names no address with this one, the address of the first provider to read it.
function adoptTopLevel(store: StoredSessions, address: string): void {
	const persist = store.persist;
	if (!persist?.token) {
		return;
	}
	if (persist.apiUrl !== undefined) {
		return;
	}
	writeStore({ ...store, persist: { ...persist, apiUrl: address } });
}

function hasExpired(expiry: number | undefined): boolean {
	if (!expiry) {
		return false;
	}
	return Date.now() > expiry;
}

/**
 * Removes the session saved for this API address, and only it: the sessions of other servers stay.
 */
export function forgetStoredSession(address: string): void {
	const store = readStore();
	if (!store) {
		return;
	}
	let kept: StoredSessions = store;
	if (topLevelIsOf(store, address)) {
		kept = { ...store, ...SIGNED_OUT };
	}
	writeStore(withServers(kept, serversOtherThan(store, address)));
}

/**
 * Saves the person and the token the API at this address issued, read back for 24 hours.
 */
export function saveStoredSession(address: string, user: IUser, token: string): void {
	const store = readStore() ?? {};
	const session: StoredSession = {
		app: { user },
		persist: { token, expiry: Date.now() + SESSION_LIFE_MS, apiUrl: address }
	};
	const servers = serversOtherThan(store, address);
	const topLevelIsFree = !store.persist?.token;
	if (topLevelIsFree || topLevelIsOf(store, address)) {
		writeStore(withServers({ ...store, ...session }, servers));
		return;
	}
	servers[address] = session;
	writeStore(withServers(store, servers));
}

/**
 * The token saved for this API address, or null. A session past its expiry is removed instead. One saved before the kit
 * kept the address is stamped with this one: from then on it is never read for another server.
 */
export function readStoredToken(address: string): string | null {
	const store = readStore();
	if (!store) {
		return null;
	}
	const persist = sessionOf(store, address)?.persist;
	if (!persist?.token) {
		return null;
	}
	if (hasExpired(persist.expiry)) {
		forgetStoredSession(address);
		return null;
	}
	adoptTopLevel(store, address);
	return persist.token;
}
