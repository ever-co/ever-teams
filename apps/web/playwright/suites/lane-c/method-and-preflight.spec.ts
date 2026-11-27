import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { APP_ORIGIN, receivedTokens } from '../../helpers';
import { apiRoutes } from '../api/routes.generated';
import { logOf, parseAnswer, triple } from '../api/log-helpers';

/**
 * What this app's own API routes answer to a verb they do not implement, and to a CORS preflight.
 *
 * `suites/api/sweep.spec.ts` calls each route **only with the verbs its file exports**, read from
 * `routes.generated.ts`. Nothing in this effort has ever called `OPTIONS`, `HEAD`, `PUT` or `DELETE` at a route that
 * exports `GET`/`POST` (or the other way round), so the answer an out-of-list verb meets has never been pinned.
 * This file is that half. What it measures, per route:
 *
 *   1. the status and the exact body/header shape of the answer — Next's own 405, Next's own 204 + `Allow` for a
 *      preflight, Next's 404 not-found document, or the route's own refusal body;
 *   2. whether the test backend was asked **anything at all** (`mock.requests()` must be `[]` — not "nothing about
 *      this route", but nothing, because a route that 405s *after* calling the upstream is a finding);
 *   3. the CORS header set of an `OPTIONS` answer, and whether a refusal carries one;
 *   4. whether the answer depends on the caller's `Origin` / `Sec-Fetch-Site` at all — and on the routes where it
 *      does depend, that the difference is made by the guard and not by the method dispatch;
 *   5. what the door (`proxy.ts`) answers versus what the handler answers;
 *   6. for the proxied routes this file touches, what travelled to the test backend: which query parameters, and
 *      which request headers a caller supplied.
 *
 * The mechanism is read, not guessed: `node_modules/next/dist/server/route-modules/app-route/helpers/auto-implement-methods.js`
 * wraps every app route file in a handler for **every** HTTP method — the ones the file does not export become
 * `() => new Response(null, { status: 405 })` (`:16-29`), a missing `HEAD` becomes the `GET` handler (`:39-45`), and a
 * missing `OPTIONS` becomes `new Response(null, { status: 204, headers: { Allow: allow.sort().join(', ') } })` where
 * `allow` is `OPTIONS` plus the exported verbs plus `HEAD` when `GET` is exported (`:49-71`). Every `Allow` string
 * asserted below is computed from the manifest's verb list by `nextAllow` here, so a route whose exports change and a
 * Next that changes its rule both fail this file.
 *
 * Deliberately NOT re-run here, because another suite already owns it: the exported verbs themselves and the
 * documented 5xx blockers (`sweep.spec.ts`), bodiless calls (`empty-body.spec.ts`), declared media types
 * (`media-type.spec.ts`), cross-site refusals **on exported write verbs** (`foreign-origin.spec.ts`,
 * `unguarded-writes.spec.ts`), the Board routes' Origin gate and its CORS set on 200/201/400/413/415 answers
 * (`board-origin.spec.ts`), `x-forwarded-host` as the guard's right-hand side (`forwarded-host.spec.ts`), the
 * ever-connect query narrowing (`ever-connect-proxy.spec.ts`), and which answers carry `Cache-Control`
 * (`suites/lane-c/cache-directive.spec.ts`, which already proved that a forwarded answer carries the upstream's
 * `Content-Type` and nothing else of the upstream's headers).
 *
 * Not reachable in this lane, recorded rather than guessed: the Board routes' *trusted* preflight (`boardPreflight`'s
 * 204 with `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` and `Access-Control-Max-Age: 600`) needs a
 * lane started with `E2E_BOARD_APP_DOMAIN` set; this lane's runtime env names no Board domain (measured below: the
 * Board's own OPTIONS handler answers 403 to this app's own Origin), and the `app/api/auth/ever-id` handlers need
 * `E2E_EVER_ID=1`. Neither app was restarted for this file — see `PLAN.md`.
 */

const FOREIGN_ORIGIN = 'https://some-other-site.example';
const OWN_ORIGIN = APP_ORIGIN;
const OWN_HOST = new URL(OWN_ORIGIN).host;

/** The CORS names this app could grant a caller. `core/services/server/board-cors.ts:20-40` is the only code under
 * `app` or `core` that writes any of them (grep `Access-Control-` over both trees returns those five lines). */
const CORS_NAMES = [
	'access-control-allow-origin',
	'access-control-allow-methods',
	'access-control-allow-headers',
	'access-control-allow-credentials',
	'access-control-max-age',
	'access-control-expose-headers'
] as const;

type Answer = { status: number; text: string; headers: Record<string, string> };

async function readAnswer(response: APIResponse): Promise<Answer> {
	return {
		status: response.status(),
		text: await response.text().catch(() => '<the body was not readable>'),
		headers: await response.headers()
	};
}

/** The `Allow` list Next writes for a route that does not export OPTIONS (`auto-implement-methods.js:52-64`). */
function nextAllow(verbs: readonly string[]): string {
	const allow = new Set<string>(['OPTIONS', ...verbs]);
	if (!verbs.includes('HEAD') && verbs.includes('GET')) allow.add('HEAD');
	return [...allow].sort().join(', ');
}

/** A Next method answer: the status, no body at all, and no content-type naming a body that is not there. */
async function expectBodiless(why: string, answer: Answer, status: number) {
	expect(
		answer.status,
		`${why}: answered ${answer.status} with body ${JSON.stringify(answer.text.slice(0, 200))}`
	).toBe(status);
	expect(
		answer.text,
		`${why}: a ${status} method answer carries ${answer.text.length} bytes of body: ${answer.text.slice(0, 200) || '<empty>'}`
	).toBe('');
	expect(
		answer.headers['content-type'],
		`${why}: the ${status} answer named content-type ${JSON.stringify(answer.headers['content-type'])} for an empty body`
	).toBeUndefined();
}

async function expectNoCors(why: string, answer: Answer) {
	for (const name of CORS_NAMES) {
		expect(
			answer.headers[name],
			`${why}: the answer carries ${name} = ${JSON.stringify(answer.headers[name])}. Only board-cors.ts writes a CORS header in this app, so one here would mean a caller was granted access to this answer`
		).toBeUndefined();
	}
}

/** One entry of the backend log, as far as this file needs it (the same three keys `log-helpers.ts` reads). */
type LogEntry = { method: string; path: string; status: number };

/** The backend was asked nothing at all — not "nothing about this route", but nothing. */
async function expectNothingAsked(why: string, mock: { requests: () => Promise<LogEntry[]> }) {
	const asked = await mock.requests();
	expect(
		asked.map(triple),
		`${why}: the answer came before any handler ran, so the test backend must hold no entry at all; it holds ${logOf(asked)}`
	).toEqual([]);
}

/**
 * One route, its exported verbs copied from `routes.generated.ts`, and the verb this file calls instead.
 * `ownsOptions` marks the three Board routes, which export OPTIONS themselves: for them Next's 204 rule never applies
 * and the route's own answer is what a preflight meets.
 */
type RouteRow = {
	/** The route as the manifest names it — the row's identity. */
	pattern: string;
	/** The concrete path this file calls (dynamic segments filled with one inert segment). */
	path: string;
	/** The verbs the route file exports. */
	verbs: string[];
	/** A verb the route does not export. */
	wrongVerb: string;
	ownsOptions?: boolean;
	note: string;
};

const INERT = 'playwright-method-probe';

const ROWS: RouteRow[] = [
	{
		pattern: '/api',
		path: '/api',
		verbs: ['GET'],
		wrongVerb: 'POST',
		note: 'the API root: a GET-only handler, so a POST to it is refused by Next, not by the handler'
	},
	{
		pattern: '/api/chat/conversations/browse',
		path: '/api/chat/conversations/browse',
		verbs: ['GET'],
		wrongVerb: 'PUT',
		note: 'GET-only proxy route'
	},
	{
		pattern: '/api/chat/direct',
		path: '/api/chat/direct',
		verbs: ['POST'],
		wrongVerb: 'GET',
		note: 'POST-only route: a read of it is not possible at all'
	},
	{
		pattern: '/api/chat/conversations',
		path: '/api/chat/conversations',
		verbs: ['GET', 'POST'],
		wrongVerb: 'PUT',
		note: 'the proxy family: GET and POST only'
	},
	{
		pattern: '/api/time-goals/[id]',
		path: `/api/time-goals/${INERT}`,
		verbs: ['PUT'],
		wrongVerb: 'GET',
		note: 'PUT-only route with a dynamic segment'
	},
	{
		pattern: '/api/task-statuses/[id]',
		path: `/api/task-statuses/${INERT}`,
		verbs: ['PUT', 'DELETE'],
		wrongVerb: 'POST',
		note: 'PUT and DELETE only'
	},
	{
		pattern: '/api/user/reset',
		path: '/api/user/reset',
		verbs: ['DELETE'],
		wrongVerb: 'GET',
		note: 'DELETE-only route'
	},
	{
		pattern: '/api/tasks/[id]',
		path: `/api/tasks/${INERT}`,
		verbs: ['GET', 'PUT', 'DELETE'],
		wrongVerb: 'POST',
		note: 'GET, PUT and DELETE — a POST is the hole'
	},
	{
		pattern: '/api/timer/slot',
		path: '/api/timer/slot',
		verbs: ['GET', 'DELETE'],
		wrongVerb: 'PUT',
		note: 'GET and DELETE only'
	},
	{
		pattern: '/api/chat/categories/[id]',
		path: `/api/chat/categories/${INERT}`,
		verbs: ['PATCH', 'DELETE'],
		wrongVerb: 'POST',
		note: 'PATCH and DELETE only'
	},
	{
		pattern: '/api/chat/conversations/[id]/state',
		path: `/api/chat/conversations/${INERT}/state`,
		verbs: ['PATCH'],
		wrongVerb: 'PUT',
		note: 'PATCH-only route: the sibling verb is refused'
	},
	{
		pattern: '/api/tasks/task-linked-issue',
		path: '/api/tasks/task-linked-issue',
		verbs: ['POST', 'PUT'],
		wrongVerb: 'DELETE',
		note: 'its sibling /api/tasks/task-linked-issue/[id] is DELETE-only, and this path is not it'
	},
	{
		pattern: '/api/organization/[id]',
		path: `/api/organization/${INERT}`,
		verbs: ['GET', 'PUT'],
		wrongVerb: 'PATCH',
		note: 'GET and PUT only'
	},
	{
		pattern: '/api/saved-reports/[id]/share',
		path: `/api/saved-reports/${INERT}/share`,
		verbs: ['POST', 'DELETE'],
		wrongVerb: 'GET',
		note: 'POST and DELETE only'
	},
	{
		pattern: '/api/chat/conversations/[id]',
		path: `/api/chat/conversations/${INERT}`,
		verbs: ['GET', 'PATCH'],
		wrongVerb: 'PUT',
		note: 'GET and PATCH only'
	},
	{
		pattern: '/api/timesheet/time-log',
		path: '/api/timesheet/time-log',
		verbs: ['GET', 'POST', 'DELETE'],
		wrongVerb: 'PATCH',
		note: 'the only GET+POST+DELETE route in the manifest'
	},
	{
		pattern: '/api/ever-connect/[...path]',
		path: '/api/ever-connect/health',
		verbs: ['GET', 'POST', 'PUT', 'DELETE'],
		wrongVerb: 'PATCH',
		note: 'the catch-all proxy: four verbs, PATCH is the hole'
	},
	{
		pattern: '/api/auth/[...nextauth]',
		path: '/api/auth/session',
		verbs: ['GET', 'POST'],
		wrongVerb: 'DELETE',
		note: 'the Auth.js catch-all answers its own endpoints; the dispatch rule is the same one'
	},
	{
		pattern: '/api/board/members',
		path: '/api/board/members',
		verbs: ['GET', 'OPTIONS'],
		wrongVerb: 'PUT',
		ownsOptions: true,
		note: 'the route exports OPTIONS itself (boardPreflight), so Next writes no Allow here at all'
	},
	{
		pattern: '/api/board/session',
		path: '/api/board/session',
		verbs: ['GET', 'OPTIONS'],
		wrongVerb: 'DELETE',
		ownsOptions: true,
		note: 'same family, GET + OPTIONS'
	},
	{
		pattern: '/api/board/notify',
		path: '/api/board/notify',
		verbs: ['POST', 'OPTIONS'],
		wrongVerb: 'DELETE',
		ownsOptions: true,
		note: 'POST + OPTIONS'
	}
];

/** The verb classes this table covers, so the table can be checked against the manifest. */
const CLASS_OF = (verbs: readonly string[]) => [...verbs].sort().join('+');

test.describe('a verb the route does not export: Next answers before the route runs', () => {
	for (const row of ROWS.filter((entry) => !entry.ownsOptions)) {
		test(`OPTIONS ${row.pattern} is answered by Next with 204 and an Allow list`, async ({ api, mock }) => {
			const response = await api(row.path, { method: 'OPTIONS', anonymous: true });
			const answer = await readAnswer(response);
			const why = `OPTIONS ${row.path} (exports ${row.verbs.join(', ')}; ${row.note})`;
			test.info().annotations.push({
				type: 'observed-vary',
				description: `vary: ${answer.headers['vary'] ?? ''}`
			});

			await expectBodiless(why, answer, 204);
			expect(
				answer.headers['allow'],
				`${why}: Allow was ${JSON.stringify(answer.headers['allow'])}; the rule (OPTIONS + the exported verbs + HEAD when GET is exported, sorted) gives ${nextAllow(row.verbs)}`
			).toBe(nextAllow(row.verbs));
			// The preflight answer Next writes is not a CORS answer: it names `Allow`, never `Access-Control-Allow-*`,
			// so a browser that preflighted here is told which verbs the route speaks and then refused the real call
			// for want of an Allow-Origin. That is the defence-in-depth `same-origin-request.ts:9-11` describes.
			await expectNoCors(why, answer);
			expect(
				answer.headers['access-control-allow-methods'],
				`${why}: Access-Control-Allow-Methods was ${JSON.stringify(answer.headers['access-control-allow-methods'])} — Next answers a preflight with Allow, never with the CORS method list`
			).toBeUndefined();
			expect(
				answer.headers['cache-control'],
				`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])} — the 204 carries no cache directive of its own`
			).toBeUndefined();
			expect(
				answer.headers['vary'] ?? '',
				`${why}: Vary was "${answer.headers['vary'] ?? ''}" — Next 16 keeps its own Vary entries on a method answer`
			).toContain('rsc');
			await expectNothingAsked(why, mock);
		});

		test(`${row.wrongVerb} ${row.pattern} is refused with a 405 that has no body`, async ({ api, mock }) => {
			const response = await api(row.path, { method: row.wrongVerb, anonymous: true, body: undefined });
			const answer = await readAnswer(response);
			const why = `${row.wrongVerb} ${row.path} (exports ${row.verbs.join(', ')}; ${row.note})`;

			await expectBodiless(why, answer, 405);
			expect(
				answer.headers['allow'],
				`${why}: the 405 named Allow = ${JSON.stringify(answer.headers['allow'])} — Next's method-not-allowed response sets no headers at all (auto-implement-methods.js:16-19), so only the OPTIONS answer names the verbs`
			).toBeUndefined();
			await expectNoCors(why, answer);
			expect(
				answer.headers['cache-control'],
				`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])} — the 405 carries no cache directive, unlike the 404 document`
			).toBeUndefined();
			await expectNothingAsked(why, mock);
		});
	}
});

test.describe('the three routes that export an OPTIONS handler of their own', () => {
	// `app/api/board/members`, `/api/board/session` and `/api/board/notify` are the only handlers in the manifest that
	// export OPTIONS (`routes.generated.ts`, 3 of 415 paths), and `auto-implement-methods.js:32-33` writes no automatic
	// OPTIONS handler for a route that already has one. So these are the only routes where a preflight reaches this
	// app's code, and the only ones where the answer is not Next's 204 + Allow.
	for (const row of ROWS.filter((entry) => entry.ownsOptions)) {
		test(`${row.pattern} answers a preflight with its own refusal, not with a 204`, async ({ api, mock }) => {
			const response = await api(row.path, {
				method: 'OPTIONS',
				anonymous: true,
				headers: { origin: OWN_ORIGIN, 'access-control-request-method': row.verbs[0] }
			});
			const answer = await readAnswer(response);
			const why = `OPTIONS ${row.path} (${row.note})`;

			// This lane names no Board domain, so the route's own gate refuses with `forbiddenForBoard()`
			// (`core/services/server/board-cors.ts:26-28`). The Origin half of the Board family belongs to
			// `suites/api/board-origin.spec.ts`; what is pinned here is that the route's OPTIONS export *replaces*
			// Next's 204 + Allow answer, and that the refusal carries no CORS header while carrying the Board Vary.
			expect(answer.status, `${why}: answered ${answer.status} ${answer.text.slice(0, 200)}`).toBe(403);
			expect(
				parseAnswer(answer.text),
				`${why}: 403, but not the Board route's own refusal: ${answer.text.slice(0, 200)}`
			).toMatchObject({ message: 'Forbidden' });
			expect(
				answer.headers['allow'],
				`${why}: the answer names Allow = ${JSON.stringify(answer.headers['allow'])} — a route that exports its own OPTIONS gets no automatic Allow list (auto-implement-methods.js:32-33)`
			).toBeUndefined();
			await expectNoCors(why, answer);
			expect(
				answer.headers['cache-control'],
				`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])} — privateBoardAnswer marks every Board answer no-store (board-cors.ts:13), where Next 405/204 answers carry none`
			).toBe('no-store');
			expect(
				answer.headers['vary'] ?? '',
				`${why}: Vary was "${answer.headers['vary'] ?? ''}" — the Board answer must vary on the Origin it gated on and the Cookie it read`
			).toContain('Origin');
			await expectNothingAsked(why, mock);
		});

		test(`${row.wrongVerb} ${row.pattern} is still a 405 with no Allow, next to its own OPTIONS answer`, async ({
			api,
			mock
		}) => {
			const response = await api(row.path, { method: row.wrongVerb, anonymous: true, body: undefined });
			const answer = await readAnswer(response);
			const why = `${row.wrongVerb} ${row.path} (${row.note})`;

			// Exporting OPTIONS changes only the OPTIONS answer: every other verb the file does not export still gets
			// Next's bodiless 405, so a Board route is not a route that answers everything.
			await expectBodiless(why, answer, 405);
			expect(
				answer.headers['allow'],
				`${why}: the 405 named Allow = ${JSON.stringify(answer.headers['allow'])}`
			).toBeUndefined();
			expect(
				answer.headers['cache-control'],
				`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])} — this 405 comes from Next, not from board-cors.ts, so it carries none of the Board marking`
			).toBeUndefined();
			await expectNoCors(why, answer);
			await expectNothingAsked(why, mock);
		});
	}
});

test.describe('HEAD is answered only where a GET handler exists', () => {
	// `auto-implement-methods.js:39-45`: a route without HEAD gets HEAD by calling its GET. A route without a GET gets
	// no HEAD at all, and Next's 405 answers it.
	const NO_AUTO_HEAD = [
		{ pattern: '/api/chat/direct', path: '/api/chat/direct', verbs: ['POST'] },
		{ pattern: '/api/time-goals/[id]', path: `/api/time-goals/${INERT}`, verbs: ['PUT'] },
		{ pattern: '/api/user/reset', path: '/api/user/reset', verbs: ['DELETE'] }
	];

	for (const row of NO_AUTO_HEAD) {
		test(`HEAD ${row.path} is refused although the route speaks ${row.verbs.join(', ')}`, async ({ api, mock }) => {
			const response = await api(row.path, { method: 'HEAD', anonymous: true });
			const answer = await readAnswer(response);
			const why = `HEAD ${row.path} (exports ${row.verbs.join(', ')}, no GET)`;
			await expectBodiless(why, answer, 405);
			await expectNoCors(why, answer);
			await expectNothingAsked(why, mock);
		});
	}

	test('HEAD of a GET route runs the GET handler, and the verb travels upstream as HEAD', async ({ api, mock }) => {
		const response = await api('/api/chat/conversations?head=1', { method: 'HEAD' });
		const headAnswer = await readAnswer(response);
		const asked = await mock.calls('/api/chat/conversations');

		expect(headAnswer.status, `HEAD /api/chat/conversations signed in answered ${headAnswer.status}`).toBe(200);
		// A HEAD answer carries no body even though the handler ran and the upstream answered a body.
		expect(
			headAnswer.text,
			`HEAD /api/chat/conversations answered with ${headAnswer.text.length} bytes: ${headAnswer.text.slice(0, 200)}`
		).toBe('');
		expect(
			headAnswer.headers['content-type'],
			`HEAD /api/chat/conversations named content-type ${JSON.stringify(headAnswer.headers['content-type'])} — the forwarded answer carries the upstream media type even with no body`
		).toBe('application/json; charset=utf-8');
		// The proof the handler ran, and of which verb reached the API: the backend recorded HEAD, not GET.
		expect(
			asked.map(triple),
			`HEAD /api/chat/conversations: the backend was expected to record HEAD against /api/chat/conversations; it holds ${logOf(await mock.requests())}`
		).toEqual(['HEAD /api/chat/conversations 200']);
	});

	test('a cross-site HEAD of the session data is forwarded, because the write guard exempts HEAD', async ({
		api,
		mock
	}) => {
		const response = await api('/api/chat/conversations?cross=1', {
			method: 'HEAD',
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const answer = await readAnswer(response);
		const asked = await mock.calls('/api/chat/conversations');

		// `refuseForeignWrite` returns null for GET and HEAD (`core/services/server/same-origin-request.ts:43-46`), so
		// this is not a guard failure: a HEAD cannot carry a body, and it is answered as the read it is. Pinned because
		// it is the one verb outside GET for which a cross-site caller is answered with the session's own data.
		expect(
			answer.status,
			`cross-site HEAD /api/chat/conversations answered ${answer.status} ${answer.text.slice(0, 200)}`
		).toBe(200);
		expect(
			`${answer.status} ${answer.text}`,
			`cross-site HEAD /api/chat/conversations was refused as cross-site: ${answer.text.slice(0, 200)}`
		).not.toMatch(/Cross-site request refused/);
		expect(
			asked.map(triple),
			`cross-site HEAD /api/chat/conversations: the read was expected to reach the backend as HEAD /api/chat/conversations 200; it holds ${logOf(await mock.requests())}`
		).toEqual(['HEAD /api/chat/conversations 200']);
		await expectNoCors('cross-site HEAD /api/chat/conversations (the forwarded answer)', answer);
	});
});

test.describe('the method answer does not read the caller Origin', () => {
	/** Four caller shapes: no Origin, this app's own Origin, a foreign Origin, and a browser's own cross-site report. */
	const SHAPES: Array<{ name: string; headers: Record<string, string> }> = [
		{ name: 'no Origin and no Sec-Fetch-Site', headers: {} },
		{ name: `Origin ${OWN_ORIGIN}`, headers: { origin: OWN_ORIGIN } },
		{ name: `Origin ${FOREIGN_ORIGIN}`, headers: { origin: FOREIGN_ORIGIN } },
		{
			name: `Origin ${OWN_ORIGIN} with Sec-Fetch-Site cross-site`,
			headers: { origin: OWN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		}
	];

	const MATRIX = [
		{
			pattern: '/api/chat/conversations',
			path: '/api/chat/conversations',
			wrongVerb: 'PUT',
			guard: 'forwardToGauzy (proxy-helper)'
		},
		{
			pattern: '/api/tasks/[id]',
			path: `/api/tasks/${INERT}`,
			wrongVerb: 'POST',
			guard: 'the route guards its own verbs'
		},
		{
			pattern: '/api/user/reset',
			path: '/api/user/reset',
			wrongVerb: 'GET',
			guard: 'the route guards its own verbs'
		},
		{
			pattern: '/api/board/members',
			path: '/api/board/members',
			wrongVerb: 'PUT',
			guard: 'the Board route gates on Origin itself'
		},
		{
			pattern: '/api/ever-connect/[...path]',
			path: '/api/ever-connect/health',
			wrongVerb: 'PATCH',
			guard: 'the ever-connect proxy'
		}
	];

	for (const route of MATRIX) {
		test(`every caller shape gets the same ${route.wrongVerb} answer at ${route.pattern}`, async ({
			api,
			mock
		}) => {
			const answers: string[] = [];
			for (const shape of SHAPES) {
				const response = await api(route.path, {
					method: route.wrongVerb,
					anonymous: true,
					headers: shape.headers
				});
				const answer = await readAnswer(response);
				await expectNoCors(`${route.wrongVerb} ${route.path} from ${shape.name}`, answer);
				answers.push(
					`${answer.status} body=${JSON.stringify(answer.text)} allow=${JSON.stringify(answer.headers['allow'])} vary=${JSON.stringify(answer.headers['vary'])}`
				);
			}

			// Identical for all four shapes, so nothing between the socket and the 405 read either header. The
			// `Origin`-reading code on these routes (same-origin-request.ts, board-cors.ts) is never reached: the
			// method dispatch answers first.
			expect(
				answers,
				`${route.wrongVerb} ${route.path} answered the four caller shapes differently: ${answers.join(' || ')}`
			).toEqual([answers[0], answers[0], answers[0], answers[0]]);
			expect(
				answers[0],
				`${route.wrongVerb} ${route.path}: the four-shape answer was expected to be Next's 405 with an empty body`
			).toContain('405');
			await expectNothingAsked(`${route.wrongVerb} ${route.path} against ${route.guard}`, mock);
		});
	}

	test('the same route does read the Origin for the verb it exports — the difference is the verb, not the header', async ({
		api,
		mock
	}) => {
		const path = '/api/chat/conversations';

		// The exported verb: a cross-site write is refused by this app, with the guard's own body and no upstream call.
		const crossSite = await api(path, {
			method: 'POST',
			body: {},
			anonymous: true,
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const crossSiteAnswer = await readAnswer(crossSite);
		expect(crossSiteAnswer.status, `cross-site POST ${path} answered ${crossSiteAnswer.status}`).toBe(403);
		expect(
			parseAnswer(crossSiteAnswer.text),
			`cross-site POST ${path} answered with ${crossSiteAnswer.text.slice(0, 200)} — this app's own refusal was expected`
		).toMatchObject({ statusCode: 403, message: 'Cross-site request refused' });
		await expectNothingAsked(`cross-site POST ${path}`, mock);

		// The same caller, the same headers, the verb the route does not export: no refusal at all, because no code
		// that reads the Origin ran. Read together, the pair says which header matters for which verb.
		const wrongVerb = await api(path, {
			method: 'PUT',
			anonymous: true,
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const wrongVerbAnswer = await readAnswer(wrongVerb);
		await expectBodiless(`PUT ${path} from a cross-site caller`, wrongVerbAnswer, 405);
		expect(
			`${crossSiteAnswer.status} vs ${wrongVerbAnswer.status}`,
			`POST and PUT of the same cross-site caller both answered ${crossSiteAnswer.status}: the guard and the method dispatch would have to be the same answer, which would mean the 405 came from the guard`
		).not.toMatch(/^(\d+) vs \1$/);
		await expectNothingAsked(`PUT ${path} from a cross-site caller`, mock);
	});
});

test.describe('the door answers a locale-prefixed API path, and never an API path', () => {
	const API_PATH = '/api/chat/conversations';
	const PREFIXED = '/en/api/chat/conversations';

	test('an API path is answered with no framing policy, and the same path under a locale is answered by the door', async ({
		api,
		mock
	}) => {
		const direct = await api(API_PATH, { method: 'OPTIONS', anonymous: true, maxRedirects: 0 });
		const directAnswer = await readAnswer(direct);
		const prefixed = await api(PREFIXED, { method: 'OPTIONS', anonymous: true, maxRedirects: 0 });
		const prefixedAnswer = await readAnswer(prefixed);

		// `proxy.ts:96-112` matches `/`, the locale prefixes and the page folders, and its one catch-all entry excludes
		// paths starting with `api`. So the door never runs for an API path, and the door's own header proves it:
		// `proxy.ts:144` writes the framing policy on every answer it produces.
		expect(
			directAnswer.headers['content-security-policy'],
			`OPTIONS ${API_PATH} carried content-security-policy ${JSON.stringify(directAnswer.headers['content-security-policy'])} — proxy.ts writes it on every answer it produces, so it is not in front of this path`
		).toBeUndefined();
		expect(
			prefixedAnswer.status,
			`OPTIONS ${PREFIXED} answered ${prefixedAnswer.status} ${prefixedAnswer.text.slice(0, 200)} — the door answers a locale-prefixed API path before any route is dispatched`
		).toBe(307);
		expect(
			prefixedAnswer.headers['content-security-policy'],
			`OPTIONS ${PREFIXED} carried content-security-policy ${JSON.stringify(prefixedAnswer.headers['content-security-policy'])} — the door ran, and this is the header that says so (proxy.ts:144, frame-ancestors.ts:38-41)`
		).toContain("frame-ancestors 'self'");
		expect(
			prefixedAnswer.headers['location'],
			`OPTIONS ${PREFIXED} redirected to ${JSON.stringify(prefixedAnswer.headers['location'])} — next-intl sends the unprefixed path back`
		).toBe(API_PATH);
		expect(
			prefixedAnswer.headers['allow'],
			`OPTIONS ${PREFIXED} named Allow = ${JSON.stringify(prefixedAnswer.headers['allow'])} — the door answered, so the route module never wrote its 204 + Allow`
		).toBeUndefined();
		expect(
			prefixedAnswer.headers['set-cookie'] ?? '',
			`OPTIONS ${PREFIXED} set cookies ${JSON.stringify(prefixedAnswer.headers['set-cookie'])} — the locale middleware writes NEXT_LOCALE on its redirect`
		).toContain('NEXT_LOCALE');
		await expectNothingAsked(`OPTIONS ${PREFIXED} through the door`, mock);
	});

	test('following the door redirect reaches the handler answer', async ({ api, mock }) => {
		const response = await api(PREFIXED, { method: 'OPTIONS', anonymous: true, maxRedirects: 5 });
		const answer = await readAnswer(response);
		expect(
			answer.status,
			`OPTIONS ${PREFIXED} followed answered ${answer.status} ${answer.text.slice(0, 200)}`
		).toBe(204);
		expect(
			answer.headers['allow'],
			`OPTIONS ${PREFIXED} followed named Allow = ${JSON.stringify(answer.headers['allow'])}; the handler behind the door answers GET, HEAD, OPTIONS, POST`
		).toBe('GET, HEAD, OPTIONS, POST');
		await expectNothingAsked(`OPTIONS ${PREFIXED} followed`, mock);
	});

	test('the door answers a wrong verb on the prefixed path too, so the 405 is unreachable through it', async ({
		api,
		mock
	}) => {
		const response = await api(PREFIXED, { method: 'PUT', anonymous: true, maxRedirects: 0 });
		const answer = await readAnswer(response);
		expect(answer.status, `PUT ${PREFIXED} answered ${answer.status} ${answer.text.slice(0, 200)}`).toBe(307);
		expect(
			answer.text,
			`PUT ${PREFIXED} carried a body of ${answer.text.length} bytes: ${answer.text.slice(0, 200)}`
		).toBe(API_PATH);
		await expectNothingAsked(`PUT ${PREFIXED} through the door`, mock);

		const followed = await api(PREFIXED, { method: 'PUT', anonymous: true, maxRedirects: 5 });
		const followedAnswer = await readAnswer(followed);
		await expectBodiless(`PUT ${PREFIXED} followed to ${API_PATH}`, followedAnswer, 405);
		await expectNothingAsked(`PUT ${PREFIXED} followed`, mock);
	});

	test('the framing policy on the Auth.js routes comes from the route, not from the door', async ({ api }) => {
		// `app/api/auth/[...nextauth]/route.ts:15-21` copies Auth.js's answer and calls `setFramingPolicy` itself, and
		// its own comment says it does it "where the proxy does not run". Without this row a reader would take the
		// CSP on /api/auth/session as proof the door ran, and the door claim above would be unfalsifiable.
		const authRoute = await api('/api/auth/session', { anonymous: true });
		const authAnswer = await readAnswer(authRoute);
		expect(
			authAnswer.status,
			`GET /api/auth/session answered ${authAnswer.status} ${authAnswer.text.slice(0, 200)}`
		).toBe(200);
		expect(
			authAnswer.headers['content-security-policy'],
			`GET /api/auth/session carried content-security-policy ${JSON.stringify(authAnswer.headers['content-security-policy'])} — the route writes it (route.ts:18), not proxy.ts`
		).toContain("frame-ancestors 'self'");

		const page = await api('/board', { anonymous: true, maxRedirects: 0 });
		const pageAnswer = await readAnswer(page);
		expect(
			pageAnswer.headers['content-security-policy'],
			`GET /board carried content-security-policy ${JSON.stringify(pageAnswer.headers['content-security-policy'])} — the door writes it for a page path`
		).toContain("frame-ancestors 'self'");
	});
});

test.describe('what a proxied route forwards, and what it keeps back', () => {
	const FIDDLY = '?limit=7&limit=9&q=a%20b&empty=&flag&where%5BtenantId%5D=zz&plus=a+b';
	const PATH = '/api/chat/conversations';

	test('the whole query string travels, and what the backend records for it is re-serialised', async ({
		api,
		mock
	}) => {
		const response = await api(`${PATH}${FIDDLY}`, { method: 'GET' });
		const answer = await readAnswer(response);
		const asked = await mock.calls(PATH);

		expect(answer.status, `GET ${PATH}${FIDDLY} answered ${answer.status} ${answer.text.slice(0, 200)}`).toBe(200);
		expect(
			asked.map(triple),
			`GET ${PATH}: exactly one call was expected against ${PATH}; the log holds ${logOf(await mock.requests())}`
		).toEqual([`GET ${PATH} 200`]);

		// `forward-to-gauzy.ts:112` hands on `new URL(req.url).search` untouched, and every parameter above arrives.
		// The string the backend *records* is its own re-serialisation (`new URL(...).searchParams.toString()` in
		// `cypress/support/mock-gauzy-server.mjs:1085`), which is why `%20` reads as `+`, a valueless `flag` reads as
		// `flag=`, and `a+b` decodes to a space: the app forwards bytes, and the meaning is made at the far end.
		expect(
			asked[0].query,
			`GET ${PATH}${FIDDLY}: the backend recorded query ${JSON.stringify(asked[0].query)} — the pinned shape is what this lane measured`
		).toBe('limit=7&limit=9&q=a+b&empty=&flag=&where%5BtenantId%5D=zz&plus=a+b');
		const pairs = [...new URLSearchParams(asked[0].query).entries()].map(([key, value]) => `${key}=${value}`);
		expect(
			pairs,
			`GET ${PATH}${FIDDLY}: the parameters that arrived were ${pairs.join(', ')} — none of the seven sent may be dropped, and ` +
				'`plus` arriving as a space is the `+` being read as an encoded space by the backend'
		).toEqual(['limit=7', 'limit=9', 'q=a b', 'empty=', 'flag=', 'where[tenantId]=zz', 'plus=a b']);
	});

	test('a verb the route does not export forwards nothing of that query', async ({ api, mock }) => {
		const response = await api(`${PATH}${FIDDLY}`, { method: 'PUT', anonymous: true, body: undefined });
		const answer = await readAnswer(response);
		await expectBodiless(`PUT ${PATH}${FIDDLY}`, answer, 405);
		await expectNothingAsked(`PUT ${PATH}${FIDDLY}`, mock);
	});

	test('a caller-supplied tenant-id header is dropped, and the API decides on the cookie tenant', async ({
		api,
		ids,
		mock
	}) => {
		// Decidable pair. The backend authorises this route on the `tenant-id` header alone
		// (`mock-gauzy-server.mjs:554-565`: the header names the tenant, and the body must name that tenant's
		// organization), so a caller header that survived the proxy would make the second call succeed.
		const foreignSwitch = { method: 'POST', body: { organizationId: ids.organizationB } };

		const withoutHeader = await api('/api/auth/switch-organization', foreignSwitch);
		const withoutAnswer = await readAnswer(withoutHeader);
		expect(
			withoutAnswer.status,
			`switch to organization B on a tenant-A session, no caller header: answered ${withoutAnswer.status} ${withoutAnswer.text.slice(0, 200)}`
		).toBe(401);
		expect(
			(await mock.calls('/api/auth/switch-organization')).map(triple),
			`the switch was expected to be refused at the backend (the session's tenant does not own organization B); log ${logOf(
				await mock.requests()
			)}`
		).toEqual(['POST /api/auth/switch-organization 401']);

		const withCallerHeader = await api('/api/auth/switch-organization', {
			...foreignSwitch,
			headers: { 'tenant-id': ids.tenantB }
		});
		const callerAnswer = await readAnswer(withCallerHeader);
		expect(
			callerAnswer.status,
			`switch to organization B with a caller-supplied tenant-id header naming tenant B: answered ${callerAnswer.status} ${callerAnswer.text.slice(0, 200)} — 200 here would mean the caller header reached the API and authorized its own tenant`
		).toBe(401);
		expect(
			parseAnswer(callerAnswer.text),
			`the caller-header switch answered ${callerAnswer.text.slice(0, 200)} — the backend's own refusal was expected`
		).toMatchObject({ statusCode: 401, message: 'Unauthorized' });

		// The control that keeps the two 401s from being "the backend refuses everything".
		const ownSwitch = await api('/api/auth/switch-organization', {
			method: 'POST',
			body: { organizationId: ids.organizationA }
		});
		const ownAnswer = await readAnswer(ownSwitch);
		expect(
			ownAnswer.status,
			`switch to organization A on a tenant-A session answered ${ownAnswer.status} ${ownAnswer.text.slice(0, 200)} — the control for the two refusals above`
		).toBe(200);

		const calls = await mock.calls('/api/auth/switch-organization');
		expect(
			calls.map(triple),
			`the backend must have seen the cookie tenant in both refusals and the session tenant in the control; log ${logOf(calls)}`
		).toEqual([
			'POST /api/auth/switch-organization 401',
			'POST /api/auth/switch-organization 401',
			'POST /api/auth/switch-organization 200'
		]);
	});

	test('a caller-supplied bearer is not used, and nothing is asked for a session-less caller', async ({
		api,
		mock
	}) => {
		const response = await api(PATH, {
			method: 'POST',
			body: {},
			anonymous: true,
			headers: { authorization: 'Bearer caller-supplied-probe-token' }
		});
		const answer = await readAnswer(response);
		expect(answer.status, `anonymous POST ${PATH} with a bearer header answered ${answer.status}`).toBe(401);
		expect(parseAnswer(answer.text), `anonymous POST ${PATH} answered ${answer.text.slice(0, 200)}`).toMatchObject({
			statusCode: 401,
			message: 'Unauthorized'
		});
		expect(
			await receivedTokens(PATH),
			`a bearer was expected to travel nowhere: the backend recorded ${JSON.stringify(await receivedTokens(PATH))} against ${PATH}`
		).toEqual([]);
		await expectNothingAsked(`anonymous POST ${PATH} with a caller bearer`, mock);

		// Which side wrote this 401, told apart by the header rather than the body — both bodies are the same words:
		// this app's own answer is `NextResponse.json` (no charset), a refused answer that came back from the backend
		// carries the backend's `application/json; charset=utf-8`. See the switch-organization case above.
		expect(
			answer.headers['content-type'],
			`the session refusal named content-type ${JSON.stringify(answer.headers['content-type'])} — this app wrote it (forward-to-gauzy.ts:96), and an upstream refusal would carry a charset`
		).toBe('application/json');
	});

	test('the one header a route names goes on, and the backend log cannot show it', async ({ api, mock }) => {
		const path = `/api/chat/messages/${INERT}/interactions`;
		const response = await api(path, {
			method: 'POST',
			body: {},
			headers: { 'idempotency-key': 'lane-c-idempotency-probe' }
		});
		const answer = await readAnswer(response);
		const asked = await mock.calls(`/api/chat/messages/${INERT}/interactions`);

		expect(answer.status, `POST ${path} answered ${answer.status} ${answer.text.slice(0, 200)}`).toBe(200);
		expect(
			asked.map(triple),
			`POST ${path}: exactly one upstream call was expected; the log holds ${logOf(await mock.requests())}`
		).toEqual([`POST ${path} 200`]);
		test.info().annotations.push({
			type: 'not observable here',
			description:
				'the Idempotency-Key is the only request header any route hands on (app/api/chat/messages/[id]/interactions/route.ts:17 with forwardHeaders), and the request log is body- and header-free by design (mock-gauzy-server.mjs:1080-1091), so this case proves the call happened once and cannot prove the key arrived'
		});
	});

	test('a refused write from another site never becomes a call, whatever the body', async ({ api, mock }) => {
		const response = await api(`${PATH}${FIDDLY}`, {
			method: 'POST',
			body: {},
			headers: { origin: FOREIGN_ORIGIN }
		});
		const answer = await readAnswer(response);
		expect(answer.status, `cross-site POST ${PATH}${FIDDLY} answered ${answer.status}`).toBe(403);
		await expectNothingAsked(`cross-site POST ${PATH}${FIDDLY}`, mock);
		test.info().annotations.push({
			type: 'not this files claim',
			description:
				'the refusal itself belongs to suites/api/foreign-origin.spec.ts; only the forwarded-nothing half is pinned here'
		});
	});
});

test.describe('a wrong verb at a route that exists is not a 404', () => {
	/**
	 * Each `unknown` path is one the manifest matches **nowhere** — the manifest has exactly three catch-alls
	 * (`/api/auth/[...nextauth]`, `/api/ever-connect/[...path]`, `/api/public-assets/[...path]`), and none of these
	 * paths falls under one. That qualifier is load-bearing: the first version of this pair used
	 * `/api/user/reset-playwright-nope`, which is not a 404 at all, because `/api/user/[id]` matches it — the next test
	 * below pins what that answer really is.
	 */
	const PAIRS = [
		{ exists: '/api/chat/conversations', verb: 'PUT', unknown: '/api/chat/conversations-playwright-nope' },
		{ exists: '/api/user/reset', verb: 'GET', unknown: '/api/user-playwright-nope' },
		{ exists: '/api/board/members', verb: 'PUT', unknown: '/api/board/members-playwright-nope' }
	];

	for (const pair of PAIRS) {
		test(`${pair.verb} ${pair.exists} is a bodiless 405 and the same verb next door is the 404 document`, async ({
			api,
			mock
		}) => {
			const known = await api(pair.exists, { method: pair.verb, anonymous: true });
			const knownAnswer = await readAnswer(known);
			await expectBodiless(`${pair.verb} ${pair.exists}`, knownAnswer, 405);

			const unknown = await api(pair.unknown, { method: pair.verb, anonymous: true });
			const unknownAnswer = await readAnswer(unknown);
			expect(
				unknownAnswer.status,
				`${pair.verb} ${pair.unknown} answered ${unknownAnswer.status} — a path with no route is the not-found page`
			).toBe(404);
			expect(
				unknownAnswer.headers['content-type'] ?? '',
				`${pair.verb} ${pair.unknown} answered with content-type ${JSON.stringify(unknownAnswer.headers['content-type'])} — the not-found answer is an HTML document`
			).toContain('text/html');
			expect(
				unknownAnswer.text.length,
				`${pair.verb} ${pair.unknown}: the 404 document was ${unknownAnswer.text.length} bytes, expected the rendered not-found page`
			).toBeGreaterThan(1000);
			expect(
				unknownAnswer.headers['cache-control'],
				`the 404 for ${pair.unknown} carried cache-control ${JSON.stringify(unknownAnswer.headers['cache-control'])} — Next marks its own not-found answer no-store, the 405 above carries no directive at all`
			).toBe('no-store');

			// The two answers are different objects from different layers: the route module versus the page render.
			expect(
				`${knownAnswer.status}/${knownAnswer.text.length} vs ${unknownAnswer.status}/${unknownAnswer.text.length}`,
				`a 405 and a 404 were expected to differ in body length: ${knownAnswer.status}/${knownAnswer.text.length} versus ${unknownAnswer.status}/${unknownAnswer.text.length}`
			).not.toMatch(/^(\d+)\/(\d+) vs \1\/\2$/);
			await expectNothingAsked(`${pair.verb} against ${pair.exists} and ${pair.unknown}`, mock);
		});
	}

	test('a name under a parent that has a dynamic route is answered by that route, not by the 404 page', async ({
		api,
		mock
	}) => {
		// The reason the pairs above have to name paths the manifest matches nowhere. `/api/user/[id]` is a GET route,
		// so every one-segment name under `/api/user/` is answered by it: made-up ones included. Measured on this lane:
		// the handler ran for a name that is not a user id, asked the API who the caller is, and then read the id it was
		// given — 200 with JSON, no 404 anywhere. The session read of a caller with no cookies is `session-check.spec.ts`'s
		// own finding; what belongs to this file is that the routing never even said "no such route".
		const swallowed = '/api/user/reset-playwright-nope';
		const response = await api(swallowed, { method: 'GET', anonymous: true });
		const answer = await readAnswer(response);

		expect(
			answer.status,
			`GET ${swallowed} answered ${answer.status} — /api/user/[id] matches every one-segment name under /api/user, so this is not a 404`
		).toBe(200);
		expect(
			answer.headers['content-type'] ?? '',
			`GET ${swallowed} answered with content-type ${JSON.stringify(answer.headers['content-type'])} — the handler answered, not the not-found document`
		).toContain('application/json');
		expect(
			answer.text,
			`GET ${swallowed}: the answer was ${answer.text.slice(0, 200)} — a JSON body from the handler was expected`
		).not.toContain('<!DOCTYPE');

		// The backend was asked about the made-up id, which is the proof the handler ran rather than something above it
		// answering.
		expect(
			(await mock.calls(swallowed)).map(triple),
			`GET ${swallowed}: the backend was expected to hold exactly one read of the made-up id; whole log ${logOf(
				await mock.requests()
			)}`
		).toEqual([`GET ${swallowed} 200`]);
		test.info().annotations.push({
			type: 'not asserted here',
			description:
				'the same probe also puts a GET /api/user/me entry in the log (authenticatedGuard asks even for a caller with no cookies, which suites/lane-c/session-check.spec.ts pins), but that answer can also be served by the 5 s SessionCheckMemo of the dev-server process, so this file records it instead of pinning it'
		});
	});

	test('a static segment is not answered by the dynamic route beside it', async ({ api, mock }) => {
		// `/api/chat/conversations/browse` exports GET. `/api/chat/conversations/[id]` exports PATCH. A PATCH at the
		// static name is a 405 — the sibling handler does not get the request. The control right below shows the
		// sibling handler answering when the segment *is* dynamic, so the 405 above is a routing answer and not a
		// handler that refused for its own reason.
		const staticPath = '/api/chat/conversations/browse';
		const refused = await api(staticPath, { method: 'PATCH', body: {} });
		const refusedAnswer = await readAnswer(refused);
		await expectBodiless(`PATCH ${staticPath} (the static name)`, refusedAnswer, 405);
		expect(
			await mock.calls(staticPath),
			`PATCH ${staticPath}: if the /api/chat/conversations/[id] handler had answered, the backend would hold a PATCH against it; log ${logOf(
				await mock.requests()
			)}`
		).toEqual([]);

		const dynamicPath = `/api/chat/conversations/${INERT}`;
		const answered = await api(dynamicPath, { method: 'PATCH', body: {} });
		const answeredAnswer = await readAnswer(answered);
		expect(
			answeredAnswer.status,
			`PATCH ${dynamicPath} (the control) answered ${answeredAnswer.status} ${answeredAnswer.text.slice(0, 200)}`
		).toBe(200);
		expect(
			(await mock.calls(dynamicPath)).map(triple),
			`PATCH ${dynamicPath}: the control was expected to reach the backend; log ${logOf(await mock.requests())}`
		).toEqual([`PATCH ${dynamicPath} 200`]);
	});

	test('a verb Next does not know at all is refused with 400, not with 405', async ({ api, mock }) => {
		// A verb outside the method list Next dispatches never reaches a route module: the answer is a bare 400 with
		// no body, which is a third shape a client can meet at an API path.
		for (const verb of ['PROPFIND', 'QUERY']) {
			const response = await api('/api/chat/conversations', { method: verb, anonymous: true });
			const answer = await readAnswer(response);
			await expectBodiless(`${verb} /api/chat/conversations`, answer, 400);
			await expectNoCors(`${verb} /api/chat/conversations`, answer);
			await expectNothingAsked(`${verb} /api/chat/conversations`, mock);
		}
	});
});

test.describe('the verb-class table still matches the manifest', () => {
	test('every verb class in the manifest is covered by this file, except the one it names', async () => {
		const SKIP = ['/api/auth/ever-id/start'];
		const manifestClasses = new Set(
			apiRoutes.filter((route) => !SKIP.includes(route.path)).map((route) => CLASS_OF(route.verbs))
		);
		const covered = new Set(ROWS.map((row) => CLASS_OF(row.verbs)));
		const missing = [...manifestClasses].filter((entry) => !covered.has(entry));
		expect(
			missing,
			`routes.generated.ts names verb classes this file does not probe: ${missing.join(' | ')} — add a row, or name why the class is left out`
		).toEqual([]);
	});

	test('every row is a route of this manifest, with the verbs the manifest names', async () => {
		const byPath = new Map(apiRoutes.map((route) => [route.path, route.verbs]));
		const wrong = ROWS.filter((row) => {
			const verbs = byPath.get(row.pattern);
			return !verbs || CLASS_OF(verbs) !== CLASS_OF(row.verbs) || verbs.includes(row.wrongVerb);
		}).map((row) => `${row.pattern} exports ${byPath.get(row.pattern)?.join(', ') ?? 'nothing'}`);
		expect(
			wrong,
			`these rows are not in the manifest, export the verb they call wrong, or no longer exist: ${wrong.join(' | ')}`
		).toEqual([]);
	});

	test('this lane has no Board origin to trust, which is what the Board rows above pin', async ({ api }) => {
		// The precondition of every Board row: with no Board domain configured, `trustedBoardOrigin()` is null
		// (`core/lib/board/board-app.ts:66-73`) and every origin — this app's own included — meets
		// `forbiddenForBoard()`. If a lane is ever started with E2E_BOARD_APP_DOMAIN, this test is the one that says
		// the Board rows above have to be re-read.
		const own = await api('/api/board/session', {
			method: 'OPTIONS',
			anonymous: true,
			headers: { origin: OWN_ORIGIN }
		});
		const answer = await readAnswer(own);
		expect(
			`${answer.status} ${answer.text}`,
			`OPTIONS /api/board/session from this app's own origin (${OWN_ORIGIN}) answered ${answer.status} ${answer.text.slice(0, 200)} — this lane must run with no Board domain for the Board rows to mean what they say`
		).toBe('403 {"message":"Forbidden"}');
		expect(
			OWN_HOST,
			'the app origin this suite calls (and only it) is what the Board gate compared the Origin against in these cases'
		).toBe(new URL(APP_ORIGIN).host);
	});
});
