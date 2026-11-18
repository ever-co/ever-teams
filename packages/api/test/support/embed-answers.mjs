// The answers of POST /api/embed/token, as Gauzy writes them on develop
// (packages/core/src/lib/embed/embed-credential.service.ts, refusalOf; embed.guards.ts, EmbedEnabledGuard; Nest's
// exceptions; @nestjs/throttler). Each is a function, so every test reads a fresh Response.
export const API_URL = 'https://api.example.com/api';

// The shape of a credential (gze_ and 43 base64url characters), made up for the tests.
export const CREDENTIAL = 'gze_Zm9yLXRlc3RzLW9ubHktbm90LWEtcmVhbC1zZWNyZXQ';

export const ORIGIN = 'https://app.example.com';

const JSON_TYPE = { 'Content-Type': 'application/json; charset=utf-8' };

// The embed routes answer every success and refusal with these (embed.controller.ts).
const NO_STORE = { ...JSON_TYPE, 'Cache-Control': 'no-store', Pragma: 'no-cache' };

export const answer = (status, statusText, body, headers = JSON_TYPE) =>
	new Response(JSON.stringify(body), { status, statusText, headers });

export const TOKEN = {
	token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.c2lnbmF0dXJl',
	expiresAt: '2026-11-18T18:15:00.000Z'
};

export const tokenIssued = () => answer(200, 'OK', TOKEN, NO_STORE);

// A malformed, unknown or revoked credential: new UnauthorizedException().
export const credentialRefused = () =>
	answer(401, 'Unauthorized', { message: 'Unauthorized', statusCode: 401 }, NO_STORE);

export const memberNotAllowed = () =>
	answer(
		403,
		'Forbidden',
		{
			statusCode: 403,
			code: 'EMBED_MEMBER_NOT_ALLOWED',
			message: 'This member cannot track time through an embed.'
		},
		NO_STORE
	);

export const originNotAllowed = () =>
	answer(
		403,
		'Forbidden',
		{
			statusCode: 403,
			code: 'EMBED_ORIGIN_NOT_ALLOWED',
			message: "This site is not allowed to embed the organization's timer."
		},
		NO_STORE
	);

// The cap on refused credentials per address: an HttpException, with no Retry-After.
export const addressLimited = () =>
	answer(
		429,
		'Too Many Requests',
		{
			statusCode: 429,
			code: 'EMBED_EXCHANGE_LIMITED',
			message: 'Too many refused credentials from this address. Try again in a minute.'
		},
		NO_STORE
	);

// The route's rate limit (@nestjs/throttler, throttler named "default"): the wait in Retry-After.
export const throttled = () =>
	answer(
		429,
		'Too Many Requests',
		{ statusCode: 429, message: 'ThrottlerException: Too Many Requests' },
		{ ...JSON_TYPE, 'Retry-After': '42' }
	);

// GAUZY_EMBED_TOKENS_ENABLED off: new NotFoundException().
export const embedsOff = () => answer(404, 'Not Found', { message: 'Not Found', statusCode: 404 });

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
export function embedApi(respond) {
	const requests = [];
	const fetch = async (url, init) => {
		const request = {
			url,
			method: init.method,
			headers: new Headers(init.headers),
			body: JSON.parse(init.body)
		};
		requests.push(request);
		return respond(request);
	};
	return { fetch, requests };
}
