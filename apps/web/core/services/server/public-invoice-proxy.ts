import { NextResponse } from 'next/server';
import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { isPaymentReturnUrl, isSharedInvoiceLink, SHARED_INVOICE_RELATIONS } from '@/core/lib/utils/shared-invoice';
import { clientIpHeaders } from './client-ip';
import { NO_STORE_HEADERS } from './ever-platform/route-helpers';
import { serverFetch } from './fetch';
import { gauzyErrorResponse } from './gauzy-error-response';

/**
 * Proxy mode twins of Gauzy's public invoice routes, which the public page of an invoice calls without a session: the
 * invoice read through its share link, its PDF, whether it may be paid online and the checkout that pays it
 * (ever-co/ever-gauzy#11856). Gauzy checks the link; an id or a token that cannot be one is refused here without a
 * request. Answers are never cached: they carry what the link opens.
 */

const invalidLink = () => NextResponse.json({ message: 'Invalid link' }, { status: 400, headers: NO_STORE_HEADERS });

const linkPathOf = (id: string, token: string) => `${encodeURIComponent(id)}/${encodeURIComponent(token)}`;

async function relay<T>(request: Promise<{ data: T }>, fallbackMessage: string): Promise<NextResponse> {
	try {
		const { data } = await request;
		return NextResponse.json(data, { headers: NO_STORE_HEADERS });
	} catch (error) {
		const answer = await gauzyErrorResponse(error, fallbackMessage);
		answer.headers.set('Cache-Control', 'no-store');
		return answer;
	}
}

/** `GET /api/public/invoice/:id/:token`: the invoice its share link opens. */
export async function proxyReadSharedInvoice(id: string, token: string): Promise<NextResponse> {
	if (!isSharedInvoiceLink(id, token)) return invalidLink();
	return relay(
		serverFetch({
			path: `/public/invoice/${linkPathOf(id, token)}?relations=${SHARED_INVOICE_RELATIONS}`,
			method: 'GET',
			keepsStatusOnError: true
		}),
		'The invoice could not be read.'
	);
}

/** `GET /api/public/invoice-payments/invoice/:id/:token`: whether the page offers to pay the invoice online. */
export async function proxyInvoicePayOption(id: string, token: string): Promise<NextResponse> {
	if (!isSharedInvoiceLink(id, token)) return invalidLink();
	return relay(
		serverFetch({
			path: `/public/invoice-payments/invoice/${linkPathOf(id, token)}`,
			method: 'GET',
			keepsStatusOnError: true
		}),
		'Whether the invoice can be paid online could not be read.'
	);
}

/**
 * `POST /api/public/invoice-payments/invoice/:id/:token/checkout`: opens the checkout that pays the invoice. Only the
 * page to come back to goes along, and only the public page of an invoice, on the origin of the page that asked: the
 * amount is the API's, and the provider never sends the client anywhere else.
 */
export async function proxyInvoiceCheckout(req: Request, id: string, token: string): Promise<NextResponse> {
	if (!isSharedInvoiceLink(id, token)) return invalidLink();
	const body = (await req.json().catch(() => null)) as { returnUrl?: unknown } | null;
	const returnUrl = body?.returnUrl;
	if (!isPaymentReturnUrl(returnUrl, req.headers.get('origin'))) {
		return NextResponse.json({ message: 'Invalid return address' }, { status: 400, headers: NO_STORE_HEADERS });
	}
	return relay(
		serverFetch({
			path: `/public/invoice-payments/invoice/${linkPathOf(id, token)}/checkout`,
			method: 'POST',
			body: { returnUrl },
			keepsStatusOnError: true
		}),
		'The payment could not be started.'
	);
}

/** `GET /api/public/invoice/:id/:token/download`: the invoice's PDF, passed on as Gauzy sends it. */
export async function proxyDownloadSharedInvoice(req: Request, id: string, token: string): Promise<Response> {
	if (!isSharedInvoiceLink(id, token)) return invalidLink();
	try {
		const language = req.headers.get('accept-language');
		const upstream = await fetch(`${GAUZY_API_SERVER_URL}/public/invoice/${linkPathOf(id, token)}/download`, {
			method: 'GET',
			headers: {
				Accept: 'application/pdf',
				...(language ? { 'Accept-Language': language } : {}),
				...(await clientIpHeaders())
			}
		});
		if (!upstream.ok) {
			return NextResponse.json(
				{ message: 'The invoice could not be downloaded.' },
				{ status: upstream.status, headers: NO_STORE_HEADERS }
			);
		}
		return new Response(upstream.body, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Cache-Control': 'no-store'
			}
		});
	} catch {
		return NextResponse.json(
			{ message: 'The invoice could not be downloaded.' },
			{ status: 502, headers: NO_STORE_HEADERS }
		);
	}
}
