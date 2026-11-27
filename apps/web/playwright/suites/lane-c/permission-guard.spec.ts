import { expect, test } from '../../api-fixtures';

/**
 * A route that answers only for a role with a certain permission must refuse the fixture person, and it
 * must refuse *by reading the permissions and then refusing itself* — not by forwarding the action and
 * letting Gauzy say no.
 *
 * `core/services/server/refuse-without-permission.ts` does that in two steps: `refuseForeignWrite` (the
 * cross-site guard the foreign-origin suite pins) and then `forwardToGauzy(request, '/role-permissions/me')`,
 * whose rows are compared with what the route needs. So the mock's request log distinguishes three cases
 * that all look like a refusal in the browser:
 *
 *   no log at all            → no session: the permission read itself was refused before any call;
 *   exactly one read, then a 403 → the permission guard ran and refused the action here;
 *   a call to the guarded endpoint → the guard let the action through, which is what this suite is looking for.
 *
 * The fixture role holds TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT and
 * ORG_EMPLOYEES_EDIT (mock-gauzy-server.mjs `buildData`); every permission named below is outside that
 * list, so every case here is a refusal. That also means this file cannot show the guard *letting*
 * somebody through — the mock answers the same five permissions whatever the scenario says, which is a
 * limit of the harness, recorded in PLAN.md.
 *
 * The table covers every verb of every guarded handler, not one verb per file. It was built from
 * `grep -rl "refuseWithoutPermission\|refuseUnlessPermitted" app/api --include=route.ts` (20 route files) and the
 * exported verbs of each (`grep -oE "^export (async function|const) (GET|POST|PUT|PATCH|DELETE)"`), which come to 24
 * verb+path pairs: `/api/invoices/[id]` is three of them (GET, PUT, DELETE asking three different things) and
 * `/api/invoice-schedules/[id]` two (PUT and DELETE, one shared gate).
 */

/**
 * One row per guarded route. `path` and `guardedEndpoint` are both functions of the ids the `ids` fixture
 * hands the test: neither may be spelled out at module scope, where no fixture has been read yet (that is
 * what made this table throw `ReferenceError: ids is not defined` while the file was being loaded).
 *
 * `pattern` is the route as it is written on disk, with its dynamic segments in brackets. It is the stable
 * name of the row: the test titles and the summary test below both select rows by it, so a probe that no
 * longer exists fails as a missing row instead of `undefined`.
 */
type Guarded = {
	verb: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** The route on disk, e.g. `/api/organization/[id]/soft`. */
	pattern: string;
	/** The app route, with dynamic segments filled with fixture ids. */
	path: (ids: Record<string, string>) => string;
	/** What the route asks for, from `core/lib/utils/*`. */
	asks: string;
	/** The upstream endpoint the route would have called, had the guard let it through. */
	guardedEndpoint: (ids: Record<string, string>) => string;
};

const GUARDED: Guarded[] = [
	{
		verb: 'GET',
		pattern: '/api/export',
		path: () => '/api/export',
		asks: 'EXPORT_ADD (workspace-data-export.ts, stricter than Gauzy’s ALL_ORG_VIEW)',
		guardedEndpoint: () => '/api/export'
	},
	{
		verb: 'GET',
		pattern: '/api/organization/[id]/counts',
		path: (ids) => `/api/organization/${ids.organizationA}/counts`,
		asks: 'ALL_ORG_EDIT (organization-deletion.ts)',
		guardedEndpoint: (ids) => `/api/organization/${ids.organizationA}/counts`
	},
	{
		verb: 'DELETE',
		pattern: '/api/organization/[id]/soft',
		path: (ids) => `/api/organization/${ids.organizationA}/soft`,
		asks: 'ALL_ORG_EDIT (organization-deletion.ts)',
		guardedEndpoint: (ids) => `/api/organization/${ids.organizationA}/soft`
	},
	{
		verb: 'GET',
		pattern: '/api/invoices/pagination',
		path: () => '/api/invoices/pagination',
		asks: 'INVOICES_VIEW + the client-rate read (invoice-access.ts)',
		guardedEndpoint: () => '/api/invoices/pagination'
	},
	{
		verb: 'GET',
		pattern: '/api/invoices/highest',
		path: () => '/api/invoices/highest',
		asks: 'INVOICES_VIEW + the client-rate read (invoice-access.ts)',
		guardedEndpoint: () => '/api/invoices/highest'
	},
	{
		verb: 'GET',
		pattern: '/api/invoices/[id]',
		path: (ids) => `/api/invoices/${ids.task}`,
		asks: 'INVOICES_VIEW + the client-rate read (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoices/${ids.task}`
	},
	{
		verb: 'GET',
		pattern: '/api/invoices/download/[id]',
		path: (ids) => `/api/invoices/download/${ids.task}`,
		asks: 'INVOICES_VIEW + the client-rate read (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoices/download/${ids.task}`
	},
	{
		verb: 'POST',
		pattern: '/api/invoices',
		path: () => '/api/invoices',
		asks: 'INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE (invoice-access.ts canCreateInvoices)',
		guardedEndpoint: () => '/api/invoices'
	},
	{
		verb: 'PUT',
		pattern: '/api/invoices/[id] (PUT)',
		path: (ids) => `/api/invoices/${ids.task}`,
		asks: 'INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE (canCreateInvoices)',
		guardedEndpoint: (ids) => `/api/invoices/${ids.task}`
	},
	{
		verb: 'DELETE',
		pattern: '/api/invoices/[id] (DELETE)',
		path: (ids) => `/api/invoices/${ids.task}`,
		asks: 'canEditInvoices (invoice-access.ts — deleting a draft reads no time)',
		guardedEndpoint: (ids) => `/api/invoices/${ids.task}`
	},
	{
		verb: 'PUT',
		pattern: '/api/invoices/[id]/action',
		path: (ids) => `/api/invoices/${ids.task}/action`,
		asks: 'canEditInvoices (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoices/${ids.task}/action`
	},
	{
		verb: 'PUT',
		pattern: '/api/invoices/[id]/with-items',
		path: (ids) => `/api/invoices/${ids.task}/with-items`,
		asks: 'canCreateInvoices (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoices/${ids.task}/with-items`
	},
	{
		verb: 'PUT',
		pattern: '/api/invoices/email/[email]',
		path: () => `/api/invoices/email/manager@example.test`,
		asks: 'canEditInvoices (invoice-access.ts)',
		guardedEndpoint: () => '/api/invoices/email/manager@example.test'
	},
	{
		verb: 'POST',
		pattern: '/api/invoice-item/bulk/[invoiceId]',
		path: (ids) => `/api/invoice-item/bulk/${ids.task}`,
		asks: 'canCreateInvoices (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoice-item/bulk/${ids.task}`
	},
	{
		verb: 'GET',
		pattern: '/api/invoice-schedules',
		path: () => '/api/invoice-schedules',
		asks: 'canViewInvoices (invoice-access.ts)',
		guardedEndpoint: () => '/api/invoice-schedules'
	},
	{
		verb: 'POST',
		pattern: '/api/invoice-schedules (POST)',
		path: () => '/api/invoice-schedules',
		asks: 'canCreateInvoices (invoice-access.ts)',
		guardedEndpoint: () => '/api/invoice-schedules'
	},
	{
		verb: 'GET',
		pattern: '/api/invoice-schedules/[id]/runs',
		path: (ids) => `/api/invoice-schedules/${ids.task}/runs`,
		asks: 'canViewInvoices (invoice-access.ts)',
		guardedEndpoint: (ids) => `/api/invoice-schedules/${ids.task}/runs`
	},
	{
		verb: 'PUT',
		pattern: '/api/invoice-schedules/[id]',
		path: (ids) => `/api/invoice-schedules/${ids.task}`,
		asks: 'canCreateInvoices (forwardScheduleChange, the same gate for PUT and DELETE)',
		guardedEndpoint: (ids) => `/api/invoice-schedules/${ids.task}`
	},
	{
		verb: 'DELETE',
		pattern: '/api/invoice-schedules/[id] (DELETE)',
		path: (ids) => `/api/invoice-schedules/${ids.task}`,
		asks: 'canCreateInvoices (forwardScheduleChange)',
		guardedEndpoint: (ids) => `/api/invoice-schedules/${ids.task}`
	},
	{
		verb: 'POST',
		pattern: '/api/organization-contact',
		path: () => '/api/organization-contact',
		asks: 'ORG_CONTACT_ADD / ORG_CONTACT_EDIT (clients.ts CLIENT_CREATE_PERMISSIONS)',
		guardedEndpoint: () => '/api/organization-contact'
	},
	{
		verb: 'PUT',
		pattern: '/api/organization-contact/[id]',
		path: (ids) => `/api/organization-contact/${ids.teammateEmployee}`,
		asks: 'ORG_CONTACT_EDIT (clients.ts CLIENT_EDIT_PERMISSIONS)',
		guardedEndpoint: (ids) => `/api/organization-contact/${ids.teammateEmployee}`
	},
	{
		verb: 'PUT',
		pattern: '/api/organization-contact/[id]/recover',
		path: (ids) => `/api/organization-contact/${ids.teammateEmployee}/recover`,
		asks: 'ORG_CONTACT_DELETE / ORG_CONTACT_EDIT (CLIENT_ARCHIVE_PERMISSIONS)',
		guardedEndpoint: (ids) => `/api/organization-contact/${ids.teammateEmployee}/recover`
	},
	{
		verb: 'DELETE',
		pattern: '/api/organization-contact/[id]/soft',
		path: (ids) => `/api/organization-contact/${ids.teammateEmployee}/soft`,
		asks: 'ORG_CONTACT_DELETE / ORG_CONTACT_EDIT (CLIENT_ARCHIVE_PERMISSIONS)',
		guardedEndpoint: (ids) => `/api/organization-contact/${ids.teammateEmployee}/soft`
	},
	{
		verb: 'PUT',
		pattern: '/api/timer/started-at',
		path: () => `/api/timer/started-at`,
		asks: 'TIME_TRACKER *and* ALLOW_MODIFY_TIME (timer/timer-start-move.ts holdsTimerStartMovePermissions)',
		guardedEndpoint: () => '/api/timesheet/timer/started-at'
	}
];

async function permissionReads(mock: {
	requests: () => Promise<Array<{ method: string; path: string; status: number }>>;
}) {
	return (await mock.requests())
		.filter((request) => request.path === '/api/role-permissions/me')
		.map((request) => `${request.method} ${request.path} ${request.status}`);
}

test.describe('a permission-guarded route refuses the fixture role itself', () => {
	for (const route of GUARDED) {
		test(`${route.verb} ${route.pattern} — ${route.asks}`, async ({ api, ids, mock }) => {
			const path = route.path(ids);
			const why = `${route.verb} ${path} (asks ${route.asks})`;

			// 1. Nobody signed in: even the permission read is refused before it is made.
			const anonymous = await api(path, {
				method: route.verb,
				body: route.verb === 'GET' ? undefined : {},
				anonymous: true
			});
			const anonymousText = await anonymous.text();
			expect(
				anonymous.status(),
				`${why}: a signed-out caller answered ${anonymous.status()} ${anonymousText}`
			).toBe(401);
			expect(await mock.requests(), `${why}: the API was asked something for a caller with no session`).toEqual(
				[]
			);

			// 2. Signed in, role without the permission: refused here, after exactly one permission read.
			const signedIn = await api(path, { method: route.verb, body: route.verb === 'GET' ? undefined : {} });
			const body = await signedIn.text();
			expect(signedIn.status(), `${why}: the fixture role was allowed through (${body})`).toBe(403);

			let answer: Record<string, unknown> = {};
			try {
				answer = JSON.parse(body) as Record<string, unknown>;
			} catch {
				// Left empty; the next message quotes what actually came back.
			}
			expect(answer.message, `${why}: the 403 did not name the resource refusal (${body})`).toBe(
				'Forbidden resource'
			);

			expect(await permissionReads(mock), `${why}: the guard did not read the role's permissions first`).toEqual([
				'GET /api/role-permissions/me 200'
			]);

			const forwarded = (await mock.requests()).filter((request) => request.path !== '/api/role-permissions/me');
			expect(
				forwarded.map((request) => `${request.method} ${request.path} ${request.status}`),
				`${why}: the guarded endpoint ${route.guardedEndpoint(ids)} was asked even though the route refused`
			).toEqual([]);
		});
	}

	test('the permission read itself is the only thing these routes ask', async ({ api, ids, mock }) => {
		// The same refusal over the whole family, asserted on one mock log: five guarded routes, one
		// permission read each, and no call to any guarded endpoint. A route that read the permissions and
		// then acted anyway would show up here as an extra path.
		const wanted = [
			'GET /api/export',
			'GET /api/invoices/pagination',
			'GET /api/invoices/highest',
			'POST /api/organization-contact',
			'PUT /api/timer/started-at'
		];
		const probes = wanted.map((key) => GUARDED.find((route) => `${route.verb} ${route.pattern}` === key));
		// A probe that no longer matches a row would otherwise be `route.path(undefined)` in the loop below.
		expect(
			probes.map((route, index) => (route ? null : wanted[index])).filter((missing) => missing !== null),
			'this test names rows of the GUARDED table that the table no longer holds'
		).toEqual([]);

		const rows = probes.filter((route): route is Guarded => Boolean(route));
		for (const route of rows) {
			const response = await api(route.path(ids), {
				method: route.verb,
				body: route.verb === 'GET' ? undefined : {}
			});
			expect(
				response.status(),
				`${route.verb} ${route.path(ids)}: answered ${response.status()} ${await response.text()}`
			).toBe(403);
		}

		const requests = await mock.requests();
		expect(
			requests.filter((request) => request.path === '/api/role-permissions/me').length,
			`each refused route should have read the permissions once: ${JSON.stringify(requests.map((r) => `${r.method} ${r.path}`))}`
		).toBe(rows.length);
		expect(
			requests.filter((request) => request.path !== '/api/role-permissions/me').map((request) => request.path),
			'a guarded endpoint was reached after a 403'
		).toEqual([]);
	});

	test('a signed-out caller is not told anything about the permission it lacked', async ({ api, ids }) => {
		// 401 before 403: the anonymous answer must not leak which permission the route asks for, which is
		// what a probe of the danger-zone routes would want to learn.
		const response = await api(`/api/organization/${ids.organizationA}/soft`, {
			method: 'DELETE',
			anonymous: true
		});
		const text = await response.text();

		expect(response.status(), `the organization delete answered ${response.status()} ${text}`).toBe(401);
		expect(text, `the signed-out refusal names a permission: ${text}`).not.toContain('ALL_ORG_EDIT');
		expect(text, `the signed-out refusal is a resource refusal, not an authentication one: ${text}`).not.toContain(
			'Forbidden resource'
		);
	});
});
