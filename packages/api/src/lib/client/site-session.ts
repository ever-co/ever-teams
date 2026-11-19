import { parseBody } from './answer-body';
import { codeOf, errorFromResponse, isRecord, networkError, NextStepsByStatus } from './error-mapping';
import { EverTeamsError } from './errors';
import { checkedApiUrl, isFilled, optionsError } from './option-checks';

/**
 * What a site gets when a person allows it in the web app (`/embed/authorize`), and at each renewal: a timer token and
 * the renewal token that gets the next pair.
 */
export interface EmbedSiteTokens {
	/** Reaches only the person's timer, from the site they allowed, until `expiresAt`. Keep it in memory. */
	token: string;
	/** When the timer token expires, as an ISO date. */
	expiresAt: string;
	/** Gets the next pair, once, from the same site. Each renewal answers a new one. */
	renewalToken: string;
	/** When the renewal token stops working, as an ISO date: the person then allows the site again. */
	renewalExpiresAt: string;
}

export interface EmbedSiteSessionOptions {
	/** The API's address, ending with /api: `https://api.example.com/api`. */
	apiUrl: string;
	/** The renewal token (`gzr_...`) of the last answer. */
	renewalToken: string;
	/** The fetch to send the request with; the platform's by default. */
	fetch?: typeof fetch;
}

/** The codes the API refuses a renewal with, each with its own `nextStep`. */
export type EmbedSiteSessionErrorCode =
	| 'EMBED_GRANT_ENDED'
	| 'EMBED_ORIGIN'
	| 'EMBED_ORIGIN_NOT_ALLOWED'
	| 'EMBED_SITE_SIGN_IN_OFF'
	| 'EMBED_MEMBER_NOT_ALLOWED';

const API_URL_STEP = "Pass apiUrl, the Ever Teams API's address ending with /api (https://api.example.com/api).";

const RENEWAL_TOKEN_STEP =
	'Pass the renewal token of the last answer (gzr_...): the one the web app handed the site when the person allowed ' +
	'it, or the one the last renewal answered.';

const KEEP_TOKEN = 'Keep the renewal token: it works again once this is lifted.';

const GRANT_ENDED_STEP =
	"The person's sign-in from this site ended (revoked, expired, or its renewal token was already used): forget the " +
	'renewal token and ask the person to sign in with Ever Teams again.';

// What the renewal routes answer alike: an API without them, or with embeds off.
const STATUS_STEPS: NextStepsByStatus = {
	401: GRANT_ENDED_STEP,
	404:
		'This API answers no site sign-in: its administrator turns embeds on (GAUZY_EMBED_TOKENS_ENABLED=true) on a ' +
		'version that has it, or apiUrl is not its address (it ends with /api).'
};

// The codes of the renewal route (Gauzy, embed-site-grant.service.ts).
const CODE_STEPS: Record<EmbedSiteSessionErrorCode, string> = {
	EMBED_GRANT_ENDED: GRANT_ENDED_STEP,
	EMBED_ORIGIN:
		'A renewal token works only from the site the person allowed: renew it from a page of that site, in a browser, ' +
		'which names the site in its Origin header.',
	EMBED_ORIGIN_NOT_ALLOWED: `The organization no longer allows this site: ask an administrator to add it in Settings > Embeds of the web app. ${KEEP_TOKEN}`,
	EMBED_SITE_SIGN_IN_OFF: `People cannot sign in from this site any more: ask an administrator to turn on "People can sign in from this site" in Settings > Embeds of the web app. ${KEEP_TOKEN}`,
	EMBED_MEMBER_NOT_ALLOWED: `The person may no longer track time in the organization (archived, or time tracking off): ask an administrator. ${KEEP_TOKEN}`
};

const isCode = (code: string | undefined): code is EmbedSiteSessionErrorCode =>
	code !== undefined && Object.prototype.hasOwnProperty.call(CODE_STEPS, code);

function nextStepsOf(status: number, body: unknown): NextStepsByStatus {
	const code = codeOf(body);
	if (!isCode(code)) {
		return STATUS_STEPS;
	}
	return { ...STATUS_STEPS, [status]: CODE_STEPS[code] };
}

function isSiteTokens(value: unknown): value is EmbedSiteTokens {
	if (!isRecord(value)) {
		return false;
	}
	const hasTimerToken = isFilled(value['token']) && isFilled(value['expiresAt']);
	const hasRenewalToken = isFilled(value['renewalToken']) && isFilled(value['renewalExpiresAt']);
	return hasTimerToken && hasRenewalToken;
}

function renewalTokenOf(caller: string, renewalToken: unknown): string {
	if (!isFilled(renewalToken)) {
		throw optionsError(`${caller} needs renewalToken.`, RENEWAL_TOKEN_STEP);
	}
	return renewalToken.trim();
}

interface SiteAnswer {
	status: number;
	body: unknown;
}

async function textOf(apiUrl: string, response: Response): Promise<string> {
	try {
		return await response.text();
	} catch (error) {
		throw networkError(apiUrl, error);
	}
}

/** The status and body (JSON, else null) of a renewal route's success, or the typed error of its refusal. */
async function post(caller: string, options: EmbedSiteSessionOptions, path: string): Promise<SiteAnswer> {
	const apiUrl = checkedApiUrl(caller, options.apiUrl, API_URL_STEP);
	const renewalToken = renewalTokenOf(caller, options.renewalToken);
	const fetchApi = options.fetch || globalThis.fetch;
	if (!fetchApi) {
		throw new EverTeamsError({
			status: 0,
			code: 'NO_FETCH',
			message: 'There is no fetch to send the request with.',
			nextStep: `Pass fetch to ${caller}, or run it in a browser or on Node 20 or later.`
		});
	}
	// No Authorization header: the API refuses a timer token on these routes, and the renewal token is the proof.
	const init: RequestInit = {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ renewalToken })
	};
	let response: Response;
	try {
		response = await fetchApi(apiUrl + path, init);
	} catch (error) {
		throw networkError(apiUrl, error);
	}
	const body = parseBody(await textOf(apiUrl, response)).value;
	if (!response.ok) {
		throw errorFromResponse(response, body, nextStepsOf(response.status, body));
	}
	return { status: response.status, body };
}

/**
 * Renews a person's sign-in from a site (`POST /embed/renew`): the renewal token gets a new timer token and a new
 * renewal token, which replaces it. Call it from a page of the site the person allowed: the API checks the page's
 * origin. A renewal token works once: two renewals with the same token end the sign-in, so make them one at a time
 * across the site's tabs.
 *
 * @example
 * const { token, expiresAt, renewalToken } = await renewEmbedSiteSession({
 * 	apiUrl: 'https://api.ever.team/api',
 * 	renewalToken: saved.renewalToken
 * });
 * @throws EverTeamsError with code `CLIENT_OPTIONS` before any request when an option is missing, and the typed error
 * of each refusal with its `nextStep`: `EverTeamsAuthError` with `EMBED_GRANT_ENDED` (sign in again),
 * `EverTeamsForbiddenError` with `EMBED_ORIGIN`, `EMBED_ORIGIN_NOT_ALLOWED`, `EMBED_SITE_SIGN_IN_OFF` or
 * `EMBED_MEMBER_NOT_ALLOWED` (keep the renewal token), `EverTeamsRateLimitError`, `EverTeamsServerError`.
 */
export async function renewEmbedSiteSession(options: EmbedSiteSessionOptions): Promise<EmbedSiteTokens> {
	const caller = 'renewEmbedSiteSession';
	const { status, body: answer } = await post(caller, options, '/embed/renew');
	if (!isSiteTokens(answer)) {
		throw new EverTeamsError({
			status,
			code: 'UNEXPECTED_ANSWER',
			message: `The answer of ${caller} holds no tokens.`,
			nextStep: "Check that apiUrl is the Ever Teams API's address (it ends with /api), not the web app's."
		});
	}
	return {
		token: answer.token,
		expiresAt: answer.expiresAt,
		renewalToken: answer.renewalToken,
		renewalExpiresAt: answer.renewalExpiresAt
	};
}

/**
 * Ends a person's sign-in from a site (`POST /embed/revoke`), the site's sign-out: the renewal token and every token
 * renewed from the same sign-in stop working. The API answers the same for any token, so a token already ended is no
 * error. The timer token the site holds works until it expires: drop it.
 *
 * @throws EverTeamsError with code `CLIENT_OPTIONS` before any request when an option is missing, and the typed error
 * of a refusal (`EverTeamsRateLimitError`, `EverTeamsNotFoundError` from an API without site sign-in, ...).
 */
export async function revokeEmbedSiteSession(options: EmbedSiteSessionOptions): Promise<void> {
	await post('revokeEmbedSiteSession', options, '/embed/revoke');
}
