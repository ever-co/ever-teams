// The answers of POST /api/embed/token and POST /api/embed/client-report, as Gauzy writes them on develop
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

export const REPORT = {
	client: { id: 'b7a4c8a2-3f0e-4c41-9a37-2d6f1c9e8b10', name: 'Fabrikam Outdoor' },
	timeZone: 'Europe/Paris',
	today: { date: '2026-11-18', seconds: 5400 },
	week: { start: '2026-11-16', end: '2026-11-22', seconds: 19800 },
	projects: [
		{ id: '5d1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6', name: 'Trail maps', seconds: 14400 },
		{ id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f2a3b4c5d', name: 'Store front', seconds: 5400 }
	]
};

export const tokenIssued = () => answer(200, 'OK', TOKEN, NO_STORE);

export const reportRead = () => answer(200, 'OK', REPORT, NO_STORE);

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

export const clientRequired = () =>
	answer(
		403,
		'Forbidden',
		{
			statusCode: 403,
			code: 'EMBED_CLIENT_REQUIRED',
			message: 'This credential is not limited to a client. Create one for the client whose time it reports.'
		},
		NO_STORE
	);

export const clientGone = () =>
	answer(
		403,
		'Forbidden',
		{
			statusCode: 403,
			code: 'EMBED_CLIENT_GONE',
			message: "This credential's client was deleted. Restore the client, or create a credential for another one."
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

// A client report that failed once its credential was accepted: new InternalServerErrorException().
export const reportUnread = () =>
	answer(500, 'Internal Server Error', { message: 'Internal Server Error', statusCode: 500 }, NO_STORE);

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
