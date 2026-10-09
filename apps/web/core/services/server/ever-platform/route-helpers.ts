import { NextResponse } from 'next/server';
import { getAccessTokenCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
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

/** The person's own token and tenant, or `null` when nobody is signed in. */
export function routeSession(req: Request): RouteSession | null {
	const res = new NextResponse();
	const bearer = getAccessTokenCookie({ req, res });
	if (!bearer) return null;
	const tenantId = getTenantIdCookie({ req, res });
	return { bearer, tenantId: typeof tenantId === 'string' && tenantId ? tenantId : null };
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
