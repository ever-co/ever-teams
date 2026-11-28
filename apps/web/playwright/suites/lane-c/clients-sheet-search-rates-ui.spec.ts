import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The `/clients` list's **search box** and the record sheet's **Previous / Next**, plus the billing number a client really
 * carries on this page — its **payment terms** — measured in a real Chrome on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, `playwright/test-servers.ts:40`) in this file's own runs and in the throwaway probes under
 * `D:\Coding\.tmp\probe-clientsheet\` (logs `D:\Coding\.tmp\p1-clientsheet.log` … `p7-clientsheet.log`). Every number,
 * string and body asserted below is one those logs printed on a `MEASURE` line, or one this file's own `MEASURE` lines
 * print, so an assertion can be checked against a log line instead of against a reading of the source.
 * `suites/lane-a/clients-writes-ui.spec.ts:155-156` named these as its gaps; the table / cards switch is left to
 * `suites/lane-c/clients-access-ui.spec.ts:623`.
 *
 * ## The components this file drives (each line read before it is named)
 *
 * - `core/components/pages/clients/page-component.tsx`: `useClientsQuery({ includeArchived: true })` (`:40`) reads the
 *   clients once; `shownClients` = `clientsInScope` → `clientMatchesSearch` filter → `sortClients` (`:54-58`); the toolbar
 *   gets `shownCount` (`:106`); the search-empty state is offered `onClearSearch = () => list.setSearch('')` (`:123`); the
 *   sheet is mounted with `onPrevious = peek.showPrevious` / `onNext = peek.showNext` (`:131-147`) and the page hands
 *   `useClientPeek` its `shownClients` (`:60`).
 * - `core/hooks/clients/use-clients-list-state.ts:21` — `search` is `useState('')`: it is **never** put in the URL (only the
 *   scope is, `:25-35`), so it cannot reach the API. `core/hooks/clients/use-clients-query.ts:25-35` keys the read by
 *   (tenant, organization, includeArchived) alone, and
 *   `core/services/client/api/organizations/organization-contact.service.ts:41-55` builds its query from the scope +
 *   `order[name]=ASC` + `take` / `skip` (+ `withDeleted=true` here) — no search term anywhere.
 *   `core/query/config/index.ts:26-31`: `refetchOnWindowFocus:false`, `retry:1`, and no default for mutations.
 * - `core/components/common/list-search-field.tsx`: the box is an `<input type="search">` (role `searchbox`) whose **aria
 *   label is its placeholder** (`:38-45`), a `common.CLEAR` button appears only while the box is non-empty (`:46-55`), and
 *   the typed value reaches the page 150 ms later (`SEARCH_DEBOUNCE_MS`, `:9`).
 * - `core/lib/utils/clients.ts:88-97` `clientMatchesSearch`: the trimmed lower-cased term is a substring of **name OR
 *   primaryEmail OR primaryPhone** (`:93-95`, `includesNeedle` `:81-86`); an empty term matches everything (`:89-91`).
 *   `sortClients` with the default order `name` returns the list exactly as it came (`:360-361`,
 *   `core/hooks/clients/use-clients-display.ts:20-33`), so the shown order is the served order here.
 * - `core/hooks/clients/use-clients-search-key.ts:34-57`: `/` outside a field and outside a dialog focuses the box;
 *   `isTypingTarget` (`:12-18`) and `isInDialog` (`:22-28`) keep the key for whoever holds it.
 * - `core/hooks/clients/use-client-peek.ts`: `neighbours = clientNeighboursOf(listedClients, openedId)` (`:26`) — and the
 *   page passes it the **filtered** list (`page-component.tsx:60`); the open client itself is looked up in `allClients`
 *   (`:22-25`); `showPrevious` / `showNext` are `stepTo(neighbourId)` (`:7-12,35-36`), and `stepTo` returns `undefined` for
 *   a null neighbour, so a step only sets an id and sends nothing. `clientNeighboursOf`
 *   (`core/lib/utils/clients.ts:380-397`) reports `position 0` with two null neighbours when the client is not in the list.
 * - `core/components/clients/client-sheet.tsx:45,57-65`: the position (`clients.sheet.POSITION`) is printed only when
 *   `neighbours.position > 0`. `core/components/common/record-sheet.tsx:66,70-95`: the Previous / Next pair is rendered
 *   **only when at least one step exists** (`hasStepping`), each `disabled` when its own handler is missing, with
 *   `recordSheet.PREVIOUS` / `NEXT` as aria-labels and `recordSheet.PREVIOUS_HINT` / `NEXT_HINT` as titles; the keys are
 *   `:136-163` (`K` back, `J` forward) and are ignored while typing (`:110-117`) or inside another dialog (`:119-129`).
 * - Row click: `core/components/pages/clients/clients-list.tsx:249-275` — the name is a `Link` with
 *   `openClientOnPlainClick`, which opens the sheet. The search-empty copy is `clients.NO_MATCH_TITLE` /
 *   `clients.NO_MATCH_MESSAGE` with a `clients.CLEAR_SEARCH` action (`clients-list-states.tsx:92-103`).
 * - The billing number a client carries here: `core/components/clients/client-facts.tsx:186,228-233` prints
 *   `clients.form.PAYMENT_TERMS` with `clientTermsTextOf` (`core/components/clients/client-terms-text.ts:6-17` →
 *   `clients.terms.NET_DAYS` for the client's own days) behind a pencil named `clients.facts.EDIT_TERMS`;
 *   `core/components/clients/client-form-dialog.tsx:132-210` is the field: a segmented control (role `tab`) over
 *   `PAYMENT_TERMS_CHOICES` (`core/lib/utils/clients.ts:401-408` — `clients.terms.WORKSPACE`, `clients.terms.RECEIPT` and
 *   the fixed `15` `30` `60`, `client-form-dialog.tsx:57,99-118`) plus `Custom`, which opens an input with aria-label
 *   `clients.form.CUSTOM_DAYS_LABEL` (`:186-198`, `maxLength=3`, `inputMode="numeric"`). `paymentTermsInputOf`
 *   (`core/lib/utils/clients.ts:431-440`) is the prefill: 0 / 15 / 30 / 60 pick their own choice, any other number is
 *   `custom` with the days written in, `null` is `workspace`.
 * - The write and everything after it: `core/hooks/clients/use-client-mutations.ts:63-70` `updateClient` →
 *   `organization-contact.service.ts:104-107` `PUT /api/organization-contact/<id>`, body from `buildClientUpdateRequest`
 *   (`core/lib/utils/clients.ts:279-293`: trimmed texts, `null` for an empty field, `contact:{id}` only when the served
 *   client has a contactId, `paymentTermsDays` only when it changed); `onSuccess` is `invalidateClientsAndProjects`
 *   (`:69` → `:52-55`), which invalidates **both** `queryKeys.clients.all` and `queryKeys.organizationProjects.all`, so a
 *   saved update is followed by the clients read again (measured: reads 1 → 2, `p7-clientsheet.log` U2). A refused save
 *   keeps the form open with a `role="alert"` footer saying `clients.form.SAVE_FAILED`
 *   (`client-form-dialog.tsx:307-315,418-422`); a value the form cannot read is refused before the save runs
 *   (`:260,265-269,300-306` with `core/lib/utils/clients.ts:442-456` — `WHOLE_DAYS_PATTERN = /^\d{1,3}$/` and a number over
 *   `CLIENT_TERMS_MAX_DAYS` (`:16`) → null — and `:470-478` `validatePaymentTerms` → `clients.form.TERMS_INVALID`); while a
 *   save runs the draft is locked — `readOnly` inputs, the terms `fieldset disabled`, both footer buttons disabled
 *   (`:256-258,171,423-435`).
 * - Archiving from the sheet: `core/components/clients/client-actions-menu.tsx` (`Archive` row) →
 *   `core/components/clients/client-confirm-dialogs.tsx` → `organization-contact.service.ts:121`
 *   `DELETE /api/organization-contact/<id>/soft` → `invalidateClientsAndProjects` (`use-client-mutations.ts:52-55,72-75`).
 *
 * ## Which layer is real and which is served
 *
 * - Real: the Next.js app on 3033, the shell, the clients page, the record sheet, the search box, the client form, the
 *   query layer and the browser.
 * - Served by this file, on the **mock origin only** (`url.origin === MOCK_API_ORIGIN` and the path is one of the exact
 *   list below), because the lane mock answers `{items:[],total:0}` for anything it has no handler for
 *   (`cypress/support/mock-gauzy-server.mjs:9,818`) and none of `/api/organization-contact*` is one of its routes: the
 *   clients read (`READ_PATH`) and this file's client writes (`PUT <WRITE_PATH>/<id>`, `DELETE <WRITE_PATH>/<id>/soft`).
 *   Every answer restates the mock's own CORS set (`mock-gauzy-server.mjs:1009-1018`), every `OPTIONS` is answered 204
 *   before a call is recorded, and no stub calls `route.fetch()`: the list answer is always the **current store**, so a
 *   write can be followed by the read the page makes after it, and a refusal that changed nothing shows up as a client
 *   whose value is still the served one. `/api/organization-projects` *is* a mock route (`mock-gauzy-server.mjs:763-764`),
 *   so the projects read is left to the mock.
 * - The clients are this file's own fixture (`SEED` below, shaped the way `suites/lane-a/clients-writes-ui.spec.ts:526-544`
 *   shapes its own): every id, name, e-mail, phone, note and served payment term an assertion reads comes from `SEED` or
 *   from the store, never typed a second time.
 * - Permissions are asked for through `scenario.extraPermissions` (`playwright/helpers.ts:69-82`): `ORG_CONTACT_VIEW` (the
 *   read), `ORG_CONTACT_EDIT` (the pencils and the form), `ORG_CONTACT_DELETE` (the archive row) — the keys
 *   `core/lib/utils/clients.ts:7-11` checks. No invoice permission is asked for anywhere, so the invoices / schedule
 *   sections are never mounted (`suites/lane-c/clients-access-ui.spec.ts:44-57` measured the same).
 *
 * ## What the runs measured, in the order the assertions now read it
 *
 * - **Search is client-side.** One read for the whole page, and no read after any term (`p1-clientsheet.log` P1: 1 read
 *   total, its only query
 *   `where[organizationId]=…&where[tenantId]=…&where[contactType]=CLIENT&order[name]=ASC&take=100&skip=1&withDeleted=true`).
 *   What a term changes is `shownClients` and the toolbar's `aria-live` count text.
 * - **What a term matches** (`p1` P1): `'alpha'` → 1 client, `'ALPHA CONSULTING'` → that same one (case-insensitive),
 *   `'north.example'` → the two clients whose **e-mail** holds it, `'5550103'` → the one client whose **phone** holds it.
 *   A term that matches nothing prints `clients.NO_MATCH_TITLE` / `clients.NO_MATCH_MESSAGE` with a
 *   `clients.CLEAR_SEARCH` button, and both that button and the box's own `common.CLEAR` button put every served client
 *   back (`p1` P1). `/` from outside a field jumps into the box (`p1` P1: `active=INPUT|type=search|aria=Search clients`).
 * - **The sheet steps the list as it is shown**, in the served (API name) order: `2 of 4` → `3 of 4` → `4 of 4`, each step
 *   changing only the sheet's heading and its position and sending nothing (reads stayed 1 across four steps,
 *   `p2-clientsheet.log`). At the ends the buttons stand **present and disabled** — `Previous disabled` on the first
 *   client, `Next disabled` on the last (`p2`); `J` and `K` step the same way. With the list filtered to two matches the
 *   bar reads `1 of 2` / `2 of 2`, `Previous` is disabled on the first match, `Next` on the last one, and the step from
 *   `Cedar Foundry` landed on `Delta Media` — **the filtered list, not the full one** (`page-component.tsx:60` →
 *   `use-client-peek.ts:26`).
 * - A term typed **with real keystrokes** while the sheet is open walks the sheet's own client out of the shown list: the
 *   sheet keeps showing it (`use-client-peek.ts:22-25`), its position span disappears (`client-sheet.tsx:45,60-64`) and
 *   **both stepping buttons disappear** (`record-sheet.tsx:66,70`), and `J` / `K` then type into the search box instead of
 *   stepping (`record-sheet.tsx:110-117`; the box read `westzzjk`, `p6-clientsheet.log` T1). The same disappearance is what
 *   an archive from the sheet leaves behind while the sheet keeps its client (`p5-clientsheet.log` R1), which is what
 *   `use-client-peek.ts:14-17` states as its intent: "the client stays known after it leaves that list (archived from the
 *   sheet itself), so the sheet keeps showing it".
 * - The payment terms (`p3` P3a-P3e, `p7` U1-U3): prefilled `Custom` / `45` from a served client of 45 days; the save is
 *   `PUT /api/organization-contact/cs-cedar` with the body this file typed (`paymentTermsDays: 60`, `contactType:'CLIENT'`,
 *   the served e-mail / phone / notes, and **no `contact` key** because the served client has no contactId); after the save
 *   the clients read is sent again and the sheet prints `Net 60 days`. A refused save (400, then 500) keeps the form with
 *   what was typed, prints `clients.form.SAVE_FAILED` in its footer, adds the mutation toast `toasts.MUTATION_FAILED` with
 *   `toasts.REASONS.INVALID` (400) or `toasts.REASONS.SERVER` (500), sends no re-read, and the client still prints the
 *   served `Net 45 days`. `''`, `-5`, `abc` and `366` (the first number over `CLIENT_TERMS_MAX_DAYS`) are refused by the
 *   form itself with `clients.form.TERMS_INVALID` and no request at all — four `MEASURE R3 refused` lines each printing
 *   `writes: 0`. While a save is unanswered, `Save changes` and `Cancel` are disabled, the Name input is `readOnly` and the
 *   terms `fieldset` is `disabled`; the days input itself carries no `readonly` — the disabled fieldset is what holds it
 *   (`p3-clientsheet.log` P3d).
 * - A client served with `paymentTermsDays: null` reads through the workspace branch instead, and this file only saw that
 *   in passing: N5's archived sheet printed `Workspace default (30 days)` — `core/hooks/clients/use-client-terms.ts:19-31`
 *   takes the organization's own `daysUntilDue` and `core/components/clients/client-terms-text.ts:14-16` renders it as
 *   `clients.terms.WORKSPACE_DAYS`. No assertion here reads that branch; every terms assertion in this file is about a
 *   client's **own** days.
 * - **`/clients` has no hourly rate for a client.** Measured, not assumed: the sheet's own controls are exactly
 *   `Previous, Next, Close, Edit, Actions for <name>, Edit contact, Copy <e-mail>, Copy <phone>, Edit payment terms, Edit
 *   notes` and its text holds no rate or hourly word (`p3-clientsheet.log` P3e, `rateWords: []`); the client's own page
 *   holds no rate control either (`P3a`); and the whole `clients.*` subtree of `locales/en.json` holds no rate key (dumped
 *   from the file). The client rate Ever Teams does have is a **project** thing: `rates.PROJECT_RATES_SECTION` ("Client
 *   rates") rendered at `core/components/pages/projects/project-detail/project-people-tab.tsx:111`, per member as
 *   `rates.RATE_ON_PROJECT_OF` ("{name}'s client rate on this project"), read by
 *   `core/hooks/organizations/rates/use-project-client-rates.ts:53-66` through `rateService.getProjectRates(projectId)`. So
 *   this file's rate tests are the client's **billing** number that does live here — payment terms — and no rate test is
 *   written against `/clients`. Untagged: a gap in the page, not a defect the code calls wrong.
 * - Three mechanics had to be measured before they could be pinned. **An open sheet hides the page behind it**:
 *   `getByRole` finds nothing in the list while the sheet is open (its rows read `aria-hidden="true"`,
 *   `p4-clientsheet.log` Q1), so every read of the list behind a sheet below goes through attribute locators
 *   (`li a[href^="/clients/"]`) or text locators. Playwright's `fill()` on the search box **under** an open sheet changes
 *   the DOM value but not the page's state (the box read `north` while the shown list stayed on the earlier term,
 *   `p5-clientsheet.log` R2) — the sheet tests therefore type with real keystrokes. And `expect(… ).toBeDisabled()` does
 *   not read a `<fieldset disabled>`: a run resolved `<fieldset disabled class=…>` and still reported `enabled`, so the
 *   terms fieldset is asserted from its own `disabled` property through `expect.poll`.
 *
 * ## What this file does not cover
 *
 * - Any hourly rate: none exists on `/clients` (see the finding above); the project People tab is another page.
 * - The archived scope as a list (`?archived=true`), the table / cards switch (`clients-access-ui.spec.ts:623`), the
 *   create form, and the create / edit / restore writes of the list rows themselves (`lane-a/clients-writes-ui.spec.ts`) —
 *   except the one archive this file needs to walk a sheet's client out of its list.
 * - The Sort menu (`clients.order.*`): every run here is on the default order `name`, which keeps the API's order, so what
 *   `Newest` or `Most projects` would make a sheet step through is not measured.
 * - What the `contact` branch of the update body does (`clients.ts:285-287`): every client served here has no contactId.
 * - A restored client's sheet, and what a second tab or a workspace switch does mid-save
 *   (`use-client-mutations.ts:20-38`, `ClientWorkspaceChangedError`).
 * - Anything the real `api.gauzy.co` API would answer to these bodies: every clients read and every client write here is
 *   answered by this file's store.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The one read the clients list and a client's own page share (`organization-contact.service.ts:70`). */
const READ_PATH = '/api/organization-contact/pagination';
/** The client writes: the update at `organization-contact.service.ts:104-107`, the soft delete at `:121`. */
const WRITE_PATH = '/api/organization-contact';

const CLIENTS_PATH = '/clients';

const P_VIEW = 'ORG_CONTACT_VIEW';
const P_EDIT = 'ORG_CONTACT_EDIT';
const P_DELETE = 'ORG_CONTACT_DELETE';

/** `CLIENT_TERMS_MAX_DAYS`, the number the days field's own label names (`core/lib/utils/clients.ts:16`). */
const CLIENT_TERMS_MAX_DAYS = 365;

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1009-1018`), restated on every answer this spec writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/* ------------------------------------------------------------------------------------------ the English (en.json) */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Record<string, unknown>;

/** Copy read out of `locales/en.json` by key; no English the app prints is typed anywhere in this file. */
const key = (path: string): string =>
	path
		.split('.')
		.reduce((node: unknown, part) => (node as Record<string, unknown> | undefined)?.[part], EN) as string;

/** A `{name}` template from `en.json` with its placeholders filled. */
const filled = (path: string, values: Record<string, string | number>): string =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), key(path));

/**
 * A `{name, plural, …}` copy from `en.json`, with the branch next-intl picks standing in: an exact `=n` first, then
 * `one`, then `other`, and `#` replaced by the count. The text around the block (the `Net …` of `clients.terms.NET_DAYS`)
 * is kept.
 */
const pluralOf = (path: string, values: Record<string, number>): string => {
	const [variable, count] = Object.entries(values)[0] ?? [];
	const template = key(path);
	const start = template.indexOf(`{${variable}, plural,`);
	if (start < 0) throw new Error(`${path} holds no {${variable}, plural, …} block`);
	let end = -1;
	let depth = 0;
	for (let index = start; index < template.length; index += 1) {
		if (template[index] === '{') depth += 1;
		if (template[index] === '}') {
			depth -= 1;
			if (depth === 0) {
				end = index;
				break;
			}
		}
	}
	const branches = template.slice(start + 1, end).match(/(=[0-9]+|one|other) [{][^{}]*[}]/g) ?? [];
	const chosen =
		branches.find((branch) => branch.startsWith(`=${count} `)) ??
		branches.find((branch) => branch.startsWith(count === 1 ? 'one ' : 'other ')) ??
		branches[0];
	if (!chosen) throw new Error(`${path} holds no plural branch this helper can read`);
	const body = chosen.replace(/^(=[0-9]+|one|other) [{]/, '').replace(/[}]$/, '');
	return template.replace(template.slice(start, end + 1), body).replaceAll('#', String(count));
};

const TEXT = {
	clientsTitle: key('clients.TITLE'),
	count: (count: number) => pluralOf('clients.COUNT', { count }),
	position: (position: number, total: number) => filled('clients.sheet.POSITION', { position, total }),
	searchPlaceholder: key('clients.SEARCH_PLACEHOLDER'),
	clearBox: key('common.CLEAR'),
	noMatchTitle: key('clients.NO_MATCH_TITLE'),
	noMatchMessage: key('clients.NO_MATCH_MESSAGE'),
	clearSearch: key('clients.CLEAR_SEARCH'),
	scopeArchived: key('clients.SCOPE_ARCHIVED'),
	actionsFor: (name: string) => filled('clients.ACTIONS_FOR', { name }),
	openFullPage: key('recordSheet.OPEN_PAGE'),
	previous: key('recordSheet.PREVIOUS'),
	next: key('recordSheet.NEXT'),
	previousHint: key('recordSheet.PREVIOUS_HINT'),
	nextHint: key('recordSheet.NEXT_HINT'),
	close: key('common.CLOSE'),
	archive: key('common.ARCHIVE'),
	archiveConfirm: key('clients.archive.CONFIRM'),
	archivedToast: (name: string) => filled('clients.toasts.ARCHIVED', { name }),
	savedToast: (name: string) => filled('clients.toasts.SAVED', { name }),
	editTerms: key('clients.facts.EDIT_TERMS'),
	termsLabel: key('clients.form.PAYMENT_TERMS'),
	termsCustom: key('clients.terms.CUSTOM'),
	termsNetDays: (days: number) => pluralOf('clients.terms.NET_DAYS', { days }),
	daysLabel: filled('clients.form.CUSTOM_DAYS_LABEL', { max: CLIENT_TERMS_MAX_DAYS }),
	termsInvalid: key('clients.form.TERMS_INVALID'),
	saveChanges: key('common.SAVE_CHANGES'),
	cancel: key('common.CANCEL'),
	saveFailed: key('clients.form.SAVE_FAILED'),
	name: key('common.NAME'),
	mutationFailed: key('toasts.MUTATION_FAILED'),
	reasonInvalid: key('toasts.REASONS.INVALID'),
	reasonServer: key('toasts.REASONS.SERVER')
};

/* --------------------------------------------------------------------------------------------- served clients */

/** This spec's clients: the one source for every id, name, contact value, note and payment term an assertion reads. */
const SEED = [
	{
		id: 'cs-alpha',
		name: 'Alpha Consulting',
		primaryEmail: 'alpha@north.example',
		primaryPhone: '+15550101',
		notes: null as string | null,
		paymentTermsDays: 30 as number | null
	},
	{
		id: 'cs-beta',
		name: 'Beta Logistics',
		primaryEmail: 'beta@north.example',
		primaryPhone: '+15550102',
		notes: null,
		paymentTermsDays: null
	},
	{
		id: 'cs-cedar',
		name: 'Cedar Foundry',
		primaryEmail: 'cedar@west.example',
		primaryPhone: '+15550103',
		notes: 'Foundry retainer.',
		paymentTermsDays: 45
	},
	{
		id: 'cs-delta',
		name: 'Delta Media',
		primaryEmail: 'delta@west.example',
		primaryPhone: null,
		notes: null,
		paymentTermsDays: 15
	}
];

const seedOf = (id: string) => {
	const found = SEED.find((client) => client.id === id);
	if (!found) throw new Error(`this spec has no seeded client ${id}`);
	return found;
};

const nameOf = (id: string) => seedOf(id).name;
const pageHrefOf = (id: string) => `${CLIENTS_PATH}/${encodeURIComponent(id)}`;
const softPathOf = (id: string) => `${WRITE_PATH}/${id}/soft`;

type ServedClient = {
	id: string;
	name: string;
	primaryEmail: string | null;
	primaryPhone: string | null;
	notes: string | null;
	contactType: string;
	imageUrl: string | null;
	contactId: string | null;
	organizationId: string;
	tenantId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	paymentTermsDays: number | null;
};

type ServedCall = { method: string; path: string; query: string; body: string | null };

type Script = {
	/** The ids this arm serves, in the order the store answers them (the page keeps that order: `order[name]=ASC`). */
	ids: string[];
	/** `METHOD path` → status: the stand-in answers that refusal and changes nothing of its own. */
	refuse?: Record<string, number>;
	/** `METHOD path` → the stand-in holds that answer until this test calls `release(…)`. */
	hold?: Record<string, boolean>;
};

type ClientsStore = {
	calls: ServedCall[];
	clients: () => ServedClient[];
	countOf: (method: string, path: string) => number;
	/** The clients reads, oldest first. */
	reads: () => ServedCall[];
	/** The clients reads recorded **after** `since` calls were already recorded. */
	readsAfter: (since: number) => ServedCall[];
	bodyOf: (method: string, path: string) => Record<string, unknown> | null;
	/** Lets a held answer go; nothing held is a no-op. */
	release: (method: string, path: string) => void;
};

/**
 * The clients API this file answers, on the mock origin only, because the lane mock has no handler for any of it (see the
 * header). The list answer is always the **current store**, so a write can be followed by the read the page sends after
 * it, and a refusal that changed nothing shows up as a client whose value is still the served one.
 */
async function serveClientsStore(page: Page, initial: Script, fixture: BootstrapFixture): Promise<ClientsStore> {
	const clients: ServedClient[] = initial.ids.map((id) => {
		const seed = seedOf(id);
		return {
			id: seed.id,
			name: seed.name,
			primaryEmail: seed.primaryEmail,
			primaryPhone: seed.primaryPhone,
			notes: seed.notes,
			contactType: 'CLIENT',
			imageUrl: null,
			contactId: null,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			createdAt: '2026-01-05T09:00:00.000Z',
			updatedAt: '2026-01-05T09:00:00.000Z',
			deletedAt: null,
			paymentTermsDays: seed.paymentTermsDays
		};
	});
	const calls: ServedCall[] = [];
	const refusals = new Map<string, number>(Object.entries(initial.refuse ?? {}));
	const held = new Map<string, () => void>();

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN && (url.pathname === READ_PATH || url.pathname.startsWith(`${WRITE_PATH}/`)),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const path = url.pathname;

			if (method === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			calls.push({ method, path, query: url.searchParams.toString(), body: request.postData() });

			if (initial.hold?.[`${method} ${path}`]) {
				await new Promise<void>((done) => held.set(`${method} ${path}`, done));
			}

			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});

			const refusal = refusals.get(`${method} ${path}`);
			if (refusal) {
				return answer(refusal, { statusCode: refusal, message: `this file refused ${method} ${path}` });
			}

			if (path === READ_PATH && method === 'GET') {
				return answer(200, { items: clients, total: clients.length });
			}
			const rest = path.slice(WRITE_PATH.length + 1);
			const client = clients.find((candidate) => candidate.id === rest.split('/')[0]);
			if (method === 'PUT' && rest && !rest.includes('/')) {
				if (client) {
					const sent = JSON.parse(String(request.postData())) as Record<string, unknown>;
					client.name = String(sent.name);
					client.primaryEmail = (sent.primaryEmail as string | null) ?? null;
					client.primaryPhone = (sent.primaryPhone as string | null) ?? null;
					client.notes = (sent.notes as string | null) ?? null;
					if (typeof sent.paymentTermsDays === 'number') client.paymentTermsDays = sent.paymentTermsDays;
					if (sent.contact) client.contactId = String((sent.contact as { id: string }).id);
					client.updatedAt = new Date().toISOString();
				}
				return answer(200, client);
			}
			if (method === 'DELETE' && rest.endsWith('/soft')) {
				if (client) client.deletedAt = new Date().toISOString();
				return answer(204);
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		calls,
		clients: () => clients,
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		reads: () => calls.filter((call) => call.method === 'GET' && call.path === READ_PATH),
		readsAfter: (since) => calls.slice(since).filter((call) => call.method === 'GET' && call.path === READ_PATH),
		bodyOf: (method, path) => {
			const matching = calls.filter((call) => call.method === method && call.path === path);
			if (!matching.length) return null;
			return JSON.parse(String(matching[matching.length - 1].body)) as Record<string, unknown>;
		},
		release: (method, path) => held.get(`${method} ${path}`)?.()
	};
}

/* ------------------------------------------------------------------------------------------------- page helpers */

/** Prints what one arm saw, so the run log carries the numbers its assertions are pinned on. */
const report = (label: string, value: unknown) =>
	console.log(`[lane-c clients sheet] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Routes first, then the scenario and the cookies, then the navigation (`playwright/helpers.ts:439-451`). */
async function openClients(
	page: Page,
	fixture: BootstrapFixture,
	options: { permissions: string[]; store: Script; path?: string }
): Promise<ClientsStore> {
	const store = await serveClientsStore(page, options.store, fixture);
	await signInAndVisit(page, fixture, options.path ?? CLIENTS_PATH, {
		scenario: { extraPermissions: options.permissions }
	});

	return store;
}

const rowLink = (page: Page, name: string) => page.getByRole('link', { name, exact: true });

/**
 * The rows **behind an open sheet**: a sheet hides the page from `getByRole` (its rows read `aria-hidden="true"`,
 * `p4-clientsheet.log` Q1), so the list behind one is read by attribute, in DOM order.
 */
const rowHrefs = async (page: Page) =>
	page
		.locator('li a[href^="/clients/"]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? '-'));

const searchBox = (page: Page) => page.getByLabel(TEXT.searchPlaceholder, { exact: true });
/** The toolbar's count text (`clients-toolbar.tsx`'s `aria-live` node; `p1-clientsheet.log` P1). */
const liveCount = (page: Page) => page.locator('[aria-live="polite"]').first();

/** The sheet of one client (by its id): the `role=dialog` holding that client's own menu trigger. */
const sheetOf = (page: Page, id: string) =>
	page.getByRole('dialog').filter({
		has: page.getByRole('button', { name: TEXT.actionsFor(nameOf(id)), exact: true })
	});

const sheetButton = (page: Page, id: string, label: string) =>
	sheetOf(page, id).getByRole('button', { name: label, exact: true });

/** The sheet's whole text, flattened: how its facts and its position line are read. */
const sheetText = async (page: Page, id: string) => flat(await sheetOf(page, id).innerText());

/**
 * The stepping controls as `label|disabled`, which is how their disappearance is polled. The names are picked here, in
 * Node: a browser callback cannot see `TEXT`.
 */
const steppingButtons = async (page: Page, id: string): Promise<string[]> => {
	const buttons = await sheetOf(page, id)
		.getByRole('button')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) => `${node.getAttribute('aria-label') ?? ''}|disabled=${(node as HTMLButtonElement).disabled}`
			)
		);
	return buttons.filter((entry) => entry.startsWith(`${TEXT.previous}|`) || entry.startsWith(`${TEXT.next}|`));
};

const steppingButtonsHere = (page: Page, id: string) =>
	sheetOf(page, id).getByRole('button', { name: new RegExp(`^(${TEXT.previous}|${TEXT.next})$`) });

/** The edit form: the dialog holding `Save changes`, whether or not a sheet stands under it. */
const editForm = (page: Page) =>
	page.getByRole('dialog').filter({ has: page.getByRole('button', { name: TEXT.saveChanges, exact: true }) });

const daysField = (page: Page) => editForm(page).getByRole('textbox', { name: TEXT.daysLabel, exact: true });
const termsChoice = (page: Page, label: string) => editForm(page).getByRole('tab', { name: label, exact: true });
const saveButton = (page: Page) => editForm(page).getByRole('button', { name: TEXT.saveChanges, exact: true });
const cancelButton = (page: Page) => editForm(page).getByRole('button', { name: TEXT.cancel, exact: true });
const alerts = (page: Page) => page.getByRole('alert');

/** The page's focused element, as `tag|aria|inDialog`, for the two keys this file drives. */
const focusedElement = async (page: Page): Promise<string> =>
	page.evaluate(() => {
		const element = document.activeElement as HTMLElement | null;
		if (!element) return 'none';
		return `${element.tagName}|aria=${element.getAttribute('aria-label') ?? '-'}|inDialog=${Boolean(
			element.closest('[role="dialog"]')
		)}`;
	});

/**
 * The toast bar's cards. `Notifications alt+T` is not app copy: it is sonner's own region label (its default
 * `containerAriaLabel` "Notifications" plus the hotkey), so it is a library literal named once here.
 */
const TOAST_CARDS = 'section[aria-label="Notifications alt+T"] li';

/** The toast bar (`app-toaster.tsx`): every card's text, flattened. */
const toastTexts = async (page: Page) => (await page.locator(TOAST_CARDS).allInnerTexts()).map(flat);

/**
 * Parks the pointer away from the toast bar and waits for the bar to empty: sonner pauses every countdown while the
 * pointer rests on the toaster (`clients-writes-ui.spec.ts:679-699` measured a bar that held 1 toast for 20 s that way).
 */
async function parkPointer(page: Page): Promise<void> {
	await page.mouse.move(2, 2);
	await expect(page.locator(TOAST_CARDS)).toHaveCount(0, { timeout: 30_000 });
}

/** Opens a client's sheet with a plain click on its row name (`clients-list.tsx:249-275`). */
async function openSheet(page: Page, id: string): Promise<void> {
	await rowLink(page, nameOf(id)).first().click({ timeout: 15_000 });
	await expect(sheetOf(page, id).getByRole('heading').first()).toHaveText(nameOf(id), { timeout: 30_000 });
}

/** Opens the client form on the terms field, from the sheet's `Edit payment terms` pencil. */
async function openTermsForm(page: Page, id: string): Promise<void> {
	const pencil = sheetButton(page, id, TEXT.editTerms);
	await expect(pencil, `the sheet must offer "${TEXT.editTerms}" (client-facts.tsx:228)`).toBeVisible({
		timeout: 30_000
	});
	await pencil.click({ timeout: 15_000 });
	await expect(saveButton(page), `the terms field opens the client form ("${TEXT.saveChanges}")`).toBeVisible({
		timeout: 25_000
	});
}

/** The list order as the page shows it, by row href. */
async function expectRowOrder(page: Page, ids: string[]): Promise<void> {
	await expect
		.poll(() => rowHrefs(page), {
			message: `the list must show exactly ${JSON.stringify(ids.map(pageHrefOf))} in that order`,
			timeout: 30_000
		})
		.toEqual(ids.map(pageHrefOf));
}

/** Which of `ids` the list is showing, in `ids` order. */
const shownIds = async (page: Page, ids: string[]): Promise<string[]> => {
	const hrefs = await rowHrefs(page);
	return ids.filter((id) => hrefs.includes(pageHrefOf(id)));
};

const shellNoise = (line: string) =>
	/** The shell store's own dev warning (`api-tokens-settings-ui.spec.ts:421`). */
	line.includes('The result of getSnapshot should be cached to avoid an infinite loop') ||
	/** The shell's own health read timing out on a loaded lane (`core/services/client/api/default.ts:42`). */
	line.includes('Local API Health Check Error: AxiosError: timeout of 30000ms exceeded');

/** One refusal this file armed. */
type ArmedRefusal = { method: string; path: string; status: number };
/**
 * A refusal this file armed leaves the client's own HTTP error line and the dev line `mutation-error-toaster.tsx:43-45`
 * prints for every failed mutation, `Mutation failed: ApiError: <the message the stub answered>` — both excused only
 * for that armed call (a lead narrowed the earlier blanket `Mutation failed:` excuse, 2026-11-28).
 */
const belongsToArm = (line: string, arm: ArmedRefusal) =>
	(line.includes(`HTTP Error: ${arm.method} ${arm.path.replace(/^\/api/, '')}`) &&
		line.includes(` ${arm.status} `)) ||
	line.includes(`Mutation failed: ApiError: this file refused ${arm.method} ${arm.path}`);

/** The console lines the app added, minus the shell noise and the refusals this file armed. */
function consoleFindings(shield: Shield, armed: ArmedRefusal[] = []): string[] {
	return shield
		.consoleErrors()
		.filter((line) => !shellNoise(line))
		.filter((line) => !armed.some((arm) => belongsToArm(line, arm)));
}

/* ---------------------------------------------------------------------------------------- the list's search box */

test.describe('lane-c · the clients list search box (clients-toolbar.tsx, use-clients-list-state.ts:21, clients.ts:88-97)', () => {
	test('C1 · a term narrows the list and asks the server nothing', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);
		await expect(liveCount(page), 'the toolbar counts every served client').toHaveText(TEXT.count(ids.length));
		report('C1 open', {
			reads: store.reads().length,
			queries: [...new Set(store.reads().map((call) => decodeURIComponent(call.query)))],
			box: await searchBox(page).evaluate((node) => {
				const field = node as HTMLInputElement;
				return `tag=${field.tagName}|type=${field.type}|aria=${field.getAttribute('aria-label')}|placeholder=${field.placeholder}`;
			}),
			liveNodes: await page.locator('[aria-live="polite"]').count()
		});

		const before = store.reads().length;
		await searchBox(page).fill(nameOf('cs-alpha').split(' ')[0]);
		await expect(rowLink(page, nameOf('cs-alpha')), 'the match stays').toBeVisible({ timeout: 25_000 });
		for (const id of ids.filter((candidate) => candidate !== 'cs-alpha')) {
			await expect(rowLink(page, nameOf(id)), `every other client leaves the list (${nameOf(id)})`).toHaveCount(
				0
			);
		}
		await expect(liveCount(page), 'the toolbar counts what is shown now').toHaveText(TEXT.count(1));
		report('C1 after the term', {
			value: await searchBox(page).inputValue(),
			rows: await rowHrefs(page),
			newReads: store.reads().length - before,
			boxClearButtons: await page.getByRole('button', { name: TEXT.clearBox, exact: true }).count()
		});
		expect(
			store.reads().length - before,
			'the term is applied to what was already read (`use-clients-list-state.ts:21` keeps it out of the query)'
		).toBe(0);
		expect(
			store.reads().map((call) => decodeURIComponent(call.query)),
			'every clients read names the scope and the order, never the term (`organization-contact.service.ts:41-55`)'
		).toEqual([
			[
				`where[organizationId]=${fixture.ids.organizationA}`,
				`where[tenantId]=${fixture.ids.tenantA}`,
				'where[contactType]=CLIENT',
				'order[name]=ASC',
				'take=100',
				'skip=1',
				'withDeleted=true'
			].join('&')
		]);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('C2 · what a term matches: name, e-mail, phone, in any case', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);
		const before = store.reads().length;

		// the name, in another case
		await searchBox(page).fill(nameOf('cs-cedar').toLocaleUpperCase());
		await expect.poll(() => shownIds(page, ids), { timeout: 25_000 }).toEqual(['cs-cedar']);
		report('C2 the name, upper case', {
			value: await searchBox(page).inputValue(),
			shown: await shownIds(page, ids)
		});

		// an e-mail fragment two clients share
		await searchBox(page).fill('north.example');
		await expect.poll(() => shownIds(page, ids), { timeout: 25_000 }).toEqual(['cs-alpha', 'cs-beta']);
		await expect(liveCount(page)).toHaveText(TEXT.count(2));

		// the last four digits of one client's phone, which no name and no e-mail holds
		await searchBox(page).fill(String(seedOf('cs-cedar').primaryPhone).slice(-4));
		await expect.poll(() => shownIds(page, ids), { timeout: 25_000 }).toEqual(['cs-cedar']);

		// digits no name and no e-mail holds, found in the phone of all three clients that have one
		await searchBox(page).fill('5550');
		await expect.poll(() => shownIds(page, ids), { timeout: 25_000 }).toEqual(['cs-alpha', 'cs-beta', 'cs-cedar']);
		report('C2 a phone fragment', {
			value: await searchBox(page).inputValue(),
			shown: await shownIds(page, ids),
			phones: ids.map((id) => `${nameOf(id)}|${seedOf(id).primaryPhone ?? 'none'}`)
		});
		expect(store.reads().length, 'no term in this test sent a read').toBe(before);
		expect(consoleFindings(shield), 'no read was refused here either').toEqual([]);
	});

	test('C3 · a term that matches nothing, and the two ways back', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);

		await searchBox(page).fill('zzzz');
		await expect(rowLink(page, nameOf('cs-alpha')), 'nothing matches').toHaveCount(0, { timeout: 25_000 });
		await expect(liveCount(page)).toHaveText(TEXT.count(0));
		await expect(page.getByText(TEXT.noMatchTitle, { exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(TEXT.noMatchMessage, { exact: true })).toBeVisible();
		const clearSearch = page.getByRole('button', { name: TEXT.clearSearch, exact: true });
		await expect(clearSearch, 'the empty state offers `clients.CLEAR_SEARCH`').toHaveCount(1);
		report('C3 nothing matches', {
			rows: await rowHrefs(page),
			reads: store.reads().length,
			value: await searchBox(page).inputValue()
		});

		await clearSearch.click({ timeout: 15_000 });
		await expectRowOrder(page, ids);
		await expect(searchBox(page), "the empty state's button empties the box too").toHaveValue('');

		await searchBox(page).fill(nameOf('cs-delta'));
		await expect.poll(() => rowHrefs(page), { timeout: 25_000 }).toEqual([pageHrefOf('cs-delta')]);
		const boxClear = page.getByRole('button', { name: TEXT.clearBox, exact: true });
		await expect(boxClear, 'a non-empty box offers its own clear button').toHaveCount(1);
		await boxClear.click({ timeout: 15_000 });
		await expectRowOrder(page, ids);
		await expect(liveCount(page)).toHaveText(TEXT.count(ids.length));
		await expect(
			page.getByRole('button', { name: TEXT.clearBox, exact: true }),
			'an empty box offers no clear button (`list-search-field.tsx:46-55`)'
		).toHaveCount(0);
		expect(store.reads().length, 'neither way back re-read anything').toBe(1);
		expect(consoleFindings(shield), 'no request was refused in this arm').toEqual([]);
	});

	test('C4 · "/" walks into the box; a sheet holds its own keys', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);

		await page.locator('h1').first().click({ timeout: 15_000 });
		await page.keyboard.press('/');
		await expect(searchBox(page), '"/" focused the search box (`use-clients-search-key.ts:48-53`)').toBeFocused();
		await expect(searchBox(page), 'the key was used, not typed').toHaveValue('');
		report('C4 after "/"', { focus: await focusedElement(page) });

		// with a sheet open the key belongs to whoever holds focus inside it (`:22-28`)
		await openSheet(page, 'cs-cedar');
		await sheetButton(page, 'cs-cedar', TEXT.editTerms).focus();
		await page.keyboard.press('/');
		await expect(searchBox(page), 'the sheet holds the key (`use-clients-search-key.ts:22-28`)').not.toBeFocused();
		await expect(searchBox(page), 'nothing was typed into the box').toHaveValue('');
		report('C4 "/" inside the sheet', { focus: await focusedElement(page) });
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});
});

/* -------------------------------------------------------------------------- the record sheet's Previous / Next */

test.describe('lane-c · the record sheet steps the list as it is shown (use-client-peek.ts, client-sheet.tsx, record-sheet.tsx)', () => {
	test('N1 · forward and back step the served order and send nothing', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);
		const readsAtOpen = store.reads().length;

		await openSheet(page, 'cs-beta');
		const sheet = sheetOf(page, 'cs-beta');
		await expect(sheet.getByRole('link', { name: TEXT.openFullPage, exact: true })).toHaveAttribute(
			'href',
			pageHrefOf('cs-beta')
		);
		await expect(sheet.getByText(TEXT.position(2, 4), { exact: true })).toBeVisible();
		report('N1 opened', {
			position: TEXT.position(2, 4),
			buttons: await sheet
				.getByRole('button')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('aria-label') ?? ''}|disabled=${(node as HTMLButtonElement).disabled}|title=${node.getAttribute('title') ?? '-'}`
					)
				)
		});
		await expect(sheetButton(page, 'cs-beta', TEXT.previous)).toHaveAttribute('aria-label', TEXT.previous);
		await expect(
			sheetButton(page, 'cs-beta', TEXT.previous),
			'the bar names its hint keys (`record-sheet.tsx:78-79`)'
		).toHaveAttribute('title', TEXT.previousHint);
		await expect(sheetButton(page, 'cs-beta', TEXT.next)).toHaveAttribute('title', TEXT.nextHint);

		await sheetButton(page, 'cs-beta', TEXT.next).click({ timeout: 15_000 });
		await expect(sheetOf(page, 'cs-cedar').getByRole('heading').first()).toHaveText(nameOf('cs-cedar'), {
			timeout: 25_000
		});
		await expect(sheetOf(page, 'cs-cedar').getByText(TEXT.position(3, 4), { exact: true })).toBeVisible();

		await sheetButton(page, 'cs-cedar', TEXT.previous).click({ timeout: 15_000 });
		await expect(sheetOf(page, 'cs-beta').getByRole('heading').first()).toHaveText(nameOf('cs-beta'), {
			timeout: 25_000
		});
		await expect(sheetOf(page, 'cs-beta').getByText(TEXT.position(2, 4), { exact: true })).toBeVisible();
		report('N1 after two steps', {
			reads: store.reads().length,
			readsAtOpen,
			href: await sheetOf(page, 'cs-beta')
				.getByRole('link', { name: TEXT.openFullPage, exact: true })
				.getAttribute('href')
		});
		expect(
			store.reads().length,
			'a step sets an id only (`use-client-peek.ts:7-12,35-36`), so it reads nothing'
		).toBe(readsAtOpen);
		expect(page.url(), 'and the list stays where it was').toContain(CLIENTS_PATH);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('N2 · at both ends the buttons stand disabled, and J / K step the same way', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);

		await openSheet(page, 'cs-alpha');
		await expect(sheetOf(page, 'cs-alpha').getByText(TEXT.position(1, 4), { exact: true })).toBeVisible();
		await expect(sheetButton(page, 'cs-alpha', TEXT.previous), 'the first client has no previous').toBeDisabled();
		await expect(sheetButton(page, 'cs-alpha', TEXT.next), 'and has a next').toBeEnabled();

		await sheetButton(page, 'cs-alpha', TEXT.next).click({ timeout: 15_000 });
		await expect(sheetOf(page, 'cs-beta').getByRole('heading').first()).toHaveText(nameOf('cs-beta'), {
			timeout: 25_000
		});
		// focus is still on the bar button, so J and K belong to the sheet (`record-sheet.tsx:110-129`)
		await page.keyboard.press('j');
		await expect(sheetOf(page, 'cs-cedar').getByRole('heading').first(), 'J steps forward').toHaveText(
			nameOf('cs-cedar'),
			{ timeout: 25_000 }
		);
		await page.keyboard.press('k');
		await expect(sheetOf(page, 'cs-beta').getByRole('heading').first(), 'K steps back').toHaveText(
			nameOf('cs-beta'),
			{ timeout: 25_000 }
		);

		await sheetButton(page, 'cs-beta', TEXT.next).click({ timeout: 15_000 });
		await sheetButton(page, 'cs-cedar', TEXT.next).click({ timeout: 15_000 });
		await expect(sheetOf(page, 'cs-delta').getByRole('heading').first()).toHaveText(nameOf('cs-delta'), {
			timeout: 25_000
		});
		await expect(sheetOf(page, 'cs-delta').getByText(TEXT.position(4, 4), { exact: true })).toBeVisible();
		await expect(sheetButton(page, 'cs-delta', TEXT.next), 'the last client has no next').toBeDisabled();
		await expect(sheetButton(page, 'cs-delta', TEXT.previous), 'and has a previous').toBeEnabled();
		await page.keyboard.press('j');
		// quiet window 1 s: gives a step the J above could have caused its chance before the heading is read again
		await page.waitForTimeout(1_000);
		await expect(
			sheetOf(page, 'cs-delta').getByRole('heading').first(),
			'J at the end of the list steps nowhere'
		).toHaveText(nameOf('cs-delta'), { timeout: 25_000 });
		report('N2 the two ends', {
			first: { position: TEXT.position(1, 4), previous: 'disabled', next: 'enabled' },
			last: { position: TEXT.position(4, 4), previous: 'enabled', next: 'disabled' },
			steppingNow: await steppingButtons(page, 'cs-delta'),
			reads: store.reads().length
		});
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('N3 · a filtered list is stepped as it is filtered', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);
		const readsAtOpen = store.reads().length;

		// only the two clients whose e-mail holds this term stay shown
		await searchBox(page).fill('west.example');
		await expect
			.poll(() => rowHrefs(page), { timeout: 25_000 })
			.toEqual([pageHrefOf('cs-cedar'), pageHrefOf('cs-delta')]);
		await expect(liveCount(page)).toHaveText(TEXT.count(2));

		await openSheet(page, 'cs-cedar');
		await expect(sheetOf(page, 'cs-cedar').getByText(TEXT.position(1, 2), { exact: true })).toBeVisible();
		await expect(
			sheetButton(page, 'cs-cedar', TEXT.previous),
			'the first shown client has no previous'
		).toBeDisabled();

		await sheetButton(page, 'cs-cedar', TEXT.next).click({ timeout: 15_000 });
		await expect(sheetOf(page, 'cs-delta').getByRole('heading').first()).toHaveText(nameOf('cs-delta'), {
			timeout: 25_000
		});
		await expect(sheetOf(page, 'cs-delta').getByText(TEXT.position(2, 2), { exact: true })).toBeVisible();
		await expect(sheetButton(page, 'cs-delta', TEXT.next), 'the last shown client has no next').toBeDisabled();
		report('N3 stepping a filtered list', {
			shown: await rowHrefs(page),
			fullList: ids.map(nameOf),
			steppedFrom: nameOf('cs-cedar'),
			steppedTo: nameOf('cs-delta'),
			reads: store.reads().length,
			readsAtOpen
		});
		expect(store.reads().length, 'filtering and stepping together still read nothing').toBe(readsAtOpen);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('N4 · a term typed over an open sheet walks its client out of the list', async ({ page, fixture, shield }) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids } });
		await expectRowOrder(page, ids);
		await searchBox(page).fill('west.example');
		await expect
			.poll(() => rowHrefs(page), { timeout: 25_000 })
			.toEqual([pageHrefOf('cs-cedar'), pageHrefOf('cs-delta')]);
		await openSheet(page, 'cs-delta');
		await expect(sheetOf(page, 'cs-delta').getByText(TEXT.position(2, 2), { exact: true })).toBeVisible();
		const readsAtOpen = store.reads().length;

		// real keystrokes: Playwright's `fill()` on the box under an open sheet leaves the page's state as it was
		// (`p5-clientsheet.log` R2)
		await searchBox(page).focus();
		await page.keyboard.press('z');
		await page.keyboard.press('z');
		await expect.poll(() => searchBox(page).inputValue(), { timeout: 25_000 }).toBe('west.examplezz');
		await expect(page.getByText(TEXT.noMatchTitle, { exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(liveCount(page)).toHaveText(TEXT.count(0));

		await expect(
			sheetOf(page, 'cs-delta').getByRole('heading').first(),
			'the sheet keeps the client it was showing (`use-client-peek.ts:22-25`)'
		).toHaveText(nameOf('cs-delta'));
		await expect
			.poll(() => sheetText(page, 'cs-delta'), {
				message: 'the position line goes with the client leaving the shown list (`client-sheet.tsx:45,60-64`)',
				timeout: 25_000
			})
			.not.toContain(TEXT.position(2, 2));
		await expect
			.poll(() => steppingButtons(page, 'cs-delta'), {
				message: 'with no neighbour the pair is not rendered at all (`record-sheet.tsx:66,70`)',
				timeout: 25_000
			})
			.toEqual([]);
		report("N4 the sheet's client left the shown list", {
			value: await searchBox(page).inputValue(),
			rows: await rowHrefs(page),
			sheet: await sheetText(page, 'cs-delta'),
			reads: store.reads().length,
			readsAtOpen
		});

		// with the caret in the box, J and K type instead of stepping (`record-sheet.tsx:110-117`)
		await page.keyboard.press('j');
		await page.keyboard.press('k');
		await expect(sheetOf(page, 'cs-delta').getByRole('heading').first()).toHaveText(nameOf('cs-delta'));
		await expect(searchBox(page), 'J and K went into the box instead of the sheet').toHaveValue('west.examplezzjk');

		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 25_000 });
		await expect(page.getByText(TEXT.noMatchTitle, { exact: true })).toBeVisible();
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('N5 · archiving from the sheet keeps the sheet and takes the stepping away', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = SEED.map((client) => client.id);
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT, P_DELETE], store: { ids } });
		await expectRowOrder(page, ids);
		await openSheet(page, 'cs-beta');
		await expect(sheetOf(page, 'cs-beta').getByText(TEXT.position(2, 4), { exact: true })).toBeVisible();
		await expect(steppingButtonsHere(page, 'cs-beta'), 'the middle client can step both ways').toHaveCount(2);

		await sheetButton(page, 'cs-beta', TEXT.actionsFor(nameOf('cs-beta'))).click({ timeout: 15_000 });
		const menu = page.getByRole('menu');
		await expect(menu, 'the sheet holds the same row menu (`client-actions-menu.tsx`)').toHaveCount(1);
		await menu.getByRole('menuitem', { name: TEXT.archive, exact: true }).click({ timeout: 15_000 });
		const confirm = page.getByRole('button', { name: TEXT.archiveConfirm, exact: true });
		await expect(confirm, 'the archive row asks first (`client-confirm-dialogs.tsx`)').toBeVisible({
			timeout: 25_000
		});
		report('N5 while asking', {
			dialogs: await page
				.getByRole('dialog')
				.evaluateAll((nodes) =>
					nodes.map((node) => (node.querySelector('h2,h3')?.textContent ?? '-').replace(/\s+/g, ' ').trim())
				)
		});

		const softPath = softPathOf('cs-beta');
		await confirm.click({ timeout: 15_000 });
		await expect.poll(() => store.countOf('DELETE', softPath), { timeout: 30_000 }).toBe(1);
		const writeIndex = store.calls.findIndex((call) => call.method === 'DELETE' && call.path === softPath);
		await expect
			.poll(() => store.readsAfter(writeIndex).length, {
				message:
					'an archived client invalidates the clients list, so it is read again (`use-client-mutations.ts:52-55,72-75`)',
				timeout: 30_000
			})
			.toBeGreaterThan(0);
		// the confirmation is a second dialog over the sheet (`p4-clientsheet.log` Q2): wait for it to go before reading
		// the bar
		await expect(confirm, 'the confirmation is gone').toHaveCount(0, { timeout: 25_000 });
		await expect
			.poll(() => toastTexts(page), { message: 'the archive toast names the client', timeout: 25_000 })
			.toContainEqual(expect.stringContaining(TEXT.archivedToast(nameOf('cs-beta'))));

		const sheet = sheetOf(page, 'cs-beta');
		await expect(sheet.getByRole('heading').first(), 'the sheet keeps the client it showed').toHaveText(
			nameOf('cs-beta')
		);
		await expect
			.poll(() => sheetText(page, 'cs-beta'), {
				message: 'the archived client is out of the shown list, so its position line is gone',
				timeout: 25_000
			})
			.not.toContain(TEXT.position(2, 4));
		await expect
			.poll(() => steppingButtons(page, 'cs-beta'), {
				message: 'and so is the stepping pair',
				timeout: 25_000
			})
			.toEqual([]);
		await expect
			.poll(() => rowHrefs(page), {
				message: 'the list behind the sheet dropped the archived client',
				timeout: 25_000
			})
			.toEqual([pageHrefOf('cs-alpha'), pageHrefOf('cs-cedar'), pageHrefOf('cs-delta')]);
		report('N5 after the archive', {
			softQuery: store.calls.find((call) => call.method === 'DELETE')?.query,
			sheet: await sheetText(page, 'cs-beta'),
			rows: await rowHrefs(page),
			readsAfterWrite: store.readsAfter(writeIndex).map((call) => call.method),
			store: store.clients().map((client) => `${client.id}|deletedAt=${client.deletedAt ? 'yes' : 'no'}`)
		});

		await sheet.getByRole('button', { name: TEXT.close, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 25_000 });
		await parkPointer(page);
		await expect(page.getByRole('tab').filter({ hasText: TEXT.scopeArchived })).toContainText('1');
		await expect(liveCount(page)).toHaveText(TEXT.count(ids.length - 1));
		expect(consoleFindings(shield), 'the archive was not refused').toEqual([]);
	});
});

/* ------------------------------------------------ the client's billing number: payment terms (no rate exists here) */

test.describe('lane-c · the client payment terms, the number /clients does hold (client-form-dialog.tsx, use-client-mutations.ts:63-70)', () => {
	test('R1 · prefilled from the served client, the PUT it saves, the value printed after', async ({
		page,
		fixture,
		shield
	}) => {
		const seed = seedOf('cs-cedar');
		const servedTerms = seed.paymentTermsDays as number;
		const typedTerms = 60;
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids: ['cs-cedar'] } });
		await expect(rowLink(page, seed.name)).toBeVisible({ timeout: 40_000 });
		await openSheet(page, 'cs-cedar');
		await expect(sheetOf(page, seed.id), 'the sheet prints the served terms').toContainText(
			TEXT.termsNetDays(servedTerms)
		);
		await openTermsForm(page, 'cs-cedar');

		await expect(
			termsChoice(page, TEXT.termsCustom),
			'days that are not a preset open Custom (`clients.ts:431-440`)'
		).toHaveAttribute('aria-selected', 'true');
		await expect(daysField(page), 'the days field is prefilled with the served value').toHaveValue(
			String(servedTerms)
		);
		report('R1 prefilled', {
			label: TEXT.daysLabel,
			field: await daysField(page).evaluate((node) => {
				const field = node as HTMLInputElement;
				return `type=${field.type}|aria=${field.getAttribute('aria-label')}|maxlength=${field.maxLength}|inputmode=${field.getAttribute('inputmode')}`;
			}),
			choices: await editForm(page)
				.getByRole('tab')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|selected=${node.getAttribute('aria-selected')}`
					)
				)
		});

		await daysField(page).fill(String(typedTerms));
		await saveButton(page).click({ timeout: 15_000 });
		const putPath = `${WRITE_PATH}/${seed.id}`;
		await expect.poll(() => store.countOf('PUT', putPath), { timeout: 30_000 }).toBe(1);
		const body = store.bodyOf('PUT', putPath);
		report('R1 PUT body', body ?? {});
		expect(body, 'the body is the typed draft against the served client (`clients.ts:279-293`)').toEqual({
			name: seed.name,
			primaryEmail: seed.primaryEmail,
			primaryPhone: seed.primaryPhone,
			notes: seed.notes,
			contactType: 'CLIENT',
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			paymentTermsDays: typedTerms
		});
		expect(
			Object.keys(body ?? {}).filter((field) => field === 'contact'),
			'a served client with no contactId sends no `contact` key (`clients.ts:285-287`)'
		).toEqual([]);

		const writeIndex = store.calls.findIndex((call) => call.method === 'PUT' && call.path === putPath);
		await expect
			.poll(() => store.readsAfter(writeIndex).length, {
				message:
					'a saved update invalidates the clients list, so it is read again (`use-client-mutations.ts:52-55,69`)',
				timeout: 40_000
			})
			.toBeGreaterThan(0);
		await expect
			.poll(() => toastTexts(page), { message: 'the save answers with the saved toast', timeout: 25_000 })
			.toContainEqual(expect.stringContaining(TEXT.savedToast(seed.name)));
		await expect(editForm(page), 'a saved form closes').toHaveCount(0, { timeout: 25_000 });
		await expect(sheetOf(page, seed.id), 'the sheet prints the value the re-read served').toContainText(
			TEXT.termsNetDays(typedTerms)
		);
		report('R1 after the re-read', {
			reads: store.reads().length,
			readsAfterWrite: store.readsAfter(writeIndex).length,
			store: store.clients().map((client) => `${client.id}|terms=${client.paymentTermsDays}`),
			sheet: await sheetText(page, seed.id)
		});
		await parkPointer(page);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('R2 · a refused save, 400 then 500: the words, the kept form, the unchanged value', async ({
		page,
		fixture,
		shield
	}) => {
		const seed = seedOf('cs-cedar');
		const servedTerms = seed.paymentTermsDays as number;
		const typedTerms = 61;
		const putPath = `${WRITE_PATH}/${seed.id}`;
		const armed: ArmedRefusal[] = [];
		const saw: Record<number, { puts: number; terms: number | null; reReads: number }> = {};

		for (const status of [400, 500]) {
			const store = await openClients(page, fixture, {
				permissions: [P_VIEW, P_EDIT],
				store: { ids: ['cs-cedar'], refuse: { [`PUT ${putPath}`]: status } }
			});
			await expect(rowLink(page, seed.name), 'the list must settle before the sheet opens').toBeVisible({
				timeout: 40_000
			});
			await openSheet(page, 'cs-cedar');
			await openTermsForm(page, 'cs-cedar');
			await expect(daysField(page), 'a served 45 opens Custom with 45 written in').toHaveValue(
				String(servedTerms)
			);

			await daysField(page).fill(String(typedTerms));
			await saveButton(page).click({ timeout: 15_000 });
			await expect.poll(() => store.countOf('PUT', putPath), { timeout: 30_000 }).toBe(1);
			armed.push({ method: 'PUT', path: putPath, status });

			await expect(
				alerts(page).first(),
				`the footer says "${TEXT.saveFailed}" (\`client-form-dialog.tsx:418-422\`)`
			).toHaveText(TEXT.saveFailed);
			await expect(daysField(page), 'the form keeps what was typed').toHaveValue(String(typedTerms));
			const reason = status === 400 ? TEXT.reasonInvalid : TEXT.reasonServer;
			await expect
				.poll(() => toastTexts(page), { message: `a ${status} answer is told as "${reason}"`, timeout: 25_000 })
				.toContainEqual(expect.stringContaining(reason));
			await expect(saveButton(page), 'the save is offered again, not left locked on the answer').toBeEnabled();
			await expect(alerts(page), 'one footer alert, no more').toHaveCount(1);
			await expect(editForm(page), 'the form is kept').toHaveCount(1);

			const writeIndex = store.calls.findIndex((call) => call.method === 'PUT');
			saw[status] = {
				puts: store.countOf('PUT', putPath),
				terms: store.clients().find((client) => client.id === seed.id)?.paymentTermsDays ?? null,
				reReads: store.readsAfter(writeIndex).length
			};
			report(`R2 refused ${status}`, { ...saw[status], toasts: await toastTexts(page) });

			await cancelButton(page).click({ timeout: 15_000 });
			await expect(editForm(page), 'Cancel leaves the form').toHaveCount(0, { timeout: 25_000 });
			await parkPointer(page);
			await expect(
				sheetOf(page, seed.id),
				'and the client still prints the terms the store still holds'
			).toContainText(TEXT.termsNetDays(servedTerms));
		}

		expect(
			[400, 500].map((status) => saw[status]),
			'a 400 and a 500 are answered the same way: the words, the kept value, the unchanged client, no re-read'
		).toEqual([
			{ puts: 1, terms: servedTerms, reReads: 0 },
			{ puts: 1, terms: servedTerms, reReads: 0 }
		]);
		expect(
			consoleFindings(shield, armed),
			`only the two refusals this file armed may be reported (${JSON.stringify(shield.consoleErrors().map((line) => line.slice(0, 90)))})`
		).toEqual([]);
	});

	test('R3 · the values the form refuses before it asks for anything', async ({ page, fixture, shield }) => {
		const seed = seedOf('cs-cedar');
		const store = await openClients(page, fixture, { permissions: [P_VIEW, P_EDIT], store: { ids: ['cs-cedar'] } });
		await expect(rowLink(page, seed.name)).toBeVisible({ timeout: 40_000 });
		await openSheet(page, 'cs-cedar');
		await openTermsForm(page, 'cs-cedar');

		// '', '-5', 'abc' and the first number over `CLIENT_TERMS_MAX_DAYS` are all unreadable days
		for (const typed of ['', '-5', 'abc', String(CLIENT_TERMS_MAX_DAYS + 1)]) {
			await daysField(page).fill(typed);
			await saveButton(page).click({ timeout: 15_000 });
			await expect(
				alerts(page).first(),
				`"${typed}" is refused by the form itself (\`clients.ts:442-456,470-478\`)`
			).toHaveText(TEXT.termsInvalid);
			await expect(daysField(page), 'the field is marked invalid').toHaveAttribute('aria-invalid', 'true');
			report('R3 refused', {
				typed,
				valueInField: await daysField(page).inputValue(),
				writes: store.calls.filter((call) => call.method !== 'GET').length
			});
		}
		// a quiet window: a save would have been recorded here by now (`client-form-dialog.tsx:300-306` returns before
		// `save()` when a field refused)
		await page.waitForTimeout(2_000);
		report('R3 every call this arm made', { calls: store.calls.map((call) => `${call.method} ${call.path}`) });
		expect(
			store.calls.filter((call) => call.method !== 'GET'),
			'none of these values ever reached the API'
		).toEqual([]);
		expect(consoleFindings(shield), 'a value the form refused logs nothing').toEqual([]);
	});

	test('R4 · a held save: the form locked on its own request, then the answer', async ({ page, fixture, shield }) => {
		const seed = seedOf('cs-cedar');
		const typedTerms = 62;
		const putPath = `${WRITE_PATH}/${seed.id}`;
		const store = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT],
			store: { ids: ['cs-cedar'], hold: { [`PUT ${putPath}`]: true } }
		});
		await expect(rowLink(page, seed.name)).toBeVisible({ timeout: 40_000 });
		await openSheet(page, 'cs-cedar');
		await openTermsForm(page, 'cs-cedar');
		await daysField(page).fill(String(typedTerms));
		await saveButton(page).click({ timeout: 15_000 });
		try {
			await expect.poll(() => store.countOf('PUT', putPath), { timeout: 40_000 }).toBe(1);
			await expect(saveButton(page), 'the save is locked while its own request runs').toBeDisabled();
			await expect(cancelButton(page), 'and so is Cancel').toBeDisabled();
			await expect(
				editForm(page).getByRole('textbox', { name: TEXT.name, exact: true }),
				'the draft is read-only (`client-form-dialog.tsx:256-258,340`)'
			).toHaveAttribute('readonly');
			// `toBeDisabled` does not read a `<fieldset disabled>` (the run log showed the element carrying `disabled`
			// while the matcher called it enabled), so the fieldset's own state is polled from the element.
			const fieldsetDisabled = () =>
				editForm(page)
					.locator('fieldset')
					.evaluate((node) => (node as HTMLFieldSetElement).disabled);
			await expect
				.poll(fieldsetDisabled, {
					message: 'the terms fieldset carries disabled (`client-form-dialog.tsx:171`)',
					timeout: 25_000
				})
				.toBe(true);
			report('R4 while the call is held', {
				value: await daysField(page).inputValue(),
				daysReadonly: await daysField(page).evaluate((node) => (node as HTMLInputElement).readOnly),
				fieldsetDisabled: await fieldsetDisabled(),
				buttons: await editForm(page)
					.getByRole('button')
					.evaluateAll((nodes) =>
						nodes.map(
							(node) =>
								`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|disabled=${(node as HTMLButtonElement).disabled}`
						)
					)
			});
		} finally {
			store.release('PUT', putPath);
		}
		await expect(editForm(page), 'the released save closes the form').toHaveCount(0, { timeout: 30_000 });
		await expect
			.poll(() => toastTexts(page), {
				message: 'the released save answers with the saved toast',
				timeout: 25_000
			})
			.toContainEqual(expect.stringContaining(TEXT.savedToast(seed.name)));
		await expect(sheetOf(page, seed.id)).toContainText(TEXT.termsNetDays(typedTerms));
		report('R4 released', {
			sheet: await sheetText(page, seed.id),
			store: store.clients().map((client) => `${client.id}|terms=${client.paymentTermsDays}`),
			toasts: await toastTexts(page)
		});
		await parkPointer(page);
		expect(consoleFindings(shield), 'the held save answered fine').toEqual([]);
	});
});
