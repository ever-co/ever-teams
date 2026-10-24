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
import { everIdLanguage } from '@/core/lib/auth/ever-id/language';
import { everIdSignupDetailsRequest, retryWhileBusy } from '@/core/services/server/requests/ever-id';
import type { IEverIdSignupPrefill, IEverIdTermsDocument } from '@/core/types/interfaces/auth/ever-id';

/**
 * What the sign-up page shows for an Ever ID sign-up: the verified name and e-mail address of the Ever ID and the
 * legal documents the account must accept, in the page's language, each with a link to open it (read from the
 * Gauzy API with the one-time key, which stays valid). Nothing is created here: the account is created only when
 * the person confirms and submits the sign-up form (POST /api/auth/register).
 *
 * Body `{ locale? }` (JSON); the one-time key comes from the sealed cookie the sign-in set, and the answer carries
 * its fingerprint (`flow`), which the sign-up sends back. 404 while the Ever ID sign-in is not configured, 410 for a
 * used, expired or missing key (the cookie is dropped). While a sign-up with this key runs (409 `handoff_busy`) the
 * read is tried again after the wait the API asks; a key that is still busy, or read more than 9 times a minute
 * here or by the API, answers 429 with a Retry-After. 502 when the API fails or answers something incomplete: a
 * required document without the parts that identify it or without a link to open it is never dropped or shown
 * unlinked. A read the API did not complete does not count.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 1_024;
const MAX_TEXT = 200;
const MAX_DOCUMENTS = 32;

function text(value: unknown, max = MAX_TEXT): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

/** An absolute http(s) URL, or nothing. */
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
 * Only what the page needs from a document: what identifies the accepted version, a title and the link to open it.
 * `null` when a part that identifies the version, or the link, is missing or malformed.
 */
function toDocument(value: unknown): IEverIdTermsDocument | null {
	if (!value || typeof value !== 'object') return null;
	const doc = value as Record<string, unknown>;
	const documentId = text(doc.documentId, 255);
	const version = text(doc.version, 64);
	const sha256 = typeof doc.sha256 === 'string' && /^[0-9a-f]{64}$/.test(doc.sha256) ? doc.sha256 : undefined;
	const locale = text(doc.locale, 35);
	const url = absoluteUrl(doc.url);
	if (!documentId || !version || !sha256 || !locale || !url) return null;
	const title = text(doc.title);
	return { documentId, version, sha256, locale, url, ...(title ? { title } : {}) };
}

/** Every required document, or `null` when the list is malformed or any entry is (none is ever dropped). */
function toDocuments(value: unknown): IEverIdTermsDocument[] | null {
	if (!Array.isArray(value) || value.length > MAX_DOCUMENTS) return null;
	const documents = value.map(toDocument);
	return documents.every((doc): doc is IEverIdTermsDocument => doc !== null) ? documents : null;
}

function refuse(
	status: number,
	reason: 'invalid' | 'expired' | 'unavailable' | 'throttled',
	retryAfterS?: number
): NextResponse {
	return NextResponse.json(
		{ reason },
		{ status, headers: { ...NO_STORE, ...(retryAfterS ? { 'Retry-After': String(retryAfterS) } : {}) } }
	);
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
	const attempt = everIdPrefillAttempts.take(handoff);
	if (!attempt.allowed) {
		return refuse(429, 'throttled', attempt.retryAfterS);
	}

	let details;
	try {
		details = await retryWhileBusy(() => everIdSignupDetailsRequest(handoff, everIdLanguage(body.locale)));
	} catch {
		attempt.giveBack();
		return refuse(502, 'unavailable');
	}
	if (details.status === 410) {
		const response = refuse(410, 'expired');
		response.cookies.set(clearedEverIdHandoffCookie(everIdCookieSecure(req.headers, req.url)));
		return response;
	}
	if (details.status === 409 || details.status === 429) {
		// Still busy after the retries, or the API's rate limit: the key stays valid; try again later.
		attempt.giveBack();
		return refuse(429, 'throttled', details.retryAfter ?? (details.status === 409 ? 2 : 60));
	}
	const documents = details.status === 200 ? toDocuments(details.data?.terms) : null;
	if (
		details.status !== 200 ||
		!details.data ||
		typeof details.data.email !== 'string' ||
		!details.data.email ||
		!documents
	) {
		attempt.giveBack();
		return refuse(502, 'unavailable');
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
