/**
 * The signed-in session, as the HTTP client needs it outside React: the tokens the app holds, and the one way they
 * are renewed.
 *
 * Gauzy's access token expires (a day by default) and its refresh token gives a new pair. The app kept the refresh
 * token and never used it: a request refused with 401 was read as an answer, and the next read of the profile signed
 * the person out. The HTTP client (fetch.ts) now renews the session here and sends the refused request again.
 *
 * Gauzy rotates the refresh token: it accepts each one once. So one renewal runs at a time, and the requests refused
 * while it runs share it.
 */

/** What holds the session in the app: the authentication store. */
export interface SessionHolder {
	/** The tokens the app holds now. */
	tokens(): { accessToken?: string; refreshToken?: string };
	/** Keeps the pair a renewal answered: both tokens, the refresh token being rotated. */
	keep(pair: { accessToken: string; refreshToken?: string }): void;
	/** Ends the session in the app: the API refuses its refresh token, and only a new sign-in opens one again. */
	end(): void;
}

/**
 * How a renewal ended:
 * - `renewed`: the app holds an access token the API accepts, a request refused with the old one can be sent again;
 * - `ended`: the API refuses the refresh token, or there is none to renew with. The session is over in the app;
 * - `unavailable`: no new pair, and nothing is known about the session. The renewal failed for a reason of its own
 *   (no network, a server error), the refused token is not the session's, it was itself renewed moments ago, or the
 *   person signed out or in while the renewal was on its way.
 */
export type SessionRenewal = 'renewed' | 'ended' | 'unavailable';

/** What a renewal needs from the HTTP client. */
export interface RenewalMeans {
	/** Asks the API for a new pair with the refresh token, without renewing on a refusal. */
	askForNewPair(refreshToken: string): Promise<{ status: number; pair?: { token?: string; refresh_token?: string } }>;
	/** Tells the person their session ended, once per session that ends. */
	tellSessionEnded(): void;
}

/**
 * How long a token just obtained is not renewed again because a request made with it was refused: that refusal
 * cannot be an expired token, and a route that answers 401 for a reason of its own would otherwise make each of its
 * calls rotate the session's tokens.
 */
const RENEWED_TOKEN_GRACE_MS = 30_000;

let holder: SessionHolder | null = null;
let renewalInFlight: Promise<SessionRenewal> | null = null;
/** The access token the last renewal stored, and when. */
let lastRenewal: { accessToken: string; at: number } | null = null;
/**
 * The access tokens the renewals of this session replaced. A screen keeps the token of its first render and goes on
 * naming it in its requests: those are sent with the token that replaced it.
 */
const replacedTokens = new Set<string>();

/**
 * The store that holds the session gives it to the HTTP client.
 *
 * @returns The function that withdraws it, once that store is gone.
 */
export function holdSession(sessionHolder: SessionHolder): () => void {
	holder = sessionHolder;
	replacedTokens.clear();
	lastRenewal = null;
	return () => {
		if (holder === sessionHolder) {
			holder = null;
		}
	};
}

/** The tokens the app holds now, or none when no session is held. */
export function sessionTokens(): { accessToken?: string; refreshToken?: string } {
	return holder?.tokens() ?? {};
}

/**
 * Whether the tokens replaced so far are of the session the app holds now: after a sign-out or another sign-in they
 * are someone else's past, and must never lead a request to the new session's token.
 */
function isSameSessionAsLastRenewal(): boolean {
	return !!lastRenewal && sessionTokens().accessToken === lastRenewal.accessToken;
}

/**
 * The token a request is sent with: the one it names, or the session's when a renewal has replaced the one it names.
 */
export function tokenToSend(namedToken: string): string {
	const current = sessionTokens().accessToken;
	if (current && replacedTokens.has(namedToken) && isSameSessionAsLastRenewal()) {
		return current;
	}
	return namedToken;
}

async function askForNewPair(
	session: SessionHolder,
	means: RenewalMeans,
	isForRefusedRequest: boolean
): Promise<SessionRenewal> {
	const { accessToken: tokenAtCall, refreshToken } = session.tokens();
	const end = (): SessionRenewal => {
		session.end();
		means.tellSessionEnded();
		return 'ended';
	};
	if (!refreshToken) {
		// Nothing to renew with. A refused access token then leaves no session; a renewal asked without one says nothing
		return isForRefusedRequest ? end() : 'unavailable';
	}

	let answer: Awaited<ReturnType<RenewalMeans['askForNewPair']>>;
	try {
		answer = await means.askForNewPair(refreshToken);
	} catch {
		return 'unavailable';
	}
	if (session.tokens().refreshToken !== refreshToken) {
		// Signed out, or signed in again, while the renewal was on its way: this answer is not that session's, and
		// the requests that waited for it are of the session that ended. Sent again, they would act for whoever
		// signed in since (a Stop would stop their timer), so nothing is known that lets them be sent again.
		return 'unavailable';
	}
	if (answer.status === 401) {
		return end();
	}
	const isAnswered = answer.status >= 200 && answer.status < 300;
	if (!isAnswered || !answer.pair?.token) {
		return 'unavailable';
	}

	if (lastRenewal && lastRenewal.accessToken !== tokenAtCall) {
		// Another sign-in since the last renewal: the tokens replaced before were of another session
		replacedTokens.clear();
	}
	if (tokenAtCall) {
		replacedTokens.add(tokenAtCall);
	}
	session.keep({ accessToken: answer.pair.token, refreshToken: answer.pair.refresh_token });
	lastRenewal = { accessToken: answer.pair.token, at: Date.now() };
	return 'renewed';
}

/**
 * Renews the session with the refresh token: the one way the app gets a new access token, whoever asks. Callers that
 * ask while a renewal is under way share it, so the refresh token, which Gauzy accepts once, is sent once.
 *
 * @param refusedToken The access token of the request the API refused with 401, or null when the renewal is asked
 *   for itself (a screen that needs a fresh token).
 */
export function renewSession(refusedToken: string | null, means: RenewalMeans): Promise<SessionRenewal> {
	const session = holder;
	if (!session) {
		return Promise.resolve('unavailable');
	}

	if (refusedToken) {
		const current = session.tokens().accessToken;
		if (refusedToken !== current) {
			// Replaced by a renewal since that request left: it can be sent again. Any other token is not the session's
			// (a sign-in under way has its own), and its refusal says nothing about the session.
			const wasReplaced = replacedTokens.has(refusedToken) && isSameSessionAsLastRenewal();
			return Promise.resolve(wasReplaced ? 'renewed' : 'unavailable');
		}
		const isJustRenewed =
			lastRenewal?.accessToken === refusedToken && Date.now() - lastRenewal.at < RENEWED_TOKEN_GRACE_MS;
		if (isJustRenewed) {
			return Promise.resolve('unavailable');
		}
	}

	if (!renewalInFlight) {
		const renewal = askForNewPair(session, means, !!refusedToken).finally(() => {
			if (renewalInFlight === renewal) {
				renewalInFlight = null;
			}
		});
		renewalInFlight = renewal;
	}
	return renewalInFlight;
}
