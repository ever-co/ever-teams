import { expect, test } from '../../api-fixtures';
import { emptyBodyBlockers } from './empty-body-blockers.generated';
import { apiRoutes } from './routes.generated';

/**
 * The same route handlers, called the way a broken or hostile client calls them: a mutating request
 * with no body at all.
 *
 * A handler that does `await req.json()` on a bodiless request throws and the server answers 500. A
 * handler that does `await req.json().catch(() => null)` — which several in this app do — answers a
 * 4xx. That difference is the whole test, and it is worth pinning: a 500 on a bodiless call is an
 * unhandled exception path in a route that is reachable from the browser.
 *
 * The handlers that currently 500 are listed in empty-body-blockers.generated.ts, with the status each
 * one produced. That file is not hand-written: rebuild it from a run with
 *
 *   node apps/web/playwright/scripts/collect-empty-body-blockers.mjs
 *
 * so the list is evidence, and so a handler that starts answering 500 fails this run rather than
 * joining the list quietly.
 */

const MUTATING = ['POST', 'PUT', 'PATCH'];

const PARAMS: Record<string, string> = {
	id: 'task',
	userId: 'user',
	employeeId: 'employee',
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
	'[...path]': 'health'
};

function resolveRoute(path: string, ids: Record<string, string>): string {
	return path.replace(/\[[^\]]+\]/g, (raw) => {
		const value = PARAMS[raw.slice(1, -1)];
		return value && ids[value] ? ids[value] : (value ?? 'playwright-param');
	});
}

for (const route of apiRoutes) {
	for (const verb of route.verbs.filter((v) => MUTATING.includes(v))) {
		const title = `${verb} ${route.path}`;
		const blocker = emptyBodyBlockers[title];

		test(`${title} with no body answers a 4xx, not a 5xx`, async ({ api, ids }) => {
			const response = await api(resolveRoute(route.path, ids), { method: verb });
			const status = response.status();

			if (blocker) {
				expect(
					status,
					`${title} is pinned to a ${blocker.status} (${blocker.detail}). It answered ${status}: either the handler was fixed — drop the entry from empty-body-blockers.generated.ts — or its behaviour changed`
				).toBe(blocker.status);
				return;
			}

			expect(status, `${title} with no body crashed the handler (${status})`).toBeLessThan(500);
		});
	}
}
