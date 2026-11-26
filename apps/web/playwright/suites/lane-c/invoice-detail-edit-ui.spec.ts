import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person with the full invoice set sees, and what the browser really sends, on **one invoice's own page**
 * (`app/[locale]/(main)/invoices/[id]/page.tsx:11` → `InvoiceDetailPageComponent`,
 * `core/components/pages/invoices/detail/page-component.tsx:172-179`) and on **its edit screen**
 * (`app/[locale]/(main)/invoices/[id]/edit/page.tsx:4` →
 * `core/components/pages/invoices/edit/page-component.tsx:181-197`), on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, control `4004` — `playwright/test-servers.ts:40`), measured 2026-11-26.
 *
 * Who may open these pages at all (per permission) and what the API routes themselves answer are **not** re-covered
 * here: `suites/lane-a/invoice-access-ui.spec.ts` and `suites/lane-b/invoice-gates.spec.ts` pin them. This file arms
 * the same full set (`invoice-access-ui.spec.ts:119-121`, `FULL_SET` below) and pins only what the two pages show/send.
 *
 * ## Where every number came from
 *
 * The throwaway probe `D:\Coding\.tmp\probe-invoicedetail\probe1.spec.ts` + `probe2.spec.ts` (lane-c, 2026-11-26, logs
 * `D:\Coding\.tmp\s3-lane-c-invoicedetail-probe-1.log` and `-probe-2.log`) printed the document text, every served call
 * with its body, every toast and every state copy pinned below. Probe 2's five failures were its own harness (its
 * store had no `readsOf` / `writesOf` / `stored`), not the app, so the values it printed stand. This file's own runs
 * re-measured all of it: every test prints a `MEASURE` line with what its page and its stub really did, so any
 * assertion here can be checked against a log line in `D:\Coding\.tmp\s3-lane-c-invoicedetail-<n>.log`.
 *
 * Amounts and dates are never pinned to a calendar or a machine: the served days are `today ± n` (`dayKey`), the
 * printed dates, money, percentages and hours are rebuilt here with the same `Intl` shapes the app uses, and the two
 * date *fields* are checked against a value built inside the browser, so no host's time zone or date format is pinned.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock and the app shell (`/api/user/me`, the organization, its `timeZone: 'UTC'`
 * `mock-gauzy-server.mjs:94`, `GET /api/role-permissions/me` for the guard), the NextAuth session stub of
 * `signInAndVisit`, and the two pages with every hook, dialog, menu and reducer they run.
 *
 * **Served by this file:** every invoice route, through `page.route` on the mock origin, because the mock has **no**
 * invoice handler: an unmatched GET answers `pagination([])` = `{ items: [], total: 0 }` (`mock-gauzy-server.mjs:895`),
 * which `savedInvoiceSchema` (`core/types/schemas/organization/invoice.schema.ts:98-110`) rejects — that is exactly the
 * load-error state `invoice-access-ui.spec.ts:303-335` sees, and no document could be pinned on it. The answers follow
 * that schema and `savedInvoiceOf`'s readability rules (`core/lib/utils/invoice-edit.ts:365-426`, `isMadeFromTime`
 * `:404-411`, `appliesItsRatesToEveryLine` `:418-426`): a period line opening `terms` (`core/lib/utils/invoices.ts:961-983`),
 * `invoiceType: 'BY_PROJECT_HOURS'`, PERCENT discount and tax, no second tax, and `applyTax` / `applyDiscount` true on
 * every line — otherwise the edit screen calls the invoice "not made from billable time" and this file would be
 * looking at a different page. The store is live: an action, a save or a delete changes what the next read answers (and
 * moves `updatedAt`, as the API does), and a refused write changes nothing — which is how "the status after" is told
 * apart from "the client kept its old copy". Every answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`), `OPTIONS` is answered 204, and `route.fetch()` is never called inside a stubbed
 * route: `mock.calls('/api/invoices/')` is empty in every test here, the witness that the page acted on this file.
 *
 * **The browser talks to the mock origin, never to the app's own `app/api/invoices/**` twins** (lane wiring
 * `playwright/test-servers.ts:104-110` + `core/services/client/axios.ts`; those routes are pinned by
 * `suites/lane-b/invoice-gates.spec.ts`). The paths below are the service's own (`invoice.service.ts`), `/api`-prefixed.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `detail/page-component.tsx:83-161` — a missing read (`isMissingInvoice`, `core/hooks/invoices/use-invoices-query.ts:131-137`)
 *   or an invoice of another workspace → the NOT_FOUND state; a failed read → `invoices.detail.ERROR_TITLE` +
 *   `invoices.ERROR_MESSAGE` + `pages.unauthorized.TRY_AGAIN` → `read.refetch()`; `:129-161` the header and the paper
 *   only once the invoice **and** the organization are both there.
 * - `detail/invoice-detail-header.tsx:87-140` — the standing badge (`core/components/invoices/invoice-standing.tsx:198-218`
 *   over `core/lib/utils/invoice-standing.ts:47-70`), `ClientLink` (`:37-57`), `InvoiceDueText`
 *   (`core/components/invoices/invoice-due-text.tsx:24-62`), the primary button from `nextInvoiceActionOf`
 *   (`core/lib/utils/invoice-actions.ts:168-183`), Download PDF, and `InvoiceActionsMenu` (`aria-label` =
 *   `invoices.actions.MENU_LABEL`).
 * - `detail/invoice-detail-paper.tsx:105-215` + `core/lib/utils/invoice-paper.ts:159-181` — the lines, Subtotal, Discount,
 *   Tax (of its base), the **stored** `totalValue`, and the Paid / Left to pay rows, which exist only when
 *   `alreadyPaid > 0` and `amountDue` is a number (`:87-103`).
 * - `invoices/invoice-actions-menu.tsx:136-192` over `invoiceMenuActionsOf` (`invoice-actions.ts:60-78`,
 *   `REVISIONS_BY_STATUS` `:35-43`): Edit first (`common.EDIT`), the ending actions last, and no menu at all for VOID.
 * - `invoices/invoice-action-flow.tsx:37-124`, `invoices/invoice-action-dialogs.tsx` and
 *   `core/hooks/invoices/use-invoice-mutations.ts` — mark paid / unpaid need no dialog and re-read the invoice first
 *   (`currentPaymentChangeOf` `:841-858`); send, void, void-and-replace and delete open their dialog, each guarded by
 *   `assertActionOffered` (`:812-827`) under the `updatedAt` that read returned (#5382); a 409 whose message holds
 *   `INVOICE_CHANGED` (`isChangedMeanwhile` `:532-539`) is reported as `invoices.actions.CHANGED_MEANWHILE`.
 * - `edit/page-component.tsx:128-179` + `edit/saved-invoice-states.tsx:81-101` (the locked screen),
 *   `invoices/new/invoice-details.tsx:17-27,190-287` (the fields, the `ul[aria-live="polite"]` problems list, and a Save
 *   button disabled only while saving), `invoices/new/invoice-screen.tsx:97-103` (`askToSave` opens the dialog only when
 *   the problems list is empty), `edit/save-invoice-changes-dialog.tsx` (the change rows, the refusal, `router.push('/invoices')`).
 * - `core/hooks/invoices/use-invoice-edit.ts:79-120` (`'unchanged'`), `core/lib/utils/invoice-edit.ts:596-619` +
 *   `invoice.service.ts:388-402` (the `PUT …/with-items` body and its `expectedUpdatedAt`, taken from the read
 *   `checkInvoiceEdit` makes just before the write — `use-invoice-mutations.ts:688-708`).
 *
 * ## Findings
 *
 * - **`PUT /invoices/email/:email` carries its `params` object inside the JSON body** (measured, untagged: no comment
 *   or test states another shape): `core/services/client/api/organizations/invoice.service.ts:282-296` builds
 *   `params` and calls `this.put(url, { params }, { tenantId })`, i.e. `put(url, data)`
 *   (`core/services/client/api.service.ts`), so the request measured on the wire is
 *   `PUT /api/invoices/email/client.one%40example.test` with **no query string** and body
 *   `{"params":{invoiceNumber, invoiceId, isEstimate, organizationId, tenantId},"tenantId":…,"organizationId":…}`.
 *   No other test pins this route's wire shape (`invoice-gates.spec.ts` only proves the proxy forwards it).
 * - **The paper prints the stored total, never a recomputed one** (measured, untagged: `invoice-paper.test.ts` serves a
 *   stored `totalValue` too, and no comment asks for a recomputed one):
 *   `invoice-paper.ts:180` / `invoice-detail-paper.tsx:126-128` take `invoice.totalValue`, so served lines adding to 700
 *   with 10 % off and 20 % tax printed `Total $1,140.00` while the same lines in the edit form add to $756.00 (probe 1
 *   `Q5`: the save dialog offered "Total $756.00, instead of $1,140.00."). Everything this file now serves is
 *   internally coherent (`TOTAL` = 756 = 700 − 70 + 126) so each printed figure can be read off the served data — and
 *   an untouched edit form really is unchanged (test 15).
 * - **The edit screen has no hours or rate field** (reachability): a line row is a description `input`
 *   (`aria-label` = `invoices.new.DESCRIPTION_OF`) plus a remove button (`invoices.new.REMOVE_LINE`),
 *   `invoices/new/invoice-sheet.tsx:95-113`; hours (`invoices.new.HOURS`) and rate (`invoices.new.RATE_PER_HOUR`) are
 *   text only (`:117-118`). An e2e cannot change a line's hours or rate here — that needs "Take the time again", which
 *   re-reads billable time (`core/hooks/invoices/use-new-invoice.ts:438-445`) the mock cannot serve. So test 17 edits a
 *   description and the note, and test 16 pins what a *removed* line blocks; `invoice-edit.ts`'s repricing paths and the
 *   `'changed'` refusal stay unit-tested (`core/hooks/invoices/use-invoice-mutations.test.tsx`) and unreachable here.
 * - **A problem never disables the Save button, it only blocks the dialog** (measured, untagged: `askToSave` showing
 *   the problems on that click is the screen's own design):
 *   `invoice-details.tsx:270-279` renders `disabled={invoice.isSaving}` only, while `invoice-screen.tsx:97-103`
 *   `askToSave` refuses to open the dialog when the problems list is non-empty; the click still lands, and the sentence
 *   appears in the list instead. Tests 15 and 16 pin that (and the button's generated `aria-describedby` is reported,
 *   never pinned).
 * - **Deleting an invoice makes the app read it once more, and that read answers 404** (measured in test 9): after the
 *   `DELETE` the client re-reads `/invoices/<id>?data=…`, gets 404, prints its `[HttpClient] HTTP Error` line and a dev
 *   `DEV Query failed … 404 · Invoice not found` toast, while the page moves to the list. That is the client reacting
 *   to the invoice it just deleted, not a page defect; test 9 excuses only that exact line and proves it names 404.
 * - Not covered: the save outcomes `notReached` / `putBack` / `notPutBack` / `timeBilled` (they need a dropped socket or
 *   a half-written save the mock cannot imitate faithfully); the two-write fallback `isSaveAtOnceMissing`
 *   (`use-invoice-mutations.ts:547-557`), whose body pair is already pinned by
 *   `use-invoice-mutations.test.tsx:1543-1584`; "Take the time again"; the shared-link and schedule surfaces; and
 *   everything `invoice-access-ui.spec.ts` pins about who gets in. `invoices.send.NOT_MARKED`,
 *   `invoices.delete.CHANGED_MEANWHILE` and `invoices.replace.NOT_REBUILDABLE` are armed-but-unused copy: the first
 *   needs the e-mail to succeed while the status write fails (this file arms refusals per route, so it would arm both),
 *   the other two are guarded before the request is sent.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const INVOICES_PATH = '/invoices';

/** `locales/en.json`, by key — every sentence pinned below is read from the locale file, never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	invoices: {
		NUMBER: string;
		ERROR_MESSAGE: string;
		status: Record<string, string>;
		standing: Record<string, string>;
		due: Record<string, string>;
		detail: Record<string, string>;
		actions: Record<string, string>;
		send: Record<string, string>;
		void: Record<string, string>;
		delete: Record<string, string>;
		replace: Record<string, string>;
		edit: Record<string, string> & { confirm: Record<string, string> };
		new: {
			HOURS: string;
			RATE_PER_HOUR: string;
			PERIOD: string;
			TOTAL: string;
			SAVED: string;
			FROM: string;
			BILL_TO: string;
			DESCRIPTION_OF: string;
			REMOVE_LINE: string;
			SHEET_LABEL: string;
			details: Record<string, string>;
			adjustments: Record<string, string>;
			terms: Record<string, string>;
			problems: Record<string, string>;
		};
	};
	common: { EDIT: string; CANCEL: string };
	pages: { unauthorized: { TRY_AGAIN: string } };
};

const T = EN.invoices;
const NEW = T.new;

/** `{number}`-style filling (`invoices.detail.HEADING`, `invoices.actions.MENU_LABEL`, …). */
const filled = (text: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)), text);

/** The `one {…} / other {…}` forms the locale files use (`invoices.due.IN_DAYS`, `invoices.edit.confirm.DESCRIPTIONS`). */
const pluralOf = (template: string, count: number) => {
	const key = count === 1 ? 'one' : 'other';
	const branch = new RegExp(`${key} \\{([^}]*)\\}`).exec(template)?.[1];
	const start = template.indexOf('{count, plural,');
	if (branch === undefined || start < 0) {
		return template;
	}
	const end = template.lastIndexOf('}');
	return (template.slice(0, start) + branch.replace('#', String(count)) + template.slice(end + 1)).trim();
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c invoice-detail] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`cypress/support/mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204 at `:1097-1101`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `savedInvoiceSchema` (`invoice.schema.ts:98-110`) / `savedInvoiceItemSchema` (`:83-95`) as this file serves them. */
type ServedLine = {
	id: string;
	description: string | null;
	price: number;
	quantity: number;
	totalValue: number;
	applyTax: boolean;
	applyDiscount: boolean;
	projectId: string;
	project: { id: string; name: string | null };
	employeeId?: string;
};

type ServedInvoice = {
	id: string;
	updatedAt: string;
	invoiceNumber: number;
	invoiceDate: string;
	dueDate: string;
	currency: string;
	totalValue: number;
	alreadyPaid: number | null;
	amountDue: number | null;
	status: string;
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
	invoiceItems: ServedLine[];
};

type Refusal = { status: number; message: string };

type ServeScript = {
	invoice: ServedInvoice;
	/** `GET /invoices/:id` answers this instead of the invoice: a missing read (404) or a failing one (500). */
	readRefusal?: Refusal;
	/** `PUT /invoices/:id/action` refused, having written nothing. */
	actionRefusal?: Refusal;
	/** `PUT /invoices/:id/with-items` refused. */
	withItemsRefusal?: Refusal;
	/** `PUT /invoices/email/:email` refused. */
	emailRefusal?: Refusal;
};

type ServedCall = { method: string; path: string; query: string; body: unknown };

type InvoiceHarness = {
	calls: ServedCall[];
	/** `METHOD path?query body` for every invoice call the browser sent, oldest first. */
	shapes: () => string[];
	readsOf: () => ServedCall[];
	writesOf: () => ServedCall[];
	/** The invoice the stub holds now (null once deleted): what the next read would answer. */
	stored: () => ServedInvoice | null;
	only: (method: string, path: string) => ServedCall[];
	/** The call right before the first write to `path`, as the client's own order of requests. */
	shapeBefore: (method: string, path: string) => string | null;
};

const PDF_BYTES = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n';

/**
 * This file's stand-in for the invoice API, on the mock origin (see the header). The store *is* the answer: an action,
 * a save or a delete changes it, a refused write leaves it exactly as it was. `route.fetch()` is never called.
 */
async function serveInvoices(page: Page, script: ServeScript): Promise<InvoiceHarness> {
	const store = new Map<string, ServedInvoice>([[script.invoice.id, { ...script.invoice }]]);
	const calls: ServedCall[] = [];
	let lineSeq = 0;

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

		if (/^\/invoices\/download\/[^/]+$/.test(pathname) && method === 'GET') {
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/pdf' },
				body: PDF_BYTES
			});
		}
		if (/^\/invoices\/email\/[^/]+$/.test(pathname) && method === 'PUT') {
			if (script.emailRefusal) {
				return refuse(script.emailRefusal);
			}
			return answer(202);
		}

		const bulk = /^\/invoice-item\/bulk\/([^/]+)$/.exec(pathname);
		if (bulk && method === 'POST') {
			const target = store.get(bulk[1]);
			if (!target) {
				return answer(404, { statusCode: 404, message: 'No such invoice' });
			}
			lineSeq += 1;
			target.invoiceItems = (Array.isArray(body) ? body : []).map((line, index) => ({
				...(line as object),
				id: `${target.id}-lines-${lineSeq}-${index}`
			})) as ServedLine[];
			target.updatedAt = new Date().toISOString();
			return answer(200, { success: true });
		}

		// The client's other invoices and the next free number, answered as the mock's own catch-all answers an
		// unmatched GET (`pagination([])`, `mock-gauzy-server.mjs:895`): the edit screen reads the invoices already
		// saved for this client (`use-new-invoice.ts:339-343`), the replacement screen reads the highest number
		// (`use-invoices-query.ts:106-128`). Answering them keeps the console clean without pretending to hold data.
		if (pathname === '/invoices/pagination' && method === 'GET') {
			return answer(200, { items: [], total: 0 });
		}
		if (pathname === '/invoices/highest' && method === 'GET') {
			return answer(200, { max: SERVED_NUMBER });
		}
		// The invoice-list surface also reads the client's schedules (`invoice-schedule.service.ts:34-47`, which
		// validates an **array**). The mock's catch-all answers an object there, which the client logs as
		// `[InvoiceScheduleService] Invoice schedules validation failed` (run 1) — so this route is served as the API
		// answers it, with no schedules.
		if (pathname === '/invoice-schedules' && method === 'GET') {
			return answer(200, []);
		}

		const detail = /^\/invoices\/([^/]+)(\/(action|with-items))?$/.exec(pathname);
		if (!detail) {
			return answer(599, { message: `this file scripted no answer for ${method} ${pathname}` });
		}
		const [, id, , suffix] = detail;
		const invoice = store.get(id);

		if (method === 'GET') {
			if (script.readRefusal) {
				return refuse(script.readRefusal);
			}
			if (!invoice) {
				return answer(404, { statusCode: 404, message: 'Invoice not found' });
			}
			return answer(200, invoice);
		}
		if (!invoice) {
			return answer(404, { statusCode: 404, message: 'Invoice not found' });
		}

		if (suffix === 'action' && method === 'PUT') {
			if (script.actionRefusal) {
				return refuse(script.actionRefusal);
			}
			const change = (body ?? {}) as Record<string, unknown>;
			invoice.status = String(change.status ?? invoice.status);
			if (change.paid === true) {
				invoice.alreadyPaid = Number(change.alreadyPaid ?? invoice.totalValue);
				invoice.amountDue = Number(change.amountDue ?? 0);
			}
			if (change.paid === false) {
				invoice.alreadyPaid = Number(change.alreadyPaid ?? 0);
				invoice.amountDue = Number(change.amountDue ?? invoice.totalValue);
			}
			invoice.updatedAt = new Date().toISOString();
			return answer(200, invoice);
		}

		if (suffix === 'with-items' && method === 'PUT') {
			if (script.withItemsRefusal) {
				return refuse(script.withItemsRefusal);
			}
			const write = (body ?? {}) as Record<string, unknown>;
			lineSeq += 1;
			for (const [key, value] of Object.entries(write)) {
				if (key === 'invoiceItems' || key === 'expectedUpdatedAt') {
					continue;
				}
				(invoice as Record<string, unknown>)[key] = value;
			}
			invoice.invoiceItems = (Array.isArray(write.invoiceItems) ? write.invoiceItems : []).map((line, index) => ({
				...(line as object),
				id: `${invoice.id}-lines-${lineSeq}-${index}`
			})) as ServedLine[];
			invoice.updatedAt = new Date().toISOString();
			return answer(200, invoice);
		}

		if (method === 'PUT') {
			const write = (body ?? {}) as Record<string, unknown>;
			for (const [key, value] of Object.entries(write)) {
				if (key === 'expectedUpdatedAt') {
					continue;
				}
				(invoice as Record<string, unknown>)[key] = value;
			}
			invoice.updatedAt = new Date().toISOString();
			return answer(200, invoice);
		}

		if (method === 'DELETE') {
			store.delete(id);
			return answer(200, { affected: 1, raw: [] });
		}

		return answer(599, { message: `this file scripted no answer for ${method} ${pathname}` });
	};

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname.startsWith('/api/invoices/') ||
				url.pathname.startsWith('/api/invoice-item/') ||
				url.pathname === '/api/invoice-schedules'),
		handler
	);

	const shapeOf = (call: ServedCall) =>
		`${call.method} ${call.path}${call.query ? `?${call.query}` : ''}${
			call.body === null ? '' : ` ${JSON.stringify(call.body)}`
		}`;

	return {
		calls,
		shapes: () => calls.map(shapeOf),
		readsOf: () => calls.filter((call) => call.method === 'GET'),
		writesOf: () => calls.filter((call) => call.method !== 'GET'),
		stored: () => store.get(script.invoice.id) ?? null,
		only: (method, path) => calls.filter((call) => call.method === method && call.path === path),
		shapeBefore: (method, path) => {
			const index = calls.findIndex((call) => call.method === method && call.path === path);
			return index <= 0 ? null : shapeOf(calls[index - 1]);
		}
	};
}

/** The fixture workspace this lane signs the person into (the ids `playwright/backend.mjs` serves the mock from). */
const ORG_ID = '22222222-2222-4222-8222-111111111111';
const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = 'd1e1c1b1-0000-4000-8000-0000000000c1';
const CLIENT_NAME = 'Fixture Client One';
const CLIENT_EMAIL = 'client.one@example.test';
const PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-111111111111';
const EMPLOYEE_ID = '55555555-5555-4555-8555-111111111111';
const INVOICE_ID = '797e867f-7973-4580-827f-727540404040';
const SERVED_NUMBER = 4021;
const SERVED_NOTE = 'Fixture note for the client.';
const EDITED_NOTE = 'Edited fixture note.';
const LINE_ONE = 'Fixture line one';
const LINE_TWO = 'Fixture line two';
const EDITED_LINE = 'Rewritten line one.';
const PROJECT_NAME = 'Fixture Project One';

/** A UTC day key `offset` days from today: served dates are always relative to today, never pinned to a calendar. */
const dayKey = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
/** Noon UTC of that day. The lane's organizations are `timeZone: 'UTC'` (`mock-gauzy-server.mjs:94`), so
 *  `invoiceDayOf` (`core/lib/utils/invoices.ts:1254-1267`) reads back exactly this key whatever the browser's zone is. */
const instantOf = (key: string) => `${key}T12:00:00.000Z`;

const ISSUE_DAY = dayKey(-20);
const PERIOD_LAST_DAY = dayKey(-10);
const DUE_DAY = dayKey(5);
const DUE_IN_DAYS = 5;
const LATE_DAY = dayKey(-3);
const LATE_BY_DAYS = 3;
const SERVED_UPDATED_AT = instantOf(dayKey(-1));
/** `invoiceTermsOf` (`invoices.ts:961-983`): the period line the edit screen reads the invoice's period from. */
const termsOf = (note: string) => `Billable time from ${ISSUE_DAY} to ${PERIOD_LAST_DAY}\n\n${note}`;

/** `invoiceDayTextOf` (`core/lib/utils/invoices.ts:1454-1460`) → `dayDateOf` (`core/lib/utils/dashboards/payments-due.ts:844-851,867-869`):
 *  short month + day, the year only when the day is in another year. */
const dayText = (key: string) => {
	const day = new Date(`${key}T00:00:00`);
	const showsYear = day.getFullYear() !== new Date().getFullYear();
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		...(showsYear ? { year: 'numeric' } : {})
	}).format(day);
};
/** `invoicePeriodTextOf` → `formatPeriod` (`core/lib/utils/dashboard-period.ts:147-164`): same year, current year. */
const periodText = () => {
	const from = new Date(`${ISSUE_DAY}T00:00:00`);
	const to = new Date(`${PERIOD_LAST_DAY}T00:00:00`);
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).formatRange(from, to);
};
/** `formatOwed` with a currency (`core/lib/utils/dashboards/payments-due.ts:806-811`, which hands a currency to `formatAmount`). */
const money = (amount: number) => new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(amount);
/** `formatPercent` (`core/lib/utils/invoice-totals.ts:106-114`): `Intl … { style: 'percent' }` of `percent / 100`. */
const percentText = (percent: number) =>
	new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 4 }).format(percent / 100);
/** `formatInvoiceHours` (`invoices.ts:1484-1491`): always two decimals. */
const hoursText = (hours: number) =>
	new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours);
/** `filled(NEW.HOURS, { hours })` — the paper's and the sheet's hours cell. */
const hoursCell = (hours: number) => filled(NEW.HOURS, { hours: hoursText(hours) });
/** The paper's minus in the Discount / Paid rows is U+2212 (`invoice-detail-paper.tsx:82,95`), not a hyphen. */
const MINUS = '−';

/* The figures this file serves, and the figures the paper adds up from them (`invoice-paper.ts:159-181`). */
const LINE_ONE_HOURS = 5;
const LINE_ONE_RATE = 100;
const LINE_TWO_HOURS = 4;
const LINE_TWO_RATE = 50;
const SUBTOTAL = LINE_ONE_HOURS * LINE_ONE_RATE + LINE_TWO_HOURS * LINE_TWO_RATE;
const DISCOUNT_PERCENT = 10;
const TAX_PERCENT = 20;
const DISCOUNT_AMOUNT = Math.round((SUBTOTAL * DISCOUNT_PERCENT) / 100);
const TAX_BASE = SUBTOTAL - DISCOUNT_AMOUNT;
const TAX_AMOUNT = Math.round((TAX_BASE * TAX_PERCENT) / 100);
const TOTAL = SUBTOTAL - DISCOUNT_AMOUNT + TAX_AMOUNT;
const PAID_PART = 300;
const LEFT_TO_PAY = TOTAL - PAID_PART;
/** The same figures for the single-line invoice test 16 serves. */
const SINGLE_SUBTOTAL = LINE_ONE_HOURS * LINE_ONE_RATE;
const SINGLE_DISCOUNT = Math.round((SINGLE_SUBTOTAL * DISCOUNT_PERCENT) / 100);
const SINGLE_TAX = Math.round((SINGLE_SUBTOTAL - SINGLE_DISCOUNT) * TAX_PERCENT) / 100;
const SINGLE_TOTAL = SINGLE_SUBTOTAL - SINGLE_DISCOUNT + SINGLE_TAX;

/** A served invoice, coherent with the figures above, built the way `savedInvoiceOf` can read one (`invoice-edit.ts:365-426`). */
const servedInvoice = (overrides: Partial<ServedInvoice> = {}): ServedInvoice => ({
	id: INVOICE_ID,
	updatedAt: SERVED_UPDATED_AT,
	invoiceNumber: SERVED_NUMBER,
	invoiceDate: instantOf(ISSUE_DAY),
	dueDate: instantOf(DUE_DAY),
	currency: 'USD',
	totalValue: TOTAL,
	alreadyPaid: null,
	amountDue: null,
	status: 'DRAFT',
	terms: termsOf(SERVED_NOTE),
	toContactId: CLIENT_ID,
	toContact: { id: CLIENT_ID, name: CLIENT_NAME, primaryEmail: CLIENT_EMAIL, imageUrl: null },
	organizationId: ORG_ID,
	tenantId: TENANT_ID,
	invoiceType: 'BY_PROJECT_HOURS',
	discountValue: DISCOUNT_PERCENT,
	discountType: 'PERCENT',
	tax: TAX_PERCENT,
	taxType: 'PERCENT',
	tax2: 0,
	tax2Type: null,
	invoiceItems: [
		{
			id: `${INVOICE_ID}-line-1`,
			description: LINE_ONE,
			price: LINE_ONE_RATE,
			quantity: LINE_ONE_HOURS,
			totalValue: LINE_ONE_HOURS * LINE_ONE_RATE,
			applyTax: true,
			applyDiscount: true,
			projectId: PROJECT_ID,
			project: { id: PROJECT_ID, name: PROJECT_NAME },
			employeeId: EMPLOYEE_ID
		},
		{
			id: `${INVOICE_ID}-line-2`,
			description: LINE_TWO,
			price: LINE_TWO_RATE,
			quantity: LINE_TWO_HOURS,
			totalValue: LINE_TWO_HOURS * LINE_TWO_RATE,
			applyTax: true,
			applyDiscount: true,
			projectId: PROJECT_ID,
			project: { id: PROJECT_ID, name: PROJECT_NAME },
			employeeId: EMPLOYEE_ID
		}
	],
	...overrides
});

/** `getInvoice`'s own read (`invoice.service.ts:72,361-372`): the `data` query, exactly as the service builds it. */
const DETAIL_READ_PATH = `/invoices/${INVOICE_ID}`;
const DETAIL_READ_QUERY = `data=${encodeURIComponent(JSON.stringify({ relations: ['invoiceItems', 'invoiceItems.project', 'toContact'] }))}`;
const DETAIL_READ_SHAPE = `GET ${DETAIL_READ_PATH}?${DETAIL_READ_QUERY}`;
const ACTION_PATH = `${DETAIL_READ_PATH}/action`;
const WITH_ITEMS_PATH = `${DETAIL_READ_PATH}/with-items`;

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/mutation-error-toaster.tsx:41-49` prints this for *every* failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** `api.service.ts` `logError`: the client's own line for any refusal it was not told to expect. */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
/** The same line when the request carries a query string: the path is named exactly, the status is proven separately. */
const armedReadError = (verb: string, path: string) => `[ERROR] [HttpClient] HTTP Error: ${verb} ${path}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The full set that opens both pages: `core/lib/utils/invoice-access.ts:19-27,38-42`, armed as `invoice-access-ui.spec.ts:119-121`. */
const FULL_SET: MockScenario = {
	extraPermissions: ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE']
};

/* Measured in the run logs: the header (the `<h1>`, its toolbar) is in the layout's `mainHeaderSlot`, outside the
   scroll owner; the document itself is the `main` region, and the edit screen renders a second (empty) `main`, hence
   `.last()`. Nothing here depends on `data-page-scroll-owner`. */
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
/** Issue date / due date / period and the totals are `dl > div` blocks with a `dt` and a `dd`
 *  (`invoice-paper.tsx` `PaperHead:44-48` facts, then `PaperTotals` rows; probe 3 measured 9 such blocks in the
 *  order pinned below). Everything the browser-side callback uses is inline: a callback cannot see a Node-side
 *  helper, which is why the whitespace is flattened here and not through `flat`. */
const totalsPairs = async (page: Page) =>
	page.locator('dl > div').evaluateAll((nodes) =>
		nodes.map((node) => {
			const label = node.querySelector('dt')?.textContent ?? '';
			const value = node.querySelector('dd')?.textContent ?? '';
			return `${label.replace(/\s+/g, ' ').trim()} = ${value.replace(/\s+/g, ' ').trim()}`;
		})
	);
/** The status badge is the span directly after the `<h1>` (`invoice-detail-header.tsx:92-98`,
 *  `invoice-standing.tsx:204-217`): run 1's snapshot shows `heading "Invoice 4021"` then `generic: Paid`. */
const standingBadge = (page: Page) => page.locator('h1 + span');
const primaryButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const menuButton = (page: Page) =>
	page.getByRole('button', { name: filled(T.actions.MENU_LABEL, { number: String(SERVED_NUMBER) }) });
const menuItem = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true });
const openDialog = (page: Page) => page.getByRole('dialog');
const dialogText = async (page: Page) =>
	page
		.locator('[role="dialog"]')
		.innerText()
		.then(flat)
		.catch(() => '(no dialog)');
const toastText = async (page: Page) =>
	page
		.locator('[data-sonner-toaster]')
		.innerText()
		.then(flat)
		.catch(() => '(no toast)');
const fieldInput = (page: Page, label: string) => page.getByLabel(label, { exact: true });
/** `invoice-details.tsx:17-27` maps a problem to its copy and `:280-287` renders the `ul[aria-live="polite"]` list;
 *  sonner's own live region is an `ol`, so this `ul` is the form's. */
const problemsList = (page: Page) => page.locator('ul[aria-live="polite"]');
const problemTexts = async (page: Page) => await regionTexts(page, 'ul[aria-live="polite"] li');

/** Opens the actions menu and waits for its rows (Base UI menus render in a document portal). */
async function openMenu(page: Page) {
	await menuButton(page).click({ timeout: 15_000 });
	await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 10_000 });
}

async function closeMenu(page: Page) {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('menuitem')).toHaveCount(0, { timeout: 10_000 });
}

/** The two date fields print the served day in the host's own numeric format (`core/components/common/date-field.tsx`);
 *  the expectation is built inside the browser from the same host locale the field prints in, so no machine's format
 *  or time zone is pinned. */
const dateFieldValue = async (page: Page, label: string, dayKeyOfField: string) => {
	const shown = await page.evaluate((key) => {
		const [year, month, day] = key.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString(undefined, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	}, dayKeyOfField);
	await expect(fieldInput(page, label)).toHaveValue(shown, { timeout: 15_000 });
	return shown;
};

/** The paper's `dl` pairs: the head facts then the totals, in the order the paper prints them. */
const paperPairs = (paidPart: number | null, leftToPay: number | null) => {
	const rows = [
		`${NEW.details.ISSUE_DATE} = ${dayText(ISSUE_DAY)}`,
		`${NEW.details.DUE_DATE} = ${dayText(DUE_DAY)}`,
		`${NEW.PERIOD} = ${periodText()}`,
		`${NEW.adjustments.SUBTOTAL} = ${money(SUBTOTAL)}`,
		`${filled(NEW.adjustments.DISCOUNT_ROW, { percent: percentText(DISCOUNT_PERCENT) })} = ${MINUS}${money(DISCOUNT_AMOUNT)}`,
		`${filled(NEW.adjustments.TAX_ROW, { percent: percentText(TAX_PERCENT), base: money(TAX_BASE) })} = ${money(TAX_AMOUNT)}`,
		`${NEW.TOTAL} = ${money(TOTAL)}`
	];
	if (typeof paidPart === 'number' && paidPart > 0 && typeof leftToPay === 'number') {
		rows.push(`${T.detail.PAID} = ${MINUS}${money(paidPart)}`, `${T.detail.LEFT_TO_PAY} = ${money(leftToPay)}`);
	}
	// Flattened on this side too: `formatRange` puts U+2009 thin spaces around the range dash (`Period = Nov 6 – 16`),
	// and `totalsPairs` flattens the printed text the same way, so both sides are compared the same way.
	return rows.map(flat);
};

test.describe('lane-c · one invoice page and its edit screen, for a person with the full invoice set', () => {
	test.beforeEach(async () => {
		await mockReset();
	});

	// ---------------------------------------------------------------- 1 · the document of a served, partly paid invoice

	test('1 · a served Sent invoice with a payment on it: heading, badge, client link, due text, the next step, and the paper exactly as printed', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'SENT', alreadyPaid: PAID_PART, amountDue: LEFT_TO_PAY })
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			filled(T.detail.HEADING, { number: String(SERVED_NUMBER) }),
			{ timeout: 25_000 }
		);
		await expect(standingBadge(page)).toHaveText(T.status.SENT);
		await expect(page.getByRole('link', { name: CLIENT_NAME }).first()).toHaveAttribute(
			'href',
			`/clients/${CLIENT_ID}`
		);
		await expect(page.getByText(pluralOf(T.due.IN_DAYS, DUE_IN_DAYS))).toBeVisible();
		await expect(primaryButton(page, T.actions.MARK_PAID)).toBeVisible();
		await expect(primaryButton(page, T.actions.DOWNLOAD)).toBeVisible();
		await expect(menuButton(page)).toBeVisible();

		await expect(contentRegion(page).getByRole('row')).toHaveCount(3);
		await expect(contentRegion(page).getByRole('columnheader')).toHaveText([
			T.detail.COLUMN_DESCRIPTION,
			T.detail.COLUMN_HOURS,
			T.detail.COLUMN_RATE,
			T.detail.COLUMN_AMOUNT
		]);
		await expect(contentRegion(page).getByRole('cell')).toHaveCount(8);
		// Each line's description cell also carries the narrow-screen summary line (`invoice-paper.tsx:138-141`; run 1
		// measured its text as "Fixture line one5.00 h · $100.00"), so the description is pinned on its own element and
		// every figure on its own `role="cell"`.
		await expect(page.getByText(LINE_ONE, { exact: true })).toBeVisible();
		await expect(page.getByText(LINE_TWO, { exact: true })).toBeVisible();
		for (const [hours, rate, amount] of [
			[LINE_ONE_HOURS, LINE_ONE_RATE, LINE_ONE_HOURS * LINE_ONE_RATE],
			[LINE_TWO_HOURS, LINE_TWO_RATE, LINE_TWO_HOURS * LINE_TWO_RATE]
		]) {
			await expect(contentRegion(page).getByRole('cell', { name: hoursCell(hours), exact: true })).toHaveText(
				hoursCell(hours)
			);
			await expect(contentRegion(page).getByRole('cell', { name: money(rate), exact: true })).toHaveText(
				money(rate)
			);
			await expect(contentRegion(page).getByRole('cell', { name: money(amount), exact: true })).toHaveText(
				money(amount)
			);
		}
		await expect
			.poll(async () => await totalsPairs(page), { timeout: 25_000 })
			.toEqual(paperPairs(PAID_PART, LEFT_TO_PAY));
		await expect(page.getByText(SERVED_NOTE).first()).toBeVisible();
		await expect(page.getByText(`${NEW.terms.NOTE}`).first()).toBeVisible();

		report('1 partly paid Sent invoice', {
			url: page.url(),
			document: await documentText(page),
			badge: await standingBadge(page).innerText(),
			rows: await regionTexts(page, 'main [role="row"]'),
			cells: await regionTexts(page, 'main [role="cell"]'),
			pairs: await totalsPairs(page),
			servedCalls: store.shapes(),
			mockInvoiceCalls: (await mock.calls('/api/invoices/')).map((call) => `${call.method} ${call.path}`),
			console: shield.consoleErrors()
		});

		expect(store.shapes(), 'the document sent something other than its one invoice read').toEqual([
			DETAIL_READ_SHAPE
		]);
		expect(await mock.calls('/api/invoices/'), 'the invoice came from the mock, not from this file').toEqual([]);
		expect(consoleFindings(shield), 'the document logged an app error').toEqual([]);
	});

	// ----------------------------------------------------------- 2 · the totals once fully paid, and the menu that has no Edit

	test('2 · a fully paid invoice: the Paid / Left to pay rows, no next step, and a menu without Edit', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'FULLY_PAID', alreadyPaid: TOTAL, amountDue: 0 })
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect.poll(async () => await totalsPairs(page), { timeout: 25_000 }).toEqual(paperPairs(TOTAL, 0));
		await expect(standingBadge(page)).toHaveText(T.status.FULLY_PAID, { timeout: 25_000 });
		// `nextInvoiceActionOf` (`invoice-actions.ts:168-183`) returns null for FULLY_PAID: no primary button.
		await expect(primaryButton(page, T.actions.MARK_PAID)).toHaveCount(0);
		await expect(primaryButton(page, T.actions.SEND)).toHaveCount(0);

		await openMenu(page);
		const items = await regionTexts(page, '[role="menuitem"]');
		// `REVISIONS_BY_STATUS` (`invoice-actions.ts:35-43`): a paid invoice is revised, never edited.
		await expect(page.getByRole('menuitem')).toHaveText([
			T.actions.SEND_AGAIN,
			T.actions.MARK_UNPAID,
			T.replace.ACTION
		]);
		await closeMenu(page);

		report('2 fully paid invoice', {
			pairs: await totalsPairs(page),
			badge: await standingBadge(page).innerText(),
			menuItems: items,
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the paid document logged an app error').toEqual([]);
	});

	// ------------------------------------------------------------- 3 · the totals with nothing paid: no payment rows at all

	test('3 · an unpaid draft: the same totals without any Paid / Left to pay row, and Send as its next step', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'DRAFT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		const pairs = paperPairs(null, null);
		await expect.poll(async () => await totalsPairs(page), { timeout: 25_000 }).toEqual(pairs);
		await expect(standingBadge(page)).toHaveText(T.status.DRAFT, { timeout: 25_000 });
		await expect(primaryButton(page, T.actions.SEND)).toBeVisible();
		await expect(primaryButton(page, T.actions.MARK_PAID)).toHaveCount(0);

		report('3 unpaid draft', {
			pairs: await totalsPairs(page),
			badge: await standingBadge(page).innerText(),
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});
		expect(await totalsPairs(page), 'a payment row appeared on an invoice with nothing paid').toEqual(pairs);
		expect(consoleFindings(shield), 'the draft document logged an app error').toEqual([]);
	});

	// ----------------------------------------------------------------------- 4 · an invoice whose due day has passed

	test('4 · an overdue invoice: the standing badge replaces the status word, and the due line counts the days late', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'SENT', dueDate: instantOf(LATE_DAY) })
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		// `invoiceStandingOf` (`invoice-standing.ts:65-68`) → 'overdue'; `useStandingLabel`
		// (`invoice-standing.tsx:179-181`) prints `invoices.standing.OVERDUE` in place of the status word.
		await expect(standingBadge(page)).toHaveText(T.standing.OVERDUE, { timeout: 25_000 });
		// `InvoiceDueText` (`invoice-due-text.tsx:44-51`): `invoices.due.LATE` with the days behind.
		await expect(page.getByText(pluralOf(T.due.LATE, LATE_BY_DAYS))).toBeVisible();
		await expect(primaryButton(page, T.actions.MARK_PAID)).toBeVisible();

		report('4 overdue invoice', {
			badge: await standingBadge(page).innerText(),
			dueText: await page.getByText(new RegExp(`^${pluralOf(T.due.LATE, LATE_BY_DAYS)}$`)).innerText(),
			pairs: await totalsPairs(page),
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the overdue document logged an app error').toEqual([]);
	});

	// ------------------------------------------------------------------------------------- 5 · sending a draft from the header

	test('5 · Send to the client: the two consequences the dialog states, the prefilled recipient, the two requests, and Sent after', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'DRAFT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(primaryButton(page, T.actions.SEND)).toBeVisible({ timeout: 25_000 });
		await primaryButton(page, T.actions.SEND).click({ timeout: 15_000 });
		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(filled(T.send.TITLE, { number: String(SERVED_NUMBER) }));
		await expect(dialog.getByRole('listitem')).toHaveText([T.send.ATTACHED, T.send.MARKS_SENT]);
		// The recipient is prefilled from the served client (`invoice-action-dialogs.tsx`, `toContact.primaryEmail`).
		await expect(fieldInput(page, T.send.RECIPIENT)).toHaveValue(CLIENT_EMAIL);
		report('5 send dialog', {
			dialog: await dialogText(page),
			recipient: await fieldInput(page, T.send.RECIPIENT).inputValue()
		});

		await primaryButton(page, T.send.CONFIRM).click({ timeout: 15_000 });
		await expect(dialog).toHaveCount(0, { timeout: 25_000 });
		await expect(standingBadge(page)).toHaveText(T.status.SENT, { timeout: 25_000 });
		await expect(
			page.getByText(filled(T.send.SENT, { number: String(SERVED_NUMBER), email: CLIENT_EMAIL })).first()
		).toBeVisible({ timeout: 25_000 });

		report('5 after sending', {
			toast: await toastText(page),
			badge: await standingBadge(page).innerText(),
			servedCalls: store.shapes(),
			storedStatus: store.stored()?.status,
			mockInvoiceCalls: (await mock.calls('/api/invoices/')).map((call) => `${call.method} ${call.path}`),
			console: shield.consoleErrors()
		});

		const emailPath = `/invoices/email/${encodeURIComponent(CLIENT_EMAIL)}`;
		const emails = store.only('PUT', emailPath);
		expect(emails, 'the e-mail was not sent once, or was sent more than once').toHaveLength(1);
		expect(emails[0].query, 'the request line carries no query string').toBe('');
		expect(emails[0].body, 'the request body is the params object, see the header finding').toEqual({
			params: {
				invoiceNumber: SERVED_NUMBER,
				invoiceId: INVOICE_ID,
				isEstimate: false,
				organizationId: ORG_ID,
				tenantId: TENANT_ID
			},
			tenantId: TENANT_ID,
			organizationId: ORG_ID
		});
		// `assertActionOffered` (`use-invoice-mutations.ts:812-827`) reads the invoice plain, and the status change is
		// made under the `updatedAt` that read returned (#5382).
		expect(store.shapeBefore('PUT', emailPath), 'the e-mail was sent without the guard read before it').toBe(
			`GET ${DETAIL_READ_PATH}`
		);
		expect(
			store.shapeBefore('PUT', ACTION_PATH),
			'the status change was made without the guard read before it'
		).toBe(`GET ${DETAIL_READ_PATH}`);
		expect(store.only('PUT', ACTION_PATH)[0].body, 'the status change body').toEqual({
			status: 'SENT',
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			expectedUpdatedAt: SERVED_UPDATED_AT
		});
		expect(store.stored()?.status, 'the served store did not take the status the page shows').toBe('SENT');
		expect(await mock.calls('/api/invoices/'), 'the invoice came from the mock, not from this file').toEqual([]);
		expect(consoleFindings(shield), 'sending logged an app error').toEqual([]);
	});

	// ------------------------------------------------------------------- 6 · marking an invoice paid, then back to unpaid

	test('6 · Mark as paid then Mark as unpaid: each action body under the version the guard read returned, and the standing after each', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(primaryButton(page, T.actions.MARK_PAID)).toBeVisible({ timeout: 25_000 });
		await primaryButton(page, T.actions.MARK_PAID).click({ timeout: 15_000 });
		await expect(standingBadge(page)).toHaveText(T.status.FULLY_PAID, { timeout: 25_000 });
		await expect(
			page.getByText(filled(T.actions.MARKED_PAID, { number: String(SERVED_NUMBER) })).first()
		).toBeVisible({ timeout: 25_000 });

		await openMenu(page);
		await menuItem(page, T.actions.MARK_UNPAID).click({ timeout: 15_000 });
		await expect(page.getByRole('menuitem')).toHaveCount(0, { timeout: 15_000 });
		await expect(standingBadge(page)).toHaveText(T.status.SENT, { timeout: 25_000 });
		await expect(
			page.getByText(filled(T.actions.MARKED_UNPAID, { number: String(SERVED_NUMBER) })).first()
		).toBeVisible({ timeout: 25_000 });

		const actions = store.only('PUT', ACTION_PATH);
		const bodies = actions.map((call) => call.body as Record<string, unknown>);
		report('6 mark paid / unpaid', {
			toasts: await toastText(page),
			servedCalls: store.shapes(),
			actionBodies: bodies,
			stored: {
				status: store.stored()?.status,
				alreadyPaid: store.stored()?.alreadyPaid,
				amountDue: store.stored()?.amountDue
			},
			console: shield.consoleErrors()
		});

		expect(actions, 'an action was sent other than twice').toHaveLength(2);
		expect(bodies[0], 'the paid change').toEqual({
			status: 'FULLY_PAID',
			paid: true,
			amountDue: 0,
			alreadyPaid: TOTAL,
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			expectedUpdatedAt: SERVED_UPDATED_AT
		});
		expect(bodies[1], 'the unpaid change').toEqual({
			status: 'SENT',
			paid: false,
			alreadyPaid: 0,
			amountDue: TOTAL,
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			// The second change is made under the version the first write moved to (`currentPaymentChangeOf` `:841-858`).
			expectedUpdatedAt: expect.any(String)
		});
		expect(bodies[1].expectedUpdatedAt).not.toBe(SERVED_UPDATED_AT);
		// Each change is preceded by a fresh full read, not by the copy the page already had.
		const actionIndexes = store.calls
			.map((call, index) => (call.method === 'PUT' && call.path === ACTION_PATH ? index : -1))
			.filter((index) => index >= 0);
		expect(
			actionIndexes.map((index) => store.shapes()[index - 1]),
			'an action was sent without a fresh full read before it'
		).toEqual([DETAIL_READ_SHAPE, DETAIL_READ_SHAPE]);
		expect(store.stored(), 'the served store is not the unpaid invoice the page shows').toMatchObject({
			status: 'SENT',
			alreadyPaid: 0,
			amountDue: TOTAL
		});
		expect(consoleFindings(shield), 'marking paid/unpaid logged an app error').toEqual([]);
	});

	// --------------------------------------------------------------------------------------------- 7 · voiding an invoice

	test('7 · Void from the menu: the confirm copy, the guarded action body, and where the person is left', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await openMenu(page);
		await menuItem(page, T.actions.VOID).click({ timeout: 15_000 });
		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(filled(T.void.TITLE, { number: String(SERVED_NUMBER) }));
		await expect(dialog.getByRole('listitem')).toHaveText([T.void.STAYS_LISTED, T.void.FINAL]);
		await expect(primaryButton(page, EN.common.CANCEL)).toBeVisible();
		report('7 void dialog', { dialog: await dialogText(page) });

		await primaryButton(page, T.void.CONFIRM).click({ timeout: 15_000 });
		await expect(dialog).toHaveCount(0, { timeout: 25_000 });
		await expect(standingBadge(page)).toHaveText(T.status.VOID, { timeout: 25_000 });
		await expect(page.getByText(filled(T.void.DONE, { number: String(SERVED_NUMBER) })).first()).toBeVisible({
			timeout: 25_000
		});
		// Still on the invoice's own page, and `invoiceMenuActionsOf` (`invoice-actions.ts:60-78`,
		// `REVISIONS_BY_STATUS.VOID` `:35-43`) offers nothing: the menu button is gone, only Download PDF is left.
		await expect(page).toHaveURL(new RegExp(`${INVOICES_PATH}/${INVOICE_ID}$`));
		await expect(menuButton(page)).toHaveCount(0);
		await expect(primaryButton(page, T.actions.DOWNLOAD)).toBeVisible();

		const actions = store.only('PUT', ACTION_PATH);
		report('7 after voiding', {
			toast: await toastText(page),
			badge: await standingBadge(page).innerText(),
			servedCalls: store.shapes(),
			actionBodies: actions.map((call) => call.body),
			storedStatus: store.stored()?.status,
			console: shield.consoleErrors()
		});
		expect(actions, 'the void was not written once').toHaveLength(1);
		expect(actions[0].body, 'the void body states no payment change').toEqual({
			status: 'VOID',
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			expectedUpdatedAt: SERVED_UPDATED_AT
		});
		expect(store.shapeBefore('PUT', ACTION_PATH), 'the void was sent without the guard read before it').toBe(
			`GET ${DETAIL_READ_PATH}`
		);
		expect(store.stored()?.status).toBe('VOID');
		expect(consoleFindings(shield), 'voiding logged an app error').toEqual([]);
	});

	// --------------------------------------------------------------------------------- 8 · voiding an invoice and replacing it

	test('8 · Void and replace: the confirm copy, the same guarded void, and the new invoice the person is left in', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'FULLY_PAID', alreadyPaid: TOTAL, amountDue: 0 })
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await openMenu(page);
		await menuItem(page, T.replace.ACTION).click({ timeout: 15_000 });
		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(filled(T.replace.TITLE, { number: String(SERVED_NUMBER) }));
		await expect(dialog.getByRole('listitem')).toHaveText([
			T.replace.VOIDS,
			filled(T.replace.OPENS, { client: CLIENT_NAME }),
			filled(T.replace.STAYS_VOID, { number: String(SERVED_NUMBER) })
		]);
		report('8 void-and-replace dialog', { dialog: await dialogText(page) });

		await primaryButton(page, T.replace.ACTION).click({ timeout: 15_000 });
		await expect(page).toHaveURL(new RegExp(`/invoices/new\\?replaces=${INVOICE_ID}`), { timeout: 25_000 });

		const actions = store.only('PUT', ACTION_PATH);
		// No console assertion here on purpose: the screen the person lands on re-reads the client's billable time,
		// which this lane's mock cannot serve (`invoices.new.TIME_ERROR_TITLE`); the void itself is what is pinned.
		report('8 after void and replace', {
			url: page.url(),
			servedCalls: store.shapes(),
			actionBodies: actions.map((call) => call.body),
			storedStatus: store.stored()?.status,
			document: await documentText(page),
			console: consoleFindings(shield)
		});
		expect(actions, 'the void was not written once').toHaveLength(1);
		expect(actions[0].body).toEqual({
			status: 'VOID',
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			expectedUpdatedAt: SERVED_UPDATED_AT
		});
		// `voidToReplace` (`use-invoice-mutations.ts:911-927`) reads the whole invoice first: it rebuilds its lines.
		expect(store.shapeBefore('PUT', ACTION_PATH), 'the replace was started without a full read before it').toBe(
			DETAIL_READ_SHAPE
		);
		expect(store.stored()?.status).toBe('VOID');
	});

	// ------------------------------------------------------------------------------------------------- 9 · deleting an invoice

	test('9 · Delete from the menu: the confirm copy, the DELETE query with expectedUpdatedAt, and the list it lands on', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'DRAFT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await openMenu(page);
		await menuItem(page, T.actions.DELETE).click({ timeout: 15_000 });
		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(filled(T.delete.TITLE, { number: String(SERVED_NUMBER) }));
		await expect(dialog.getByRole('listitem')).toHaveText([T.delete.FOR_GOOD, T.delete.NUMBER_FREE]);
		report('9 delete dialog', { dialog: await dialogText(page) });

		await primaryButton(page, T.delete.CONFIRM).click({ timeout: 15_000 });
		await expect(page).toHaveURL(new RegExp(`${INVOICES_PATH}$`), { timeout: 25_000 });
		await expect(page.getByText(filled(T.delete.DONE, { number: String(SERVED_NUMBER) })).first()).toBeVisible({
			timeout: 25_000
		});

		const deletes = store.only('DELETE', DETAIL_READ_PATH);
		report('9 after deleting', {
			url: page.url(),
			toast: await toastText(page),
			servedCalls: store.shapes(),
			stored: store.stored(),
			console: shield.consoleErrors()
		});
		expect(deletes, 'the delete was not sent once').toHaveLength(1);
		expect(deletes[0].query, 'the delete carries the version the guard read returned').toBe(
			`expectedUpdatedAt=${encodeURIComponent(SERVED_UPDATED_AT)}`
		);
		expect(
			store.shapeBefore('DELETE', DETAIL_READ_PATH),
			'the delete was sent without the guard read before it'
		).toBe(`GET ${DETAIL_READ_PATH}`);
		expect(store.stored(), 'the served store still holds the deleted invoice').toBeNull();
		// See the header finding: the client reads the invoice it just deleted once more, and this stub answers 404.
		const readErrors = shield
			.consoleErrors()
			.filter((line) => line.includes(armedReadError('GET', DETAIL_READ_PATH)));
		expect(readErrors.length, 'the re-read of the deleted invoice logged no HTTP error line').toBeGreaterThan(0);
		expect(
			readErrors.every((line) => line.includes('404')),
			`the re-read logged something other than the armed 404: ${JSON.stringify(readErrors)}`
		).toBe(true);
		expect(
			consoleFindings(shield, [armedReadError('GET', DETAIL_READ_PATH)]),
			'deleting logged an unexpected error'
		).toEqual([]);
	});

	// -------------------------------------------------------------------------------------------------- 10 · downloading the PDF

	test('10 · Download PDF: the request the button sends and the file name it suggests (the bytes are never read)', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		const button = primaryButton(page, T.actions.DOWNLOAD);
		await expect(button).toBeVisible({ timeout: 25_000 });
		const [download] = await Promise.all([page.waitForEvent('download'), button.click({ timeout: 15_000 })]);
		const suggested = download.suggestedFilename();
		report('10 download', {
			suggested,
			url: page.url(),
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});
		// `invoicePdfFileNameOf` (`core/lib/utils/invoice-labels.ts`) and `downloadBlob`
		// (`core/lib/utils/dashboard-export.ts:42-51`): the anchor's `download` attribute names the file.
		expect(suggested).toBe(`invoice-${SERVED_NUMBER}.pdf`);
		expect(await download.failure()).toBeNull();
		expect(store.only('GET', `/invoices/download/${INVOICE_ID}`), 'the PDF request was not sent once').toHaveLength(
			1
		);
		expect(consoleFindings(shield), 'downloading logged an app error').toEqual([]);
	});

	// ---------------------------------------------------------------------------------- 11 · a status change refused 409

	test('11 · 409 INVOICE_CHANGED on the status change: what the person is told, and that nothing changed', async ({
		page,
		fixture,
		shield
	}) => {
		const refusal = { status: 409, message: 'INVOICE_CHANGED: the invoice changed since it was read.' };
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }), actionRefusal: refusal });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(primaryButton(page, T.actions.MARK_PAID)).toBeVisible({ timeout: 25_000 });
		await primaryButton(page, T.actions.MARK_PAID).click({ timeout: 15_000 });
		await expect(
			page.getByText(filled(T.actions.CHANGE_FAILED, { number: String(SERVED_NUMBER) })).first()
		).toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(T.actions.CHANGED_MEANWHILE).first()).toBeVisible({ timeout: 25_000 });
		await expect(standingBadge(page)).toHaveText(T.status.SENT, { timeout: 25_000 });

		report('11 refused status change', {
			toast: await toastText(page),
			badge: await standingBadge(page).innerText(),
			servedCalls: store.shapes(),
			stored: { status: store.stored()?.status, alreadyPaid: store.stored()?.alreadyPaid },
			console: shield.consoleErrors()
		});
		// `isChangedMeanwhile` (`use-invoice-mutations.ts:532-539`) → `invoices.actions.CHANGED_MEANWHILE`.
		expect(store.only('PUT', ACTION_PATH), 'the refused action was retried').toHaveLength(1);
		expect(store.stored(), 'the refused change still reached the served store').toMatchObject({
			status: 'SENT',
			alreadyPaid: null
		});
		expect(
			consoleFindings(shield, [armedHttpError('PUT', ACTION_PATH, 409)]),
			'the refusal logged more than itself'
		).toEqual([]);
	});

	// -------------------------------------------------------------------------------------- 12 · a read that answers 404

	test('12 · a 404 read: the not-in-the-workspace state, its one read, and the list its button opens', async ({
		page,
		fixture,
		shield
	}) => {
		const refusal = { status: 404, message: 'Invoice not found' };
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }), readRefusal: refusal });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(page.getByText(T.detail.NOT_FOUND_TITLE).first()).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText(T.detail.NOT_FOUND_MESSAGE).first()).toBeVisible();
		const allInvoices = primaryButton(page, T.detail.ALL_INVOICES);
		await expect(allInvoices).toBeVisible({ timeout: 30_000 });
		// Measured in run 1: the missing state replaces the whole document, header `<h1>` included
		// (`page-component.tsx:83-104` renders `AnimatedEmptyState` instead of the header + paper).
		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
		const readsAtState = store.readsOf().length;

		await allInvoices.click({ timeout: 15_000 });
		await expect(page).toHaveURL(new RegExp(`${INVOICES_PATH}$`), { timeout: 25_000 });

		report('12 missing invoice', {
			document: await documentText(page),
			readsAtState: readsAtState,
			afterUrl: page.url(),
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});
		// `isMissingInvoice` (`use-invoices-query.ts:131-137`) makes 404 / 400 terminal — `retriesInvoiceRead`
		// (`:139-144`) refuses them — which is why the state appears at all. The read count is only reported here:
		// a failing read's count is never pinned (common rules).
		const readErrors = shield
			.consoleErrors()
			.filter((line) => line.includes(armedReadError('GET', DETAIL_READ_PATH)));
		expect(readErrors.length, 'the 404 read logged no HTTP error line').toBeGreaterThan(0);
		expect(
			readErrors.every((line) => line.includes('404')),
			'the read logged something other than the armed 404'
		).toBe(true);
		expect(
			consoleFindings(shield, [armedReadError('GET', DETAIL_READ_PATH)]),
			'the missing state logged an unexpected error'
		).toEqual([]);
	});

	// --------------------------------------------------------------------------------- 13 · a read that fails, and Try again

	test('13 · a 500 read: the load-error state, and Try again reading the invoice again', async ({
		page,
		fixture,
		shield
	}) => {
		const refusal = { status: 500, message: 'The invoice read failed here.' };
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }), readRefusal: refusal });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}`, { scenario: FULL_SET });

		await expect(page.getByText(T.detail.ERROR_TITLE).first()).toBeVisible({ timeout: 40_000 });
		await expect(page.getByText(T.ERROR_MESSAGE).first()).toBeVisible();
		const tryAgain = primaryButton(page, EN.pages.unauthorized.TRY_AGAIN);
		await expect(tryAgain).toBeVisible({ timeout: 40_000 });
		const document = await documentText(page);
		const readsBefore = store.readsOf().length;

		await tryAgain.click({ timeout: 15_000 });
		await expect.poll(() => store.readsOf().length, { timeout: 30_000 }).toBeGreaterThan(readsBefore);

		report('13 failing read', {
			document,
			readsBefore,
			readsAfterTryAgain: store.readsOf().length,
			servedCalls: store.shapes().map((shape) => shape.slice(0, 60)),
			console: shield.consoleErrors()
		});
		// The counts vary on purpose: `retriesInvoiceRead` retries twice (`use-invoices-query.ts:139-144`), and
		// `page-component.tsx:110-124` re-reads on the button, so only "more reads after Try again" is pinned.
		const readErrors = shield
			.consoleErrors()
			.filter((line) => line.includes(armedReadError('GET', DETAIL_READ_PATH)));
		expect(readErrors.length, 'the failing read logged no HTTP error line').toBeGreaterThan(0);
		expect(
			readErrors.every((line) => line.includes('500')),
			'the read logged something other than the armed 500'
		).toBe(true);
		expect(
			consoleFindings(shield, [armedReadError('GET', DETAIL_READ_PATH)]),
			'the failing read logged an unexpected error'
		).toEqual([]);
	});

	// ------------------------------------------------------------------------------ 14 · the edit form filled from the invoice

	test('14 · /edit: every field holds the served invoice value, and the sheet prints its lines', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			filled(T.edit.TITLE, { number: String(SERVED_NUMBER) }),
			{ timeout: 30_000 }
		);
		await expect(fieldInput(page, NEW.details.NUMBER)).toHaveValue(String(SERVED_NUMBER), { timeout: 30_000 });
		const issueShown = await dateFieldValue(page, NEW.details.ISSUE_DATE, ISSUE_DAY);
		const dueShown = await dateFieldValue(page, NEW.details.DUE_DATE, DUE_DAY);
		await expect(fieldInput(page, NEW.adjustments.DISCOUNT)).toHaveValue(String(DISCOUNT_PERCENT));
		await expect(fieldInput(page, NEW.adjustments.TAX)).toHaveValue(String(TAX_PERCENT));
		await expect(fieldInput(page, NEW.terms.NOTE)).toHaveValue(SERVED_NOTE);
		await expect(fieldInput(page, filled(NEW.DESCRIPTION_OF, { name: LINE_ONE }))).toHaveValue(LINE_ONE);
		await expect(fieldInput(page, filled(NEW.DESCRIPTION_OF, { name: LINE_TWO }))).toHaveValue(LINE_TWO);
		await expect(primaryButton(page, filled(NEW.REMOVE_LINE, { name: LINE_ONE }))).toBeVisible();
		await expect(primaryButton(page, filled(NEW.REMOVE_LINE, { name: LINE_TWO }))).toBeVisible();
		await expect(primaryButton(page, T.edit.SAVE)).toBeVisible();

		// The sheet is the region `invoices.new.SHEET_LABEL`; its rows are the project row then one row per line
		// (`invoices/new/invoice-sheet.tsx:95-118`), and each figure is its own `role="cell"` (run 1's snapshot).
		const sheet = page.getByRole('region', { name: NEW.SHEET_LABEL });
		await expect(sheet.getByRole('row')).toHaveCount(4);
		await expect(sheet.getByRole('columnheader')).toHaveText([
			T.detail.COLUMN_DESCRIPTION,
			T.detail.COLUMN_HOURS,
			T.detail.COLUMN_RATE,
			T.detail.COLUMN_AMOUNT
		]);
		await expect(sheet.getByRole('cell', { name: PROJECT_NAME, exact: true })).toHaveText(PROJECT_NAME);
		const projectFigures = `${hoursCell(LINE_ONE_HOURS + LINE_TWO_HOURS)} · ${money(SUBTOTAL)}`;
		await expect(sheet.getByRole('cell', { name: projectFigures, exact: true })).toHaveText(projectFigures);
		for (const [hours, rate, amount] of [
			[LINE_ONE_HOURS, LINE_ONE_RATE, LINE_ONE_HOURS * LINE_ONE_RATE],
			[LINE_TWO_HOURS, LINE_TWO_RATE, LINE_TWO_HOURS * LINE_TWO_RATE]
		]) {
			await expect(sheet.getByRole('cell', { name: hoursCell(hours), exact: true })).toHaveText(hoursCell(hours));
			const rateCell = filled(NEW.RATE_PER_HOUR, { rate: money(rate) });
			await expect(sheet.getByRole('cell', { name: rateCell, exact: true })).toHaveText(rateCell);
			await expect(sheet.getByRole('cell', { name: money(amount), exact: true })).toHaveText(money(amount));
		}
		await expect
			.poll(() => store.readsOf().some((read) => read.path === '/invoices/pagination'), { timeout: 25_000 })
			.toBe(true);

		report('14 edit form', {
			url: page.url(),
			issueShown,
			dueShown,
			note: await fieldInput(page, NEW.terms.NOTE).inputValue(),
			descriptions: await Promise.all(
				[LINE_ONE, LINE_TWO].map((line) =>
					fieldInput(page, filled(NEW.DESCRIPTION_OF, { name: line })).inputValue()
				)
			),
			rows: await regionTexts(page, 'main [role="row"]'),
			cells: await regionTexts(page, 'main [role="cell"]'),
			servedCalls: store.shapes(),
			mockInvoiceCalls: (await mock.calls('/api/invoices/')).map((call) => `${call.method} ${call.path}`),
			console: shield.consoleErrors()
		});
		expect(
			await mock.calls('/api/invoices/'),
			'the edit form was filled from the mock, not from this file'
		).toEqual([]);
		expect(consoleFindings(shield), 'the edit screen logged an app error').toEqual([]);
	});

	// ------------------------------------------------------------------- 15 · an untouched form: what blocks the save

	test('15 · saving an unchanged invoice: no dialog, no request, and the sentence in the problems list', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		const save = primaryButton(page, T.edit.SAVE).first();
		await expect(save).toBeVisible({ timeout: 30_000 });
		await expect(save).toBeEnabled();
		// Let the read of the client's other invoices finish first (`use-new-invoice.ts:339-343`), so the list is settled.
		await expect
			.poll(() => store.readsOf().some((read) => read.path === '/invoices/pagination'), { timeout: 25_000 })
			.toBe(true);

		await save.click({ timeout: 15_000 });
		await expect.poll(async () => await problemTexts(page), { timeout: 20_000 }).toEqual([T.edit.UNCHANGED]);
		await expect(openDialog(page)).toHaveCount(0);
		await expect(problemsList(page)).toContainText(T.edit.UNCHANGED);

		report('15 unchanged save', {
			problems: await problemTexts(page),
			saveDescribedBy: await save.getAttribute('aria-describedby'),
			writes: store.writesOf().map((call) => `${call.method} ${call.path}`),
			console: shield.consoleErrors()
		});
		expect(store.writesOf(), 'an unchanged form was written anyway').toEqual([]);
		expect(store.stored()?.terms).toBe(termsOf(SERVED_NOTE));
		expect(consoleFindings(shield), 'the unchanged form logged an app error').toEqual([]);
	});

	// ---------------------------------------------------------------------- 16 · an invalid line, as the hook defines it

	test("16 · removing the invoice's only line: the problems list blocks the save, and nothing is written", async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({
				status: 'SENT',
				totalValue: SINGLE_TOTAL,
				invoiceItems: [
					{
						id: `${INVOICE_ID}-line-1`,
						description: LINE_ONE,
						price: LINE_ONE_RATE,
						quantity: LINE_ONE_HOURS,
						totalValue: SINGLE_SUBTOTAL,
						applyTax: true,
						applyDiscount: true,
						projectId: PROJECT_ID,
						project: { id: PROJECT_ID, name: PROJECT_NAME },
						employeeId: EMPLOYEE_ID
					}
				]
			})
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		const remove = primaryButton(page, filled(NEW.REMOVE_LINE, { name: LINE_ONE }));
		await expect(remove).toBeVisible({ timeout: 30_000 });
		await remove.click({ timeout: 15_000 });
		await expect
			.poll(() => store.readsOf().some((read) => read.path === '/invoices/pagination'), { timeout: 25_000 })
			.toBe(true);

		await primaryButton(page, T.edit.SAVE).first().click({ timeout: 15_000 });
		// `use-invoice-edit.ts` reports the empty invoice through `invoices.new.problems.NO_LINES`;
		// `invoice-screen.tsx:97-103` refuses the dialog while the list has anything in it.
		await expect.poll(async () => await problemTexts(page), { timeout: 20_000 }).toEqual([NEW.problems.NO_LINES]);
		await expect(openDialog(page)).toHaveCount(0);

		report('16 no line left', {
			problems: await problemTexts(page),
			writes: store.writesOf().map((call) => `${call.method} ${call.path}`),
			storedDescriptions: store.stored()?.invoiceItems.map((line) => line.description),
			console: shield.consoleErrors()
		});
		expect(store.writesOf(), 'a line-less invoice was saved anyway').toEqual([]);
		expect(store.stored()?.invoiceItems.map((line) => line.description)).toEqual([LINE_ONE]);
		expect(consoleFindings(shield), 'the invalid form logged an app error').toEqual([]);
	});

	// ------------------------------------------------------------------------------ 17 · editing a line and the note, then saving

	test('17 · rewriting a description and the note: the confirm dialog, the PUT …/with-items body, and the list after', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, { invoice: servedInvoice({ status: 'SENT' }) });
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		const lineField = fieldInput(page, filled(NEW.DESCRIPTION_OF, { name: LINE_ONE }));
		await expect(lineField).toHaveValue(LINE_ONE, { timeout: 30_000 });
		await lineField.fill(EDITED_LINE);
		await fieldInput(page, NEW.terms.NOTE).fill(EDITED_NOTE);
		await primaryButton(page, T.edit.SAVE).first().click({ timeout: 15_000 });

		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(filled(T.edit.confirm.TITLE, { number: String(SERVED_NUMBER) }));
		await expect(dialog).toContainText(pluralOf(T.edit.confirm.DESCRIPTIONS, 1));
		await expect(dialog).toContainText(T.edit.confirm.NOTE);
		const dialogBeforeSave = await dialogText(page);

		await primaryButton(page, T.edit.SAVE).last().click({ timeout: 15_000 });
		await expect(page).toHaveURL(new RegExp(`${INVOICES_PATH}$`), { timeout: 30_000 });
		await expect(page.getByText(filled(NEW.SAVED, { number: String(SERVED_NUMBER) })).first()).toBeVisible({
			timeout: 25_000
		});

		const writes = store.writesOf();
		const body = (writes[0]?.body ?? {}) as Record<string, unknown>;
		const { invoiceItems, ...fields } = body;
		const items = Array.isArray(invoiceItems) ? (invoiceItems as Record<string, unknown>[]) : [];
		report('17 saved edit', {
			dialog: dialogBeforeSave,
			editedDescription: EDITED_LINE,
			url: page.url(),
			toast: await toastText(page),
			writeShapes: writes.map((call) => `${call.method} ${call.path}`),
			bodyFields: fields,
			bodyItems: items,
			stored: {
				terms: store.stored()?.terms,
				descriptions: store.stored()?.invoiceItems.map((l) => l.description)
			},
			console: shield.consoleErrors()
		});

		expect(
			writes.map((call) => `${call.method} ${call.path}`),
			'the save sent another request than the with-items write'
		).toEqual([`PUT ${WITH_ITEMS_PATH}`]);
		expect(Object.keys(body).sort(), 'the save sent other fields than these').toEqual(
			[
				'currency',
				'discountType',
				'discountValue',
				'dueDate',
				'expectedUpdatedAt',
				'invoiceDate',
				'invoiceItems',
				'invoiceNumber',
				'invoiceType',
				'organizationContactId',
				'organizationId',
				'status',
				'tax',
				'tax2',
				'tax2Type',
				'taxType',
				'tenantId',
				'terms',
				'toContactId',
				'totalValue'
			].sort()
		);
		expect(fields, 'the fields of the save body').toEqual({
			invoiceNumber: SERVED_NUMBER,
			// The day is written back as that day's bounds **in the organization's zone** — the lane's organization is
			// `timeZone: 'UTC'` (`mock-gauzy-server.mjs:94`), which is what run 1 measured the write to be even though
			// the browser itself ran in Europe/Madrid (UTC+01:00), so the browser's own zone is not what is pinned.
			invoiceDate: `${ISSUE_DAY}T00:00:00.000Z`,
			dueDate: `${DUE_DAY}T23:59:59.999Z`,
			currency: 'USD',
			discountValue: DISCOUNT_PERCENT,
			discountType: 'PERCENT',
			tax: TAX_PERCENT,
			taxType: 'PERCENT',
			tax2: 0,
			tax2Type: 'PERCENT',
			terms: termsOf(EDITED_NOTE),
			totalValue: TOTAL,
			status: 'SENT',
			invoiceType: 'BY_PROJECT_HOURS',
			organizationContactId: CLIENT_ID,
			toContactId: CLIENT_ID,
			organizationId: ORG_ID,
			tenantId: TENANT_ID,
			// `checkInvoiceEdit` (`use-invoice-mutations.ts:688-708`) reads the invoice just before the write and saves
			// under the version that read returned (#5382).
			expectedUpdatedAt: SERVED_UPDATED_AT
		});
		expect(
			items.map((item) => item.description),
			'the lines of the save body'
		).toEqual([EDITED_LINE, LINE_TWO]);
		expect(items.map((item) => item.price)).toEqual([LINE_ONE_RATE, LINE_TWO_RATE]);
		expect(items.map((item) => item.quantity)).toEqual([LINE_ONE_HOURS, LINE_TWO_HOURS]);
		expect(items.map((item) => item.totalValue)).toEqual([
			LINE_ONE_HOURS * LINE_ONE_RATE,
			LINE_TWO_HOURS * LINE_TWO_RATE
		]);
		expect(
			store.shapeBefore('PUT', WITH_ITEMS_PATH),
			'the save was sent without the pre-read it is guarded by'
		).toBe(DETAIL_READ_SHAPE);
		expect(store.stored()?.terms).toBe(termsOf(EDITED_NOTE));
		expect(store.stored()?.invoiceItems.map((line) => line.description)).toEqual([EDITED_LINE, LINE_TWO]);
		expect(consoleFindings(shield), 'the save logged an app error').toEqual([]);
	});

	// ---------------------------------------------------------------------------- 18 · a save refused 409 INVOICE_CHANGED

	test('18 · a save refused 409 INVOICE_CHANGED: what the dialog says, and that the invoice was left as it was', async ({
		page,
		fixture,
		shield
	}) => {
		const refusal = { status: 409, message: 'INVOICE_CHANGED: the invoice changed since it was read.' };
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'SENT' }),
			withItemsRefusal: refusal
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		await fieldInput(page, filled(NEW.DESCRIPTION_OF, { name: LINE_ONE })).fill(EDITED_LINE, { timeout: 30_000 });
		await primaryButton(page, T.edit.SAVE).first().click({ timeout: 15_000 });
		const dialog = openDialog(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await primaryButton(page, T.edit.SAVE).last().click({ timeout: 15_000 });

		// Probe 2 `Q7` measured the refusal inside the dialog (no separate `role="alert"` text), so the dialog's own
		// text is what is pinned; the alert texts are only reported.
		await expect(dialog).toContainText(T.edit.confirm.CHANGED_MEANWHILE, { timeout: 25_000 });
		report('18 refused save', {
			dialog: await dialogText(page),
			alerts: await regionTexts(page, '[role="dialog"] [role="alert"]'),
			servedCalls: store.shapes(),
			stored: {
				terms: store.stored()?.terms,
				descriptions: store.stored()?.invoiceItems.map((l) => l.description)
			},
			console: shield.consoleErrors()
		});

		await primaryButton(page, EN.common.CANCEL).last().click({ timeout: 15_000 });
		await expect(dialog).toHaveCount(0, { timeout: 20_000 });
		await expect(primaryButton(page, T.edit.SAVE).first()).toBeVisible({ timeout: 20_000 });

		expect(store.stored()?.terms, 'the refused save still rewrote the note').toBe(termsOf(SERVED_NOTE));
		expect(store.stored()?.invoiceItems.map((line) => line.description)).toEqual([LINE_ONE, LINE_TWO]);
		expect(store.only('PUT', WITH_ITEMS_PATH), 'the refused save was retried').toHaveLength(1);
		expect(
			consoleFindings(shield, [armedHttpError('PUT', WITH_ITEMS_PATH, 409)]),
			'the refused save logged more than its own HTTP error'
		).toEqual([]);
	});

	// ------------------------------------------------------------------------------------- 19 · an invoice that cannot be edited

	test('19 · /edit of a paid invoice: the locked screen, why, and the list it offers instead of a form', async ({
		page,
		fixture,
		shield
	}) => {
		const store = await serveInvoices(page, {
			invoice: servedInvoice({ status: 'FULLY_PAID', alreadyPaid: TOTAL, amountDue: 0 })
		});
		await signInAndVisit(page, fixture, `${INVOICES_PATH}/${INVOICE_ID}/edit`, { scenario: FULL_SET });

		await expect(
			page.getByText(filled(T.edit.LOCKED_TITLE, { number: String(SERVED_NUMBER) })).first()
		).toBeVisible({
			timeout: 30_000
		});
		await expect(page.getByText(T.edit.LOCKED_PAID).first()).toBeVisible();
		// `edit/page-component.tsx:128-179` over `saved-invoice-states.tsx:81-101`: no form at all.
		await expect(fieldInput(page, NEW.details.NUMBER)).toHaveCount(0);
		await expect(primaryButton(page, T.edit.SAVE)).toHaveCount(0);
		const back = page.getByRole('link', { name: T.edit.BACK_TO_LIST, exact: true });
		await expect(back).toHaveAttribute('href', INVOICES_PATH);

		report('19 locked edit', {
			document: await documentText(page),
			servedCalls: store.shapes(),
			console: shield.consoleErrors()
		});

		// The locked screen reads the invoice and writes nothing: its own reads are taken before the link is followed,
		// because the list it opens reads on its own schedule (the list, and the schedules strip's
		// `/invoice-schedules`, `invoice-schedules-strip.tsx:45`, which a lead run saw land after the URL had moved).
		expect(
			store
				.readsOf()
				.map((read) => read.path)
				.filter((path) => path !== DETAIL_READ_PATH),
			'the locked screen read something other than this invoice'
		).toEqual([]);

		await back.click({ timeout: 15_000 });
		await expect(page).toHaveURL(new RegExp(`${INVOICES_PATH}$`), { timeout: 25_000 });
		await expect
			.poll(() => store.readsOf().some((read) => read.path === '/invoices/pagination'), {
				message: 'the list the link opens reads its invoices',
				timeout: 25_000
			})
			.toBe(true);
		expect(store.writesOf(), 'the locked screen wrote to the invoice').toEqual([]);
		expect(consoleFindings(shield), 'the locked screen logged an app error').toEqual([]);
	});
});
