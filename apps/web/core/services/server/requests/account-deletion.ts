import { NextResponse } from 'next/server';
import { readRuntimeEnv } from '@/env-config';
import {
	APPLICATION_DEFAULT_LANGUAGE,
	APPLICATION_LANGUAGES_CODE,
	GAUZY_API_SERVER_URL
} from '@/core/constants/config/constants';
import { accountDeletionConfirmUrl } from '@/core/lib/auth/account-deletion';
import { appEmailBranding } from '@/core/lib/helpers/app-email-branding';
import { clientIpHeaders } from '../client-ip';

export type TAccountDeletionStep = 'request' | 'verify' | 'confirm';

/** Gauzy's answer, status included: the confirm page tells a dead link (410) from a failure. */
export interface IAccountDeletionProxyResult {
	status: number;
	data: unknown;
}

/**
 * The body fields each step takes from the browser (strings only); anything else in the browser's body is dropped.
 *
 * `request` takes no link and no branding from the caller: this route is public, and the e-mail it triggers carries a
 * token that deletes every account of the address. The confirmation link (`callbackUrl`) and the e-mail branding are
 * built here, from this app's own origin and configuration (withServerBuiltLinks).
 */
const FORWARDED_FIELDS: Record<TAccountDeletionStep, readonly string[]> = {
	request: ['email', 'locale'],
	verify: ['token'],
	// planHash: Gauzy deletes only what the preview with that hash showed (409 otherwise), and requires it
	confirm: ['token', 'planHash']
};

const REQUIRED_FIELDS: Record<TAccountDeletionStep, readonly string[]> = {
	request: ['email'],
	verify: ['token'],
	confirm: ['token', 'planHash']
};

const NO_STORE = { 'Cache-Control': 'no-store' };

/** The longest a Gauzy call is waited for: the browser's own call gives up after 60 s (account-deletion.service). */
const ACCOUNT_DELETION_UPSTREAM_TIMEOUT_MS = 60_000;

/**
 * The signal of an upstream call: aborted when the browser's request goes away (`req.signal`) or after
 * ACCOUNT_DELETION_UPSTREAM_TIMEOUT_MS, so a Gauzy call that hangs does not hold the route open.
 */
export function accountDeletionUpstreamSignal(req?: Request): AbortSignal {
	const timeout = AbortSignal.timeout(ACCOUNT_DELETION_UPSTREAM_TIMEOUT_MS);
	return req?.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
}

/** The origin of an absolute http(s) URL, or null. */
function httpOrigin(value: string | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
		return isHttp ? url.origin : null;
	} catch {
		return null;
	}
}

let warnedNoConfiguredOrigin = false;

/**
 * This app's public origin, from its configuration only: NEXT_PUBLIC_WEB_APP_URL (read at runtime), else AUTH_URL /
 * NEXTAUTH_URL. Never from the request: its `Host`, `X-Forwarded-Host` and `Origin` headers, like its body, are
 * whatever the caller sends, and the link carries a token that deletes every account of the address.
 *
 * @public A server request helper of core/services/server/requests (guarded service surface).
 */
export function appPublicOrigin(): string | null {
	const configured = [
		readRuntimeEnv('NEXT_PUBLIC_WEB_APP_URL') || process.env.NEXT_PUBLIC_WEB_APP_URL?.trim(),
		process.env.AUTH_URL?.trim(),
		process.env.NEXTAUTH_URL?.trim()
	];
	for (const value of configured) {
		const origin = httpOrigin(value);
		if (origin) return origin;
	}
	return null;
}

/**
 * The confirmation page the e-mailed link opens, `<this app>/[locale/]delete-account/confirm`, built from this app's
 * configured origin and a supported locale: a caller-supplied URL could make the victim's genuine e-mail deliver the
 * token to another site. Without a configured origin no link is sent, and Gauzy links to its own confirmation page
 * (ACCOUNT_DELETION_CONFIRM_URL, else its app). Gauzy also accepts only an origin the deployment lists explicitly.
 */
export function accountDeletionCallbackUrl(locale: unknown): string | undefined {
	const origin = appPublicOrigin();
	if (!origin) {
		if (!warnedNoConfiguredOrigin) {
			warnedNoConfiguredOrigin = true;
			console.warn(
				'[WEB][API] account deletion: NEXT_PUBLIC_WEB_APP_URL is not set; the e-mailed link opens the page Gauzy uses'
			);
		}
		return undefined;
	}
	const isSupportedLocale = typeof locale === 'string' && APPLICATION_LANGUAGES_CODE.includes(locale);
	return accountDeletionConfirmUrl(
		origin,
		isSupportedLocale ? locale : APPLICATION_DEFAULT_LANGUAGE,
		APPLICATION_DEFAULT_LANGUAGE
	);
}

/** A `request` body with the link and the branding this app builds itself. */
function withServerBuiltLinks(body: Record<string, unknown>): Record<string, unknown> {
	const callbackUrl = accountDeletionCallbackUrl(body.locale);
	return { ...appEmailBranding(), ...body, ...(callbackUrl ? { callbackUrl } : {}) };
}

/**
 * Forwards one account deletion call to Gauzy (`POST /api/account-deletion/<step>`) for the proxy-mode routes.
 *
 * Unlike serverFetch, a non-2xx answer is returned with its status rather than thrown, because the status is the
 * answer here (202, 200, 410, 429). The body is never logged: it holds the e-mail address or the deletion token.
 */
export async function accountDeletionRequest(
	step: TAccountDeletionStep,
	body: Record<string, unknown>,
	signal?: AbortSignal
): Promise<IAccountDeletionProxyResult> {
	// The browser's address for Gauzy's per-IP limits, when EVER_TEAMS_CLIENT_IP_SECRET is set (client-ip.ts)
	const ipHeaders = await clientIpHeaders();
	const response = await fetch(`${GAUZY_API_SERVER_URL}/account-deletion/${step}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...ipHeaders },
		body: JSON.stringify(body),
		cache: 'no-store',
		signal: signal ?? accountDeletionUpstreamSignal()
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
	let body: Record<string, unknown> = {};
	for (const field of FORWARDED_FIELDS[step]) {
		const value = raw[field];
		if (typeof value === 'string' && value.trim()) body[field] = value.trim();
	}
	const missing = REQUIRED_FIELDS[step].find((field) => !body[field]);
	if (missing) {
		return NextResponse.json({ message: `${missing} is required` }, { status: 400, headers: NO_STORE });
	}
	if (step === 'request') body = withServerBuiltLinks(body);
	if (step === 'confirm') body.confirm = true;

	try {
		const { status, data } = await accountDeletionRequest(step, body, accountDeletionUpstreamSignal(req));
		return NextResponse.json(data ?? {}, { status, headers: NO_STORE });
	} catch {
		return NextResponse.json(
			{ message: 'The account deletion service is unavailable. Please try again later.' },
			{ status: 502, headers: NO_STORE }
		);
	}
}
