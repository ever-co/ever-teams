import { withoutTrailingSlashes } from '~lib/address';
import type { ApiFailure } from '~lib/refusal';
import { loadSession, saveSession, withSessionLock } from '~lib/session-store';
import { isSessionRefused, renewalStepOf, renewedSessionOf, type Session } from '~lib/workspaces';

/** A failed call to the API; status 0 when the API could not be reached at all. */
export class ApiError extends Error implements ApiFailure {
	readonly status: number;
	readonly code?: string;
	readonly details?: { fields?: unknown };

	constructor(status: number, message: string, code?: string, fields?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		if (code) {
			this.code = code;
		}
		if (fields !== undefined) {
			this.details = { fields };
		}
	}
}

type Method = 'GET' | 'POST' | 'PUT';

interface RequestOptions {
	method?: Method;
	body?: unknown;
	query?: Record<string, string | undefined>;
}

/** The API origin a person typed, as the base of every route: no trailing slash and no `/api` suffix. */
export function apiOriginOf(apiUrl: string): string {
	const origin = withoutTrailingSlashes(apiUrl.trim());
	if (origin.endsWith('/api')) {
		return origin.slice(0, -'/api'.length);
	}
	return origin;
}

function urlOf(apiUrl: string, path: string, query?: RequestOptions['query']): string {
	const url = new URL(`${apiOriginOf(apiUrl)}/api${path}`);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) {
			url.searchParams.append(key, value);
		}
	}
	return url.toString();
}

function messageOf(body: unknown, status: number): string {
	const message = (body as { message?: unknown } | null)?.message;
	if (typeof message === 'string') {
		return message;
	}
	if (Array.isArray(message)) {
		return message.join(' ');
	}
	return `HTTP ${status}`;
}

function textOrUndefined(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
	return undefined;
}

async function failureOf(response: Response): Promise<ApiError> {
	const body: unknown = await response.json().catch(() => null);
	const answer = (body ?? {}) as { code?: unknown; fields?: unknown; details?: { fields?: unknown } };
	const code = textOrUndefined(answer.code);
	// Gauzy names the request fields a refusal is about next to its code rather than under `details`
	const fields = answer.fields ?? answer.details?.fields;

	return new ApiError(response.status, messageOf(body, response.status), code, fields);
}

/**
 * How long a renewal may take. It holds the session lock, which a sign-out also takes: an API that never answers
 * would otherwise keep the person signed in for as long as the extension runs.
 */
const RENEWAL_TIMEOUT_MS = 15_000;

async function send(
	url: string,
	method: Method,
	body: unknown,
	headers: Record<string, string>,
	signal?: AbortSignal
): Promise<Response> {
	const init: RequestInit = { method, headers: { accept: 'application/json', ...headers } };
	if (signal) {
		init.signal = signal;
	}
	const hasBody = body !== undefined;
	if (hasBody) {
		init.headers = { ...init.headers, 'content-type': 'application/json' };
		init.body = JSON.stringify(body);
	}
	try {
		return await fetch(url, init);
	} catch {
		throw new ApiError(0, 'offline');
	}
}

async function readJson<T>(response: Response): Promise<T> {
	const text = await response.text();
	if (!text) {
		return undefined as T;
	}
	return JSON.parse(text) as T;
}

/** A call that needs no session: the sign-in steps. */
export async function publicRequest<T>(apiUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
	const response = await send(urlOf(apiUrl, path, options.query), options.method ?? 'GET', options.body, {});
	if (!response.ok) {
		throw await failureOf(response);
	}
	return readJson<T>(response);
}

function sessionHeaders(session: Session): Record<string, string> {
	return { authorization: `Bearer ${session.token}`, 'tenant-id': session.tenantId };
}

/**
 * Ends a session on the API too: Gauzy revokes its refresh token (`POST /auth/logout`), so a copy of the stored
 * session can no longer be renewed. Best effort: offline, or an access token that already expired, the browser
 * forgets the session all the same.
 */
export async function revokeSession(session: Session): Promise<void> {
	const body = session.refreshToken ? { refresh_token: session.refreshToken } : {};
	try {
		await send(urlOf(session.apiUrl, '/auth/logout'), 'POST', body, sessionHeaders(session));
	} catch {
		// Nothing left to do: the session is gone from this browser
	}
}

/**
 * Trades the refresh token for a new access token and keeps it, alone among the extension's views and its
 * background (the session lock): two renewals with one refresh token would have the API refuse the second, as a
 * token already rotated. Returns the renewed session (or the one another view renewed meanwhile), or null when the
 * session cannot be renewed (signed out, expired).
 */
function renewed(refused: Session): Promise<Session | null> {
	return withSessionLock(async () => {
		const stored = await loadSession();
		const step = renewalStepOf(stored, refused);
		if (step === 'none' || !stored) {
			return null;
		}
		if (step === 'useStored') {
			return stored;
		}
		return renewedNow(stored);
	});
}

async function renewedNow(session: Session): Promise<Session | null> {
	// The answer is read within the same deadline: the signal also ends a body that never arrives
	const deadline = AbortSignal.timeout(RENEWAL_TIMEOUT_MS);
	const response = await send(
		urlOf(session.apiUrl, '/auth/refresh-token'),
		'POST',
		{ refresh_token: session.refreshToken },
		{},
		deadline
	);
	if (isSessionRefused(response.status)) {
		return null;
	}
	// A busy or failing server says nothing of the session: its failure goes on, and the session stays
	if (!response.ok) {
		throw await failureOf(response);
	}
	const answer = await readJson<unknown>(response).catch(() => {
		throw new ApiError(0, 'offline');
	});
	const next = renewedSessionOf(await loadSession(), session, answer);
	if (!next) {
		return null;
	}
	await saveSession(next);
	return next;
}

/** A call made as the signed-in person; a 401 renews the access token once, then fails with that 401. */
export async function sessionRequest<T>(session: Session, path: string, options: RequestOptions = {}): Promise<T> {
	const url = urlOf(session.apiUrl, path, options.query);
	const method = options.method ?? 'GET';
	let response = await send(url, method, options.body, sessionHeaders(session));
	if (response.status === 401) {
		const next = await renewed(session);
		if (next) {
			response = await send(url, method, options.body, sessionHeaders(next));
		}
	}
	if (!response.ok) {
		throw await failureOf(response);
	}
	return readJson<T>(response);
}
