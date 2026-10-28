import { NextResponse } from 'next/server';
import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { authenticatedGuard } from '../guards/authenticated-guard-app';
import { clientIpHeaders } from '../client-ip';

/**
 * Proxy mode (no NEXT_PUBLIC_GAUZY_API_SERVER_URL) of Gauzy's signed-in account deletion, `app/api/account-deletion/me`:
 * - GET  → `GET /api/account-deletion/me`: what deleting the current account would do (the `verify` shape);
 * - POST → `POST /api/account-deletion/me` `{ confirm: true, planHash, ...branding }`: deletes the current account
 *   (409 when the outcome changed since the preview with that `planHash`).
 *
 * The caller's token and tenant come from its cookies (authenticatedGuard); Gauzy authorizes (ACCESS_DELETE_ACCOUNT).
 * Gauzy's status is answered as it is, never cached.
 */
const ME_FORWARDED_FIELDS = [
	'planHash',
	'appName',
	'appLogo',
	'appSignature',
	'appLink',
	'companyLink',
	'companyName'
] as const;

export async function proxyAccountDeletionMe(method: 'GET' | 'POST', req: Request): Promise<NextResponse> {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	// The preview the person confirmed (`planHash`: Gauzy answers 409 instead of deleting when it changed since) and
	// the app's branding for the completion e-mail; any other field of the browser's body is dropped.
	const forwarded: Record<string, string> = {};
	if (method === 'POST') {
		const raw = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
		for (const field of ME_FORWARDED_FIELDS) {
			const value = raw[field];
			if (typeof value === 'string' && value.trim()) forwarded[field] = value.trim();
		}
	}

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
		return NextResponse.json(data ?? {}, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
	} catch {
		return NextResponse.json(
			{ message: 'The account deletion service is unavailable. Please try again later.' },
			{ status: 502, headers: { 'Cache-Control': 'no-store' } }
		);
	}
}
