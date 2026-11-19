import { renewEmbedSiteSession, revokeEmbedSiteSession, type EmbedSiteTokens } from '@ever-teams/api';
import { expiryOf, GetKitToken, KitHostToken } from './host-token';
import { withRenewalLock } from './renewal-lock';
import { forgetStoredRenewal, readStoredRenewal, saveStoredRenewal, StoredRenewal } from './stored-session';

// A sign-in with Ever Teams for one API address: the timer token stays in memory, the renewal token is saved for that
// address, and each renewal reads the saved one under a lock shared by the site's tabs, so no token is used twice.

/** No sign-in with Ever Teams is saved for this address: the person is signed out, which is no failure. */
export class KitSiteSignedOut extends Error {
	constructor() {
		super('no sign-in with Ever Teams is saved for this API address');
		this.name = 'KitSiteSignedOut';
	}
}

export interface KitSiteSession {
	// The kit's token source, as a host's getToken: the timer token the popup handed over, else a renewal.
	getToken: GetKitToken;
	// Keeps what the popup handed over: the renewal token for this address, the timer token until getToken takes it.
	accept(tokens: EmbedSiteTokens): void;
	// Whether a timer token the popup handed over still waits for getToken.
	holdsHandedToken(): boolean;
	// Ends the sign-in at the API, then forgets it here, whatever the API answered.
	signOut(): Promise<void>;
}

// The code of the API's refusal of a renewal token that no longer works.
const GRANT_ENDED = 'EMBED_GRANT_ENDED';

export const isGrantEnded = (error: unknown): boolean => (error as { code?: unknown } | null)?.code === GRANT_ENDED;

function renewalOf(tokens: EmbedSiteTokens): StoredRenewal {
	return { renewalToken: tokens.renewalToken, expiresAt: expiryOf(tokens.renewalExpiresAt) };
}

export function createSiteSession(apiUrl: string): KitSiteSession {
	let handed: KitHostToken | null = null;
	// The renewal token, here only while the browser refuses to save it: this tab then renews on its own.
	let unsaved: StoredRenewal | null = null;

	const readRenewal = () => readStoredRenewal(apiUrl) ?? unsaved;

	function keepRenewal(tokens: EmbedSiteTokens) {
		const renewal = renewalOf(tokens);
		const saved = saveStoredRenewal(apiUrl, renewal);
		unsaved = null;
		if (!saved) {
			unsaved = renewal;
		}
	}

	function forgetRenewal() {
		unsaved = null;
		forgetStoredRenewal(apiUrl);
	}

	async function renewSaved(): Promise<KitHostToken> {
		const saved = readRenewal();
		if (!saved) {
			throw new KitSiteSignedOut();
		}
		let tokens: EmbedSiteTokens;
		try {
			tokens = await renewEmbedSiteSession({ apiUrl, renewalToken: saved.renewalToken });
		} catch (error) {
			// Revoked, expired or already used: the person allows the site again. Other refusals keep the token, which
			// works again once the API lifts them.
			if (isGrantEnded(error)) {
				forgetRenewal();
			}
			throw error;
		}
		keepRenewal(tokens);
		return { token: tokens.token, expiresAt: tokens.expiresAt };
	}

	async function getToken(): Promise<KitHostToken> {
		const fresh = handed;
		handed = null;
		if (fresh) {
			return fresh;
		}
		return withRenewalLock(apiUrl, renewSaved);
	}

	function accept(tokens: EmbedSiteTokens) {
		keepRenewal(tokens);
		handed = { token: tokens.token, expiresAt: tokens.expiresAt };
	}

	async function signOut() {
		handed = null;
		const saved = readRenewal();
		if (!saved) {
			return;
		}
		try {
			// Any token of the sign-in ends all of it: one another tab renews meanwhile ends with it.
			await revokeEmbedSiteSession({ apiUrl, renewalToken: saved.renewalToken });
		} catch {
			// Forgotten here all the same: the renewal token expires on its own, and the person can revoke the site from
			// the web app.
		} finally {
			forgetRenewal();
		}
	}

	return { getToken, accept, holdsHandedToken: () => handed !== null, signOut };
}
