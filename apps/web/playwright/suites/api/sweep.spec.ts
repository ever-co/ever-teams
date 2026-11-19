import { expect, test } from '../../api-fixtures';
import { apiRoutes, unattributedApiRoutes } from './routes.generated';

/**
 * Every Next.js route handler in the web app, called over HTTP with no browser in the loop.
 *
 * What this proves about each handler, for every HTTP verb it actually exports:
 *   - the route exists (a Next 404 answers HTML, not JSON)
 *   - it answers as JSON, i.e. it is still an API handler
 *   - it does not 5xx on a bare, unsigned-body call from a signed-in person: input validation is
 *     handled as a 4xx, not as a crash
 *
 * The app proxies its server-side Gauzy calls to the mock API (apps/web/cypress/support/
 * mock-gauzy-server.mjs), so the handler code is real and the upstream is fake: a route that would
 * otherwise reach a production API reaches the mock instead, and the mock's request log shows what
 * the route actually asked for.
 *
 * Dynamic segments are filled with fixture entities, and a few with values chosen to keep the call
 * local (see PARAMS) — a test must not cause the server to fetch from the public internet.
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
	// Not ids: values that keep the handler's work on this machine or plainly inert.
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
	return path.replace(/\[(\[[^\]]+\]|\[[^\]]+\])\]/g, (_match, raw: string) => {
		const key = raw.replace(/^\[|\]$/g, '');
		const value = PARAMS[key] ?? PARAMS[key.replace(/^\.\.\.\//, '')];
		if (!value) return 'playwright-param';
		if (ids[value]) return ids[value];
		if (names[value]) return names[value];
		return value;
	});
}

/**
 * Handlers that answer 5xx for a reason this run cannot fix, each with the blocker written down.
 * Empty by design: a 5xx is a finding, and a finding gets a reason here or a fix, never a silent skip.
 */
const DOCUMENTED_SERVER_BLOCKERS: Record<string, string> = {};

for (const route of apiRoutes) {
	for (const verb of route.verbs) {
		const title = `${verb} ${route.path}`;
		const blocker = DOCUMENTED_SERVER_BLOCKERS[title];

		test(`${title} answers as JSON without a 5xx`, async ({ api, ids, names, mock }) => {
			test.skip(Boolean(blocker), `known blocker: ${blocker}`);

			const url = resolveRoute(route.path, ids, names);
			// The app always sends JSON on a mutating call, so that is what this sweep sends. The
			// empty-body case is its own test in empty-body.spec.ts, where the handlers that cannot
			// take it are written down instead of being papered over.
			const mutating = verb === 'POST' || verb === 'PUT' || verb === 'PATCH';
			const response = await api(url, { method: verb, body: mutating ? {} : undefined });
			const status = response.status();
			const body = await response.text().catch(() => '<unreadable body>');

			expect(
				status,
				`${title} crashed the handler (status ${status}): ${body.slice(0, 400)}`
			).toBeLessThan(500);

			const contentType = response.headers()['content-type'] ?? '';
			expect(contentType, `${title} answered ${contentType || 'no content-type'} — a route handler answers JSON`).toContain(
				'application/json'
			);

			// A handler that proxies to Gauzy must proxy it to the mock, and the log proves the origin.
			const upstream = await mock.requests();
			expect(
				upstream.every((request) => request.status < 500),
				`${title} caused a failing call to the mock Gauzy API`
			).toBe(true);
		});
	}
}

test('no route handler was found without a recognizable verb export', () => {
	// These are not failures by themselves: a handler may export verbs in a shape the collector does
	// not recognize. They are listed so the count never grows quietly.
	expect(
		unattributedApiRoutes,
		`route handlers the collector could not attribute a verb to: ${unattributedApiRoutes.join(', ')}`
	).toEqual(['/api/auth/[...nextauth]']);
});

test('the NextAuth route answers its own endpoints', async ({ api }) => {
	for (const endpoint of ['/api/auth/session', '/api/auth/providers', '/api/auth/csrf']) {
		const response = await api(endpoint);
		expect(response.status(), `${endpoint} answered ${response.status()}`).toBeLessThan(500);
		expect(response.headers()['content-type'] ?? '').toContain('application/json');
	}
});
