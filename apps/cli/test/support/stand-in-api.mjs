// A stand-in Ever Teams API behind the SDK's fetch. A route answers what packages/api recorded from a running API
// (packages/api/test/contract), or what a test gives; `requests` keeps what the SDK sent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeLogin } from '../../dist/config.js';
import { newHome, placeOf } from './cli.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_DIR = path.join(here, '..', '..', '..', '..', 'packages', 'api', 'test', 'contract');

export const API_URL = 'http://127.0.0.1:3000/api';

// Made up for the tests, in the form of a personal API token and of the access token the exchange answers.
export const PERSONAL_TOKEN = 'gzp_c2f4d6e8a0b1c3d5e7f9a1b3c5d7e9f1';
export const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LW1lbWJlciJ9.dGVzdC1zaWduYXR1cmU';

/** A home whose login holds PERSONAL_TOKEN for `apiUrl`. */
export function signedInHome(apiUrl = API_URL) {
	const home = newHome();
	writeLogin(placeOf(home), { apiUrl, token: PERSONAL_TOKEN });
	return home;
}

/** The answer recorded for `name` (user.me, timer.status, ...), a copy a test may change. */
export function recorded(name) {
	const text = fs.readFileSync(path.join(CONTRACT_DIR, `${name}.json`), 'utf8');
	return JSON.parse(text).answer;
}

export const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const notFound = (route) => json(404, { statusCode: 404, message: `Cannot ${route}`, error: 'Not Found' });

function bodyOf(init) {
	if (!init.body) {
		return undefined;
	}
	return JSON.parse(init.body);
}

/** Every signed-in command goes through these two: the exchange of the personal token, and the user. */
export const signedIn = () => ({
	'POST /auth/api-token/exchange': (request) => {
		if (request.body.token !== PERSONAL_TOKEN) {
			return json(401, { statusCode: 401, message: 'Unauthorized' });
		}
		return json(200, { token: ACCESS_TOKEN });
	},
	'GET /user/me': recorded('user.me')
});

/** Answers each "METHOD /path" (under /api, ids decoded) with its route: an answer, or a function of the request. */
export function standInApi(routes) {
	const requests = [];
	const fetch = async (url, init = {}) => {
		const parsed = new URL(url);
		const pathname = decodeURIComponent(parsed.pathname).replace(/^\/api/, '');
		const route = `${init.method ?? 'GET'} ${pathname}`;
		const request = {
			url,
			route,
			query: parsed.searchParams,
			headers: new Headers(init.headers),
			body: bodyOf(init)
		};
		requests.push(request);
		const answer = routes[route];
		if (answer === undefined) {
			return notFound(route);
		}
		if (typeof answer === 'function') {
			return answer(request);
		}
		return json(200, answer);
	};
	const routesSent = () => requests.map((request) => request.route);
	return { fetch, requests, routesSent };
}

/** The whole of what a run wrote, and what the SDK sent: where a token must never appear. */
export const everythingOf = (result, api) =>
	[result.stdout, result.stderr, ...api.requests.map((request) => request.url)].join('\n');
