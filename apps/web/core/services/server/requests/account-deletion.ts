import { NextResponse } from 'next/server';
import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { clientIpHeaders } from '../client-ip';

export type TAccountDeletionStep = 'request' | 'verify' | 'confirm';

/** Gauzy's answer, status included: the confirm page tells a dead link (410) from a failure. */
export interface IAccountDeletionProxyResult {
	status: number;
	data: unknown;
}

/** The body fields each step forwards (strings only); anything else in the browser's body is dropped. */
const FORWARDED_FIELDS: Record<TAccountDeletionStep, readonly string[]> = {
	request: [
		'email',
		'callbackUrl',
		'locale',
		'appName',
		'appLogo',
		'appSignature',
		'appLink',
		'companyLink',
		'companyName'
	],
	verify: ['token'],
	confirm: ['token', 'planHash']
};

const REQUIRED_FIELD: Record<TAccountDeletionStep, string> = {
	request: 'email',
	verify: 'token',
	confirm: 'token'
};

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Forwards one account deletion call to Gauzy (`POST /api/account-deletion/<step>`) for the proxy-mode routes.
 *
 * Unlike serverFetch, a non-2xx answer is returned with its status rather than thrown, because the status is the
 * answer here (202, 200, 410, 429). The body is never logged: it holds the e-mail address or the deletion token.
 */
export async function accountDeletionRequest(
	step: TAccountDeletionStep,
	body: Record<string, unknown>
): Promise<IAccountDeletionProxyResult> {
	// The browser's address for Gauzy's per-IP limits, when EVER_TEAMS_CLIENT_IP_SECRET is set (client-ip.ts)
	const ipHeaders = await clientIpHeaders();
	const response = await fetch(`${GAUZY_API_SERVER_URL}/account-deletion/${step}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...ipHeaders },
		body: JSON.stringify(body),
		cache: 'no-store'
	});
	const data = await response.json().catch(() => null);
	return { status: response.status, data };
}

/**
 * The proxy-mode route handler of one step (`app/api/account-deletion/<step>/route.ts`): keeps the expected string
 * fields, forwards them, and answers with Gauzy's status and body, never cached.
 */
export async function proxyAccountDeletion(step: TAccountDeletionStep, req: Request): Promise<NextResponse> {
	const raw = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
	const body: Record<string, unknown> = {};
	for (const field of FORWARDED_FIELDS[step]) {
		const value = raw[field];
		if (typeof value === 'string' && value.trim()) body[field] = value.trim();
	}
	if (!body[REQUIRED_FIELD[step]]) {
		return NextResponse.json(
			{ message: `${REQUIRED_FIELD[step]} is required` },
			{ status: 400, headers: NO_STORE }
		);
	}
	if (step === 'confirm') body.confirm = true;

	try {
		const { status, data } = await accountDeletionRequest(step, body);
		return NextResponse.json(data ?? {}, { status, headers: NO_STORE });
	} catch {
		return NextResponse.json(
			{ message: 'The account deletion service is unavailable. Please try again later.' },
			{ status: 502, headers: NO_STORE }
		);
	}
}
