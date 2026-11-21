import { expect, test } from '../../api-fixtures';

/**
 * What these answers say about caching.
 *
 * Three different habits sit next to each other in `app/api`, and only one of them is consistent:
 *
 *   `forwardToGauzy` writes `Cache-Control: no-store` **only when the route asks for it** (`answerHeaders`,
 *   `core/services/server/forward-to-gauzy.ts` line 22-28; `options.noStore` is passed by eleven routes, read from
 *   `grep -n "noStore: true" app/api`). Everything it proxies — including a tenant's invoice page, its chat
 *   conversations and its organization row — goes back with a `Content-Type` and no caching directive of its own.
 *   The Ever Platform helpers (`ever-platform/route-helpers.ts` `NO_STORE_HEADERS`) and the shared-link proxies
 *   (`public-invoice-proxy.ts`, `saved-report-proxy.ts`) mark *every* answer, refusal included.
 *   `refuseForeignWrite` marks its 403 `no-store`, while the 401 and 415 the same proxy answers do not.
 *
 * A missing directive is not proof that something *was* cached; it is the absence of the thing that says it may not
 * be, on an answer that carries this tenant's rows. That is why each case below pairs the header with the body it
 * is about: a finding has to name the data at stake, not just the header that is missing.
 *
 * Pinned as the harness pins a 5xx blocker: the assertion states what the route answers *today*, the message says
 * why that is a defect, and a route that grows a `no-store` fails this file until the pin is removed.
 */

const NO_DIRECTIVE = '<no Cache-Control header on this answer>';

/** The routes that pass `{ noStore: true }` (read from their files), with the answer each one is about. */
const MARKED: Array<{ verb: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; about: string }> = [
	{ verb: 'GET', path: '/api/auth/sessions', about: "the person's own sessions, which is what a stolen cookie looks like" },
	{ verb: 'POST', path: '/api/embed-credentials', about: 'a credential this app creates and shows once' },
	{ verb: 'GET', path: '/api/invoice-payments/connection', about: 'the workspace’s payment connector' }
];

test.describe('a route that asks for no-store answers with it', () => {
	for (const route of MARKED) {
		test(`${route.verb} ${route.path}`, async ({ api, mock }) => {
			const why = `${route.verb} ${route.path} (noStore: true in its route file) — ${route.about}`;
			const response = await api(route.path, { method: route.verb, body: route.verb === 'GET' ? undefined : {} });
			const text = await response.text();
			const cacheControl = response.headers()['cache-control'];

			expect(
				cacheControl ?? NO_DIRECTIVE,
				`${why}: answered ${response.status()} with a cache-control of "${cacheControl ?? ''}" (${text.slice(0, 200)})`
			).toContain('no-store');
			expect(response.status(), `${why}: answered ${response.status()} ${text.slice(0, 200)}`).toBeLessThan(500);
			expect(
				(await mock.requests()).length,
				`${why}: the answer did not come from the API: ${JSON.stringify(await mock.requests())}`
			).toBeGreaterThan(0);
		});
	}

	test('the cross-site refusal is marked no-store, so a cache cannot hold a browser to a 403', async ({ api, mock }) => {
		// `same-origin-request.ts` `refused()` sets the header on its 403; this is the guard's own answer, not a
		// proxied one, and it is the refusal most likely to be replayed by a cache if it were ever cacheable.
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: {},
			headers: { origin: 'https://some-other-site.example' }
		});
		const text = await response.text();

		expect(response.status(), `the cross-site write answered ${response.status()} ${text}`).toBe(403);
		expect(
			response.headers()['cache-control'] ?? NO_DIRECTIVE,
			`the cross-site 403 was answered with a cache-control of "${response.headers()['cache-control'] ?? ''}": ${text}`
		).toContain('no-store');
		expect(await mock.requests(), `the cross-site 403 reached the API: ${JSON.stringify(await mock.requests())}`).toEqual([]);
	});
});

test.describe('the refusals of the same proxy are not marked, pinned rather than approved', () => {
	test('the 401 for a caller with no session carries no caching directive', async ({ api, mock }) => {
		// `forwardToGauzy` answers its own 401 with `NextResponse.json(...)` (line 96) and no headers argument,
		// while the 403 of `refuseForeignWrite` — the guard the same proxy runs first — does set one. A shared cache
		// that holds a 401 holds a signed-in person out of their own page until it expires.
		const response = await api('/api/chat/conversations', { anonymous: true });
		const text = await response.text();

		expect(response.status(), `the signed-out read answered ${response.status()} ${text}`).toBe(401);
		expect(
			response.headers()['cache-control'] ?? NO_DIRECTIVE,
			`the proxy's own 401 answered with a cache-control of "${response.headers()['cache-control'] ?? ''}" (${text}) — the 403 of the same helper is marked, this is not`
		).toBe(NO_DIRECTIVE);
		expect(await mock.requests(), `the 401 reached the API: ${JSON.stringify(await mock.requests())}`).toEqual([]);
	});

	test('the 415 for a body that is not JSON carries no caching directive either', async ({ api, mock }) => {
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: 'name=Fixture',
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
		});
		const text = await response.text();

		expect(response.status(), `the form post answered ${response.status()} ${text}`).toBe(415);
		expect(
			response.headers()['cache-control'] ?? NO_DIRECTIVE,
			`the 415 answered with a cache-control of "${response.headers()['cache-control'] ?? ''}": ${text}`
		).toBe(NO_DIRECTIVE);
		expect(await mock.requests(), `the refused body reached the API: ${JSON.stringify(await mock.requests())}`).toEqual([]);
	});
});

test.describe('a read of this tenant’s data answers with no caching directive', () => {
	/** Every `path` is also the fragment the mock records for it: the app's `/api/...` and the upstream's `/api/...`
	 * are the same string, because `GAUZY_API_SERVER_URL` ends in `/api` (`core/constants/config/constants.tsx`). */
	const UNMARKED: Array<{ path: (ids: Record<string, string>) => string; data: string }> = [
		{
			path: (ids) => `/api/tasks/${ids.task}`,
			data: 'one of the tenant’s tasks, with its teams, members, project and estimates joined in'
		},
		{
			path: (ids) => `/api/organization/${ids.organizationA}`,
			data: "the tenant's own organization row: its name, currency, time zone and time-editing flags"
		},
		{
			path: () => '/api/auth/workspaces',
			data: 'the workspaces the person can sign in to, with their teams'
		},
		{
			path: () => '/api/task-statuses',
			data: "the tenant's task statuses, one per row with its own tenantId and organizationId"
		}
	];

	for (const probe of UNMARKED) {
		test(`GET ${probe.data}`, async ({ api, ids, mock }) => {
			const path = probe.path(ids);
			const why = `GET ${path} — ${probe.data}`;
			const response = await api(path);
			const text = await response.text();

			expect(response.status(), `${why}: answered ${response.status()} ${text.slice(0, 200)}`).toBe(200);
			// The body first, so the finding names the data: a tenant's row, not an empty page.
			expect(
				text,
				`${why}: the answer carries no id of the session's tenant, so this pin would be about nothing: ${text.slice(0, 200)}`
			).toContain(ids.tenantA);
			expect(
				response.headers()['cache-control'] ?? NO_DIRECTIVE,
				`${why}: answered ${response.status()} with a cache-control of "${
					response.headers()['cache-control'] ?? ''
				}" — ${probe.data} went back with no directive saying it may not be stored`
			).toBe(NO_DIRECTIVE);
			expect(
				(await mock.calls(path)).map((request) => `${request.method} ${request.path} ${request.status}`),
				`${why}: the data did not come from a single read of the API: ${JSON.stringify(await mock.requests())}`
			).toHaveLength(1);
		});
	}
});
