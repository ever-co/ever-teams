import { expect, test } from '../../api-fixtures';
import type { StubRequest } from '../../helpers';

/**
 * A body that is well-formed HTTP and ill-formed as data.
 *
 * The api suite already sweeps these handlers twice: `sweep.spec.ts` sends every verb a handler exports a
 * well-formed `{}`, and `empty-body.spec.ts` sends a mutating verb *no body at all* (and pins the handlers that
 * crash on it in `empty-body-blockers.generated.ts`). Neither sends a body that arrives with a JSON content type
 * and says something a handler cannot use: `null`, `[]`, `"a string"`, `123`, or text that is not JSON at all.
 * Those are what a broken client, a half-written form or a hostile caller actually sends, and they fail in a
 * different place — a handler that destructures (`const { email } = await req.json()`) throws a `TypeError` on
 * `null` where the same line survives an empty body, and a handler that wraps its parse in a `catch` answers a
 * parse failure as a success.
 *
 * The assertions are the sweep's own discipline: `status < 500` unless the case is pinned in
 * `MALFORMED_BLOCKERS` below with the exact status a run produced, and every case annotates the status it saw, so
 * the blocker list is rebuilt from a report rather than from a guess. Like `sweep.spec.ts`, this list has no
 * generator: it is kept by hand, from what a run of this file reports, and a pinned blocker that stops happening
 * fails the run on purpose.
 *
 * **Every body here is sent as bytes (`Buffer.from(...)`), never as a string.** Measured against Playwright's own
 * request layer (`request.newContext().fetch`, which is what the `api` fixture wraps): a `data` string that is
 * already valid JSON arrives verbatim, but a string that is *not* valid JSON is re-encoded as a JSON string when the
 * request declares `application/json` — so `{"name": ` reached `app/api/task-statuses` as text *inside a JSON
 * string*, `req.json()` returned a string instead of throwing, and the handler forwarded it and answered 200 with
 * the status list rather than with its own parse-failure answer. The same bytes sent as a `Buffer` did make that
 * handler answer `Error creating task status`, with no upstream call. Text that is not JSON is the subject of this
 * file, so it travels as bytes; a run that let the request layer help would pin the request layer, not the handler.
 *
 * The proxy family (`core/services/server/forward-to-gauzy.ts`) is the other half of this file and answers a
 * different question: it refuses a *declared* media type that is not JSON before reading the body (line 104), but
 * a body declared as JSON is forwarded without ever being parsed (line 112/121) — so bytes that are not JSON at
 * all reach the upstream as they are. Pinned, because the media-type suite proves the gate and this proves what the
 * gate does not look at.
 */

/** A body that parses as JSON and is `null`. */
const JSON_NULL = 'null';
/** A JSON array where an object is expected. */
const JSON_ARRAY = '[]';
/** A JSON string where an object is expected. */
const JSON_STRING = '"a string instead of an object"';
/** Text that is not JSON, sent with a JSON content type so the handler is obliged to parse it. */
const BROKEN_JSON = '{"name": ';

const BODIES: Array<{ label: string; body: string }> = [
	{ label: 'null', body: JSON_NULL },
	{ label: 'an array', body: JSON_ARRAY },
	{ label: 'a bare string', body: JSON_STRING },
	{ label: 'not JSON at all', body: BROKEN_JSON }
];

type MutatingProbe = {
	verb: 'POST' | 'PUT' | 'PATCH';
	/** The route on disk. Dynamic segments are named in `path`. */
	pattern: string;
	path: (ids: Record<string, string>) => string;
	/** How the handler reads the body, from its file — the reason a case behaves as it does. */
	parse: string;
};

/** Handlers that read a body with `await req.json()` and no `.catch()` (read from each route file). */
const UNGUARDED_PARSE: MutatingProbe[] = [
	{
		verb: 'POST',
		pattern: '/api/email-reset/request-change-email',
		path: () => '/api/email-reset/request-change-email',
		parse: 'destructured: `const { email } = (await req.json())`'
	},
	{
		verb: 'POST',
		pattern: '/api/email-reset/verify-change-email',
		path: () => '/api/email-reset/verify-change-email',
		parse: 'destructured: `const { code } = (await req.json())`'
	},
	{
		verb: 'POST',
		pattern: '/api/organization-projects',
		path: () => '/api/organization-projects',
		parse: 'assigned whole: `const body: { name; tenantId; organizationId } = await req.json()`'
	},
	{
		verb: 'POST',
		pattern: '/api/daily-plan',
		path: () => '/api/daily-plan',
		parse: 'assigned whole, then handed to the API: `(await req.json()) as unknown as ICreateDailyPlan`'
	},
	{
		verb: 'POST',
		pattern: '/api/favorite',
		path: () => '/api/favorite',
		parse: 'assigned whole: `(await req.json()) as IFavoriteCreateRequest`'
	},
	{
		verb: 'POST',
		pattern: '/api/task-statuses',
		path: () => '/api/task-statuses',
		parse: 'inside a try/catch that answers with `$res(...)`'
	},
	{
		verb: 'POST',
		pattern: '/api/issue-types',
		path: () => '/api/issue-types',
		parse: 'assigned whole, outside any try: `const body = await req.json()`'
	},
	{
		verb: 'PUT',
		pattern: '/api/employee/[id]',
		path: (ids) => `/api/employee/${ids.employee}`,
		parse: 'assigned whole outside the try that wraps the save: `(await req.json()) as unknown as IUpdateEmployee`'
	},
	{
		verb: 'POST',
		pattern: '/api/invite/validate-by-code',
		path: () => '/api/invite/validate-by-code',
		parse: 'assigned whole, then `validateForm([code, email], body)`'
	},
	{
		verb: 'POST',
		pattern: '/api/organization-team',
		path: () => '/api/organization-team',
		parse: 'inside a try, then read as `body.name?.trim()`'
	}
];

/**
 * Statuses this file's cases produced in a real run, with why. Empty until a run fills it: an entry is the harness's
 * way of saying "this handler crashes today, here is the exact status, and here is what it has to answer instead".
 * A pinned case that starts answering a 4xx fails this file, which is the point (same rule as
 * `DOCUMENTED_SERVER_BLOCKERS` in `suites/api/sweep.spec.ts`).
 */
/**
 * Filled from a real lane-c run (lane lane-c, app 3033, mock 4002, 2026-11-21): `Running 43 tests using 1 worker`,
 * and the statuses below are what the handlers answered to these exact bytes, each one re-read against the mock's
 * request log. Every entry is a defect: a body this app cannot use must be answered 4xx, not by a crash.
 *
 * `read` says which line of the handler throws, in the handler's own words; `noCall` is what the mock log proved
 * beside it — a handler that crashed on its own parse never reached the endpoint it guards (the session read it did
 * make, `GET /api/user/me`, is a separate matter and is pinned in session-check.spec.ts).
 */
const MALFORMED_BLOCKERS: Record<string, { status: number; reason: string }> = {
	'POST /api/email-reset/request-change-email with null': {
		status: 500,
		reason: '`const { email } = (await req.json())` destructures `null` — a TypeError, outside any try; answered 500 with an empty body, and the mock saw no call to /api/email-reset/request-change-email'
	},
	'POST /api/email-reset/request-change-email with not JSON at all': {
		status: 500,
		reason: 'the same line, thrown by the parse itself; 500 with an empty body and no upstream call'
	},
	'POST /api/email-reset/verify-change-email with null': {
		status: 500,
		reason: '`const { code } = (await req.json())` destructures `null`; 500 with an empty body and no upstream call'
	},
	'POST /api/email-reset/verify-change-email with not JSON at all': {
		status: 500,
		reason: 'the same line, thrown by the parse itself; 500 with an empty body and no upstream call'
	},
	'POST /api/organization-projects with not JSON at all': {
		status: 500,
		reason: '`await req.json()` is outside any try in this handler; 500 with an empty body. A `null`/`[]`/string body survives the parse and is forwarded instead — pinned as a pass below, which is its own problem'
	},
	'POST /api/daily-plan with not JSON at all': {
		status: 500,
		reason: '`(await req.json()) as unknown as ICreateDailyPlan`, uncaught; 500 with an empty body and no upstream call'
	},
	'POST /api/favorite with not JSON at all': {
		status: 500,
		reason: '`(await req.json()) as IFavoriteCreateRequest`, uncaught; 500 with an empty body and no upstream call'
	},
	'POST /api/issue-types with not JSON at all': {
		status: 500,
		reason: '`const body = await req.json()` outside the try that wraps the save; 500 with an empty body and no upstream call'
	},
	'PUT /api/employee/[id] with not JSON at all': {
		status: 500,
		reason: 'the parse sits outside the try that wraps the save, so its SyntaxError is uncaught; 500 with an empty body and no upstream call'
	},
	'POST /api/invite/validate-by-code with null': {
		status: 500,
		reason: '`validateForm` writes back what it trims (`data[key] = …`, core/lib/helpers/validations.ts line 62) and `null[key]` throws; 500 with an empty body, no upstream call'
	},
	'POST /api/invite/validate-by-code with a bare string': {
		status: 500,
		reason: 'the same line assigns onto a string primitive (`Cannot create property "code" on string`), which a strict-mode module turns into a TypeError; 500 with an empty body, no upstream call'
	},
	'POST /api/invite/validate-by-code with not JSON at all': {
		status: 500,
		reason: '`await req.json()` is the first statement of the handler, outside any try; 500 with an empty body, no upstream call'
	},
	'POST /api/organization-team with null': {
		status: 500,
		reason: '`body.name?.trim()` on `null` throws inside the try, whose catch answers 500 `{"error":"Failed to process request"}` — a bad body answered as a server failure, no upstream call'
	},
	'POST /api/organization-team with not JSON at all': {
		status: 500,
		reason: 'the parse throws into the same catch: 500 `{"error":"Failed to process request"}`, no upstream call'
	}
};

const asText = (requests: StubRequest[]) =>
	requests.map((request) => `${request.method} ${request.path}?${request.query} ${request.status}`).join(', ');

test.describe('a mutating route answers a body that is not the object it expects', () => {
	for (const probe of UNGUARDED_PARSE) {
		for (const entry of BODIES) {
			const title = `${probe.verb} ${probe.pattern} with ${entry.label}`;

			test(title, async ({ api, ids, mock }) => {
				const path = probe.path(ids);
				const why = `${title} (${probe.parse})`;

				const response = await api(path, {
					method: probe.verb,
					// Bytes, so the handler is given this text and not a re-encoded version of it (see the header).
					body: Buffer.from(entry.body),
					headers: { 'content-type': 'application/json' }
				});
				const status = response.status();
				const text = await response.text();

				// What was observed, pass or fail, exactly as the empty-body sweep records it: a blocker entry is
				// rebuilt from these annotations, never from a guess about the handler.
				test.info().annotations.push({ type: 'observed-status', description: `${title}: ${status}` });

				const blocker = MALFORMED_BLOCKERS[title];
				if (blocker) {
					expect(
						status,
						`${why} is pinned to a ${blocker.status} (${blocker.reason}); it answered ${status} ${text.slice(0, 200)} — either the handler was fixed (drop the entry) or its behaviour changed`
					).toBe(blocker.status);

					// The refusal happened here: the handler threw on its own body and never asked the API anything
					// about it. (Its session read, `GET /api/user/me`, is expected and is pinned elsewhere.)
					expect(
						(await mock.calls(path)).map(
							(request) => `${request.method} ${request.path} ${request.status}`
						),
						`${why} is pinned as a crash, but the API was asked about the body anyway: ${asText(await mock.requests())}`
					).toEqual([]);
				} else {
					expect(status, `${why} crashed the handler (${status}): ${text.slice(0, 300)}`).toBeLessThan(500);
				}

				// A handler that 5xx'd on its own parse may still have reached the API first; a refusal that did is
				// worth seeing as a log line, so the log is recorded for every case rather than asserted blind.
				expect(
					(await mock.requests()).every((request) => request.status < 500),
					`${why}: the malformed body caused a failing call to the API: ${asText(await mock.failures())}`
				).toBe(true);
			});
		}
	}

	test('POST /api/task-statuses answers a parse failure as a 200 with the error as its body — pinned, not approved', async ({
		api,
		mock
	}) => {
		// `app/api/task-statuses/route.ts` POST wraps its `await req.json()` in a `try` whose `catch` returns
		// `$res('Error creating task status')`; on the signed-in path `$res` is the *success* answer
		// (`(data) => NextResponse.json(data)`), so a body this handler cannot parse is answered 200 and the client's
		// `if (!response.ok)` never fires. Pinned with the exact status and body so that fixing it to a 4xx fails here.
		//
		// It took a run to pin this case correctly: sent as a string, `{"name": ` never reached this handler as broken
		// text at all (Playwright re-encodes it), the parse succeeded, the body was forwarded and the answer was the
		// status list — a green-looking 200 that had nothing to do with the `catch`. The bytes version below is what
		// makes the claim about the handler.
		const response = await api('/api/task-statuses', {
			method: 'POST',
			body: Buffer.from(BROKEN_JSON),
			headers: { 'content-type': 'application/json' }
		});
		const text = await response.text();

		expect(
			response.status(),
			`a task-status body this app cannot parse was answered ${response.status()} ${text}`
		).toBe(200);
		expect(text, `the swallowed parse failure is not the answer this test pins: ${text}`).toContain(
			'Error creating task status'
		);

		// The parse failure stopped this handler at its own door: the only thing it asked the API was who the caller
		// is (`authenticatedGuard` runs before the body is read), and it never asked about the body it could not read.
		const asked = await mock.requests();
		expect(
			asked
				.filter((request) => request.path !== '/api/user/me')
				.map((request) => `${request.method} ${request.path} ${request.status}`),
			`the unparseable body still reached the API: ${asText(asked)}`
		).toEqual([]);
	});

	test('a proxied route forwards a body declared as JSON without ever parsing it', async ({ api, mock }) => {
		// `forwardToGauzy` compares the *declared* type (line 104) and then sends the bytes it was given
		// (`const body = hasBody ? (await req.text()) || undefined : undefined`, line 106, into `fetch` at 112). No
		// JSON parse happens on this side, so a body that is not JSON travels as it is and the upstream is the one
		// that reads it. The mock parses nothing either (`readJsonBody` returns undefined for undecodable text) and
		// answers its generic POST reply, which is what makes the forwarded bytes visible at all.
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: Buffer.from(BROKEN_JSON),
			headers: { 'content-type': 'application/json' }
		});
		const text = await response.text();

		expect(
			response.status(),
			`a declared-JSON body that is not JSON was refused as a media type is (${response.status()} ${text})`
		).toBe(200);
		expect(
			(await mock.calls('/api/chat/conversations')).map(
				(request) => `${request.method} ${request.path} ${request.status}`
			),
			`the unparseable body was not forwarded after all: ${text}`
		).toEqual(['POST /api/chat/conversations 200']);
	});

	test('a body larger than any form sends is refused, forwarded or accepted — never a crash', async ({
		api,
		mock
	}) => {
		// Neither `forwardToGauzy` nor `serverFetch` caps a body, and no route here sets `sizeLimit`; the only size
		// limit in play is Next's own. 2 MB of JSON is well past what this app's own clients ever send, so whatever
		// the answer is, "no 5xx and no half-read request" is the claim.
		const big = JSON.stringify({ title: 'x'.repeat(2_000_000) });

		const proxied = await api('/api/chat/conversations', {
			method: 'POST',
			body: big,
			headers: { 'content-type': 'application/json' }
		});
		const proxiedText = await proxied.text();
		expect(
			proxied.status(),
			`a 2 MB proxied write answered ${proxied.status()} ${proxiedText.slice(0, 200)} — a body this app cannot answer must not crash it`
		).toBeLessThan(500);

		const guarded = await api('/api/daily-plan', {
			method: 'POST',
			body: big,
			headers: { 'content-type': 'application/json' }
		});
		const guardedText = await guarded.text();
		expect(
			guarded.status(),
			`a 2 MB guarded write answered ${guarded.status()} ${guardedText.slice(0, 200)} — a body this app cannot answer must not crash it`
		).toBeLessThan(500);

		// Recorded, not asserted: whether the upstream saw the body is the difference between "refused here" and
		// "handed on", and both are answers this suite would want to see in a failure.
		test.info().annotations.push({
			type: 'oversized-body-reached-the-api',
			description: asText(await mock.requests())
		});
	});
});
