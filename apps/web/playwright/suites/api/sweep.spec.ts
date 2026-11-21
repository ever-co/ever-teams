import { expect, test, type StubRequest } from '../../api-fixtures';
import { apiRoutes, unattributedApiRoutes } from './routes.generated';

/**
 * Every Next.js route handler in the web app, called over HTTP with no browser in the loop.
 *
 * For every HTTP verb a handler actually exports, this proves:
 *   - the route exists and still answers like an API (a Next 404 answers HTML)
 *   - it does not 5xx when a signed-in person sends it a well-formed JSON body
 *   - anything it 5xx'd with is written down below, with the status it produced and why — a blocker
 *     has to be named and pinned, so a change in behaviour fails the run instead of sliding past it
 *
 * The app proxies its server-side Gauzy calls to the mock API (apps/web/cypress/support/
 * mock-gauzy-server.mjs), so the handler code is real and the upstream is fake: a route that would
 * otherwise reach a production API reaches the mock instead, and the mock's log shows what the route
 * really asked for. Where the mock implements no route, the app answers its own upstream-failure
 * status; that is a limit of the harness, and it is recorded as such rather than hidden.
 *
 * Dynamic segments come from the fixture. A few are filled with values chosen to keep the work on
 * this machine (see PARAMS) — a test must not make the server fetch from the public internet.
 *
 * Two readings here say "no 5xx", and a reading that cannot fail is worth nothing (AUDIT.md finding 7). The
 * mock answers 2xx unless a scenario switch is armed, and the sweep arms none, so per-route the
 * `every(request => request.status < 500)` reading and the `toBeLessThan(500)` status ceiling are
 * satisfied by construction. What makes them mean something is the last describe in this file: it arms the
 * mock's own failure switch on a route the sweep also walks, and asserts there that the same reading is
 * **false**, with the log entry that failed named. `suites/api/upstream-outage.spec.ts` is the other half —
 * the answers this app produces when the upstream never answers at all.
 */

const PARAMS: Record<string, string> = {
	id: 'task',
	userId: 'user',
	employeeId: 'employee',
	teammateId: 'teammateEmployee',
	teamId: 'teamA',
	taskId: 'task',
	projectId: 'project',
	planId: 'plan',
	versionId: 'version',
	invoiceId: 'invoice',
	documentId: 'document',
	commentId: 'comment',
	mappingId: 'mapping',
	conflictId: 'conflict',
	// Not ids: values that keep a handler's work local, or that are plainly inert.
	host: '127.0.0.1:3030',
	folder: 'playwright-artifacts',
	token: 'synthetic-token',
	email: 'manager@example.test',
	emoji: 'thumbs-up',
	size: '128x128',
	background: 'ffffff',
	action: 'accept',
	key: 'general',
	profileLink: 'profileLink',
	workspaceGid: 'workspace-gid-1',
	projectGid: 'project-gid-1',
	// Keys are the segment without its brackets (resolveRoute strips them).
	'...path': 'health',
	'...nextauth': 'session'
};

function resolveRoute(path: string, ids: Record<string, string>, names: Record<string, string>): string {
	return path.replace(/\[[^\]]+\]/g, (raw) => {
		const key = raw.slice(1, -1);
		const value = PARAMS[key];
		if (!value) return 'playwright-param';
		if (ids[value]) return ids[value];
		if (names[value]) return names[value];
		return value;
	});
}

/**
 * Handlers that answer 5xx, each pinned to the status it produced, the **body** it produced with it, and
 * the reason. Two kinds:
 *   'mock gap' — the deterministic backend implements no upstream route (or answers one this handler cannot
 *                use), so the app answers its own upstream-failure status. The handler behaved correctly; the
 *                harness cannot go further.
 *   'app'      — the handler itself. Named here so it is a finding with an owner, not a skipped test.
 *
 * `body` is what separates a 5xx that means "the harness has nothing behind this route" from a 5xx that
 * means "the upstream refused, or gave up" (AUDIT.md finding 7): a status alone cannot tell them apart,
 * and both are 502. `body` is the answer's JSON fields, or `null` where the answer carries no body at all —
 * which is its own finding, because then the reason lives only in the server log a developer never sees.
 *
 * There is no generator for this list: it is kept by hand, from what a run of this suite reports. Every
 * entry here was read in the handler it names, and the body is what that handler answers, not what it
 * ought to answer.
 *
 * `suites/lane-c/malformed-json.spec.ts` pins a different set — handlers that 500 on a body that is not
 * JSON at all (`MALFORMED_BLOCKERS`). No handler appears in both lists today; if one ever joins them, the
 * two pins have to agree, and a disagreement is a finding about that handler.
 */
const DOCUMENTED_SERVER_BLOCKERS: Record<
	string,
	{
		status: number;
		kind: 'mock gap' | 'app';
		body: Record<string, unknown> | null;
		reason: string;
	}
> = {
	'POST /api/ai/transcribe': {
		status: 503,
		kind: 'app',
		// `errorResponse('not_configured', 503)` in app/api/ai/transcribe/route.ts
		body: { error: 'not_configured' },
		reason: 'no speech provider is configured for a test run; the handler answers 503 {"error":"not_configured"}'
	},
	'POST /api/ai/voice-fill': {
		status: 503,
		kind: 'app',
		// `errorResponse('not_configured', 503)` in app/api/ai/voice-fill/route.ts
		body: { error: 'not_configured' },
		reason: 'no speech provider is configured for a test run; the handler answers 503 {"error":"not_configured"}'
	},
	'POST /api/invite/accept': {
		status: 502,
		kind: 'mock gap',
		// `failureResponse` in app/api/invite/accept/route.ts: an answer that is not a refused-promise with a
		// status in it becomes this. It is *not* `forward-to-gauzy.ts`'s outage answer ("The Gauzy API is
		// unreachable" / "…did not answer in time"), and naming which of the two it is is the point of `body`.
		body: { statusCode: 502, message: 'The Gauzy API gave no usable answer' },
		reason:
			'the mock has no POST /api/invite/accept of its own (its catch-all answers it, and answers it with a body that carries no tokens), so the app reports 502 "The Gauzy API gave no usable answer"'
	},
	'POST /api/auth/login': {
		status: 500,
		kind: 'app',
		// No body: `authFormValidate(['email','code'], {})` calls `.trim()` on `values['code']`, which is
		// undefined, and nothing in the route catches that throw — so this is Next's own 500 answer.
		body: null,
		reason: 'an empty-but-valid JSON body reaches the handler with no email or code and it 500s instead of answering 400'
	},
	'POST /api/auth/register': {
		status: 500,
		kind: 'app',
		body: null,
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/auth/signin-email-confirm': {
		status: 500,
		kind: 'app',
		body: null,
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/auth/verify/code': {
		status: 500,
		kind: 'app',
		body: null,
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/image-assets/upload/[folder]': {
		status: 500,
		kind: 'app',
		// `await req.formData()` on a JSON-bodied request throws, outside any catch: Next's own 500 answer.
		body: null,
		reason: 'an upload call with no file part 500s instead of a 400'
	},
	'DELETE /api/timer/timesheet/bulk-delete': {
		status: 500,
		kind: 'app',
		// `await req.json()` at line 10 is outside the route's try/catch, so its own
		// {"error":"Failed to delete timesheet data"} 500 and its 400 are both never reached.
		body: null,
		reason: 'a bulk delete with an empty body 500s instead of a 400'
	}
};

/** Handlers that legitimately answer with something other than JSON. */
const NON_JSON_ROUTES: Record<string, string> = {
	'GET /api/favicons/[host]': 'a favicon proxy: it answers with the icon it fetched',
	'GET /api/placeholder/[size]/[background]': 'a placeholder image proxy',
	'GET /api/public-assets/[...path]': 'serves a static public asset'
};

for (const route of apiRoutes) {
	for (const verb of route.verbs) {
		const title = `${verb} ${route.path}`;

		test(`${title} answers as an API without a 5xx`, async ({ api, ids, names, mock }) => {
			const url = resolveRoute(route.path, ids, names);
			// The app always sends JSON on a mutating call, so that is what this sends. The bodiless
			// case is its own suite in empty-body.spec.ts, where the handlers that cannot take one are
			// written down rather than skipped.
			const mutating = verb === 'POST' || verb === 'PUT' || verb === 'PATCH';
			const response = await api(url, { method: verb, body: mutating ? {} : undefined });
			const status = response.status();
			const body = await response.text().catch(() => '<unreadable body>');
			const blocker = DOCUMENTED_SERVER_BLOCKERS[title];

			if (blocker) {
				expect(
					status,
					`${title} is documented as a ${blocker.status} ${blocker.kind} ("${blocker.reason}"); it answered ${status} — either it was fixed (remove the entry) or it changed (${body.slice(0, 200)})`
				).toBe(blocker.status);

				// The status is only half the pin: a 502 that means "the harness has nothing behind this route"
				// and a 502 that means "the upstream refused or gave up" are the same number. The body is what
				// tells them apart, so it is pinned too, and a blocker whose answer stops naming its reason
				// fails here rather than being mistaken for one of the other kind.
				if (blocker.body === null) {
					expect(
						body,
						`${title} is documented as a ${blocker.status} ${blocker.kind} whose answer carries no body at all (${JSON.stringify(blocker.body)}): the reason lives only in the server log ("${blocker.reason}"). It answered ${body.length} bytes: ${body.slice(0, 200) || '<empty>'}`
					).toBe('');
				} else {
					let answered: unknown;
					try {
						answered = JSON.parse(body);
					} catch {
						answered = { unparsed: body.slice(0, 200) };
					}
					expect(
						answered,
						`${title} is documented as a ${blocker.status} ${blocker.kind} answering ${JSON.stringify(blocker.body)} ("${blocker.reason}"); its status is right but its answer is ${body.slice(0, 200) || '<empty>'} — the failure now names a different side`
					).toMatchObject(blocker.body);
				}
			} else {
				expect(status, `${title} crashed the handler (status ${status}): ${body.slice(0, 400)}`).toBeLessThan(
					500
				);
			}

			const contentType = response.headers()['content-type'] ?? '';
			if (body.length === 0) {
				// A 204, a redirect, or a bodiless 4xx — a 405 for a verb the handler does not export, a
				// 404 like "this request carries no Ever ID handoff cookie". There is no body to be JSON
				// about, so the status asserted above is the whole assertion.
				expect(
					contentType,
					`${title} answered ${status} with no body but a content-type of ${contentType}`
				).toBe('');
			} else if (NON_JSON_ROUTES[title]) {
				expect(
					contentType,
					`${title} answers ${contentType || 'nothing'}: ${NON_JSON_ROUTES[title]}`
				).not.toContain('application/json');
			} else {
				expect(
					contentType,
					`${title} answered ${status} ${contentType || 'no content-type'} (${body.length} bytes) — a route handler answers JSON`
				).toContain('application/json');
			}

			const upstream = await mock.requests();
			// Kept, because it is the reading the last describe proves has teeth: the mock answers 2xx unless a
			// scenario switch arms a failure, and this loop arms none, so per route this can only fail if a
			// handler breaks the mock's own fixture rules.
			expect(
				upstream.every((request) => request.status < 500),
				`${title} caused a failing call to the mock Gauzy API: ${JSON.stringify(upstream.filter((r) => r.status >= 500))}`
			).toBe(true);
		});
	}
}

test('every route handler is attributed to at least one verb', () => {
	// Every handler exports its verbs by name, the NextAuth catch-all included since it wraps them
	// (`export const GET = ...`, #5527). A handler the collector cannot read would go unswept, so none may.
	expect(unattributedApiRoutes).toEqual([]);
});

test('the NextAuth route answers its own endpoints', async ({ api }) => {
	for (const endpoint of ['/api/auth/session', '/api/auth/providers', '/api/auth/csrf']) {
		const response = await api(endpoint);
		expect(response.status(), `${endpoint} answered ${response.status()}`).toBeLessThan(500);
		expect(response.headers()['content-type'] ?? '').toContain('application/json');
	}
});

/** `METHOD PATH STATUS`, the entry a log assertion cares about, named as it is written in the mock's log. */
const triple = (request: StubRequest) => `${request.method} ${request.path} ${request.status}`;

/** The whole log, for a failure message that has to show what the filtered view left out. */
const logOf = (requests: StubRequest[]) => requests.map(triple).join(', ');

function parseAnswer(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { unparsed: text.slice(0, 200) };
	}
}

/**
 * The two no-5xx readings of the sweep above, in a case where they can fail (AUDIT.md finding 7).
 *
 * Per route they are satisfied by construction: the mock answers 2xx for every path it holds no route for
 * (`mock-gauzy-server.mjs`'s catch-all) and produces a 5xx only behind a scenario switch, which the loop
 * above never sets. So the readings are kept — they catch a handler that breaks the fixture rules — but what
 * makes them mean something is proved here, on a route the sweep also walks:
 *
 *   unarmed  — the route answers 200 and the reading is true;
 *   armed    — `scenario.notificationSettingFails` makes the *upstream* answer 500
 *              (`mock-gauzy-server.mjs`, the employee-notification-setting branch), the app passes that
 *              refusal through with the mock's own body, and the very same reading is **false**.
 *
 * If the armed case ever reports an empty list of failing calls, the sweep's reading has lost its teeth: it
 * would no longer be able to say false for an upstream that failed.
 *
 * The log is read filtered (method + path), as `suites/lane-c/foreign-id-scope.spec.ts`'s `triple()` does
 * (finding 14): the session check's own `GET /api/user/me` belongs to the guard, not to this route, and a
 * whole-log comparison lets whichever test ran last decide the outcome.
 */
test.describe('a 5xx that can happen: the sweep reading, armed with a real upstream failure', () => {
	const ROUTE = '/api/employee-notification-setting';
	const ofRoute = (requests: StubRequest[]) => requests.filter((request) => request.path === ROUTE).map(triple);

	test('unarmed, the route answers 200 and every upstream call succeeded', async ({ api, mock }) => {
		const response = await api(ROUTE);
		const status = response.status();
		const text = await response.text();
		const requests = await mock.requests();

		expect(status, `the unarmed ${ROUTE} answered ${status}: ${text.slice(0, 200)}`).toBe(200);
		expect(
			ofRoute(requests),
			`${ROUTE} did not ask its own upstream endpoint (whole log: ${logOf(requests)})`
		).toEqual(['GET /api/employee-notification-setting 200']);
		expect(
			requests.every((request) => request.status < 500),
			`the sweep's reading is expected to be true with nothing armed, but the log holds ${logOf(requests)}`
		).toBe(true);
	});

	test('armed with the mock\'s own 500 switch, the app answers the upstream refusal — and the sweep reading is false', async ({
		api,
		mock
	}) => {
		await mock.scenario({ notificationSettingFails: true });

		const response = await api(ROUTE);
		const status = response.status();
		const text = await response.text();
		const requests = await mock.requests();
		const entry = `GET ${ROUTE} 500`;

		// The refusal is the mock's own words, passed on by `gauzyErrorResponse` because the rejection carried a
		// status. The route's fallback message would mean something else entirely: an upstream that gave no
		// usable answer at all (see suites/api/upstream-outage.spec.ts).
		expect(status, `the armed ${ROUTE} answered ${status}: ${text.slice(0, 200)}`).toBe(500);
		expect(
			parseAnswer(text),
			`the armed ${ROUTE} answered ${status} with ${text.slice(0, 200)} — the upstream's own refusal body was expected (statusCode 500, "Internal server error")`
		).toMatchObject({ statusCode: 500, message: 'Internal server error' });
		expect(
			text,
			`the armed ${ROUTE} answered with this app's fallback message instead of the upstream's refusal: ${text.slice(0, 200)}`
		).not.toContain('Notification settings request failed');

		expect(
			ofRoute(requests),
			`${ROUTE}: the mock was expected to answer ${entry} behind its failure switch (whole log: ${logOf(requests)})`
		).toEqual([entry]);

		// The sweep's own assertion, applied where it can fail: it must say false for this call.
		expect(
			requests.every((request) => request.status < 500),
			`the sweep reads "no upstream call returned 5xx" as ${requests.every(
				(request) => request.status < 500
			)} while the mock answered ${entry} (${logOf(requests)}). An armed failure the reading cannot see means the reading has no teeth`
		).toBe(false);
	});

	test('a mock gap and an upstream refusal are different answers, and the log says which one this is', async ({
		api,
		mock
	}) => {
		// `POST /api/invite/accept` is the one entry above labelled 'mock gap'. Reading the mock, the gap is not
		// "no answer": its catch-all answers the accept with a body that carries no tokens, and the app's 502 is
		// the app's own mapping of an answer it cannot use ("no usable answer"), not the proxy's outage answer
		// ("is unreachable" / "did not answer in time"). Both halves are pinned so the two kinds stay apart.
		const response = await api('/api/invite/accept', { method: 'POST', body: {} });
		const status = response.status();
		const text = await response.text();
		const asked = await mock.calls('/api/invite/accept');

		expect(status, `POST /api/invite/accept answered ${status}: ${text.slice(0, 200)}`).toBe(502);
		expect(
			parseAnswer(text),
			`POST /api/invite/accept answered 502 with ${text.slice(0, 200)} — this is the app's own "no usable answer", not forward-to-gauzy's outage answer`
		).toMatchObject({ statusCode: 502, message: 'The Gauzy API gave no usable answer' });
		expect(
			text,
			`POST /api/invite/accept answered with an upstream-outage message, which would mean a different failure: ${text.slice(0, 200)}`
		).not.toMatch(/unreachable|did not answer in time/);

		expect(
			asked.map(triple),
			`POST /api/invite/accept: the mock gap was expected to be a 5xx from the mock, or no call at all; the log says otherwise (whole log: ${logOf(
				await mock.requests()
			)})`
		).toEqual(['POST /api/invite/accept 200']);
	});
});
