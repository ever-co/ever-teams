import { renewEmbedSiteSession, revokeEmbedSiteSession, type EmbedSiteTokens } from '@ever-teams/api';
import { apiUrlOf } from '../utils/api-url';
import { expiryOf, GetKitToken, KitHostToken } from './host-token';
import { withRenewalLock } from './renewal-lock';
import {
	forgetStoredRenewal,
	readStoredRenewal,
	saveStoredRenewal,
	siteSignInScopeOf,
	StoredRenewal
} from './stored-session';

// A sign-in with Ever Teams for one API address and organization: the timer token stays in memory, the renewal token
// is saved for that address and organization, and each renewal reads the saved one under a lock shared by the site's
// tabs, so no token is used twice.

/**
 * No sign-in with Ever Teams is saved for this API address and organization: the person is signed out, which is no
 * failure.
 */
export class KitSiteSignedOut extends Error {
	constructor() {
		super('no sign-in with Ever Teams is saved for this API address and organization');
		this.name = 'KitSiteSignedOut';
	}
}

export interface KitSiteSession {
	// The kit's token source, as a host's getToken: the timer token the popup handed over, else a renewal.
	getToken: GetKitToken;
	// Keeps what the popup handed over: the timer token until getToken takes it, and the renewal token, saved once no
	// tab of the site renews the previous sign-in.
	accept(tokens: EmbedSiteTokens): Promise<void>;
	// Whether a timer token the popup handed over still waits for getToken.
	holdsHandedToken(): boolean;
	// Forgets the sign-in here, then ends it at the API, whatever the API answers.
	signOut(): Promise<void>;
}

// The code of the API's refusal of a renewal token that no longer works.
const GRANT_ENDED = 'EMBED_GRANT_ENDED';

export const isGrantEnded = (error: unknown): boolean => (error as { code?: unknown } | null)?.code === GRANT_ENDED;

function renewalOf(tokens: EmbedSiteTokens): StoredRenewal {
	return { renewalToken: tokens.renewalToken, expiresAt: expiryOf(tokens.renewalExpiresAt) };
}

export function createSiteSession(apiUrl: string, organizationId: string): KitSiteSession {
	const scope = siteSignInScopeOf(apiUrl, organizationId);
	let handed: KitHostToken | null = null;
	// The renewal token, here only while the browser refuses to save it: this tab then renews on its own, and this one
	// wins over the saved one, which it replaced.
	let unsaved: StoredRenewal | null = null;
	// Moves at each sign-out and each answer of the popup: a renewal on its way meanwhile keeps nothing of its answer.
	let generation = 0;

	const readRenewal = () => unsaved ?? readStoredRenewal(apiUrl, organizationId);

	function keepRenewal(tokens: EmbedSiteTokens) {
		const renewal = renewalOf(tokens);
		unsaved = null;
		if (saveStoredRenewal(apiUrl, organizationId, renewal)) {
			return;
		}
		// Not saved: the token in the storage may be the one just used, which another tab must never present.
		forgetStoredRenewal(apiUrl, organizationId);
		unsaved = renewal;
	}

	function forgetRenewal() {
		unsaved = null;
		forgetStoredRenewal(apiUrl, organizationId);
	}

	function takeHanded(): KitHostToken | null {
		const fresh = handed;
		handed = null;
		return fresh;
	}

	// A renewal that a sign-out or the popup overtook: the popup's timer token when one waits, else signed out.
	function overtaken(): KitHostToken {
		const fresh = takeHanded();
		if (!fresh) {
			throw new KitSiteSignedOut();
		}
		return fresh;
	}

	async function renewSaved(): Promise<KitHostToken> {
		const saved = readRenewal();
		if (!saved) {
			throw new KitSiteSignedOut();
		}
		const startedIn = generation;
		let tokens: EmbedSiteTokens;
		try {
			tokens = await renewEmbedSiteSession({ apiUrl, renewalToken: saved.renewalToken });
		} catch (error) {
			if (generation !== startedIn) {
				return overtaken();
			}
			// Revoked, expired or already used: the person allows the site again. Other refusals keep the token, which
			// works again once the API lifts them.
			if (isGrantEnded(error)) {
				forgetRenewal();
			}
			throw error;
		}
		if (generation !== startedIn) {
			return overtaken();
		}
		keepRenewal(tokens);
		return { token: tokens.token, expiresAt: tokens.expiresAt };
	}

	async function getToken(): Promise<KitHostToken> {
		const fresh = takeHanded();
		if (fresh) {
			return fresh;
		}
		if (!readRenewal()) {
			throw new KitSiteSignedOut();
		}
		// A renewal token that only this tab holds needs no lock: no other tab can present it.
		if (unsaved) {
			return renewSaved();
		}
		return withRenewalLock(scope, renewSaved);
	}

	async function accept(tokens: EmbedSiteTokens) {
		generation += 1;
		const acceptedIn = generation;
		handed = { token: tokens.token, expiresAt: tokens.expiresAt };
		// A sign-out while the lock is awaited wins: nothing of this answer is saved.
		const keepIfCurrent = () => {
			if (generation === acceptedIn) {
				keepRenewal(tokens);
			}
		};
		// Under the lock: a renewal of the previous sign-in that another tab runs ends first, so it cannot write its
		// renewal token over this one.
		try {
			await withRenewalLock(scope, async () => keepIfCurrent());
		} catch {
			keepIfCurrent();
		}
	}

	async function signOut() {
		generation += 1;
		handed = null;
		const saved = readRenewal();
		// Forgotten first: a renewal this tab starts meanwhile finds nothing, and one already on its way keeps nothing.
		forgetRenewal();
		if (!saved) {
			return;
		}
		try {
			// Any token of the sign-in ends all of it: one another tab renews meanwhile ends with it.
			await revokeEmbedSiteSession({ apiUrl, renewalToken: saved.renewalToken });
		} catch {
			// Forgotten here all the same: the renewal token expires on its own, and the person can revoke the site from
			// the web app.
		}
	}

	return { getToken, accept, holdsHandedToken: () => handed !== null, signOut };
}

export interface EndSiteSignInOptions {
	// The API address the sign-in was saved for; without it, the page's, as a provider without apiUrl takes it.
	apiUrl?: string;
	organizationId: string;
}

/**
 * Ends the sign-in with Ever Teams saved for an API address and organization when no provider shows it: forgets it,
 * then asks the API to end it, as the user menu does (#5580). A provider on the page signs out with useSiteSignIn().
 */
export async function endSiteSignIn({ apiUrl, organizationId }: EndSiteSignInOptions): Promise<void> {
	const address = apiUrlOf({ apiUrl });
	const session = createSiteSession(address, organizationId);
	// Under the renewal lock: a renewal that another timer or tab of the site runs ends first, so it cannot save a new
	// renewal token once this one forgot the sign-in.
	try {
		await withRenewalLock(siteSignInScopeOf(address, organizationId), () => session.signOut());
	} catch {
		await session.signOut();
	}
}
