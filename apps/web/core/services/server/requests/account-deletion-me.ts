import { NextResponse } from 'next/server';
import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { authenticatedGuard } from '../guards/authenticated-guard-app';
import { clientIpHeaders } from '../client-ip';

/** The fields a POST forwards to Gauzy besides `confirm`: the previewed `planHash` and the app's e-mail branding. */
const ME_FORWARDED_FIELDS = [
	'planHash',
	'appName',
	'appLogo',
	'appSignature',
	'appLink',
	'companyLink',
	'companyName'
] as const;

const NO_STORE = { 'Cache-Control': 'no-store' };

function refuse(status: number, message: string): NextResponse {
	return NextResponse.json({ message }, { status, headers: NO_STORE });
}

/**
 * Why a POST must not reach the deletion, or null when it may: it must come from this app's own pages.
 *
 * The route acts with the caller's session cookies, which a cross-site page can make the browser send when the
 * deployment sets `NEXT_PUBLIC_COOKIE_SAME_SITE=none`. So a POST is refused when the browser says it is cross-site
 * (`Sec-Fetch-Site`), when its `Origin` is not this host, when it is not JSON (an HTML form cannot send JSON, and a
 * cross-origin `fetch` with JSON needs a CORS preflight this app does not grant), or when it does not carry the
 * explicit `confirm: true` the Danger Zone sends.
 */
export function refuseUntrustedPost(req: Request, body: Record<string, unknown> | null): NextResponse | null {
	if (req.headers.get('sec-fetch-site') === 'cross-site') return refuse(403, 'Cross-site request refused');

	const origin = req.headers.get('origin');
	if (origin) {
		const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
		let originHost: string | null = null;
		try {
			originHost = new URL(origin).host;
		} catch {
			originHost = null;
		}
		if (originHost !== host.split(',')[0].trim()) return refuse(403, 'Cross-site request refused');
	}

	const contentType = req.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	if (contentType !== 'application/json') return refuse(415, 'Content-Type must be application/json');

	if (!body || body.confirm !== true) return refuse(400, 'confirm must be true');
	return null;
}

/**
 * Proxy mode (no NEXT_PUBLIC_GAUZY_API_SERVER_URL) of Gauzy's signed-in account deletion, `app/api/account-deletion/me`:
 * - GET  → `GET /api/account-deletion/me`: what deleting the current account would do (the `verify` shape);
 * - POST → `POST /api/account-deletion/me` `{ confirm: true, planHash, ...branding }`: deletes the current account
 *   (409 when the outcome changed since the preview with that `planHash`). Only a same-site JSON POST with an
 *   explicit `confirm: true` is forwarded (refuseUntrustedPost).
 *
 * The caller's token and tenant come from its cookies (authenticatedGuard); Gauzy authorizes (ACCESS_DELETE_ACCOUNT).
 * Gauzy's status is answered as it is, never cached.
 */
export async function proxyAccountDeletionMe(method: 'GET' | 'POST', req: Request): Promise<NextResponse> {
	// The browser's body: only the expected string fields are forwarded, and confirm is required (not manufactured)
	const forwarded: Record<string, string> = {};
	if (method === 'POST') {
		const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
		const refused = refuseUntrustedPost(req, raw && typeof raw === 'object' ? raw : null);
		if (refused) return refused;
		for (const field of ME_FORWARDED_FIELDS) {
			const value = raw?.[field];
			if (typeof value === 'string' && value.trim()) forwarded[field] = value.trim();
		}
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const ipHeaders = await clientIpHeaders();
		const response = await fetch(`${GAUZY_API_SERVER_URL}/account-deletion/me`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				authorization: `Bearer ${access_token}`,
				...(tenantId ? { 'tenant-id': tenantId } : {}),
				...ipHeaders
			},
			...(method === 'POST' ? { body: JSON.stringify({ ...forwarded, confirm: true }) } : {}),
			cache: 'no-store'
		});
		const data = await response.json().catch(() => null);
		return NextResponse.json(data ?? {}, { status: response.status, headers: NO_STORE });
	} catch {
		return refuse(502, 'The account deletion service is unavailable. Please try again later.');
	}
}
