import { expect, test } from '../../api-fixtures';
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
	'[...path]': 'health',
	'[...nextauth]': 'session'
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
};

/**
 * Handlers that answer 5xx, each pinned to the status it produced and the reason. Two kinds:
 *   'mock gap' — the deterministic backend implements no upstream route, so the app answers its own
 *                upstream-failure status. The handler behaved correctly; the harness cannot go further.
 *   'app'      — the handler itself. Named here so it is a finding with an owner, not a skipped test.
 * `node apps/web/playwright/scripts/collect-api-route-blockers.mjs` rebuilds this list from a run.
 */
const DOCUMENTED_SERVER_BLOCKERS: Record<string, { status: number; kind: 'mock gap' | 'app'; reason: string }> = {
	'POST /api/ai/transcribe': {
		status: 503,
		kind: 'app',
		reason: 'no speech provider is configured for a test run; the handler answers 503 {"error":"not_configured"}'
	},
	'POST /api/ai/voice-fill': {
		status: 503,
		kind: 'app',
		reason: 'no speech provider is configured for a test run; the handler answers 503 {"error":"not_configured"}'
	},
	'POST /api/invite/accept': {
		status: 502,
		kind: 'mock gap',
		reason: 'the mock implements no POST /api/invite/accept, so the app reports 502 "The Gauzy API gave no usable answer"'
	},
	'GET /api/user-api-tokens/config': {
		status: 502,
		kind: 'mock gap',
		reason: 'the mock implements no /api/user-api-tokens/config; the app reports 502 "Whether this server offers API tokens could not be read."'
	},
	'POST /api/auth/login': {
		status: 500,
		kind: 'app',
		reason: 'an empty-but-valid JSON body reaches the handler with no email or password and it 500s instead of answering 400'
	},
	'POST /api/auth/register': {
		status: 500,
		kind: 'app',
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/auth/signin-email-confirm': {
		status: 500,
		kind: 'app',
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/auth/verify/code': {
		status: 500,
		kind: 'app',
		reason: 'an empty-but-valid JSON body 500s instead of a validation 400'
	},
	'POST /api/image-assets/upload/[folder]': {
		status: 500,
		kind: 'app',
		reason: 'an upload call with no file part 500s instead of a 400'
	},
	'DELETE /api/timer/timesheet/bulk-delete': {
		status: 500,
		kind: 'app',
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
			} else {
				expect(status, `${title} crashed the handler (status ${status}): ${body.slice(0, 400)}`).toBeLessThan(500);
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
				expect(contentType, `${title} answers ${contentType || 'nothing'}: ${NON_JSON_ROUTES[title]}`).not.toContain(
					'application/json'
				);
			} else {
				expect(
					contentType,
					`${title} answered ${status} ${contentType || 'no content-type'} (${body.length} bytes) — a route handler answers JSON`
				).toContain('application/json');
			}

			const upstream = await mock.requests();
			expect(
				upstream.every((request) => request.status < 500),
				`${title} caused a failing call to the mock Gauzy API: ${JSON.stringify(upstream.filter((r) => r.status >= 500))}`
			).toBe(true);
		});
	}
}

test('every route handler is attributed to at least one verb', () => {
	// The NextAuth catch-all is the one handler the collector cannot give verbs to: its verbs come from
	// NextAuth's own handler, not from exports in the file. The list is pinned so it cannot grow quietly.
	expect(unattributedApiRoutes).toEqual(['/api/auth/[...nextauth]']);
});

test('the NextAuth route answers its own endpoints', async ({ api }) => {
	for (const endpoint of ['/api/auth/session', '/api/auth/providers', '/api/auth/csrf']) {
		const response = await api(endpoint);
		expect(response.status(), `${endpoint} answered ${response.status()}`).toBeLessThan(500);
		expect(response.headers()['content-type'] ?? '').toContain('application/json');
	}
});
