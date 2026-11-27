import { expect, test, type MockControl, type Page } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type MockScenario } from '../../helpers';

/**
 * What Invoices shows a signed-in person, per permission their role holds, pinned in a real Chrome on lane-a
 * (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, `playwright/test-servers.ts:38`) on 2026-11-23. Every
 * URL, string, count and call list below was measured in this file's own runs
 * (`E:\Coding\.tmp\s2-lane-a-invoice-ui-1.log`, `-2.log`; the hand measurements that chose the assertions are
 * `E:\Coding\.tmp\s2-lane-a-invoice-ui-probe-7.log` … `-18.log`), and each test prints a `MEASURE` line with what
 * its page and the mock actually did, so any assertion here can be re-checked against the log.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/lib/utils/invoice-access.ts:19-27` `invoiceAccessOf`: `canView` = `INVOICES_VIEW` **and** a rate-admin
 *   permission (`core/lib/utils/rates.ts:11` `ORG_EMPLOYEES_EDIT` / `CHANGE_SELECTED_EMPLOYEE`, `:258-260`
 *   `holdsRateAdminPermission`); `canCreate` = `canView` and `INVOICES_EDIT` and `CHANGE_SELECTED_EMPLOYEE`;
 *   `canEditInvoices` (`:38-42`) = `canView` and `INVOICES_EDIT`, without `CHANGE_SELECTED_EMPLOYEE`.
 * - `core/hooks/invoices/use-invoice-access.ts:11-16` reads `useMyRolePermissionsQuery`
 *   (`core/hooks/roles/use-my-role-permissions-query.ts:15-48`, whose read is `GET /role-permissions/me` at
 *   `core/services/client/api/roles/role-permission.service.ts:112`) and reports `hasFailed` at `:15` as
 *   "settled without ever holding permissions".
 * - `core/components/pages/invoices/invoice-access-guard.tsx`: `isGranted` (`:43-48`) takes `view` → `canView`,
 *   `create` → `canCreate`; `refusalPathOf` (`:50-57`) sends a create refusal of a role that *can* view to
 *   `/invoices` and every other refusal to `/`; `InvoiceAccessError` (`:59-70`) is what a failed read renders
 *   (its `PageLayout` title `invoices.TITLE` at `:66`, its `DashboardErrorNotice` title `invoices.ACCESS_ERROR_TITLE`
 *   at `:67`); `:93-98` is the render order — error for a failed read, the fallback while loading or refused, the
 *   children only once granted.
 * - Which guard each page asks for: `invoices/page-component.tsx:165` `need="view"`,
 *   `invoices/new/page-component.tsx:207` `need="create"`, `invoices/detail/page-component.tsx:175` `need="view"`,
 *   `invoices/edit/page-component.tsx:185` `need="create"` (its comment `:182`: "Editing rebuilds lines from
 *   everyone's time: it opens for the roles that may create invoices") — so the edit page is gated by `canCreate`,
 *   not by `canEditInvoices`.
 * - `core/components/layouts/app-sidebar.tsx:119-120` asks `useInvoiceAccess` for `canView` alone and `:297-303`
 *   pushes the Invoices entry (`url: '/invoices'`, `title: invoices.TITLE`) only when it is true.
 * - The list's own create entry point: `invoices/invoices-states.tsx:144-151` renders the toolbar's `New invoice`
 *   link (`invoices.NEW_INVOICE`, `href` `NEW_INVOICE_PATH`) only when `canCreate`, and `:212-235`
 *   `InvoicesEmptyState` renders the read-only message (`invoices.EMPTY_MESSAGE_READ_ONLY`, `:216-224`) or the
 *   create one (`invoices.EMPTY_MESSAGE` plus a `New invoice` action, `:226-234`).
 *
 * ## What was measured, per case (the numbers the assertions below are pinned on)
 *
 * - **No extra permission** (`probe-9.log`): `/invoices`, `/invoices/new` and `/invoices/<id>` all end on
 *   `http://localhost:3031/` with the team page's own `Fixture Team A` heading and **no** `a[href="/invoices"]`
 *   anywhere; the mock's log holds **no** invoice call at all — the guard refused before asking for an invoice, and
 *   it asked `GET /api/role-permissions/me` once, 200. Those three visits also logged no console error.
 * - **`INVOICES_VIEW`** (the lane's fixture role already holds `ORG_EMPLOYEES_EDIT`,
 *   `cypress/support/mock-gauzy-server.mjs:50`, which satisfies the rate-admin half): the sidebar shows exactly one
 *   `a[href="/invoices"]` named "Invoices" (`probe-8.log`); clicking it lands on `/invoices` showing
 *   `No invoices yet` + `The invoices of this workspace will be listed here.` and the toolbar count `0 invoices`
 *   (`probe-14.log`), with `GET /api/invoices/pagination` 200 behind it; there is **no** `New invoice` affordance
 *   at all (`probe-14.log` for `INVOICES_VIEW`, `probe-17.log` for `INVOICES_VIEW + INVOICES_EDIT`: both list
 *   nothing but the sidebar/breadcrumb `Invoices` links).
 *   `/invoices/new` ends back on `/invoices` with that same read-only list (`probe-8.log`) — `refusalPathOf` keeping
 *   the list for a role that may view. `/invoices/<id>` stays where it is and shows `The invoice could not be loaded`
 *   + `Check your connection, then try again.` (`probe-18.log`: on screen in 9 of 12 samples, the first three being
 *   the skeleton before the read settled).
 * - **`INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE`**: `/invoices` shows the create message
 *   `Create an invoice from the billable time tracked on a client's projects.` with exactly two `New invoice`
 *   affordances — `a[href="/invoices/new"]` (the toolbar) and a `button` (the empty state's action) — `probe-17.log`,
 *   and the same 2 in both runs of this file (`MEASURE 6` in `-1.log` and `-2.log`);
 *   `/invoices/new` stays there and opens the create screen: heading `New invoice`, the client control
 *   `Choose a client`, `No clients yet` + `Add a client and give it a project, then come back to bill its time.` +
 *   the `Open Clients` link and the grouping switch `By project`, stable across 10 samples, and
 *   `GET /api/invoices/highest` 200 reached the mock (`probe-16.log`).
 * - **`INVOICES_VIEW + INVOICES_EDIT`** (no `CHANGE_SELECTED_EMPLOYEE`): `/invoices/new` → `/invoices`, and
 *   `/invoices/<id>/edit` → `/invoices` too (`probe-17.log`) — the edit page guards on `canCreate`
 *   (`invoices/edit/page-component.tsx:185`), so `canEditInvoices` (`invoice-access.ts:38-42`) is *not* the key to
 *   it; that visit asked the mock for nothing but the permission read, i.e. no read of that invoice id at all.
 * - **`INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE`** on the edit page: `/invoices/<id>/edit` **stays**
 *   open (guard let it in) with the heading `Edit invoice` (`invoices.edit.LOADING_TITLE`) and
 *   `The invoice could not be loaded` (`invoices.edit.LOAD_ERROR_TITLE`, `invoices/edit/saved-invoice-states.tsx:35-36`)
 *   because the mock has no invoice under that id (`probe-17.log`).
 * - **The permission read refused** (`fails: { '/api/role-permissions/me': 500 }`, INVOICES_VIEW armed): `/invoices`
 *   is **not** redirected — sampled every 500 ms for 18 s, the path was `/invoices` in all 30 samples
 *   (`probe-13.log`) — and the sidebar shows no Invoices entry (`canView` never became true). `InvoiceAccessError`
 *   appears **between** re-reads rather than steadily: the mock was asked 29 times in that window, all 500, and the
 *   notice was on screen in 8 of 30 samples while the guard's skeleton filled the rest, because every new read makes
 *   `isLoading` true again and `hasFailed` (`use-invoice-access.ts:15`) false with it (`invoice-access-guard.tsx:93-98`,
 *   with the query layer's one retry at `core/query/config/index.ts:31`). The assertions below therefore wait for
 *   the notice to appear (it always did, within ~2 s) and pin "no redirect" by watching the URL rather than by
 *   asserting a steady page. **Measured, not intended:** those re-reads did not stop within the 18 s watched —
 *   about 1.6 a second against a permission read that is already failing, where the query layer's one retry alone
 *   would stop after two calls. Whether the page should stop asking (and hold the notice still) is a question for the
 *   owner; this file pins only what a person sees, not that rate.
 *
 * ## Mock limits this file runs into (they are not app defects)
 *
 * - The mock has **no invoice handler**: an unmatched `GET` answers `pagination([])` = `{ items: [], total: 0 }`
 *   (`cypress/support/mock-gauzy-server.mjs:9`, `:818`). So the list page really does show its empty state
 *   (`invoices.COUNT` → `0 invoices`), and a made-up `/invoices/<id>` or `/invoices/<id>/edit` gets that pagination
 *   shape where an invoice is expected: the app's own Zod validation rejects it (`[ERROR] [InvoiceService] Invoice
 *   validation failed …` in the console) and the page answers with its load-error message. Nothing here pretends an
 *   invoice exists, and nothing here stubs one: no `page.route` is used beyond the NextAuth session stub
 *   `signInAndVisit` installs.
 * - `GET /api/invoice-schedules` gets the same fallback, which the schedule service logs as a validation failure on
 *   every list visit — noise from the mock, so `shield.consoleErrors()` is asserted empty only on the three
 *   no-permission visits (measured empty) and reported, not asserted, everywhere else.
 * - Every case that arms permissions depends on the mock **process** running the current
 *   `cypress/support/mock-gauzy-server.mjs`: a mock started before `scenario.extraPermissions` landed stores it in
 *   its `/state` and still answers `/api/role-permissions/me` with the five base permissions (measured this morning
 *   on a lane-a mock started at 03:38, i.e. before that arm existed). If a case here suddenly sees no Invoices entry
 *   everywhere, restart the lane (`playwright/scripts/lane-servers.mjs down|up <lane>`) before believing the app.
 */

const INVOICES_PATH = '/invoices';
const NEW_INVOICE_PATH = '/invoices/new';

/** An id the lane mock holds no invoice under; it answers it with its `{ items: [], total: 0 }` fallback. */
const NO_SUCH_INVOICE_ID = '6f6f6f6f-6f6f-4f6f-8f6f-6f6f6f6f6f6f';
const NO_SUCH_INVOICE_PATH = `${INVOICES_PATH}/${NO_SUCH_INVOICE_ID}`;
const NO_SUCH_INVOICE_EDIT_PATH = `${NO_SUCH_INVOICE_PATH}/edit`;

const ROLE_READ_PATH = '/api/role-permissions/me';

/** The arms. `extraPermissions` adds to the fixture role's five (`mock-gauzy-server.mjs:50-62`). */
const NO_EXTRA: MockScenario = {};
const VIEW_ONLY: MockScenario = { extraPermissions: ['INVOICES_VIEW'] };
const VIEW_AND_EDIT: MockScenario = { extraPermissions: ['INVOICES_VIEW', 'INVOICES_EDIT'] };
const FULL_SET: MockScenario = {
	extraPermissions: ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE']
};
const ROLE_READ_REFUSED: MockScenario = { ...VIEW_ONLY, fails: { [ROLE_READ_PATH]: 500 } };

/** `locales/en.json`, the keys each string below was taken from. */
const INVOICES_TITLE = 'Invoices'; // invoices.TITLE
const INVOICES_COUNT_ZERO = '0 invoices'; // invoices.COUNT, total 0
const NEW_INVOICE_LABEL = 'New invoice'; // invoices.NEW_INVOICE and invoices.new.TITLE
const EMPTY_TITLE = 'No invoices yet'; // invoices.EMPTY_TITLE
const EMPTY_MESSAGE_READ_ONLY = 'The invoices of this workspace will be listed here.'; // invoices.EMPTY_MESSAGE_READ_ONLY
const EMPTY_MESSAGE_CREATE = "Create an invoice from the billable time tracked on a client's projects."; // invoices.EMPTY_MESSAGE
const ACCESS_ERROR_TITLE = 'Your access to invoices could not be checked'; // invoices.ACCESS_ERROR_TITLE
const NO_CLIENTS_TITLE = 'No clients yet'; // invoices.new.NO_CLIENTS_TITLE
const NO_CLIENTS_MESSAGE = 'Add a client and give it a project, then come back to bill its time.'; // invoices.new.NO_CLIENTS_MESSAGE
const OPEN_CLIENTS = 'Open Clients'; // invoices.new.OPEN_CLIENTS
const CLIENT_PLACEHOLDER = 'Choose a client'; // invoices.new.CLIENT_PLACEHOLDER
const GROUP_BY_PROJECT = 'By project'; // invoices.new.byProject.GROUP_BY_PROJECT
const EDIT_LOADING_TITLE = 'Edit invoice'; // invoices.edit.LOADING_TITLE
const LOAD_ERROR_TITLE = 'The invoice could not be loaded'; // invoices.detail.ERROR_TITLE and invoices.edit.LOAD_ERROR_TITLE

const invoicesLinks = (page: Page) => page.locator(`a[href="${INVOICES_PATH}"]`);
const createInvoiceLink = (page: Page) => page.locator(`a[href="${NEW_INVOICE_PATH}"]`);
const createInvoiceButton = (page: Page) => page.getByRole('button', { name: NEW_INVOICE_LABEL, exact: true });
const sidebarInvoicesLink = (page: Page) => page.getByRole('link', { name: INVOICES_TITLE });
const text = (page: Page, value: string) => page.getByText(value, { exact: true });

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a invoice-access] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own log of every invoice call this page caused, as `method path status` triples. */
const invoiceCalls = async (mock: MockControl) =>
	(await mock.calls('/api/invoices/')).map((call) => [call.method, call.path, call.status]);

/**
 * The URLs the page held during `windowMs`, sampled: this is how "it did not redirect" is measured here, because a
 * refusal is applied by a client-side `router.replace` (`invoice-access-guard.tsx:87-91`) after the permission read
 * settles, and a single `toHaveURL` would only prove the page was somewhere at one instant.
 */
async function urlPathsWhileWatching(page: Page, windowMs: number): Promise<string[]> {
	const paths: string[] = [];
	const until = Date.now() + windowMs;
	while (Date.now() < until) {
		paths.push(new URL(page.url()).pathname);
		await page.waitForTimeout(250);
	}
	return paths;
}

const bodyText = async (page: Page): Promise<string> => {
	const shown = await page
		.locator('body')
		.innerText()
		.catch(() => '<unreadable>');
	return shown.replace(/\s+/g, ' ').trim().slice(0, 400);
};

test.describe('lane-a · what Invoices shows a role with and without the invoice permissions', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ----------------------------------------------------- 1. a role with no invoice permission at all

	test('1 · no invoice permission: /invoices sends the person to / and nothing of an invoice was asked for', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, INVOICES_PATH, { scenario: NO_EXTRA });

		await expect(page, 'the invoices page kept a role that may not read invoices').toHaveURL(`${APP_ORIGIN}/`, {
			timeout: 30_000
		});
		await expect(
			invoicesLinks(page),
			'the sidebar still offers Invoices to a role that cannot read them'
		).toHaveCount(0);
		expect(await invoiceCalls(mock), 'an invoice read was sent for a role the guard refuses').toEqual([]);
		expect(shield.consoleErrors(), 'refusing the page logged an app error').toEqual([]);

		report('1 no permission /invoices', {
			url: page.url(),
			roleReads: (await mock.calls(ROLE_READ_PATH)).map((call) => [call.method, call.status]),
			body: await bodyText(page)
		});
	});

	test('2 · no invoice permission: the create page and a made-up invoice page also land on /', async ({
		page,
		fixture,
		mock
	}) => {
		for (const path of [NEW_INVOICE_PATH, NO_SUCH_INVOICE_PATH]) {
			await signInAndVisit(page, fixture, path, { scenario: NO_EXTRA });
			await expect(page, `${path} left a role that may not read invoices somewhere inside Invoices`).toHaveURL(
				`${APP_ORIGIN}/`,
				{ timeout: 30_000 }
			);
			expect(await invoiceCalls(mock), `${path} read an invoice before the guard refused the role`).toEqual([]);
			report(`2 no permission ${path}`, { url: page.url() });
		}
	});

	// ----------------------------------------------------- 3. INVOICES_VIEW: the list, and no creating

	test('3 · INVOICES_VIEW: the sidebar entry is there and its click opens the list, read-only', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: VIEW_ONLY });

		await expect(invoicesLinks(page), 'a role that reads invoices sees no Invoices entry').toHaveCount(1);
		await sidebarInvoicesLink(page).first().click();
		await expect(page, 'the sidebar entry does not lead to the invoice list').toHaveURL(
			`${APP_ORIGIN}${INVOICES_PATH}`,
			{ timeout: 30_000 }
		);

		await expect(text(page, EMPTY_TITLE), 'the list of an empty workspace shows no empty state').toBeVisible({
			timeout: 20_000
		});
		await expect(
			text(page, EMPTY_MESSAGE_READ_ONLY),
			'the list offers a role that cannot create a way to create'
		).toBeVisible();
		await expect(
			text(page, INVOICES_COUNT_ZERO),
			'the list counts its invoices wrong for 0 invoices'
		).toBeVisible();
		await expect(
			createInvoiceLink(page),
			'the toolbar offers New invoice to a role without INVOICES_EDIT'
		).toHaveCount(0);
		await expect(
			createInvoiceButton(page),
			'the empty state offers New invoice to a role without canCreate'
		).toHaveCount(0);
		expect(
			(await mock.calls('/api/invoices/pagination')).length,
			'the list never read its invoices, so its empty state proves nothing'
		).toBeGreaterThan(0);

		report('3 INVOICES_VIEW sidebar click → list', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	test('4 · INVOICES_VIEW: /invoices/new is refused back to the list the role may still read', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, NEW_INVOICE_PATH, { scenario: VIEW_ONLY });

		// `refusalPathOf` (`invoice-access-guard.tsx:50-57`) keeps the list for a create refusal of a viewing role.
		await expect(page, 'a create refusal of a role that may view left Invoices altogether').toHaveURL(
			`${APP_ORIGIN}${INVOICES_PATH}`,
			{ timeout: 30_000 }
		);
		await expect(
			text(page, EMPTY_MESSAGE_READ_ONLY),
			'the person was sent somewhere that is not the invoice list'
		).toBeVisible({ timeout: 20_000 });
		// The list behind the refusal reads its own invoices; the create screen never got that far.
		expect(
			await mock.calls('/api/invoices/highest'),
			'the create screen read the next invoice number before the guard refused the role'
		).toEqual([]);
		expect(
			(await mock.calls('/api/invoices/pagination')).length,
			'the refusal did not land on the invoice list the role may still read'
		).toBeGreaterThan(0);

		report('4 INVOICES_VIEW /invoices/new refusal', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	test('5 · INVOICES_VIEW: an invoice the mock does not hold shows its own load-error message', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, NO_SUCH_INVOICE_PATH, { scenario: VIEW_ONLY });

		await expect(text(page, LOAD_ERROR_TITLE), 'a missing invoice page shows no message about it').toBeVisible({
			timeout: 25_000
		});
		await expect(page, 'the invoice page of an unknown id sent the person away').toHaveURL(
			`${APP_ORIGIN}${NO_SUCH_INVOICE_PATH}`
		);
		// Mock limit, measured: the read landed and answered the pagination fallback, which the app's own
		// `invoiceSchema` validation rejects (`mock-gauzy-server.mjs:818`) — that is why the page says "could not be
		// loaded" rather than "not in the workspace".
		const reads = await mock.calls(`/api/invoices/${NO_SUCH_INVOICE_ID}`);
		expect(reads.length, 'the invoice read never reached the mock').toBeGreaterThan(0);
		expect(
			reads.map((call) => [call.method, call.status]),
			'the invoice read was not the GET the page sent, answered 200 by the mock fallback'
		).toEqual(reads.map(() => ['GET', 200]));
		expect(
			shield.logMatching(/Invoice validation failed/).length,
			'the load-error message was not caused by the mock answering a list where an invoice was expected'
		).toBeGreaterThan(0);

		report('5 INVOICES_VIEW a made-up invoice id', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	// ----------------------------------------------------- 6. the full create set

	test('6 · the full set: the list offers its create entry point twice, and says what it is for', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, INVOICES_PATH, { scenario: FULL_SET });

		await expect(
			text(page, EMPTY_TITLE),
			'the empty list of a role that may create shows no empty state'
		).toBeVisible({
			timeout: 20_000
		});
		await expect(
			text(page, EMPTY_MESSAGE_CREATE),
			'the empty state says something other than how to create one'
		).toBeVisible();
		await expect(
			createInvoiceLink(page),
			'the toolbar offers no New invoice to a role that may create'
		).toBeVisible();
		await expect(createInvoiceButton(page), 'the empty state offers no New invoice action').toBeVisible();
		await expect(
			text(page, NEW_INVOICE_LABEL),
			'a different New invoice affordance appeared than the two measured'
		).toHaveCount(2);

		report('6 full set /invoices', {
			url: page.url(),
			newInvoiceAffordances: await text(page, NEW_INVOICE_LABEL).count(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	test('7 · the full set: /invoices/new opens the create screen and reads the next invoice number', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, NEW_INVOICE_PATH, { scenario: FULL_SET });

		await expect(page, 'the create page refused a role that may create invoices').toHaveURL(
			`${APP_ORIGIN}${NEW_INVOICE_PATH}`,
			{ timeout: 30_000 }
		);
		// The heading alone would prove nothing: `NewInvoicePageSkeleton` renders the very same `invoices.new.TITLE`
		// in its toolbar (`invoices/new/new-invoice-states.tsx:53-66`), so what is pinned is the screen behind it —
		// the client control, the client-less message and the grouping switch, all measured stable (`probe-16.log`).
		await expect(text(page, CLIENT_PLACEHOLDER), 'the create screen opened without its client control').toBeVisible(
			{
				timeout: 20_000
			}
		);
		await expect(
			text(page, GROUP_BY_PROJECT),
			'the create screen opened without its grouping switch'
		).toBeVisible();
		await expect(
			text(page, NO_CLIENTS_TITLE),
			'the create screen says nothing about the workspace having no client'
		).toBeVisible();
		await expect(
			text(page, NO_CLIENTS_MESSAGE),
			'the client-less message does not say what to do first'
		).toBeVisible();
		await expect(
			text(page, OPEN_CLIENTS),
			'the client-less message offers no way to the clients page'
		).toBeVisible();
		expect(
			await mock.calls('/api/invoices/highest'),
			'the create screen never asked for the next free invoice number'
		).not.toEqual([]);

		report('7 full set /invoices/new', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock),
			body: await bodyText(page)
		});
	});

	// ----------------------------------------------------- 8. canEdit without canCreate

	test('8 · INVOICES_VIEW + INVOICES_EDIT: the create page and the edit page both go back to the list', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, NEW_INVOICE_PATH, { scenario: VIEW_AND_EDIT });
		await expect(page, 'the create page opened for a role without CHANGE_SELECTED_EMPLOYEE').toHaveURL(
			`${APP_ORIGIN}${INVOICES_PATH}`,
			{ timeout: 30_000 }
		);
		await expect(createInvoiceLink(page), 'the list offered New invoice to a role that may not create').toHaveCount(
			0
		);

		await signInAndVisit(page, fixture, NO_SUCH_INVOICE_EDIT_PATH, { scenario: VIEW_AND_EDIT });
		// `invoices/edit/page-component.tsx:185` guards the edit page with `need="create"`, and `canEditInvoices`
		// (`invoice-access.ts:38-42`) is true here: INVOICES_EDIT alone does not open the editor.
		await expect(page, 'the edit page opened for a role that may edit but not create').toHaveURL(
			`${APP_ORIGIN}${INVOICES_PATH}`,
			{ timeout: 30_000 }
		);
		expect(
			await mock.calls(`/api/invoices/${NO_SUCH_INVOICE_ID}`),
			'the edit page read that invoice before the guard refused the role'
		).toEqual([]);

		report('8 INVOICES_VIEW + INVOICES_EDIT', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	test('9 · the full set: /invoices/<id>/edit opens, and shows that the mock has no such invoice', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, NO_SUCH_INVOICE_EDIT_PATH, { scenario: FULL_SET });

		await expect(page, 'the edit page refused a role that may create invoices').toHaveURL(
			`${APP_ORIGIN}${NO_SUCH_INVOICE_EDIT_PATH}`,
			{ timeout: 30_000 }
		);
		await expect(
			page.getByRole('heading', { name: EDIT_LOADING_TITLE }),
			'the edit page opened without its loading heading'
		).toBeVisible({ timeout: 20_000 });
		await expect(
			text(page, LOAD_ERROR_TITLE),
			'the editor of a missing invoice shows no message about it'
		).toBeVisible();
		expect(
			(await mock.calls(`/api/invoices/${NO_SUCH_INVOICE_ID}`)).length,
			'the editor never read the invoice it opened on'
		).toBeGreaterThan(0);

		report('9 full set /invoices/<id>/edit', {
			url: page.url(),
			invoiceCalls: await invoiceCalls(mock)
		});
	});

	// ----------------------------------------------------- 10. the permission read itself refused

	test('10 · the permission read refused: /invoices says access could not be checked and stays where it is', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, INVOICES_PATH, { scenario: ROLE_READ_REFUSED });

		await expect(
			text(page, ACCESS_ERROR_TITLE),
			'a failed permission read showed no explanation of it'
		).toBeVisible({
			timeout: 25_000
		});
		const paths = await urlPathsWhileWatching(page, 3_000);
		expect(
			[...new Set(paths)],
			'a page that cannot check its access sent the person elsewhere instead of saying so'
		).toEqual([INVOICES_PATH]);
		await expect(
			invoicesLinks(page),
			'the sidebar offered Invoices while the permission read was failing'
		).toHaveCount(0);
		expect(
			await invoiceCalls(mock),
			'an invoice read was sent although the permission read never answered'
		).toEqual([]);

		const roleReads = await mock.calls(ROLE_READ_PATH);
		expect(roleReads.length, 'the page never asked for the permissions it is gated on').toBeGreaterThan(0);
		expect(
			roleReads.map((call) => call.status),
			'the permission read the page was refused came back with something other than 500'
		).toEqual(roleReads.map(() => 500));

		// `noticeNow` is one instant of the flicker described in the header: the notice and the guard's skeleton
		// alternate while the refused read keeps being retried, so it is reported, not asserted.
		report('10 refused permission read', {
			url: page.url(),
			pathsWhileWatching: paths,
			roleReadCount: roleReads.length,
			noticeNow: await text(page, ACCESS_ERROR_TITLE).count()
		});
	});
});
