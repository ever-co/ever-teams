import type { ApiFailure } from '~lib/refusal';
import { saveSession } from '~lib/session-store';
import type { Session } from '~lib/workspaces';

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
	return apiUrl
		.trim()
		.replace(/\/+$/, '')
		.replace(/\/api$/, '');
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

async function send(url: string, method: Method, body: unknown, headers: Record<string, string>): Promise<Response> {
	const init: RequestInit = { method, headers: { accept: 'application/json', ...headers } };
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
 * Trades the refresh token for a new access token and keeps it. Returns the renewed session, or null when the session
 * cannot be renewed (signed out elsewhere, expired).
 */
async function renewed(session: Session): Promise<Session | null> {
	if (!session.refreshToken) {
		return null;
	}
	const response = await send(
		urlOf(session.apiUrl, '/auth/refresh-token'),
		'POST',
		{ refresh_token: session.refreshToken },
		{}
	);
	if (!response.ok) {
		return null;
	}
	const answer = await readJson<{ token?: unknown }>(response);
	if (typeof answer?.token !== 'string') {
		return null;
	}
	const next: Session = { ...session, token: answer.token };
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
