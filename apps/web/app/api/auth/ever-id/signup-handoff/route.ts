import { NextResponse } from 'next/server';
import { everIdPrefillAttempts } from '@/core/lib/auth/ever-id/attempts';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import {
	clearedEverIdHandoffCookie,
	everIdCookieSecure,
	everIdFlowId,
	everIdHandoffFromRequest
} from '@/core/lib/auth/ever-id/handoff';
import { everIdSignupDetailsRequest, requiredTermsRequest } from '@/core/services/server/requests/ever-id';
import type { IEverIdSignupPrefill, IEverIdTermsDocument } from '@/core/types/interfaces/auth/ever-id';

/**
 * What the sign-up page shows for an Ever ID sign-up: the verified name and e-mail address of the Ever ID
 * (read from the Gauzy API with the one-time key, which stays valid), and the legal documents the account
 * must accept. Nothing is created here: the account is created only when the person confirms and submits
 * the sign-up form (POST /api/auth/register).
 *
 * Body `{ locale? }` (JSON); the one-time key comes from the sealed cookie the sign-in set, and the answer carries
 * its fingerprint (`flow`), which the sign-up sends back. 404 while the Ever ID sign-in is not configured, 410 for a
 * used, expired or missing key and for a key read more than ten times (then the cookie is dropped), 429 for the API's
 * rate limit, 502 when the API fails or answers something incomplete (a required document that cannot be shown is
 * never dropped); a read the API did not complete does not count.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 1_024;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Za-z]{2})?$/;
const MAX_TEXT = 200;
const MAX_DOCUMENTS = 32;

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

/**
 * Only what the page needs from a document: what identifies the accepted version, a title and a link. `null`
 * when a part that identifies the version is missing or malformed.
 */
function toDocument(value: unknown): IEverIdTermsDocument | null {
	if (!value || typeof value !== 'object') return null;
	const doc = value as Record<string, unknown>;
	const documentId = text(doc.documentId, 255);
	const version = text(doc.version, 64);
	const sha256 = typeof doc.sha256 === 'string' && /^[0-9a-f]{64}$/.test(doc.sha256) ? doc.sha256 : undefined;
	const locale = text(doc.locale, 35);
	if (!documentId || !version || !sha256 || !locale) return null;
	const title = text(doc.title);
	const url = absoluteUrl(doc.url);
	return { documentId, version, sha256, locale, ...(title ? { title } : {}), ...(url ? { url } : {}) };
}

/** Every required document, or `null` when the list is malformed or any entry is (none is ever dropped). */
function toDocuments(value: unknown): IEverIdTermsDocument[] | null {
	if (!Array.isArray(value) || value.length > MAX_DOCUMENTS) return null;
	const documents = value.map(toDocument);
	return documents.every((doc): doc is IEverIdTermsDocument => doc !== null) ? documents : null;
}

function refuse(status: number, reason: 'invalid' | 'expired' | 'unavailable' | 'throttled'): NextResponse {
	return NextResponse.json({ reason }, { status, headers: NO_STORE });
}

export async function POST(req: Request) {
	if (!isEverIdConfigured()) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}

	const body = await readCappedJsonObject(req, MAX_BODY_BYTES);
	if (!body) {
		return refuse(400, 'invalid');
	}
	const handoff = everIdHandoffFromRequest(req, 'signup');
	if (!handoff) {
		return refuse(410, 'expired');
	}
	const withoutKey = (response: NextResponse) => {
		response.cookies.set(clearedEverIdHandoffCookie(everIdCookieSecure(req.headers, req.url)));
		return response;
	};
	// Read too often with this key: like a used key, the person signs in with Ever ID again.
	const attempt = everIdPrefillAttempts.take(handoff);
	if (attempt.verdict !== 'ok') {
		return withoutKey(refuse(410, 'expired'));
	}
	/** A read that could not be completed (the API failed, not the key) does not count. */
	const failed = (status: 429 | 502) => {
		attempt.giveBack();
		return refuse(status, status === 429 ? 'throttled' : 'unavailable');
	};
	const locale = typeof body.locale === 'string' && LOCALE_PATTERN.test(body.locale) ? body.locale : undefined;

	// One after the other: a used key (410) is reported as such, and costs no second call.
	let details;
	try {
		details = await everIdSignupDetailsRequest(handoff);
	} catch {
		return failed(502);
	}
	// Kept: the API also answers 410 while a sign-up with this key is in progress (the cookie expires by itself).
	if (details.status === 410) return refuse(410, 'expired');
	if (details.status === 429) return failed(429);
	if (details.status !== 200 || !details.data || typeof details.data.email !== 'string' || !details.data.email) {
		return failed(502);
	}

	let terms;
	try {
		terms = await requiredTermsRequest(locale);
	} catch {
		return failed(502);
	}
	const documents = terms.status === 200 ? toDocuments(terms.data) : null;
	if (!documents) {
		return failed(502);
	}

	const prefill: IEverIdSignupPrefill = {
		name: [text(details.data.firstName, 100), text(details.data.lastName, 100)].filter(Boolean).join(' '),
		email: details.data.email,
		terms: documents,
		flow: everIdFlowId(handoff)
	};
	const checkout =
		details.data.status === 'subscription_required' ? checkoutUrl(details.data.checkoutUrl) : undefined;
	if (checkout) prefill.checkoutUrl = checkout;

	return NextResponse.json(prefill, { status: 200, headers: NO_STORE });
}
