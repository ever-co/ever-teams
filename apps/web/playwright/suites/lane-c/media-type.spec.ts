import { request as httpRequest } from 'node:http';

import { expect, test, type ApiCall } from '../../api-fixtures';
import { authCookieHeader, loadFixture } from '../../helpers';
import { APP_ORIGIN } from '../../test-servers';

/**
 * A proxy route forwards a JSON body and nothing else.
 *
 * `forwardToGauzy` reads the body only after the origin and session checks, and refuses a declared media
 * type that is not `application/json` *before* reading it (line 104), plus a body that arrives with no
 * declared type at all (line 107). That is the CSRF defence for the case the origin check cannot see: a
 * form post, `text/plain` or an untyped request reaches the handler with the session's cookies and no CORS
 * preflight, because a browser is allowed to send those without asking. A route that acts on a JSON body
 * must therefore not act on those.
 *
 * `POST /api/user-api-tokens` is the one route in this family that runs its own media-type gate before it
 * even reads the session (`isJsonRequest` in its route file), so its 415 is proved differently: the mock
 * is asked nothing, not even the `GET /user/me` the app's session guard makes.
 *
 * Every case here sends a body that is not JSON-parsable, so Playwright passes it through as it is rather
 * than re-encoding it. Playwright still *types* such a body: playwright-core server/fetch.js sets
 * `application/octet-stream` on any post data the test does not type itself. So the untyped-body case below goes
 * through `node:http` instead, the one client here that sends a body with no `Content-Type` header at all.
 *
 * **Run on lane-c, 2026-11-21, with no change needed to the file:** `Running 41 tests using 1 worker` /
 * `41 passed (6.5s)` (log `artifacts/lane-c-media-type-1.log`; a second writer's batch of the same file printed
 * `41 passed (6.1s)`, so the file is green under two independent runs). Every one of the 36 declared-type probes
 * answered 415 with a body whose `message` is exactly `Unsupported Media Type` and the mock asked nothing; the two
 * untyped-body probes, the charset probe (200, one forwarded call), the GET-with-a-type probe (200, forwarded), the
 * cross-site form post (`403` whose body says `Cross-site request refused`, not the 415 — the order the header
 * claims) and `POST /api/user-api-tokens` (415 with an **empty** mock log, i.e. its own `isJsonRequest` gate ran
 * before any session read) all behaved as written. Nothing in this file is a finding: it is the shape the proxy
 * actually keeps.
 */

const FORM_BODY = 'name=Fixture&email=manager@example.test';

type UntypedAnswer = { status: number; text: string; sentContentType: string | undefined };

/** A write sent with `node:http`, which adds no `Content-Type` of its own: the one way here to send an untyped body. */
function sendUntyped(method: string, path: string, body: string, cookie: string): Promise<UntypedAnswer> {
	return new Promise((resolve, reject) => {
		const outgoing = httpRequest(
			new URL(path, APP_ORIGIN),
			{ method, headers: { accept: 'application/json', cookie, 'content-length': Buffer.byteLength(body) } },
			(incoming) => {
				let text = '';
				// A connection cut after the headers never emits `end`: reject instead of waiting for the test timeout.
				incoming.once('error', reject);
				incoming.setEncoding('utf8');
				incoming.on('data', (chunk: string) => (text += chunk));
				incoming.on('end', () =>
					resolve({
						status: incoming.statusCode ?? 0,
						text,
						sentContentType: outgoing.getHeader('content-type') as string | undefined
					})
				);
			}
		);
		outgoing.on('error', reject);
		outgoing.setTimeout(60_000, () => outgoing.destroy(new Error(`${method} ${path}: no answer within 60 s`)));
		outgoing.end(body);
	});
}

type WriteProbe = { verb: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string };

/** Thin `forwardToGauzy` handlers: the gate is the helper's, so it applies to all of them. */
const PROXIED_WRITES: WriteProbe[] = [
	{ verb: 'POST', path: '/api/chat/conversations' },
	{ verb: 'POST', path: '/api/timesheet/time-log' },
	{ verb: 'POST', path: '/api/task-views' },
	{ verb: 'POST', path: '/api/time-goals' },
	{ verb: 'PUT', path: '/api/user/ui-preferences' },
	{ verb: 'POST', path: '/api/embed-allowed-origins' },
	{ verb: 'POST', path: '/api/realtime/presence' },
	{ verb: 'POST', path: '/api/inbox/push-subscriptions' },
	{ verb: 'POST', path: '/api/plugins/docs/documents' }
];

const DECLARED_TYPES = [
	'text/plain',
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'application/octet-stream'
];

async function write(api: ApiCall, probe: WriteProbe, headers: Record<string, string>) {
	const response = await api(probe.path, { method: probe.verb, body: FORM_BODY, headers });
	const text = await response.text();
	return { status: response.status(), text, why: `${probe.verb} ${probe.path} with ${JSON.stringify(headers)}` };
}

test.describe('a write whose body is not JSON is refused before it is read', () => {
	for (const probe of PROXIED_WRITES) {
		for (const mediaType of DECLARED_TYPES) {
			test(`${probe.verb} ${probe.path} as ${mediaType}`, async ({ api, mock }) => {
				const { status, text, why } = await write(api, probe, { 'content-type': mediaType });

				expect(status, `${why}: answered ${status} ${text} instead of refusing the media type`).toBe(415);

				let answer: Record<string, unknown> = {};
				try {
					answer = JSON.parse(text) as Record<string, unknown>;
				} catch {
					// Left empty; the message below quotes the body.
				}
				expect(answer.message, `${why}: the 415 did not name the media type (${text})`).toBe(
					'Unsupported Media Type'
				);

				expect(
					(await mock.requests()).map((request) => `${request.method} ${request.path}`),
					`${why}: a body this app refuses must never reach the API`
				).toEqual([]);
			});
		}
	}

	test('a body that arrives with no declared type at all is refused too', async ({ mock }) => {
		// The harder half of the rule: `text/plain` a client declares is visible, an untyped body is only
		// known once read — and `forwardToGauzy` reads it, sees something there, and refuses (line 107).
		// Sent with `node:http`, not the `api` fixture: Playwright types every body it sends (see the header).
		const probes: WriteProbe[] = [
			{ verb: 'POST', path: '/api/chat/conversations' },
			{ verb: 'PUT', path: '/api/user/ui-preferences' }
		];
		const cookie = authCookieHeader(await loadFixture(), 'A');

		for (const probe of probes) {
			const answer = await sendUntyped(probe.verb, probe.path, FORM_BODY, cookie);

			expect(
				answer.sentContentType,
				`${probe.verb} ${probe.path}: the probe itself declared a type`
			).toBeUndefined();
			expect(answer.status, `${probe.verb} ${probe.path} with an untyped body answered ${answer.text}`).toBe(415);
		}

		expect(
			(await mock.requests()).map((request) => `${request.method} ${request.path}`),
			'an untyped body was forwarded to the API'
		).toEqual([]);
	});

	test('a JSON body with a charset on the type is still a JSON body', async ({ api, mock }) => {
		// The gate takes the type before its parameters; a suite that broke on `; charset=` would be a suite
		// that refuses the app's own requests.
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: { title: 'charset on the type' },
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
		const text = await response.text();

		expect(response.status(), `a well-formed JSON write with a charset was refused (${text})`).toBe(200);
		expect((await mock.calls('/api/chat/conversations')).length, 'the write never reached the API').toBe(1);
	});

	test('the gate is about a body, not about a request: a GET naming a media type is forwarded', async ({
		api,
		mock
	}) => {
		// `hasBody` is false for GET and HEAD, so a read that declares an odd type is not refused. Pinned so
		// the gate is not read as a blanket content-type policy.
		const response = await api('/api/chat/conversations', { headers: { 'content-type': 'text/plain' } });
		const text = await response.text();

		expect(response.status(), `a GET with a text/plain type was refused (${text})`).toBe(200);
		expect((await mock.calls('/api/chat/conversations')).length, 'the read was not forwarded').toBe(1);
	});

	test('the origin check runs before the media-type check', async ({ api, mock }) => {
		// A cross-site form post is exactly the request this pair of guards exists for, and the order
		// matters for what a caller learns: the refusal is about where the request came from, and nothing
		// of the body is examined.
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: FORM_BODY,
			headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://some-other-site.example' }
		});
		const text = await response.text();

		expect(
			response.status(),
			`a cross-site form post answered ${response.status()} ${text} instead of the origin refusal`
		).toBe(403);
		expect(text, `the refusal was about the media type, not the origin: ${text}`).toContain(
			'Cross-site request refused'
		);
		expect(await mock.requests(), 'a cross-site form post reached the API').toEqual([]);
	});

	test('POST /api/user-api-tokens refuses the media type before it even asks who the caller is', async ({
		api,
		mock
	}) => {
		// This route's own gate (`isJsonRequest`) runs before `authenticatedGuard`, so unlike every other
		// guard-backed route in this lane it asks the mock API nothing at all — not even the session check.
		const response = await api('/api/user-api-tokens', {
			method: 'POST',
			body: FORM_BODY,
			headers: { 'content-type': 'text/plain' }
		});
		const text = await response.text();

		expect(response.status(), `a form-encoded token creation answered ${response.status()} ${text}`).toBe(415);
		expect(
			await mock.requests(),
			'the session check or the token creation reached the API despite the 415'
		).toEqual([]);
	});
});
