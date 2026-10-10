import { NextResponse } from 'next/server';
import { isEverConnectFlagOn } from '@/core/lib/ever-platform/env';
import {
	jsonAnswer,
	NO_STORE_HEADERS,
	notFound,
	routeSession,
	unauthorized
} from '@/core/services/server/ever-platform/route-helpers';
import { logProxyOutcome } from '@/core/services/server/ever-platform/log';
import { gauzyPassThrough } from '@/core/services/server/requests/ever-platform';
import {
	EVER_CONNECT_PROXY_RULES,
	forwardedQuery,
	MAX_PROXY_BODY_BYTES,
	type ProxyMethod
} from '@/core/services/server/ever-platform/connect-proxy-rules';

export const dynamic = 'force-dynamic';

/**
 * /api/ever-connect/*: the organization-level Ever Platform routes of the paired API, for a browser
 * that reaches the API through this app (NEXT_PUBLIC_GAUZY_API_SERVER_URL unset).
 *
 * - Not mounted (404 for everything, no request made) unless NEXT_PUBLIC_EVER_CONNECT_ENABLED is
 *   exactly 'true'.
 * - Only the routes of connect-proxy-rules.ts, with their method; everything else is 404. The installation's own routes
 *   (connecting, disconnecting, the operator's policy and public address) are never forwarded: they
 *   belong to the API's own settings.
 * - Forwarded with the signed-in person's own token and tenant to the configured API only; only the
 *   known query parameters and body fields travel; nothing is cached.
 */

async function handle(method: ProxyMethod, req: Request, params: Promise<{ path?: string[] }>) {
	if (!isEverConnectFlagOn()) return notFound();
	const segments = (await params).path ?? [];
	const path = segments.join('/');
	const rule = EVER_CONNECT_PROXY_RULES.find((candidate) => candidate.method === method && candidate.pattern.test(path));
	if (!rule) return notFound();

	const session = routeSession(req);
	if (!session) return unauthorized();

	let body: Record<string, unknown> | undefined;
	if (rule.body) {
		const text = await req.text();
		let parsed: unknown = null;
		try {
			parsed = text.length <= MAX_PROXY_BODY_BYTES ? JSON.parse(text) : null;
		} catch {
			parsed = null;
		}
		const accepted = rule.body(parsed);
		if (!accepted) return jsonAnswer(400, { statusCode: 400, message: 'Bad Request' });
		body = accepted;
	}

	const answer = await gauzyPassThrough({
		path: `/ever-connect/${path}${forwardedQuery(new URL(req.url))}`,
		method,
		...session,
		body: body ?? (method === 'POST' ? {} : undefined)
	});
	logProxyOutcome(`connect_${rule.id}`, answer.status);
	if (answer.status === 204) return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
	return jsonAnswer(answer.status, answer.data ?? { statusCode: answer.status });
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, { params }: Context) {
	return handle('GET', req, params);
}

export async function POST(req: Request, { params }: Context) {
	return handle('POST', req, params);
}

export async function PUT(req: Request, { params }: Context) {
	return handle('PUT', req, params);
}

export async function DELETE(req: Request, { params }: Context) {
	return handle('DELETE', req, params);
}
