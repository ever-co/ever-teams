import { NextResponse } from 'next/server';
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { readInstallSource } from '@/core/lib/ever-platform/stats-config';

/**
 * Shared pieces of the /api/ever-stats and /api/ever-connect route handlers: the signed-in person's
 * token and tenant (from this app's cookies), and answers that are never cached and never echo what
 * the paired API said beyond what the settings need.
 */

export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

export interface RouteSession {
	readonly bearer: string;
	readonly tenantId: string | null;
}

/** The cookies of a request, read from its `Cookie` header (synchronously, as the handlers need them). */
export function requestCookies(req: Request): Map<string, string> {
	const cookies = new Map<string, string>();
	for (const part of (req.headers.get('cookie') ?? '').split(';')) {
		const at = part.indexOf('=');
		if (at <= 0) continue;
		const name = part.slice(0, at).trim();
		if (!name || cookies.has(name)) continue;
		const raw = part.slice(at + 1).trim();
		try {
			cookies.set(name, decodeURIComponent(raw));
		} catch {
			cookies.set(name, raw);
		}
	}
	return cookies;
}

/** The access token: one cookie, or the chunks the sign-in writes for a long one (`auth-token_totalChunks`). */
function accessToken(cookies: Map<string, string>): string | null {
	const total = Number(cookies.get(`${TOKEN_COOKIE_NAME}_totalChunks`));
	if (Number.isInteger(total) && total > 0 && total <= 64) {
		const chunks: string[] = [];
		for (let index = 0; index < total; index += 1) {
			const chunk = cookies.get(`${TOKEN_COOKIE_NAME}${index}`);
			if (!chunk) return null;
			chunks.push(chunk);
		}
		return chunks.join('');
	}
	return cookies.get(TOKEN_COOKIE_NAME) || null;
}

/** The person's own token and tenant, or `null` when nobody is signed in. */
export function routeSession(req: Request): RouteSession | null {
	const cookies = requestCookies(req);
	const bearer = accessToken(cookies);
	if (!bearer) return null;
	return { bearer, tenantId: cookies.get(TENANT_ID_COOKIE_NAME) || null };
}

export function jsonAnswer(status: number, body: unknown): NextResponse {
	return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

/** As if the route did not exist. */
export function notFound(): NextResponse {
	return jsonAnswer(404, { statusCode: 404, message: 'Not Found' });
}

export function unauthorized(): NextResponse {
	return jsonAnswer(401, { statusCode: 401, message: 'Unauthorized' });
}

/**
 * Who manages the statistics when the paired API does not show them to this person: Ever Cloud on a
 * cloud deployment, the operator of the installation everywhere else.
 */
export function managedBy(): 'ever_cloud' | 'operator' {
	return readInstallSource() === 'cloud' ? 'ever_cloud' : 'operator';
}

/**
 * The answer to a refusal of the paired API: 401 stays 401, 400 stays 400, 403 and 404 become 404
 * (with who manages the statistics, and nothing else), anything else 502.
 */
export function mirrorRefusal(status: number, { withManagedBy = false } = {}): NextResponse {
	if (status === 401) return unauthorized();
	if (status === 400) return jsonAnswer(400, { statusCode: 400, message: 'Bad Request' });
	if (status === 403 || status === 404) {
		return jsonAnswer(404, {
			statusCode: 404,
			message: 'Not Found',
			...(withManagedBy ? { managed_by: managedBy() } : {})
		});
	}
	return jsonAnswer(502, { statusCode: 502, message: 'Bad Gateway' });
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
