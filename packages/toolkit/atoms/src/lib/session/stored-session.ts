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

// A sign-in with Ever Teams (config.signIn 'ever-teams') keeps only its renewal token, under a key of its own for the
// API address that issued it and the organization it was allowed for: its timer token stays in memory. No other write
// touches that key, so a password session saved by another tab, or the sign-in of another address or organization,
// never puts back a renewal token that was already used.
export interface StoredRenewal {
	renewalToken: string;
	// When the renewal token stops working, in milliseconds since the epoch.
	expiresAt: number;
}

const SITE_SIGN_IN_PREFIX = 'ever-teams:site-sign-in:';

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

// Whether the browser kept it.
function writeStore(store: StoredSessions): boolean {
	try {
		window.localStorage.setItem(STORED_SESSION_KEY, JSON.stringify(store));
		return true;
	} catch {
		// Storage unavailable (private mode, quota): the session goes on in memory all the same.
		return false;
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
// Whether the session now names an address: false when the browser refused the write, and then the session is not
// read, or every provider, whatever its server, would read it again.
function adoptTopLevel(store: StoredSessions, address: string): boolean {
	const persist = store.persist;
	if (!persist?.token) {
		return true;
	}
	if (persist.apiUrl !== undefined) {
		return true;
	}
	return writeStore({ ...store, persist: { ...persist, apiUrl: address } });
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
 * kept the address is stamped with this one: from then on it is never read for another server. While the browser
 * refuses to record that address (storage full), it is not read at all.
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
	if (!adoptTopLevel(store, address)) {
		return null;
	}
	return persist.token;
}

function isRenewal(value: unknown): value is StoredRenewal {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const renewal = value as Partial<StoredRenewal>;
	const hasToken = typeof renewal.renewalToken === 'string' && renewal.renewalToken.length > 0;
	return hasToken && typeof renewal.expiresAt === 'number';
}

/**
 * What a sign-in with Ever Teams is kept and renewed under: the API address that issued it and the organization the
 * person allowed the site for. A timer set up for another organization never renews it.
 */
export function siteSignInScopeOf(address: string, organizationId: string): string {
	return JSON.stringify([address, organizationId]);
}

const siteSignInKeyOf = (address: string, organizationId: string) =>
	SITE_SIGN_IN_PREFIX + siteSignInScopeOf(address, organizationId);

/**
 * Removes the renewal token of a sign-in with Ever Teams saved for this API address and organization, and only it.
 */
export function forgetStoredRenewal(address: string, organizationId: string): void {
	try {
		window.localStorage.removeItem(siteSignInKeyOf(address, organizationId));
	} catch {
		// Storage unavailable: nothing was saved there.
	}
}

/**
 * Saves the renewal token of a sign-in with Ever Teams for this API address and organization. Whether the browser kept
 * it: false in a browser that refuses storage (private mode, blocked, full).
 */
export function saveStoredRenewal(address: string, organizationId: string, renewal: StoredRenewal): boolean {
	try {
		window.localStorage.setItem(siteSignInKeyOf(address, organizationId), JSON.stringify(renewal));
		return true;
	} catch {
		return false;
	}
}

/**
 * The renewal token of a sign-in with Ever Teams saved for this API address and organization, or null. One past its
 * expiry is removed instead.
 */
export function readStoredRenewal(address: string, organizationId: string): StoredRenewal | null {
	let saved: string | null = null;
	try {
		saved = window.localStorage.getItem(siteSignInKeyOf(address, organizationId));
	} catch {
		return null;
	}
	if (!saved) {
		return null;
	}
	let renewal: unknown;
	try {
		renewal = JSON.parse(saved);
	} catch {
		return null;
	}
	if (!isRenewal(renewal)) {
		return null;
	}
	if (hasExpired(renewal.expiresAt)) {
		forgetStoredRenewal(address, organizationId);
		return null;
	}
	return renewal;
}
