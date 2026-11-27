import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';
import { LANE_PORTS } from '../../test-servers';

/**
 * A route that acts with the session's own token must answer a caller who has no session, and it must
 * answer them *before* it asks the Gauzy API anything.
 *
 * These are the proxy-mode twins of the platform's endpoints: the handler fixes the upstream path, takes
 * the token out of the `auth-token` cookie and forwards. `core/services/server/forward-to-gauzy.ts` puts
 * the cookie check at line 96 and the upstream `fetch` at line 112, and `ever-platform/route-helpers.ts`
 * `routeSession()` refuses a caller with no token before the paired API is touched. So the mock's request
 * log — reset by the fixture before every test — is the proof of *where* the refusal happened: an empty
 * log means this app refused, a logged call means it forwarded and let the API refuse.
 *
 * Routes that authenticate through `guards/authenticated-guard-app.ts` (`authenticatedGuard`) are NOT in
 * this list on purpose: that guard asks `GET /user/me` first and answers with the status the API gave, so
 * "refused here, the API never saw it" is not a claim those routes make. They are covered in
 * lane-c/session-check.spec.ts instead.
 */

type Probe = { verb: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string };

/** Every one of these is a one-call `forwardToGauzy` handler (read from its route file), or an
 * `ever-stats` handler whose `routeSession()` reads the cookie and answers before anything else. */
const SESSION_ROUTES: Probe[] = [
	{ verb: 'GET', path: '/api/chat/conversations' },
	{ verb: 'GET', path: '/api/chat/threads' },
	{ verb: 'GET', path: '/api/chat/people' },
	{ verb: 'GET', path: '/api/chat/link-preview?url=http://127.0.0.1:3033/' },
	{ verb: 'GET', path: '/api/chat/link-preview/image?url=http://127.0.0.1:3033/' },
	{ verb: 'GET', path: '/api/timesheet/time-log' },
	{ verb: 'POST', path: '/api/timesheet/time-log' },
	{ verb: 'GET', path: '/api/task-views' },
	{ verb: 'POST', path: '/api/task-views' },
	{ verb: 'GET', path: '/api/time-goals' },
	{ verb: 'POST', path: '/api/time-goals' },
	{ verb: 'POST', path: '/api/task-estimation' },
	{ verb: 'GET', path: '/api/tasks/trash' },
	{ verb: 'GET', path: '/api/inbox/items' },
	{ verb: 'GET', path: '/api/inbox/items/counts' },
	{ verb: 'GET', path: '/api/inbox/delivery/status' },
	{ verb: 'GET', path: '/api/inbox/push-subscriptions' },
	{ verb: 'GET', path: '/api/inbox/push-subscriptions/public-key' },
	{ verb: 'POST', path: '/api/inbox/push-subscriptions' },
	{ verb: 'GET', path: '/api/realtime/status' },
	{ verb: 'GET', path: '/api/realtime/events' },
	{ verb: 'POST', path: '/api/realtime/presence' },
	{ verb: 'POST', path: '/api/realtime/typing' },
	{ verb: 'PUT', path: '/api/user/ui-preferences' },
	{ verb: 'POST', path: '/api/reaction' },
	{ verb: 'GET', path: '/api/embed-credentials' },
	{ verb: 'GET', path: '/api/embed-credentials/config' },
	{ verb: 'GET', path: '/api/embed-allowed-origins' },
	{ verb: 'POST', path: '/api/embed-allowed-origins' },
	{ verb: 'GET', path: '/api/auth/sessions' },
	{ verb: 'GET', path: '/api/task-automations' },
	{ verb: 'POST', path: '/api/task-automations' },
	{ verb: 'GET', path: '/api/task-automations/templates' },
	{ verb: 'GET', path: '/api/plugins/docs/documents' },
	{ verb: 'POST', path: '/api/plugins/docs/documents' },
	{ verb: 'GET', path: '/api/ever-stats/status' },
	{ verb: 'GET', path: '/api/ever-stats/last' },
	{ verb: 'PUT', path: '/api/ever-stats/enabled' }
];

async function refuse(api: ApiCall, probe: Probe, headers: Record<string, string> = {}) {
	const response = await api(probe.path, {
		method: probe.verb,
		body: probe.verb === 'GET' ? undefined : {},
		anonymous: true,
		headers
	});
	const text = await response.text();
	return { status: response.status(), text, headers: response.headers(), why: `${probe.verb} ${probe.path}` };
}

test.describe('a signed-out caller is refused by the route, not by the API', () => {
	for (const probe of SESSION_ROUTES) {
		test(`${probe.verb} ${probe.path}`, async ({ api, mock }) => {
			const { status, text, why } = await refuse(api, probe);

			expect(status, `${why}: a request with no session cookie answered ${status} ${text}`).toBe(401);

			let answer: Record<string, unknown> = {};
			try {
				answer = JSON.parse(text) as Record<string, unknown>;
			} catch {
				// Left empty: the assertion below names what actually came back.
			}
			expect(answer.message, `${why}: the refusal did not say why (${text})`).toBe('Unauthorized');

			expect(
				(await mock.requests()).map((request) => `${request.method} ${request.path} ${request.status}`),
				`${why}: the refusal must come from this app, so the mock API must not have been asked anything`
			).toEqual([]);
		});
	}

	test('a session whose cookies name everything except the token is refused the same way', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// The rest of the session is there — tenant, organization, team, user — so this is not a request
		// with no cookies at all; it is a session that cannot be acted with, and the route must notice.
		const response = await api('/api/chat/conversations', { headers: { cookie: cookies('A', ['auth-token']) } });
		const text = await response.text();

		expect(response.status(), `a tokenless session was answered by the API instead (${text})`).toBe(401);
		expect(
			await mock.requests(),
			`a tokenless session reached the API anyway: ${JSON.stringify(await mock.requests())}`
		).toEqual([]);

		// Not a tenant problem: the same cookies with their token are forwarded.
		const signedIn = await api('/api/chat/conversations');
		expect(signedIn.status(), `the same session with its token was not forwarded: ${await signedIn.text()}`).toBe(
			200
		);
		expect(ids.tenantA, 'the fixture lost its tenant id').toBeTruthy();
	});

	test('a token cookie that is only the announced chunk count is not a session', async ({ api, mock }) => {
		// `auth-token_totalChunks` is a client-supplied number; a value outside 1..64 reads as no token
		// rather than as a session, and must not size a read loop either.
		const response = await api('/api/chat/conversations', {
			headers: { cookie: 'auth-token_totalChunks=99999999; auth-token0=fragment' }
		});
		const text = await response.text();

		expect(response.status(), `a nonsense chunk count was treated as a session (${text})`).toBe(401);
		expect(await mock.requests(), 'a request with no usable token reached the API').toEqual([]);
	});

	test.describe('what the write guard does not cover, pinned rather than assumed', () => {
		test('a cross-site GET of the session’s own data is answered, not refused', async ({ api, mock }) => {
			// `refuseForeignWrite` exempts GET and HEAD (same-origin-request.ts). The foreign-origin suite
			// pins the writes; this pins the other half of the same rule: a read is guarded by the token
			// alone, so with the session's cookies present a request the browser says came from another
			// site is forwarded. Pinned so that closing it (or widening the guard) is a decision somebody
			// has to make here, in the open.
			const response = await api('/api/auth/sessions', {
				headers: { origin: 'https://some-other-site.example' }
			});
			const text = await response.text();

			expect(
				response.status(),
				`a cross-site read was refused as a write is (${response.status()} ${text})`
			).toBe(200);
			expect(
				(await mock.calls('/api/auth/sessions')).map((call) => `${call.method} ${call.path}`),
				`the cross-site read was not forwarded to the API: ${JSON.stringify(await mock.requests())}`
			).toEqual(['GET /api/auth/sessions']);
		});

		test('a client that sends neither Origin nor Sec-Fetch-Site passes the write guard', async ({ api, mock }) => {
			// The guard works from what a browser reports. A raw HTTP client reports nothing, so it is not
			// refused *as cross-site* — it is only refused if it has no session. Recorded here because the
			// suite's own calls are exactly that kind of client, and a green cross-site suite must not be
			// read as "a non-browser client cannot write".
			const response = await api('/api/chat/conversations', {
				method: 'POST',
				body: { title: 'no origin here' }
			});
			const text = await response.text();

			expect(response.status(), `a signed-in write with no Origin header was refused (${text})`).toBe(200);
			expect(
				(await mock.calls('/api/chat/conversations')).map(
					(call) => `${call.method} ${call.path} ${call.status}`
				),
				`the write was not forwarded, so it was refused somewhere: ${text}`
			).toEqual(['POST /api/chat/conversations 200']);
		});

		test('a foreign Origin on a read that is also a proxy does not hide the read', async ({ api, mock }) => {
			// Same rule from the other side: the origin check is not applied to GET at all, so a foreign
			// Origin on a read is not a refusal, and the read reaches the API.
			const response = await api('/api/realtime/events', {
				headers: { origin: 'https://some-other-site.example' }
			});
			const text = await response.text();

			expect(response.status(), `a foreign Origin turned a read into ${response.status()} (${text})`).toBe(200);
			expect(
				await mock.calls('/api/realtime/events').then((calls) => calls.length),
				'the read did not reach the API'
			).toBe(1);
		});
	});

	test.describe('the statistics routes refuse before the paired API is asked', () => {
		test('GET /api/ever-stats/status reads the cookie only', async ({ api, mock }) => {
			// `routeSession()` is a cookie read, not a session check: no token, no request to the paired API.
			const { status, text } = await refuse(api, { verb: 'GET', path: '/api/ever-stats/status' });

			expect(status, `the operator's statistics status answered ${status} ${text}`).toBe(401);
			expect(await mock.requests(), 'the paired API was asked for the statistics state anyway').toEqual([]);
		});

		test('GET /api/ever-stats/last gives nobody the report bytes', async ({ api, mock }) => {
			const { status, text } = await refuse(api, { verb: 'GET', path: '/api/ever-stats/last' });

			expect(status, `the last-report read answered ${status} ${text}`).toBe(401);
			expect(await mock.requests(), 'the paired API was asked for the last reports anyway').toEqual([]);
		});

		test('a signed-in person is not the operator by right of the cookie', async ({ api, mock }) => {
			// Who the operator is stays with the paired API (`statsOperator: false` stands for "this person
			// is not the operator"): the route must not turn a valid session into the operator's view.
			await mock.scenario({ statsOperator: false });
			const response = await api('/api/ever-stats/status');
			const text = await response.text();

			expect(response.status(), `a non-operator was shown the operator's status (${text})`).toBe(404);
			expect(
				(await mock.calls('/api/ever-stats/status')).map(
					(call) => `${call.method} ${call.path} ${call.status}`
				),
				`the paired API was not asked who the operator is: ${JSON.stringify(await mock.requests())}`
			).toEqual(['GET /api/ever-stats/status 404']);
		});
	});

	test('the app origin is the origin these routes consider their own', async ({ api }) => {
		/**
		 * A guard that compares the Origin host with the host the request arrived at has to agree with the origin
		 * this suite actually calls; if `APP_ORIGIN` and the config's baseURL ever drift apart, every cross-site
		 * case here would be testing the wrong thing.
		 *
		 * The expected origin is *derived* from `LANE_PORTS[process.env.E2E_LANE]` rather than written as
		 * `http://localhost:3033`. A literal here passed for as long as this lane happened to hold 3033 and would
		 * have failed — as a suite bug, in a file nobody had changed — the moment the lane table moved, which it
		 * did twice today while the lane wiring was fixed. Same check, no number to keep in sync.
		 */
		const laneName = process.env.E2E_LANE ?? '';
		const lanePorts = LANE_PORTS[laneName];
		if (!lanePorts) {
			throw new Error(
				`E2E_LANE=${JSON.stringify(laneName)} is not a lane in LANE_PORTS, so this suite cannot name its own origin.`
			);
		}
		expect(
			APP_ORIGIN,
			`the suite calls the app by ${APP_ORIGIN} while the helpers derived their origin from lane ${JSON.stringify(
				laneName
			)} (${lanePorts ? `app port ${lanePorts.app}` : 'not a known lane'})`
		).toBe(`http://localhost:${lanePorts.app}`);

		const own = await api('/api/chat/conversations', {
			method: 'POST',
			body: { title: 'own origin' },
			headers: { origin: APP_ORIGIN, 'sec-fetch-site': 'same-origin' }
		});
		const text = await own.text();
		expect(own.status(), `a write carrying this app's own Origin was refused (${text})`).toBe(200);
	});
});
