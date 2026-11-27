import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Making an invoice on **`/invoices/new`** (`app/[locale]/(main)/invoices/new/page.tsx:1-5` →
 * `core/components/pages/invoices/new/page-component.tsx`): what the screen asks before a client is picked, the
 * billable-time read a client pick sends, the lines that read makes, the fields and the totals they print, the save
 * and what it writes, a refused save, the problems that keep the confirm dialog shut, the time that is left out of
 * the invoice, and an invoice replaced from a void one. Lane-b: app `http://localhost:3032`, mock
 * `http://127.0.0.1:3996` (`playwright/test-servers.ts`), measured 2026-11-26.
 *
 * **Not covered here, on purpose:** who may reach this screen and its heading
 * (`suites/lane-a/invoice-access-ui.spec.ts`), the `?client=<id>` links that lead here
 * (`suites/lane-c/clients-access-ui.spec.ts`), the invoice list this page lands on and the edit screen of a saved
 * invoice (`suites/lane-c/invoice-detail-edit-ui.spec.ts`), and the invoice API routes themselves
 * (`suites/lane-b/invoice-gates.spec.ts`).
 *
 * ## Where every number came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-invoicenew\probe1.spec.ts`, `probe2.spec.ts`, `probe3.spec.ts`
 * (lane-b, 2026-11-26; logs `D:\Coding\.tmp\s3-lane-b-invoicenew-probe-1.log`, `-probe-2.log`,
 * `-probe-4.log`) printed the document text, every served call with its body, every dialog, toast and state copy
 * pinned below. Probe 2's five failures and probe 3's one were its own harness (it looked for a
 * `role="alertdialog"` that does not exist — the save dialog is `role="dialog"`, probe 4 `R1`; it scoped the toolbar
 * buttons to `data-page-scroll-owner`, which does not hold them; it asked for a menu option by the exact name
 * `Alpha Client` while its accessible name carries the tile initials and the shortcut keycap, probe 4 `R10`), not
 * the app, so the values those probes printed stand. This file re-measures all of it: every test prints its own
 * `MEASURE` line with what its page and its stub really did, so any assertion here can be checked against a log line
 * in `D:\Coding\.tmp\s3-lane-b-invoicenew-<n>.log`.
 *
 * Amounts, hours, percentages and dates are never pinned to a calendar or a machine: the served days are
 * `today ± n` (`dayKey`), the printed money/percent/hours text is rebuilt here with the same `Intl` shapes the app
 * uses, and every date is checked against values built **inside the browser**. The two are not the same day and run 1
 * measured it: the period follows this browser's calendar (`timeZone=Europe/Madrid` in the read, `Period = Oct 1 – 31`)
 * while the Issue date follows the workspace zone (`UTC` here — `use-new-invoice.ts:254-256`), so near midnight they
 * differ. Nothing assumes either: `issueDayKeyOf` reads the day the Issue date field holds and matches it back to a
 * day key by formatting candidates in the browser, and the due date is then computed *from that day* — the rule
 * pinned is `dueDayAfter(issueDay, dueTerm.days)` (`use-new-invoice.ts:332-333`), not a date. No host's time zone or
 * date format is pinned anywhere.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock and the app shell (`/api/user/me`, the organization with `currency: 'USD'`,
 * `timeZone: 'UTC'` and no `daysUntilDue` / `defaultInvoiceEstimateTerms` / rounding rule —
 * `cypress/support/mock-gauzy-server.mjs:86-99`), `GET /api/role-permissions/me` for the guard
 * (`mock-gauzy-server.mjs:674`), the NextAuth session stub of `signInAndVisit`, and this screen with every hook,
 * menu, sheet and dialog it runs.
 *
 * **Served by this file:** the clients, the projects and their client rates, the billable time, the members' rates,
 * the client's saved invoices, the next free number and every invoice write — through `page.route` on the mock
 * origin, because the mock has **no** handler for any of them: its catch-all answers `pagination([])` =
 * `{ items: [], total: 0 }` (`mock-gauzy-server.mjs:890-895`), which is the load-error state, so nothing could be
 * pinned on it. `GET /invoice-schedules` is served as `[]` for the same reason (the list this page lands on reads
 * it). Every answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`), `OPTIONS` is 204, and
 * `route.fetch()` is never called inside a stubbed route: the harness's own call list is the witness that the page
 * acted on this file. The store is live — a save adds the invoice it created, and a refused write changes nothing.
 *
 * **The browser talks to the mock origin, never to the app's own `app/api/**` twins** (lane wiring
 * `playwright/test-servers.ts` + `core/services/client/axios.ts`). The paths below are the services' own
 * (`core/services/client/api/organizations/invoice.service.ts`, `time-log-report.service.ts`,
 * `organization-contact.service.ts`, `organization-project.service.ts`, `rate.service.ts`), `/api`-prefixed.
 *
 * **What the served billable time models.** `GET /api/timesheet/time-log?<range>&billableOnly=true&notInvoiced=…`
 * answers the served logs, and a log whose `invoiceItemId` names a line of a **live** (not void) invoice is left
 * out of a `notInvoiced` read — the shape `billableTimeLogSchema` states (`core/types/schemas/organization/invoice.schema.ts:60-83`)
 * and `invoice-billed-time.ts` reads (`recordsBilledTimeOf` `:36-44`, `offeredLogsOf` `:66-86`). Logs are anchored
 * to the start of the **first** time read, so the wider reads — the earlier invoices' read
 * (`recordingReadDaysOf`, `invoice-billed-time.ts:198-213` through `use-invoices-recording-time.ts:134`) and the
 * saved lines' own time (`billedReadStartOf` `use-invoice-time.ts:156-165`, `billedReadEndOf` `:192-197`, used at
 * `:333-337`) — see them
 * where they really are, while a day outside a read's own window is not answered by it (test 14).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `page-component.tsx:134-191` `NewInvoiceContent` (the toolbar: the client menu `:170`, the period picker
 *   `:171-175`, the grouping `SegmentedControl` `:176-182`, Cancel → `/invoices` `:164-167`) and `NewInvoiceBody`
 *   `:42-131` in order: `NO_CLIENTS` `:64-72`, **`CHOOSE_CLIENT` when no client is picked** `:73-81`, time failed
 *   `:85-87`, `NO_PROJECTS` `:88-96`, `billedTime.ALL_INVOICED_*` `:97-106`, **`NO_TIME` + `PREVIOUS_PERIOD`**
 *   `:107-124`, else `<PreparedInvoice>` + `<SaveInvoiceDialog>` `:125-130`. The Details panel and its Save button
 *   exist only inside `PreparedInvoice` (`invoice-screen.tsx:105-122`) — which is why the "no billable time" and
 *   "already invoiced" screens have no Save at all.
 * - `invoice-screen.tsx:29-57` `OverlapNotice` (left out vs may-bill-twice), `:63-76` `KeptRatesNotice`,
 *   `:79-122` `PreparedInvoice` with `askToSave` (`:97-103`: the dialog opens **only** when `problems.length === 0`),
 *   `:125-139` `TakeTimeAgainButton`.
 * - `invoice-details.tsx:175-290` the Details section: number `:210-224`, issue `:226-236`, due `min={issueDay}` +
 *   the term hint `:237-250`, discount and tax `PercentField`s `:252-265`, currency `:143-173` (a plain `<span>`
 *   when there is one currency), note `:105-126`, `SavingNote` `:53-61`, `Save` disabled only while saving
 *   `:270-279`, and the problems `ul[aria-live="polite"]` `:280-287` fed by `PROBLEM_KEYS` `:17-27`.
 * - `invoice-sheet.tsx:253-336` the sheet (`section[aria-label="Invoice being prepared"]`): head facts `:236-251`,
 *   parties `:274-299`, lines and project bands `:146-176`, the description input and the remove button
 *   `:91-114`, hours/rate cells and their `title` notes `:74-89` (`RATE_SOURCE_KEYS` `:36-42`), the removed-lines
 *   note with Restore `:311-317`, `LINES_AND_HOURS` `:318-328`, and `PaperTotals` `:204-234` (Subtotal appears
 *   only when a discount or a tax was written).
 * - `invoice-earlier.tsx:75-159` the "Already invoiced to …" panel: the note (`earlier.NOTE` vs
 *   `billedTime.EARLIER_NOTE`, `:95-98`), `earlier.NONE` `:121`, the rows `:26-59` with `earlier.OVERLAPS`, and
 *   `earlier.SHOW_MORE` / `SHOW_FEWER` `:17,89-102,134-156`.
 * - `invoice-left-out.tsx:20-68` `OtherCurrencies` (rows, `LINE_COUNT`, the `otherCurrencies.SWITCH` button, and
 *   `invoices.new.NO_CURRENCY` when the time has none) and `:74-113` `UnpricedTimeList` (rows + the
 *   `unpriced.SET_RATE_OF` link to `/projects/<id>?tab=people`).
 * - `save-invoice-dialog.tsx:131-226`: the consequence rows, `sending.SEND_CONSEQUENCE` when the client has an
 *   e-mail, `confirm.UNCHECKED {client}` when the client's invoices could not be read, the recipient field
 *   `:206-225`, `saveOnly` `:74-89` (`invoices.new.SAVED` then `router.push('/invoices')`), `saveAndSend`
 *   `:105-125`, and the failure copy `:172-181` over `invoiceSaveFailureOf` (`core/lib/utils/invoices.ts:1180-1195`,
 *   `isRefusalStatus` `:1171-1173`) and `isTimeBilledElsewhere` (`core/lib/utils/invoice-billed-time.ts:16-23`).
 * - `replacement-invoice.tsx:16-51,57-87` and `use-new-invoice.ts:429-447` (`linesSource`, `takeTimeAgain`,
 *   `backToSavedLines`), `use-invoice-time.ts:382-442` (the free read, and the all-time read when the saved lines
 *   bill time), `use-invoice-mutations.ts:59-72` (`POST /invoices` with its lines, `createInvoice`),
 *   `:237-246,248-253` (`saveAndSendInvoice`: the create, then the send of what was created) and `:170-185`
 *   (`assertActionOffered` `:812-827` → `invoiceService.sendInvoiceByEmail` `invoice.service.ts:282-296` →
 *   `markSentWhileDraft` `:159-168`, which changes the status under the `updatedAt` it just read),
 *   `invoices.ts:1384-1414,1338-1369` (the create body and its lines, with each line's `timeLogIds` — and no
 *   `expectedUpdatedAt` anywhere in it: that guard belongs to the status action `PUT /invoices/:id/action`,
 *   `invoice.service.ts:318-338`).
 *
 * ## Findings (all measured; every tag quotes its file)
 *
 * - **The save dialog is `role="dialog"`, not `alertdialog`** (measured, untagged): `save-invoice-dialog.tsx:31-226`
 *   renders `ProjectConfirmDialog` → `ProjectDialog` = `AppDialog` (`core/components/common/app-dialog.tsx:68-84`)
 *   over `core/components/common/dialog.tsx:47` (`@base-ui/react/dialog`), whose popup carries `role="dialog"`.
 *   Probe 2 looked for `alertdialog` five times and found nothing; probe 4 `R1` printed `{"tag":"div","role":"dialog"}`.
 * - **A created invoice carries the hours its lines bill** (measured, untagged — no comment or test states
 *   otherwise about the create body): the `POST /api/invoices` body probe 4 `R3` recorded holds
 *   `invoiceItems[].timeLogIds` = the ids of the served logs each line was built from
 *   (`invoices.ts:1338-1369`), next to `invoiceType: "BY_PROJECT_HOURS"`, `terms: "Billable time from <fromDay> to
 *   <toDay>"` (`invoiceTermsOf`, `invoices.ts:976-991`), and day bounds written in the **organization's** zone
 *   (`invoiceDate "…T00:00:00.000Z"`, `dueDate "…T23:59:59.999Z"`, `invoices.ts:1216-1232,1391-1392`) while the
 *   billable-time read asked in the **browser's** zone (`timeZone=<the browser's own zone>` and
 *   `startDate`/`endDate` at that zone's midnights — `use-invoice-time.ts:382-397`).
 * - **A 409 on the create is reported as a plain refusal** (measured, untagged): arming
 *   `409 INVOICE_CHANGED` printed `invoices.new.confirm.FAILED`, the same sentence as a 400 — `invoiceSaveFailureOf`
 *   maps every 4xx to `'refused'` (`invoices.ts:1180-1195`, `isRefusalStatus` `:1171-1173`), and the code that
 *   names `INVOICE_CHANGED` (`use-invoice-mutations.ts:532-538`) is on the status/edit paths, not this one.
 * - **`otherCurrencies.SWITCH` is offered for the currency the invoice did NOT take** (measured, untagged): with a
 *   USD project and a EUR project of the same client, the paper totalled in EUR (`Total = €200.00`) and the panel
 *   offered "Invoice USD instead" over the left-out `1.00 h · $100.00` `1 line` (probe 4 `R9`, run 1 test 13). The
 *   invoice bills in the first currency of `invoiceCurrenciesOf`, whose totals are sorted by **hours**, most first
 *   (`invoiceCurrencyKeyOf` `invoices.ts:710-719` over `currencyTotalsOf` / `compareCurrencyTotals`
 *   `payments-due.ts:484-490,501-525`) — not the workspace currency, and not the bigger amount (the €200 won because
 *   its 2.00 h beat the 1.00 h of $100). With two currencies the Details field is a `<select>` holding both
 *   (`Currency` `EUR` `USD`, `invoice-details.tsx:154-173`); with one it is a plain pair of spans (test 5).
 * - **Not reachable from this screen, as measured:** `invoices.new.problems.NO_CURRENCY` — `invoiceProblemsOf`
 *   reports `noCurrency` only when `lineCount > 0 && !currency` (`invoices.ts:1142-1166`), and a line exists here
 *   only when its time is priced, which prices it in some currency (`invoice-left-out.tsx:98-113` puts unpriced
 *   time in its own panel instead). The `earlier.ERROR` + Try-again state needs the client's invoices read to fail
 *   while the rest of the page is fine; arming that refusal here refused the save's reads too, so it stays
 *   unit-tested (`invoice-earlier.test.tsx`). `KeptRatesNotice` (`invoice-screen.tsx:63-76`) needs
 *   `time.pricesKeptTimeToday`, i.e. an API that keeps rates but states none on the time it answers while the
 *   role may not read client rates — this file's role does read them (`withClientRates=true` in the measured read),
 *   and the kept rates of probe 4 `R12` are printed per line instead (`invoices.edit.RATE_SOURCE_SAVED` in each
 *   cell's `title`).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const INVOICES_PATH = '/invoices';

/** `locales/en.json`, by key — every sentence pinned below is read from the locale file, never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	clients: Record<string, string>;
	common: Record<string, string>;
	pages: { unauthorized: Record<string, string> };
	invoices: {
		TITLE: string;
		NEW_INVOICE: string;
		NUMBER: string;
		NO_NUMBER: string;
		NO_PERIOD: string;
		COUNT: string;
		ISSUED_ON: string;
		DUE_ON: string;
		status: Record<string, string>;
		detail: Record<string, string>;
		billedTime: Record<string, string>;
		edit: Record<string, string>;
		send: Record<string, string>;
		replace: Record<string, string>;
		new: {
			TITLE: string;
			CLIENT_PLACEHOLDER: string;
			GROUP_BY_MEMBER: string;
			GROUP_BY_TASK: string;
			SAVE: string;
			SAVED: string;
			UPDATING: string;
			NO_CLIENTS_TITLE: string;
			NO_CLIENTS_MESSAGE: string;
			OPEN_CLIENTS: string;
			CHOOSE_CLIENT_TITLE: string;
			CHOOSE_CLIENT_MESSAGE: string;
			TIME_ERROR_TITLE: string;
			NO_PROJECTS_TITLE: string;
			NO_PROJECTS_MESSAGE: string;
			OPEN_PROJECTS: string;
			NO_TIME_TITLE: string;
			NO_TIME_MESSAGE: string;
			PREVIOUS_PERIOD: string;
			NO_CURRENCY: string;
			SHEET_LABEL: string;
			HOURS: string;
			RATE_PER_HOUR: string;
			RATE_SOURCE_MEMBER: string;
			RATE_SOURCE_PROJECT: string;
			KEPT_RATE_HINT: string;
			KEPT_RATES_UNREAD_TITLE: string;
			DESCRIPTION_OF: string;
			REMOVE_LINE: string;
			REMOVED_LINES: string;
			RESTORE_LINES: string;
			NO_LINES_TITLE: string;
			NO_PRICED_LINES: string;
			ALL_LINES_REMOVED: string;
			LINES_AND_HOURS: string;
			LINE_COUNT: string;
			TOTAL: string;
			PERIOD: string;
			FROM: string;
			BILL_TO: string;
			details: Record<string, string>;
			adjustments: Record<string, string>;
			terms: Record<string, string>;
			sending: Record<string, string>;
			confirm: Record<string, string>;
			problems: Record<string, string>;
			earlier: Record<string, string>;
			otherCurrencies: Record<string, string>;
			unpriced: Record<string, string>;
			byProject: Record<string, string>;
		};
	};
};

const T = EN.invoices;
const NEW = T.new;

/** `{number}`-style filling (`invoices.NUMBER`, `invoices.new.SAVED`, …). */
const filled = (text: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)), text);

/** `one {…} / other {…}` branches filled by hand (`new.terms.CLIENT`, `new.earlier.OVERLAP_TITLE`,
 *  `billedTime.LEFT_OUT_MESSAGE`): the branch is chosen with `Intl.PluralRules` of the locale file's own language,
 *  `#` becomes the number, and a placeholder inside a branch (`{client}`) is filled too. A `{name, plural, …}` block
 *  takes its number from the value named in the template, so `terms.CLIENT` is filled with `{ days }`.
 */
const messageOf = (template: string, values: Record<string, string | number>, lang = 'en') => {
	/** The `one {…} other {…}` pairs of a plural block, brace-counted so a branch may hold `{client}`. */
	const branchesOf = (text: string) => {
		const branches = new Map<string, string>();
		let cursor = 0;
		while (cursor < text.length) {
			const branch = /^(\w+)\s*\{/.exec(text.slice(cursor));
			if (!branch) {
				cursor += 1;
				continue;
			}
			let depth = 1;
			let end = cursor + branch[0].length;
			while (end < text.length && depth > 0) {
				if (text[end] === '{') depth += 1;
				else if (text[end] === '}') depth -= 1;
				end += 1;
			}
			branches.set(branch[1], text.slice(cursor + branch[0].length, end - 1));
			cursor = end;
		}
		return branches;
	};

	let out = '';
	let index = 0;
	while (index < template.length) {
		const char = template[index];
		if (char !== '{') {
			out += char;
			index += 1;
			continue;
		}
		let depth = 1;
		let end = index + 1;
		while (end < template.length && depth > 0) {
			if (template[end] === '{') depth += 1;
			else if (template[end] === '}') depth -= 1;
			end += 1;
		}
		const block = template.slice(index + 1, end - 1);
		const plural = /^(\w+), plural,([\s\S]*)$/.exec(block);
		if (plural) {
			const count = Number(values[plural[1]] ?? 0);
			const branches = branchesOf(plural[2]);
			const branch =
				branches.get(`=${count}`) ??
				branches.get(new Intl.PluralRules(lang).select(count)) ??
				branches.get('other') ??
				'';
			out += messageOf(branch.replace(/#/g, String(count)), values, lang);
		} else {
			out += values[block] === undefined ? block : String(values[block]);
		}
		index = end;
	}
	return out;
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b invoice-new] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`cypress/support/mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204 at `:1097-1101`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/* ------------------------------------------------------------------ the served layer */

const ORG_ID = '22222222-2222-4222-8222-111111111111';
const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const ORG_NAME = 'Fixture Organization A';
/** The lane mock's organization currency and zone (`cypress/support/mock-gauzy-server.mjs:86-99`): no `daysUntilDue`,
 *  no `defaultInvoiceEstimateTerms`, no rounding rule. */
const ORG_CURRENCY = 'USD';

const CLIENT_A = 'playwright-invoice-client-a';
const CLIENT_A_NAME = 'Alpha Client';
const CLIENT_A_EMAIL = 'alpha@example.test';
const CLIENT_C = 'playwright-invoice-client-c';
const CLIENT_C_NAME = 'Gamma Client';
const CLIENT_D = 'playwright-invoice-client-d';
const CLIENT_D_NAME = 'Delta Client';

const PROJECT_A = 'playwright-invoice-project-a';
const PROJECT_A_NAME = 'Alpha Project';
const PROJECT_C = 'playwright-invoice-project-c';
const PROJECT_D = 'playwright-invoice-project-d';
const PROJECT_D_NAME = 'Delta Project';
const PROJECT_E = 'playwright-invoice-project-e';
const PROJECT_E_NAME = 'Euro Project';

const MEMBER_ONE = 'playwright-invoice-member-one';
const MEMBER_ONE_NAME = 'Fixture Member One';
const MEMBER_TWO = 'playwright-invoice-member-two';
const MEMBER_TWO_NAME = 'Fixture Member Two';
const MEMBER_NONE = 'playwright-invoice-member-three';
/** A member with no client rate and no billing rate of their own, named so the unpriced panel is recognisable. */
const MEMBER_NONE_NAME = 'No Rate';

const VOID_INVOICE_ID = 'playwright-invoice-void-1';
const VOID_LINE_ID = 'playwright-invoice-void-line-1';
const OVERLAP_INVOICE_ID = 'playwright-invoice-overlap-1';
const OVERLAP_LINE_ID = 'playwright-invoice-overlap-line-1';
const OVERLAP_UNRECORDED_INVOICE_ID = 'playwright-invoice-overlap-unrecorded-1';
const OVERLAP_UNRECORDED_LINE_ID = 'playwright-invoice-overlap-unrecorded-line-1';

/** `today ± n` in UTC: the day keys the served invoices and time logs are dated with. The screen's own period is
 *  the previous calendar month of the browser (`use-new-invoice.ts:111`), so these offsets put the served time
 *  inside it without naming a date. */
const DAY_MS = 86_400_000;
const dayKey = (offset: number) => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
const instantOf = (key: string) => `${key}T12:00:00.000Z`;
/** The screen opens on the previous calendar month (`newDraftSeedOf`, `use-new-invoice.ts:108-122`, whose `period` is
 *  `periodOfPreset('lastMonth', INVOICE_WEEK_START)` at `:110`), so the logs that must fall inside that period are
 *  served about a month back from today. */
const LOG_DAYS = [dayKey(-55), dayKey(-52), dayKey(-48), dayKey(-46)];

type ServedClient = {
	id: string;
	name: string;
	primaryEmail: string | null;
	contactType: string;
	imageUrl: string | null;
	organizationId: string;
	tenantId: string;
	paymentTermsDays: number | null;
};

const clientOf = (id: string, name: string, overrides: Partial<ServedClient> = {}): ServedClient => ({
	id,
	name,
	primaryEmail: null,
	contactType: 'CLIENT',
	imageUrl: null,
	organizationId: ORG_ID,
	tenantId: TENANT_ID,
	paymentTermsDays: null,
	...overrides
});

type ServedProject = {
	id: string;
	name: string;
	code: string;
	public: true;
	owner: null;
	currency: string | null;
	organizationId: string;
	tenantId: string;
	organizationContactId: string;
	organizationContact: { id: string; name: string };
};

const projectOf = (
	id: string,
	name: string,
	clientId: string,
	currency: string | null = ORG_CURRENCY
): ServedProject => ({
	id,
	name,
	code: id.slice(-3).toUpperCase(),
	public: true,
	owner: null,
	currency,
	organizationId: ORG_ID,
	tenantId: TENANT_ID,
	organizationContactId: clientId,
	organizationContact: { id: clientId, name: name.replace('Project', 'Client') }
});

type ServedMember = {
	id: string;
	firstName: string;
	lastName: string;
	/** The member's own billing rate: the fallback when no client rate prices them (`invoices.ts:277-311`). */
	billRateValue: number | null;
	billRateCurrency: string | null;
};

type ServedProjectRates = {
	id: string;
	billRateValue: number | null;
	currency: string | null;
	members: Array<{ employeeId: string; billRateValue: number | null }>;
};

/** One billable time log. `dayIndex` counts days from the start of the **first** billable-time read this stub saw
 *  (`anchor` + `logStartMs` above, at 09:00 of that day), so the served days follow the period the screen really
 *  opened on instead of a date pinned here — and a day that is outside a read's own `startDate`/`endDate` is not
 *  answered by that read (test 14 shows the case: the first read there is the wider one, so its day 0 is the day
 *  before the period). A log is left out of a `notInvoiced` read when `invoiceItemId` names a live invoice's line
 *  (`billableTimeLogSchema`, `core/types/schemas/organization/invoice.schema.ts:60-83`). `keptRates` are the rates
 *  the log stored (`ratesStored` + `clientRates`). */
type ServedLogSpec = {
	id: string;
	dayIndex: number;
	projectId: string;
	employeeId: string;
	taskId: string | null;
	taskTitle: string | null;
	taskNumber: number | null;
	duration: number;
	invoiceItemId: string | null;
	isBillable: boolean;
	keptRates?: {
		projectBillRateValue: number | null;
		projectMemberBillRateValue: number | null;
		projectBillRateCurrency: string | null;
		projectMemberBillRateCurrency: string | null;
		billRateValue: number | null;
		billRateCurrency: string | null;
	};
};

type ServedInvoiceLine = {
	id: string;
	description: string | null;
	price: number;
	quantity: number;
	totalValue: number;
	applyTax: boolean;
	applyDiscount: boolean;
	projectId: string;
	employeeId?: string;
	project: { id: string; name: string | null };
};

type ServedInvoice = {
	id: string;
	updatedAt: string;
	invoiceNumber: number;
	invoiceDate: string;
	dueDate: string;
	currency: string | null;
	totalValue: number;
	alreadyPaid: number | null;
	amountDue: number | null;
	status: string;
	/** A day range the screen reads back (`invoicePeriodOfTerms`, `invoices.ts:961-983`), or `logDayTerms(id)`.
	 *  A note to the client is stored in the same string, after the period line and a blank line
	 *  (`invoiceTermsOf`, `invoices.ts:970-983`); the API has no separate note field. */
	terms: string | null;
	toContactId: string;
	toContact: { id: string; name: string | null; primaryEmail: string | null; imageUrl: string | null };
	organizationId: string;
	tenantId: string;
	invoiceType: string | null;
	discountValue: number | null;
	discountType: string | null;
	tax: number | null;
	taxType: string | null;
	tax2: number | null;
	tax2Type: string | null;
	invoiceItems: ServedInvoiceLine[];
};

/** Stands for "this invoice's stated period is the day of the served log with this id", resolved once the log is
 *  anchored: it makes the overlap certain without pinning a calendar. */
const logDayTerms = (logId: string) => `@logDay:${logId}`;

type Refusal = { status: number; message: string };

type ServeScript = {
	clients?: ServedClient[];
	projects?: ServedProject[];
	members?: ServedMember[];
	/** Project client rates, by project id (`rate.service.ts:31-40`). */
	projectRates?: Record<string, ServedProjectRates>;
	logs?: ServedLogSpec[];
	invoices?: ServedInvoice[];
	highestNumber?: number;
	/** `POST /invoices` refused, having created nothing. */
	createRefusal?: Refusal;
	/** `PUT /invoices/email/:email` refused: the invoice stays a saved draft. */
	emailRefusal?: Refusal;
	/** `PUT /invoices/:id/action` refused: the invoice keeps its status. */
	actionRefusal?: Refusal;
};

type ServedCall = { method: string; path: string; query: string; body: unknown };

type InvoiceNewHarness = {
	/** `METHOD path?query body` for every call the browser sent this stub, oldest first. */
	shapes: () => string[];
	readsOf: () => ServedCall[];
	writesOf: () => ServedCall[];
	only: (method: string, path: string) => ServedCall[];
	/** Every `GET /timesheet/time-log`, oldest first: the free read and the wider reads of the overlap check. */
	timeReads: () => ServedCall[];
	/** A call's query as `key=value` pairs, sorted: reads sent at once arrive in race order. */
	queryPairs: (call: ServedCall) => string[];
	/** The day bounds of the first billable-time read, exactly as the browser sent them. */
	firstTimeBounds: () => { startDate: string; endDate: string } | null;
	/** The invoice this stub holds now: what the next read answers. */
	invoice: (id: string) => ServedInvoice | null;
	/** The body of each `POST /invoices`; empty when nothing was written. */
	created: () => unknown[];
	/** Turns the next billable-time read into a different answer ("Take the time again"). */
	serveLogsOnNextRead: (logs: ServedLogSpec[]) => void;
};

const pairsOf = (query: string) =>
	query
		.split('&')
		.filter((part) => part !== '')
		.map((part) => {
			const index = part.indexOf('=');
			return { key: decodeURIComponent(part.slice(0, index)), value: decodeURIComponent(part.slice(index + 1)) };
		});

const queryPairsOf = (query: string) =>
	pairsOf(query)
		.map(({ key, value }) => `${key}=${value}`)
		.sort();

const listParamOf = (query: string, name: string) =>
	pairsOf(query)
		.filter(({ key }) => key === `${name}[0]` || key === `${name}[1]` || key === name)
		.map(({ value }) => value);

/**
 * This file's stand-in for everything the lane mock has no handler for (see the header). The store *is* the answer:
 * a save adds the invoice it created, a refused write changes nothing. `route.fetch()` is never called.
 */
async function serveNewInvoice(page: Page, script: ServeScript): Promise<InvoiceNewHarness> {
	const invoices = new Map<string, ServedInvoice>();
	for (const invoice of script.invoices ?? []) {
		invoices.set(invoice.id, { ...invoice });
	}
	const clients = [...(script.clients ?? [])];
	const projects = [...(script.projects ?? [])];
	const members = script.members ?? [];
	const projectRates = script.projectRates ?? {};
	const highestNumber = script.highestNumber ?? 4021;
	const calls: ServedCall[] = [];
	let logs = [...(script.logs ?? [])];
	let nextLogs: ServedLogSpec[] | null = null;
	/** The bounds of the first billable-time read: every served log is anchored to them, so the wider reads the
	 *  overlap check makes (`recordingReadDaysOf`, `invoice-billed-time.ts:198-213`) still find them. */
	let anchor: { startDate: string; endDate: string } | null = null;

	const logStartMs = (spec: ServedLogSpec) => {
		const base = anchor ? Date.parse(anchor.startDate) : Date.now() - 30 * DAY_MS;
		return base + spec.dayIndex * DAY_MS + 9 * 3_600_000;
	};
	const termsOf = (invoice: ServedInvoice) => {
		const marker = /^@logDay:(.+)$/.exec(invoice.terms ?? '');
		const spec = marker ? logs.find((log) => log.id === marker[1]) : undefined;
		if (!marker || !spec) {
			return invoice.terms;
		}
		const day = new Date(logStartMs(spec)).toISOString().slice(0, 10);
		return `Billable time from ${day} to ${day}`;
	};

	const handler = (route: Route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const pathname = url.pathname.replace(/^\/api/, '');
		const query = url.searchParams.toString();
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		let body: unknown = null;
		const raw = request.postData();
		if (raw) {
			try {
				body = JSON.parse(raw) as unknown;
			} catch {
				body = raw;
			}
		}
		calls.push({ method, path: pathname, query, body });

		const answer = (status: number, payload?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: payload === undefined ? '' : JSON.stringify(payload)
			});
		const refuse = (refusal: Refusal) =>
			answer(refusal.status, { statusCode: refusal.status, message: refusal.message, error: 'Error' });
		const servedInvoice = (invoice: ServedInvoice): ServedInvoice => ({ ...invoice, terms: termsOf(invoice) });
		const paramOf = (name: string) => pairsOf(query).find(({ key }) => key === name)?.value ?? null;
		const hasParam = (name: string) => pairsOf(query).some(({ key }) => key === name);

		if (pathname === '/organization-contact/pagination' && method === 'GET') {
			return answer(200, { items: clients, total: clients.length });
		}
		if (pathname === '/organization-projects' && method === 'GET') {
			return answer(200, { items: projects, total: projects.length });
		}
		const rates = /^\/organization-projects\/([^/]+)\/rates$/.exec(pathname);
		if (rates && method === 'GET') {
			const served = projectRates[rates[1]];
			if (!served) {
				return answer(404, { statusCode: 404, message: 'No rates for that project' });
			}
			return answer(200, served);
		}
		if (pathname === '/invoice-schedules' && method === 'GET') {
			return answer(200, []);
		}
		if (pathname === '/invoices/highest' && method === 'GET') {
			return answer(200, { max: highestNumber });
		}
		if (pathname === '/invoices/pagination' && method === 'GET') {
			const clientId = paramOf('where[toContactId]');
			const all = [...invoices.values()].map(servedInvoice);
			const items = clientId === null ? all : all.filter((invoice) => invoice.toContactId === clientId);
			return answer(200, { items, total: items.length });
		}
		if (pathname === '/invoices' && method === 'POST') {
			if (script.createRefusal) {
				return refuse(script.createRefusal);
			}
			const write = (body ?? {}) as Record<string, unknown>;
			const id = String(write.id ?? `created-${calls.length}`);
			const created: ServedInvoice = {
				id,
				updatedAt: new Date().toISOString(),
				invoiceNumber: Number(write.invoiceNumber ?? 0),
				invoiceDate: String(write.invoiceDate ?? ''),
				dueDate: String(write.dueDate ?? ''),
				currency: String(write.currency ?? ORG_CURRENCY),
				totalValue: Number(write.totalValue ?? 0),
				alreadyPaid: 0,
				amountDue: Number(write.totalValue ?? 0),
				status: String(write.status ?? 'DRAFT'),
				terms: String(write.terms ?? ''),
				toContactId: String(write.toContactId ?? ''),
				toContact: {
					id: String(write.toContactId ?? ''),
					name: clients.find((client) => client.id === write.toContactId)?.name ?? null,
					primaryEmail: clients.find((client) => client.id === write.toContactId)?.primaryEmail ?? null,
					imageUrl: null
				},
				organizationId: String(write.organizationId ?? ORG_ID),
				tenantId: String(write.tenantId ?? TENANT_ID),
				invoiceType: String(write.invoiceType ?? 'BY_PROJECT_HOURS'),
				discountValue: Number(write.discountValue ?? 0),
				discountType: String(write.discountType ?? 'PERCENT'),
				tax: Number(write.tax ?? 0),
				taxType: String(write.taxType ?? 'PERCENT'),
				tax2: Number(write.tax2 ?? 0),
				tax2Type: String(write.tax2Type ?? 'PERCENT'),
				invoiceItems: (Array.isArray(write.invoiceItems) ? write.invoiceItems : []).map(
					(line, index) => ({ ...(line as object), id: `${id}-line-${index}` }) as ServedInvoiceLine
				)
			};
			invoices.set(id, created);
			return answer(201, created);
		}
		const email = /^\/invoices\/email\/([^/]+)$/.exec(pathname);
		if (email && method === 'PUT') {
			if (script.emailRefusal) {
				return refuse(script.emailRefusal);
			}
			return answer(200, {});
		}
		const action = /^\/invoices\/([^/]+)\/action$/.exec(pathname);
		if (action && method === 'PUT') {
			if (script.actionRefusal) {
				return refuse(script.actionRefusal);
			}
			const stored = invoices.get(action[1]);
			if (!stored) {
				return answer(404, { statusCode: 404, message: 'Invoice not found' });
			}
			const change = (body ?? {}) as Record<string, unknown>;
			const expected = change.expectedUpdatedAt === undefined ? null : String(change.expectedUpdatedAt);
			if (expected !== null && expected !== stored.updatedAt) {
				return answer(409, { statusCode: 409, message: 'INVOICE_CHANGED' });
			}
			invoices.set(action[1], {
				...stored,
				status: String(change.status ?? stored.status),
				updatedAt: new Date().toISOString()
			});
			return answer(200, {});
		}
		const detail = /^\/invoices\/([^/]+)$/.exec(pathname);
		if (detail && method === 'GET') {
			const invoice = invoices.get(detail[1]);
			if (!invoice) {
				return answer(404, { statusCode: 404, message: 'Invoice not found' });
			}
			return answer(200, servedInvoice(invoice));
		}
		if (pathname === '/timesheet/time-log/report/owed-report' && method === 'GET') {
			return answer(200, [
				{
					date: (paramOf('startDate') ?? new Date().toISOString()).slice(0, 10),
					employees: members.map((member) => ({
						employee: {
							id: member.id,
							userId: member.id,
							billRateValue: member.billRateValue,
							billRateCurrency: member.billRateCurrency,
							user: {
								id: member.id,
								firstName: member.firstName,
								lastName: member.lastName,
								name: `${member.firstName} ${member.lastName}`
							}
						},
						amount: 0,
						duration: 0,
						rateSource: 'member',
						currency: member.billRateCurrency
					}))
				}
			]);
		}
		if (pathname === '/timesheet/time-log' && method === 'GET') {
			if (nextLogs) {
				logs = nextLogs;
				nextLogs = null;
			}
			const startRaw = paramOf('startDate');
			const endRaw = paramOf('endDate');
			const start = startRaw ? Date.parse(startRaw) : Date.now() - 30 * DAY_MS;
			const end = endRaw ? Date.parse(endRaw) : Date.now();
			if (anchor === null) {
				anchor = {
					startDate: startRaw ?? new Date(start).toISOString(),
					endDate: endRaw ?? new Date(end).toISOString()
				};
			}
			const projectIds = listParamOf(query, 'projectIds');
			const notInvoiced = hasParam('notInvoiced');
			const withClientRates = hasParam('withClientRates');
			const answers = logs
				.filter((spec) => projectIds.length === 0 || projectIds.includes(spec.projectId))
				.filter((spec) => {
					const startedAt = logStartMs(spec);
					return startedAt >= start && startedAt <= end;
				})
				.filter((spec) => {
					if (!notInvoiced) {
						return true;
					}
					const lineId = spec.invoiceItemId;
					if (!lineId) {
						return true;
					}
					// The model of Ever Gauzy's `notInvoiced`: time a *live* (not void) invoice bills is not offered.
					for (const invoice of invoices.values()) {
						const billsIt = invoice.invoiceItems.some((line) => line.id === lineId);
						if (billsIt && invoice.status !== 'VOID') {
							return false;
						}
					}
					return true;
				})
				.map((spec) => {
					const startedAt = new Date(logStartMs(spec));
					const stoppedAt = new Date(startedAt.getTime() + spec.duration * 1000);
					const record: Record<string, unknown> = {
						id: spec.id,
						projectId: spec.projectId,
						employeeId: spec.employeeId,
						taskId: spec.taskId,
						isBillable: spec.isBillable,
						duration: spec.duration,
						startedAt: startedAt.toISOString(),
						stoppedAt: stoppedAt.toISOString(),
						invoiceItemId: spec.invoiceItemId
					};
					if (spec.taskTitle !== null || spec.taskNumber !== null) {
						record.task = { id: spec.taskId, title: spec.taskTitle, number: spec.taskNumber };
					}
					if (spec.keptRates) {
						record.ratesStored = true;
						record.billRateValue = spec.keptRates.billRateValue;
						record.billRateCurrency = spec.keptRates.billRateCurrency;
						if (withClientRates) {
							record.clientRates = {
								projectBillRateValue: spec.keptRates.projectBillRateValue,
								projectMemberBillRateValue: spec.keptRates.projectMemberBillRateValue,
								projectBillRateCurrency: spec.keptRates.projectBillRateCurrency,
								projectMemberBillRateCurrency: spec.keptRates.projectMemberBillRateCurrency
							};
						}
					} else {
						record.ratesStored = false;
						record.billRateValue = null;
						record.billRateCurrency = null;
						if (withClientRates) {
							record.clientRates = null;
						}
					}
					return record;
				});
			return answer(200, answers);
		}
		return answer(599, { statusCode: 599, message: `this spec scripted no answer for ${method} ${pathname}` });
	};

	return page
		.route(
			(url) =>
				url.origin === MOCK_API_ORIGIN &&
				(url.pathname.startsWith('/api/organization-contact') ||
					url.pathname === '/api/organization-projects' ||
					/^\/api\/organization-projects\/[^/]+\/rates$/.test(url.pathname) ||
					url.pathname.startsWith('/api/timesheet/time-log') ||
					url.pathname === '/api/invoice-schedules' ||
					url.pathname.startsWith('/api/invoices')),
			handler
		)
		.then(() => {
			const shapeOf = (call: ServedCall) =>
				`${call.method} ${call.path}${call.query ? `?${call.query}` : ''}${
					call.body === null ? '' : ` ${JSON.stringify(call.body)}`
				}`;
			return {
				shapes: () => calls.map(shapeOf),
				readsOf: () => calls.filter((call) => call.method === 'GET'),
				writesOf: () => calls.filter((call) => call.method !== 'GET'),
				only: (method, path) => calls.filter((call) => call.method === method && call.path === path),
				timeReads: () => calls.filter((call) => call.method === 'GET' && call.path === '/timesheet/time-log'),
				queryPairs: (call) => queryPairsOf(call.query),
				firstTimeBounds: () => anchor,
				invoice: (id) => invoices.get(id) ?? null,
				created: () =>
					calls
						.filter((call) => call.method === 'POST' && call.path === '/invoices')
						.map((call) => call.body),
				serveLogsOnNextRead: (next) => {
					nextLogs = next;
				}
			} satisfies InvoiceNewHarness;
		});
}

/* ------------------------------------------------------------------ what the served data must add up to */

/** The time of test 2/3/5: one project, two members, three priced lines. */
const LOG_ONE = 'log-a-one';
const LOG_TWO = 'log-a-two';
const LOG_THREE = 'log-a-three';
const LOG_KEPT = 'log-a-kept';
const LOG_BILLED = 'log-a-billed';

const logsOf = (): ServedLogSpec[] => [
	{
		id: LOG_ONE,
		dayIndex: 0,
		projectId: PROJECT_A,
		employeeId: MEMBER_ONE,
		taskId: 'task-a-1',
		taskTitle: 'Fixture task one',
		taskNumber: 21,
		duration: 3600,
		invoiceItemId: null,
		isBillable: true
	},
	{
		id: LOG_TWO,
		dayIndex: 1,
		projectId: PROJECT_A,
		employeeId: MEMBER_ONE,
		taskId: 'task-a-2',
		taskTitle: 'Fixture task two',
		taskNumber: 22,
		duration: 1800,
		invoiceItemId: null,
		isBillable: true
	},
	{
		id: LOG_THREE,
		dayIndex: 2,
		projectId: PROJECT_A,
		employeeId: MEMBER_TWO,
		taskId: null,
		taskTitle: null,
		taskNumber: null,
		duration: 7200,
		invoiceItemId: null,
		isBillable: true
	},
	{
		id: LOG_KEPT,
		dayIndex: 3,
		projectId: PROJECT_A,
		employeeId: MEMBER_TWO,
		taskId: null,
		taskTitle: null,
		taskNumber: null,
		duration: 3600,
		invoiceItemId: null,
		isBillable: true,
		keptRates: {
			projectBillRateValue: 70,
			projectMemberBillRateValue: null,
			projectBillRateCurrency: ORG_CURRENCY,
			projectMemberBillRateCurrency: null,
			billRateValue: null,
			billRateCurrency: null
		}
	}
];

const MEMBERS: ServedMember[] = [
	{ id: MEMBER_ONE, firstName: 'Fixture', lastName: 'Member One', billRateValue: 55, billRateCurrency: ORG_CURRENCY },
	{ id: MEMBER_TWO, firstName: 'Fixture', lastName: 'Member Two', billRateValue: null, billRateCurrency: null },
	{ id: MEMBER_NONE, firstName: 'No', lastName: 'Rate', billRateValue: null, billRateCurrency: null }
];

/** The client without an e-mail and without client terms: its project rate and its 2 h of time (probe 4 `R2`
 *  measured "1 line, 2.00 h, $120.00"), and the terms the screen falls back to for it: no client terms and no
 *  `daysUntilDue` → `{ source: 'standard', days: STANDARD_DUE_DAYS }` (`invoiceDueTermOf` `invoices.ts:1099-1112`,
 *  `STANDARD_DUE_DAYS` `:1081`), applied by `dueDayAfter` (`:1115-1121`) at `use-new-invoice.ts:332-333`.
 *  Probe 4 `R2` measured it: issued Nov 26, due Dec 26 = issue + 30 days. */
const RATE_GAMMA = 60;
const DEFAULT_TERM_DAYS = 30;
/** What the test types into the note field; it is typed input, not copy the app prints. */
const NOTE_TEXT = 'Bill the second half of the month next month.';
/** The recipient the test rewrites the client's e-mail to, to prove the send goes where it was typed. */
const RECIPIENT_TEXT = 'accounts@example.test';
const GAMMA_LOG: ServedLogSpec = {
	id: 'log-c-one',
	dayIndex: 0,
	projectId: PROJECT_C,
	employeeId: MEMBER_TWO,
	taskId: null,
	taskTitle: null,
	taskNumber: null,
	duration: 7200,
	invoiceItemId: null,
	isBillable: true
};

const RATES: Record<string, ServedProjectRates> = {
	[PROJECT_A]: {
		id: PROJECT_A,
		billRateValue: 90,
		currency: ORG_CURRENCY,
		members: [{ employeeId: MEMBER_ONE, billRateValue: 100 }]
	},
	// 60 an hour on the client without an e-mail: the price probe 4 `R2` measured for it ("1 line, 2.00 h, $120.00")
	[PROJECT_C]: { id: PROJECT_C, billRateValue: RATE_GAMMA, currency: ORG_CURRENCY, members: [] },
	[PROJECT_D]: { id: PROJECT_D, billRateValue: 80, currency: ORG_CURRENCY, members: [] },
	[PROJECT_E]: {
		id: PROJECT_E,
		billRateValue: null,
		currency: 'EUR',
		members: [{ employeeId: MEMBER_TWO, billRateValue: 100 }]
	}
};

const baseScript = (): ServeScript => ({
	clients: [
		clientOf(CLIENT_A, CLIENT_A_NAME, { primaryEmail: CLIENT_A_EMAIL, paymentTermsDays: 14 }),
		clientOf(CLIENT_C, CLIENT_C_NAME),
		clientOf(CLIENT_D, CLIENT_D_NAME)
	],
	projects: [
		projectOf(PROJECT_A, PROJECT_A_NAME, CLIENT_A),
		projectOf(PROJECT_C, 'Gamma Project', CLIENT_C),
		projectOf(PROJECT_D, PROJECT_D_NAME, CLIENT_D)
	],
	members: MEMBERS,
	projectRates: RATES,
	logs: logsOf(),
	invoices: []
});

/** The prices the served time must print: the member's own client rate, the kept project rate, the project rate. */
const RATE_MEMBER = 100;
const RATE_KEPT = 70;
const RATE_PROJECT = 90;
const HOURS_MEMBER = 1.5;
const HOURS_KEPT = 1;
const HOURS_PROJECT = 2;
const SUBTOTAL = HOURS_MEMBER * RATE_MEMBER + HOURS_KEPT * RATE_KEPT + HOURS_PROJECT * RATE_PROJECT;
const HOURS_TOTAL = HOURS_MEMBER + HOURS_KEPT + HOURS_PROJECT;
const DISCOUNT_PERCENT = 10;
const TAX_PERCENT = 20;
const DISCOUNT_AMOUNT = (SUBTOTAL * DISCOUNT_PERCENT) / 100;
const TAX_BASE = SUBTOTAL - DISCOUNT_AMOUNT;
const TAX_AMOUNT = (TAX_BASE * TAX_PERCENT) / 100;
const TOTAL = SUBTOTAL - DISCOUNT_AMOUNT + TAX_AMOUNT;
const NUMBER = 4022;

const servedInvoiceOf = (overrides: Partial<ServedInvoice> = {}): ServedInvoice => ({
	id: OVERLAP_INVOICE_ID,
	updatedAt: instantOf(dayKey(-2)),
	invoiceNumber: 4100,
	invoiceDate: instantOf(dayKey(-3)),
	dueDate: instantOf(dayKey(20)),
	currency: ORG_CURRENCY,
	totalValue: 500,
	alreadyPaid: null,
	amountDue: null,
	status: 'SENT',
	terms: logDayTerms(LOG_BILLED),
	toContactId: CLIENT_A,
	toContact: { id: CLIENT_A, name: CLIENT_A_NAME, primaryEmail: CLIENT_A_EMAIL, imageUrl: null },
	organizationId: ORG_ID,
	tenantId: TENANT_ID,
	invoiceType: 'BY_PROJECT_HOURS',
	discountValue: 0,
	discountType: 'PERCENT',
	tax: 0,
	taxType: 'PERCENT',
	tax2: 0,
	tax2Type: 'PERCENT',
	invoiceItems: [
		{
			id: OVERLAP_LINE_ID,
			description: 'Overlap line',
			price: 100,
			quantity: 4,
			totalValue: 400,
			applyTax: false,
			applyDiscount: false,
			projectId: PROJECT_A,
			employeeId: MEMBER_ONE,
			project: { id: PROJECT_A, name: PROJECT_A_NAME }
		}
	],
	...overrides
});

/** The log a live earlier invoice bills: 4 h of member one, on the day that earlier invoice states as its period. */
const billedLogOf = (lineId: string): ServedLogSpec => ({
	id: LOG_BILLED,
	dayIndex: 1,
	projectId: PROJECT_A,
	employeeId: MEMBER_ONE,
	taskId: null,
	taskTitle: null,
	taskNumber: null,
	duration: 14_400,
	invoiceItemId: lineId,
	isBillable: true
});

/* ------------------------------------------------------------------ printed text, rebuilt the way the app builds it */

/** `formatOwed` with a currency (`core/lib/utils/dashboards/payments-due.ts:806-811` → `formatAmount`). */
const money = (amount: number, currency = ORG_CURRENCY) =>
	new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
/** `formatPercent` (`core/lib/utils/invoice-totals.ts:106-114`): `Intl … { style:'percent' }` of `percent / 100`. */
const percentText = (percent: number) =>
	new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 4 }).format(percent / 100);
/** `formatInvoiceHours` (`invoices.ts:1484-1491`): always two decimals. */
const hoursText = (hours: number) =>
	new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours);
/** `invoices.new.HOURS` → `1.50 h`. */
const hoursCell = (hours: number) => filled(NEW.HOURS, { hours: hoursText(hours) });
/** `invoices.new.RATE_PER_HOUR` → `$100.00/h`. */
const rateCell = (rate: number, currency = ORG_CURRENCY) => filled(NEW.RATE_PER_HOUR, { rate: money(rate, currency) });
/** `invoiceDayTextOf` (`invoices.ts:1454-1460`): short month + day, the year only in another year. */
const dayText = (key: string) => {
	const day = new Date(`${key}T00:00:00`);
	const showsYear = day.getFullYear() !== new Date().getFullYear();
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		...(showsYear ? { year: 'numeric' } : {})
	}).format(day);
};
/** The sheet Discount row is `formatOwed` of a negative (`invoice-sheet.tsx:249-252` over `takenOffOf:249-256`), so
 *  its minus glyph is the one Intl prints; both sides are compared without it and the raw pair is reported. */
const stripMinus = (value: string) => value.replace(/^[−-]/, '');

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/mutation-error-toaster.tsx:41-49` prints this for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** `api.service.ts` `logError`: the client line for a refusal it was not told to expect. */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[HttpClient] HTTP Error: ${verb} ${path} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The full invoice set, as `invoice-access-ui.spec.ts:119-121` arms it; it also holds the rate-admin permission
 *  (`core/lib/utils/rates.ts:11`), which is why the measured time reads carry `withClientRates`. */
const FULL_SET: MockScenario = {
	extraPermissions: ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE']
};

/* Measured in the probe logs: the toolbar (title, client menu, period, grouping) is the layout mainHeaderSlot; the
   document is the main region, and this screen renders a second empty main too, hence last(). The toolbar buttons
   (Take the time again) are NOT inside the scroll owner, so nothing here depends on it. */
const contentRegion = (page: Page) => page.getByRole('main').last();
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const documentText = async (page: Page) =>
	contentRegion(page)
		.innerText()
		.then(flat)
		.catch(() => '(no main region)');

const regionTexts = async (page: Page, selector: string) =>
	page
		.locator(selector)
		.allInnerTexts()
		.then((all) => all.map(flat))
		.catch(() => [] as string[]);

/** The sheet is the labelled section (`invoice-sheet.tsx:253-262`, `invoices.new.SHEET_LABEL`). */
const sheetSection = (page: Page) => page.getByRole('region', { name: NEW.SHEET_LABEL, exact: true });
const sheetText = async (page: Page) =>
	sheetSection(page)
		.innerText()
		.then(flat)
		.catch(() => '(no sheet)');

/** The paper dt / dd pairs: the head facts, then Subtotal, Discount, Tax and Total (`invoice-sheet.tsx:204-234`). */
const paperPairs = async (page: Page) =>
	page.locator('dt').evaluateAll((nodes) =>
		nodes.map((node) => {
			const label = node.textContent ?? '';
			const value = node.nextElementSibling?.textContent ?? '';
			return `${label.replace(/\s+/g, ' ').trim()} = ${value.replace(/\s+/g, ' ').trim()}`;
		})
	);

const rowTexts = async (page: Page) => await regionTexts(page, '[role="row"]');
const cellTexts = async (page: Page) => await regionTexts(page, '[role="cell"]');
const cellTitles = (page: Page) =>
	page.locator('[role="cell"] [title]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title') ?? ''));

const fieldInput = (page: Page, label: string) => page.getByLabel(label, { exact: true });
const primaryButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const saveButton = (page: Page) => primaryButton(page, NEW.SAVE);
const removeButtons = (page: Page) => page.getByRole('button', { name: /Remove the line/ });
/** `invoice-details.tsx:280-287` prints the problems in a `ul[aria-live="polite"]`; sonner live region is an `ol`. */
const problemTexts = async (page: Page) => await regionTexts(page, 'ul[aria-live="polite"] li');
/** `Notice` renders an `<output>` (`core/components/common/notice.tsx:41-64`): the title in a `<p>` and its
 *  description in the `<div>` after it — the two run together in `textContent`, so they are read apart. The screen
 *  carries more than one `<output>` (its own workspace-zone Notice is one), so a Notice is always matched by title. */
const noticeParts = async (page: Page) => {
	const raw = await page.locator('output').evaluateAll((nodes) =>
		nodes.map((node) => ({
			title: node.querySelector('p')?.textContent ?? '',
			description: node.querySelector('p + div')?.textContent ?? ''
		}))
	);
	return raw.map((notice) => ({ title: flat(notice.title), description: flat(notice.description) }));
};
/** The overlap notice of `invoice-screen.tsx:30-57`, by its title. */
const noticeWithTitle = (page: Page, title: string) => page.locator('output').filter({ hasText: flat(title) });
/** The only overlap titles `OverlapNotice` can print, for the case where nothing overlaps. */
const overlapTitles = (client: string) => [
	T.billedTime.LEFT_OUT_TITLE,
	messageOf(NEW.earlier.OVERLAP_TITLE, { count: 1, client }),
	messageOf(NEW.earlier.OVERLAP_TITLE, { count: 2, client })
];
/** One paper fact out of the `dt` / `dd` pairs, by its label. */
const pairOf = (pairs: string[], label: string) => pairs.find((pair) => pair.startsWith(`${label} = `)) ?? '(missing)';
const labelOfPair = (pair: string) => pair.slice(0, pair.indexOf(' = '));
const valueOfPair = (pair: string) => pair.slice(pair.indexOf(' = ') + 3);

const dialog = (page: Page) => page.getByRole('dialog');
const dialogText = async (page: Page) =>
	page
		.locator('[role="dialog"]')
		.innerText()
		.then(flat)
		.catch(() => '(no dialog)');
const dialogItems = async (page: Page) => await regionTexts(page, '[role="dialog"] li');
const toastText = async (page: Page) =>
	page
		.locator('[data-sonner-toaster]')
		.innerText()
		.then(flat)
		.catch(() => '(no toast)');

/** A date field prints its day in the host own numeric format (`core/components/common/date-field.tsx`); the
 *  expectation is built inside the browser from the same host locale, so no machine format is pinned. */
const dateFieldValue = async (page: Page, label: string, key: string) => {
	const shown = await page.evaluate((dayKeyValue) => {
		const [year, month, day] = dayKeyValue.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString(undefined, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	}, key);
	await expect(fieldInput(page, label)).toHaveValue(shown, { timeout: 15_000 });
	return shown;
};

/** The day the Issue date field holds, matched back to a `YYYY-MM-DD` key by formatting candidate days in the
 *  browser itself. Run 1 measured why this is read rather than computed: `use-new-invoice.ts:254-256` seeds the day
 *  with `todayDayKey(organization?.timeZone)` (`invoices.ts:1068-1073`; the lane mock's organization is `UTC`,
 *  `mock-gauzy-server.mjs:86-99`, and the page's own banner says "Your profile uses UTC") while its `period` comes
 *  from `newDraftSeedOf`'s `periodOfPreset` of this browser's calendar (`:110`, `timeZone=Europe/Madrid` in the
 *  measured read), so near midnight the two days differ: `Issued Nov 26` beside `Period = Oct 1 – 31`. No zone is
 *  assumed — today of this browser and today of `UTC`, each ±1 day, and the one whose host-formatted text equals
 *  the field. */
const issueDayKeyOf = async (page: Page) => {
	const shown = await fieldInput(page, NEW.details.ISSUE_DATE).inputValue();
	const candidates = await page.evaluate((value) => {
		const zones = [Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC'];
		const matches = new Set<string>();
		for (const timeZone of zones) {
			const parts = new Intl.DateTimeFormat('en-CA', {
				timeZone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(new Date());
			const [year, month, day] = parts.split('-').map(Number);
			for (const offset of [-1, 0, 1]) {
				const shifted = new Date(year, month - 1, day + offset);
				const formatted = shifted.toLocaleDateString(undefined, {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit'
				});
				if (formatted !== value) {
					continue;
				}
				const pad = (n: number) => String(n).padStart(2, '0');
				matches.add(`${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`);
			}
		}
		return [...matches];
	}, shown);
	if (candidates.length === 0) {
		throw new Error(`the Issue date field holds ${shown}, which no candidate day of this browser formats to`);
	}
	report('issue day read from the field', { shown, candidates });
	return candidates[0];
};

/** Types a day into a `DateField` in the host's own display format — the same format `dateFieldValue` reads back,
 *  so no calendar or machine format is pinned here either. */
const fillDateField = async (page: Page, label: string, key: string) => {
	const shown = await page.evaluate((dayKeyValue) => {
		const [year, month, day] = dayKeyValue.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString(undefined, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	}, key);
	await fieldInput(page, label).fill(shown, { timeout: 15_000 });
	return shown;
};

/** The period the screen opens on (the previous calendar month) and the instants its day bounds take in this
 *  browser's own zone: `newDraftSeedOf` seeds `periodOfPreset('lastMonth', INVOICE_WEEK_START)`
 *  (`use-new-invoice.ts:108-122`), and `use-invoice-time.ts:382-397` turns it into `startDate` / `endDate` plus the
 *  `timeZone` this browser reports. Nothing here pins a zone or a date. */
const browserPeriod = (page: Page) =>
	page.evaluate(() => {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const today = new Intl.DateTimeFormat('en-CA', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(new Date());
		const [year, month] = today.split('-').map(Number);
		const firstOfPrev = new Date(Date.UTC(year, month - 2, 1));
		const lastOfPrev = new Date(Date.UTC(firstOfPrev.getUTCFullYear(), firstOfPrev.getUTCMonth() + 1, 0));
		const keyOf = (date: Date) =>
			`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
		const fromDay = keyOf(firstOfPrev);
		const toDay = keyOf(lastOfPrev);
		return {
			zone,
			todayKey: today,
			fromDay,
			toDay,
			startDate: new Date(`${fromDay}T00:00:00.000`).toISOString(),
			endDate: new Date(`${toDay}T23:59:59.999`).toISOString()
		};
	});

/** `today ± n` in the browser's own zone, and the period text both the paper and the confirm dialog print
 *  (`invoicePeriodTextOf` → `formatPeriod`), rebuilt inside the browser so no zone or calendar is pinned. */
const dayAfterInBrowser = (page: Page, fromDay: string, days: number) =>
	page.evaluate(
		([day, offset]) => {
			const [year, month, date] = day.split('-').map(Number);
			const shifted = new Date(year, month - 1, date + offset);
			const pad = (value: number) => String(value).padStart(2, '0');
			return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
		},
		[fromDay, days] as [string, number]
	);

const periodTextInBrowser = (page: Page, fromDay: string, toDay: string) =>
	page.evaluate(
		([first, last]) =>
			new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
				.formatRange(new Date(`${first}T00:00:00`), new Date(`${last}T00:00:00`))
				.replace(/\s+/g, ' ')
				.trim(),
		[fromDay, toDay] as [string, string]
	);

/** Waits for the one free billable-time read of a visit, then returns its sorted query pairs. */
const timeReadPairs = async (page: Page, store: InvoiceNewHarness) => {
	await expect
		.poll(async () => store.timeReads().filter((call) => call.query.includes('notInvoiced')).length, {
			timeout: 30_000
		})
		.toBeGreaterThan(0);
	const read = store.timeReads().find((call) => call.query.includes('notInvoiced'));
	return read ? store.queryPairs(read) : ([] as string[]);
};

/** Opens the client menu of the toolbar and picks one client by name (its option name also holds the tile initials
 *  and the shortcut keycap, so the match is a substring, and the menu is reopened for each pick). */
async function pickClient(page: Page, name: string) {
	await page.getByRole('button', { name: EN.common.CLIENT, exact: true }).last().click({ timeout: 15_000 });
	await expect(page.getByRole('listbox').first()).toBeVisible({ timeout: 15_000 });
	await page.getByRole('option', { name }).first().click({ timeout: 15_000 });
	await expect(page.getByRole('listbox')).toHaveCount(0, { timeout: 15_000 });
}

const NEW_PATH = '/invoices/new';
/** The rows of a read list, compared as members: concurrent reads arrive in race order. */
const sortedOf = (values: string[]) => [...new Set(values)].sort();

test.describe('lane-b · making an invoice on /invoices/new', () => {
	test.beforeEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------ 1 · the screen before a client is picked

	test('1 · with no client picked it asks for one, and reads only what a client pick needs', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, NEW_PATH, { scenario: FULL_SET });

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(T.NEW_INVOICE, { timeout: 25_000 });
		// the title and the client menu in the same block both read `Choose a client` (probe 4 `R10` printed it
		// twice), so the title is taken first and the message, which only the block prints, carries the meaning
		await expect(contentRegion(page).getByText(NEW.CHOOSE_CLIENT_TITLE).first()).toBeVisible({ timeout: 25_000 });
		await expect(contentRegion(page).getByText(NEW.CHOOSE_CLIENT_MESSAGE)).toBeVisible();
		await expect(
			contentRegion(page).getByRole('button', { name: EN.common.CLIENT, exact: true }).first()
		).toBeVisible();
		await expect(sheetSection(page)).toHaveCount(0);
		await expect(saveButton(page)).toHaveCount(0);

		await expect.poll(async () => store.readsOf().length, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
		const reads = sortedOf(store.readsOf().map((call) => `${call.method} ${call.path}`));
		const timeReads = store.timeReads().length;
		report('1 no client', { reads, timeReads, body: await documentText(page) });
		await expect(reads).toEqual([
			'GET /invoices/highest',
			'GET /organization-contact/pagination',
			'GET /organization-projects'
		]);
		await expect(timeReads).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 2 · picking a client from the menu

	test('2 · picking a client sends the billable-time read exactly as sent, and prints its lines', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, NEW_PATH, { scenario: FULL_SET });
		const menu = page.getByRole('button', { name: EN.common.CLIENT, exact: true });
		await expect(menu.last()).toBeVisible({ timeout: 25_000 });
		const optionNames = await page.evaluate(() =>
			Array.from(document.querySelectorAll('[role="option"]')).map((node) =>
				(node as HTMLElement).innerText.replace(/\s+/g, ' ').trim()
			)
		);
		report('2 menu before pick', { menuButtons: await menu.count(), optionNames });

		await pickClient(page, CLIENT_A_NAME);
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });

		const period = await browserPeriod(page);
		const pairs = await timeReadPairs(page, store);
		const sheetRows = await cellTexts(page).then((cells) => cells.filter((cell) => cell !== ''));
		const sheet = await sheetText(page);
		report('2 time read', { path: '/timesheet/time-log', pairs, cells: sheetRows, sheet });

		await expect(pairs).toEqual([
			'billableOnly=true',
			`endDate=${period.endDate}`,
			'notInvoiced=true',
			`organizationId=${ORG_ID}`,
			`projectIds[0]=${PROJECT_A}`,
			'relations[0]=task',
			`startDate=${period.startDate}`,
			`tenantId=${TENANT_ID}`,
			`timeZone=${period.zone}`,
			'withClientRates=true'
		]);
		await expect(sheetRows).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(HOURS_TOTAL)} · ${money(SUBTOTAL)}`,
			hoursCell(HOURS_MEMBER),
			rateCell(RATE_MEMBER),
			money(HOURS_MEMBER * RATE_MEMBER),
			hoursCell(HOURS_KEPT),
			rateCell(RATE_KEPT),
			money(HOURS_KEPT * RATE_KEPT),
			hoursCell(HOURS_PROJECT),
			rateCell(RATE_PROJECT),
			money(HOURS_PROJECT * RATE_PROJECT)
		]);
		await expect(sheet).toContain(filled(NEW.FROM, {}));
		await expect(sheet).toContain(ORG_NAME);
		await expect(sheet).toContain(CLIENT_A_NAME);
		await expect(sheet).toContain(CLIENT_A_EMAIL);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 3 · ?client=<id> opens with the client picked

	test('3 · a client in the address is already picked: the same read, the same lines, no invoice yet', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });

		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		const menu = page.getByRole('button', { name: EN.common.CLIENT, exact: true });
		await expect(menu.last()).toContainText(CLIENT_A_NAME);

		const period = await browserPeriod(page);
		const pairs = await timeReadPairs(page, store);
		report('3 query read', { pairs, sheet: await sheetText(page) });
		await expect(pairs).toEqual([
			'billableOnly=true',
			`endDate=${period.endDate}`,
			'notInvoiced=true',
			`organizationId=${ORG_ID}`,
			`projectIds[0]=${PROJECT_A}`,
			'relations[0]=task',
			`startDate=${period.startDate}`,
			`tenantId=${TENANT_ID}`,
			`timeZone=${period.zone}`,
			'withClientRates=true'
		]);
		await expect(
			contentRegion(page).getByText(filled(T.new.earlier.TITLE, { client: CLIENT_A_NAME }))
		).toBeVisible();
		await expect(contentRegion(page).getByText(T.new.earlier.NONE)).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 4 · the screens that offer nothing to bill

	test('4 · no client, no project, no billable time, every hour already invoiced: what each says, and that there is no Save', async ({
		page,
		fixture,
		shield
	}) => {
		await serveNewInvoice(page, { ...baseScript(), clients: [], projects: [], logs: [] });
		await signInAndVisit(page, fixture, NEW_PATH, { scenario: FULL_SET });
		const noClientsBody = await documentText(page);
		report('4 no clients', { body: noClientsBody });
		await expect(contentRegion(page).getByText(NEW.NO_CLIENTS_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(contentRegion(page).getByText(NEW.NO_CLIENTS_MESSAGE)).toBeVisible();
		await expect(page.getByRole('link', { name: NEW.OPEN_CLIENTS, exact: true })).toHaveAttribute(
			'href',
			'/clients'
		);
		await expect(saveButton(page)).toHaveCount(0);

		await serveNewInvoice(page, { ...baseScript(), projects: [] });
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		const noProjectBody = await documentText(page);
		report('4 no project', { body: noProjectBody });
		await expect(
			contentRegion(page).getByText(filled(NEW.NO_PROJECTS_TITLE, { client: CLIENT_A_NAME }))
		).toBeVisible({ timeout: 25_000 });
		await expect(contentRegion(page).getByText(NEW.NO_PROJECTS_MESSAGE)).toBeVisible();
		await expect(page.getByRole('link', { name: NEW.OPEN_PROJECTS, exact: true })).toHaveAttribute(
			'href',
			'/projects'
		);
		await expect(saveButton(page)).toHaveCount(0);

		await serveNewInvoice(page, { ...baseScript(), logs: [] });
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		const noTimeBody = await documentText(page);
		report('4 no time', { body: noTimeBody });
		await expect(contentRegion(page).getByText(filled(NEW.NO_TIME_TITLE, { client: CLIENT_A_NAME }))).toBeVisible({
			timeout: 25_000
		});
		await expect(contentRegion(page).getByText(NEW.NO_TIME_MESSAGE)).toBeVisible();
		await expect(primaryButton(page, NEW.PREVIOUS_PERIOD)).toBeVisible();
		await expect(saveButton(page)).toHaveCount(0);
		await expect(sheetSection(page)).toHaveCount(0);

		const billedLineId = 'playwright-invoice-delta-line-1';
		const deltaInvoice = servedInvoiceOf({
			id: 'playwright-invoice-delta-1',
			invoiceNumber: 4150,
			status: 'SENT',
			terms: logDayTerms(LOG_BILLED),
			totalValue: 160,
			toContactId: CLIENT_D,
			toContact: { id: CLIENT_D, name: CLIENT_D_NAME, primaryEmail: null, imageUrl: null },
			invoiceItems: [
				{
					id: billedLineId,
					description: 'Delta line',
					price: 80,
					quantity: 4,
					totalValue: 320,
					applyTax: false,
					applyDiscount: false,
					projectId: PROJECT_D,
					employeeId: MEMBER_ONE,
					project: { id: PROJECT_D, name: PROJECT_D_NAME }
				}
			]
		});
		const store = await serveNewInvoice(page, {
			...baseScript(),
			invoices: [deltaInvoice],
			logs: [{ ...billedLogOf(billedLineId), projectId: PROJECT_D }]
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_D}`, { scenario: FULL_SET });
		await expect(
			contentRegion(page).getByText(filled(T.billedTime.ALL_INVOICED_TITLE, { client: CLIENT_D_NAME }))
		).toBeVisible({ timeout: 30_000 });
		const allInvoicedBody = await documentText(page);
		report('4 all invoiced', {
			body: allInvoicedBody,
			freeReadLeftOut: store.timeReads().filter((call) => call.query.includes('notInvoiced')).length,
			allTimeRead: store.timeReads().filter((call) => !call.query.includes('notInvoiced')).length
		});
		await expect(contentRegion(page).getByText(T.billedTime.ALL_INVOICED_MESSAGE)).toBeVisible();
		await expect(page.getByRole('link', { name: T.edit.BACK_TO_LIST, exact: true })).toHaveAttribute(
			'href',
			INVOICES_PATH
		);
		await expect(saveButton(page)).toHaveCount(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 5 · the fields and the totals they print

	test('5 · number, dates, currency, discount, tax and the note: the sheet totals after each change', async ({
		page,
		fixture,
		shield
	}) => {
		await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });

		const period = await browserPeriod(page);
		const issueKey = await issueDayKeyOf(page);
		const dueDayKey = await dayAfterInBrowser(page, issueKey, 14);
		const issueShown = await dateFieldValue(page, NEW.details.ISSUE_DATE, issueKey);
		const dueShown = await dateFieldValue(page, NEW.details.DUE_DATE, dueDayKey);
		const periodText = await periodTextInBrowser(page, period.fromDay, period.toDay);
		const pairsAtStart = await paperPairs(page);
		const sheetAtStart = await sheetText(page);
		report('5 initial', {
			issueShown,
			dueShown,
			pairsAtStart,
			sheetAtStart,
			savingNote: await contentRegion(page).innerText()
		});

		await expect(fieldInput(page, NEW.details.NUMBER)).toHaveValue(String(NUMBER));
		await expect(contentRegion(page).getByText(filled(NEW.details.NUMBER_HINT, { number: NUMBER }))).toBeVisible();
		await expect(contentRegion(page).getByText(messageOf(NEW.terms.CLIENT, { days: 14 }))).toBeVisible();
		// the client has an e-mail: the note offers both ways (`invoice-details.tsx:53-61`)
		await expect(
			contentRegion(page).getByText(messageOf(NEW.sending.DRAFT_OR_SEND_NOTE, { email: CLIENT_A_EMAIL }))
		).toBeVisible();
		await expect(contentRegion(page).getByText(NEW.terms.NOTE_HINT)).toBeVisible();
		await expect(contentRegion(page).getByText(NEW.adjustments.DISCOUNT, { exact: true })).toBeVisible();
		await expect(contentRegion(page).getByText(NEW.adjustments.TAX, { exact: true })).toBeVisible();
		// one currency of the workspace → the field is a plain pair of spans, no control (`invoice-details.tsx:141-153`)
		await expect(fieldInput(page, NEW.details.CURRENCY)).toHaveCount(0);
		await expect(contentRegion(page).getByText(ORG_CURRENCY, { exact: true })).toBeVisible();

		await expect(pairsAtStart).toEqual([
			`${NEW.details.ISSUE_DATE} = ${dayText(issueKey)}`,
			`${NEW.details.DUE_DATE} = ${dayText(dueDayKey)}`,
			`${NEW.PERIOD} = ${periodText}`,
			`${NEW.TOTAL} = ${money(SUBTOTAL)}`
		]);
		await expect(sheetAtStart).toContain(
			messageOf(NEW.LINES_AND_HOURS, { count: 3, hours: hoursText(HOURS_TOTAL) })
		);
		await expect(sheetAtStart).toContain(`${NEW.TOTAL} ${money(SUBTOTAL)}`);

		// discount and tax, the pair the totals were measured with (probe 1's `dl` lines, probe 4 `R3` body `totalValue 432`)
		await fieldInput(page, NEW.adjustments.DISCOUNT).fill(String(DISCOUNT_PERCENT), { timeout: 15_000 });
		await fieldInput(page, NEW.adjustments.TAX).fill(String(TAX_PERCENT), { timeout: 15_000 });
		const pairsAdjusted = await paperPairs(page);
		report('5 pairs discount 10 tax 20', { pairsAdjusted });
		await expect(pairsAdjusted.map(labelOfPair)).toEqual([
			NEW.details.ISSUE_DATE,
			NEW.details.DUE_DATE,
			NEW.PERIOD,
			NEW.adjustments.SUBTOTAL,
			messageOf(NEW.adjustments.DISCOUNT_ROW, { percent: percentText(DISCOUNT_PERCENT) }),
			messageOf(NEW.adjustments.TAX_ROW, { percent: percentText(TAX_PERCENT), base: money(TAX_BASE) }),
			NEW.TOTAL
		]);
		await expect(pairsAdjusted.map((pair) => stripMinus(valueOfPair(pair)))).toEqual([
			dayText(issueKey),
			dayText(dueDayKey),
			periodText,
			money(SUBTOTAL),
			money(DISCOUNT_AMOUNT),
			money(TAX_AMOUNT),
			money(TOTAL)
		]);

		// 0 and 0: a written zero is printed as zero, never as "-0.00" (`invoice-sheet.tsx:196-201`)
		await fieldInput(page, NEW.adjustments.DISCOUNT).fill('0', { timeout: 15_000 });
		await fieldInput(page, NEW.adjustments.TAX).fill('0', { timeout: 15_000 });
		const pairsZero = await paperPairs(page);
		report('5 pairs discount 0 tax 0', { pairsZero });
		await expect(pairsZero.map(labelOfPair)).toEqual([
			NEW.details.ISSUE_DATE,
			NEW.details.DUE_DATE,
			NEW.PERIOD,
			NEW.adjustments.SUBTOTAL,
			messageOf(NEW.adjustments.DISCOUNT_ROW, { percent: percentText(0) }),
			messageOf(NEW.adjustments.TAX_ROW, { percent: percentText(0), base: money(SUBTOTAL) }),
			NEW.TOTAL
		]);
		await expect(pairsZero.map((pair) => stripMinus(valueOfPair(pair)))).toEqual([
			dayText(issueKey),
			dayText(dueDayKey),
			periodText,
			money(SUBTOTAL),
			money(0),
			money(0),
			money(SUBTOTAL)
		]);

		// a fraction of a percent is kept (`use-new-invoice.ts:449-459` accepts it, `formatPercent` prints it)
		await fieldInput(page, NEW.adjustments.TAX).fill('12.5', { timeout: 15_000 });
		const pairsFraction = await paperPairs(page);
		report('5 pairs tax 12.5', { pairsFraction });
		await expect(pairsFraction.map(labelOfPair)).toEqual([
			NEW.details.ISSUE_DATE,
			NEW.details.DUE_DATE,
			NEW.PERIOD,
			NEW.adjustments.SUBTOTAL,
			messageOf(NEW.adjustments.DISCOUNT_ROW, { percent: percentText(0) }),
			messageOf(NEW.adjustments.TAX_ROW, { percent: percentText(12.5), base: money(SUBTOTAL) }),
			NEW.TOTAL
		]);
		await expect(pairsFraction.map((pair) => stripMinus(valueOfPair(pair)))).toEqual([
			dayText(issueKey),
			dayText(dueDayKey),
			periodText,
			money(SUBTOTAL),
			money(0),
			money((SUBTOTAL * 12.5) / 100),
			money(SUBTOTAL + (SUBTOTAL * 12.5) / 100)
		]);

		// text that is not a percent leaves the value and the totals as they were (probe 1 measured this)
		await fieldInput(page, NEW.adjustments.TAX).fill('abc', { timeout: 15_000 });
		await expect(fieldInput(page, NEW.adjustments.TAX)).toHaveValue('12.5');
		const pairsAfterJunk = await paperPairs(page);
		report('5 pairs after junk tax', { pairsAfterJunk });
		await expect(pairsAfterJunk).toEqual(pairsFraction);

		// the note goes onto the paper (`invoice-sheet.tsx:332` `PaperNote`)
		await fieldInput(page, NEW.terms.NOTE).fill(NOTE_TEXT, { timeout: 15_000 });
		const sheetWithNote = await sheetText(page);
		report('5 sheet with note', { sheetWithNote });
		await expect(sheetSection(page).getByText(NEW.terms.NOTE, { exact: true })).toBeVisible();
		await expect(sheetSection(page).getByText(NOTE_TEXT, { exact: true })).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 6 · the confirm dialog says what the save will do

	test('6 · the confirm dialog: its copy, its buttons, and what changes when the client has no e-mail', async ({
		page,
		fixture,
		shield
	}) => {
		// both clients are served at once: the Gamma log sits on the Gamma project, so the Alpha read never sees it
		await serveNewInvoice(page, { ...baseScript(), logs: [...logsOf(), GAMMA_LOG] });
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		await fieldInput(page, NEW.adjustments.DISCOUNT).fill(String(DISCOUNT_PERCENT), { timeout: 15_000 });
		await fieldInput(page, NEW.adjustments.TAX).fill(String(TAX_PERCENT), { timeout: 15_000 });

		const browser = await browserPeriod(page);
		const issueKey = await issueDayKeyOf(page);
		const dueDayKey = await dayAfterInBrowser(page, issueKey, 14);
		const periodText = await periodTextInBrowser(page, browser.fromDay, browser.toDay);

		await saveButton(page).click({ timeout: 15_000 });
		await expect(dialog(page)).toHaveCount(1, { timeout: 15_000 });
		const items = await dialogItems(page);
		const buttons = await page
			.locator('[role="dialog"] button')
			.evaluateAll((nodes) =>
				nodes.map(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()} | aria=${node.getAttribute('aria-label') ?? '-'} | disabled=${node.getAttribute('aria-disabled') ?? 'false'}`
				)
			);
		const text = await dialogText(page);
		report('6 dialog with email', { role: 'dialog', items, buttons, text });

		await expect(dialog(page).getByText(messageOf(NEW.confirm.TITLE, { number: NUMBER }))).toBeVisible();
		await expect(dialog(page).getByRole('listitem')).toHaveText([
			messageOf(NEW.confirm.CLIENT, { client: CLIENT_A_NAME, period: periodText }),
			// the row states the total the invoice will carry, discount and tax included
			messageOf(NEW.confirm.LINES, { count: 3, hours: hoursText(HOURS_TOTAL), total: money(TOTAL) }),
			messageOf(NEW.confirm.DATES, { issueDate: dayText(issueKey), dueDate: dayText(dueDayKey) }),
			NEW.confirm.DRAFT,
			NEW.sending.SEND_CONSEQUENCE
		]);
		await expect(primaryButton(page, NEW.sending.SAVE_AND_SEND)).toBeVisible();
		await expect(primaryButton(page, EN.common.CANCEL)).toBeVisible();
		// the recipient comes from the client and can be rewritten before the send (`invoice-sending.tsx:16-44`)
		await expect(fieldInput(page, T.send.RECIPIENT)).toHaveValue(CLIENT_A_EMAIL);
		await expect(primaryButton(page, NEW.SAVE)).toBeVisible();

		await primaryButton(page, EN.common.CANCEL).click({ timeout: 15_000 });
		await expect(dialog(page)).toHaveCount(0, { timeout: 15_000 });
		await expect(saveButton(page)).toBeVisible();

		// the same screen for a client with no e-mail: no recipient field, no send promise, one confirm button
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_C}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		const browserOfQuiet = await browserPeriod(page);
		const quietIssueKey = await issueDayKeyOf(page);
		const dueQuiet = await dayAfterInBrowser(page, quietIssueKey, DEFAULT_TERM_DAYS);
		await saveButton(page).click({ timeout: 15_000 });
		await expect(dialog(page)).toHaveCount(1, { timeout: 15_000 });
		const quietItems = await dialogItems(page);
		const quietButtons = await page
			.locator('[role="dialog"] button')
			.evaluateAll((nodes) =>
				nodes.map(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()} | disabled=${node.getAttribute('aria-disabled') ?? 'false'}`
				)
			);
		report('6 dialog without email', { items: quietItems, buttons: quietButtons, text: await dialogText(page) });
		await expect(dialog(page).getByRole('listitem')).toHaveText([
			messageOf(NEW.confirm.CLIENT, {
				client: CLIENT_C_NAME,
				period: await periodTextInBrowser(page, browserOfQuiet.fromDay, browserOfQuiet.toDay)
			}),
			messageOf(NEW.confirm.LINES, { count: 1, hours: hoursText(2), total: money(2 * RATE_GAMMA, ORG_CURRENCY) }),
			messageOf(NEW.confirm.DATES, { issueDate: dayText(quietIssueKey), dueDate: dayText(dueQuiet) }),
			NEW.confirm.DRAFT
		]);
		// the send consequence is promised only when the client has an e-mail to send to
		// (`save-invoice-dialog.tsx:47-48` `knowsRecipient = clientEmail !== ''`, `:159-161` the row it adds)
		await expect(dialog(page).getByText(NEW.sending.SEND_CONSEQUENCE)).toHaveCount(0);
		// without an e-mail the dialog takes the no-recipient shape: no recipient field, no Send button
		// (`save-invoice-dialog.tsx:189-204`)
		await expect(fieldInput(page, T.send.RECIPIENT)).toHaveCount(0);
		await expect(primaryButton(page, NEW.sending.SAVE_AND_SEND)).toHaveCount(0);
		await expect(primaryButton(page, NEW.SAVE)).toBeVisible();
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 7 · saving a draft: the write, the landing, the list

	test('7 · saving a draft: one write carrying its lines and their time, then the list shows the invoice', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		await fieldInput(page, NEW.adjustments.DISCOUNT).fill(String(DISCOUNT_PERCENT), { timeout: 15_000 });
		await fieldInput(page, NEW.adjustments.TAX).fill(String(TAX_PERCENT), { timeout: 15_000 });

		const browser = await browserPeriod(page);
		const issueKey = await issueDayKeyOf(page);
		const dueDayKey = await dayAfterInBrowser(page, issueKey, 14);
		const periodText = await periodTextInBrowser(page, browser.fromDay, browser.toDay);

		await saveButton(page).click({ timeout: 15_000 });
		await expect(dialog(page)).toHaveCount(1, { timeout: 15_000 });
		await primaryButton(page, NEW.SAVE).click({ timeout: 15_000 });
		await expect.poll(async () => store.created().length, { timeout: 30_000 }).toBe(1);

		const body = store.created()[0] as Record<string, unknown>;
		const items = (body.invoiceItems ?? []) as Record<string, unknown>[];
		report('7 write body', {
			fields: Object.keys(body).sort(),
			body,
			lines: items.map((item) => ({
				description: item.description,
				price: item.price,
				quantity: item.quantity,
				totalValue: item.totalValue,
				employeeId: item.employeeId,
				projectId: item.projectId,
				timeLogIds: item.timeLogIds,
				applyTax: item.applyTax,
				applyDiscount: item.applyDiscount
			}))
		});

		await expect(body.invoiceNumber).toBe(NUMBER);
		await expect(body.status).toBe('DRAFT');
		await expect(body.currency).toBe(ORG_CURRENCY);
		await expect(body.isEstimate).toBe(false);
		await expect(body.paid).toBe(false);
		await expect(body.totalValue).toBe(TOTAL);
		await expect(body.discountValue).toBe(DISCOUNT_PERCENT);
		await expect(body.discountType).toBe('PERCENT');
		await expect(body.tax).toBe(TAX_PERCENT);
		await expect(body.taxType).toBe('PERCENT');
		await expect(body.toContactId).toBe(CLIENT_A);
		await expect(body.organizationContactId).toBe(CLIENT_A);
		await expect(body.organizationId).toBe(ORG_ID);
		await expect(body.tenantId).toBe(TENANT_ID);
		// the day bounds of the saved invoice are the organization zone's (UTC here), never the browser's
		await expect(body.invoiceDate).toBe(`${issueKey}T00:00:00.000Z`);
		await expect(body.dueDate).toBe(`${dueDayKey}T23:59:59.999Z`);
		// the invoice states the period it billed (`invoiceTermsOf`, `invoices.ts:976-991`); only the day keys are pinned
		await expect(String(body.terms)).toContain(`${browser.fromDay} to ${browser.toDay}`);
		await expect(items.length).toBe(3);
		await expect(items.map((item) => item.description)).toEqual([
			MEMBER_ONE_NAME,
			MEMBER_TWO_NAME,
			MEMBER_TWO_NAME
		]);
		await expect(items.map((item) => item.price)).toEqual([RATE_MEMBER, RATE_KEPT, RATE_PROJECT]);
		await expect(items.map((item) => item.quantity)).toEqual([HOURS_MEMBER, HOURS_KEPT, HOURS_PROJECT]);
		await expect(items.map((item) => item.totalValue)).toEqual([
			HOURS_MEMBER * RATE_MEMBER,
			HOURS_KEPT * RATE_KEPT,
			HOURS_PROJECT * RATE_PROJECT
		]);
		await expect(items.map((item) => item.employeeId)).toEqual([MEMBER_ONE, MEMBER_TWO, MEMBER_TWO]);
		await expect(items.map((item) => item.projectId)).toEqual([PROJECT_A, PROJECT_A, PROJECT_A]);
		await expect(items.map((item) => item.applyTax)).toEqual([true, true, true]);
		await expect(items.map((item) => item.applyDiscount)).toEqual([true, true, true]);
		await expect(items.map((item) => item.timeLogIds)).toEqual([[LOG_ONE, LOG_TWO], [LOG_KEPT], [LOG_THREE]]);
		expect(store.writesOf().map((call) => `${call.method} ${call.path}`)).toEqual(['POST /invoices']);

		// the screen goes to the list, the toast names the invoice, and the list reads it back (probe 4 `R3`)
		await expect(page).toHaveURL(new URL(INVOICES_PATH, APP_ORIGIN).href, { timeout: 30_000 });
		await page.mouse.move(2, 2);
		const toast = await toastText(page);
		report('7 toast', { toast, url: page.url() });
		await expect(page.getByText(filled(NEW.SAVED, { number: NUMBER }))).toBeVisible({ timeout: 15_000 });
		// the list is a month region holding one `li` per invoice (`invoice-list-rows.tsx`): the client, a link
		// `No. <number>` to the invoice page, then issued / period / due / status / total in one line
		const createdId = String(body.id);
		const card = page.getByRole('listitem').filter({ hasText: filled(T.NUMBER, { number: NUMBER }) });
		await expect(card.first()).toBeVisible({ timeout: 30_000 });
		await expect(card.first()).toContainText(CLIENT_A_NAME);
		await expect(card.first()).toContainText(filled(T.ISSUED_ON, { date: dayText(issueKey) }));
		await expect(card.first()).toContainText(periodText);
		await expect(card.first()).toContainText(filled(T.DUE_ON, { date: dayText(dueDayKey) }));
		await expect(card.first()).toContainText(T.status.DRAFT);
		await expect(card.first()).toContainText(money(TOTAL));
		await expect(page.getByRole('link', { name: filled(T.NUMBER, { number: NUMBER }) })).toHaveAttribute(
			'href',
			`${INVOICES_PATH}/${createdId}`
		);
		const afterSave = sortedOf(store.readsOf().map((call) => `${call.method} ${call.path}`));
		report('7 reads after save', {
			afterSave,
			writes: store.writesOf().map((call) => `${call.method} ${call.path}`)
		});
		await expect(afterSave).toContain('GET /invoices/pagination');
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 8 · save and send, and a send the API refuses

	test('8 · save and send: the create then the e-mail, and a refused e-mail leaves a saved draft', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, {
			...baseScript(),
			emailRefusal: { status: 500, message: 'The mail server refused the message' }
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });

		await saveButton(page).click({ timeout: 15_000 });
		await expect(dialog(page)).toHaveCount(1, { timeout: 15_000 });
		await expect(fieldInput(page, T.send.RECIPIENT)).toHaveValue(CLIENT_A_EMAIL);
		await fieldInput(page, T.send.RECIPIENT).fill(RECIPIENT_TEXT, { timeout: 15_000 });
		await primaryButton(page, NEW.sending.SAVE_AND_SEND).click({ timeout: 15_000 });
		await expect.poll(async () => store.writesOf().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);

		const writes = store.writesOf().map((call) => `${call.method} ${call.path}`);
		const body = store.created()[0] as Record<string, unknown>;
		report('8 writes', { writes, status: body.status, emailPath: store.writesOf()[1]?.path });
		await expect(writes[0]).toBe('POST /invoices');
		await expect(writes[1]).toBe(`PUT /invoices/email/${encodeURIComponent(RECIPIENT_TEXT)}`);
		await expect(body.status).toBe('DRAFT');
		// the refused send never marks it Sent
		await expect(store.only('PUT', `/invoices/${String(body.id)}/action`)).toHaveLength(0);
		await expect(page).toHaveURL(new URL(`${NEW_PATH}?client=${CLIENT_A}`, APP_ORIGIN).href);

		await page.mouse.move(2, 2);
		const toast = await toastText(page);
		report('8 toast', { toast });
		await expect(page.getByText(filled(NEW.sending.SAVED_NOT_SENT, { number: NUMBER }))).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByText(NEW.sending.SEND_FROM_LIST)).toBeVisible();
		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', `/invoices/email/${encodeURIComponent(RECIPIENT_TEXT)}`, 500)
			])
		).toEqual([]);
	});

	// ------------------------------------------------ 9 · a refused save: what each refusal says

	test('9 · a refused save: 400, the time-billed 400, 409 and 500, each with its own words and no invoice', async ({
		page,
		fixture,
		shield
	}) => {
		const expectedConsole: string[] = [];
		const refusals: Array<{ refusal: Refusal; copy: string }> = [
			{ refusal: { status: 400, message: 'Invoice number 4022 is already in use' }, copy: NEW.confirm.FAILED },
			{
				refusal: { status: 400, message: 'INVOICE_TIME_LOG_NOT_BILLABLE: this time is billed elsewhere' },
				copy: T.billedTime.NEW_REFUSED
			},
			{ refusal: { status: 409, message: 'INVOICE_CHANGED' }, copy: NEW.confirm.FAILED },
			{ refusal: { status: 500, message: 'the mock broke' }, copy: NEW.confirm.UNCONFIRMED }
		];

		for (const { refusal, copy } of refusals) {
			const store = await serveNewInvoice(page, { ...baseScript(), createRefusal: refusal });
			await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
			await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
			await saveButton(page).click({ timeout: 15_000 });
			await expect(dialog(page)).toHaveCount(1, { timeout: 15_000 });
			await primaryButton(page, NEW.SAVE).click({ timeout: 15_000 });

			const seenCopy = copy === NEW.confirm.UNCONFIRMED ? filled(copy, { client: CLIENT_A_NAME }) : copy;
			await expect(dialog(page).getByText(seenCopy)).toBeVisible({ timeout: 30_000 });
			const createdId = String((store.created()[0] as Record<string, unknown> | undefined)?.id ?? '');
			const text = await dialogText(page);
			report(`9 refusal ${refusal.status} ${refusal.message}`, {
				copy: seenCopy,
				dialogText: text,
				writes: store.writesOf().map((call) => `${call.method} ${call.path}`),
				storedAfterRefusal: store.invoice(createdId),
				url: page.url()
			});
			// the refusal wrote nothing, so the screen stays where it was and the invoice was not created
			await expect(store.writesOf().map((call) => `${call.method} ${call.path}`)).toEqual(['POST /invoices']);
			await expect(store.invoice(createdId)).toBeNull();
			await expect(page).toHaveURL(new URL(`${NEW_PATH}?client=${CLIENT_A}`, APP_ORIGIN).href);
			expectedConsole.push(armedHttpError('POST', '/invoices', refusal.status));
			expect(consoleFindings(shield, expectedConsole), `the ${refusal.status} refusal`).toEqual([]);
		}
	});

	// ------------------------------------------------ 10 · what blocks the save

	test('10 · the problems that block the save: no line, a bad number, a due date too early, no dates', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveNewInvoice(page, baseScript());
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		await expect(removeButtons(page)).toHaveCount(3);

		// every line removed. The sheet re-renders on each removal, so the buttons are re-taken every time
		// (run 1: a handle held from the first list was already detached for the third click).
		for (const remaining of [2, 1, 0]) {
			await removeButtons(page).first().click({ timeout: 15_000 });
			await expect(removeButtons(page)).toHaveCount(remaining, { timeout: 15_000 });
		}
		await expect(sheetSection(page).getByText(NEW.NO_LINES_TITLE, { exact: true })).toBeVisible({
			timeout: 15_000
		});
		await expect(sheetSection(page).getByText(NEW.ALL_LINES_REMOVED, { exact: true })).toBeVisible();
		await expect(sheetSection(page).getByText(messageOf(NEW.REMOVED_LINES, { count: 3 }))).toBeVisible();
		await saveButton(page).click({ timeout: 15_000 });
		const noLinesProblems = await problemTexts(page);
		report('10 no lines', { problems: noLinesProblems, dialogCount: await dialog(page).count() });
		await expect(noLinesProblems).toEqual([NEW.problems.NO_LINES]);
		await expect(dialog(page)).toHaveCount(0);
		await expect(saveButton(page)).toBeEnabled();
		await primaryButton(page, NEW.RESTORE_LINES).click({ timeout: 15_000 });
		await expect(removeButtons(page)).toHaveCount(3, { timeout: 15_000 });

		// a number the workspace cannot use
		await fieldInput(page, NEW.details.NUMBER).fill('0', { timeout: 15_000 });
		await saveButton(page).click({ timeout: 15_000 });
		const badNumberProblems = await problemTexts(page);
		const invalidNumber = await page
			.locator('[aria-invalid="true"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => `${node.tagName.toLowerCase()} ${node.getAttribute('type') ?? ''}`)
			);
		report('10 bad number', {
			problems: badNumberProblems,
			invalidNumber,
			dialogCount: await dialog(page).count()
		});
		await expect(badNumberProblems).toEqual([NEW.problems.NUMBER]);
		await expect(dialog(page)).toHaveCount(0);
		await fieldInput(page, NEW.details.NUMBER).fill(String(NUMBER), { timeout: 15_000 });

		// a due date before the issue date, typed in the host's own date format
		const earlyKey = await dayAfterInBrowser(page, await issueDayKeyOf(page), -3);
		const earlyShown = await fillDateField(page, NEW.details.DUE_DATE, earlyKey);
		await saveButton(page).click({ timeout: 15_000 });
		const earlyProblems = await problemTexts(page);
		report('10 due before issue', {
			earlyShown,
			problems: earlyProblems,
			invalid: await page
				.locator('[aria-invalid="true"]')
				.evaluateAll((nodes) => nodes.map((node) => node.tagName.toLowerCase())),
			dialogCount: await dialog(page).count()
		});
		await expect(earlyProblems).toEqual([NEW.problems.DUE_BEFORE_ISSUE]);
		await expect(dialog(page)).toHaveCount(0);
		await expect(saveButton(page)).toBeEnabled();

		// both dates emptied
		await fieldInput(page, NEW.details.ISSUE_DATE).fill('', { timeout: 15_000 });
		await fieldInput(page, NEW.details.DUE_DATE).fill('', { timeout: 15_000 });
		await saveButton(page).click({ timeout: 15_000 });
		const emptyDateProblems = await problemTexts(page);
		report('10 empty dates', {
			problems: emptyDateProblems,
			pairs: await paperPairs(page),
			dialogCount: await dialog(page).count()
		});
		await expect(emptyDateProblems).toEqual([NEW.problems.ISSUE_DATE, NEW.problems.DUE_DATE]);
		await expect(dialog(page)).toHaveCount(0);

		await expect(store.writesOf(), 'no problem ever reached the API').toHaveLength(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 11 · the invoices already saved for this client

	test('11 · already invoiced to this client: its rows, its overlaps badge, show more and fewer', async ({
		page,
		fixture,
		shield
	}) => {
		// every one of them states a period *outside* the one being invoiced, so none of them overlaps it
		const six = [4100, 4101, 4102, 4103, 4104, 4105].map((number, index) =>
			servedInvoiceOf({
				id: `playwright-invoice-earlier-${number}`,
				invoiceNumber: number,
				status: index === 0 ? 'PAID' : 'SENT',
				terms: `Billable time from ${dayKey(2 + index)} to ${dayKey(6 + index)}`,
				totalValue: 100 + number - 4100,
				invoiceItems: []
			})
		);
		await serveNewInvoice(page, { ...baseScript(), invoices: six });
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });

		const earlierTitle = filled(NEW.earlier.TITLE, { client: CLIENT_A_NAME });
		await expect(contentRegion(page).getByText(earlierTitle, { exact: true })).toBeVisible({ timeout: 30_000 });
		const rowsBefore = await rowTexts(page);
		const showMore = await page
			.getByRole('button', { name: /Show \d+ more invoices|Show fewer/ })
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		report('11 earlier rows', { earlierTitle, rowsBefore, showMore, notices: await noticeParts(page) });

		// the panel's note: `invoice-earlier.tsx:95-98` prints `billedTime.EARLIER_NOTE` once the time read records
		// which hours are billed, and `earlier.NOTE` only before that. Both were measured on this screen
		// (probe 2 `Q4`, and run 1 test 13's dump of the same panel), the plain one never appeared.
		const plainNoteCount = await page.getByText(NEW.earlier.NOTE, { exact: true }).count();
		const recordedNoteCount = await page.getByText(T.billedTime.EARLIER_NOTE, { exact: true }).count();
		report('11 earlier note', { plainNoteCount, recordedNoteCount });
		await expect(plainNoteCount).toBe(0);
		await expect(contentRegion(page).getByText(T.billedTime.EARLIER_NOTE)).toBeVisible();

		// four of the six are listed, each with its number, its stated period and its total
		await expect(
			contentRegion(page).getByText(messageOf(NEW.earlier.SHOW_MORE, { count: 2 }), { exact: true })
		).toBeVisible();
		for (const invoice of six.slice(0, 4)) {
			await expect(
				contentRegion(page).getByText(filled(T.NUMBER, { number: invoice.invoiceNumber }), { exact: true })
			).toBeVisible();
			await expect(contentRegion(page).getByText(money(invoice.totalValue), { exact: true })).toBeVisible();
		}
		await expect(contentRegion(page).getByText(NEW.earlier.OVERLAPS)).toHaveCount(0);
		// none of these invoices states a period inside the one being billed, so no overlap notice appears
		for (const title of overlapTitles(CLIENT_A_NAME)) {
			await expect(noticeWithTitle(page, title)).toHaveCount(0);
		}

		// show the rest of them, then fold them back
		await primaryButton(page, messageOf(NEW.earlier.SHOW_MORE, { count: 2 })).click({ timeout: 15_000 });
		await expect(contentRegion(page).getByText(NEW.earlier.SHOW_FEWER, { exact: true })).toBeVisible({
			timeout: 15_000
		});
		const rowsAfter = await rowTexts(page);
		report('11 earlier after show more', { rowsAfter });
		for (const invoice of six) {
			await expect(
				contentRegion(page).getByText(filled(T.NUMBER, { number: invoice.invoiceNumber }), { exact: true })
			).toBeVisible();
		}
		await primaryButton(page, NEW.earlier.SHOW_FEWER).click({ timeout: 15_000 });
		await expect(
			contentRegion(page).getByText(messageOf(NEW.earlier.SHOW_MORE, { count: 2 }), { exact: true })
		).toBeVisible({ timeout: 15_000 });
		for (const invoice of six.slice(4)) {
			await expect(
				contentRegion(page).getByText(filled(T.NUMBER, { number: invoice.invoiceNumber }), { exact: true })
			).toHaveCount(0);
		}
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 12 · the two overlap notices

	test('12 · an earlier invoice over this period: hours left out, and hours that may be billed twice', async ({
		page,
		fixture,
		shield
	}) => {
		// 1 · the earlier invoice bills its hours (every served log of it carries `invoiceItemId`), so they are left out
		const store = await serveNewInvoice(page, {
			...baseScript(),
			invoices: [
				servedInvoiceOf({
					id: OVERLAP_INVOICE_ID,
					terms: logDayTerms(LOG_BILLED),
					invoiceItems: [
						{
							id: OVERLAP_LINE_ID,
							description: 'Billed line',
							price: RATE_MEMBER,
							quantity: 4,
							totalValue: 4 * RATE_MEMBER,
							applyTax: false,
							applyDiscount: false,
							projectId: PROJECT_A,
							employeeId: MEMBER_ONE,
							project: { id: PROJECT_A, name: PROJECT_A_NAME }
						}
					]
				})
			],
			// the shape probe 4 `R7` measured the left-out notice with: one member's hours to bill, plus the 4 h the
			// earlier invoice already bills (`invoiceItemId` names its line, so the free read never returns it)
			logs: [...logsOf().filter((spec) => spec.employeeId === MEMBER_ONE), billedLogOf(OVERLAP_LINE_ID)]
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		// the check finishes after an extra read of the wider period, so the notice is waited for, not assumed
		const leftOutTitle = flat(T.billedTime.LEFT_OUT_TITLE);
		await expect(noticeWithTitle(page, leftOutTitle)).toHaveCount(1, { timeout: 30_000 });
		await expect(
			noticeWithTitle(page, messageOf(NEW.earlier.OVERLAP_TITLE, { count: 1, client: CLIENT_A_NAME }))
		).toHaveCount(0);
		const leftOutNotices = (await noticeParts(page)).filter((notice) => notice.title === leftOutTitle);
		const leftOutCells = (await cellTexts(page)).filter((cell) => cell !== '');
		const leftOutPairs = await paperPairs(page);
		report('12 left out', {
			notices: leftOutNotices,
			cells: leftOutCells,
			pairs: leftOutPairs,
			freeReads: store.timeReads().filter((call) => call.query.includes('notInvoiced')).length,
			widerReads: store.timeReads().filter((call) => !call.query.includes('notInvoiced')).length
		});
		await expect(leftOutNotices).toEqual([
			{
				title: T.billedTime.LEFT_OUT_TITLE,
				description: messageOf(T.billedTime.LEFT_OUT_MESSAGE, { count: 1, client: CLIENT_A_NAME })
			}
		]);
		// the billed 4 h never came back from the free read: what is left to bill is the member's own 1.50 h
		// (probe 4 `R7` measured exactly this sheet: `Alpha Project 1.50 h · $150.00`, `1 line · 1.50 h`, `Total $150.00`)
		await expect(leftOutCells).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(HOURS_MEMBER)} · ${money(HOURS_MEMBER * RATE_MEMBER)}`,
			hoursCell(HOURS_MEMBER),
			rateCell(RATE_MEMBER),
			money(HOURS_MEMBER * RATE_MEMBER)
		]);
		await expect(pairOf(leftOutPairs, NEW.TOTAL)).toBe(`${NEW.TOTAL} = ${money(HOURS_MEMBER * RATE_MEMBER)}`);

		// 2 · an earlier invoice over the same period that never says which hours it bills
		const quietStore = await serveNewInvoice(page, {
			...baseScript(),
			invoices: [
				servedInvoiceOf({
					id: OVERLAP_UNRECORDED_INVOICE_ID,
					terms: logDayTerms(LOG_ONE),
					invoiceItems: [
						{
							id: OVERLAP_UNRECORDED_LINE_ID,
							description: 'Unrecorded line',
							price: RATE_MEMBER,
							quantity: 3,
							totalValue: 3 * RATE_MEMBER,
							applyTax: false,
							applyDiscount: false,
							projectId: PROJECT_A,
							employeeId: MEMBER_ONE,
							project: { id: PROJECT_A, name: PROJECT_A_NAME }
						}
					]
				})
			]
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		const overlapTitle = flat(messageOf(NEW.earlier.OVERLAP_TITLE, { count: 1, client: CLIENT_A_NAME }));
		await expect(noticeWithTitle(page, overlapTitle)).toHaveCount(1, { timeout: 30_000 });
		await expect(noticeWithTitle(page, leftOutTitle)).toHaveCount(0);
		const unrecordedNotices = (await noticeParts(page)).filter((notice) => notice.title === overlapTitle);
		const unrecordedCells = (await cellTexts(page)).filter((cell) => cell !== '');
		const unrecordedSheet = await sheetText(page);
		report('12 may bill twice', {
			notices: unrecordedNotices,
			cells: unrecordedCells,
			sheet: unrecordedSheet,
			freeReads: quietStore.timeReads().filter((call) => call.query.includes('notInvoiced')).length,
			widerReads: quietStore.timeReads().filter((call) => !call.query.includes('notInvoiced')).length
		});
		await expect(unrecordedNotices).toEqual([
			{
				title: overlapTitle,
				// `invoice-screen.tsx:43-46` replaces the plain warning with this one once the API records billed
				// time but the invoice itself names none of its hours; its own last sentence is part of the key
				description: flat(messageOf(T.billedTime.UNRECORDED_MESSAGE, { count: 1 }))
			}
		]);
		// nothing was left out of the read: every hour of the period is still listed, and may be billed twice
		// (probe 4 `R7` measured exactly these rows for this served shape)
		await expect(unrecordedCells).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(HOURS_TOTAL)} · ${money(SUBTOTAL)}`,
			hoursCell(HOURS_MEMBER),
			rateCell(RATE_MEMBER),
			money(HOURS_MEMBER * RATE_MEMBER),
			hoursCell(HOURS_KEPT),
			rateCell(RATE_KEPT),
			money(HOURS_KEPT * RATE_KEPT),
			hoursCell(HOURS_PROJECT),
			rateCell(RATE_PROJECT),
			money(HOURS_PROJECT * RATE_PROJECT)
		]);
		await expect(unrecordedSheet).toContain(
			messageOf(NEW.LINES_AND_HOURS, { count: 3, hours: hoursText(HOURS_TOTAL) })
		);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 13 · time the invoice cannot bill: another currency, no rate

	test('13 · time left out of the invoice: priced in another currency, and with no rate at all', async ({
		page,
		fixture,
		shield
	}) => {
		const eurLog: ServedLogSpec = {
			id: 'log-e-one',
			dayIndex: 2,
			projectId: PROJECT_E,
			employeeId: MEMBER_TWO,
			taskId: null,
			taskTitle: null,
			taskNumber: null,
			duration: 7200,
			invoiceItemId: null,
			isBillable: true
		};
		const store = await serveNewInvoice(page, {
			...baseScript(),
			projects: [...(baseScript().projects ?? []), projectOf(PROJECT_E, PROJECT_E_NAME, CLIENT_A)],
			// one priced hour in the workspace currency (1.00 h / $100.00) and two in the project's own (2.00 h / €200.00)
			logs: [{ ...logsOf()[0] }, eurLog]
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });

		const cells = (await cellTexts(page)).filter((cell) => cell !== '');
		const sheet = await sheetText(page);
		const pairs = await paperPairs(page);
		report('13 other currency', {
			cells,
			sheet,
			pairs,
			leftOut: await contentRegion(page).innerText(),
			reads: store.readsOf().map((call) => `${call.method} ${call.path}`)
		});
		await expect(cells).toEqual([
			PROJECT_E_NAME,
			`${hoursCell(2)} · ${money(200, 'EUR')}`,
			hoursCell(2),
			rateCell(100, 'EUR'),
			money(200, 'EUR')
		]);
		await expect(sheet).toContain(`${NEW.TOTAL} ${money(200, 'EUR')}`);
		await expect(contentRegion(page).getByText(NEW.otherCurrencies.TITLE, { exact: true })).toBeVisible();
		await expect(contentRegion(page).getByText(NEW.otherCurrencies.NOTE)).toBeVisible();
		await expect(contentRegion(page).getByText(`${hoursCell(1)} · ${money(100)}`, { exact: true })).toBeVisible();
		// `exact`, because the sheet's own line count starts with the same words (`1 line · 2.00 h`)
		await expect(
			contentRegion(page).getByText(messageOf(NEW.LINE_COUNT, { count: 1 }), { exact: true })
		).toBeVisible();
		// the invoice bills in the currency of the most hours (`compareCurrencyTotals`,
		// `payments-due.ts:484-490`), and the offer names the currency it left out
		await expect(
			primaryButton(page, messageOf(NEW.otherCurrencies.SWITCH, { currency: ORG_CURRENCY }))
		).toBeVisible();

		await primaryButton(page, messageOf(NEW.otherCurrencies.SWITCH, { currency: ORG_CURRENCY })).click({
			timeout: 15_000
		});
		const cellsAfter = (await cellTexts(page)).filter((cell) => cell !== '');
		const sheetAfter = await sheetText(page);
		report('13 after switching the currency', { cellsAfter, sheetAfter });
		await expect(cellsAfter).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(1)} · ${money(100)}`,
			hoursCell(1),
			rateCell(100),
			money(100)
		]);
		await expect(sheetAfter).toContain(`${NEW.TOTAL} ${money(100)}`);
		await expect(
			contentRegion(page).getByText(`${hoursCell(2)} · ${money(200, 'EUR')}`, { exact: true })
		).toBeVisible();
		await expect(primaryButton(page, messageOf(NEW.otherCurrencies.SWITCH, { currency: 'EUR' }))).toBeVisible();

		// a member with no client rate, no project rate and no billing rate of their own
		await serveNewInvoice(page, {
			...baseScript(),
			projects: [...(baseScript().projects ?? []), projectOf(PROJECT_D, PROJECT_D_NAME, CLIENT_A)],
			projectRates: {
				...RATES,
				[PROJECT_D]: { id: PROJECT_D, billRateValue: null, currency: ORG_CURRENCY, members: [] }
			},
			logs: [
				...logsOf(),
				{
					id: 'log-unpriced',
					dayIndex: 2,
					projectId: PROJECT_D,
					employeeId: MEMBER_NONE,
					taskId: null,
					taskTitle: null,
					taskNumber: null,
					duration: 5400,
					invoiceItemId: null,
					isBillable: true
				}
			]
		});
		await signInAndVisit(page, fixture, `${NEW_PATH}?client=${CLIENT_A}`, { scenario: FULL_SET });
		await expect(saveButton(page)).toBeVisible({ timeout: 30_000 });
		const unpricedBody = await contentRegion(page).innerText();
		report('13 unpriced', { body: unpricedBody, pairs: await paperPairs(page) });
		await expect(contentRegion(page).getByText(NEW.unpriced.TITLE, { exact: true })).toBeVisible();
		await expect(contentRegion(page).getByText(NEW.unpriced.NOTE)).toBeVisible();
		// each left-out row is one `li` holding the member, the project and the hours in three separate elements
		// (run 2 `13 unpriced` printed them as three lines), so the row is matched as a whole
		const unpricedRow = contentRegion(page).getByRole('listitem').filter({ hasText: PROJECT_D_NAME });
		await expect(unpricedRow.first()).toContainText(MEMBER_NONE_NAME);
		await expect(unpricedRow.first()).toContainText(PROJECT_D_NAME);
		await expect(unpricedRow.first()).toContainText(hoursCell(1.5));
		await expect(
			page.getByRole('link', {
				name: filled(NEW.unpriced.SET_RATE_OF, { member: MEMBER_NONE_NAME, project: PROJECT_D_NAME })
			})
		).toHaveAttribute('href', `/projects/${PROJECT_D}?tab=people`);
		// the priced hours are untouched by it
		await expect(pairOf(await paperPairs(page), NEW.TOTAL)).toBe(`${NEW.TOTAL} = ${money(SUBTOTAL)}`);
		expect(consoleFindings(shield)).toEqual([]);
	});

	// ------------------------------------------------ 14 · replacing a void invoice, and taking its time again

	test('14 · ?replaces=<void>: the saved lines, then the time as it is now, then back to the saved lines', async ({
		page,
		fixture,
		shield
	}) => {
		const voidNote = 'Saved note for the client.';
		const voidInvoice = servedInvoiceOf({
			id: VOID_INVOICE_ID,
			invoiceNumber: 4150,
			status: 'VOID',
			// the note a saved invoice carries is written into its terms, after the period line and a blank line
			// (`invoiceTermsOf`, `invoices.ts:970-983`), and read back out of them by `invoiceNoteOfTerms`
			// (`invoice-edit.ts:309-317`) into the replacement's seed (`savedDraftSeedOf` `note: saved.note`,
			// `use-new-invoice.ts:124-149`)
			terms: `Billable time from ${LOG_DAYS[0]} to ${LOG_DAYS[3]}\n\n${voidNote}`,
			totalValue: 10 * RATE_MEMBER,
			invoiceItems: [
				{
					id: VOID_LINE_ID,
					description: MEMBER_ONE_NAME,
					price: RATE_MEMBER,
					quantity: 10,
					totalValue: 10 * RATE_MEMBER,
					applyTax: false,
					applyDiscount: false,
					projectId: PROJECT_A,
					employeeId: MEMBER_ONE,
					project: { id: PROJECT_A, name: PROJECT_A_NAME }
				}
			]
		});
		const store = await serveNewInvoice(page, { ...baseScript(), invoices: [voidInvoice], logs: [] });
		await signInAndVisit(page, fixture, `${NEW_PATH}?replaces=${VOID_INVOICE_ID}`, { scenario: FULL_SET });

		const savedCells = (await cellTexts(page)).filter((cell) => cell !== '');
		const savedTitles = await cellTitles(page);
		const savedPairs = await paperPairs(page);
		const periodText = await periodTextInBrowser(page, LOG_DAYS[0], LOG_DAYS[3]);
		report('14 replacement', {
			reads: store.shapes().map((shape) => shape.slice(0, 120)),
			cells: savedCells,
			rateTitles: savedTitles,
			pairs: savedPairs,
			notice: await noticeParts(page),
			noteValue: await fieldInput(page, NEW.terms.NOTE).inputValue()
		});

		await expect(
			contentRegion(page).getByText(filled(T.replace.NOTICE_TITLE, { number: voidInvoice.invoiceNumber }), {
				exact: true
			})
		).toBeVisible({ timeout: 30_000 });
		await expect(contentRegion(page).getByText(T.replace.NOTICE_MESSAGE)).toBeVisible();
		await expect(store.only('GET', `/invoices/${VOID_INVOICE_ID}`)).not.toHaveLength(0);
		await expect(
			store
				.readsOf()
				.some(
					(call) =>
						call.path === '/organization-contact/pagination' && call.query.includes('withDeleted=true')
				)
		).toBe(true);
		// the lines as they were saved, priced at the rate the invoice saved, not at today's
		await expect(savedCells).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(10)} · ${money(10 * RATE_MEMBER)}`,
			hoursCell(10),
			rateCell(RATE_MEMBER),
			money(10 * RATE_MEMBER)
		]);
		await expect(savedTitles).toContain(T.edit.RATE_SOURCE_SAVED);
		await expect(pairOf(savedPairs, NEW.TOTAL)).toBe(`${NEW.TOTAL} = ${money(10 * RATE_MEMBER)}`);
		await expect(pairOf(savedPairs, NEW.PERIOD)).toBe(`${NEW.PERIOD} = ${periodText}`);
		await expect(fieldInput(page, NEW.terms.NOTE)).toHaveValue(voidNote);
		await expect(sheetSection(page).getByText(voidNote, { exact: true })).toBeVisible();
		await expect(primaryButton(page, T.edit.TAKE_TIME_AGAIN)).toBeVisible();

		// "Take the time again": the time of the period the saved invoice states is read again. The served days are
		// anchored on the **first** time read, and in this state that is the wider read of the saved lines' own time
		// (`billedReadStartOf` `use-invoice-time.ts:156-165` and `billedReadEndOf` `:192-197`, used at `:333-337`), so the
		// days inside the period start at dayIndex 1: run 3 served them at 0/2 and measured only `2.00 h · $180.00`,
		// the dayIndex-0 log having fallen on the day before the period, outside the free read's window.
		const takeAgainLogs = [0, 1, 2].map((index) => ({ ...logsOf()[index], dayIndex: index + 1 }));
		store.serveLogsOnNextRead(takeAgainLogs);
		const readsBeforeTakeAgain = store.timeReads().length;
		await primaryButton(page, T.edit.TAKE_TIME_AGAIN).click({ timeout: 15_000 });
		await expect
			.poll(async () => store.timeReads().length, { timeout: 30_000 })
			.toBeGreaterThan(readsBeforeTakeAgain);
		const rebuiltReads = store.timeReads().map((call) => store.queryPairs(call));
		// the lines are the time's once its read arrives: the sheet carries the rebuilt hours before they are read out
		await expect(sheetSection(page)).toContainText(hoursCell(HOURS_MEMBER + HOURS_PROJECT), { timeout: 15_000 });
		const rebuiltCells = (await cellTexts(page)).filter((cell) => cell !== '');
		const rebuiltPairs = await paperPairs(page);
		report('14 take the time again', { cells: rebuiltCells, pairs: rebuiltPairs, rebuiltReads });
		// what the click switches on is the **free** billable read: while the saved lines are shown it is disabled
		// (`readsTime = linesSource === 'time'`, `use-new-invoice.ts:273` → `readsTime`, `use-invoice-time.ts:360`,
		// `freeQuery` with `notInvoiced: true` at `:381-397`), and the time the saved lines bill is read by
		// `allQuery` with `notInvoiced: false` over the wider days (`readsBilledTime` `:374`, `readsAllTime` `:422`,
		// `:424-441`). Run 3 measured both after the click: a `notInvoiced=true` read of the period, next to a
		// repeat of the wider read without it.
		await expect(rebuiltReads.some((pairs) => pairs.includes('notInvoiced=true'))).toBe(true);
		await expect(rebuiltReads.some((pairs) => !pairs.includes('notInvoiced=true'))).toBe(true);
		await expect(rebuiltCells).toEqual([
			PROJECT_A_NAME,
			`${hoursCell(HOURS_MEMBER + HOURS_PROJECT)} · ${money(HOURS_MEMBER * RATE_MEMBER + HOURS_PROJECT * RATE_PROJECT)}`,
			hoursCell(HOURS_MEMBER),
			rateCell(RATE_MEMBER),
			money(HOURS_MEMBER * RATE_MEMBER),
			hoursCell(HOURS_PROJECT),
			rateCell(RATE_PROJECT),
			money(HOURS_PROJECT * RATE_PROJECT)
		]);
		await expect(sheetSection(page).getByText(T.edit.TIME_LINES, { exact: true })).toBeVisible();
		await expect(pairOf(await paperPairs(page), NEW.TOTAL)).toBe(
			`${NEW.TOTAL} = ${money(HOURS_MEMBER * RATE_MEMBER + HOURS_PROJECT * RATE_PROJECT)}`
		);

		await primaryButton(page, T.edit.BACK_TO_SAVED).click({ timeout: 15_000 });
		const backCells = (await cellTexts(page)).filter((cell) => cell !== '');
		report('14 back to saved', { cells: backCells });
		await expect(backCells).toEqual(savedCells);
		expect(consoleFindings(shield)).toEqual([]);
	});
});
