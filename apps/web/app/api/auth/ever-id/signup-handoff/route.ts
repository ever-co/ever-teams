import { NextResponse } from 'next/server';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { readEverIdHandoff } from '@/core/lib/auth/ever-id/handoff';
import { everIdSignupDetailsRequest, requiredTermsRequest } from '@/core/services/server/requests/ever-id';
import type { IEverIdSignupPrefill, IEverIdTermsDocument } from '@/core/types/interfaces/auth/ever-id';

/**
 * What the sign-up page shows for an Ever ID sign-up: the verified name and e-mail address of the Ever ID
 * (read from the Gauzy API by the one-time key, which stays valid), and the legal documents the account
 * must accept. Nothing is created here: the account is created only when the person confirms and submits
 * the sign-up form (POST /api/auth/register).
 *
 * Body `{ handoff, locale? }`. 404 while the Ever ID sign-in is not configured, 410 for a used or expired key.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Za-z]{2})?$/;
const MAX_TEXT = 200;

function text(value: unknown, max = MAX_TEXT): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

/** An absolute http(s) URL, or nothing (a path is relative to the API's own web app, not to this one). */
function absoluteUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

function checkoutUrl(value: unknown): string | undefined {
	const url = absoluteUrl(value);
	return url?.startsWith('https:') ? url : undefined;
}

/** Only what the page needs from each document: what identifies the accepted version, a title and a link. */
function toDocument(value: unknown): IEverIdTermsDocument | null {
	if (!value || typeof value !== 'object') return null;
	const doc = value as Record<string, unknown>;
	const documentId = text(doc.documentId, 255);
	const version = text(doc.version, 64);
	const sha256 = typeof doc.sha256 === 'string' && /^[0-9a-f]{64}$/.test(doc.sha256) ? doc.sha256 : undefined;
	const locale = text(doc.locale, 35);
	if (!documentId || !version || !sha256 || !locale) return null;
	return {
		documentId,
		version,
		sha256,
		locale,
		...(text(doc.title) ? { title: text(doc.title) } : {}),
		...(absoluteUrl(doc.url) ? { url: absoluteUrl(doc.url) } : {})
	};
}

function refuse(status: number, reason: 'invalid' | 'expired' | 'unavailable' | 'throttled'): NextResponse {
	return NextResponse.json({ reason }, { status, headers: NO_STORE });
}

export async function POST(req: Request) {
	if (!isEverIdConfigured()) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}

	const body = (await req.json().catch(() => null)) as { handoff?: unknown; locale?: unknown } | null;
	const handoff = readEverIdHandoff(typeof body?.handoff === 'string' ? body.handoff : null);
	if (!handoff) {
		return refuse(400, 'invalid');
	}
	const locale = typeof body?.locale === 'string' && LOCALE_PATTERN.test(body.locale) ? body.locale : undefined;

	let details;
	let terms;
	try {
		[details, terms] = await Promise.all([everIdSignupDetailsRequest(handoff), requiredTermsRequest(locale)]);
	} catch {
		return refuse(502, 'unavailable');
	}

	if (details.status === 410) return refuse(410, 'expired');
	if (details.status === 429) return refuse(429, 'throttled');
	if (details.status !== 200 || !details.data || typeof details.data.email !== 'string') {
		return refuse(502, 'unavailable');
	}
	if (terms.status !== 200 || !Array.isArray(terms.data)) {
		return refuse(502, 'unavailable');
	}

	const prefill: IEverIdSignupPrefill = {
		name: [text(details.data.firstName, 100), text(details.data.lastName, 100)].filter(Boolean).join(' '),
		email: details.data.email,
		terms: terms.data.map(toDocument).filter((doc): doc is IEverIdTermsDocument => doc !== null)
	};
	const checkout =
		details.data.status === 'subscription_required' ? checkoutUrl(details.data.checkoutUrl) : undefined;
	if (checkout) prefill.checkoutUrl = checkout;

	return NextResponse.json(prefill, { status: 200, headers: NO_STORE });
}
