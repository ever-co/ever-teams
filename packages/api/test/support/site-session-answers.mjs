// The answers of POST /api/embed/renew and POST /api/embed/revoke, as Gauzy writes them on the branch of
// ever-co/ever-gauzy#12094 (packages/core/src/lib/embed/embed-site-grant.service.ts and embed.controller.ts; Nest's
// exceptions; @nestjs/throttler). Each is a function, so every test reads a fresh Response.
export const API_URL = 'https://api.example.com/api';

// The shape of a renewal token (gzr_ and 43 base64url characters), made up for the tests.
export const RENEWAL_TOKEN = 'gzr_Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC1yZW5ld2Fs';

const JSON_TYPE = { 'Content-Type': 'application/json; charset=utf-8' };

// The renewal route answers its success and its refusals with these (embed.controller.ts).
const NO_STORE = { ...JSON_TYPE, 'Cache-Control': 'no-store', Pragma: 'no-cache' };

export const answer = (status, statusText, body, headers = JSON_TYPE) =>
	new Response(JSON.stringify(body), { status, statusText, headers });

export const TOKENS = {
	token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.c2lnbmF0dXJl',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_bmV4dC1yZW5ld2FsLXRva2VuLWZvci10ZXN0cy1vbmx5',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};

export const renewed = () => answer(200, 'OK', TOKENS, NO_STORE);

// POST /embed/revoke: 204 for any token.
export const revoked = () => new Response(null, { status: 204, statusText: 'No Content' });

const refusal = (status, statusText, code, message) =>
	answer(status, statusText, { statusCode: status, code, message }, NO_STORE);

// A renewal token malformed, unknown, revoked, expired or already used.
export const grantEnded = () =>
	refusal(
		401,
		'Unauthorized',
		'EMBED_GRANT_ENDED',
		"This site's sign-in has ended: it was revoked, it expired or its renewal token was already used. Sign in again from this site."
	);

// From another site than the grant's, or with no Origin header.
export const fromAnotherSite = () =>
	refusal(
		403,
		'Forbidden',
		'EMBED_ORIGIN',
		'This renewal token works only from the site it was issued for. Renew it from that site.'
	);

export const siteNotAllowed = () =>
	refusal(
		403,
		'Forbidden',
		'EMBED_ORIGIN_NOT_ALLOWED',
		"This site is not one of the organization's allowed sites. Ask an administrator of the organization to add it."
	);

export const signInOff = () =>
	refusal(
		403,
		'Forbidden',
		'EMBED_SITE_SIGN_IN_OFF',
		'People cannot sign in from this site. Ask an administrator of the organization to turn sign-in on for it.'
	);

export const memberNotAllowed = () =>
	refusal(
		403,
		'Forbidden',
		'EMBED_MEMBER_NOT_ALLOWED',
		'Only an active member of the organization whose time tracking is on can start a timer from a site. Ask an administrator of the organization.'
	);

// GAUZY_EMBED_TOKENS_ENABLED off, or an API before the routes: new NotFoundException().
export const embedsOff = () => answer(404, 'Not Found', { message: 'Not Found', statusCode: 404 });

// The route's rate limit (@nestjs/throttler, throttler named "default"): the wait in Retry-After.
export const throttled = () =>
	answer(
		429,
		'Too Many Requests',
		{ statusCode: 429, message: 'ThrottlerException: Too Many Requests' },
		{ ...JSON_TYPE, 'Retry-After': '30' }
	);

// The database out of reach: new ServiceUnavailableException(DATABASE_UNAVAILABLE_MESSAGE).
export const databaseOut = () =>
	answer(
		503,
		'Service Unavailable',
		{
			message: 'The service is temporarily unavailable. Please try again shortly.',
			error: 'Service Unavailable',
			statusCode: 503
		},
		NO_STORE
	);

/** A stand-in fetch that answers `respond(request)` and keeps each request, with its body read as JSON. */
export function siteApi(respond) {
	const requests = [];
	const fetch = async (url, init) => {
		const request = {
			url,
			method: init.method,
			headers: new Headers(init.headers),
			credentials: init.credentials,
			body: JSON.parse(init.body)
		};
		requests.push(request);
		return respond(request);
	};
	return { fetch, requests };
}
