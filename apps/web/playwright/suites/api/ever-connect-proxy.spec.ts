import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';

/**
 * `/api/ever-connect/*` forwards only the routes it names, and nothing before it checked them.
 *
 * The catch-all is a proxy that acts with the signed-in person's token, so what matters is its allow-list
 * (`core/services/server/ever-platform/connect-proxy-rules.ts`): 13 routes with their method, the query
 * parameters they read, the body fields they take, a 4 KB body cap, and the App Launcher pair that the
 * paired API answers only for this app's own pages. Everything else must answer 404 *without asking the
 * API anything* — including the installation's own routes (connecting, disconnecting, the operator's
 * policy), which belong to the API's settings and must never be reachable through a browser's session.
 *
 * The mock records every path it was asked for, so "refused here" and "forwarded and refused there" are
 * different, provable answers.
 */

const CONNECT = '/api/ever-connect';

async function call(api: ApiCall, path: string, options: Parameters<ApiCall>[1] = {}) {
	const response = await api(`${CONNECT}${path}`, options);
	const text = await response.text();
	return {
		status: response.status(),
		text,
		headers: response.headers(),
		why: `${options.method ?? 'GET'} ${CONNECT}${path}`
	};
}

test.describe('the Ever Connect proxy forwards only what it names', () => {
	// A path it does not name, and a path it names but not for this method.
	const NOT_FORWARDED = [
		['/installation', 'GET'],
		['/health/deep', 'GET'],
		['/links', 'GET'],
		['/health', 'POST'],
		['/status', 'PUT'],
		['/entitlement', 'DELETE'],
		['/integrations/refresh', 'GET'],
		['/policy', 'GET']
	] as const;

	for (const [path, method] of NOT_FORWARDED) {
		test(`${method} ${path} is refused without asking the API`, async ({ api, mock }) => {
			const { status, text, why } = await call(api, path, {
				method: method as 'GET' | 'POST' | 'PUT' | 'DELETE'
			});

			expect(status, `${why}: answered ${text}`).toBe(404);
			expect(text, `${why}: not the route-not-found answer`).toContain('Not Found');
			expect(await mock.requests(), `${why}: the API was asked anyway`).toEqual([]);
		});
	}

	test('a signed-out person is refused without asking the API', async ({ api, mock }) => {
		const { status, text, why } = await call(api, '/health', { anonymous: true });

		expect(status, `${why}: answered ${text}`).toBe(401);
		expect(await mock.requests(), `${why}: the API was asked for a session this app does not have`).toEqual([]);
	});

	test('the paired API’s own refusal is passed through, not smoothed over', async ({ api, mock }) => {
		// `connectHealth: false` makes the mock answer the connection health with 404; the route must answer
		// 404 with that answer, so the page can say the connection is down instead of showing stale data.
		await mock.scenario({ connectHealth: false });
		const { status, text, why } = await call(api, '/health');

		expect(status, `${why}: answered ${text}`).toBe(404);
		const calls = await mock.calls('/api/ever-connect/health');
		expect(
			calls.map((call) => `${call.method} ${call.path} ${call.status}`),
			`${why}: the API was not asked`
		).toEqual(['GET /api/ever-connect/health 404']);
	});

	test('no answer of this proxy is cacheable', async ({ api, mock }) => {
		// Every branch answers through `jsonAnswer` of route-helpers.ts, which puts `NO_STORE_HEADERS` on it.
		// The forwarded payload is the connection state of the signed-in person; even the 404 and the 401 say
		// something about this tenant's installation. A cache anywhere on the way would serve it to the next
		// visitor, or after the connection changed.
		await mock.scenario({ connectConnected: true });

		const answers = [
			['the forwarded status', await call(api, '/status')],
			['a route it does not forward', await call(api, '/policy')],
			['a signed-out person', await call(api, '/status', { anonymous: true })],
			['a body it rejects', await call(api, '/links', { method: 'POST', body: { link_code: 'nope' } })],
			[
				'a foreign page asking for the launcher',
				await call(api, '/launcher/config', { headers: { origin: 'https://some-other-site.example' } })
			]
		] as const;

		for (const [what, answer] of answers) {
			expect(answer.status, `${what}: the proxy answered nothing`).not.toBe(0);
			expect(answer.headers['cache-control'] ?? '', `${what}: answered without a cache directive`).toContain(
				'no-store'
			);
		}

		// The 200 is the person's own connection, not a generic one: the payload travelled through untouched.
		const status = JSON.parse((await call(api, '/status')).text);
		expect(status, 'the connection status the API gave was rewritten on the way').toMatchObject({
			enabled: true,
			connected: true,
			managed_by: 'operator'
		});
	});

	test('the App Launcher routes are forwarded only for this app’s own pages', async ({ api, mock }) => {
		const foreign = await call(api, '/launcher/config', { headers: { origin: 'https://some-other-site.example' } });
		expect(foreign.status, `${foreign.why}: a foreign page was not refused`).toBe(403);
		expect(await mock.requests(), `${foreign.why}: the launcher was asked for a foreign page`).toEqual([]);

		const own = await call(api, '/launcher/config', {
			headers: { origin: APP_ORIGIN, 'sec-fetch-site': 'same-origin' }
		});
		// The mock does not answer the launcher: what is proved here is that the request left this app once
		// the page check passed, which is the other half of the same rule.
		const asked = await mock.calls('/api/ever-connect/launcher/config');
		expect(
			asked.map((call) => call.path),
			`${own.why}: this app's own page was not forwarded`
		).toEqual(['/api/ever-connect/launcher/config']);
	});

	test('a link code the rule does not accept never reaches the API', async ({ api, mock }) => {
		const rejected = await call(api, '/links', { method: 'POST', body: { link_code: 'whatever' } });
		expect(rejected.status, `${rejected.why}: a made-up code was not refused here`).toBe(400);
		expect(await mock.requests(), `${rejected.why}: the API saw a body this app rejected`).toEqual([]);

		const accepted = await call(api, '/links', { method: 'POST', body: { link_code: 'EVL-AAAA-AAAA-AAAA' } });
		// The mock has no links route, so it answers 404 — the point is that this one *got* an answer.
		expect(accepted.status, `${accepted.why}: a well-formed code did not reach the API`).toBe(404);
		expect((await mock.calls('/api/ever-connect/links')).map((call) => call.method)).toEqual(['POST']);
	});

	test('a body past the proxy’s cap is refused before it is read as JSON', async ({ api, mock }) => {
		const padding = 'x'.repeat(4096);
		const { status, why } = await call(api, '/links', {
			method: 'POST',
			body: { link_code: 'EVL-AAAA-AAAA-AAAA', padding }
		});

		expect(status, `${why}: an oversized body was processed anyway`).toBe(400);
		expect(await mock.requests(), `${why}: the oversized body was forwarded`).toEqual([]);
	});

	test('only the query parameters the routes read travel to the API', async ({ api, ids, mock }) => {
		const query = `?organizationId=${ids.organizationA}&page=2&limit=25&integration=slack&evil=1&where%5BtenantId%5D=${ids.tenantB}`;
		const { status, why } = await call(api, `/audit${query}`);

		expect(status, `${why}: the audit route was not answered`).toBe(404); // the mock has no audit route; the query is the point
		const calls = await mock.calls('/api/ever-connect/audit');
		expect(calls.length, `${why}: the API was not asked`).toBe(1);

		const sent = calls[0].query;
		expect(sent, `${why}: the organization id did not travel`).toContain(`organizationId=${ids.organizationA}`);
		expect(sent, `${why}: the paging did not travel`).toContain('page=2');
		expect(sent, `${why}: an unknown parameter travelled`).not.toContain('evil');
		expect(sent, `${why}: a filter on another tenant travelled`).not.toContain('tenantId');
	});
});
