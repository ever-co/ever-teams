import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IEverIdEmailBranding,
	IEverIdSignupDetails,
	IEverIdTermsClaim,
	IEverIdTokenNotFound,
	IEverIdTokenResponse,
	IEverIdWorkspacesResponse
} from '@/core/types/interfaces/auth/ever-id';
import type { IAuthResponse } from '@/core/types/interfaces/auth/auth';

/**
 * Server-to-server calls to the Ever ID routes of the Gauzy API (`/api/auth/zitadel/*`).
 *
 * Unlike serverFetch these never throw on an HTTP error: the routes answer with meaningful statuses (404
 * `no_workspace` versus 404 `signup_required`, 409 `handoff_busy` while another attempt holds a key, 410 for a
 * used-up or expired key, 429 for a rate limit) and every caller maps them. A connection error or a timeout (also
 * while the body is read) still rejects. Responses are never cached and redirects are not followed: the only
 * target is GAUZY_API_SERVER_URL, the API this deployment already uses.
 */

const EVER_ID_PATH = '/auth/zitadel';

/** The Gauzy API answers these routes from its database and keys; anything slower than this is a failure. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** A forwarded back-channel logout gives up quickly: the identity provider waits for this route's answer. */
const EVER_ID_LOGOUT_FORWARD_TIMEOUT_MS = 4_000;

/** Tries of a step while the API answers 409 `handoff_busy`, and the longest wait between two of them. */
const BUSY_TRIES = 3;
const MAX_BUSY_WAIT_S = 5;
const DEFAULT_BUSY_WAIT_S = 2;

export interface EverIdApiResult<T> {
	status: number;
	data: T | undefined;
	/** Seconds the API asks to wait before trying again (`Retry-After`, or `retryAfter` in the body). */
	retryAfter?: number;
}

interface EverIdApiRequest {
	method: 'GET' | 'POST';
	json?: unknown;
	form?: Record<string, string>;
	headers?: Record<string, string>;
	timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Whole seconds from `Retry-After` (seconds form) or the body's `retryAfter`, when either is a positive number. */
function retryAfterOf(header: string | null, data: unknown): number | undefined {
	const fromHeader = header && /^\d{1,5}$/.test(header.trim()) ? Number(header.trim()) : undefined;
	const fromBody = isRecord(data) && typeof data.retryAfter === 'number' ? data.retryAfter : undefined;
	const seconds = fromHeader ?? fromBody;
	return seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

async function everIdApiFetch<T>(path: string, request: EverIdApiRequest): Promise<EverIdApiResult<T>> {
	const headers: Record<string, string> = { Accept: 'application/json', ...request.headers };
	let body: string | undefined;
	if (request.form) {
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
		body = new URLSearchParams(request.form).toString();
	} else if (request.json !== undefined) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(request.json);
	}

	const response = await fetch(`${GAUZY_API_SERVER_URL}${path}`, {
		method: request.method,
		headers,
		body,
		cache: 'no-store',
		redirect: 'manual',
		signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS)
	});

	const text = await response.text();
	let data: T | undefined;
	try {
		data = text ? (JSON.parse(text) as T) : undefined;
	} catch {
		data = undefined;
	}
	const retryAfter = retryAfterOf(response.headers.get('retry-after'), data);
	return { status: response.status, data, ...(retryAfter ? { retryAfter } : {}) };
}

/** Whether an answer is 409 `handoff_busy`: another attempt holds the key right now; it stays valid. */
export function isHandoffBusy(result: EverIdApiResult<unknown>): boolean {
	return result.status === 409 && isRecord(result.data) && result.data.code === 'handoff_busy';
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs a step again while the API answers 409 `handoff_busy` (another attempt holds the key for a moment), waiting
 * what the API asks (at most 5 s) between tries; the last answer is returned, still busy after three tries.
 */
export async function retryWhileBusy<T>(call: () => Promise<EverIdApiResult<T>>): Promise<EverIdApiResult<T>> {
	let result = await call();
	for (let tries = 1; tries < BUSY_TRIES && isHandoffBusy(result); tries++) {
		await sleep(Math.min(result.retryAfter ?? DEFAULT_BUSY_WAIT_S, MAX_BUSY_WAIT_S) * 1000);
		result = await call();
	}
	return result;
}

/**
 * Exchanges the ID token of an Ever ID sign-in for the person's workspaces (`POST /api/auth/zitadel/token`), with
 * this app's branding for the API's one-time code e-mail. 200: the workspaces, or `{ confirm_required, handoff }`;
 * 404: `{ code: 'no_workspace' }` or `{ code: 'signup_required', handoff }`; 401: the token was refused; 409
 * `handoff_busy` while a sign-up of the same Ever ID finishes.
 */
export function signWithEverIdRequest(idToken: string, branding: IEverIdEmailBranding = {}) {
	return everIdApiFetch<IEverIdTokenResponse | IEverIdTokenNotFound>(`${EVER_ID_PATH}/token`, {
		method: 'POST',
		json: { id_token: idToken, ...branding }
	});
}

/**
 * Completes a link with Gauzy's one-time e-mail code (`POST /api/auth/zitadel/confirm`): 200 the workspaces with
 * their team lists, 401 wrong code, 410 used up or expired.
 */
export function confirmEverIdLinkRequest(handoff: string, code: string) {
	return everIdApiFetch<IEverIdWorkspacesResponse>(`${EVER_ID_PATH}/confirm`, {
		method: 'POST',
		json: { handoff, code }
	});
}

/**
 * What the sign-up confirmation shows (`POST /api/auth/zitadel/signup/details`), with the documents to accept in
 * `language` (absolute links); the key stays valid.
 */
export function everIdSignupDetailsRequest(handoff: string, language: string) {
	return everIdApiFetch<IEverIdSignupDetails>(`${EVER_ID_PATH}/signup/details`, {
		method: 'POST',
		json: { handoff },
		headers: { language }
	});
}

interface EverIdSignupInput {
	handoff: string;
	firstName?: string;
	lastName?: string;
	terms?: IEverIdTermsClaim[];
}

/**
 * The person confirmed creating a workspace with their Ever ID (`POST /api/auth/zitadel/signup`). Gauzy
 * creates the account through its own register path and links the Ever ID; 200 answers the workspace list,
 * 403 `{ code: 'subscription_required', checkoutUrl, handoff }` asks for checkout first. The documents accepted are
 * checked in `language`, as the details showed them.
 */
export function everIdSignupRequest(input: EverIdSignupInput, language: string) {
	return everIdApiFetch<IEverIdWorkspacesResponse | { code?: string; checkoutUrl?: string; handoff?: string }>(
		`${EVER_ID_PATH}/signup`,
		{
			method: 'POST',
			json: {
				handoff: input.handoff,
				confirm: true,
				...(input.firstName ? { firstName: input.firstName } : {}),
				...(input.lastName ? { lastName: input.lastName } : {}),
				...(input.terms?.length ? { terms: input.terms } : {})
			},
			headers: { language }
		}
	);
}

/** Gauzy's unchanged workspace sign-in (`POST /api/auth/signin.workspace`), sent like signInWorkspaceRequest. */
export function everIdWorkspaceSigninRequest(email: string, token: string) {
	return everIdApiFetch<IAuthResponse>('/auth/signin.workspace', {
		method: 'POST',
		json: { email, token },
		headers: { Authorization: `Bearer ${token}` }
	});
}

/** Forwards a verified back-channel logout token (`POST /api/auth/zitadel/backchannel-logout`, form encoded). */
export function forwardEverIdLogoutRequest(logoutToken: string) {
	return everIdApiFetch<unknown>(`${EVER_ID_PATH}/backchannel-logout`, {
		method: 'POST',
		form: { logout_token: logoutToken },
		timeoutMs: EVER_ID_LOGOUT_FORWARD_TIMEOUT_MS
	});
}
