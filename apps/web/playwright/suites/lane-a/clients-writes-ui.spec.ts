import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person allowed to change clients actually **does** on `/clients` and `/clients/<id>`: create, edit, archive,
 * restore, and set / pause / delete a client's billing schedule — each one followed to the request it sent and to the
 * row or section that came back. Lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`,
 * `playwright/test-servers.ts:34`), measured in this file's own runs and in the throwaway probes
 * `D:\Coding\.tmp\probe-clientwrites\` (logs `s3-lane-a-clientwrites-probe-1.log`, `-probe-2.log`, `-probe-3b.log`,
 * `-probe-4.log`, then `s3-lane-a-clientwrites-fix-1.log`, `-fix-2.log`, `-fix-3.log` and the acceptance pair).
 * `suites/lane-c/clients-access-ui.spec.ts` pinned who sees which control; nothing there submits anything. Here every
 * arm submits, and every number pinned below is one its own run printed on a `MEASURE` line.
 *
 * ## Which layer is real, and which is served
 *
 * - The pages, the components, the query layer, the mutation hooks, the validation and the copy are all real. What is
 *   served is the API those pages call, because the lane mock has **no handler** for any of it: neither
 *   `POST /organization-contact`, `PUT /organization-contact/<id>`, `DELETE …/soft`, `PUT …/recover` nor any
 *   `/invoice-schedules` route exists there, so every one of them lands on the mock's catch-all — a read answers
 *   `pagination([])` and a write answers `{ affected: 1, raw: [] }` or the body echoed back
 *   (`cypress/support/mock-gauzy-server.mjs:893-895`), a write that looks like it worked and stored nothing, while the
 *   app really calls them (`core/services/client/api/organizations/organization-contact.service.ts:93-126`,
 *   `core/services/client/api/organizations/invoice-schedule.service.ts:34-112`).
 * - So this file installs its own stand-in for both, on the mock origin, in the shape
 *   `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360` uses: a **store** the answers always come from, so a write
 *   changes what the next read says — which is the only way "the row is gone" can be told apart from "the stand-in
 *   still lists it". A refused arm (`refuse`) answers the refusal and changes nothing in the store; a held arm (`slow`)
 *   keeps a request in flight so the pending state can be met. Every answer restates the mock's own CORS set
 *   (`mock-gauzy-server.mjs:1087-1096`) and answers `OPTIONS` with 204, because the page is on `http://localhost:3031`
 *   and the API on `http://127.0.0.1:3992`; `route.fetch()` is deliberately never called, since proving the stand-in
 *   was used is the point. It answers a clients read with **every** client, archived ones included, because the
 *   clients page always asks `withDeleted=true` and splits the scopes itself
 *   (`core/components/pages/clients/page-component.tsx:40-64, core/lib/utils/clients.ts:66-72`), which is what the armed reads measured.
 * - Permission arming is the one `suites/lane-c/clients-access-ui.spec.ts:239-261` uses: `scenario.extraPermissions`
 *   adds to the fixture role's five (`core/hooks/roles/use-my-role-permissions-query.ts:36-39`), read from
 *   `GET /api/role-permissions/me` (`mock-gauzy-server.mjs:674`). `ORG_CONTACT_VIEW` opens the read,
 *   `ORG_CONTACT_ADD`/`ORG_CONTACT_EDIT` the create, `ORG_CONTACT_EDIT` the edit, `ORG_CONTACT_DELETE` or
 *   `ORG_CONTACT_EDIT` the archive (`core/lib/utils/clients.ts:7-11`, each list an "any of" at `:41-43`), and
 *   `INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE` the schedule controls
 *   (`core/lib/utils/invoice-access.ts:17-28`, with the fixture role's own `ORG_EMPLOYEES_EDIT` counted as the
 *   rate-admin one by `core/lib/utils/rates.ts:11`).
 *
 * ## What the runs measured, in the order the assertions read it
 *
 * - **Create** (W1–W3, `client-form-dialog.tsx`): the form is `New client` with `Contact` / `Billing` sections; its
 *   fields are `Name` (required, `maxLength` 255, placeholder `Company or person`), `Email (optional)` (`type=email`),
 *   `Phone (optional)` (`type=tel`, `maxLength` 50, `client-form-dialog.tsx:384`), `Notes (optional)` (textarea, 2000)
 *   and the payment terms choices `Workspace default / On receipt / 15 / 30 / 60 / Custom`; the name field takes the
 *   focus. A save sends `{name, primaryEmail, primaryPhone, notes, contactType, organizationId, tenantId}` with every
 *   empty text as `null`, and **no `paymentTermsDays` at all** while the client is left on the workspace default
 *   (`clients.ts:253-261`); `Custom` + 45 sends `paymentTermsDays: 45`. The list is read again after the create
 *   (`use-client-mutations.ts:57-61`). A save refused in the form sends nothing: 1 alert per arm —
 *   `Enter the client's name.` / `Enter a valid email address, or leave the field empty.` /
 *   `Enter a number of days from 0 to 365.` — with the field itself `aria-invalid="true"`
 *   (`clients.ts:197-210` knows name and e-mail only, so a phone is sent as typed and only the field's own 50
 *   characters cut it). A create the server refuses (400 and 500) says `The client could not be saved. Try again.`
 *   inside the form, which stays open with its fields unlocked and its Cancel and save offered again
 *   (`client-form-dialog.tsx:258,418-421`), and the store still holds the clients it started with.
 * - **Edit** (W4–W5): a row's menu holds `Edit` and `Archive` (`client-actions-menu.tsx:22,70-76`); `Edit` opens
 *   `Edit client` prefilled, with saved terms that are not a listed choice read back as `Custom` + the days in the
 *   field. The client's own page opens the same form from four places and only the field it wants met first differs —
 *   the header `Edit` on the name, `Edit contact` on the e-mail, `Edit payment terms` on the picked choice (a button,
 *   `client-form-dialog.tsx:161-168`), `Edit notes` on the notes (`client-facts.tsx:180,194,238-248`). Each save sends the
 *   whole draft: the stored `contact` is named only when the client has a `contactId`, and `paymentTermsDays` only
 *   when it changed (`clients.ts:263-293`) — measured both ways, with a `contactId` on the W4 client and none on W5's.
 * - **Archive / restore** (W6, W7, W13): the confirmation is `Archive <name>?` with four consequences
 *   (`client-confirm-dialogs.tsx:85-90`) and Close / Cancel / `Archive client`; while its `DELETE …/soft` runs the
 *   dialog refuses to be left (`Cancel` and `Archive client` disabled, Close not, `client-confirm-dialogs.tsx:24-31`),
 *   the answer closes it once, the client leaves the active list and the Archived tab counts it. A refused archive
 *   (500) keeps the confirmation open with `role="alert"` saying `The client could not be archived. Try again.`
 *   (`client-confirm-dialogs.tsx:92-95`, `project-confirm-dialog.tsx:216-218`) and the client unarchived. The Archived
 *   list is reached by opening `/clients?archived=true` (measured: the read carries `withDeleted=true`); an archived
 *   row's menu holds only `Restore`, whose `PUT …/recover` puts the client back in the active count.
 * - **An archived client's own page** (W8): the `Archived` chip, no `Edit`, no pencils, no schedule section, no
 *   `New invoice` link (`client-header.tsx:90`, `client-facts.tsx:180`), its facts still shown with missing values
 *   reading as `No phone` rather than a button to add one, and a header menu of `Copy link` + `Restore`.
 * - **The client sheet** (W9): a plain click on a row name opens it over the list without navigating; its bar is
 *   `Previous` / `Next` / `Close` with `1 of 2`, the only link in it that leaves the list is `Open full page` to
 *   `/clients/<id>` (the e-mail is a `mailto:` link, measured), and it holds the same facts and pencils as the page.
 * - **The billing schedule** (W10–W12, W14): the section is `Billing schedule` (`client-billing-schedule-section.tsx:307`);
 *   with no schedule it states `invoices.schedule.NONE_HINT` and offers `Set up a schedule` to whoever may create
 *   invoices. The form `Bill on a schedule` starts `Every month` + `By project` + `Keep as a draft` with a text day
 *   field (`First day of the first period`) holding the month's first day in the browser's own shape (`11/01/2026`
 *   measured — the ISO `startDay` is only ever in the POST body, `invoice-schedules.ts:69-76`); the POST is
 *   `{frequency, startDay, grouping, sendInvoice, organizationContactId, organizationId, tenantId}`
 *   (`invoice-schedule.service.ts:72-88`), and the section answers with the summary, the `Active` chip, the next
 *   invoice, `No run yet` and Edit / Pause / Delete, after reading the schedules again and the new schedule's runs.
 *   Pause sends `{paused: true, organizationId, tenantId}` and resume `{paused: false, …}`
 *   (`invoice-schedule.service.ts:94-104`); a paused schedule states `No invoice is made while it is paused`
 *   (`client-billing-schedule-section.tsx:81-86`). Delete asks first (`Delete this billing schedule?` +
 *   `No more invoice will be made by itself for <name>. The invoices it made stay.`), then `DELETE …/invoice-schedules/<id>`,
 *   and the section is back to its no-schedule state. A refused set-up (409) keeps the form open saying
 *   `This client already has a schedule. Close and open it again to change it.` and changes nothing.
 * - **Two read failures only a unit test pinned** (W14): a 404 on the schedules read leaves **no section at all**
 *   (`client-billing-schedule-section.tsx:198-200`, `use-invoice-schedules.ts:36,67`), while a 500 keeps the section
 *   and says `The billing schedule could not be loaded` (`:247`) after its one retry (`use-invoice-schedules.ts:57`) —
 *   the two states its unit test pins (`client-billing-schedule-section.test.tsx:356,364`), never the list's spec.
 *
 * ## How to read the numbers here
 *
 * - A section's words follow the read that answers a write: every text read taken straight after a pause / resume /
 *   archive PUT was one refresh behind (`…-probe-4.log` S1), so each state here is *waited for* (the Resume button,
 *   the `Archived 1` tab) before it is read or pinned.
 * - A toast sits over the client page for 5 s (`app-toaster.tsx:61,66`) and its card intercepts pointer events over the
 *   schedule's buttons (`…-fix-1.log` W11: the Resume click was blocked by the pause toast), so `quietPage` parks the
 *   pointer in the corner far from the bar and then waits — web-first — for the bar to be empty before the next click.
 *   Measured the hard way, twice over: a pointer left where the click landed holds the whole stack open
 *   (`…-fix-2.log` W11: 1 toast after 20 s), and the toast's own `Close toast` button cannot be clicked reliably
 *   (`…-fix-3.log` W11: `element is not stable`, then `element was detached from the DOM`).
 * - Console discipline: `shield.consoleErrors()` is one log per test, so an arm that armed two refusals excuses each
 *   line by the method, path and status that only that arm armed (`belongsToArm`), plus the shell store's
 *   `getSnapshot` line and the dev `Mutation failed:` line.
 * - Dates are never pinned: the day a section renders out of a served `startDay` or `deletedAt` is formatted in the
 *   browser's zone (the app even banners its own `UTC` vs `Europe/Madrid` choice), so day claims here are day **keys**
 *   in a request body, matched as `/^\d{4}-\d{2}-01$/`, and rendered dates are only ever reported.
 * - Only this page's own requests are counted: `callsAfter(since)` cuts off everything the sign-in helper's first
 *   dashboard load asked (`playwright/helpers.ts:424`).
 *
 * ## Findings
 *
 * - `[MEASURED, NOT INTENDED]` `client-billing-schedule-section.tsx:85-86` — `if (isPausedSchedule(schedule) || !next)`
 *   shows `invoices.schedule.NEXT_PAUSED` ("No invoice is made while it is paused") for a schedule that is **Active**
 *   and simply has no next period in the answer: an armed `nextPeriod: null` read printed `… Active No invoice is made
 *   while it is paused …` (`…-probe-4.log` S1). W10–W11 serve a `nextPeriod` so the copy they pin is the honest one;
 *   the copy for a schedule whose next period is missing is the paused wording.
 * - The two confirmations are not the same kind of dialog: the client archive / restore confirmation is a
 *   `ProjectConfirmDialog` whose role is `dialog` (`project-confirm-dialog.tsx`), while the schedule's delete
 *   confirmation is an `AlertDialogConfirmation` whose role is `alertdialog`. Measured as `alertdialog` 0 / `dialog` 1
 *   for the archive arm and the reverse for the schedule arm (`…-fix-1.log` W6, `…-probe-4.log` S1), so this file
 *   drives them with `clientConfirm` and `alertConfirm` separately.
 * - The schedule section is a `<section aria-label="Billing schedule">` that `getByRole('region', {name: …})` does not
 *   match: `regionRoleCount 0` next to `sectionTagCount 1` for the very element (`…-probe-4.log` S2,
 *   `client-billing-schedule-section.tsx:307`). Every assertion here uses the attribute locator for that reason.
 * - `validateClientDraft` (`clients.ts:197-210`) knows only the name and the e-mail, so a phone the API would reject is
 *   sent as typed and only the input's own `maxLength` 50 (`client-form-dialog.tsx:384`) shortens it. Measured:
 *   `zzz-not-a-phone!!!` went verbatim, and 400 typed characters arrived as 50.
 *
 * ## What this file does not cover
 *
 * - **Saving a client after another tab switched the workspace** (`use-client-mutations.test.tsx:34-61`,
 *   `ClientWorkspaceChangedError`): it needs a workspace switch under an open form, which no arm of this file drives.
 * - **A schedule replaced or deleted while its dialog or confirmation was open**
 *   (`client-billing-schedule-section.test.tsx:219-336`, `OpenedScheduleGoneError`): it needs a second actor changing
 *   the schedule between two of this page's own reads.
 * - **The sheet's `Edit` button**: it opens the client form, but how many dialogs are on screen while it does is not
 *   stable — the click was measured as 1 dialog for 20 s while the failure snapshot showed both the sheet and
 *   `dialog "Edit client"` (`…-probe-4.log` S4), so nothing about it is pinned. The sheet's own facts, bar and
 *   `Open full page` link are pinned instead.
 * - **The scope tabs and the URL**: clicking `Archived` was measured to change the rows and `aria-selected` while
 *   `page.url()` stayed `/clients` (`…-probe-2.log` Q2), and clicking `Active` from `?archived=true` had changed
 *   nothing in the second the probe waited (`…-probe-4.log` S3), although `use-clients-list-state.ts:26-34` does
 *   `router.replace`. Both reads landed before any replace could, so no URL claim is pinned after a tab click; the
 *   archived scope is entered by opening its URL instead, which is measured to work.
 * - The `Previous` / `Next` stepping of the sheet (its buttons are pinned, what they step to is not), the search box,
 *   the table/cards switch, the client's hourly rates, and anything the `app.gauzy.co` API would do with these bodies.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The one read the clients list and the client's own page share (`organization-contact.service.ts:70`). */
const READ_PATH = '/api/organization-contact/pagination';
/** The write prefix: create at `:96`, the update at `:107`, the soft delete at `:121`, the recover at `:125`. */
const WRITE_PATH = '/api/organization-contact';
/** The schedules read (`invoice-schedule.service.ts:43`), create (`:86`), change (`:101`) and delete (`:110`). */
const SCHEDULES_PATH = '/api/invoice-schedules';

const CLIENTS_PATH = '/clients';

const P_VIEW = 'ORG_CONTACT_VIEW';
const P_ADD = 'ORG_CONTACT_ADD';
const P_EDIT = 'ORG_CONTACT_EDIT';
const P_DELETE = 'ORG_CONTACT_DELETE';
/** What `invoiceAccessOf` needs before a schedule may be set (`invoice-access.ts:19-27`). */
const INVOICE_CREATE_PERMISSIONS = ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1009-1018`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** The English, copied from `locales/en.json` (the key named in each entry). */
const TEXT = {
	clientsTitle: 'Clients', // clients.TITLE
	newClient: 'New client', // clients.NEW_CLIENT
	newInvoice: 'New invoice', // invoices.NEW_INVOICE
	createTitle: 'New client', // clients.form.CREATE_TITLE
	editTitle: 'Edit client', // clients.form.EDIT_TITLE
	create: 'Create client', // clients.form.CREATE
	saveChanges: 'Save changes', // common.SAVE_CHANGES
	cancel: 'Cancel', // common.CANCEL
	close: 'Close', // common.CLOSE
	edit: 'Edit', // common.EDIT
	archive: 'Archive', // common.ARCHIVE
	restore: 'Restore', // common.RESTORE
	copyLink: 'Copy link', // common.COPY_LINK
	delete: 'Delete', // common.DELETE
	name: 'Name', // common.NAME
	email: 'Email', // common.EMAIL
	notes: 'Notes', // common.NOTES
	phone: 'Phone', // clients.form.PHONE
	nameRequired: "Enter the client's name.", // clients.form.NAME_REQUIRED
	emailInvalid: 'Enter a valid email address, or leave the field empty.', // clients.form.EMAIL_INVALID
	termsInvalid: 'Enter a number of days from 0 to 365.', // clients.form.TERMS_INVALID
	saveFailed: 'The client could not be saved. Try again.', // clients.form.SAVE_FAILED
	terms: 'Payment terms', // clients.form.PAYMENT_TERMS
	daysLabel: 'Days to pay, from 0 to 365', // clients.form.CUSTOM_DAYS_LABEL (max = clients.ts CLIENT_TERMS_MAX_DAYS)
	termsCustom: 'Custom', // the SegmentedControl choice that opens the days field
	termsHint: 'Sets the due date of the invoices made for this client.', // clients.form.TERMS_HINT
	createdToast: '{name} was added to the clients', // clients.toasts.CREATED
	archivedToast: '{name} was archived', // clients.toasts.ARCHIVED
	restoredToast: '{name} was restored', // clients.toasts.RESTORED
	archiveConfirm: 'Archive client', // clients.archive.CONFIRM
	archiveFailed: 'The client could not be archived. Try again.', // clients.archive.FAILED
	restoreConfirm: 'Restore client', // clients.restore.CONFIRM
	restoreFailed: 'The client could not be restored. Try again.', // clients.restore.FAILED
	scopeActive: 'Active', // clients.SCOPE_ACTIVE
	scopeArchived: 'Archived', // clients.SCOPE_ARCHIVED
	editContact: 'Edit contact', // clients.facts.EDIT_CONTACT
	editTerms: 'Edit payment terms', // clients.facts.EDIT_TERMS
	editNotes: 'Edit notes', // clients.facts.EDIT_NOTES
	scheduleTitle: 'Billing schedule', // invoices.schedule.TITLE
	scheduleSetUp: 'Set up a schedule', // invoices.schedule.SET_UP
	scheduleEdit: 'Edit', // invoices.schedule.EDIT
	schedulePause: 'Pause', // invoices.schedule.PAUSE
	scheduleResume: 'Resume', // invoices.schedule.RESUME
	scheduleNoneHint:
		"Make this client's invoice by itself every week, two weeks or month, from the billable time not billed yet.", // invoices.schedule.NONE_HINT
	scheduleActive: 'Active', // invoices.schedule.ACTIVE
	schedulePaused: 'Paused', // invoices.schedule.PAUSED
	scheduleNextPaused: 'No invoice is made while it is paused', // invoices.schedule.NEXT_PAUSED
	scheduleNoRuns: 'No run yet', // invoices.schedule.NO_RUNS
	scheduleFormTitle: 'Bill on a schedule', // invoices.schedule.form.CREATE_TITLE
	scheduleSave: 'Save schedule', // invoices.schedule.form.SAVE
	scheduleFrequency: 'How often', // invoices.schedule.form.FREQUENCY
	scheduleGrouping: 'Lines', // invoices.schedule.form.GROUPING
	scheduleDelivery: 'Once made', // invoices.schedule.form.DELIVERY
	scheduleDraft: 'Keep as a draft', // invoices.schedule.form.DRAFT
	scheduleSend: 'Email to the client', // invoices.schedule.form.SEND
	scheduleDraftHint: 'Each invoice waits as a draft for you to check and send.', // invoices.schedule.form.DRAFT_HINT
	scheduleDeleteTitle: 'Delete this billing schedule?', // invoices.schedule.delete.TITLE
	scheduleDeletedToast: 'billing schedule is deleted', // invoices.schedule.toasts.DELETED ("{name}'s billing schedule is deleted")
	scheduleError: 'The billing schedule could not be loaded', // invoices.schedule.ERROR
	scheduleStartDay: 'First day of the first period', // invoices.schedule.form.START_DAY
	scheduleStartInvalid: 'Pick a day.', // invoices.schedule.form.START_INVALID
	scheduleExists: 'This client already has a schedule. Close and open it again to change it.', // invoices.schedule.form.EXISTS
	scheduleDeleteBody: 'No more invoice will be made by itself for', // invoices.schedule.delete.BODY (names the client)
	scheduleDeleteStays: 'The invoices it made stay.', // invoices.schedule.delete.BODY (its second sentence)
	frequencyWeek: 'Every week', // invoices.schedule.frequency.WEEKLY
	groupingTask: 'By task', // invoices.schedule.grouping.TASK
	openClient: 'Open', // clients.OPEN_CLIENT, the archive/restore toast's way back
	scheduleToastsFailed: 'The change could not be saved. Try again.', // invoices.schedule.toasts.FAILED
	frequencyMonth: 'Every month', // invoices.schedule.frequency.MONTHLY
	groupingProject: 'By project', // invoices.schedule.grouping.PROJECT
	groupingMember: 'By member', // invoices.schedule.grouping.MEMBER
	openFullPage: 'Open full page', // recordSheet.OPEN_PAGE
	keepsProjects: 'Its projects and the time tracked on them stay as they are.', // clients.archive.KEEPS_PROJECTS
	keepsInvoices: 'Its invoices stay, and can still be sent, paid or voided.', // clients.archive.KEEPS_INVOICES
	leavesPicker: 'It is no longer offered as the client of a project.', // clients.archive.LEAVES_PICKER
	canRestore: 'You can restore it from the Archived list.', // clients.archive.CAN_RESTORE
	restoreBackInPicker: 'It is offered again as the client of a project.', // clients.restore.BACK_IN_PICKER
	restoreKeepsEverything: 'Its projects, time and invoices are as you left them.', // clients.restore.KEEPS_EVERYTHING
	emptyArchivedTitle: 'No archived clients', // clients.EMPTY_ARCHIVED_TITLE
	emptyArchivedMessage: 'A client you archive is listed here and can be restored.', // clients.EMPTY_ARCHIVED_MESSAGE
	factsAdded: 'Added', // clients.facts.ADDED
	noPhone: 'No phone', // clients.contact.NO_PHONE
	noEmail: 'No email', // clients.contact.NO_EMAIL
	previous: 'Previous', // recordSheet.PREVIOUS
	next: 'Next', // recordSheet.NEXT
	scheduleStartHint:
		"Each invoice is made the day after its period ends, in the workspace's time zone. No period that ended before today is billed.", // invoices.schedule.form.START_HINT
	scheduleDeliverySend: 'Sent to' // invoices.schedule.DELIVERY_SEND ("Sent to {email}") or DELIVERY_SEND_NO_EMAIL
};

/** The shell store's own dev noise, present in every lane-a run (`api-tokens-settings-ui.spec.ts:421`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The dev-mode mutation toast logs this for every refused write, beside the HTTP client's own line. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** One refusal this file armed, named the way its console line names it. */
type ArmedRefusal = { method: string; path: string; status: number };

/**
 * Whether a console line belongs to one armed arm. The HTTP client logs `[ERROR] [HttpClient] HTTP Error:
 * <method> <path> <status> {…}` with the API's `/api` prefix dropped and, on a read, the query kept:
 * `POST /organization-contact 400 {…}` and `GET /invoice-schedules?organizationId=…&organizationContactId=probe-alpha
 * 404 {…}` (`s3-lane-a-clientwrites-fix-1.log`). Method + path + status is what ties a line to the arm that armed it.
 */
const belongsToArm = (line: string, arm: ArmedRefusal) =>
	line.includes(`HTTP Error: ${arm.method} ${arm.path.replace(/^\/api/, '')}`) && line.includes(` ${arm.status} `);

/** Prints what one arm saw, so the run log carries the numbers its assertions are pinned on. */
const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a clients writes] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The mock's own workspace ids the writes must name (`playwright/helpers.ts:63-67`). */
const workspaceOf = (fixture: BootstrapFixture) => ({
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA
});

/* ----------------------------------------------------------------------------------------------- stand-in API */

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

type ServedSchedule = {
	id: string;
	organizationContactId: string;
	frequency: string;
	startDay: string;
	grouping: string;
	sendInvoice: boolean;
	pausedAt: string | null;
	activeSince: string;
	nextPeriod: { startDay: string; endDay: string; runDay: string } | null;
};

type ServedCall = { method: string; path: string; query: string; body: string | null };

type Script = {
	clients: ServedClient[];
	schedules?: ServedSchedule[];
	/** `METHOD path` → status: the stand-in answers that refusal and changes nothing of its own. */
	refuse?: Record<string, number>;
	/** `METHOD path` → milliseconds the stand-in holds that answer back, for a save still in flight. */
	slow?: Record<string, number>;
};

type ClientsStandIn = {
	calls: ServedCall[];
	clients: () => ServedClient[];
	schedules: () => ServedSchedule[];
	countOf: (method: string, path: string) => number;
	bodyOf: (method: string, path: string) => Record<string, unknown> | null;
	/** Everything asked from `since` on: `calls.length` before the action, so only this arm's calls count. */
	callsAfter: (since: number) => ServedCall[];
};

/**
 * The clients + schedules API this file answers, on the mock origin, because the lane mock has no handler for any of
 * it (see the header). The list answer is always the current store, so every write can be followed by the read the
 * page makes afterwards, and a refusal that changed nothing is visible as a list that still holds the client.
 */
async function serveClientsStore(page: Page, initial: Script): Promise<ClientsStandIn> {
	const clients = [...initial.clients];
	const schedules = [...(initial.schedules ?? [])];
	const calls: ServedCall[] = [];

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === READ_PATH ||
				url.pathname.startsWith(WRITE_PATH) ||
				url.pathname.startsWith(SCHEDULES_PATH)),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const path = url.pathname;
			if (method === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			calls.push({ method, path, query: url.searchParams.toString(), body: request.postData() });

			const held = initial.slow?.[`${method} ${path}`];
			if (held) await new Promise((done) => setTimeout(done, held));

			const refusal = initial.refuse?.[`${method} ${path}`] ?? initial.refuse?.[path];
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});

			if (refusal) {
				return answer(refusal, { statusCode: refusal, message: `this file refused ${method} ${path}` });
			}

			if (path === READ_PATH && method === 'GET') {
				return answer(200, { items: clients, total: clients.length });
			}
			if (path === WRITE_PATH && method === 'POST') {
				const sent = JSON.parse(String(request.postData())) as Record<string, unknown>;
				const created: ServedClient = {
					id: 'probe-written-client',
					name: String(sent.name),
					primaryEmail: (sent.primaryEmail as string | null) ?? null,
					primaryPhone: (sent.primaryPhone as string | null) ?? null,
					notes: (sent.notes as string | null) ?? null,
					contactType: 'CLIENT',
					imageUrl: null,
					contactId: null,
					organizationId: String(sent.organizationId),
					tenantId: String(sent.tenantId),
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					deletedAt: null,
					paymentTermsDays: typeof sent.paymentTermsDays === 'number' ? sent.paymentTermsDays : null
				};
				clients.push(created);
				return answer(201, created);
			}
			if (path.startsWith(`${WRITE_PATH}/`) && path !== READ_PATH) {
				const rest = path.slice(WRITE_PATH.length + 1);
				const id = rest.split('/')[0];
				const client = clients.find((candidate) => candidate.id === id);

				if (rest.endsWith('/soft') && method === 'DELETE') {
					if (client) client.deletedAt = new Date().toISOString();
					return answer(204);
				}
				if (rest.endsWith('/recover') && method === 'PUT') {
					if (client) {
						client.deletedAt = null;
						client.updatedAt = new Date().toISOString();
					}
					return answer(200, client);
				}
				if (method === 'PUT') {
					const sent = JSON.parse(String(request.postData())) as Record<string, unknown>;
					if (client) {
						client.name = String(sent.name);
						client.primaryEmail = (sent.primaryEmail as string | null) ?? null;
						client.primaryPhone = (sent.primaryPhone as string | null) ?? null;
						client.notes = (sent.notes as string | null) ?? null;
						if (typeof sent.paymentTermsDays === 'number') {
							client.paymentTermsDays = sent.paymentTermsDays;
						}
						if (sent.contact) client.contactId = String((sent.contact as { id: string }).id);
						client.updatedAt = new Date().toISOString();
					}
					return answer(200, client);
				}
			}
			if (path === SCHEDULES_PATH && method === 'GET') {
				const clientId = url.searchParams.get('organizationContactId');
				return answer(
					200,
					clientId ? schedules.filter((item) => item.organizationContactId === clientId) : schedules
				);
			}
			if (path === SCHEDULES_PATH && method === 'POST') {
				const sent = JSON.parse(String(request.postData())) as Record<string, unknown>;
				const created: ServedSchedule = {
					id: 'probe-written-schedule',
					organizationContactId: String(sent.organizationContactId),
					frequency: String(sent.frequency),
					startDay: String(sent.startDay),
					grouping: String(sent.grouping),
					sendInvoice: Boolean(sent.sendInvoice),
					pausedAt: null,
					activeSince: new Date().toISOString(),
					nextPeriod: {
						startDay: String(sent.startDay),
						endDay: String(sent.startDay),
						runDay: String(sent.startDay)
					}
				};
				schedules.push(created);
				return answer(201, created);
			}
			if (path.startsWith(`${SCHEDULES_PATH}/`)) {
				const rest = path.slice(SCHEDULES_PATH.length + 1);
				const id = rest.split('/')[0];
				if (rest.endsWith('/runs') && method === 'GET') {
					return answer(200, []);
				}
				const schedule = schedules.find((item) => item.id === id);
				if (method === 'PUT' && schedule) {
					const sent = JSON.parse(String(request.postData())) as Record<string, unknown>;
					if (typeof sent.frequency === 'string') schedule.frequency = sent.frequency;
					if (typeof sent.startDay === 'string') schedule.startDay = sent.startDay;
					if (typeof sent.grouping === 'string') schedule.grouping = sent.grouping;
					if (typeof sent.sendInvoice === 'boolean') schedule.sendInvoice = sent.sendInvoice;
					if (typeof sent.paused === 'boolean') {
						schedule.pausedAt = sent.paused ? new Date().toISOString() : null;
					}
					return answer(200, schedule);
				}
				if (method === 'DELETE') {
					const index = schedules.findIndex((item) => item.id === id);
					if (index >= 0) schedules.splice(index, 1);
					return answer(204);
				}
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		calls,
		clients: () => clients,
		schedules: () => schedules,
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		bodyOf: (method, path) => {
			const matching = calls.filter((call) => call.method === method && call.path === path);
			if (!matching.length) return null;
			return JSON.parse(String(matching[matching.length - 1].body)) as Record<string, unknown>;
		},
		callsAfter: (since) => calls.slice(since)
	};
}

/** One client, in the shape `clientSchema` keeps (`organization-contact.schema.ts:7-23`), for the store to answer with. */
const clientOf = (
	scope: { organizationId: string; tenantId: string },
	overrides: Partial<ServedClient> & { id: string; name: string }
): ServedClient => ({
	primaryEmail: null,
	primaryPhone: null,
	notes: null,
	contactType: 'CLIENT',
	imageUrl: null,
	contactId: null,
	organizationId: scope.organizationId,
	tenantId: scope.tenantId,
	createdAt: '2026-01-05T09:00:00.000Z',
	updatedAt: '2026-01-05T09:00:00.000Z',
	deletedAt: null,
	paymentTermsDays: null,
	...overrides
});

/* ----------------------------------------------------------------------------------------------- page helpers */

const byRole = (
	page: Page,
	role: 'button' | 'link' | 'menuitem' | 'region' | 'tab' | 'textbox' | 'alert',
	name?: string
) => (name === undefined ? page.getByRole(role) : page.getByRole(role, { name, exact: true }));

const nameLink = (page: Page, name: string) => byRole(page, 'link', name);
const createButton = (page: Page) => byRole(page, 'button', TEXT.newClient);
const menuTrigger = (page: Page, name: string) => byRole(page, 'button', `Actions for ${name}`);
const setUpButton = (page: Page) => byRole(page, 'button', TEXT.scheduleSetUp);

/** Routes first, then the scenario and the cookies, then the navigation (`playwright/helpers.ts:439-451`). */
async function openClients(
	page: Page,
	fixture: BootstrapFixture,
	options: { permissions: string[]; store: Script; path?: string }
): Promise<ClientsStandIn> {
	const standIn = await serveClientsStore(page, options.store);
	await signInAndVisit(page, fixture, options.path ?? CLIENTS_PATH, {
		scenario: { extraPermissions: options.permissions }
	});

	return standIn;
}

/** Opens one row's (or the header's) actions menu; Headless UI, so `Escape` and 0 `menuitem`s mean it is closed. */
async function openActionsMenu(page: Page, name: string): Promise<Page> {
	const trigger = menuTrigger(page, name);
	await expect(trigger, `the page must hold exactly one "Actions for ${name}" trigger`).toHaveCount(1);
	await trigger.first().click({ timeout: 15_000 });
	await expect(page.getByRole('menu'), 'clicking it must open exactly one menu').toHaveCount(1);

	return page;
}

async function expectMenuRows(page: Page, rows: string[]): Promise<void> {
	const menu = page.getByRole('menu').first();
	await expect(
		menu.getByRole('menuitem'),
		`the menu must hold exactly ${rows.length} row(s), i.e. ${JSON.stringify(rows)} (it says ` +
			`${JSON.stringify((await menu.allInnerTexts()).map(flat))})`
	).toHaveCount(rows.length);
	for (const row of rows) {
		await expect(
			menu.getByRole('menuitem', { name: row, exact: true }),
			`the menu must hold a "${row}" row`
		).toHaveCount(1);
	}
}

async function closeMenu(page: Page): Promise<void> {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menuitem'), 'Escape must leave no menu row on screen').toHaveCount(0);
}

const openDialog = (page: Page) => page.getByRole('dialog').first();

/**
 * The client form's text fields, each as `label|value`, so a filled-out form can be read line by line. Every callback
 * below flattens its own text: a Node helper (`flat`) is invisible inside a page callback.
 */
async function formFields(page: Page): Promise<string[]> {
	return openDialog(page)
		.locator('input, textarea')
		.evaluateAll((nodes) =>
			nodes.map((node) => {
				const field = node as HTMLInputElement;
				const label = (field.labels?.[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
				return `${label}|${field.value}`;
			})
		);
}

/**
 * The focused element of the open dialog, as `tag|label|value|initialFocus`, which is how a section's pencil is told
 * apart: the pencil marks the field it wants met first with `data-initial-focus` (`client-form-dialog.tsx:359,376,406`,
 * `client-form-dialog.tsx:158-165` for the terms choice).
 */
async function focusedField(page: Page): Promise<string> {
	return page.evaluate(() => {
		const element = document.activeElement as (HTMLElement & Partial<HTMLInputElement>) | null;
		if (!element) return 'none';
		const label = (element.labels?.[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
		// The pencil's marker is read through `dataset`, which keeps its attribute string out of this callback.
		const marked = element.dataset?.initialFocus !== undefined;
		return `${element.tagName}|${label}|${element.value ?? '-'}|initialFocus=${marked}`;
	});
}

/** The buttons of the open dialog, as `label|disabled`, which is how a save in flight is seen. */
async function dialogButtons(page: Page): Promise<string[]> {
	return openDialog(page)
		.getByRole('button')
		.evaluateAll((nodes) =>
			nodes.map((node) => {
				const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
				const label = text || `aria=${node.getAttribute('aria-label')}`;
				return `${label}|disabled=${(node as HTMLButtonElement).disabled}`;
			})
		);
}

const alerts = (page: Page) => page.getByRole('alert');

/** The client form's name / e-mail / phone / notes fields, by their measured accessible names. */
const nameField = (page: Page) => page.getByRole('textbox', { name: TEXT.name, exact: true });
const emailField = (page: Page) => page.getByRole('textbox', { name: `${TEXT.email} (optional)` });
const phoneField = (page: Page) => page.getByRole('textbox', { name: `${TEXT.phone} (optional)` });
const notesField = (page: Page) => page.getByRole('textbox', { name: `${TEXT.notes} (optional)` });
/** `client-form-dialog.tsx:194` gives the days input this aria-label; it is a text input with `inputMode="numeric"`. */
const daysField = (page: Page) => page.getByRole('textbox', { name: TEXT.daysLabel, exact: true });
const termsChoice = (page: Page, label: string) => openDialog(page).getByRole('tab', { name: label });

/** Opens the create form from the toolbar (`clients-toolbar.tsx:142-147`). */
async function openCreateForm(page: Page): Promise<void> {
	await expect(createButton(page).first(), `"${TEXT.newClient}" must be on the toolbar`).toBeVisible({
		timeout: 25_000
	});
	await createButton(page).first().click({ timeout: 15_000 });
	await expect(openDialog(page), `the create button must open the client form`).toBeVisible();
}

/** Reads the console lines the app added, minus the known dev noise and the refusals this file armed. */
function consoleFindings(shield: Shield, armed: ArmedRefusal[] = []): string[] {
	return shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !armed.some((arm) => belongsToArm(line, arm)));
}

/**
 * A toast sits over the page (`app-toaster.tsx:61,66`: `position="bottom-right"`, `duration={5000}`) and its card
 * intercepts pointer events over the client page's own buttons — measured: the Resume click was blocked by the pause
 * toast (`s3-lane-a-clientwrites-fix-1.log` W11). Letting it run out was not enough while the pointer stayed where the
 * click had landed, because a pointer resting on the bar holds the whole stack open: `…/node_modules/sonner/dist/index.js:612-616`
 * pauses every toast's countdown while `expanded`, and `:1135-1136` set `expanded` on the toaster's own `onMouseEnter`
 * / `onMouseMove`. That is why the bar was still at 1 toast after 20 s (`…-fix-2.log` W11). Closing it with its own
 * `Close toast` button does not work either — the button rides the card's enter/leave transition, and the click died on
 * `element is not stable` then `element was detached from the DOM` (`…-fix-3.log` W11).
 *
 * What works is to park the pointer in the corner far from the bar first: the toaster then gets its `mouseLeave`
 * (`:1137-1141`), each toast's countdown resumes where it stopped, and the empty bar is a web-first wait.
 * Nothing here sleeps on a toast.
 */
async function quietPage(page: Page): Promise<void> {
	const toasts = page.locator('section[aria-label="Notifications alt+T"] li');
	await page.mouse.move(2, 2);
	await expect(toasts, 'the toast bar is empty again, so the next click lands on the page').toHaveCount(0, {
		timeout: 30_000
	});
}

/* --------------------------------------------------------------------------------------------- the client form */

test.describe('lane-a · creating a client from the list (client-form-dialog.tsx, use-client-mutations.ts:57-61)', () => {
	test("W1 · the form's fields, the POST the save sends, the row that comes back", async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_ADD, P_EDIT],
			store: {
				clients: [
					clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client' }),
					clientOf(scope, { id: 'probe-beta', name: 'Beta Client', primaryEmail: 'beta@example.com' })
				]
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'both stubbed clients must be listed').toHaveCount(1);
		const before = standIn.calls.length;

		await openCreateForm(page);
		const fields = await openDialog(page)
			.locator('input, textarea')
			.evaluateAll((nodes) =>
				nodes.map((node) => {
					const field = node as HTMLInputElement;
					const label = (field.labels?.[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
					return `${field.type}|${label}|required=${field.getAttribute('aria-required')}|maxlength=${field.maxLength}|placeholder=${field.placeholder}`;
				})
			);
		const submit = byRole(page, 'button', TEXT.create);
		report('W1 form', {
			title: flat(await openDialog(page).getByRole('heading').first().innerText()),
			fields,
			submit: await submit.innerText(),
			paymentTermsChoices: await openDialog(page)
				.getByRole('tab')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|selected=${node.getAttribute(
								'aria-selected'
							)}`
					)
				)
		});
		await expect(
			openDialog(page).getByRole('textbox', { name: TEXT.name, exact: true }),
			'the name is the one field the form marks required (client-form-dialog.tsx:342)'
		).toHaveAccessibleName(TEXT.name);

		await nameField(page).fill('Zephyr Industries');
		await submit.click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('POST', WRITE_PATH), { timeout: 20_000 }).toBe(1);
		const body = standIn.bodyOf('POST', WRITE_PATH);
		report('W1 POST body', body ?? {});
		expect(
			body,
			'the body is the trimmed draft plus the workspace the form opened in (clients.ts:253-261)'
		).toEqual({
			name: 'Zephyr Industries',
			primaryEmail: null,
			primaryPhone: null,
			notes: null,
			contactType: 'CLIENT',
			organizationId: scope.organizationId,
			tenantId: scope.tenantId
		});
		expect(
			Object.keys(body ?? {}).filter((key) => key === 'paymentTermsDays'),
			'a client left on the workspace terms sends no payment terms at all (clients.ts:255-259)'
		).toEqual([]);

		await expect(openDialog(page), 'the form closes on the client as it was sent').toHaveCount(0);
		await expect(nameLink(page, 'Zephyr Industries'), 'the new client is listed').toBeVisible({ timeout: 20_000 });
		await expect
			.poll(() => standIn.callsAfter(before).filter((call) => call.method === 'GET').length, {
				message: 'a create reads every client list again (use-client-mutations.ts:60)',
				timeout: 25_000
			})
			.toBeGreaterThanOrEqual(1);
		const reads = standIn.callsAfter(before).filter((call) => call.method === 'GET');
		report('W1 reads after the save', {
			list: reads.map((call) => `${call.method} ${call.path}`),
			rows: standIn.clients().map((client) => client.name)
		});
		expect(
			standIn.clients().map((client) => client.name),
			'the stand-in holds three clients now'
		).toEqual(['Alpha Client', 'Beta Client', 'Zephyr Industries']);
		await expect(byRole(page, 'link', 'Beta Client'), 'the clients that were there are still there').toHaveCount(1);
		expect(consoleFindings(shield), 'nothing but the create itself was reported').toEqual([]);
	});

	test('W2 · what blocks a save, and what each field says', async ({ page, fixture }) => {
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_ADD],
			store: { clients: [clientOf(workspaceOf(fixture), { id: 'probe-alpha', name: 'Alpha Client' })] }
		});
		await expect(nameLink(page, 'Alpha Client'), 'the list must be settled before the form opens').toBeVisible({
			timeout: 25_000
		});

		// An empty name: the save is refused in the form, and nothing is sent.
		await openCreateForm(page);
		await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
		await expect(alerts(page), 'the name says what it needs').toHaveCount(1);
		await expect(alerts(page).first()).toHaveText(TEXT.nameRequired);
		report('W2 empty name', {
			alerts: (await alerts(page).allInnerTexts()).map(flat),
			ariaInvalid: await nameField(page).getAttribute('aria-invalid'),
			posts: standIn.countOf('POST', WRITE_PATH)
		});
		await expect(nameField(page), 'the field itself is marked invalid').toHaveAttribute('aria-invalid', 'true');
		expect(standIn.countOf('POST', WRITE_PATH), 'a refused form never reaches the API').toBe(0);

		// A malformed e-mail.
		await nameField(page).fill('Zephyr Industries');
		await emailField(page).fill('not-an-email');
		await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
		await expect(alerts(page).first(), 'the e-mail says what it needs').toHaveText(TEXT.emailInvalid);
		report('W2 bad email', {
			alerts: (await alerts(page).allInnerTexts()).map(flat),
			ariaInvalid: await emailField(page).getAttribute('aria-invalid'),
			posts: standIn.countOf('POST', WRITE_PATH)
		});
		await expect(emailField(page), 'and is marked invalid').toHaveAttribute('aria-invalid', 'true');

		// A phone the form does not check at all: it is sent as it was typed (`clients.ts:197-210` checks name and
		// e-mail only), cut at the field's own 50 characters.
		const phone = 'n'.repeat(400);
		await emailField(page).fill('zephyr@example.com');
		await phoneField(page).fill(phone);
		await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('POST', WRITE_PATH), { timeout: 20_000 }).toBe(1);
		const sentBody = standIn.bodyOf('POST', WRITE_PATH);
		report('W2 phone sent as typed', {
			alerts: (await alerts(page).allInnerTexts()).map(flat),
			phoneSent: sentBody?.primaryPhone,
			phoneLength: String(sentBody?.primaryPhone ?? '').length
		});
		expect(
			sentBody?.primaryPhone,
			'the phone is sent unchecked (validateClientDraft knows no phone) and truncated'
		).toBe('n'.repeat(50));

		// Custom terms the form will not read.
		await openCreateForm(page);
		await termsChoice(page, 'Custom').click({ timeout: 15_000 });
		await expect(daysField(page), 'Custom opens a field for the days in place').toBeVisible();
		await nameField(page).fill('Zephyr Two');
		await daysField(page).fill('400');
		await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
		await expect(alerts(page).first(), 'the days say what they need').toHaveText(TEXT.termsInvalid);
		report('W2 custom days refused', {
			alerts: (await alerts(page).allInnerTexts()).map(flat),
			posts: standIn.countOf('POST', WRITE_PATH)
		});
		expect(standIn.countOf('POST', WRITE_PATH), 'and nothing was sent').toBe(1);

		await daysField(page).fill('45');
		await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('POST', WRITE_PATH), { timeout: 20_000 }).toBe(2);
		const termsBody = standIn.bodyOf('POST', WRITE_PATH);
		report('W2 custom days 45', { paymentTermsDays: termsBody?.paymentTermsDays });
		expect(termsBody?.paymentTermsDays, 'readable days are sent as a number').toBe(45);
	});

	test('W3 · a create the server refuses: 400 and 500 both leave the form on the screen', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const saw: Record<number, { alerts: string[]; dialog: number; posts: number; clients: string[] }> = {};
		for (const status of [400, 500]) {
			const standIn = await openClients(page, fixture, {
				permissions: [P_VIEW, P_ADD],
				store: {
					clients: [clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client' })],
					refuse: { [`POST ${WRITE_PATH}`]: status }
				}
			});
			await expect(nameLink(page, 'Alpha Client'), 'the list must be settled before the form opens').toBeVisible({
				timeout: 25_000
			});
			await openCreateForm(page);
			await nameField(page).fill(`Refused ${status}`);
			await byRole(page, 'button', TEXT.create).click({ timeout: 15_000 });
			await expect(alerts(page).first(), `a ${status} answer says it in the form`).toHaveText(TEXT.saveFailed);
			saw[status] = {
				alerts: (await alerts(page).allInnerTexts()).map(flat),
				dialog: await openDialog(page).count(),
				posts: standIn.countOf('POST', WRITE_PATH),
				clients: standIn.clients().map((client) => client.name)
			};
			report(`W3 ${status}`, {
				...saw[status],
				fieldsEditable: await openDialog(page)
					.locator('input, textarea')
					.evaluateAll((nodes) =>
						nodes.map(
							(node) => `${(node as HTMLInputElement).readOnly}|${(node as HTMLInputElement).value}`
						)
					),
				buttons: await dialogButtons(page),
				consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
			});
			await expect(
				byRole(page, 'button', TEXT.create),
				'the save is offered again, not left locked on the answer (client-form-dialog.tsx:258,418-422)'
			).toBeEnabled();
			await expect(openDialog(page), `a ${status} answer keeps the form open so it can be corrected`).toHaveCount(
				1
			);
			expect(
				standIn.clients().map((client) => client.name),
				'the refused create added no client to the store the next read answers from'
			).toEqual(['Alpha Client']);
			await expect(
				openDialog(page).locator('input, textarea'),
				'and its fields are editable again (client-form-dialog.tsx:258, client-form-dialog.test.tsx:179-194)'
			).toHaveCount(4);
			await expect(
				openDialog(page).locator('input[readonly], textarea[readonly]'),
				'none of them is still locked'
			).toHaveCount(0);
			await expect(byRole(page, 'button', TEXT.cancel), 'Cancel is offered again').toBeEnabled();
			await byRole(page, 'button', TEXT.cancel).click({ timeout: 15_000 });
			await expect(openDialog(page), 'which closes it').toHaveCount(0);
		}
		expect(
			[
				{ ...saw[400], clients: saw[400].clients.length },
				{ ...saw[500], clients: saw[500].clients.length }
			],
			'a 400 and a 500 are answered with the same words, the open form and no client (client-form-dialog.tsx:312-314)'
		).toEqual([
			{ alerts: [TEXT.saveFailed], dialog: 1, posts: 1, clients: 1 },
			{ alerts: [TEXT.saveFailed], dialog: 1, posts: 1, clients: 1 }
		]);
		// Both arms armed their own refusal, so each is excused by its own status; the run log carries both lines.
		const armed: ArmedRefusal[] = [
			{ method: 'POST', path: WRITE_PATH, status: 400 },
			{ method: 'POST', path: WRITE_PATH, status: 500 }
		];
		expect(
			consoleFindings(shield, armed),
			`only the two armed refusals may be reported (${JSON.stringify(shield.consoleErrors().map((line) => line.slice(0, 90)))})`
		).toEqual([]);
	});
});

/* ------------------------------------------------------------------------------------- the saved client's page */

/** One row's (or the header's) actions menu, used on one row, closed afterwards. */
async function openRowAction(page: Page, name: string, action: string): Promise<void> {
	await openActionsMenu(page, name);
	await page
		.getByRole('menu')
		.first()
		.getByRole('menuitem', { name: action, exact: true })
		.click({ timeout: 15_000 });
	await expect(page.getByRole('menuitem'), 'a menu closes on the row it was used on').toHaveCount(0);
}

/** The scope tabs and the table/cards tabs are all `role="tab"`; the scope ones carry their count in their text. */
async function tabsReport(page: Page): Promise<string[]> {
	return page
		.getByRole('tab')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) =>
					`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|selected=${node.getAttribute('aria-selected')}`
			)
		);
}

/** A listed client's whole row, as one line. */
async function rowText(page: Page, name: string): Promise<string> {
	return flat(await nameLink(page, name).first().locator('xpath=ancestor::li').innerText());
}

/** The archive / restore confirmation is a `ProjectConfirmDialog`: its role is `dialog`, not `alertdialog` (measured `alertdialog` 0 / `dialog` 1, s3-lane-a-clientwrites-fix-1.log W6). */
const clientConfirm = (page: Page) => page.getByRole('dialog').first();
/** The schedule's delete confirmation is an `AlertDialogConfirmation`, which does carry role `alertdialog` (measured in …probe-4.log S1). */
const alertConfirm = (page: Page) => page.getByRole('alertdialog').first();

/** The client form's payment terms choices, as `label|selected`. */
const termsChoices = (page: Page) =>
	openDialog(page)
		.getByRole('tab')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) =>
					`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|selected=${node.getAttribute('aria-selected')}`
			)
		);

const dialogTab = (page: Page, label: string) => openDialog(page).getByRole('tab', { name: label, exact: true });

/** The `First day of the first period` field: a text input holding the day in the browser's own shape. */
const startDayField = (page: Page) => page.getByRole('textbox', { name: TEXT.scheduleStartDay, exact: true }).first();

/* --------------------------------------------------------------------------------------------- a client's row */

test.describe('lane-a · editing a saved client (client-form-dialog.tsx, clients.ts:253-293)', () => {
	test("W4 · the row menu's Edit: the prefilled form, the PUT it sends, the row after", async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT],
			store: {
				clients: [
					clientOf(scope, {
						id: 'probe-alpha',
						name: 'Alpha Client',
						primaryEmail: 'alpha@example.com',
						primaryPhone: '+1 555 0100',
						notes: 'Monthly retainer.',
						paymentTermsDays: 14,
						contactId: 'probe-contact-1'
					})
				]
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'the client to edit must be listed').toBeVisible({
			timeout: 25_000
		});
		await openRowAction(page, 'Alpha Client', TEXT.edit);
		await expect(openDialog(page), 'the Edit row opens the client form').toHaveCount(1);
		await expect(
			openDialog(page).getByRole('heading', { name: TEXT.editTitle, exact: true }),
			`and it says ${TEXT.editTitle}`
		).toBeVisible();
		report('W4 prefilled form', {
			fields: await formFields(page),
			termsChoices: await termsChoices(page),
			focused: await focusedField(page)
		});
		await expect(nameField(page), 'the name comes in as it is saved').toHaveValue('Alpha Client');
		await expect(emailField(page), 'so does the e-mail').toHaveValue('alpha@example.com');
		await expect(phoneField(page), 'so does the phone').toHaveValue('+1 555 0100');
		await expect(notesField(page), 'so do the notes').toHaveValue('Monthly retainer.');
		await expect(
			termsChoice(page, TEXT.termsCustom),
			'14 days is not a listed choice, so it reads as Custom'
		).toHaveAttribute('aria-selected', 'true');
		await expect(daysField(page), 'and the days field holds it').toHaveValue('14');

		const before = standIn.calls.length;
		await nameField(page).fill('Alpha Client Renamed');
		await byRole(page, 'button', TEXT.saveChanges).click({ timeout: 15_000 });
		const editPath = `${WRITE_PATH}/probe-alpha`;
		await expect
			.poll(() => standIn.countOf('PUT', editPath), {
				message: 'the save asked for the client to be updated',
				timeout: 25_000
			})
			.toBe(1);
		const body = standIn.bodyOf('PUT', editPath);
		report('W4 PUT body', body ?? {});
		expect(
			body,
			'the body is the whole draft plus the stored contact, and no payment terms because they did not change (clients.ts:279-293)'
		).toEqual({
			name: 'Alpha Client Renamed',
			primaryEmail: 'alpha@example.com',
			primaryPhone: '+1 555 0100',
			notes: 'Monthly retainer.',
			contactType: 'CLIENT',
			contact: { id: 'probe-contact-1' },
			organizationId: scope.organizationId,
			tenantId: scope.tenantId
		});
		await expect(openDialog(page), 'the form closes on the client as it was sent').toHaveCount(0, {
			timeout: 25_000
		});
		await expect(nameLink(page, 'Alpha Client Renamed'), 'and the row carries the new name').toBeVisible({
			timeout: 25_000
		});
		await expect(nameLink(page, 'Alpha Client'), 'the old name is gone').toHaveCount(0);
		await expect
			.poll(() => standIn.callsAfter(before).filter((call) => call.method === 'GET').length, {
				message: 'an edit reads the clients again (use-client-mutations.ts:66-70)',
				timeout: 25_000
			})
			.toBeGreaterThanOrEqual(1);
		report('W4 after the save', {
			calls: standIn.callsAfter(before).map((call) => `${call.method} ${call.path}`),
			store: standIn.clients().map((client) => `${client.name}|terms=${client.paymentTermsDays}`)
		});
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});
});

test.describe("lane-a · the client's own page (client-header.tsx, client-facts.tsx)", () => {
	test('W5 · the header Edit and the three pencils: what each opens and what each save sends', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT],
			path: '/clients/probe-alpha',
			store: {
				clients: [
					clientOf(scope, {
						id: 'probe-alpha',
						name: 'Alpha Client',
						primaryEmail: 'alpha@example.com',
						primaryPhone: '+1 555 0100',
						notes: 'Monthly retainer.',
						paymentTermsDays: 21
					})
				]
			}
		});
		await expect(page.getByRole('heading', { name: 'Alpha Client', exact: true }).first()).toBeVisible({
			timeout: 25_000
		});

		// All four open the same form; only the field it wants met first differs (measured in s3-lane-a-clientwrites-probe-2.log Q5).
		const openings: { label: string; focus: RegExp; why: string }[] = [
			{
				label: TEXT.edit,
				focus: /^INPUT\|Name\|Alpha Client\|.*initialFocus=true/,
				why: 'the header Edit opens it on the name'
			},
			{
				label: TEXT.editContact,
				focus: /^INPUT\|Email \(optional\)\|alpha@example\.com\|.*initialFocus=true/,
				why: 'the contact pencil opens it on the e-mail'
			},
			{
				label: TEXT.editTerms,
				focus: /^BUTTON\|\|.*initialFocus=true/,
				why: 'the terms pencil opens it on the picked choice, not on a text field'
			},
			{
				label: TEXT.editNotes,
				focus: /^TEXTAREA\|Notes \(optional\)\|Monthly retainer\.\|.*initialFocus=true/,
				why: 'the notes pencil opens it on the notes'
			}
		];
		for (const opening of openings) {
			await byRole(page, 'button', opening.label).first().click({ timeout: 15_000 });
			await expect(openDialog(page), `"${opening.label}" must open the client form`).toHaveCount(1);
			const focused = await focusedField(page);
			report(`W5 opened by ${opening.label}`, {
				focused,
				title: flat(await openDialog(page).getByRole('heading').first().innerText())
			});
			expect(focused, opening.why).toMatch(opening.focus);
			await byRole(page, 'button', TEXT.cancel).click({ timeout: 15_000 });
			await expect(openDialog(page), 'and Cancel closes it again').toHaveCount(0, { timeout: 25_000 });
		}

		const editPath = `${WRITE_PATH}/probe-alpha`;
		const sentTerms = () => standIn.bodyOf('PUT', editPath)?.paymentTermsDays;

		// The contact pencil's save: only the e-mail moved, and with no stored contact there is nothing to name.
		await byRole(page, 'button', TEXT.editContact).click({ timeout: 15_000 });
		await emailField(page).fill('alpha@renamed.example');
		await byRole(page, 'button', TEXT.saveChanges).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('PUT', editPath), { timeout: 25_000 }).toBe(1);
		report('W5 the contact pencil saved', standIn.bodyOf('PUT', editPath) ?? {});
		expect(
			standIn.bodyOf('PUT', editPath),
			'the whole draft is sent, the stored contact is not named because this client has none (clients.ts:285-287)'
		).toEqual({
			name: 'Alpha Client',
			primaryEmail: 'alpha@renamed.example',
			primaryPhone: '+1 555 0100',
			notes: 'Monthly retainer.',
			contactType: 'CLIENT',
			organizationId: scope.organizationId,
			tenantId: scope.tenantId
		});
		await expect(
			page.getByText('alpha@renamed.example', { exact: true }).first(),
			'and the page reads the new e-mail back'
		).toBeVisible({ timeout: 25_000 });

		// The terms pencil's save: 21 days saved, 45 typed, so the change is what goes.
		await byRole(page, 'button', TEXT.editTerms).click({ timeout: 15_000 });
		await termsChoice(page, TEXT.termsCustom).click({ timeout: 15_000 });
		await expect(daysField(page), 'Custom opens a field for the days in place').toBeVisible({ timeout: 15_000 });
		await daysField(page).fill('45');
		await byRole(page, 'button', TEXT.saveChanges).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('PUT', editPath), { timeout: 25_000 }).toBe(2);
		report('W5 the terms pencil saved', {
			body: standIn.bodyOf('PUT', editPath) ?? {},
			savedTerms: standIn.clients()[0]?.paymentTermsDays
		});
		expect(sentTerms(), 'a changed payment terms value is sent (clients.ts:263-273)').toBe(45);
		await expect(
			page.getByText('Net 45 days', { exact: true }).first(),
			'and the page reads the new terms back'
		).toBeVisible({ timeout: 25_000 });

		// The notes pencil's save: terms are back to what they are saved as, so they are not sent again.
		await byRole(page, 'button', TEXT.editNotes).click({ timeout: 15_000 });
		await notesField(page).fill('Retainer, renewed.');
		await byRole(page, 'button', TEXT.saveChanges).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('PUT', editPath), { timeout: 25_000 }).toBe(3);
		const lastBody = standIn.bodyOf('PUT', editPath);
		report('W5 the notes pencil saved', lastBody ?? {});
		expect(lastBody?.notes, 'the notes went as typed').toBe('Retainer, renewed.');
		expect(
			lastBody ? Object.keys(lastBody).filter((key) => key === 'paymentTermsDays') : [],
			'terms left unchanged are not sent (changedTermsDaysOf, clients.ts:263-273)'
		).toEqual([]);
		await expect(
			page.getByText('Retainer, renewed.', { exact: true }).first(),
			'and the notes show on the page'
		).toBeVisible({ timeout: 25_000 });
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});
});

/* ---------------------------------------------------------------------------- archiving and restoring a client */

test.describe('lane-a · archiving and restoring (client-actions-menu.tsx, client-confirm-dialogs.tsx, organization-contact.service.ts:120-126)', () => {
	const softOf = (id: string) => `${WRITE_PATH}/${id}/soft`;
	const recoverOf = (id: string) => `${WRITE_PATH}/${id}/recover`;

	test('W6 · archive from a row: the confirmation, the dialog locked on its request, the DELETE, the row gone', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const softPath = softOf('probe-alpha');
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT, P_DELETE],
			store: {
				clients: [
					clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client', primaryEmail: 'alpha@example.com' }),
					clientOf(scope, { id: 'probe-beta', name: 'Beta Client' })
				],
				// Held for 1.5 s so the dialog can be met while its request is still running.
				slow: { [`DELETE ${softPath}`]: 1500 }
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'both clients must be listed').toBeVisible({ timeout: 25_000 });
		report('W6 before', {
			tabs: await tabsReport(page),
			toolbar: flat(await page.locator('body').innerText()).match(/\d+ clients?/)
		});

		await openRowAction(page, 'Alpha Client', TEXT.archive);
		await expect(clientConfirm(page), 'the Archive row opens a confirmation').toHaveCount(1);
		report('W6 confirmation', {
			title: flat(await clientConfirm(page).getByRole('heading').first().innerText()),
			consequences: (await clientConfirm(page).locator('li').allInnerTexts()).map(flat),
			buttons: await clientConfirm(page)
				.getByRole('button')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim() || `aria=${node.getAttribute('aria-label')}`}|disabled=${(node as HTMLButtonElement).disabled}`
					)
				)
		});
		await expect(
			clientConfirm(page).getByRole('heading', { name: 'Archive Alpha Client?', exact: true }),
			'it names the client'
		).toBeVisible();
		for (const consequence of [TEXT.keepsProjects, TEXT.keepsInvoices, TEXT.leavesPicker, TEXT.canRestore]) {
			await expect(
				clientConfirm(page).getByText(consequence, { exact: true }),
				`it states "${consequence}" (client-confirm-dialogs.tsx:81-86)`
			).toBeVisible();
		}

		const before = standIn.calls.length;
		await clientConfirm(page).getByRole('button', { name: TEXT.archiveConfirm, exact: true }).click({
			timeout: 15_000
		});
		await expect
			.poll(() => standIn.countOf('DELETE', softPath), {
				message: 'the confirmation asks for the soft delete',
				timeout: 25_000
			})
			.toBe(1);
		report('W6 while the delete runs', {
			softQuery: standIn.calls.find((call) => call.method === 'DELETE')?.query,
			buttons: await clientConfirm(page)
				.getByRole('button')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim() || `aria=${node.getAttribute('aria-label')}`}|disabled=${(node as HTMLButtonElement).disabled}`
					)
				)
		});
		await expect(
			clientConfirm(page).getByRole('button', { name: TEXT.cancel, exact: true }),
			'a dialog left while its request runs would close whichever dialog answers (client-confirm-dialogs.tsx:24-31)'
		).toBeDisabled();
		await expect(
			clientConfirm(page).getByRole('button', { name: TEXT.archiveConfirm, exact: true }),
			'and it cannot be confirmed twice'
		).toBeDisabled();

		await expect(page.getByRole('dialog'), 'the answer closes it, once').toHaveCount(0, { timeout: 25_000 });
		await expect
			.poll(() => standIn.callsAfter(before).filter((call) => call.method === 'GET').length, {
				message: 'an archive reads the clients again (use-client-mutations.ts:72-78)',
				timeout: 25_000
			})
			.toBeGreaterThanOrEqual(1);
		report('W6 after the answer', {
			calls: standIn.callsAfter(before).map((call) => `${call.method} ${call.path}`),
			store: standIn.clients().map((client) => `${client.name}|deletedAt=${client.deletedAt ? 'set' : 'null'}`),
			tabs: await tabsReport(page),
			body: flat(await page.locator('body').innerText()).slice(-260)
		});
		await expect(nameLink(page, 'Alpha Client'), 'the archived client leaves the active list').toHaveCount(0);
		await expect(nameLink(page, 'Beta Client'), 'the client that was not archived stays').toHaveCount(1);
		await expect(page.getByRole('tab', { name: /^Archived/ }), 'and the Archived tab counts it').toHaveText(
			/Archived\s*1/
		);
		expect(
			standIn.clients().map((client) => `${client.name}|deletedAt=${client.deletedAt ? 'set' : 'null'}`),
			'the stand-in only knows it as deleted by the soft delete it answered'
		).toEqual(['Alpha Client|deletedAt=set', 'Beta Client|deletedAt=null']);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('W7 · restoring an archived client from the Archived list', async ({ page, fixture, shield }) => {
		const scope = workspaceOf(fixture);
		const recoverPath = recoverOf('probe-alpha');
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT, P_DELETE],
			path: `${CLIENTS_PATH}?archived=true`,
			store: {
				clients: [
					clientOf(scope, {
						id: 'probe-alpha',
						name: 'Alpha Client',
						primaryEmail: 'alpha@example.com',
						deletedAt: '2026-11-01T09:00:00.000Z'
					}),
					clientOf(scope, { id: 'probe-beta', name: 'Beta Client' })
				]
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'the archived list opened straight from the URL').toBeVisible({
			timeout: 25_000
		});
		report('W7 archived scope', {
			url: page.url(),
			tabs: await tabsReport(page),
			row: await rowText(page, 'Alpha Client'),
			listQuery: standIn.calls.find((call) => call.method === 'GET')?.query
		});
		await expect(
			page.getByRole('tab', { name: /^Archived/ }),
			'the Archived tab is the picked one'
		).toHaveAttribute('aria-selected', 'true');

		const before = standIn.calls.length;
		await openRowAction(page, 'Alpha Client', TEXT.restore);
		await expect(clientConfirm(page), 'an archived row offers only Restore').toHaveCount(1);
		await expect(
			clientConfirm(page).getByRole('heading', { name: 'Restore Alpha Client?', exact: true })
		).toBeVisible();
		await expect(clientConfirm(page).getByText(TEXT.restoreBackInPicker, { exact: true })).toBeVisible();
		await expect(clientConfirm(page).getByText(TEXT.restoreKeepsEverything, { exact: true })).toBeVisible();
		await clientConfirm(page).getByRole('button', { name: TEXT.restoreConfirm, exact: true }).click({
			timeout: 15_000
		});
		await expect
			.poll(() => standIn.countOf('PUT', recoverPath), {
				message: 'the confirmation asks for the recover',
				timeout: 25_000
			})
			.toBe(1);
		report('W7 restore calls', {
			recoverQuery: standIn.calls.find((call) => call.method === 'PUT')?.query,
			callsAfter: standIn.callsAfter(before).map((call) => `${call.method} ${call.path}`),
			store: standIn.clients().map((client) => `${client.name}|deletedAt=${client.deletedAt ? 'set' : 'null'}`)
		});
		await expect(page.getByRole('dialog'), 'the answer closes it').toHaveCount(0, { timeout: 25_000 });
		await expect(nameLink(page, 'Alpha Client'), 'and it leaves the archived list').toHaveCount(0);
		await expect(
			page.getByText(TEXT.emptyArchivedTitle, { exact: true }),
			'the archived list says it is empty now'
		).toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(TEXT.emptyArchivedMessage, { exact: true })).toBeVisible();
		await expect
			.poll(() => standIn.callsAfter(before).filter((call) => call.method === 'GET').length, {
				message: 'a restore reads the clients again (use-client-mutations.ts:72-78)',
				timeout: 25_000
			})
			.toBeGreaterThanOrEqual(1);
		await expect(
			page.getByRole('tab', { name: /^Active/ }),
			'the restored client is counted as active again'
		).toHaveText(/Active\s*2/);
		expect(
			standIn.clients().map((client) => `${client.name}|deletedAt=${client.deletedAt ? 'set' : 'null'}`),
			'the recover cleared the deletion the soft delete set'
		).toEqual(['Alpha Client|deletedAt=null', 'Beta Client|deletedAt=null']);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('W13 · an archive the server refuses: the confirmation says it failed and keeps the client', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const softPath = softOf('probe-alpha');
		const standIn = await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT, P_DELETE],
			store: {
				clients: [clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client' })],
				refuse: { [`DELETE ${softPath}`]: 500 }
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'the client to archive must be listed').toBeVisible({
			timeout: 25_000
		});
		await openRowAction(page, 'Alpha Client', TEXT.archive);
		await clientConfirm(page).getByRole('button', { name: TEXT.archiveConfirm, exact: true }).click({
			timeout: 15_000
		});
		await expect
			.poll(() => standIn.countOf('DELETE', softPath), {
				message: 'the refusal still answered a delete request',
				timeout: 25_000
			})
			.toBe(1);
		await expect(
			clientConfirm(page).getByRole('alert').first(),
			'a refused archive says it inside the confirmation (client-confirm-dialogs.tsx:92-95, project-confirm-dialog.tsx:216-218)'
		).toHaveText(TEXT.archiveFailed, { timeout: 25_000 });
		report('W13 refused archive', {
			alerts: (await clientConfirm(page).getByRole('alert').allInnerTexts()).map(flat),
			confirmations: await page.getByRole('dialog').count(),
			store: standIn.clients().map((client) => `${client.name}|deletedAt=${client.deletedAt ? 'set' : 'null'}`),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		await expect(clientConfirm(page), 'the confirmation stays open so it can be tried again').toHaveCount(1);
		expect(standIn.clients()[0]?.deletedAt, 'the client was not archived').toBeNull();
		await clientConfirm(page).getByRole('button', { name: TEXT.cancel, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('dialog'), 'and Cancel closes it once nothing is running').toHaveCount(0, {
			timeout: 25_000
		});
		// Only after the dialog is gone can the list behind it be read at all: an open modal dialog leaves the rest of
		// the page inert, which is what measured `getByRole('link')` as 0 while the confirmation was still open.
		await expect(nameLink(page, 'Alpha Client'), 'and the client is still listed').toHaveCount(1);
		expect(
			consoleFindings(shield, [{ method: 'DELETE', path: softPath, status: 500 }]),
			`only the armed refusal may be reported (${JSON.stringify(shield.consoleErrors().map((line) => line.slice(0, 90)))})`
		).toEqual([]);
	});
});

/* ------------------------------------------------------------------------------ the archived client's own page */

test.describe('lane-a · an archived client on its own page (client-header.tsx:90, client-facts.tsx:180)', () => {
	test('W8 · the Archived chip, nothing left to edit, and the Restore row', async ({ page, fixture, shield }) => {
		const scope = workspaceOf(fixture);
		await openClients(page, fixture, {
			permissions: [P_VIEW, P_ADD, P_EDIT, P_DELETE],
			path: '/clients/probe-alpha',
			store: {
				clients: [
					clientOf(scope, {
						id: 'probe-alpha',
						name: 'Alpha Client',
						primaryEmail: 'alpha@example.com',
						notes: 'Old retainer.',
						paymentTermsDays: 30,
						deletedAt: '2026-11-01T09:00:00.000Z'
					})
				]
			}
		});
		await expect(page.getByRole('heading', { name: 'Alpha Client', exact: true }).first()).toBeVisible({
			timeout: 25_000
		});
		report('W8 the page of an archived client', {
			archivedMatches: await page.getByText(TEXT.scopeArchived, { exact: true }).count(),
			edit: await byRole(page, 'button', TEXT.edit).count(),
			pencils: {
				contact: await byRole(page, 'button', TEXT.editContact).count(),
				terms: await byRole(page, 'button', TEXT.editTerms).count(),
				notes: await byRole(page, 'button', TEXT.editNotes).count()
			},
			newInvoice: await byRole(page, 'link', TEXT.newInvoice).count(),
			scheduleSection: await page.locator('section[aria-label="Billing schedule"]').count(),
			facts: flat(await page.locator('body').innerText()).match(/No email|No phone|Archived/g),
			body: flat(await page.locator('body').innerText()).slice(-420)
		});
		await expect(
			page.getByText(TEXT.scopeArchived, { exact: true }).first(),
			'the header says it is archived'
		).toBeVisible();
		await expect(
			byRole(page, 'button', TEXT.edit),
			'the Edit button is gone (client-header.tsx:90: canEdit and not archived)'
		).toHaveCount(0);
		for (const pencil of [TEXT.editContact, TEXT.editTerms, TEXT.editNotes]) {
			await expect(
				byRole(page, 'button', pencil),
				`and so is the "${pencil}" pencil (client-facts.tsx:180: mayEdit needs a client that is not archived)`
			).toHaveCount(0);
		}
		await expect(page.getByText('Old retainer.', { exact: true }), 'what it holds is still shown').toBeVisible();
		await expect(
			page.getByText(TEXT.noPhone, { exact: true }),
			'a missing value reads as none, with no button to add it'
		).toBeVisible();
		await expect(
			page.getByText(TEXT.factsAdded, { exact: true }).first(),
			'the Details section names when it was added'
		).toBeVisible();

		await openActionsMenu(page, 'Alpha Client');
		await expectMenuRows(page, [TEXT.copyLink, TEXT.restore]);
		await closeMenu(page);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});
});

/* ------------------------------------------------------------------------------------------- the client sheet */

test.describe('lane-a · the client sheet a list row opens (use-client-peek.ts, record-sheet)', () => {
	test('W9 · a plain click on the row name opens the sheet over the list', async ({ page, fixture, shield }) => {
		const scope = workspaceOf(fixture);
		await openClients(page, fixture, {
			permissions: [P_VIEW, P_EDIT, P_DELETE],
			store: {
				clients: [
					clientOf(scope, {
						id: 'probe-alpha',
						name: 'Alpha Client',
						primaryEmail: 'alpha@example.com',
						notes: 'Old retainer.'
					}),
					clientOf(scope, { id: 'probe-beta', name: 'Beta Client' })
				]
			}
		});
		await expect(nameLink(page, 'Alpha Client'), 'the list must be settled first').toBeVisible({ timeout: 25_000 });
		await nameLink(page, 'Alpha Client').first().click({ timeout: 15_000 });
		const sheet = page.getByRole('dialog').first();
		await expect(sheet, 'the click opens a sheet instead of a page').toHaveCount(1);
		// The sheet body is mounted lazily (`use-client-peek.ts` + `dynamic()`): its Edit button is the sign the facts loaded.
		await expect(
			sheet.getByRole('button', { name: TEXT.edit, exact: true }),
			'the sheet holds the same Edit the page holds'
		).toBeVisible({ timeout: 30_000 });
		report('W9 the sheet', {
			url: page.url(),
			heading: await sheet.getByRole('heading').first().innerText(),
			text: flat(await sheet.innerText()),
			links: await sheet
				.getByRole('link')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim() || '-'}|href=${node.getAttribute('href')}|aria=${node.getAttribute('aria-label') ?? '-'}`
					)
				),
			buttons: await sheet
				.getByRole('button')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim() || '-'}|aria=${node.getAttribute('aria-label') ?? '-'}`
					)
				)
		});
		await expect(page, 'the list stays where it was').toHaveURL(/\/clients$/);
		await expect(sheet.getByRole('heading').first()).toHaveText('Alpha Client');
		await expect(sheet.getByRole('link', { name: TEXT.openFullPage, exact: true })).toHaveAttribute(
			'href',
			'/clients/probe-alpha'
		);
		await expect(sheet.getByText('Old retainer.', { exact: true })).toBeVisible();
		await expect(sheet, 'its bar counts the two clients the list holds').toHaveText(/1 of 2/);
		for (const barButton of [TEXT.previous, TEXT.next, TEXT.close]) {
			await expect(
				sheet.getByRole('button', { name: barButton, exact: true }),
				`the bar offers "${barButton}"`
			).toHaveCount(1);
		}
		await sheet.getByRole('button', { name: TEXT.close, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('dialog'), 'Close takes the sheet away').toHaveCount(0, { timeout: 25_000 });
		await expect(nameLink(page, 'Beta Client'), 'and leaves the list as it was').toHaveCount(1);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});
});

/* -------------------------------------------------------------------------------- the client's billing schedule */

test.describe("lane-a · the client's billing schedule (client-billing-schedule-section.tsx, invoice-schedule-dialog.tsx, invoice-schedule.service.ts:34-112)", () => {
	/**
	 * The section is a `<section aria-label>`, and `getByRole('region', {name:'Billing schedule'})` matched **none** of
	 * it while this very element matched one (`regionRoleCount 0` vs `sectionTagCount 1`,
	 * `s3-lane-a-clientwrites-probe-4.log` S2) — so the attribute locator is the one this file drives.
	 */
	const section = (page: Page) => page.locator('section[aria-label="Billing schedule"]');
	const sectionText = async (page: Page) => flat(await section(page).first().innerText());
	const sectionButton = (page: Page, label: string) =>
		section(page).getByRole('button', { name: label, exact: true });

	/** The client page the schedule arms run on, armed with what `invoiceAccessOf` needs to offer the controls. */
	const SCHEDULE_SCOPE = {
		permissions: [P_VIEW, P_EDIT, ...INVOICE_CREATE_PERMISSIONS],
		path: '/clients/probe-alpha'
	};

	test('W10 · setting a schedule up: the form, its defaults, the POST it sends, the section after', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			...SCHEDULE_SCOPE,
			store: {
				clients: [
					clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client', primaryEmail: 'alpha@example.com' })
				],
				schedules: []
			}
		});
		await expect(page.getByRole('heading', { name: 'Alpha Client', exact: true }).first()).toBeVisible({
			timeout: 25_000
		});
		// The schedules read starts only once the shell has settled (`use-invoice-schedules.ts:38-45`), so the section
		// takes its time: 60 s is what the probes needed before it answered with anything.
		await expect(section(page), 'the client page holds a billing schedule section').toHaveCount(1, {
			timeout: 60_000
		});
		await expect(setUpButton(page), 'a client with no schedule offers to set one up').toBeVisible({
			timeout: 60_000
		});
		report('W10 the section before', {
			text: await sectionText(page),
			aria: await page.evaluate(() =>
				Array.from(document.querySelectorAll('section[aria-label], [role="region"]')).map(
					(node) => `${node.tagName}|aria=${node.getAttribute('aria-label') ?? '-'}`
				)
			)
		});
		await expect(
			section(page).getByText(TEXT.scheduleNoneHint, { exact: true }),
			'the section says what a schedule would do'
		).toBeVisible();

		await setUpButton(page).click({ timeout: 15_000 });
		await expect(openDialog(page), 'Set up opens the schedule form').toHaveCount(1);
		report('W10 the form', {
			title: flat(await openDialog(page).getByRole('heading').first().innerText()),
			tabs: await page
				.getByRole('dialog')
				.first()
				.getByRole('tab')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim()}|selected=${node.getAttribute('aria-selected')}`
					)
				),
			inputs: await page
				.getByRole('dialog')
				.first()
				.locator('input')
				.evaluateAll((nodes) =>
					nodes.map((node) => {
						const field = node as HTMLInputElement;
						const label = (field.labels?.[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
						return `type=${field.type}|label=${label}|value=${field.value}`;
					})
				)
		});
		await expect(
			openDialog(page).getByRole('heading', { name: TEXT.scheduleFormTitle, exact: true })
		).toBeVisible();
		await expect(dialogTab(page, TEXT.frequencyMonth), 'it starts monthly').toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(dialogTab(page, TEXT.groupingProject), 'grouped by project').toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(dialogTab(page, TEXT.scheduleDraft), 'kept as a draft').toHaveAttribute('aria-selected', 'true');
		await expect(
			startDayField(page),
			"the day field is text, holding the day in the browser's own shape (`11/01/2026` measured, never pinned)"
		).toHaveValue(/\d{4}|\d{2}\/\d{2}\/\d{4}/);
		await expect(openDialog(page).getByText(TEXT.scheduleStartHint, { exact: true })).toBeVisible();

		const before = standIn.calls.length;
		await dialogTab(page, TEXT.groupingMember).click({ timeout: 15_000 });
		await dialogTab(page, TEXT.scheduleSend).click({ timeout: 15_000 });
		await expect(dialogTab(page, TEXT.groupingMember)).toHaveAttribute('aria-selected', 'true');
		await byRole(page, 'button', TEXT.scheduleSave).click({ timeout: 15_000 });
		await expect
			.poll(() => standIn.countOf('POST', SCHEDULES_PATH), {
				message: 'no POST reached the stand-in',
				timeout: 30_000
			})
			.toBe(1);
		const body = standIn.bodyOf('POST', SCHEDULES_PATH);
		report('W10 POST body', body ?? {});
		expect(
			body,
			"the form's four choices plus the client and the workspace it was opened on (invoice-schedule.service.ts:72-88)"
		).toEqual({
			frequency: 'MONTHLY',
			grouping: 'MEMBER',
			sendInvoice: true,
			startDay: expect.any(String),
			organizationContactId: 'probe-alpha',
			organizationId: scope.organizationId,
			tenantId: scope.tenantId
		});
		expect(
			String(body?.startDay),
			'a monthly schedule starts on the first day of a month (invoice-schedules.ts:69-76) — the month itself is served data, never pinned'
		).toMatch(/^\d{4}-\d{2}-01$/);
		await expect(openDialog(page), 'the form closes on the schedule as it was sent').toHaveCount(0, {
			timeout: 25_000
		});
		await expect(
			sectionButton(page, TEXT.schedulePause),
			"the section now offers the schedule's own controls"
		).toBeVisible({ timeout: 30_000 });
		report('W10 the section after', {
			text: await sectionText(page),
			calls: standIn.callsAfter(before).map((call) => `${call.method} ${call.path}`)
		});
		// The grouping and the delivery are one line of the summary, so they are matched as one line
		// (`By member · Sent to alpha@example.com`, measured in s3-lane-a-clientwrites-fix-1.log W10). The days the
		// summary renders out of `startDay` are a formatted date and are never pinned.
		await expect(
			section(page).getByText(/By member · Sent to alpha@example\.com/),
			'the summary line says how the lines are grouped and where the invoice goes (invoices.schedule.SUMMARY, DELIVERY_SEND)'
		).toBeVisible();
		await expect(section(page).getByText(TEXT.frequencyMonth)).toBeVisible();
		await expect(section(page).getByText(TEXT.scheduleActive, { exact: true })).toBeVisible();
		await expect(section(page).getByText(TEXT.scheduleNoRuns, { exact: true })).toBeVisible();
		expect(
			standIn
				.callsAfter(before)
				.filter((call) => call.method === 'GET')
				.map((call) => call.path),
			"the save reads the schedules again, and the new one's runs (use-invoice-schedules.ts:112-124)"
		).toEqual([SCHEDULES_PATH, `${SCHEDULES_PATH}/probe-written-schedule/runs`]);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('W11 · pausing, resuming and deleting the schedule', async ({ page, fixture, shield }) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			...SCHEDULE_SCOPE,
			store: {
				clients: [
					clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client', primaryEmail: 'alpha@example.com' })
				],
				schedules: [
					{
						id: 'probe-served-schedule',
						organizationContactId: 'probe-alpha',
						frequency: 'MONTHLY',
						startDay: '2026-01-01',
						grouping: 'PROJECT',
						sendInvoice: false,
						pausedAt: null,
						activeSince: '2026-01-05T09:00:00.000Z',
						nextPeriod: { startDay: '2026-01-01', endDay: '2026-01-31', runDay: '2026-02-01' }
					}
				]
			}
		});
		await expect(sectionButton(page, TEXT.schedulePause), 'a served schedule offers its controls').toBeVisible({
			timeout: 60_000
		});
		report('W11 the served schedule', { text: await sectionText(page) });
		await expect(
			section(page).getByText(/Next invoice on/),
			'an active schedule with a next period states it (measured in …probe-3b.log R3; the day itself is never pinned)'
		).toBeVisible();

		const schedulePath = `${SCHEDULES_PATH}/probe-served-schedule`;
		await sectionButton(page, TEXT.schedulePause).click({ timeout: 15_000 });
		await expect
			.poll(() => standIn.countOf('PUT', schedulePath), {
				message: 'no PUT reached the stand-in',
				timeout: 30_000
			})
			.toBe(1);
		report('W11 pause', {
			putBody: standIn.bodyOf('PUT', schedulePath) ?? {},
			store: standIn.schedules().map((item) => `${item.id}|pausedAt=${item.pausedAt ? 'set' : 'null'}`)
		});
		expect(
			standIn.bodyOf('PUT', schedulePath),
			'pause sends the one thing it changes plus the workspace (invoice-schedule.service.ts:94-104)'
		).toEqual({ paused: true, organizationId: scope.organizationId, tenantId: scope.tenantId });
		// The section's words follow the read that answers the pause: a text read taken straight after the PUT was one
		// refresh behind in every probe (`…probe-4.log` S1), so each state is waited for instead of read.
		await expect(sectionButton(page, TEXT.scheduleResume), 'the paused schedule offers Resume').toBeVisible({
			timeout: 30_000
		});
		await expect(section(page).getByText(TEXT.schedulePaused, { exact: true })).toBeVisible();
		await expect(
			section(page).getByText(TEXT.scheduleNextPaused, { exact: true }),
			'a paused schedule states no next invoice (client-billing-schedule-section.tsx:260,271,274 → 85-86)'
		).toBeVisible();
		report('W11 the section paused', { text: await sectionText(page) });

		await quietPage(page);
		await sectionButton(page, TEXT.scheduleResume).click({ timeout: 15_000 });
		await expect.poll(() => standIn.countOf('PUT', schedulePath), { timeout: 30_000 }).toBe(2);
		expect(standIn.bodyOf('PUT', schedulePath), 'resume sends the same change flipped').toEqual({
			paused: false,
			organizationId: scope.organizationId,
			tenantId: scope.tenantId
		});
		await expect(sectionButton(page, TEXT.schedulePause), 'and it is active again').toBeVisible({
			timeout: 30_000
		});
		await expect(section(page).getByText(TEXT.scheduleActive, { exact: true })).toBeVisible();

		await quietPage(page);
		await sectionButton(page, TEXT.delete).click({ timeout: 15_000 });
		await expect(alertConfirm(page), 'Delete asks first').toHaveCount(1);
		report('W11 delete confirmation', { text: flat(await alertConfirm(page).innerText()) });
		await expect(
			alertConfirm(page).getByRole('heading', { name: TEXT.scheduleDeleteTitle, exact: true })
		).toBeVisible();
		// The locale's BODY is one string with the client's name inside it (`en.json` invoices.schedule.delete.BODY,
		// used at `client-billing-schedule-section.tsx:334-335`), so both sentences land in a single text node —
		// pinned as the whole line, exactly as it was measured (`s3-lane-a-clientwrites-fix-4.log` W11).
		await expect(
			alertConfirm(page).getByText(`${TEXT.scheduleDeleteBody} Alpha Client. ${TEXT.scheduleDeleteStays}`, {
				exact: true
			})
		).toBeVisible();
		await alertConfirm(page).getByRole('button', { name: TEXT.delete, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => standIn.countOf('DELETE', schedulePath), {
				message: 'no DELETE reached the stand-in',
				timeout: 30_000
			})
			.toBe(1);
		report('W11 deleted', {
			deleteQuery: standIn.calls.find((call) => call.method === 'DELETE')?.query,
			calls: standIn.calls.map((call) => `${call.method} ${call.path}`)
		});
		await expect(setUpButton(page), 'the section is back to its no-schedule state').toBeVisible({
			timeout: 30_000
		});
		await expect(section(page).getByText(TEXT.scheduleNoneHint, { exact: true })).toBeVisible();
		expect(standIn.schedules().length, 'the stand-in holds no schedule now').toBe(0);
		expect(consoleFindings(shield), 'nothing was refused in this arm').toEqual([]);
	});

	test('W12 · a set-up the server refuses (409): the form keeps its words', async ({ page, fixture, shield }) => {
		const scope = workspaceOf(fixture);
		const standIn = await openClients(page, fixture, {
			...SCHEDULE_SCOPE,
			store: {
				clients: [
					clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client', primaryEmail: 'alpha@example.com' })
				],
				schedules: [],
				refuse: { [`POST ${SCHEDULES_PATH}`]: 409 }
			}
		});
		await expect(setUpButton(page), 'the section must settle before the form opens').toBeVisible({
			timeout: 60_000
		});
		await setUpButton(page).click({ timeout: 15_000 });
		await byRole(page, 'button', TEXT.scheduleSave).click({ timeout: 15_000 });
		await expect(
			alerts(page).first(),
			'a client that already has a schedule says it in the form (invoice-schedule-dialog.tsx, invoices.schedule.form.EXISTS)'
		).toHaveText(TEXT.scheduleExists, { timeout: 25_000 });
		report('W12 409', {
			alerts: (await alerts(page).allInnerTexts()).map(flat),
			dialogs: await page.getByRole('dialog').count(),
			schedules: standIn.schedules().length,
			section: await sectionText(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		await expect(openDialog(page), 'the form stays open so it can be closed and opened again').toHaveCount(1);
		expect(standIn.schedules().length, 'the refusal changed nothing').toBe(0);
		await byRole(page, 'button', TEXT.cancel).click({ timeout: 15_000 });
		await expect(openDialog(page), 'which Cancel does').toHaveCount(0, { timeout: 25_000 });
		await expect(setUpButton(page), 'and the section still offers the set-up').toBeVisible();
		expect(
			consoleFindings(shield, [{ method: 'POST', path: SCHEDULES_PATH, status: 409 }]),
			`only the armed refusal may be reported (${JSON.stringify(shield.consoleErrors().map((line) => line.slice(0, 90)))})`
		).toEqual([]);
	});

	test('W14 · what only the unit test pinned: no billing schedules at all (404), and a read that failed (500)', async ({
		page,
		fixture,
		shield
	}) => {
		const scope = workspaceOf(fixture);
		const alpha = () => [
			clientOf(scope, { id: 'probe-alpha', name: 'Alpha Client', primaryEmail: 'alpha@example.com' })
		];

		// `use-invoice-schedules.ts` calls a 404 a missing route, and the section shows nothing rather than an error no
		// retry can fix (`client-billing-schedule-section.tsx:198-200`) — pinned by a unit test, never by the list.
		const missing = await openClients(page, fixture, {
			...SCHEDULE_SCOPE,
			store: { clients: alpha(), schedules: [], refuse: { [`GET ${SCHEDULES_PATH}`]: 404 } }
		});
		await expect(page.getByRole('heading', { name: 'Alpha Client', exact: true }).first()).toBeVisible({
			timeout: 25_000
		});
		await expect
			.poll(() => missing.countOf('GET', SCHEDULES_PATH), {
				message: 'the page must have asked',
				timeout: 60_000
			})
			.toBeGreaterThan(0);
		await expect(section(page), 'an API without billing schedules leaves no section on the page').toHaveCount(0, {
			timeout: 25_000
		});
		report('W14 404', {
			sectionCount: await section(page).count(),
			setUpCount: await setUpButton(page).count(),
			calls: missing.calls.map((call) => `${call.method} ${call.path}`),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});

		// A read that failed for another reason is not missing: the section stays and says it could not be loaded.
		const broken = await openClients(page, fixture, {
			...SCHEDULE_SCOPE,
			store: { clients: alpha(), schedules: [], refuse: { [`GET ${SCHEDULES_PATH}`]: 500 } }
		});
		await expect(
			section(page).getByText(TEXT.scheduleError, { exact: true }),
			'a failed schedule read says so (client-billing-schedule-section.tsx:247, invoices.schedule.ERROR)'
		).toBeVisible({ timeout: 60_000 });
		report('W14 500', {
			sectionCount: await section(page).count(),
			section: await sectionText(page),
			calls: broken.calls.map((call) => `${call.method} ${call.path}`),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 160))
		});
		await expect(section(page), 'the section itself is still there').toHaveCount(1);
		expect(
			consoleFindings(shield, [
				{ method: 'GET', path: SCHEDULES_PATH, status: 404 },
				{ method: 'GET', path: SCHEDULES_PATH, status: 500 }
			]),
			`both arms armed their own refusal (${JSON.stringify(shield.consoleErrors().map((line) => line.slice(0, 90)))})`
		).toEqual([]);
	});
});
