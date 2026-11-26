import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures';
import { APP_ORIGIN, mockReset } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees, and what the browser really sends, on **an invoice opened from its share link by anyone**:
 * `/shared-invoice#id=<uuid>&token=<three-part token>` — `app/[locale]/shared-invoice/page.tsx:1-14` +
 * `app/[locale]/shared-invoice/layout.tsx:1-18` (`referrer: 'no-referrer'`, robots noindex) →
 * `core/components/pages/shared-invoice/shared-invoice-page.tsx` (333 lines), reached signed out, in a fresh context,
 * on lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `3994`, issuer `3995`,
 * `playwright/test-servers.ts:38`).
 *
 * The four routes it reads and posts are pinned as *routes* by other files (`suites/lane-c/public-link-shape.spec.ts`,
 * `suites/lane-b/path-segment-sweep.spec.ts`, `suites/lane-c/unguarded-writes.spec.ts`). This file is the page in a
 * real Chrome: what it shows, which buttons it offers, what it sends, what it refuses to send, and when it stops reading.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-sharedinvoice\probe1.spec.ts` … `probe5.spec.ts`, run on this lane on
 * 2026-11-26: `D:\Coding\.tmp\s3-lane-a-sharedinvoice-probe-1.log` (13 cases), `-probe-2.log` (14 tests, 3 failures —
 * all three this file's own harness faults: a storage read on `about:blank`, and two `getByRole('alert')` strict-mode
 * clashes), `-probe-3.log` (15 tests, 14 passed, 2.4 min), `-probe-4.log` … `-probe-5.log`. Every string, pair, count
 * and body below is printed by those runs, and each `[lane-a shared-invoice] MEASURE …` line is this file printing the
 * same values as it asserts them. `-probe-3.log` / `-probe-4.log` are the ones to trust for the standings, the dates
 * and the error states: probes 1 and 2 ran several cases in one document — `page.goto` to an address differing only in
 * its fragment is a **same-document** navigation, so the previous document and its query cache stayed — and printed
 * stale copy for the 404 / 500 cases. `openLink` below gives every case its own address and waits for the reads it
 * scripted before reading the screen.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the app, its NextAuth session, its refusal handling, its date and money formatting. The lane's own mock
 * answers **nothing** here: `cypress/support/mock-gauzy-server.mjs` has no handler for `/api/public/invoice/:id/:token`,
 * its `/download` twin, `/api/public/invoice-payments/invoice/:id/:token` or its `/checkout` twin; its catch-all would
 * answer a GET with `pagination([])` = `{ items: [], total: 0 }` (`:895`), a POST with the body it was sent (`:894`) —
 * which `invoiceCheckoutSchema` (`core/types/schemas/organization/shared-invoice.schema.ts:33-40`) rejects, having no
 * `url` — and a DELETE with `{ affected: 1, raw: [] }` (`:893`). So in every test of this file `mock.requests()` is
 * asserted **empty**: the witness that the page acted on this file's answers and never on the mock.
 *
 * **Served by this file:** those four routes, through `serveInvoiceRoutes` (`page.route` on the mock origin, the pattern
 * of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345` and `suites/lane-a/public-link-pages-ui.spec.ts`), with the
 * `TSharedInvoice` shapes (`shared-invoice.schema.ts:16-20` over `savedInvoiceSchema`) this file invents. Every answer
 * restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1096`, `OPTIONS` → 204 at `:1097-1101`), because the page
 * sits on `localhost:3031` and the API on `127.0.0.1:3992`; without it the browser throws the answer away.
 * `route.fetch()` is never called. The checkout document at `https://127.0.0.1:4113/checkout` is a two-line stand-in
 * this file serves (`page.route` + `route.fulfill`); nothing listens on port 4113, and loopback is what the shield
 * allows (`playwright/fixtures.ts` `isLocal`), so no test ever leaves the machine.
 *
 * **The browser talks to the mock, never to the app's own route twins.** Measured in `-probe-3.log` P30: the only
 * mock-origin calls of an open invoice were the read and the pay-option read; the app-origin calls of that load were
 * `/api/auth/session`, `/api/health` and `POST /api/log` only — no `/api/user/me`, no `app/api/public/**` call, and the
 * link's token appeared on **no** app-origin URL. That is the lane's wiring (`playwright/test-servers.ts:104-110` +
 * `core/constants/config/constants.tsx` `GAUZY_API_BASE_SERVER_URL` + `core/services/client/axios.ts`, spelled out in
 * `suites/lane-a/README.md:63-72`); `app/api/public/**` is not in this file's path.
 *
 * ## The finding (one, pinned on test 5 with `MEASURED, NOT INTENDED`)
 *
 * 1. **A 401 on the public read throws a signed-out visitor off the link, onto the sign-in page**, with "Your session
 *    has ended / Sign in again to continue." and none of the page's own refusal copy. `app/[locale]/shared-invoice/page.tsx:5-7`
 *    calls this an invoice opened "without an account", and `layout.tsx:3-4` says so again; but
 *    `isPageOpenWithoutSession` (`core/services/client/api.service.ts:73-78`) lists only `/auth/*` and the public team
 *    pages, so a 401 goes through `handleUnauthorized` and on to `/auth/passcode`. The 401 is this file's answer —
 *    whether the platform ever answers a public invoice read with one is not measured here; the *reaction* is the app's.
 *    The same finding is pinned for `/shared-report` in `suites/lane-a/public-link-pages-ui.spec.ts:29-34`.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/lib/utils/shared-invoice.ts`: the id and token shapes `:23-25` (a UUID; three base64url parts) — anything
 *   else is refused **without a request** (`isSharedInvoiceLink` `:36-38`); the fragment `:54-56`; the link read from
 *   `location.hash` `:59-64`; the email form `#/share/invoices/<id>/<token>` `:70-82` (a third segment is no link);
 *   `PAID_RETURN_QUERY = 'paid'` `:85`; `paymentReturnUrlOf` `:93-99` (origin + path + `?paid=1`, the fragment and every
 *   other query dropped); `isPaymentReturnUrl` `:106-120` (https or http, no credentials, this origin, this page).
 * - `core/hooks/invoices/use-shared-invoice-link.ts`: the key `ever-teams:shared-invoice-paying` `:13`, the kept
 *   fragment `:25-31`, `keepLinkWhilePaying` `:56-62`, `undefined` (still reading) vs `null` (no link) `:69-72`.
 * - `shared-invoice-page.tsx`: the poll constants `:28-35`; `PAID_STATUSES` `:37`; `senderNameOf` (official name first)
 *   `:39-42`; `useSharedInvoice` `:44-71` — the retry rule `:49` (a 403 is not retried, at most two retries otherwise),
 *   the poll rule `:50-62` (never after a 403, never when the invoice is already paid or this is not a return, every 5 s
 *   for two minutes, every 30 s after that), the pay option `:64-69` (asked only once the invoice succeeded, never
 *   retried); `PayButton` `:73-103` (`startCheckout` with `paymentReturnUrlOf(window.location.href)` `:82`,
 *   `keepLinkWhilePaying` `:83`, `window.location.assign` `:84`, failure → `p role="alert"` `:96-100`);
 *   `DownloadButton` `:105-135` (`downloadBlob(pdf, invoicePdfFileNameOf(numberText))` `:115`, failure alert `:128-132`);
 *   the skeleton `:137-148`; `SharedInvoicePage` `:157-185` (no link yet → skeleton `:162-164`; a link that cannot be
 *   one → `?paid=1` ? thanks : closed card `:165-183`); `useIsConfirmingPayment` `:192-202`; `SharedInvoiceView`
 *   `:205-320` (`isPending` → skeleton `:211-213`, 403 → closed vs anything else → `LOAD_ERROR_TITLE` + `Try again`
 *   `:215-233`, `canPay` `:242`, `hasPayOptionFailed` (a 404 is no failure) `:246-247`, the header `:257-296`, the
 *   returned and paid notices `:297-310`, the paper `:311-317`); `SharedInvoiceFrame` `:323-333`.
 * - `core/services/client/api/public/shared-invoice.service.ts` `:20-56`: the four calls, each with
 *   `{ secretAddress: true }`; the read asks `?relations=fromOrganization,organization,toContact,invoiceItems`
 *   (`shared-invoice.ts:20`), the download asks for a blob, the checkout posts `{ returnUrl }`.
 * - `core/components/pages/invoices/detail/invoice-detail-paper.tsx` with `core/components/invoices/invoice-paper.tsx`:
 *   the head facts `:149-157`, the parties `:165-172`, the line table `:175-210` (`PaperLines` `:96-119`, `PaperLine`
 *   `:132-157`), `NO_LINES` `:210`, the payment rows `:87-103`, the note `:212`.
 * - `core/components/invoices/invoice-standing.tsx` `:32-40`, `:177-186` (the status label keys; an unknown status is
 *   printed as it is), `core/lib/utils/invoice-standing.ts:40-71` (overdue is a **day-key** comparison).
 * - `core/lib/utils/shared-invoice-days.ts`: the workspace zone wins `:147-149`, `:181-184`; otherwise each date is
 *   re-dated at the UTC midnight of the day it opens or closes `:103-113`, `:185-195`, and today is counted on the clock
 *   the due day was written on `:156-165`; a zone the browser does not know is no zone `:122-141`.
 * - `core/services/client/api.service.ts:445-447`: a request the service marked `secretAddress` is kept out of the
 *   client's own error log — so a refused shared read prints no `[HttpClient] HTTP Error` line naming its path. Pinned
 *   in tests 3, 4 and 13.
 *
 * ## What is measured, per case (the probes' logs; the assertions are pinned on these)
 *
 * - **Open invoice** (P30): the header line `Invoice 4242 Sent From Probe Official Name Download PDF Pay €1,204.50`, the
 *   paper below it, the footer `Sent with Ever Teams`; two reads (`GET` the invoice with its `relations` query, `GET` the
 *   pay option), both on the mock origin, with **no** `Authorization` and no `Referer`, `resourceType xhr`; no
 *   `app/api/public/**` call; the mock logged nothing; the page's console and its page errors were empty; and the
 *   document holds no `nav`, no `link`, no `form` and no textbox — no shell, no sign-in, no navigation.
 * - **A fragment that cannot be a link** (P20): the closed card, `0` buttons in `main`, `0` reads, the mock heard
 *   nothing. `?paid=1` with no link kept: the thanks, `0` reads (P40).
 * - **403** (P32): the closed card, `0` buttons, `0` alerts, **1** read and no pay-option read, no console line at all.
 *   **404 / 500** (P32): `The invoice could not be loaded` + a `Try again` button, and 3 reads each (the initial one plus
 *   its two retries, `:49`) — a *failed* read's count is not pinned (as in `api-tokens-settings-ui.spec.ts:161-166`).
 *   `Try again` adds a read per click (P50: 3 → 4 → 7 as the retries joined in), pinned as "grew".
 *   **Pay option 502** (P51): `p role="alert"` `The payment could not be started. Try again in a moment.` + `Try again`,
 *   one pay-option read per ask (1 → 3), the invoice itself not re-read, and the words gone once the read answers;
 *   **404**: nothing at all.
 * - **Download** (P38): the read `GET …/download` once, `suggestedFilename()` `invoice-4242.pdf`, and `invoice.pdf` when
 *   the invoice has no number (whose `<h1>` is then `Invoice`); refused → `The PDF could not be downloaded. Try again.`
 *   and no file offered. The bytes are never read.
 * - **Pay** (P36): the label `Pay €1,204.50`; `POST …/checkout` with exactly
 *   `{"returnUrl":"http://localhost:3031/shared-invoice?paid=1"}`; the tab then shows the served checkout document.
 *   Refused or answered badly (502, 404, an `http:` url, a `javascript:` url — P37): the tab stays on the invoice, the
 *   alert is shown, nothing was kept in storage. **Back from the provider** (P39): `?paid=1` shows the invoice with the
 *   thanks and **no Pay** while the payment is being confirmed, the kept link is in `sessionStorage` under
 *   `ever-teams:shared-invoice-paying` (86 characters — exactly the fragment); a later poll that answers paid replaces
 *   the thanks with `This invoice is paid` and `Paid` in the frame. A link revoked while confirming (P41): the closed
 *   card, 1 read before a 9 s quiet window and 1 after it, no pay-option read.
 * - **Standings** (P31): `Sent`, `Viewed`, `Partially paid`, `Paid`, `Overpaid`, `Void`, `Draft`, an unknown status
 *   printed as it is (`SOMETHING_ELSE`), no status at all (`Unknown status`), `Overdue` once its due day has passed; the
 *   money rows `Total / Paid −€300.00 / Left to pay €904.50`, no `Paid` / `Left to pay` row when the figures are
 *   missing, and an overpaid invoice's `Left to pay` printed as a negative with a plain minus (`-€295.50`) next to a
 *   `Paid` row that always carries a typographic one (`invoice-detail-paper.tsx:95`). `Pay` follows the pay-option read,
 *   not the standing: it is offered for `Void`, `Draft` and an unknown status when the read says `payable` (`:242` —
 *   whether the platform ever says that for those is not measured here), and it is not offered when the read says
 *   `payable: false` or names no `amountDue`.
 * - **Dates** (P35): the UTC edges of a day read as that day; an instant written as noon UTC (`…T12:00:00.000Z`) reads
 *   as the **next** day, which is the re-dating `shared-invoice-days.test.ts:56-79` pins and a reader at UTC+1 would get
 *   the other way round; the same instants with the workspace zone `Asia/Tokyo` are read in Tokyo instead (one day
 *   later); a zone the browser does not know is ignored. The browser's own zone (measured `GMT+0100`, Central European
 *   Standard Time) is never used by an expectation in this file.
 *
 * ## Console noise, reported and asserted where it matters
 *
 * The dev error toaster's `Copy details` toast appears next to a failed read (counted in the MEASURE lines, never
 * asserted); the app's own toasts are counted apart from it. Every test asserts `shield.externalCalls()` is empty; the
 * clean cases assert an empty console and no page error. No test of this file uses a real token or any secret: the
 * link's id and token are this file's own invention, shaped as `shared-invoice.ts:23-25` requires. Assertions compare
 * that token (the paths are compared whole), and `report` masks it in every MEASURE line — a token value is never
 * printed; the kept link is pinned by its length and its `#id=` start, not by its text.
 *
 * ## What this file does not cover, and why
 *
 * - **The two-minute window** in which a returning visitor is shown the thanks and no Pay (`CONFIRMATION_POLL_LIMIT_MS`,
 *   `shared-invoice-page.tsx:30`, `useIsConfirmingPayment` `:192-202`) is not crossed: waiting it out in a browser costs
 *   two minutes per test, and `shared-invoice-page.test.tsx:166-182` pins it with fake timers. Test 11 pins the window's
 *   near side (no Pay while confirming) and its end (the paid notice when the poll answers paid); test 13 pins that a
 *   403 ends the polling.
 * - **The 30 s late-confirmation poll** (`:35`, pinned by `shared-invoice-page.test.tsx:227-247`) is not waited for
 *   either; test 11 pins the 5 s poll instead.
 * - **A real PDF** is never produced: the download answer is a stand-in body, and `downloadBlob` is observed only
 *   through the browser's own download event and its `suggestedFilename()`. The bytes are never read.
 * - **A real payment provider** is not reachable from this lane; the checkout document is this file's stand-in on
 *   loopback, and every checkout answer (a good url, an `http:` url, a `javascript:` url, a refusal) is this file's.
 *   `isPaymentReturnUrl` (`shared-invoice.ts:106-120`) plus `invoiceCheckoutSchema` (`shared-invoice.schema.ts:33-40`)
 *   are what turn the last ones into the page's own failure copy.
 */

const SHARED_PATH = '/shared-invoice';
/** This file's stand-in checkout document: loopback, another port, https, served by this file. Nothing listens here. */
const CHECKOUT_ORIGIN = 'https://127.0.0.1:4113';
const CHECKOUT_URL = `${CHECKOUT_ORIGIN}/checkout`;
/** `use-shared-invoice-link.ts:13`. */
const KEPT_LINK_KEY = 'ever-teams:shared-invoice-paying';

/** A link's id (a UUID) and its token (three base64url parts), as `shared-invoice.ts:23-25` requires. Nothing real. */
const INVOICE_ID = '7c1f9a44-3b6d-4e18-9a52-c0d7e4b18f60';
const LINK_TOKEN = 'probeHeader.probePayload.probeSignature';
const OTHER_INVOICE_ID = '3a8b6c1d-9e4f-4a2b-8c3d-5e6f70819a2b';
const OTHER_TOKEN = 'probeHeader2.probePayload2.probeSignature2';

const READ_PATH = `/api/public/invoice/${INVOICE_ID}/${LINK_TOKEN}`;
const DOWNLOAD_PATH = `${READ_PATH}/download`;
const OPTION_PATH = `/api/public/invoice-payments/invoice/${INVOICE_ID}/${LINK_TOKEN}`;
const CHECKOUT_PATH = `${OPTION_PATH}/checkout`;
const OTHER_READ_PATH = `/api/public/invoice/${OTHER_INVOICE_ID}/${OTHER_TOKEN}`;
const OTHER_OPTION_PATH = `/api/public/invoice-payments/invoice/${OTHER_INVOICE_ID}/${OTHER_TOKEN}`;
/** `shared-invoice.service.ts:26-30` asks the read for exactly these relations. */
const READ_QUERY = '?relations=fromOrganization,organization,toContact,invoiceItems';

/** `locales/en.json`: `invoices.shared`, `invoices.detail`, `invoices.status`, `invoices.standing`, `invoices.new`
 *  (`.details`, `.terms`, `.adjustments`), `invoices.actions.DOWNLOAD`, `invoices.edit.LOAD_ERROR_TITLE`,
 *  `pages.unauthorized.TRY_AGAIN`, `auth.sessionEnded`, `common.LOADING`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	invoices: {
		shared: Record<string, string>;
		detail: Record<string, string>;
		status: Record<string, string>;
		standing: Record<string, string>;
		actions: Record<string, string>;
		edit: Record<string, string>;
		new: {
			TOTAL: string;
			FROM: string;
			BILL_TO: string;
			details: Record<string, string>;
			terms: Record<string, string>;
		};
	};
	pages: { unauthorized: Record<string, string> };
	auth: { sessionEnded: Record<string, string> };
	common: Record<string, string>;
};
const S = EN.invoices.shared;
const D = EN.invoices.detail;
const ST = EN.invoices.status;
const STANDING = EN.invoices.standing;
const NEW = EN.invoices.new;
const filled = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

const DOWNLOAD_LABEL = EN.invoices.actions.DOWNLOAD;
const TRY_AGAIN = EN.pages.unauthorized.TRY_AGAIN;
const LOADING_LABEL = EN.common.LOADING;
const HEADING = filled(D.HEADING, { number: '4242' });
const FROM_SENDER = filled(S.FROM_SENDER, { name: 'Probe Official Name' });
const SENDER_NAME = 'Probe Official Name';
const CLIENT_NAME = 'Acme Client';
const CLIENT_EMAIL = 'billing@acme.example';
const TERMS = 'Net 14 days. Thank you for your business.';
const PAY_1204_50 = filled(S.PAY, { amount: '€1,204.50' });
const PAY_904_50 = filled(S.PAY, { amount: '€904.50' });
const PAY_1004_50 = filled(S.PAY, { amount: '€1,004.50' });
const FOOTER = filled(S.FOOTER, { app: 'Ever Teams' });

/** A MEASURE line never prints the link's token: whatever carries it is printed masked (`brief`: count or compare). */
const mask = (value: string) => value.replaceAll(LINK_TOKEN, '<token>').replaceAll(OTHER_TOKEN, '<other token>');
const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a shared-invoice] MEASURE ${label} ${mask(JSON.stringify(value))}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

// ----------------------------------------------------------------------------------------- the dates this file serves

/** Today's UTC day key, `offset` days away from it. Today's date is never pinned in this file. */
const dayKey = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
/** The first / last instant of `key` at UTC offset 0: an edge of a day, so its day is the same wherever it is opened
 *  (`shared-invoice-days.ts:103-113` reads it back as `key`). */
const startOfDay = (key: string) => `${key}T00:00:00.000Z`;
const endOfDay = (key: string) => `${key}T23:59:59.999Z`;
/** A day written by a workspace one hour east of UTC, as `shared-invoice-days.test.ts:64-67` stores them: `key` here is
 *  the day *before* the one the page shows for `startAtPlusOne`, and the same day for `endAtPlusOne`. */
const startAtPlusOne = (key: string) => `${key}T23:00:00.000Z`;
const endAtPlusOne = (key: string) => `${key}T22:59:59.999Z`;
/** `invoiceDayTextOf` (`core/lib/utils/invoices.ts:1454-1461`) over `dateOfDayKey` + `dayDateOf`
 *  (`core/lib/utils/dashboards/payments-due.ts:159-168`, `:844-869`): the year is printed only for a day of another
 *  year, and a day key becomes a *local* midnight, so the label never depends on the machine's zone. */
const dayLabel = (key: string) => {
	const [year, month, day] = key.split('-').map(Number);
	const date = new Date(year, month - 1, day);
	const isThisYear = date.getFullYear() === new Date().getFullYear();
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		...(isThisYear ? {} : { year: 'numeric' })
	}).format(date);
};

// ------------------------------------------------------------------------------------------- what this file serves

type ServedLine = {
	id: string;
	description: string | null;
	price: number | null;
	quantity: number | null;
	totalValue: number | null;
	applyTax: boolean;
	applyDiscount: boolean;
	projectId: string;
	project: { id: string; name: string | null };
};

/** `TSharedInvoice` (`shared-invoice.schema.ts:16-20` over `savedInvoiceSchema`, `invoice.schema.ts:9-40,66-80`). */
type ServedInvoice = {
	id: string;
	invoiceNumber: number | null;
	invoiceDate: string | null;
	dueDate: string | null;
	currency: string | null;
	totalValue: number | null;
	alreadyPaid: number | null;
	amountDue: number | null;
	status: string | null;
	terms: string | null;
	toContactId: string;
	toContact: { id: string; name: string | null; primaryEmail: string | null };
	fromOrganization: { name: string | null; officialName: string | null; timeZone: string | null } | null;
	organization: { name: string | null; officialName: string | null; timeZone: string | null } | null;
	discountValue: number | null;
	discountType: string | null;
	tax: number | null;
	taxType: string | null;
	tax2: number | null;
	tax2Type: string | null;
	invoiceItems: ServedLine[];
};

type ServedPayOption = { payable: boolean; amountDue: number | null; currency: string | null };
type Refusal = { status: number; message: string };
type ServeScript = {
	invoice?: ServedInvoice;
	/** Served per link id, when one page must answer two links differently (test 14). */
	invoices?: Record<string, ServedInvoice>;
	readRefusal?: Refusal;
	payOption?: ServedPayOption;
	payOptions?: Record<string, ServedPayOption>;
	payOptionRefusal?: Refusal;
	checkout?: { url: string };
	checkoutRefusal?: Refusal;
	downloadRefusal?: Refusal;
};

const lineOf = (
	id: string,
	description: string | null,
	price: number | null,
	quantity: number | null,
	totalValue: number | null
): ServedLine => ({
	id,
	description,
	price,
	quantity,
	totalValue,
	applyTax: true,
	applyDiscount: true,
	projectId: 'project-probe-1',
	project: { id: 'project-probe-1', name: 'Probe project' }
});

const ISSUED_KEY = dayKey(-6);
const DUE_KEY = dayKey(14);

/** The invoice every test serves unless it says otherwise: two lines, EUR, unpaid, its days the UTC edges of theirs. */
const servedInvoice = (fields: Partial<ServedInvoice> = {}): ServedInvoice => ({
	id: INVOICE_ID,
	invoiceNumber: 4242,
	invoiceDate: startOfDay(ISSUED_KEY),
	dueDate: endOfDay(DUE_KEY),
	currency: 'EUR',
	totalValue: 1204.5,
	alreadyPaid: null,
	amountDue: 1204.5,
	status: 'SENT',
	terms: TERMS,
	toContactId: 'contact-probe-1',
	toContact: { id: 'contact-probe-1', name: CLIENT_NAME, primaryEmail: CLIENT_EMAIL },
	fromOrganization: { name: 'Probe Sender Name', officialName: SENDER_NAME, timeZone: null },
	organization: { name: 'Probe Organization', officialName: null, timeZone: null },
	discountValue: null,
	discountType: null,
	tax: null,
	taxType: null,
	tax2: null,
	tax2Type: null,
	invoiceItems: [lineOf('line-1', 'Design work', 100, 6, 600), lineOf('line-2', 'Implementation', 95, 6.36, 604.2)],
	...fields
});

type ServedCall = {
	method: string;
	url: string;
	path: string;
	query: string;
	body: string | null;
	referer: string | null;
	authorization: string | null;
	resourceType: string;
};

/**
 * This file's answers for the four public invoice routes, on the mock origin. The script is read per request, so a test
 * can turn a refusal into an answer between two clicks (tests 4 and 7 do).
 */
async function serveInvoiceRoutes(page: Page, script: ServeScript) {
	const calls: ServedCall[] = [];
	const matcher = (url: URL) => url.origin === MOCK_ORIGIN && url.pathname.startsWith('/api/public/');

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({
			method,
			url: request.url(),
			path: url.pathname,
			query: url.search,
			body: request.postData(),
			referer: request.headers().referer ?? null,
			authorization: request.headers().authorization ?? null,
			resourceType: request.resourceType()
		});
		const answer = (status: number, body?: unknown, contentType = 'application/json') =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': contentType },
				body: body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
			});
		const refused = (refusal: Refusal) =>
			answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
		const linkIdOf = url.pathname.split('/')[4] ?? '';

		if (url.pathname === READ_PATH || url.pathname === OTHER_READ_PATH) {
			if (script.readRefusal) return refused(script.readRefusal);
			const invoice = script.invoices?.[linkIdOf] ?? script.invoice;
			if (!invoice) return answer(599, { message: 'this file scripted no invoice' });
			return answer(200, invoice);
		}
		if (url.pathname === DOWNLOAD_PATH) {
			if (script.downloadRefusal) return refused(script.downloadRefusal);
			return answer(200, '%PDF-1.4 stand-in for a PDF', 'application/pdf');
		}
		if (url.pathname === OPTION_PATH || url.pathname === OTHER_OPTION_PATH) {
			if (script.payOptionRefusal) return refused(script.payOptionRefusal);
			return answer(
				200,
				script.payOptions?.[linkIdOf] ?? script.payOption ?? { payable: false, amountDue: null, currency: null }
			);
		}
		if (url.pathname === CHECKOUT_PATH && method === 'POST') {
			if (script.checkoutRefusal) return refused(script.checkoutRefusal);
			return answer(201, script.checkout ?? { url: CHECKOUT_URL });
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.query}`),
		countOf: (method: string, path: string) =>
			calls.filter((call) => call.method === method && call.path === path).length,
		uninstall: () => page.unroute(matcher)
	};
}

type Served = Awaited<ReturnType<typeof serveInvoiceRoutes>>;

/** The stand-in checkout document. */
async function serveCheckout(page: Page) {
	await page.route(`${CHECKOUT_ORIGIN}/**`, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'text/html; charset=utf-8',
			body: '<!doctype html><html><head><title>stand-in checkout</title></head><body>STAND-IN CHECKOUT</body></html>'
		})
	);
}

/** Everything the browser sent, split by origin. Records only; answers nothing. */
function recordCalls(page: Page) {
	const mockCalls: ServedCall[] = [];
	const appCalls: ServedCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		const entry = {
			method: request.method(),
			url: request.url(),
			path: url.pathname,
			query: url.search,
			body: request.postData(),
			referer: request.headers().referer ?? null,
			authorization: request.headers().authorization ?? null,
			resourceType: request.resourceType()
		};
		if (url.origin === MOCK_ORIGIN) mockCalls.push(entry);
		if (url.origin === APP_ORIGIN) appCalls.push(entry);
	});
	return {
		mockCalls,
		appCalls,
		mockShapes: () => mockCalls.map((call) => `${call.method} ${call.path}${call.query}`),
		/** The app's own `/api/**` routes: an `app/api/public/**` call would appear here. */
		appApiPaths: () =>
			appCalls.filter((call) => call.path.startsWith('/api/')).map((call) => `${call.method} ${call.path}`)
	};
}

// --------------------------------------------------------------------------------------------- reading the page out

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const inner = async (page: Page, selector: string) =>
	page
		.locator(selector)
		.innerText()
		.then((value) => flat(value))
		.catch(() => '(no such element)');
const mainText = (page: Page) => inner(page, 'main');
/** The page's buttons only: the dev overlay adds `Copy details` and a `Compiling . . .` outside `main`. */
const mainButtons = async (page: Page) =>
	page
		.locator('main')
		.getByRole('button')
		.allInnerTexts()
		.then((all) => all.map(flat));
/** `main [role="alert"]`, not `getByRole('alert')`: the sonner live region is a second `alert` (`-probe-2.log`). */
const alertsInMain = async (page: Page) =>
	page
		.locator('main [role="alert"]')
		.allInnerTexts()
		.then((all) => all.map(flat));
/** The whitespace collapse is written out inside each `evaluateAll`: that code runs in the page, where `flat` is not. */
const dlPairs = async (page: Page) =>
	page
		.locator('main dl')
		.evaluateAll((lists) =>
			lists.map((list) =>
				Array.from(list.querySelectorAll(':scope > div')).map((row) => [
					(row.querySelector('dt')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
					(row.querySelector('dd')?.textContent ?? '').replace(/\s+/g, ' ').trim()
				])
			)
		);
/** The head facts `<dl>` and the totals `<dl>` (`invoice-detail-paper.tsx:149-157` and `:211`). */
const factsOf = async (page: Page) => (await dlPairs(page))[0] ?? [];
const totalsOf = async (page: Page) => (await dlPairs(page))[1] ?? [];
const lineRows = async (page: Page) =>
	page
		.locator('main [role="row"]')
		.evaluateAll((rows) => rows.map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim()));
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const keptLink = (page: Page) =>
	page.evaluate((key) => {
		const raw = window.sessionStorage.getItem(key);
		return { hasKey: raw !== null, length: raw?.length ?? 0, value: raw ?? null };
	}, KEPT_LINK_KEY);

const fragmentOf = (id: string, token: string) => `#${new URLSearchParams({ id, token }).toString()}`;
const linkAddress = (id: string, token: string) => `${SHARED_PATH}${fragmentOf(id, token)}`;
/** `sharedInvoiceFragmentOf(INVOICE_ID, LINK_TOKEN)`, for the kept-link length. */
const LINK_FRAGMENT = fragmentOf(INVOICE_ID, LINK_TOKEN);

let openCount = 0;
/**
 * Opens an address on a fresh document, signed out, and returns it. Two things this guarantees, both learned the hard
 * way in probes 1 and 2: `page.goto` to an address differing **only in its fragment** is a same-document navigation, and
 * so is a goto to the address already open — so every case gets its own `?case=`, and the link always travels in the
 * fragment, never in the query. The app reads only `paid` out of the query (`shared-invoice-page.tsx:160`), and
 * `paymentReturnUrlOf` (`shared-invoice.ts:93-99`) drops this query again, which test 9 pins.
 */
async function openLink(page: Page, address: string) {
	openCount += 1;
	const hashAt = address.indexOf('#');
	const base = hashAt === -1 ? address : address.slice(0, hashAt);
	const hash = hashAt === -1 ? '' : address.slice(hashAt);
	await page.context().clearCookies();
	const url = `${APP_ORIGIN}${base}${base.includes('?') ? '&' : '?'}case=${openCount}${hash}`;
	await page.goto(url, { waitUntil: 'domcontentloaded' });
	return url;
}

const paper = (page: Page) => page.locator('main article');
const closedCard = (page: Page) => page.getByText(S.CLOSED_TITLE, { exact: true });
const returnedNotice = (page: Page) => page.getByText(S.RETURNED_TITLE, { exact: true });
const paidNotice = (page: Page) => page.getByText(S.PAID_TITLE, { exact: true });
const payButton = (page: Page) => page.locator('main').getByRole('button', { name: /^Pay/ });
const tryAgainButton = (page: Page) => page.locator('main').getByRole('button', { name: TRY_AGAIN, exact: true });

/** Waits for a read this file scripted, so the screen is never read before its data arrived. */
const waitForRead = async (served: Served, method: string, path: string, atLeast = 1) =>
	await expect.poll(() => served.countOf(method, path), { timeout: 30_000 }).toBeGreaterThanOrEqual(atLeast);

/**
 * The frame line, as the browser renders it (`innerText` puts a space between the blocks the flex layout stacks;
 * `toHaveText` would see `Invoice 4242SentFrom …`, which is no one's copy).
 */
const expectFrame = async (page: Page, parts: string[]) =>
	await expect.poll(() => inner(page, 'main > div > header'), 'the frame of the invoice').toBe(parts.join(' '));

test.describe('lane-a · an invoice opened from its share link: what the page shows and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------------- 1. a served link, opened signed out: the invoice as a document

	test('1 · the link opens the invoice: its frame, its paper, the two reads it took, and nothing else', async ({
		page,
		mock,
		shield
	}) => {
		const served = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' }
		});
		const calls = recordCalls(page);
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));

		await expect(paper(page), 'the link never opened an invoice').toBeVisible({ timeout: 25_000 });
		await waitForRead(served, 'GET', OPTION_PATH);

		// SharedInvoiceView:257-296 — the number, the standing, the sender, the two actions
		await expectFrame(page, [HEADING, ST.SENT, FROM_SENDER, DOWNLOAD_LABEL, PAY_1204_50]);
		await expect(page.getByRole('heading', { level: 1, name: HEADING, exact: true })).toBeVisible();
		await expect.poll(() => mainButtons(page)).toEqual([DOWNLOAD_LABEL, PAY_1204_50]);
		// SharedInvoiceFrame:323-333 — the app's name at the foot, and nothing a signed-out person could use
		await expect(page.getByText(FOOTER, { exact: true })).toBeVisible();
		await expect(page.getByRole('navigation')).toHaveCount(0);
		await expect(page.getByRole('link')).toHaveCount(0);
		await expect(page.getByRole('textbox')).toHaveCount(0);
		await expect(page.locator('form')).toHaveCount(0);

		// InvoiceDetailPaper:149-212 — facts, parties, lines, totals, note
		await expect
			.poll(() => factsOf(page))
			.toEqual([
				[NEW.details.ISSUE_DATE, dayLabel(ISSUED_KEY)],
				[NEW.details.DUE_DATE, dayLabel(DUE_KEY)]
			]);
		await expect
			.poll(() => inner(page, 'main article .grid.gap-5'), 'who the invoice is from and to')
			.toBe(`${NEW.FROM} ${SENDER_NAME} ${NEW.BILL_TO} ${CLIENT_NAME} ${CLIENT_EMAIL}`);
		await expect
			.poll(() => lineRows(page))
			.toEqual([
				`${D.COLUMN_DESCRIPTION}${D.COLUMN_HOURS}${D.COLUMN_RATE}${D.COLUMN_AMOUNT}`,
				'Design work6.00 h · €100.006.00 h€100.00€600.00',
				'Implementation6.36 h · €95.006.36 h€95.00€604.20'
			]);
		await expect.poll(() => totalsOf(page)).toEqual([[NEW.TOTAL, '€1,204.50']]);
		await expect(page.getByText(NEW.terms.NOTE, { exact: true })).toBeVisible();
		await expect(page.getByText(TERMS, { exact: true })).toBeVisible();

		// shared-invoice.service.ts:26-40 — two reads, on the mock origin, no session, no referrer, nothing else
		expect(
			served.calls.map((call) => ({
				m: call.method,
				p: call.path,
				q: call.query,
				auth: call.authorization,
				ref: call.referer,
				type: call.resourceType
			})),
			'the page sent something other than the invoice read and the pay-option read'
		).toEqual([
			{ m: 'GET', p: READ_PATH, q: READ_QUERY, auth: null, ref: null, type: 'xhr' },
			{ m: 'GET', p: OPTION_PATH, q: '', auth: null, ref: null, type: 'xhr' }
		]);
		expect(calls.mockShapes(), 'the browser sent something else to the API').toEqual([
			`GET ${READ_PATH}${READ_QUERY}`,
			`GET ${OPTION_PATH}`
		]);
		expect(
			calls.appApiPaths(),
			"the browser went to the app's own route twins instead of the API"
		).not.toContainEqual(expect.stringContaining('/api/public/'));
		expect(
			calls.appCalls.map((call) => call.url),
			"the link's token reached the app"
		).not.toContainEqual(expect.stringContaining(LINK_TOKEN));

		// the mock has no handler for any of these routes, so its silence is the proof this file answered
		expect(await mock.requests(), "the lane's mock answered a public invoice route").toEqual([]);
		expect(shield.consoleErrors(), 'the open invoice logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the open invoice crashed').toEqual([]);
		expect(shield.externalCalls(), 'the browser left the machine').toEqual([]);

		report('1 open invoice', {
			frame: await inner(page, 'main > div > header'),
			paper: await inner(page, 'main article'),
			facts: await factsOf(page),
			totals: await totalsOf(page),
			lines: await lineRows(page),
			browserMockCalls: calls.mockShapes(),
			appApiCalls: calls.appApiPaths(),
			tokenOnAppUrls: calls.appCalls.filter((call) => call.url.includes(LINK_TOKEN)).length,
			mockLogged: (await mock.requests()).length,
			devToasts: await devToasts(page).count(),
			appToasts: await appToasts(page).count(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		await served.uninstall();
	});

	// ------------------------------------------------- 2. an address that carries no link is refused without a request

	test('2 · no fragment, or a fragment that cannot be a link: the closed card, and not one request', async ({
		page,
		mock
	}) => {
		const served = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' }
		});
		const broken: Array<[string, string]> = [
			['no fragment at all', SHARED_PATH],
			['an empty fragment', `${SHARED_PATH}#`],
			['an id that is no uuid', `${SHARED_PATH}#id=42&token=${LINK_TOKEN}`],
			['a token of two parts', `${SHARED_PATH}#id=${INVOICE_ID}&token=probeHeader.probePayload`],
			['a token with an empty part', `${SHARED_PATH}#id=${INVOICE_ID}&token=probeHeader..probeSignature`],
			[
				'a token with a slash in it',
				`${SHARED_PATH}#id=${INVOICE_ID}&token=probeHeader/probePayload/probeSignature`
			],
			['no token at all', `${SHARED_PATH}#id=${INVOICE_ID}`],
			['the link in the query instead of the fragment', `${SHARED_PATH}?id=${INVOICE_ID}&token=${LINK_TOKEN}`],
			[
				'the email form with a segment too many',
				`${SHARED_PATH}#/share/invoices/${INVOICE_ID}/${LINK_TOKEN}/edit`
			]
		];
		for (const [label, address] of broken) {
			await openLink(page, address);
			await expect(closedCard(page), `${label}: no closed card`).toBeVisible({ timeout: 25_000 });
			await expect(page.getByText(S.CLOSED_MESSAGE, { exact: true })).toBeVisible();
			// shared-invoice.ts:36-38 refuses here, so SharedInvoiceView never mounts: no action, no paper, no read
			await expect.poll(() => mainButtons(page), `${label}: an action was offered`).toEqual([]);
			await expect(paper(page)).toHaveCount(0);
			await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
			expect(served.calls, `${label}: the page read anyway`).toEqual([]);
			expect(await mock.requests(), `${label}: the mock was asked anyway`).toEqual([]);
		}
		report('2 refused without a request', {
			variants: broken.map(([label]) => label),
			reads: served.countOf('GET', READ_PATH),
			payReads: served.countOf('GET', OPTION_PATH)
		});
		await served.uninstall();
	});

	// --------------------------------------------- 3. a link the API no longer honours: closed, said once, not read again

	test('3 · a 403 says the link no longer opens an invoice, and is not read again', async ({ page, shield }) => {
		const served = await serveInvoiceRoutes(page, {
			readRefusal: { status: 403, message: 'the link was revoked' }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));

		await expect(closedCard(page), 'the 403 did not become the closed card').toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(S.CLOSED_MESSAGE, { exact: true })).toBeVisible();
		// :215-233 — a closed link has no action; anything else gets Try again
		await expect.poll(() => mainButtons(page)).toEqual([]);
		await expect(page.locator('main [role="alert"]')).toHaveCount(0);
		// :49 — `errorStatusOf(error) !== 403` is the retry rule, so one read and no second one
		await waitForRead(served, 'GET', READ_PATH);
		expect(served.countOf('GET', READ_PATH), 'a 403 was retried').toBe(1);
		expect(served.countOf('GET', OPTION_PATH), 'the pay option was asked for an invoice that never arrived').toBe(
			0
		);

		// shared-invoice.service.ts marks all four calls `secretAddress`, and api.service.ts:445-447 keeps such a
		// response out of the client's own error log: no line naming the path and the armed status exists to excuse.
		expect(shield.logMatching(/HttpClient|HTTP/), 'a refused shared read was logged with its path').toEqual([]);
		expect(shield.consoleErrors(), 'the closed page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
		expect(shield.externalCalls()).toEqual([]);

		report('3 403', {
			main: await mainText(page),
			buttons: await mainButtons(page),
			reads: served.countOf('GET', READ_PATH),
			payReads: served.countOf('GET', OPTION_PATH),
			devToasts: await devToasts(page).count(),
			appToasts: await appToasts(page).count(),
			httpClientLines: shield.logMatching(/HttpClient|HTTP/),
			consoleErrors: shield.consoleErrors()
		});
		await served.uninstall();
	});

	// -------------------------------- 4. a read that failed for another reason: the load-error card, and its Try again

	test('4 · a 404 or a 500 says the invoice could not be loaded, and Try again reads it again', async ({
		page,
		shield
	}) => {
		for (const status of [404, 500]) {
			const served = await serveInvoiceRoutes(page, {
				readRefusal: { status, message: `stand-in refusal ${status}` }
			});
			await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
			await expect(
				page.getByText(EN.invoices.edit.LOAD_ERROR_TITLE, { exact: true }),
				`the ${status} did not become the load-error card`
			).toBeVisible({ timeout: 40_000 });
			await expect(tryAgainButton(page)).toBeVisible();
			await expect(closedCard(page), `a ${status} is not a revoked link`).toHaveCount(0);
			await waitForRead(served, 'GET', READ_PATH);
			// :49 retried twice here (3 reads); the count of a *failed* read is not stable across mounts, so it is
			// reported and not pinned — as in api-tokens-settings-ui.spec.ts:161-166.
			expect(shield.logMatching(/HttpClient|HTTP/), `the ${status} was logged with its path`).toEqual([]);
			report(`4 read refusal ${status}`, {
				main: await mainText(page),
				buttons: await mainButtons(page),
				reads: served.countOf('GET', READ_PATH),
				payReads: served.countOf('GET', OPTION_PATH),
				devToasts: await devToasts(page).count(),
				httpClientLines: shield.logMatching(/HttpClient|HTTP/)
			});
			await served.uninstall();
		}

		const script: ServeScript = { readRefusal: { status: 500, message: 'stand-in refusal' } };
		const served = await serveInvoiceRoutes(page, script);
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const again = tryAgainButton(page);
		await expect(again).toBeVisible({ timeout: 40_000 });
		const afterLoad = served.countOf('GET', READ_PATH);
		await again.click();
		await expect.poll(() => served.countOf('GET', READ_PATH), { timeout: 40_000 }).toBeGreaterThan(afterLoad);
		await expect(page.getByText(EN.invoices.edit.LOAD_ERROR_TITLE, { exact: true })).toBeVisible();
		const afterFirstClick = served.countOf('GET', READ_PATH);
		// the same button, now answered: the invoice comes up and the card is gone
		script.readRefusal = undefined;
		script.invoice = servedInvoice();
		script.payOption = { payable: true, amountDue: 1204.5, currency: 'EUR' };
		await again.click();
		await expect(paper(page), 'Try again did not bring the invoice up').toBeVisible({ timeout: 40_000 });
		await expect(page.getByRole('button', { name: TRY_AGAIN, exact: true })).toHaveCount(0);
		// :64-69 — the invoice arriving is what first enables the pay option, so its read and Pay come only now
		await waitForRead(served, 'GET', OPTION_PATH);
		await expectFrame(page, [HEADING, ST.SENT, FROM_SENDER, DOWNLOAD_LABEL, PAY_1204_50]);
		report('4 try again', {
			readsAfterLoad: afterLoad,
			readsAfterFirstClick: afterFirstClick,
			readsAfterSecondClick: served.countOf('GET', READ_PATH),
			payReads: served.countOf('GET', OPTION_PATH),
			main: await mainText(page)
		});
		await served.uninstall();
	});

	// ------------------- 5. MEASURED, NOT INTENDED: a 401 sends the signed-out visitor off the link, to the sign-in page

	test("5 · a 401 on the public read throws the visitor to the sign-in page instead of the page's own refusal", async ({
		page,
		shield
	}) => {
		const served = await serveInvoiceRoutes(page, { readRefusal: { status: 401, message: 'stand-in refusal' } });
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));

		await expect(page).toHaveURL(/\/auth\/passcode/, { timeout: 25_000 });
		await expect(page.getByText(EN.auth.sessionEnded.TITLE, { exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(EN.auth.sessionEnded.TEXT, { exact: true })).toBeVisible();
		await expect(closedCard(page)).toHaveCount(0);
		await expect(page.getByText(EN.invoices.edit.LOAD_ERROR_TITLE, { exact: true })).toHaveCount(0);
		await expect(paper(page)).toHaveCount(0);
		expect(served.countOf('GET', READ_PATH), 'the read that caused the move never happened').toBeGreaterThanOrEqual(
			1
		);

		// [MEASURED, NOT INTENDED] page.tsx:5-7 and layout.tsx:3-4 say this invoice page is opened without an account,
		// and api.service.ts:73-78 (`isPageOpenWithoutSession`) lists only /auth/* and the public team pages — so the 401
		// goes through handleUnauthorized and off the link (the same finding public-link-pages-ui.spec.ts:29-34 pins for
		// /shared-report). The 401 is this file's answer; the reaction is the app's.
		report('5 401 (MEASURED, NOT INTENDED)', {
			finalUrl: page.url(),
			main: await mainText(page),
			reads: served.countOf('GET', READ_PATH),
			consoleErrors: shield.consoleErrors()
		});
		await served.uninstall();
	});

	// --------------------------------- 6. what each standing and each money shape shows, and which buttons come with it

	test('6 · the standing, the money rows and the actions, for every shape of the invoice and its pay option', async ({
		page
	}) => {
		const overdueKey = dayKey(-1);
		const cases: Array<{
			label: string;
			status: string | null;
			invoice?: Partial<ServedInvoice>;
			payOption: ServedPayOption;
			standing: string;
			totals: string[][];
			buttons: string[];
			isPaidNotice: boolean;
		}> = [
			{
				label: 'open, unpaid',
				status: 'SENT',
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: ST.SENT,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'seen by the client',
				status: 'VIEWED',
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: ST.VIEWED,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'partly paid',
				status: 'PARTIALLY_PAID',
				invoice: { alreadyPaid: 300, amountDue: 904.5 },
				payOption: { payable: true, amountDue: 904.5, currency: 'EUR' },
				standing: ST.PARTIALLY_PAID,
				totals: [
					[NEW.TOTAL, '€1,204.50'],
					[D.PAID, '−€300.00'],
					[D.LEFT_TO_PAY, '€904.50']
				],
				buttons: [DOWNLOAD_LABEL, PAY_904_50],
				isPaidNotice: false
			},
			{
				label: 'fully paid',
				status: 'FULLY_PAID',
				invoice: { alreadyPaid: 1204.5, amountDue: 0 },
				payOption: { payable: true, amountDue: 0, currency: 'EUR' },
				standing: ST.FULLY_PAID,
				totals: [
					[NEW.TOTAL, '€1,204.50'],
					[D.PAID, '−€1,204.50'],
					[D.LEFT_TO_PAY, '€0.00']
				],
				buttons: [DOWNLOAD_LABEL],
				isPaidNotice: true
			},
			{
				// invoice-detail-paper.tsx:95-101 — the Paid row is always prefixed with a typographic minus; Left to
				// pay is the money format as it is, so a negative reads with a plain one. Measured, not chosen.
				label: 'overpaid',
				status: 'OVERPAID',
				invoice: { alreadyPaid: 1500, amountDue: -295.5 },
				payOption: { payable: true, amountDue: -295.5, currency: 'EUR' },
				standing: ST.OVERPAID,
				totals: [
					[NEW.TOTAL, '€1,204.50'],
					[D.PAID, '−€1,500.00'],
					[D.LEFT_TO_PAY, '-€295.50']
				],
				buttons: [DOWNLOAD_LABEL],
				isPaidNotice: true
			},
			{
				label: 'nothing stated apart from the total',
				status: 'PARTIALLY_PAID',
				invoice: { alreadyPaid: null, amountDue: null },
				payOption: { payable: true, amountDue: null, currency: 'EUR' },
				standing: ST.PARTIALLY_PAID,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL],
				isPaidNotice: false
			},
			{
				label: 'the pay option says it cannot be paid',
				status: 'SENT',
				payOption: { payable: false, amountDue: null, currency: null },
				standing: ST.SENT,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL],
				isPaidNotice: false
			},
			{
				label: 'past its due day',
				status: 'SENT',
				invoice: { dueDate: endOfDay(overdueKey) },
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: STANDING.OVERDUE,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'past its due day and part paid',
				status: 'SENT',
				invoice: { alreadyPaid: 200, amountDue: 1004.5, dueDate: endOfDay(overdueKey) },
				payOption: { payable: true, amountDue: 1004.5, currency: 'EUR' },
				standing: STANDING.OVERDUE,
				totals: [
					[NEW.TOTAL, '€1,204.50'],
					[D.PAID, '−€200.00'],
					[D.LEFT_TO_PAY, '€1,004.50']
				],
				buttons: [DOWNLOAD_LABEL, PAY_1004_50],
				isPaidNotice: false
			},
			{
				// :242 — Pay follows the pay-option read, not the standing. Whether the platform ever answers
				// `payable: true` for a void invoice is not measured here; what the page makes of it is.
				label: 'void, and the pay option still says payable',
				status: 'VOID',
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: ST.VOID,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'draft, and the pay option still says payable',
				status: 'DRAFT',
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: ST.DRAFT,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'a status the app does not know',
				status: 'SOMETHING_ELSE',
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: 'SOMETHING_ELSE',
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			},
			{
				label: 'no status at all',
				status: null,
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				standing: STANDING.UNKNOWN,
				totals: [[NEW.TOTAL, '€1,204.50']],
				buttons: [DOWNLOAD_LABEL, PAY_1204_50],
				isPaidNotice: false
			}
		];

		for (const one of cases) {
			const served = await serveInvoiceRoutes(page, {
				invoice: servedInvoice({ status: one.status, ...one.invoice }),
				payOption: one.payOption
			});
			await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
			await expect(paper(page), `${one.label}: no invoice`).toBeVisible({ timeout: 25_000 });
			await waitForRead(served, 'GET', OPTION_PATH);
			// invoice-standing.tsx:32-40, :177-186 — the standing is the status label, or `Overdue`, or the raw status
			await expectFrame(page, [HEADING, one.standing, FROM_SENDER, DOWNLOAD_LABEL, ...one.buttons.slice(1)]);
			await expect.poll(() => totalsOf(page), `${one.label}: the money rows`).toEqual(one.totals);
			await expect.poll(() => mainButtons(page), `${one.label}: the actions`).toEqual(one.buttons);
			// :297-310 + PAID_STATUSES :37 — the paid notice only for FULLY_PAID and OVERPAID
			await expect(paidNotice(page)).toHaveCount(one.isPaidNotice ? 1 : 0);
			await expect(returnedNotice(page)).toHaveCount(0);
			report(`6 standing ${one.label}`, {
				standing: one.standing,
				totals: await totalsOf(page),
				buttons: await mainButtons(page),
				paidNotice: await paidNotice(page).count(),
				reads: served.countOf('GET', READ_PATH),
				payReads: served.countOf('GET', OPTION_PATH)
			});
			await served.uninstall();
		}
		report('6 standings', { dueDayOfTheOverdueCases: dayLabel(overdueKey), utcToday: dayKey(0) });
	});

	// ------------------------------- 7. the pay option failing: said with a retry, silent for a 404, and asked again

	test('7 · a pay option that failed is said with Try again, a 404 is not a failure, and Try again re-asks it', async ({
		page
	}) => {
		const script: ServeScript = {
			invoice: servedInvoice(),
			payOptionRefusal: { status: 502, message: 'stand-in pay option refused' }
		};
		const served = await serveInvoiceRoutes(page, script);
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));

		await expect(paper(page), 'the invoice itself did not show').toBeVisible({ timeout: 25_000 });
		await expect(page.locator('main [role="alert"]'), 'the failed pay option was not said').toBeVisible({
			timeout: 40_000
		});
		await expect(page.getByText(S.PAY_FAILED, { exact: true })).toBeVisible();
		await expect(payButton(page)).toHaveCount(0);
		// :281-294 — Try again beside the words, the invoice readable beside them
		const again = tryAgainButton(page);
		await expect(again).toBeVisible();
		const beforeClick = served.countOf('GET', OPTION_PATH);
		await again.click();
		await expect.poll(() => served.countOf('GET', OPTION_PATH), { timeout: 40_000 }).toBeGreaterThan(beforeClick);
		// :64-69 — `retry: false`: one read per ask, nothing asked on its own, and the invoice is not re-read for it
		expect(served.countOf('GET', READ_PATH), 'the invoice was re-read for a failed pay option').toBe(1);
		// now answered: the same button brings Pay up and the words away
		script.payOptionRefusal = undefined;
		script.payOption = { payable: true, amountDue: 1204.5, currency: 'EUR' };
		await again.click();
		await expect(payButton(page), 'Try again did not bring Pay up').toBeVisible({ timeout: 40_000 });
		await expect(page.locator('main [role="alert"]')).toHaveCount(0);
		report('7 pay option 502', {
			alerts: await alertsInMain(page),
			payReadsBeforeClick: beforeClick,
			payReadsAfter: served.countOf('GET', OPTION_PATH),
			invoiceReads: served.countOf('GET', READ_PATH),
			buttons: await mainButtons(page)
		});
		await served.uninstall();

		// :244-247 — an API without online payments answers 404, which is no failure and says nothing
		const missing = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOptionRefusal: { status: 404, message: 'stand-in pay option missing' }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		await expect(paper(page)).toBeVisible({ timeout: 25_000 });
		await waitForRead(missing, 'GET', OPTION_PATH);
		await expect(payButton(page), 'a 404 pay option still offered Pay').toHaveCount(0);
		await expect(page.locator('main [role="alert"]')).toHaveCount(0);
		await expect(page.getByText(S.PAY_FAILED, { exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: TRY_AGAIN, exact: true })).toHaveCount(0);
		await expect.poll(() => mainButtons(page)).toEqual([DOWNLOAD_LABEL]);
		report('7 pay option 404', {
			buttons: await mainButtons(page),
			payReads: missing.countOf('GET', OPTION_PATH),
			devToasts: await devToasts(page).count()
		});
		await missing.uninstall();
	});

	// ----------------------------------------------------- 8. Download PDF: the read, the name it suggests, a refused one

	test('8 · Download PDF reads the PDF once and names the file after the invoice number', async ({ page }) => {
		const withNumber = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOption: { payable: false, amountDue: null, currency: null }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const button = page.locator('main').getByRole('button', { name: DOWNLOAD_LABEL, exact: true });
		await expect(button).toBeVisible({ timeout: 25_000 });
		await waitForRead(withNumber, 'GET', OPTION_PATH);
		const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
		await waitForRead(withNumber, 'GET', DOWNLOAD_PATH);
		// DownloadButton:115 over invoicePdfFileNameOf (invoice-labels.ts) — the name only; the bytes are never read
		expect(download.suggestedFilename(), 'the file offered is named after the invoice number').toBe(
			'invoice-4242.pdf'
		);
		expect(withNumber.countOf('GET', DOWNLOAD_PATH), 'the PDF was asked for more than once').toBe(1);
		report('8 download', {
			suggested: download.suggestedFilename(),
			downloadReads: withNumber.countOf('GET', DOWNLOAD_PATH),
			calls: withNumber.shapes()
		});
		await withNumber.uninstall();

		const noNumber = await serveInvoiceRoutes(page, {
			invoice: servedInvoice({ invoiceNumber: null }),
			payOption: { payable: false, amountDue: null, currency: null }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const button2 = page.locator('main').getByRole('button', { name: DOWNLOAD_LABEL, exact: true });
		await expect(button2).toBeVisible({ timeout: 25_000 });
		const [download2] = await Promise.all([page.waitForEvent('download'), button2.click()]);
		expect(download2.suggestedFilename(), 'an invoice without a number is named for what it is').toBe(
			'invoice.pdf'
		);
		await expect(page.getByRole('heading', { level: 1, name: D.PAPER_TITLE, exact: true })).toBeVisible();
		report('8 download without a number', { suggested: download2.suggestedFilename() });
		await noNumber.uninstall();

		const refused = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOption: { payable: false, amountDue: null, currency: null },
			downloadRefusal: { status: 500, message: 'stand-in download refused' }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const button3 = page.locator('main').getByRole('button', { name: DOWNLOAD_LABEL, exact: true });
		await expect(button3).toBeVisible({ timeout: 25_000 });
		await button3.click();
		await expect(page.locator('main [role="alert"]'), 'the failed download was not said').toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByText(S.DOWNLOAD_FAILED, { exact: true })).toBeVisible();
		// and no file was offered — a commented quiet window, the only way to pin an event that did not come
		const event = await page.waitForEvent('download', { timeout: 2_000 }).catch(() => null);
		expect(event, 'a refused download still offered a file').toBeNull();
		expect(refused.countOf('GET', DOWNLOAD_PATH), 'the refused download was retried').toBe(1);
		report('8 download refused', {
			alerts: await alertsInMain(page),
			downloadReads: refused.countOf('GET', DOWNLOAD_PATH),
			appToasts: await appToasts(page).count()
		});
		await refused.uninstall();
	});

	// ------------------------ 9. Pay: what the button says, the body it posts, the address it hands the client to

	test('9 · Pay posts the return address of this page and then shows the served checkout document', async ({
		page,
		mock
	}) => {
		await serveCheckout(page);
		const served = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			// the option names no currency: the invoice's own is used (`shared-invoice-page.tsx:248-252`)
			payOption: { payable: true, amountDue: 1204.5, currency: null },
			checkout: { url: CHECKOUT_URL }
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const pay = page.locator('main').getByRole('button', { name: PAY_1204_50, exact: true });
		await expect(pay).toBeVisible({ timeout: 25_000 });
		await waitForRead(served, 'GET', OPTION_PATH);

		await pay.click();
		// PayButton:82-84 — the return address is this page with `?paid=1` and no fragment, so the token is not in it,
		// and paymentReturnUrlOf (shared-invoice.ts:93-99) dropped this file's own `?case=` on the way.
		await expect(page, 'the checkout document never came up').toHaveURL(CHECKOUT_URL, { timeout: 25_000 });
		await expect(page.getByText('STAND-IN CHECKOUT')).toBeVisible();
		const post = served.calls.find((call) => call.method === 'POST');
		expect(post?.path, 'the checkout was asked at another address').toBe(CHECKOUT_PATH);
		expect(post?.body, 'the body the checkout was asked with').toBe(
			JSON.stringify({ returnUrl: `${APP_ORIGIN}${SHARED_PATH}?paid=1` })
		);
		expect(served.countOf('POST', CHECKOUT_PATH)).toBe(1);
		expect(served.shapes(), 'the pay went somewhere other than the invoice, its option and the checkout').toEqual([
			`GET ${READ_PATH}${READ_QUERY}`,
			`GET ${OPTION_PATH}`,
			`POST ${CHECKOUT_PATH}`
		]);
		expect(await mock.requests(), 'the mock answered a checkout').toEqual([]);

		report('9 pay', {
			label: PAY_1204_50,
			postBody: post?.body ?? null,
			postPath: post?.path ?? null,
			finalUrl: page.url(),
			tokenInReturnUrl: String(post?.body ?? '').includes(LINK_TOKEN),
			calls: served.shapes()
		});
		await served.uninstall();
	});

	// ------------- 10. a Pay that cannot be started: the page stays where it was, says it once, and keeps nothing

	test('10 · a checkout that is refused or answered badly keeps the visitor on the invoice and says it', async ({
		page
	}) => {
		const variants: Array<{ label: string; script: ServeScript }> = [
			{
				label: 'a 502 checkout',
				script: { checkoutRefusal: { status: 502, message: 'stand-in checkout refused' } }
			},
			{
				label: 'a 404 checkout',
				script: { checkoutRefusal: { status: 404, message: 'stand-in checkout missing' } }
			},
			{ label: 'an http checkout url', script: { checkout: { url: 'http://127.0.0.1:4113/checkout' } } },
			{ label: 'a javascript: checkout url', script: { checkout: { url: 'javascript:alert(1)' } } }
		];
		for (const one of variants) {
			const served = await serveInvoiceRoutes(page, {
				invoice: servedInvoice(),
				payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				...one.script
			});
			const address = await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
			const pay = page.locator('main').getByRole('button', { name: PAY_1204_50, exact: true });
			await expect(pay).toBeVisible({ timeout: 25_000 });
			await waitForRead(served, 'GET', OPTION_PATH);
			await pay.click();
			await expect(page.locator('main [role="alert"]'), `${one.label}: the failure was not said`).toBeVisible({
				timeout: 25_000
			});
			await expect(page.getByText(S.PAY_FAILED, { exact: true })).toBeVisible();
			// invoiceCheckoutSchema (shared-invoice.schema.ts:33-40) wants an https url, and isPaymentReturnUrl
			// (shared-invoice.ts:106-120) is what turns a bad one into this copy instead of a ride elsewhere.
			await expect(page, `${one.label}: the page left the invoice`).toHaveURL(address);
			await expect(paper(page)).toBeVisible();
			// keepLinkWhilePaying (use-shared-invoice-link.ts:56-62) runs only once the checkout answer was good
			expect(
				(await keptLink(page)).hasKey,
				`${one.label}: a link was kept for a payment that never started`
			).toBe(false);
			await expect.poll(() => mainButtons(page)).toEqual([DOWNLOAD_LABEL, PAY_1204_50]);
			report(`10 ${one.label}`, {
				stayedOnInvoice: page.url() === address,
				alerts: await alertsInMain(page),
				posts: served.countOf('POST', CHECKOUT_PATH),
				keptLink: (await keptLink(page)).hasKey,
				buttons: await mainButtons(page)
			});
			await served.uninstall();
		}
	});

	// ---------------- 11. back from the provider with the link kept: the thanks, no Pay, the kept link, then paid

	test('11 · back with `?paid=1` the page shows the invoice with the thanks and no Pay, keeps its link, and shows it paid when the poll says so', async ({
		page
	}) => {
		await serveCheckout(page);
		const script: ServeScript = {
			invoice: servedInvoice(),
			payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' },
			checkout: { url: CHECKOUT_URL }
		};
		const served = await serveInvoiceRoutes(page, script);
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		await page.locator('main').getByRole('button', { name: PAY_1204_50, exact: true }).click();
		await expect(page).toHaveURL(CHECKOUT_URL, { timeout: 25_000 });

		await openLink(page, `${SHARED_PATH}?paid=1`);
		await expect(paper(page), 'the return did not bring the invoice back').toBeVisible({ timeout: 25_000 });
		await waitForRead(served, 'GET', READ_PATH, 2);
		await expect(returnedNotice(page), 'the return said nothing about the payment').toBeVisible();
		await expect(page.getByText(S.RETURNED_MESSAGE, { exact: true })).toBeVisible();
		await expect(paidNotice(page)).toHaveCount(0);
		// :242 with useIsConfirmingPayment:192-202 — no second Pay while the payment just made is being confirmed
		await expect(payButton(page)).toHaveCount(0);
		await expect.poll(() => mainButtons(page)).toEqual([DOWNLOAD_LABEL]);
		// the link the return address does not carry (shared-invoice.ts:87-99), kept for this tab
		const kept = await keptLink(page);
		expect(kept.hasKey, 'the kept link was not in sessionStorage').toBe(true);
		expect(kept.length, 'what was kept is not the link fragment').toBe(LINK_FRAGMENT.length);
		expect(kept.value?.startsWith('#id='), 'what was kept is not a link fragment').toBe(true);
		expect(served.countOf('POST', CHECKOUT_PATH), 'the return re-posted the checkout').toBe(1);

		report('11 return with the kept link', {
			finalUrl: page.url(),
			frame: await inner(page, 'main > div > header'),
			buttons: await mainButtons(page),
			keptKey: KEPT_LINK_KEY,
			keptLength: kept.length,
			fragmentLength: LINK_FRAGMENT.length,
			reads: served.countOf('GET', READ_PATH),
			payReads: served.countOf('GET', OPTION_PATH),
			calls: served.shapes()
		});

		// :50-62 — while a return is unpaid the page reads again every 5 s; the store now answers paid
		script.invoice = servedInvoice({ status: 'FULLY_PAID', alreadyPaid: 1204.5, amountDue: 0 });
		await expect(paidNotice(page), 'the confirmation never arrived on the page').toBeVisible({ timeout: 40_000 });
		await expect(returnedNotice(page), 'the thanks stayed next to the paid notice').toHaveCount(0);
		await expectFrame(page, [HEADING, ST.FULLY_PAID, FROM_SENDER, DOWNLOAD_LABEL]);
		await expect.poll(() => mainButtons(page)).toEqual([DOWNLOAD_LABEL]);
		report('11 confirmed by the poll', {
			readsAfterConfirmation: served.countOf('GET', READ_PATH),
			payReadsAfterConfirmation: served.countOf('GET', OPTION_PATH),
			totals: await totalsOf(page)
		});
		await served.uninstall();
	});

	// ------------------------------- 12. `?paid=1` with nothing kept: the thanks for a payment, and no request at all

	test('12 · a bare return says the payment is being confirmed and asks the API nothing', async ({ page, mock }) => {
		const served = await serveInvoiceRoutes(page, {
			invoice: servedInvoice(),
			payOption: { payable: true, amountDue: 1204.5, currency: 'EUR' }
		});
		const returns: Array<[string, string]> = [
			[`${SHARED_PATH}?paid=1`, 'a return with nothing kept'],
			[`${SHARED_PATH}?paid=1${fragmentOf('42', LINK_TOKEN)}`, 'a return whose fragment cannot be a link']
		];
		for (const [address, label] of returns) {
			await openLink(page, address);
			await expect(returnedNotice(page), `${label}: no thanks`).toBeVisible({ timeout: 25_000 });
			await expect(page.getByText(S.RETURNED_MESSAGE, { exact: true })).toBeVisible();
			// :165-183 — a return with no link is the thanks, not the closed card, and no invoice
			await expect(closedCard(page)).toHaveCount(0);
			await expect(paper(page)).toHaveCount(0);
			await expect.poll(() => mainButtons(page), `${label}: an action was offered`).toEqual([]);
			expect(served.calls, `${label}: the page read anyway`).toEqual([]);
			expect(await mock.requests(), `${label}: the mock was asked anyway`).toEqual([]);
			report(`12 ${label}`, {
				main: await mainText(page),
				buttons: await mainButtons(page),
				reads: served.countOf('GET', READ_PATH)
			});
		}
		await served.uninstall();
	});

	// ---------------- 13. a link revoked while the payment is being confirmed: closed, and the polling stops with it

	test('13 · a 403 on the return closes the link and stops the confirmation polling', async ({ page, shield }) => {
		const served = await serveInvoiceRoutes(page, {
			readRefusal: { status: 403, message: 'the link was revoked' }
		});
		await openLink(page, `${SHARED_PATH}?paid=1${fragmentOf(INVOICE_ID, LINK_TOKEN)}`);
		await expect(closedCard(page), 'the revoked return was not closed').toBeVisible({ timeout: 25_000 });
		await expect(returnedNotice(page), 'the thanks was shown for a link that no longer opens').toHaveCount(0);
		await expect(paper(page)).toHaveCount(0);
		await expect.poll(() => mainButtons(page)).toEqual([]);

		const before = served.countOf('GET', READ_PATH);
		// a commented quiet window, and the only way to pin this: while an unpaid return is open the page would read
		// again every 5 s (:50-62), so nine seconds of silence is what says the 403 stopped it.
		await page.waitForTimeout(9_000);
		expect(before, 'the closed link was not even read once').toBe(1);
		expect(served.countOf('GET', READ_PATH), 'the closed link was read again while confirming').toBe(before);
		expect(served.countOf('GET', OPTION_PATH), 'the pay option was asked for a closed link').toBe(0);
		expect(shield.logMatching(/HttpClient|HTTP/), 'the refused return was logged with its path').toEqual([]);

		report('13 revoked while confirming', {
			main: await mainText(page),
			readsBeforeQuietWindow: before,
			readsAfterQuietWindow: served.countOf('GET', READ_PATH),
			payReads: served.countOf('GET', OPTION_PATH),
			httpClientLines: shield.logMatching(/HttpClient|HTTP/)
		});
		await served.uninstall();
	});

	// --------------------- 14. the fragment changed in place: another invoice, a broken link, the good link back

	test('14 · a fragment changed in place opens the invoice it now names, with its own reads', async ({ page }) => {
		const served = await serveInvoiceRoutes(page, {
			invoices: {
				[INVOICE_ID]: servedInvoice({ invoiceNumber: 1111 }),
				[OTHER_INVOICE_ID]: servedInvoice({ id: OTHER_INVOICE_ID, invoiceNumber: 2222 })
			},
			payOptions: {
				[INVOICE_ID]: { payable: true, amountDue: 1204.5, currency: 'EUR' },
				[OTHER_INVOICE_ID]: { payable: true, amountDue: 604.2, currency: 'EUR' }
			}
		});
		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const firstHeading = filled(D.HEADING, { number: '1111' });
		const secondHeading = filled(D.HEADING, { number: '2222' });
		await expect(page.getByRole('heading', { level: 1, name: firstHeading, exact: true })).toBeVisible({
			timeout: 25_000
		});

		// use-shared-invoice-link.ts:34-45 listens to `hashchange`: no reload, the page follows the fragment
		await page.evaluate(
			(fragment) => {
				window.location.hash = fragment;
			},
			fragmentOf(OTHER_INVOICE_ID, OTHER_TOKEN)
		);
		await expect(
			page.getByRole('heading', { level: 1, name: secondHeading, exact: true }),
			'the new link was not opened'
		).toBeVisible({ timeout: 25_000 });
		await waitForRead(served, 'GET', OTHER_OPTION_PATH);
		expect(served.countOf('GET', OTHER_READ_PATH), 'the new invoice was not read').toBe(1);
		expect(served.shapes(), 'the new link was opened with something other than its own two reads').toEqual([
			`GET ${READ_PATH}${READ_QUERY}`,
			`GET ${OPTION_PATH}`,
			`GET ${OTHER_READ_PATH}${READ_QUERY}`,
			`GET ${OTHER_OPTION_PATH}`
		]);
		report('14 a second link in place', {
			frame: await inner(page, 'main > div > header'),
			calls: served.shapes()
		});

		await page.evaluate(() => {
			window.location.hash = '#id=42&token=a.b.c';
		});
		await expect(closedCard(page), 'a fragment that cannot be a link was not closed').toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
		await expect(paper(page)).toHaveCount(0);
		expect(
			served.countOf('GET', READ_PATH) + served.countOf('GET', OTHER_READ_PATH),
			'a broken fragment was read'
		).toBe(2);
		report('14 a broken fragment in place', {
			headings: await page.getByRole('heading').allInnerTexts(),
			calls: served.shapes()
		});

		// and back to the link this tab already read: shown from the query cache, no third read
		await page.evaluate(
			(fragment) => {
				window.location.hash = fragment;
			},
			fragmentOf(INVOICE_ID, LINK_TOKEN)
		);
		await expect(page.getByRole('heading', { level: 1, name: firstHeading, exact: true })).toBeVisible({
			timeout: 25_000
		});
		expect(served.countOf('GET', READ_PATH), 'the invoice this tab already read was read again').toBe(1);
		report('14 back to the first link', {
			frame: await inner(page, 'main > div > header'),
			reads: served.countOf('GET', READ_PATH)
		});
		await served.uninstall();
	});

	// ------------------- 15. the dates and the days due, read as the day they stand for, wherever the link is opened

	test('15 · the paper dates an edge of a day as that day, re-dates an instant written at another offset, and obeys a workspace zone', async ({
		page
	}) => {
		const cases: Array<{
			label: string;
			invoiceDate: string;
			dueDate: string | null;
			fromOrganization?: { name: string | null; officialName: string | null; timeZone: string | null };
			facts: string[][];
			standing: string;
		}> = [
			{
				label: 'the UTC edges of two days',
				invoiceDate: startOfDay(dayKey(-6)),
				dueDate: endOfDay(dayKey(14)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(-6))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(14))]
				],
				standing: ST.SENT
			},
			{
				label: 'a due day that has passed',
				invoiceDate: startOfDay(dayKey(-6)),
				dueDate: endOfDay(dayKey(-1)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(-6))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(-1))]
				],
				standing: STANDING.OVERDUE
			},
			{
				// invoice-standing.ts:40-45 + shared-invoice-days.ts:156-165 — today is counted on the clock the due
				// day was written on, and the last instant of today is not past
				label: 'due today is not overdue',
				invoiceDate: startOfDay(dayKey(-6)),
				dueDate: endOfDay(dayKey(0)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(-6))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(0))]
				],
				standing: ST.SENT
			},
			{
				label: 'no due date at all',
				invoiceDate: startOfDay(dayKey(-6)),
				dueDate: null,
				facts: [[NEW.details.ISSUE_DATE, dayLabel(dayKey(-6))]],
				standing: ST.SENT
			},
			{
				// shared-invoice-days.test.ts:56-79 — the first instant of a day written 12 hours east of UTC is the
				// next day, which a reader at UTC+1 would otherwise read as the day before
				label: 'an instant written at UTC+12 (noon UTC)',
				invoiceDate: `${dayKey(-6)}T12:00:00.000Z`,
				dueDate: endOfDay(dayKey(14)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(-5))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(14))]
				],
				standing: ST.SENT
			},
			{
				label: 'the first and the last instant of a day written at UTC+1',
				invoiceDate: startAtPlusOne(dayKey(-5)),
				dueDate: endAtPlusOne(dayKey(13)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(-4))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(13))]
				],
				standing: ST.SENT
			},
			{
				// shared-invoice-days.ts:147-149, :181-184 — a workspace zone in the read wins, and the instants are
				// read in it instead of being re-dated at UTC midnight: one day later than the case after it
				label: 'the workspace zone Asia/Tokyo names the days',
				invoiceDate: endAtPlusOne(dayKey(13)),
				dueDate: endAtPlusOne(dayKey(13)),
				fromOrganization: { name: 'Probe Sender Name', officialName: null, timeZone: 'Asia/Tokyo' },
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(14))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(14))]
				],
				standing: ST.SENT
			},
			{
				label: 'the same instants, with no zone in the read',
				invoiceDate: endAtPlusOne(dayKey(13)),
				dueDate: endAtPlusOne(dayKey(13)),
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(13))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(13))]
				],
				standing: ST.SENT
			},
			{
				// :122-141 — a zone the browser does not know is no zone: re-dated as if none had been given, and the
				// sender falls back to its plain name because no official name was served
				label: 'a zone the browser does not know is ignored',
				invoiceDate: endAtPlusOne(dayKey(13)),
				dueDate: endAtPlusOne(dayKey(13)),
				fromOrganization: { name: 'Probe Sender Name', officialName: null, timeZone: 'Mars/Olympus_Mons' },
				facts: [
					[NEW.details.ISSUE_DATE, dayLabel(dayKey(13))],
					[NEW.details.DUE_DATE, dayLabel(dayKey(13))]
				],
				standing: ST.SENT
			}
		];

		for (const one of cases) {
			const served = await serveInvoiceRoutes(page, {
				invoice: servedInvoice({
					status: 'SENT',
					invoiceDate: one.invoiceDate,
					dueDate: one.dueDate,
					...(one.fromOrganization === undefined ? {} : { fromOrganization: one.fromOrganization })
				}),
				payOption: { payable: false, amountDue: null, currency: null }
			});
			await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
			await expect(paper(page), `${one.label}: no invoice`).toBeVisible({ timeout: 25_000 });
			await waitForRead(served, 'GET', OPTION_PATH);
			await expect.poll(() => factsOf(page), `${one.label}: the dates of the paper`).toEqual(one.facts);
			// :39-42 — the official name first, else the plain name; the cases that name a zone drop the official one
			const organization = one.fromOrganization ?? {
				name: 'Probe Sender Name',
				officialName: SENDER_NAME,
				timeZone: null
			};
			const sender = organization.officialName?.trim() || organization.name?.trim() || '';
			await expectFrame(page, [HEADING, one.standing, filled(S.FROM_SENDER, { name: sender }), DOWNLOAD_LABEL]);
			report(`15 ${one.label}`, {
				served: { invoiceDate: one.invoiceDate, dueDate: one.dueDate },
				shown: await factsOf(page),
				standing: one.standing
			});
			await served.uninstall();
		}
		report('15 the clock of this run', { utcToday: dayKey(0) });
	});

	// ------------------------------------------------- 16. while the invoice read is held: the skeleton, and nothing else

	test('16 · while the invoice read is on its way the page is a loading skeleton, with no paper and no closed card', async ({
		page
	}) => {
		const held: string[] = [];
		const matcher = (url: URL) => url.origin === MOCK_ORIGIN && url.pathname.startsWith('/api/public/');
		await page.route(matcher, async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			held.push(`${request.method()} ${new URL(request.url()).pathname}`);
			// the read is held on purpose: it is how the loading state is reached, not a wait for a snapshot
			await new Promise((done) => setTimeout(done, 2_500));
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(servedInvoice())
			});
		});

		await openLink(page, linkAddress(INVOICE_ID, LINK_TOKEN));
		const skeleton = page.locator('main output');
		await expect(skeleton, 'the loading skeleton never appeared').toBeVisible({ timeout: 10_000 });
		// SharedInvoiceLoading:137-148 — one labelled <output>, no paper, no refusal, only the frame's footer beside it
		expect(await skeleton.getAttribute('aria-label'), 'the skeleton is not labelled').toBe(LOADING_LABEL);
		await expect(paper(page)).toHaveCount(0);
		await expect(closedCard(page)).toHaveCount(0);
		await expect.poll(() => mainText(page)).toBe(FOOTER);
		report('16 loading', { ariaLabel: LOADING_LABEL, held: [...held], main: await mainText(page) });

		await expect(paper(page), 'the held read never brought the invoice up').toBeVisible({ timeout: 30_000 });
		report('16 after the held read', { held: [...held], frame: await inner(page, 'main > div > header') });
		await page.unroute(matcher);
	});
});
