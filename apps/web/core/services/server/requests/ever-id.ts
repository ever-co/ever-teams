import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IEverIdSignupDetails,
	IEverIdTermsClaim,
	IEverIdTermsDocument,
	IEverIdTokenNotFound,
	IEverIdTokenResponse,
	IEverIdWorkspacesResponse
} from '@/core/types/interfaces/auth/ever-id';
import type { IAuthResponse } from '@/core/types/interfaces/auth/auth';

/**
 * Server-to-server calls to the Ever ID routes of the Gauzy API (`/api/auth/zitadel/*`).
 *
 * Unlike serverFetch these never throw on an HTTP error: the routes answer with meaningful statuses (404
 * `no_workspace` versus 404 `signup_required`, 410 for a used key, 429 for a rate limit) and every caller
 * maps them. A connection error or a timeout (also while the body is read) still rejects. Responses are never
 * cached and redirects are not followed: the only target is GAUZY_API_SERVER_URL, the API this deployment
 * already uses.
 */

const EVER_ID_PATH = '/auth/zitadel';

/** The Gauzy API answers these routes from its database and keys; anything slower than this is a failure. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** A forwarded back-channel logout gives up quickly: the identity provider waits for this route's answer. */
const EVER_ID_LOGOUT_FORWARD_TIMEOUT_MS = 4_000;

export interface EverIdApiResult<T> {
	status: number;
	data: T | undefined;
}

interface EverIdApiRequest {
	method: 'GET' | 'POST';
	json?: unknown;
	form?: Record<string, string>;
	headers?: Record<string, string>;
	timeoutMs?: number;
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
	return { status: response.status, data };
}

/**
 * Exchanges the ID token of an Ever ID sign-in for the person's workspaces (`POST /api/auth/zitadel/token`).
 * 200: the workspaces, or `{ confirm_required, handoff }`; 404: `{ code: 'no_workspace' }` or
 * `{ code: 'signup_required', handoff }`; 401: the token was refused.
 */
export function signWithEverIdRequest(idToken: string) {
	return everIdApiFetch<IEverIdTokenResponse | IEverIdTokenNotFound>(`${EVER_ID_PATH}/token`, {
		method: 'POST',
		json: { id_token: idToken }
	});
}

/** Completes a link with Gauzy's one-time e-mail code (`POST /api/auth/zitadel/confirm`); 401 wrong code, 410 used up. */
export function confirmEverIdLinkRequest(handoff: string, code: string) {
	return everIdApiFetch<IEverIdWorkspacesResponse>(`${EVER_ID_PATH}/confirm`, {
		method: 'POST',
		json: { handoff, code }
	});
}

/** What the sign-up confirmation shows (`POST /api/auth/zitadel/signup/details`); the key stays valid. */
export function everIdSignupDetailsRequest(handoff: string) {
	return everIdApiFetch<IEverIdSignupDetails>(`${EVER_ID_PATH}/signup/details`, {
		method: 'POST',
		json: { handoff }
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
 * 403 `{ code: 'subscription_required', checkoutUrl, handoff }` asks for checkout first.
 */
export function everIdSignupRequest(input: EverIdSignupInput) {
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
			}
		}
	);
}

/** The legal documents Gauzy requires a new account to accept (`GET /api/terms/required`). */
export function requiredTermsRequest(locale?: string) {
	const query = locale ? `?${new URLSearchParams({ locale }).toString()}` : '';
	return everIdApiFetch<IEverIdTermsDocument[]>(`/terms/required${query}`, { method: 'GET' });
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
