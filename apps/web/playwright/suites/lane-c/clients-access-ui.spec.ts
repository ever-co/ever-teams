import { expect, test, type Page } from '../../fixtures';
import type { Locator } from '@playwright/test';

import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person can do on `/clients` and `/clients/<id>` with each permission the clients ask for, pinned in
 * a real Chrome on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, `playwright/test-servers.ts:40`)
 * on 2026-11-23 in this file's own runs `E:\Coding\.tmp\s2-lane-c-clients-ui-1.log` and `-2.log`. Every count, name,
 * string and href below is one those runs printed on its `MEASURE` line, so an assertion can be re-checked against the
 * log instead of against a reading of the source.
 *
 * ## The access checks these pages run (each line read out of its file before it is named)
 *
 * - `core/lib/utils/clients.ts:7-11`: `CLIENT_CREATE_PERMISSIONS = ['ORG_CONTACT_ADD','ORG_CONTACT_EDIT']`,
 *   `CLIENT_EDIT_PERMISSIONS = ['ORG_CONTACT_EDIT']`, `CLIENT_ARCHIVE_PERMISSIONS = ['ORG_CONTACT_DELETE',
 *   'ORG_CONTACT_EDIT']`, and the read asks `CLIENT_VIEW_PERMISSIONS = ['ORG_CONTACT_VIEW']`. Each write list is an
 *   "any of" (`holdsAnyPermission`, `:41-43`), so `clientAccessOf` (`:45-51`) gives ADD alone the create button,
 *   DELETE alone only the archive, and EDIT alone all three — which cases B1–B3 and D1–D3 pin one permission at a time.
 * - `core/hooks/clients/use-client-access.ts:11-13` hands that verdict to the page and `use-client-view-access.ts:7-10`
 *   the read verdict, both from `myPermissions`, which is the role's enabled permission names
 *   (`core/hooks/roles/use-my-role-permissions-query.ts:36-39`) read once from `GET /api/role-permissions/me`
 *   (`mock-gauzy-server.mjs:618`), where `scenario.extraPermissions` (`:51-63`) adds to the fixture role's five
 *   (`TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT, ORG_EMPLOYEES_EDIT` — no ORG_CONTACT_* among them).
 * - `core/components/pages/clients/page-component.tsx`: `isRefused = viewAccess.isKnown && !viewAccess.canView` (`:67`)
 *   decides only the **body** (`:114`); the toolbar is mounted as the header slot whatever that says (`:102-112`), and
 *   the toolbar shows its create button on `canCreate` alone (`clients-toolbar.tsx:142-147`). A role that may write but
 *   not read therefore stands on a page saying "Clients are not shared with your role" with a live `New client` button
 *   on it — measured in B1/B2, and not a contradiction: the API accepts those writes (`clients.ts:7,9`), and each half
 *   does what its own check says.
 * - `:69-73` then picks one of the four body states: a failed **first** read (`showsError`), a settled list
 *   (`showsList`), a settled nothing (`showsEmpty`), and their copy is in `clients-list-states.tsx` — the read-only
 *   empty copy at `:115-124`, the create-offering one at `:125-134`, `ClientsErrorState` at `:137-149` and
 *   `ClientsNoAccessState` at `:152-162`.
 * - A row's actions: `core/components/clients/client-actions-menu.tsx:64-82`. `mayEdit` is `canEdit` and not archived,
 *   `mayArchive` is `canArchive` and not archived, `mayRestore` is `canArchive` and archived, and `:79-82` renders
 *   **nothing at all** when no row survives — which is why D1 finds no action control whatsoever. The rows a list menu
 *   asks for are `['newInvoice','edit','archive']` (`:24`); a client page's header asks for `['copyLink','archive']`
 *   (`client-header.tsx:30`), and `showsCopyLink` comes from `rows` alone (`client-actions-menu.tsx:68`), so the header
 *   menu is never empty: even F1, which may change nothing, gets a `Copy link` row.
 * - `clients-list.tsx:192-205`: the row's `Add contact details for <name>` button is there only with `canEdit` on a
 *   client that has no email and no phone yet (`ContactCell`, `canEdit` handed in at `:281`).
 * - Invoices, which the clients pages read for their own entry points: `core/lib/utils/invoice-access.ts:19-27` —
 *   `canView` needs `INVOICES_VIEW` and a rate-admin permission, `canCreate` adds `INVOICES_EDIT` and
 *   `CHANGE_SELECTED_EMPLOYEE`; `core/lib/utils/rates.ts:11` counts the fixture role's own `ORG_EMPLOYEES_EDIT` as the
 *   rate-admin one, so on this lane `INVOICES_VIEW` alone opens the invoice views and the three-name set
 *   `INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE` is what opens the new-invoice links and the schedule
 *   controls. `newInvoicePathOf` (`invoice-access-guard.tsx:19-22`) is `/invoices/new?client=<id>`; the pages reach it
 *   through `client-actions-menu.tsx:113`, `clients-cards.tsx:117,181` and `client-header.tsx:116`. No test here opens
 *   `/invoices`: the entry point is read, never followed.
 * - The detail page reads the client through the **same list read** (`detail/page-component.tsx:90`, then `:92` finds it
 *   in what came back) — there is no second, one-client call to stub. It refuses the body the same permission way
 *   (`:106`, `:117-119`), shows `clients.detail.NOT_FOUND_*` when the read settled without that client (`:130-141`), and
 *   hands `access` / `canViewInvoices` / `canManageSchedule = invoiceAccess.canCreate` down
 *   (`:111-113`, `:71-73`), which `detail/client-detail-body.tsx:43,56,57,63,69` and `client-facts.tsx:180,193-198`
 *   apply to the rail's three pencils and the schedule section (`client-billing-schedule-section.tsx:251-254`).
 *
 * ## The stubs, and why they are needed
 *
 * - `GET /api/organization-contact/pagination?…` (`core/services/client/api/organizations/organization-contact.service.ts:70`,
 *   validated against `clientSchema` in the `{ items, total }` envelope at `:74-78`, `core/types/schemas/utils/validation.ts:79-90`,
 *   `core/types/schemas/organization/organization-contact.schema.ts:7-23`) has **no handler** in the lane mock: an
 *   unmatched path answers `pagination([])` = `{items:[],total:0}` (`mock-gauzy-server.mjs:9`, `:818`). So the list is
 *   empty
 *   unless the spec answers it, and no row action can be seen at all. `stubClientsRead` answers it with one client built
 *   from that very schema, forwarding to the mock first (`route.fetch()`) so the mock's own log still carries the call —
 *   the same technique as `suites/lane-c/task-detail-verification-gates.spec.ts`. That client is synthetic: no mock id
 *   stands for it, and it is the only client the page ever sees. It carries no email and no phone on purpose, which is
 *   the state `ContactCell` and `ClientFacts` treat as "not filled in yet".
 * - `GET /api/invoice-schedules` (`invoice-schedule.service.ts:43-47`) must answer an **array**; the mock's
 *   `{items:[],total:0}` fallback fails that validation (measured as `[ERROR] [InvoiceScheduleService] Invoice schedules
 *   validation failed`), and the section then shows `invoices.schedule.ERROR` instead of its "no schedule yet" state.
 *   `stubEmptySchedulesRead` answers `[]` so the section is the real one; it is installed only where invoice permissions
 *   are held, because without them the section is never mounted and the read is never made.
 * - Every answer this spec writes restates the mock's own CORS set (`mock-gauzy-server.mjs:1009-1018`); the page is on
 *   `http://localhost:3033` and the API on `http://127.0.0.1:4002`, so an answer without those headers is discarded by
 *   the browser and the read becomes an error, which would silently turn a permission case into an outage case.
 * - `scenario.fails` (`mock-gauzy-server.mjs:1073-1091`) answers a pathname with `{statusCode, message:'Synthetic Gauzy
 *   refusal (<status>)'}` for **every** call until the reset; with the query layer's `retry: 1`
 *   (`core/query/config/index.ts:31`) a refused read is asked twice, which the E1 log line counts.
 *
 * ## What the runs measured, in the order the assertions now read it
 *
 * - The refusal copy is chosen by the **permission read alone**. With no ORG_CONTACT_* held the page says
 *   `clients.NO_ACCESS_TITLE` / `clients.NO_ACCESS_MESSAGE` even though the mock answered the client read 200 with an
 *   empty list (A1), and saying so twice — with the read armed 403 as well — changes nothing (A2). Conversely a role
 *   that holds `ORG_CONTACT_VIEW` and meets a 403 gets `clients.ERROR_TITLE` / `clients.ERROR_MESSAGE` and the
 *   `Try again` button, word for word the same as the 500 outage: with the permission held the page does **not** tell a
 *   refusal from an outage (`page-component.tsx:67,70`, `clients-list-states.tsx:137-149` vs `:152-162`).
 *   **Measured, not intended:** "Check your connection" over a 403 sends the person to retry what will be refused
 *   again; whether a refused read should say so is the owner's question, so E1 pins today's words, not a design.
 * - Per permission on its own: ADD → `New client` 1, EDIT → 1 (it is in the create list too), DELETE → 0, and none of
 *   them reaches a row, because without `ORG_CONTACT_VIEW` the body is the refusal.
 * - Empty list for a role that may read: `ORG_CONTACT_VIEW` alone → "No clients yet" plus the read-only sentence and no
 *   create button anywhere; `+ ORG_CONTACT_ADD` → the same title with the create sentence and **two** `New client`
 *   buttons (toolbar and empty state, `clients-list-states.tsx:130`).
 * - One stubbed client in the table: `ORG_CONTACT_VIEW` → the row and its page link, and no action control at all
 *   (menu absent, no `Add contact details for …`); `+ ORG_CONTACT_EDIT` → the menu openable, exactly `Edit` + `Archive`
 *   inside, plus the add-contact button and the create button; `+ ORG_CONTACT_DELETE` → menu with `Archive` alone, no
 *   `Edit`, no add-contact, no create. With the invoice permissions too the menu holds `New invoice` + `Edit` +
 *   `Archive` and the New invoice row links to `/invoices/new?client=<id>`; the same href in the cards view (`clients-cards.tsx:181`).
 * - The client's own page: a viewer with `ORG_CONTACT_VIEW` only finds no `Edit`, no pencil, no `Add email` / `Add phone`
 *   (the facts say `No notes` instead), no new-invoice link and no `Billing schedule` section, but does find a header
 *   menu with `Copy link` in it. `+ ORG_CONTACT_EDIT` brings `Edit` 1, the three pencils 1 each, `Add email` / `Add
 *   phone` 1 each and a header menu of `Copy link` + `Archive`. With the invoice permissions as well, the `Billing
 *   schedule` section appears with its hint and a `Set up a schedule` button, and `New invoice` links appear 3 times —
 *   header, standing band and invoices section — every one with the same href.
 * - Nothing is ever submitted here: no create, edit, archive or schedule form is opened, so the shared mock's state is
 *   never written. Menus are opened to read their rows and closed with `Escape`.
 * - The shield's `consoleErrors()` is deliberately not asserted on the armed-refusal cases: `ApiService.logError`
 *   reports the refusal itself (`[HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - GET /organization-contact/pagination…`
 *   in the run log), which is the app naming an outage rather than a defect.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The one read the clients list and the client's own page share (`organization-contact.service.ts:70`). */
const READ_PATH = '/api/organization-contact/pagination';
/** The schedule read a client page makes once invoice viewing is open (`invoice-schedule.service.ts:43`). */
const SCHEDULES_PATH = '/api/invoice-schedules';

const CLIENTS_PATH = '/clients';
/** A synthetic client: the lane mock has no client of its own to name (`mock-gauzy-server.mjs:818`). */
const CLIENT_ID = 'playwright-clients-ui-client';
const CLIENT_NAME = 'Playwright Clients Probe';
/** `newInvoicePathOf(CLIENT_ID)`, read off the anchor in the run log. */
const NEW_INVOICE_HREF = `/invoices/new?client=${CLIENT_ID}`;

const P_VIEW = 'ORG_CONTACT_VIEW';
const P_ADD = 'ORG_CONTACT_ADD';
const P_EDIT = 'ORG_CONTACT_EDIT';
const P_DELETE = 'ORG_CONTACT_DELETE';
/** What `invoiceAccessOf` needs to let a new invoice start (`invoice-access.ts:19-27`). */
const INVOICE_CREATE_PERMISSIONS = ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1009-1018`), restated on every answer this spec writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** The English, copied from `locales/en.json` (key named in each entry). */
const TEXT = {
	noAccessTitle: 'Clients are not shared with your role', // clients.NO_ACCESS_TITLE
	noAccessMessage: 'Ask a workspace manager to give your role access to the clients.', // clients.NO_ACCESS_MESSAGE
	emptyTitle: 'No clients yet', // clients.EMPTY_TITLE
	emptyCreateMessage: 'Add the clients you work for, then give each project its client.', // clients.EMPTY_MESSAGE
	emptyReadonlyMessage: 'The clients of this workspace will be listed here.', // clients.EMPTY_MESSAGE_READ_ONLY
	errorTitle: 'The clients could not be loaded', // clients.ERROR_TITLE
	errorMessage: 'Check your connection, then try again.', // clients.ERROR_MESSAGE
	tryAgain: 'Try again', // pages.unauthorized.TRY_AGAIN
	newClient: 'New client', // clients.NEW_CLIENT
	newInvoice: 'New invoice', // invoices.NEW_INVOICE
	edit: 'Edit', // common.EDIT
	archive: 'Archive', // common.ARCHIVE
	copyLink: 'Copy link', // common.COPY_LINK
	addContactFor: `Add contact details for ${CLIENT_NAME}`, // clients.contact.ADD_FOR
	actionsFor: `Actions for ${CLIENT_NAME}`, // clients.ACTIONS_FOR
	editContact: 'Edit contact', // clients.facts.EDIT_CONTACT
	editTerms: 'Edit payment terms', // clients.facts.EDIT_TERMS
	editNotes: 'Edit notes', // clients.facts.EDIT_NOTES
	addEmail: 'Add email', // clients.contact.ADD_EMAIL
	addPhone: 'Add phone', // clients.contact.ADD_PHONE
	noNotes: 'No notes', // clients.notes.NONE
	scheduleTitle: 'Billing schedule', // invoices.schedule.TITLE
	scheduleHint:
		"Make this client's invoice by itself every week, two weeks or month, from the billable time not billed yet.", // invoices.schedule.NONE_HINT
	scheduleSetUp: 'Set up a schedule' // invoices.schedule.SET_UP
};

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, permissions: string[], seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c clients] MEASURE ${label} · permissions ${JSON.stringify(permissions)} · ${parts}`);
}

/**
 * One client, built from the fields `clientSchema` keeps (`organization-contact.schema.ts:7-23`): no email, no phone,
 * no notes, not archived, with its own payment terms. `stubClientsRead` puts it in the `{ items, total }` envelope the
 * service validates (`organization-contact.service.ts:74-78`).
 */
const stubClientOf = (fixture: BootstrapFixture) => ({
	id: CLIENT_ID,
	name: CLIENT_NAME,
	primaryEmail: null,
	primaryPhone: null,
	notes: null,
	contactType: 'CLIENT',
	imageUrl: null,
	contactId: null,
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA,
	createdAt: '2026-01-05T09:00:00.000Z',
	updatedAt: '2026-01-05T09:00:00.000Z',
	deletedAt: null,
	paymentTermsDays: 30
});

/**
 * Answers the clients read with one stubbed client. The mock is still asked (`route.fetch()`), so its log keeps the
 * call and a refusal armed with `scenario.fails` still reaches the page through the mock's own answer.
 */
async function stubClientsRead(page: Page, fixture: BootstrapFixture): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === READ_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			await route.fetch();

			return route.fulfill({
				status: 200,
				headers: CORS_HEADERS,
				json: { items: [stubClientOf(fixture)], total: 1 }
			});
		}
	);
}

/** The schedules read as an empty array, which is what the service validates (`invoice-schedule.service.ts:47`). */
async function stubEmptySchedulesRead(page: Page): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === SCHEDULES_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			await route.fetch();

			return route.fulfill({ status: 200, headers: CORS_HEADERS, json: [] });
		}
	);
}

interface OpenClientsOptions {
	permissions: string[];
	/** Install the one-client stub; left out, the mock's own empty answer is what the page gets. */
	withClient?: boolean;
	/** `scenario.fails`, keyed by pathname: the mock refuses that path for every call. */
	fails?: Record<string, number>;
	withSchedulesStub?: boolean;
	path?: string;
}

/** Routes first, then the scenario and the cookies, then the navigation (`playwright/helpers.ts:432-444`). */
async function openClients(page: Page, fixture: BootstrapFixture, options: OpenClientsOptions): Promise<Page> {
	if (options.withClient) await stubClientsRead(page, fixture);
	if (options.withSchedulesStub) await stubEmptySchedulesRead(page);
	await signInAndVisit(page, fixture, options.path ?? CLIENTS_PATH, {
		scenario: {
			extraPermissions: options.permissions,
			...(options.fails ? { fails: options.fails } : {})
		}
	});

	return page;
}

/** The statuses the mock recorded for the clients read, waiting until it logged at least one. */
async function readStatuses(mock: {
	calls: (fragment: string) => Promise<Array<{ status: number }>>;
}): Promise<number[]> {
	await expect
		.poll(() => mock.calls(READ_PATH).then((calls) => calls.length), {
			message: `the page never asked the mock for ${READ_PATH}`,
			timeout: 25_000
		})
		.toBeGreaterThan(0);

	return (await mock.calls(READ_PATH)).map((call) => call.status);
}

/**
 * The statuses logged for the clients read **after** `since` calls were already logged: the mock's log is cumulative
 * for a whole test, so the second arm of E1 must be counted from where the first one stopped. A refused read is asked
 * twice (`retry: 1`), which is what the wait below insists on.
 */
async function armedReadStatuses(
	mock: { calls: (fragment: string) => Promise<Array<{ status: number }>> },
	since: number
): Promise<number[]> {
	await expect
		.poll(() => mock.calls(READ_PATH).then((calls) => calls.length), {
			message: `the refused ${READ_PATH} was never asked twice after call ${since}`,
			timeout: 30_000
		})
		.toBeGreaterThanOrEqual(since + 2);

	return (await mock.calls(READ_PATH)).slice(since).map((call) => call.status);
}

const byText = (page: Page, text: string): Locator => page.getByText(text, { exact: true });
const byRole = (page: Page, role: 'button' | 'link' | 'menuitem' | 'region', name: string): Locator =>
	page.getByRole(role, { name, exact: true });

/** The create button the toolbar renders on `canCreate` alone (`clients-toolbar.tsx:142-147`). */
const createButton = (page: Page): Locator => byRole(page, 'button', TEXT.newClient);
/** The row's or the header's menu trigger (`client-actions-menu.tsx:100-109`). */
const menuTrigger = (page: Page): Locator => byRole(page, 'button', TEXT.actionsFor);

/**
 * Opens the actions menu and returns its panel. Read, never used: no row is clicked, so nothing is written to the mock.
 */
async function openActionsMenu(page: Page): Promise<Locator> {
	const trigger = menuTrigger(page);
	await expect(
		trigger,
		`the page must hold exactly one "${TEXT.actionsFor}" trigger (${await trigger.count()} found, ` +
			`${await menuTrigger(page).count()} by name)`
	).toHaveCount(1);
	await expect(trigger.first(), `"${TEXT.actionsFor}" must be clickable`).toBeVisible({ timeout: 25_000 });
	await trigger.first().click();

	const menu = page.getByRole('menu');
	await expect(menu, `clicking "${TEXT.actionsFor}" must open exactly one menu (${await menu.count()})`).toHaveCount(
		1
	);

	return menu.first();
}

/** Every row of the open menu, by exact name; the count is asserted so no row can sneak in. */
async function expectMenuRows(menu: Locator, rows: string[]): Promise<void> {
	await expect(
		menu.getByRole('menuitem'),
		`the menu must hold exactly ${rows.length} row(s), i.e. ${JSON.stringify(rows)} (it says ` +
			`${JSON.stringify((await menu.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()))})`
	).toHaveCount(rows.length);
	for (const row of rows) {
		await expect(
			menu.getByRole('menuitem', { name: row, exact: true }),
			`the menu must hold a "${row}" row (${await menu.getByRole('menuitem').count()} rows: ` +
				`${JSON.stringify((await menu.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()))})`
		).toHaveCount(1);
	}
}

test.describe('lane-c · /clients with no permission to read the clients (clients.ts:11, page-component.tsx:67,114)', () => {
	test('A1 · no ORG_CONTACT_* at all: the plain-words refusal, and no create button', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [] });

		await expect(
			byText(page, TEXT.noAccessTitle),
			`the page must say clients.NO_ACCESS_TITLE (${await byText(page, TEXT.noAccessTitle).count()})`
		).toBeVisible({ timeout: 25_000 });
		await expect(
			byText(page, TEXT.noAccessMessage),
			`and its clients.NO_ACCESS_MESSAGE sentence (${await byText(page, TEXT.noAccessMessage).count()})`
		).toHaveCount(1);
		const statuses = await readStatuses(mock);
		measure('A1', [], {
			noAccess: await byText(page, TEXT.noAccessTitle).count(),
			createButtons: await createButton(page).count(),
			listReads: statuses
		});
		await expect(
			createButton(page),
			'a role with no ORG_CONTACT_* may not create, so the toolbar may hold no ' +
				`"${TEXT.newClient}" button (${await createButton(page).count()} found)`
		).toHaveCount(0);
		// The refusal is the permission's doing, not the read's: the mock answered this read 200 with no clients.
		expect(
			statuses.filter((status) => status !== 200),
			`A1: the client read was refused (${statuses})`
		).toEqual([]);
	});

	test('A2 · the same role with the list read armed 403: still the refusal, never the outage copy', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [], fails: { [READ_PATH]: 403 } });

		await expect(
			byText(page, TEXT.noAccessTitle),
			`a refused read must not replace clients.NO_ACCESS_TITLE`
		).toBeVisible({ timeout: 25_000 });
		const statuses = await readStatuses(mock);
		measure('A2', [], {
			noAccess: await byText(page, TEXT.noAccessTitle).count(),
			errorTitle: await byText(page, TEXT.errorTitle).count(),
			createButtons: await createButton(page).count(),
			listReads: statuses
		});
		expect(
			statuses.filter((status) => status !== 403),
			`A2: the armed 403 did not answer every call (${statuses})`
		).toEqual([]);
		await expect(
			byText(page, TEXT.errorTitle),
			'this role is told the clients are not shared with it, not that they could not be loaded ' +
				`(${await byText(page, TEXT.errorTitle).count()})`
		).toHaveCount(0);
	});
});

test.describe('lane-c · each client permission on its own (clients.ts:7-9)', () => {
	const alone = [
		{ permission: P_ADD, createShown: true },
		{ permission: P_EDIT, createShown: true },
		{ permission: P_DELETE, createShown: false }
	];

	for (const c of alone) {
		test(`B · ${c.permission} alone → create button ${c.createShown ? 'there' : 'absent'}, body still refused`, async ({
			page,
			fixture,
			mock
		}) => {
			await openClients(page, fixture, { permissions: [c.permission] });

			await expect(
				byText(page, TEXT.noAccessTitle),
				`${c.permission} does not include ORG_CONTACT_VIEW, so the body must be the refusal`
			).toBeVisible({ timeout: 25_000 });
			const createCount = await createButton(page).count();
			measure('B', [c.permission], {
				noAccess: await byText(page, TEXT.noAccessTitle).count(),
				createButtons: createCount,
				listReads: await readStatuses(mock)
			});
			if (c.createShown) {
				await expect(
					createButton(page).first(),
					`${c.permission} is in CLIENT_CREATE_PERMISSIONS (clients.ts:7), so the toolbar must offer ` +
						`"${TEXT.newClient}" (${createCount})`
				).toBeVisible({ timeout: 25_000 });
			} else {
				await expect(
					createButton(page),
					`${c.permission} is in neither create list, so the toolbar may hold no "${TEXT.newClient}" ` +
						`button (${createCount})`
				).toHaveCount(0);
			}
		});
	}
});

test.describe('lane-c · an empty client list, for a role that may read it (clients-list-states.tsx:115-134)', () => {
	test('C1 · ORG_CONTACT_VIEW alone: the read-only empty copy and no create button', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [P_VIEW] });

		await expect(
			byText(page, TEXT.emptyTitle),
			`a settled empty list must say clients.EMPTY_TITLE (${await byText(page, TEXT.emptyTitle).count()})`
		).toBeVisible({ timeout: 25_000 });
		measure('C1', [P_VIEW], {
			readonlyCopy: await byText(page, TEXT.emptyReadonlyMessage).count(),
			createCopy: await byText(page, TEXT.emptyCreateMessage).count(),
			createButtons: await createButton(page).count(),
			listReads: await readStatuses(mock)
		});
		await expect(
			byText(page, TEXT.emptyReadonlyMessage),
			`a role that may not create is told the clients "will be listed here" (${await byText(page, TEXT.emptyReadonlyMessage).count()})`
		).toHaveCount(1);
		await expect(byText(page, TEXT.emptyCreateMessage), 'and gets no invitation to add one').toHaveCount(0);
		await expect(createButton(page), 'no create button anywhere on this page').toHaveCount(0);
	});

	test('C2 · ORG_CONTACT_VIEW + ORG_CONTACT_ADD: the empty state offers creating too', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [P_VIEW, P_ADD] });

		await expect(byText(page, TEXT.emptyTitle), `the title stays clients.EMPTY_TITLE`).toBeVisible({
			timeout: 25_000
		});
		measure('C2', [P_VIEW, P_ADD], {
			createCopy: await byText(page, TEXT.emptyCreateMessage).count(),
			readonlyCopy: await byText(page, TEXT.emptyReadonlyMessage).count(),
			createButtons: await createButton(page).count(),
			listReads: await readStatuses(mock)
		});
		await expect(
			byText(page, TEXT.emptyCreateMessage),
			`a role that may create is told to add the clients (${await byText(page, TEXT.emptyCreateMessage).count()})`
		).toHaveCount(1);
		await expect(
			byText(page, TEXT.emptyReadonlyMessage),
			'and not that they will appear by themselves'
		).toHaveCount(0);
		// Two buttons, measured: the toolbar's (`clients-toolbar.tsx:143`) and the empty state's own action
		// (`clients-list-states.tsx:130`).
		await expect(
			createButton(page),
			`both the toolbar and the empty state must offer "${TEXT.newClient}" (${await createButton(page).count()})`
		).toHaveCount(2);
	});
});

test.describe('lane-c · one stubbed client in the list (clients-list.tsx:192-205, client-actions-menu.tsx:64-82)', () => {
	test('D1 · ORG_CONTACT_VIEW: the row is listed with no action control at all', async ({ page, fixture, mock }) => {
		await openClients(page, fixture, { permissions: [P_VIEW], withClient: true });

		const rowLink = byRole(page, 'link', CLIENT_NAME);
		await expect(
			rowLink,
			`the stubbed client "${CLIENT_NAME}" must be listed (${await rowLink.count()})`
		).toBeVisible({ timeout: 25_000 });
		await expect(rowLink.first(), 'and its name links to its page').toHaveAttribute(
			'href',
			`${CLIENTS_PATH}/${CLIENT_ID}`
		);
		measure('D1', [P_VIEW], {
			actionsTriggers: await menuTrigger(page).count(),
			addContact: await byRole(page, 'button', TEXT.addContactFor).count(),
			createButtons: await createButton(page).count(),
			listReads: await readStatuses(mock)
		});
		await expect(
			menuTrigger(page),
			'nothing may be done to this client, so the menu renders nothing at all ' +
				`(client-actions-menu.tsx:79-82; ${await menuTrigger(page).count()} triggers)`
		).toHaveCount(0);
		await expect(
			byRole(page, 'button', TEXT.addContactFor),
			`and the empty contact cell offers no "${TEXT.addContactFor}" button (canEdit is false, clients-list.tsx:192)`
		).toHaveCount(0);
	});

	test('D2 · ORG_CONTACT_VIEW + ORG_CONTACT_EDIT: Edit and Archive on the row, plus the contact add', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], withClient: true });

		await expect(byRole(page, 'link', CLIENT_NAME), `the stubbed client must be listed`).toBeVisible({
			timeout: 25_000
		});
		const menu = await openActionsMenu(page);
		const addContact = byRole(page, 'button', TEXT.addContactFor);
		measure('D2', [P_VIEW, P_EDIT], {
			rows: (await menu.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()),
			addContact: await addContact.count(),
			createButtons: await createButton(page).count(),
			newInvoiceRows: await menu.getByRole('menuitem', { name: TEXT.newInvoice, exact: true }).count(),
			listReads: await readStatuses(mock)
		});
		await expectMenuRows(menu, [TEXT.edit, TEXT.archive]);
		await expect(
			menu.getByRole('menuitem', { name: TEXT.newInvoice, exact: true }),
			'no invoice permission is held, so the menu may offer no new invoice row'
		).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(
			addContact,
			`canEdit on a client with no email and no phone must offer "${TEXT.addContactFor}" ` +
				`(${await addContact.count()})`
		).toHaveCount(1);
		await expect(
			createButton(page),
			`ORG_CONTACT_EDIT is in CLIENT_CREATE_PERMISSIONS too (clients.ts:7), so "${TEXT.newClient}" stays`
		).toHaveCount(1);
	});

	test('D3 · ORG_CONTACT_VIEW + ORG_CONTACT_DELETE: Archive only', async ({ page, fixture, mock }) => {
		await openClients(page, fixture, { permissions: [P_VIEW, P_DELETE], withClient: true });

		await expect(byRole(page, 'link', CLIENT_NAME), 'the stubbed client must be listed').toBeVisible({
			timeout: 25_000
		});
		const menu = await openActionsMenu(page);
		measure('D3', [P_VIEW, P_DELETE], {
			rows: (await menu.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()),
			addContact: await byRole(page, 'button', TEXT.addContactFor).count(),
			createButtons: await createButton(page).count(),
			listReads: await readStatuses(mock)
		});
		await expectMenuRows(menu, [TEXT.archive]);
		await page.keyboard.press('Escape');
		await expect(
			byRole(page, 'button', TEXT.addContactFor),
			'ORG_CONTACT_DELETE buys the archive only, so no contact add and no Edit row'
		).toHaveCount(0);
		await expect(createButton(page), `and no "${TEXT.newClient}" button either`).toHaveCount(0);
	});

	test('D4 · + the invoice create permissions: a new-invoice entry with its href, in the menu and on the card', async ({
		page,
		fixture,
		mock
	}) => {
		const permissions = [P_VIEW, P_EDIT, ...INVOICE_CREATE_PERMISSIONS];
		await openClients(page, fixture, { permissions, withClient: true });

		await expect(byRole(page, 'link', CLIENT_NAME), 'the stubbed client must be listed').toBeVisible({
			timeout: 25_000
		});
		const menu = await openActionsMenu(page);
		const invoiceRow = menu.getByRole('menuitem', { name: TEXT.newInvoice, exact: true });
		measure('D4 menu', permissions, {
			rows: (await menu.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()),
			href: await invoiceRow.getAttribute('href'),
			listReads: await readStatuses(mock)
		});
		await expectMenuRows(menu, [TEXT.newInvoice, TEXT.edit, TEXT.archive]);
		// Headless UI keeps the row's own anchor and gives it `role="menuitem"`, which is why this row is read as the
		// menuitem itself; `getByRole('link', …)` finds 0 of it while the menu is open (measured).
		await expect(
			invoiceRow,
			`the new-invoice row must link where a new invoice of this client starts (client-actions-menu.tsx:113, ` +
				`invoice-access-guard.tsx:19-22)`
		).toHaveAttribute('href', NEW_INVOICE_HREF);
		await page.keyboard.press('Escape');

		// The same entry point in the cards view (`clients-cards.tsx:117,181-188`), reached through the view switch.
		const cardsTab = page.getByRole('tab', { name: 'Cards', exact: true });
		await expect(cardsTab, 'the toolbar must offer its cards view').toHaveCount(1);
		await cardsTab.first().click();
		const cardLink = byRole(page, 'link', TEXT.newInvoice);
		await expect(cardLink.first(), 'the card must offer its own new invoice').toBeVisible({ timeout: 25_000 });
		measure('D4 cards', permissions, {
			newInvoiceLinks: await cardLink.count(),
			href: await cardLink.first().getAttribute('href')
		});
		await expect(cardLink, `the card must hold exactly one "${TEXT.newInvoice}" link`).toHaveCount(1);
		await expect(cardLink.first(), 'with the same href').toHaveAttribute('href', NEW_INVOICE_HREF);
	});
});

/** The three counts of one E1 arm, without its read log, so the two arms can be compared. */
function seeCopy(
	saw: Record<number, { title: number; message: number; again: number; noAccess: number }>,
	status: number
) {
	const { title, message, again, noAccess } = saw[status];

	return { title, message, again, noAccess };
}

test.describe('lane-c · the list read refused for a role that may read clients (page-component.tsx:69-70)', () => {
	test('E1 · a 403 and a 500 answer the same words: the page does not tell a refusal from an outage', async ({
		page,
		fixture,
		mock
	}) => {
		const saw: Record<
			number,
			{ title: number; message: number; again: number; noAccess: number; reads: number[] }
		> = {};
		for (const status of [403, 500]) {
			// The mock's log is cumulative for the whole test, so this arm's asks are counted from here on.
			const asksBefore = (await mock.calls(READ_PATH)).length;
			await openClients(page, fixture, { permissions: [P_VIEW], fails: { [READ_PATH]: status } });

			await expect(
				byText(page, TEXT.errorTitle),
				`a ${status} read must show clients.ERROR_TITLE (${await byText(page, TEXT.errorTitle).count()} found; ` +
					`the page says ${await page
						.locator('body')
						.innerText()
						.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 160))})`
			).toBeVisible({ timeout: 30_000 });
			const reads = await armedReadStatuses(mock, asksBefore);
			saw[status] = {
				title: await byText(page, TEXT.errorTitle).count(),
				message: await byText(page, TEXT.errorMessage).count(),
				again: await byRole(page, 'button', TEXT.tryAgain).count(),
				noAccess: await byText(page, TEXT.noAccessTitle).count(),
				reads
			};
			measure(`E1 ${status}`, [P_VIEW], saw[status]);
			expect(
				reads,
				`E1 ${status}: the armed refusal is asked twice and both asks meet it (retry: 1, core/query/config/index.ts:31)`
			).toEqual([status, status]);
			await expect(
				byText(page, TEXT.errorMessage),
				`and clients.ERROR_MESSAGE, i.e. a connection problem`
			).toHaveCount(1);
			await expect(
				byRole(page, 'button', TEXT.tryAgain),
				'with the retry button (`clients-list-states.tsx:143`)'
			).toHaveCount(1);
			await expect(
				byText(page, TEXT.noAccessTitle),
				`while the role holds ORG_CONTACT_VIEW, so nothing here says the clients are hidden from it`
			).toHaveCount(0);
		}
		expect(
			[seeCopy(saw, 403), seeCopy(saw, 500)],
			'a 403 and a 500 must be described with the same three elements'
		).toEqual([
			{ title: 1, message: 1, again: 1, noAccess: 0 },
			{ title: 1, message: 1, again: 1, noAccess: 0 }
		]);
	});
});

test.describe('lane-c · the client page of the same stubbed client (detail/page-component.tsx, client-detail-body.tsx)', () => {
	const detailPath = `${CLIENTS_PATH}/${CLIENT_ID}`;

	test('F1 · ORG_CONTACT_VIEW: nothing to change, and a header menu that only copies the link', async ({
		page,
		fixture,
		mock
	}) => {
		await openClients(page, fixture, { permissions: [P_VIEW], withClient: true, path: detailPath });

		await expect(
			byRole(page, 'link', CLIENT_NAME),
			`the client must be found in the list read the detail page shares (detail/page-component.tsx:90,92)`
		).toBeVisible({ timeout: 25_000 });
		measure('F1', [P_VIEW], {
			edit: await byRole(page, 'button', TEXT.edit).count(),
			pencils: await pencilCounts(page),
			addContact: await byRole(page, 'button', TEXT.addEmail).count(),
			newInvoiceLinks: await byRole(page, 'link', TEXT.newInvoice).count(),
			schedule: await byRole(page, 'region', TEXT.scheduleTitle).count(),
			listReads: await readStatuses(mock)
		});
		await expect(byRole(page, 'button', TEXT.edit), 'no Edit button (client-header.tsx:90)').toHaveCount(0);
		await expectPencils(page, 0);
		await expect(
			byRole(page, 'button', TEXT.addEmail),
			'no Add email either (client-facts.tsx:193-198,100-115)'
		).toHaveCount(0);
		await expect(byRole(page, 'button', TEXT.addPhone), 'nor Add phone').toHaveCount(0);
		await expect(byText(page, TEXT.noNotes), 'the facts say "No notes" instead').toHaveCount(1);
		await expect(
			byRole(page, 'link', TEXT.newInvoice),
			'and no new-invoice link (invoiceAccess.canCreate is false)'
		).toHaveCount(0);
		await expect(
			byRole(page, 'region', TEXT.scheduleTitle),
			'nor the billing schedule section, which opens only for a role that reads invoices (client-detail-body.tsx:57-66)'
		).toHaveCount(0);
		const menu = await openActionsMenu(page);
		await expectMenuRows(menu, [TEXT.copyLink]);
		await page.keyboard.press('Escape');
	});

	test('F2 · ORG_CONTACT_VIEW + ORG_CONTACT_EDIT: the Edit button and the three pencils', async ({
		page,
		fixture,
		mock
	}) => {
		const permissions = [P_VIEW, P_EDIT];
		await openClients(page, fixture, { permissions, withClient: true, path: detailPath });

		await expect(byRole(page, 'link', CLIENT_NAME), 'the client must be found').toBeVisible({ timeout: 25_000 });
		measure('F2', permissions, {
			edit: await byRole(page, 'button', TEXT.edit).count(),
			pencils: await pencilCounts(page),
			addEmail: await byRole(page, 'button', TEXT.addEmail).count(),
			addPhone: await byRole(page, 'button', TEXT.addPhone).count(),
			listReads: await readStatuses(mock)
		});
		await expect(
			byRole(page, 'button', TEXT.edit).first(),
			`the header's "${TEXT.edit}" button must be there (client-header.tsx:108-113)`
		).toBeVisible({ timeout: 25_000 });
		await expectPencils(page, 1);
		await expect(
			byRole(page, 'button', TEXT.addEmail),
			`a client with no email offers "${TEXT.addEmail}" where the missing value is`
		).toHaveCount(1);
		await expect(byRole(page, 'button', TEXT.addPhone), `and "${TEXT.addPhone}"`).toHaveCount(1);
		const menu = await openActionsMenu(page);
		await expectMenuRows(menu, [TEXT.copyLink, TEXT.archive]);
		await page.keyboard.press('Escape');
	});

	test('F3 · + the invoice create permissions: the schedule controls and three new-invoice links', async ({
		page,
		fixture,
		mock
	}) => {
		const permissions = [P_VIEW, P_EDIT, ...INVOICE_CREATE_PERMISSIONS];
		await openClients(page, fixture, {
			permissions,
			withClient: true,
			withSchedulesStub: true,
			path: detailPath
		});

		await expect(byRole(page, 'link', CLIENT_NAME), 'the client must be found').toBeVisible({ timeout: 25_000 });
		const schedule = byRole(page, 'region', TEXT.scheduleTitle);
		await expect(
			schedule,
			`the "${TEXT.scheduleTitle}" section must open for a role that reads invoices (client-detail-body.tsx:57-66, ` +
				`${await schedule.count()} found)`
		).toHaveCount(1);
		const newInvoiceLinks = byRole(page, 'link', TEXT.newInvoice);
		const setUp = byRole(page, 'button', TEXT.scheduleSetUp);
		await expect(
			setUp,
			`and offer "${TEXT.scheduleSetUp}" (canManageSchedule = invoiceAccess.canCreate, detail/page-component.tsx:73, ` +
				`client-billing-schedule-section.tsx:251-254; ${await setUp.count()} found)`
		).toHaveCount(1);
		measure('F3', permissions, {
			schedule: await schedule.count(),
			hint: await byText(page, TEXT.scheduleHint).count(),
			setUp: await setUp.count(),
			newInvoiceLinks: await newInvoiceLinks.count(),
			hrefs: await newInvoiceLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? '')),
			edit: await byRole(page, 'button', TEXT.edit).count(),
			listReads: await readStatuses(mock)
		});
		await expect(
			byText(page, TEXT.scheduleHint),
			'the section says what a schedule would do, since this client has none yet'
		).toHaveCount(1);
		// Header, standing band and invoices section each carry their own entry point (client-header.tsx:114-121,
		// client-detail-body.tsx:51,79), all three for the same client.
		await expect(
			newInvoiceLinks,
			`three "${TEXT.newInvoice}" links must be on the page (${await newInvoiceLinks.count()})`
		).toHaveCount(3);
		const hrefs = await newInvoiceLinks.evaluateAll((nodes) =>
			nodes.map((node) => node.getAttribute('href') ?? '')
		);
		expect(
			hrefs.filter((href) => href !== NEW_INVOICE_HREF),
			`every one must be ${NEW_INVOICE_HREF} (${JSON.stringify(hrefs)})`
		).toEqual([]);
		await expect(
			byRole(page, 'button', TEXT.edit),
			'the invoice permissions change no client write affordance: the Edit button stays as ORG_CONTACT_EDIT left it'
		).toHaveCount(1);
	});
});

/** The facts rail's three section pencils, by their `aria-label` (`client-facts.tsx:202,226,236`). */
async function pencilCounts(page: Page): Promise<Record<string, number>> {
	return {
		contact: await byRole(page, 'button', TEXT.editContact).count(),
		terms: await byRole(page, 'button', TEXT.editTerms).count(),
		notes: await byRole(page, 'button', TEXT.editNotes).count()
	};
}

/** Asserts all three pencils are there (1) or none of them is (0). */
async function expectPencils(page: Page, expected: number): Promise<void> {
	for (const label of [TEXT.editContact, TEXT.editTerms, TEXT.editNotes]) {
		await expect(
			byRole(page, 'button', label),
			`"${label}" must appear ${expected === 1 ? 'once' : 'not at all'} (${await byRole(page, 'button', label).count()} found; ` +
				`canEdit decides every one of them, client-facts.tsx:193-198)`
		).toHaveCount(expected);
	}
}
