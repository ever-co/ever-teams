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
const MALFORMED_BLOCKERS: Record<string, { status: number; reason: string }> = {};

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
					body: entry.body,
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
		const response = await api('/api/task-statuses', {
			method: 'POST',
			body: BROKEN_JSON,
			headers: { 'content-type': 'application/json' }
		});
		const text = await response.text();

		expect(response.status(), `a task-status body this app cannot parse was answered ${response.status()} ${text}`).toBe(200);
		expect(text, `the swallowed parse failure is not the answer this test pins: ${text}`).toContain('Error creating task status');
		expect(
			await mock.requests(),
			`the refused body still reached the API: ${asText(await mock.requests())}`
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
			body: BROKEN_JSON,
			headers: { 'content-type': 'application/json' }
		});
		const text = await response.text();

		expect(
			response.status(),
			`a declared-JSON body that is not JSON was refused as a media type is (${response.status()} ${text})`
		).toBe(200);
		expect(
			(await mock.calls('/api/chat/conversations')).map((request) => `${request.method} ${request.path} ${request.status}`),
			`the unparseable body was not forwarded after all: ${text}`
		).toEqual(['POST /api/chat/conversations 200']);
	});

	test('a body larger than any form sends is refused, forwarded or accepted — never a crash', async ({ api, mock }) => {
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

		const guarded = await api('/api/daily-plan', { method: 'POST', body: big, headers: { 'content-type': 'application/json' } });
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
