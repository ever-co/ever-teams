import { lookup as dnsLookup } from 'node:dns';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { Readable } from 'node:stream';
import { isBlockedAddress } from './custom-base-url';

/**
 * The `fetch` the chat's custom provider uses, on Node's http/https so the address check runs at connect
 * time: a host name can resolve differently between `checkCustomBaseUrl` and the request (DNS
 * rebinding), and the global fetch exposes no hook for that. It also:
 * - only fetches URLs under the checked origin;
 * - never follows a redirect (a public endpoint could send the request on to a private one): the
 *   redirect comes back as the response, which the provider SDK reports as an error.
 */

/** Statuses whose response has no body (the Response constructor rejects one). */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

function blockedAddressError(hostname: string) {
	return Object.assign(new Error(`Refusing to connect to ${hostname}: not a public address`), {
		code: 'ERR_ADDRESS_NOT_PUBLIC'
	});
}

/** A `lookup` for net/tls that fails when the host resolves to any blocked address. */
function guardedLookup(allowLoopback: boolean): LookupFunction {
	return (hostname, options, callback) => {
		dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
			if (error) return callback(error, '');
			if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address, allowLoopback))) {
				return callback(blockedAddressError(hostname), '');
			}
			if (options.all) return callback(null, addresses);
			callback(null, addresses[0].address, addresses[0].family);
		});
	};
}

function requestBody(body: RequestInit['body']): Buffer | undefined {
	if (body == null) return undefined;
	if (typeof body === 'string') return Buffer.from(body);
	if (body instanceof ArrayBuffer) return Buffer.from(body);
	if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	throw new TypeError('The guarded fetch sends string or binary request bodies only');
}

export function createGuardedFetch({ baseURL, allowLoopback }: { baseURL: string; allowLoopback: boolean }) {
	const origin = new URL(baseURL).origin;
	const lookup = guardedLookup(allowLoopback);

	const guardedFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
		if (input instanceof Request) throw new TypeError('The guarded fetch takes a URL, not a Request');
		const url = new URL(String(input));
		if (url.origin !== origin) throw new TypeError(`Refusing to fetch outside ${origin}`);
		// net/tls skip `lookup` for an IP-literal host, so check one here.
		const host = url.hostname.replace(/^\[|\]$/g, '');
		if (isIP(host) !== 0 && isBlockedAddress(host, allowLoopback)) throw blockedAddressError(host);

		const body = requestBody(init.body);
		const headers = new Headers(init.headers);
		if (body) headers.set('content-length', String(body.byteLength));
		// Node's http client does not decompress; ask for an uncompressed response.
		if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'identity');
		const method = (init.method ?? 'GET').toUpperCase();
		const send = url.protocol === 'https:' ? httpsRequest : httpRequest;

		return new Promise<Response>((resolve, reject) => {
			const request = send(
				url,
				{ method, headers: Object.fromEntries(headers), lookup, signal: init.signal ?? undefined },
				(response) => {
					const status = response.statusCode ?? 502;
					const responseHeaders = new Headers();
					for (let i = 0; i < response.rawHeaders.length; i += 2) {
						responseHeaders.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
					}
					const hasBody = method !== 'HEAD' && !NULL_BODY_STATUSES.has(status);
					if (!hasBody) response.resume();
					resolve(
						new Response(
							hasBody ? (Readable.toWeb(response) as unknown as ReadableStream<Uint8Array>) : null,
							{
								status,
								statusText: response.statusMessage,
								headers: responseHeaders
							}
						)
					);
				}
			);
			request.on('error', reject);
			request.end(body);
		});
	};

	return guardedFetch as typeof fetch;
}
