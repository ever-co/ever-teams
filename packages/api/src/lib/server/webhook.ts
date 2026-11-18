import { clientError, isRecord } from '../client/error-mapping';
import { isFilled } from './embed-request';
import { assertServerOnly } from './server-only';
import { EverTeamsWebhookEvent } from './webhook-events';

export interface VerifyWebhookOptions {
	/**
	 * The request's body exactly as received, before any JSON parsing: a string, or its bytes (a Buffer or a
	 * Uint8Array), such as `express.raw({ type: 'application/json' })` or `await request.text()` give it.
	 */
	body: string | Uint8Array;
	/** The request's `X-Signature` header: `t=<unix seconds>,v1=<hex HMAC-SHA256>`. */
	signature: string | string[] | null | undefined;
	/**
	 * The subscription's signing secret, which the API shows once, when the subscription is created or its secret
	 * rotated. It stays on your server: read it from an environment variable.
	 */
	secret: string | undefined;
	/** How far the signature's time may be from now, in seconds: 300 by default, as the API checks its own. */
	tolerance?: number;
	/** Now, in unix seconds; the clock's by default. */
	now?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;

// t= as the API writes it: whole unix seconds in decimal, no sign, no leading zero (Gauzy, webhook-signature.ts).
const CANONICAL_TIMESTAMP = /^(0|[1-9]\d{0,14})$/;

// A v1 value of the API's length: the hex of a SHA-256 HMAC, in either case.
const HMAC_HEX = /^[0-9a-fA-F]{64}$/;

const SECRET_STEP =
	'Pass secret, the signing secret the API showed when the webhook subscription was created or its secret ' +
	'rotated, from an environment variable such as process.env.EVER_TEAMS_WEBHOOK_SECRET.';

const RAW_BODY_STEP =
	'Pass the raw body as received, a string or its bytes: express.raw({ type: "application/json" }) on the ' +
	'route in Express, await request.text() in a route handler. A body already parsed as JSON cannot be checked.';

const SIGNATURE_HEADER_STEP =
	"Pass the request's X-Signature header: req.get('x-signature') in Express, request.headers.get('x-signature') " +
	'in a route handler. A request without it did not come from the API.';

const MISMATCH_STEP =
	"Check that secret is this subscription's current secret, and that body is the raw body as received. A request " +
	'whose signature does not match did not come from the API, or was changed on the way: answer it 401.';

const EXPIRED_STEP =
	"The delivery was signed too long before or after your server's clock: check that the clock is set (NTP). An " +
	'older request is refused on purpose, so that a captured one cannot be sent again.';

const EVENT_STEP = 'The signed body is not an Ever Teams event: check that only the API posts to this route.';

const SUBTLE_STEP = 'Run verifyWebhook on Node 20 or later, or on a runtime with the Web Crypto API.';

const isNumber = (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value);

function toleranceOf(tolerance: number | undefined): number {
	if (tolerance === undefined) {
		return DEFAULT_TOLERANCE_SECONDS;
	}
	const isSeconds = isNumber(tolerance) && tolerance >= 0;
	if (!isSeconds) {
		throw clientError(
			'CLIENT_OPTIONS',
			'verifyWebhook takes tolerance as a number of seconds.',
			'Pass tolerance as seconds, 0 or more, or leave it out (300).'
		);
	}
	return tolerance;
}

function nowOf(now: number | undefined): number {
	if (now === undefined) {
		return Math.floor(Date.now() / 1000);
	}
	if (!isNumber(now)) {
		throw clientError(
			'CLIENT_OPTIONS',
			'verifyWebhook takes now as unix seconds.',
			'Leave now out, or pass it as unix seconds.'
		);
	}
	return now;
}

// The messages never quote the secret, the header or the body.
function secretOf(secret: unknown): string {
	if (!isFilled(secret)) {
		throw clientError(
			'CLIENT_OPTIONS',
			'verifyWebhook needs secret, the subscription signing secret.',
			SECRET_STEP
		);
	}
	return secret.trim();
}

function bodyBytesOf(body: unknown, encoder: TextEncoder): Uint8Array {
	if (typeof body === 'string') {
		return encoder.encode(body);
	}
	if (body instanceof Uint8Array) {
		return body;
	}
	throw clientError('WEBHOOK_BODY', 'verifyWebhook needs the raw body, a string or its bytes.', RAW_BODY_STEP);
}

function headerOf(signature: VerifyWebhookOptions['signature']): string {
	if (Array.isArray(signature)) {
		if (signature.length > 1) {
			throw clientError('WEBHOOK_SIGNATURE', 'The request has more than one X-Signature.', SIGNATURE_HEADER_STEP);
		}
		return headerOf(signature[0]);
	}
	if (!isFilled(signature)) {
		throw clientError('WEBHOOK_SIGNATURE', 'The request has no X-Signature header.', SIGNATURE_HEADER_STEP);
	}
	return signature;
}

interface SignatureParts {
	timestamp: number;
	macs: string[];
}

// Read as the API reads its own header (Gauzy, webhook-signature.ts, verifyWebhookSignature): the first t=, and every
// v1=, one per secret while a rotation lasts.
function partsOf(header: string): SignatureParts {
	const parts = header.split(',').map((part) => part.trim());
	const timestampPart = parts.filter((part) => part.startsWith('t='))[0];
	const macs = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
	const readable = timestampPart !== undefined && macs.length > 0;
	const timestamp = timestampPart?.slice(2) ?? '';
	if (!readable || !CANONICAL_TIMESTAMP.test(timestamp)) {
		throw clientError(
			'WEBHOOK_SIGNATURE',
			'The X-Signature header is not t=<unix seconds>,v1=<hex HMAC-SHA256>.',
			SIGNATURE_HEADER_STEP
		);
	}
	return { timestamp: Number(timestamp), macs };
}

function bytesOfHex(hex: string) {
	const bytes = new Uint8Array(hex.length / 2);
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

// What the API signs: `<t>.<raw body>`, the body's bytes as they were sent.
function signedBytesOf(timestamp: number, body: Uint8Array, encoder: TextEncoder) {
	const prefix = encoder.encode(`${timestamp}.`);
	const signed = new Uint8Array(prefix.length + body.length);
	signed.set(prefix, 0);
	signed.set(body, prefix.length);
	return signed;
}

function subtleOf(): SubtleCrypto {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) {
		throw clientError('NO_WEB_CRYPTO', 'There is no Web Crypto API to check the signature with.', SUBTLE_STEP);
	}
	return subtle;
}

/**
 * Whether one of the header's v1 values is the HMAC-SHA256 of the signed bytes under the secret. The platform compares
 * them in constant time (crypto.subtle.verify), and a value that is not 64 hex digits is a mismatch.
 */
async function matches(
	secret: string,
	signed: Uint8Array<ArrayBuffer>,
	macs: string[],
	encoder: TextEncoder
): Promise<boolean> {
	const subtle = subtleOf();
	const key = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'verify'
	]);
	let matched = false;
	for (const mac of macs) {
		if (!HMAC_HEX.test(mac)) {
			continue;
		}
		const verified = await subtle.verify('HMAC', key, bytesOfHex(mac), signed);
		matched = matched || verified;
	}
	return matched;
}

function textOf(body: string | Uint8Array): string {
	if (typeof body === 'string') {
		return body;
	}
	return new TextDecoder().decode(body);
}

function isEnvelope(value: unknown): value is EverTeamsWebhookEvent {
	if (!isRecord(value)) {
		return false;
	}
	const named = typeof value['id'] === 'string' && typeof value['name'] === 'string';
	const dated = typeof value['version'] === 'number' && typeof value['occurredAt'] === 'string';
	return named && dated && 'data' in value;
}

function eventOf(body: string | Uint8Array): EverTeamsWebhookEvent {
	let value: unknown;
	try {
		value = JSON.parse(textOf(body));
	} catch {
		throw clientError('WEBHOOK_BODY', 'The webhook body is not JSON.', EVENT_STEP);
	}
	if (!isEnvelope(value)) {
		throw clientError('WEBHOOK_BODY', 'The webhook body is not an Ever Teams event.', EVENT_STEP);
	}
	return value;
}

/**
 * Checks a webhook delivery of the Ever Teams API on your server and answers its event: the signature of the raw
 * body under the subscription's secret (X-Signature, HMAC-SHA256, compared in constant time), and its time, within
 * `tolerance` seconds of now. Tell a time entry's event apart with `isTimeEntryEvent`.
 *
 * @example
 * const event = await verifyWebhook({
 * 	body: req.body, // express.raw({ type: 'application/json' })
 * 	signature: req.get('x-signature'),
 * 	secret: process.env.EVER_TEAMS_WEBHOOK_SECRET
 * });
 * @throws EverTeamsError (status 0) with code `WEBHOOK_SIGNATURE` for a missing, unreadable or wrong signature,
 * `WEBHOOK_EXPIRED` for a signature older or newer than `tolerance`, `WEBHOOK_BODY` for a body that is not the raw
 * body of an event, and `CLIENT_OPTIONS` for a missing secret; each with its `nextStep`. No error holds the secret.
 */
export async function verifyWebhook(options: VerifyWebhookOptions): Promise<EverTeamsWebhookEvent> {
	assertServerOnly();
	const secret = secretOf(options.secret);
	const tolerance = toleranceOf(options.tolerance);
	const now = nowOf(options.now);
	const encoder = new TextEncoder();
	const body = bodyBytesOf(options.body, encoder);
	const { timestamp, macs } = partsOf(headerOf(options.signature));

	const signed = signedBytesOf(timestamp, body, encoder);
	const genuine = await matches(secret, signed, macs, encoder);
	if (!genuine) {
		throw clientError('WEBHOOK_SIGNATURE', 'The webhook signature does not match its body.', MISMATCH_STEP);
	}
	if (Math.abs(now - timestamp) > tolerance) {
		const message = `The webhook was signed more than ${tolerance} seconds away from now.`;
		throw clientError('WEBHOOK_EXPIRED', message, EXPIRED_STEP);
	}
	return eventOf(options.body);
}
