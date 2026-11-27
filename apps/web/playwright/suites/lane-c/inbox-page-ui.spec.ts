import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What the signed-in person sees and what the browser really sends on **the Inbox** (`/inbox`,
 * `app/[locale]/(main)/inbox/page.tsx` → `core/components/pages/inbox/inbox-page.tsx:147-837`), on lane-c
 * (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `4004`, `playwright/test-servers.ts:40`).
 *
 * ## Which inbox the lane runs (measured first, probe `D:\Coding\.tmp\probe-inbox\probe1.log`)
 *
 * The page runs one of two paths. `enabled = isInboxEnabled()` (`inbox-page.tsx:162`, `core/lib/utils/inbox-enabled.ts:7-10`)
 * is a runtime flag **this lane does not set** (its runtime payload has no `NEXT_PUBLIC_INBOX_ENABLED`, and with the
 * flag off the page renders only `InboxPageSkeleton` and `router.replace('/')` — `inbox-page.tsx:164-166,579`; test 1
 * pins that, probe P1: the mock logged zero `/api/inbox` calls). Tests 2-15 flip the flag browser-side with the shared
 * helper `overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' })` (`playwright/helpers.ts`, the same flip
 * `suites/lane-c/task-views-ui.spec.ts` documents; the lane's server is untouched). Then `useInboxAvailability`
 * (`core/hooks/inbox/use-inbox-availability.ts:67-103`) probes `GET …/inbox/items/counts`: this mock answers every
 * unmatched GET with its catch-all `pagination([])` (`cypress/support/mock-gauzy-server.mjs:895-897`, `pagination` `:9`),
 * a 200 — so **the lane runs the inbox-extension path on the mock origin** (`inboxService` is built on
 * `GAUZY_API_BASE_SERVER_URL.value` = `NEXT_PUBLIC_GAUZY_API_SERVER_URL` = `http://127.0.0.1:4002`,
 * `core/services/client/api/inbox/inbox.service.ts:71`, `core/constants/config/constants.tsx:229-231`; probe P2 mock log:
 * `GET /api/inbox/items/counts? → 200` ×2 and `GET /api/inbox/items?tab=all&limit=40 → 200`). Test 15 arms that probe
 * with a 404 (`ApiErrorService.isEndpointUnavailable()` accepts 404/405/501, `core/services/client/api-error.service.ts:253-255`,
 * `use-inbox-availability.ts:20-24`) and measures the bell-only path the same mock already serves for `/api/employee-notification`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** NextAuth, the shell and its reads, the mock's `/api/user/me`; the mock's own answers to `/api/inbox/*`
 * (its catch-all) are what test 2 measures. Test 15's bell reads could ride the mock's own `employee-notification`
 * handlers (`mock-gauzy-server.mjs:727-745`) but are stubbed here too, so their queries and bodies are pinned exactly.
 * **Served by this file:** everything else the page reads and writes, through `page.route` on the mock origin (the
 * pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:261-345` and `suites/lane-c/task-views-ui.spec.ts`): a
 * store-backed stand-in for `/api/inbox/*` (extension) and `/api/employee-notification` (bell) whose list answer is
 * always the current store — a write changes what the next read answers — and a refused write changes nothing. Every
 * answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204) because the page is on
 * `localhost:3033` and the API on `127.0.0.1:4002`. `route.fetch()` is never called, so `mock.calls('/api/inbox')`
 * stays empty in every stubbed test — the witness that the page acted on this file.
 *
 * **The store's own semantics** (this file defines them; the platform's are its own): a tab partitions the store —
 * `all` excludes archived, done and future-snoozed items; `snoozed`/`done`/`archived` hold their own; `unread=true`
 * narrows further; `q` matches title or body case-insensitively; newest first, `nextCursor: null`; `counts.unread` =
 * items not read and not archived.
 *
 * ## Where the numbers came from
 *
 * Probe `D:\Coding\.tmp\probe-inbox\probe1.log` (P1-P5) and `probe2.log` (P6-P12) on 2026-11-27, plus this file's own
 * `[lane-c inbox] MEASURE` lines from its lane runs. Every value asserted below is a value those runs printed. Two
 * consecutive whole-file runs back the green claim (log names in the status file `/d/Coding/.tmp/lane-c-inbox-status.md`).
 *
 * ## Measured notes — all untagged. The deep-link test's race (an entry opened from `?item=` while the workspace
 * scope has not arrived, then let go) is a measured note too: the comment it was checked against only promises the read.
 *
 * - The Unread tab's accessible name carries the unread count when it is > 0 — with six unread items the tab is
 *   "Unread 6" in the accessibility tree ("Unread6" as raw textContent) (`inbox-page.tsx:557-565` adds `count` to the
 *   'unread' item; both spellings were measured the hard way: exact 'Unread' and exact 'Unread6' each found nothing).
 * - The snooze menu items' accessible names carry the formatted wake-up time — "Tomorrow Sat 9:00 AM" — so they are
 *   matched by label only (`snooze-menu.tsx:48-56`, measured aria snapshot).
 * - A refused HTTP call reaches the console as `[ERROR] [HttpClient] HTTP Error: <verb> <path relative to the API
 *   origin> <status> …` — e.g. `GET /inbox/items?tab=all&limit=40 500`, no origin, no `/api` (line shaped by
 *   `core/services/logs/logger-adapter.service.ts`; measured text; the armed-refusal excusals in the refusal and
 *   bell tests match on exactly that).
 * - The type tabs (Mentions, Assigned) and the source filter send **no server parameter** — `queryOfSelection`
 *   states only `tab`, `unread` and `q` (`core/hooks/inbox/use-inbox-items.ts:25-31`) and `matchesInboxFilter`
 *   narrows the loaded page on the client (`core/lib/utils/inbox-entry.ts:404-421`); the hook says so itself
 *   (`use-inbox-items.ts:42-43` "the type (mentions, assigned) and source filters narrow each page on the client"),
 *   so clicking them re-renders without a new read (probe P6). The `source` parameter `inboxService.list` supports
 *   (`inbox.service.ts:29`) is never sent by this page.
 * - A row's sender name is read off the platform's English title by its action word: ` Mentioned `, ` Assigned `,
 *   ` Commented ` … are matched capitalized, ` published `, ` sent `, ` replied ` lowercase
 *   (`core/lib/utils/notification-inbox.ts:58-66`). A verb in neither case list renders `notifications.SOMEONE`
 *   ("Someone") instead — measured twice: lowercase ` Mentioned ` (probe P3) and capital `Sent` (interim run of this
 *   file) both printed "Someone". The served titles here use the platform's own case per verb.
 * - A decision row prints its raw title twice — the sentence (`inbox-row.tsx:62` returns `entry.rawTitle` when the
 *   kind is not a known notification type) and the subject line (`inbox-row.tsx:140` falls back to `rawTitle` when
 *   `entry.type` is null).
 * - `?tab=mentions` etc. are written by `router.replace` (`inbox-page.tsx:175-190`): the URL changes asynchronously,
 *   so every tab assertion here polls `page.url()`.
 * - Sonner toasts stack faster than their countdown: right after two actions several toasts (each with its own
 *   `Undo`) are open at once — every Undo click here is scoped to its own `[data-sonner-toast]` (probe P5 hit a
 *   strict-mode violation with three).
 * - On the bell-only path the More menu (and with it the Snoozed/Done/Archived tabs), the search field, snooze and
 *   done are not rendered at all (`inbox-page.tsx:636-666,676-698`, `inbox-row.tsx:232-249` `canTriage`), and
 *   `?item=` deep links are extension-only (`inbox-page.tsx:518 if (!usesExtension) return;`). `legacyActions.unarchive`
 *   (`core/hooks/notifications/use-notification-inbox.ts:245-250`) has no way to be reached from the bell UI:
 *   `fromNotificationEntry` pins every bell entry `isArchived: false` (`inbox-entry.ts:367`) and the Archived tab
 *   is unreachable — an unarchive gap, not a defect the app states otherwise.
 * - Not covered here (each pinned elsewhere or left as a gap): the signed-out gate (`lane-b/session-routing.spec.ts`),
 *   API-level probes of `/api/inbox/...` (`lane-b/forward-refusals.spec.ts`, `lane-c/session-guard.spec.ts`,
 *   `lane-b/path-segment-sweep.spec.ts`), the timer-reminder and meeting panes (`inbox-detail.tsx:81-92,152-153`,
 *   unit-pinned by `inbox-detail.test.tsx:82-214`), the task drawer an entry with a `taskId` opens (`inbox-page.tsx:347-349`
 *   — served items here carry none, so no drawer is driven), chat-message targets (the lane has no chat pages,
 *   `inbox-entry.ts:121-123` — such rows show `inbox.DETAIL.NO_TARGET` instead), pagination beyond the first page
 *   (the store always answers `nextCursor: null`, so `inbox.LOAD_MORE` never renders), and the web-push/alerts hooks.
 */

const INBOX_PATH = '/inbox';
const INBOX_API = '/api/inbox';
const BELL_API = '/api/employee-notification';

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	inbox: Record<string, string> & {
		FILTERS: Record<string, string>;
		SOURCES: Record<string, string>;
		ACTIONS: Record<string, string>;
		SNOOZE: Record<string, string>;
		TOASTS: Record<string, string>;
		EMPTY: Record<string, string>;
		DECISION: Record<string, string>;
		DETAIL: Record<string, string>;
	};
	notifications: {
		GROUPS: Record<string, string>;
		MARK_READ: string;
		MARK_UNREAD: string;
		ARCHIVE: string;
		SOMEONE: string;
		SETTINGS: string;
	};
};
const T = EN.inbox;

/** `inbox.UNREAD_COUNT` / `inbox.SELECTED` are plural messages; the rendered form for one number. */
const unreadText = (count: number) => (count === 0 ? 'All read' : `${count} unread`);
const selectedText = (count: number) => `${count} selected`;

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c inbox] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (text: string) => text.replace(/\s+/g, ' ').trim();

/** A served time relative to now; nothing here pins a date (`inbox-page.tsx:213` groups by the render's `now`). */
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const hoursAhead = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

/**
 * `snoozeUntil` (`core/lib/utils/inbox-entry.ts:440-459`) recomputed in Node — the same machine and zone the browser
 * runs in (probe P5 read `Europe/Madrid` from the page and the sent value matched this computation's ISO string).
 */
const snoozeFormula = {
	laterToday(now: Date): Date {
		const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
		if (later.getDate() !== now.getDate() || later.getHours() >= 20) {
			const tomorrow = new Date(now);
			tomorrow.setDate(now.getDate() + 1);
			tomorrow.setHours(9, 0, 0, 0);
			return tomorrow;
		}
		return later;
	},
	tomorrow(now: Date): Date {
		const tomorrow = new Date(now);
		tomorrow.setDate(now.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0);
		return tomorrow;
	},
	nextWeek(now: Date): Date {
		const monday = new Date(now);
		monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
		monday.setHours(9, 0, 0, 0);
		return monday;
	}
};

// ------------------------------------------------------------------------------------------- served store ----

type ServedCall = { method: string; path: string; search: string; body: string | null };
type Refusal = { status: number; message: string };

type ServedRecipient = {
	isRead: boolean;
	readAt?: string | null;
	isArchived?: boolean | null;
	archivedAt?: string | null;
	snoozedUntil?: string | null;
	doneAt?: string | null;
	isDone?: boolean | null;
};

/** An `IInboxItem` (`core/types/interfaces/common/inbox-item.ts:54-80`) as this file serves it. */
type ServedItem = {
	id: string;
	kind: string;
	source: string;
	status: string;
	title: string;
	body?: string | null;
	entity?: string | null;
	entityId?: string | null;
	taskId?: string | null;
	externalSource?: string | null;
	metadata?: Record<string, unknown> | null;
	createdAt: string;
	recipient: ServedRecipient | null;
	options?: Array<{ id: string; label: string; description?: string; recommended?: boolean }> | null;
	requireReason?: boolean | null;
	response?: { text?: string | null; optionId?: string | null; answeredAt?: string | null } | null;
};

/** An `IEmployeeNotification` the bell path reads (`core/types/interfaces/common/employee-notification.ts`). */
type ServedNotification = {
	id: string;
	title: string;
	type?: string | null;
	entity?: string | null;
	entityId?: string | null;
	createdAt: string;
	isRead?: boolean | null;
	readAt?: string | null;
	isArchived?: boolean | null;
	archivedAt?: string | null;
	sentByEmployee?: { fullName?: string | null } | null;
};

type InboxScript = {
	items: ServedItem[];
	/** Answer every `GET /inbox/items/counts` with this status (404 → the bell-only path). */
	countsRefusal?: number;
	/** Answer every list read with this status until the field is cleared mid-test. */
	listRefusal?: Refusal;
	/** Answer every `PATCH …/state` with this status until cleared. */
	stateRefusal?: Refusal;
	/** Items served only on `GET /inbox/items/<id>` (a deep link outside the loaded page). */
	singleItems?: ServedItem[];
};

type InboxHarness = {
	calls: ServedCall[];
	items: () => ServedItem[];
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	callsSince: (from: number) => ServedCall[];
	/** Mutable: arm or disarm a refusal mid-test. */
	script: InboxScript;
	/** The `tenantId`/`organizationId` pair `api.service.ts` adds to every state PATCH body. */
	scopeIds: () => { tenantId: string; organizationId: string };
	setScopeIds: (ids: { tenantId: string; organizationId: string }) => void;
};

const isArchivedItem = (item: ServedItem) => (item.recipient ?? {}).isArchived === true;
const isDoneItem = (item: ServedItem) => {
	const r: Partial<ServedRecipient> = item.recipient ?? {};
	return r.isDone === true || !!r.doneAt;
};
const isSnoozedItem = (item: ServedItem, now: Date) => {
	const until = (item.recipient ?? {}).snoozedUntil;
	return !!until && new Date(until).getTime() > now.getTime();
};
const isUnreadItem = (item: ServedItem) =>
	(item.recipient ?? { isRead: false }).isRead !== true && !isArchivedItem(item);

/**
 * This file's stand-in for the platform inbox extension on the mock origin — the origin the browser calls (header).
 * The list answer is always the current store, so a write changes what the next read answers; a refused write
 * changes nothing.
 */
async function serveInbox(page: Page, script: InboxScript): Promise<InboxHarness> {
	const store: ServedItem[] = script.items.map((item) => ({
		...item,
		recipient: { ...(item.recipient ?? { isRead: false }) }
	}));
	const calls: ServedCall[] = [];
	const scope = { tenantId: 'scope-t', organizationId: 'scope-o' };

	await page.route(
		(url) => url.origin === new URL(MOCK_ORIGIN).origin && url.pathname.startsWith(INBOX_API),
		(route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const path = url.pathname;
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method, path, search: url.search, body: request.postData() });
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});
			const refuse = (refusal: Refusal) =>
				answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
			const idBetween = (prefix: string, suffix: string) =>
				path.startsWith(`${prefix}/`) && path.endsWith(suffix)
					? decodeURIComponent(path.slice(prefix.length + 1, path.length - suffix.length))
					: null;

			if (path === `${INBOX_API}/items` && method === 'GET') {
				if (script.listRefusal) return refuse(script.listRefusal);
				const now = new Date();
				const tab = url.searchParams.get('tab') ?? 'all';
				let items = store.filter((item) => {
					if (tab === 'archived') return isArchivedItem(item);
					if (isArchivedItem(item)) return false;
					if (tab === 'snoozed') return isSnoozedItem(item, now);
					if (tab === 'done') return isDoneItem(item);
					if (isDoneItem(item) || isSnoozedItem(item, now)) return false;
					return true;
				});
				if (url.searchParams.get('unread') === 'true') items = items.filter(isUnreadItem);
				const q = (url.searchParams.get('q') ?? '').toLowerCase();
				if (q) items = items.filter((item) => `${item.title} ${item.body ?? ''}`.toLowerCase().includes(q));
				items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				return answer(200, { items, nextCursor: null });
			}

			if (path === `${INBOX_API}/items/counts` && method === 'GET') {
				if (script.countsRefusal !== undefined)
					return answer(script.countsRefusal, {
						statusCode: script.countsRefusal,
						message: 'No inbox extension here'
					});
				return answer(200, { unread: store.filter(isUnreadItem).length, decisionsOpen: 0 });
			}

			const stateId = idBetween(`${INBOX_API}/items`, '/state');
			if (stateId !== null && method === 'PATCH') {
				if (script.stateRefusal) return refuse(script.stateRefusal);
				// a deep-linked item lives in `singleItems`; its state writes must answer too (measured: a store-only
				// lookup 404'd the deep link's read-write and left an HttpClient error line)
				const item =
					store.find((candidate) => candidate.id === stateId) ??
					(script.singleItems ?? []).find((candidate) => candidate.id === stateId);
				if (!item) return answer(404, { statusCode: 404, message: 'this store has no such item' });
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				const recipient: ServedRecipient = { isRead: false, ...(item.recipient ?? {}) };
				if (typeof body.isRead === 'boolean') {
					recipient.isRead = body.isRead;
					recipient.readAt = body.isRead ? new Date().toISOString() : null;
				}
				if (typeof body.isArchived === 'boolean') {
					recipient.isArchived = body.isArchived;
					recipient.archivedAt = body.isArchived ? new Date().toISOString() : null;
				}
				if ('snoozedUntil' in body) recipient.snoozedUntil = (body.snoozedUntil as string | null) ?? null;
				if (typeof body.isDone === 'boolean') {
					recipient.isDone = body.isDone;
					recipient.doneAt = body.isDone ? new Date().toISOString() : null;
				}
				item.recipient = recipient;
				return answer(200, item);
			}

			const itemId =
				path.startsWith(`${INBOX_API}/items/`) &&
				!path.endsWith('/state') &&
				!path.endsWith('/reply') &&
				method === 'GET'
					? decodeURIComponent(path.slice(INBOX_API.length + 7))
					: null;
			if (itemId !== null) {
				const item =
					store.find((candidate) => candidate.id === itemId) ??
					(script.singleItems ?? []).find((candidate) => candidate.id === itemId);
				if (!item) return answer(404, { statusCode: 404, message: 'this store has no such item' });
				return answer(200, item);
			}

			if (path === `${INBOX_API}/items/mark-all-read` && method === 'POST') {
				const body = JSON.parse(String(request.postData() ?? '{}')) as { tab?: string; q?: string };
				const q = (body.q ?? '').toLowerCase();
				let updated = 0;
				for (const item of store) {
					if (!isUnreadItem(item)) continue;
					if (body.tab && body.tab !== 'all') continue;
					if (q && !`${item.title} ${item.body ?? ''}`.toLowerCase().includes(q)) continue;
					item.recipient = {
						...(item.recipient ?? { isRead: false }),
						isRead: true,
						readAt: new Date().toISOString()
					};
					updated += 1;
				}
				return answer(200, { updated });
			}

			if (path.startsWith(`${INBOX_API}/items/`) && path.endsWith('/reply') && method === 'POST') {
				const id = decodeURIComponent(path.slice(INBOX_API.length + 7, -'/reply'.length));
				const item = store.find((candidate) => candidate.id === id);
				if (!item) return answer(404, { statusCode: 404, message: 'this store has no such item' });
				const body = JSON.parse(String(request.postData() ?? '{}')) as { text?: string; optionId?: string };
				item.status = 'ANSWERED';
				item.response = {
					text: body.text ?? null,
					optionId: body.optionId ?? null,
					answeredAt: new Date().toISOString()
				};
				return answer(200, item);
			}

			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		calls,
		items: () => store.map((item) => ({ ...item, recipient: { isRead: false, ...(item.recipient ?? {}) } })),
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		callsSince: (from) => calls.slice(from),
		script,
		scopeIds: () => ({ ...scope }),
		setScopeIds: (ids) => {
			scope.tenantId = ids.tenantId;
			scope.organizationId = ids.organizationId;
		}
	};
}

type BellHarness = {
	calls: ServedCall[];
	notifications: () => ServedNotification[];
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	callsSince: (from: number) => ServedCall[];
};

/** The bell (`/api/employee-notification`) as this file serves it, on the same mock origin. */
async function serveBell(page: Page, notifications: ServedNotification[]): Promise<BellHarness> {
	const store: ServedNotification[] = notifications.map((n) => ({ ...n }));
	const calls: ServedCall[] = [];

	await page.route(
		// `=== BELL_API` or `BELL_API + '/'` only: `/api/employee-notification-setting` is a different route and must
		// reach the mock itself (measured: a `startsWith` matcher answered it 599 and filled the console with FATAL lines).
		(url) =>
			url.origin === new URL(MOCK_ORIGIN).origin &&
			(url.pathname === BELL_API || url.pathname.startsWith(`${BELL_API}/`)),
		(route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const path = url.pathname;
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method, path, search: url.search, body: request.postData() });
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});

			if (path === BELL_API && method === 'GET') {
				const unreadOnly = url.searchParams.get('where[isRead]') === 'false';
				const items = store.filter((n) => n.isArchived !== true && (!unreadOnly || n.isRead !== true));
				const sorted = [...items].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				const take = Number(url.searchParams.get('take') ?? '50');
				return answer(200, { items: sorted.slice(0, take), total: sorted.length });
			}
			if (path === `${BELL_API}/mark-all-read` && method === 'PUT') {
				for (const n of store) {
					n.isRead = true;
					n.readAt = n.readAt ?? new Date().toISOString();
				}
				return answer(200, { updated: store.length });
			}
			const id = path.startsWith(`${BELL_API}/`) ? decodeURIComponent(path.slice(BELL_API.length + 1)) : null;
			if (id && method === 'PUT') {
				const n = store.find((candidate) => candidate.id === id);
				if (!n) return answer(404, { statusCode: 404, message: 'this store has no such notification' });
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				for (const field of ['isRead', 'readAt', 'isArchived', 'archivedAt'] as const) {
					if (field in body) (n as Record<string, unknown>)[field] = body[field];
				}
				return answer(200, n);
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		calls,
		notifications: () => store.map((n) => ({ ...n })),
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		callsSince: (from) => calls.slice(from)
	};
}

/** A platform-notification inbox item of the given `metadata.notificationType` (`inbox-entry.ts:267-268`). */
function notice(id: string, overrides: Partial<ServedItem> & { type?: string }): ServedItem {
	const { type, metadata: extraMetadata, ...rest } = overrides;
	const metadata = { ...(type ? { notificationType: type } : {}), ...(extraMetadata ?? {}) };
	return {
		id,
		kind: 'NOTIFICATION',
		source: 'GAUZY',
		status: 'OPEN',
		title: `Probe item ${id}`,
		body: null,
		entity: null,
		entityId: null,
		taskId: null,
		externalSource: 'gauzy-notification',
		createdAt: hoursAgo(1),
		recipient: { isRead: false },
		...rest,
		metadata
	};
}

/** The served list every extension-path test opens with (names use the platform's capitalized title verbs). */
const servedItems = (): ServedItem[] => [
	notice('probe-mention', {
		type: 'Mention',
		title: 'Ana Mentioned you in "Probe mention subject"',
		createdAt: hoursAgo(1)
	}),
	notice('probe-message', {
		type: 'Message',
		title: 'Dana sent you a message in #general: Probe message text', // lowercase ' sent ' is the platform's list word (`notification-inbox.ts:65`); capital 'Sent' printed 'Someone' (measured)
		entity: 'ChatMessage',
		entityId: 'probe-chat-1',
		createdAt: hoursAgo(2)
	}),
	notice('probe-question', {
		kind: 'QUESTION',
		source: 'SYSTEM',
		externalSource: null,
		title: 'Will you take the Friday review?',
		requireReason: true,
		options: [
			{ id: 'yes', label: 'Yes', recommended: true },
			{ id: 'no', label: 'No' }
		],
		createdAt: hoursAgo(3)
	}),
	notice('probe-broadcast', {
		type: 'Broadcast',
		title: 'Eve published an announcement "Probe announcement"',
		recipient: { isRead: false, snoozedUntil: hoursAhead(5) },
		createdAt: hoursAgo(4)
	}),
	notice('probe-assignment', {
		type: 'Assignment',
		title: 'Ben Assigned you "Probe task title"',
		createdAt: hoursAgo(25)
	}),
	notice('probe-comment', {
		type: 'Comment',
		title: 'Cleo Commented on "Probe comment subject"',
		entity: 'Comment',
		entityId: 'probe-comment-1',
		createdAt: hoursAgo(50)
	}),
	notice('probe-payment', {
		type: 'Payment',
		title: 'A payment was recorded for you',
		recipient: { isRead: true, isArchived: true },
		createdAt: hoursAgo(50)
	})
];

// --------------------------------------------------------------------------------------------- selectors ----

const rowButton = (page: Page, id: string) => page.locator(`[data-inbox-row="${id}"]`); // `inbox-row.tsx:142,172-177`
const rowWrap = (page: Page, id: string) => rowButton(page, id).locator('..');
const rowIds = async (page: Page) =>
	await page.locator('[data-inbox-row]').evaluateAll((n) => n.map((b) => b.getAttribute('data-inbox-row')));
const rowText = async (page: Page, id: string) => flat(await rowWrap(page, id).innerText());
const groupSection = (page: Page, name: string) => page.locator(`section[aria-label="${name}"]`); // `inbox-page.tsx:782`
const aside = (page: Page) => page.locator('aside'); // the pane, `inbox-page.tsx:833`
const badge = (page: Page) => page.locator('span', { hasText: /^(All read|\d+ unread)$/ }).first(); // `inbox-page.tsx:608-615`
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' }); // dev failure toasts carry "Copy details"
const toastWith = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const barButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** The Unread tab's accessible name carries the count with a space: "Unread 6" (measured aria snapshot; the
 *  tab's textContent is "Unread6" — probe P6). */
const unreadTab = (count: number) => (count > 0 ? `${T.FILTERS.UNREAD} ${count}` : T.FILTERS.UNREAD);
const rowActionButton = (page: Page, id: string, name: string) =>
	rowWrap(page, id).getByRole('button', { name, exact: true });

/** Hover the row so its action buttons stop being opacity-0 (`inbox-row.tsx:212`), then click one. */
async function rowAction(page: Page, id: string, name: string) {
	await rowWrap(page, id).hover();
	await rowActionButton(page, id, name).click({ timeout: 15_000 });
}

const parseBody = (call: ServedCall | undefined) => JSON.parse(String(call?.body ?? '{}')) as Record<string, unknown>;

/** The console noise this file excuses: only the HTTP error lines of refusals it armed, plus known shell noise. */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** One refusal this file armed: a console line is excused only when it names the path *and* the status. */
type Armed = { verb: string; pathFragment: string; status: number };
const armed = (line: string, armedList: Armed[]) =>
	armedList.some((a) => line.includes(`HTTP Error: ${a.verb} ${a.pathFragment}`) && line.includes(String(a.status)));

const consoleFindings = (shield: Shield, armedList: Armed[]) =>
	shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE) && !armed(line, armedList));

/** Reads recorded at once are compared as sets: the order is a race, not a fact (`brief-common`, chat lesson). */
const sortedReads = (calls: ServedCall[]) =>
	calls
		.filter((c) => c.method === 'GET')
		.map((c) => `${c.method} ${c.path}${c.search}`)
		.sort();
const writeCalls = (harness: { calls: ServedCall[] }, pathFragment: string, bodyFragment: string) =>
	harness.calls.filter(
		(c) => c.method !== 'GET' && c.path.includes(pathFragment) && String(c.body).includes(bodyFragment)
	);

/** Open the page with the inbox-extension switch on and this file's store standing behind the mock origin. */
async function openInbox(page: Page, fixture: Parameters<typeof signInAndVisit>[1]) {
	await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });
	await signInAndVisit(page, fixture, INBOX_PATH);
}

test.describe('lane-c inbox', () => {
	test('as the lane serves it: the switch is off, the page shows the skeleton and sends no inbox read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, INBOX_PATH);
		// `inbox-page.tsx:579` renders `InboxPageSkeleton` while `enabled` is false: no title, no rows, no tablist.
		await expect(page.getByRole('heading', { name: T.TITLE, exact: true })).toHaveCount(0);
		await expect(page.locator('[data-inbox-row]')).toHaveCount(0);
		await expect(page.getByRole('tab')).toHaveCount(0);
		// `useInboxAvailability(enabled)` and the queries never start with the flag off (`inbox-page.tsx:168,193-195`).
		const inboxCalls = (await mock.requests()).filter((r) => r.path.startsWith(INBOX_API));
		expect(inboxCalls).toEqual([]);
		report('flag-off', { url: page.url(), body: flat(await page.locator('body').innerText()).slice(0, 200) });
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('with the switch on the lane runs the inbox extension: the mock answers its own probe', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });
		await signInAndVisit(page, fixture, INBOX_PATH);
		await expect(page.getByRole('heading', { name: T.TITLE, exact: true })).toBeVisible({ timeout: 30_000 });
		// The mock catch-all answers the counts probe with a 200 → 'available' (`use-inbox-availability.ts:36-38`).
		await expect
			.poll(async () => (await mock.requests()).filter((r) => r.path === `${INBOX_API}/items/counts`).length, {
				timeout: 30_000
			})
			.toBeGreaterThan(0);
		const inboxLog = (await mock.requests()).filter((r) => r.path.startsWith(INBOX_API));
		expect(
			inboxLog.some((r) => r.path === `${INBOX_API}/items` && r.query === 'tab=all&limit=40' && r.status === 200)
		).toBe(true);
		expect(inboxLog.every((r) => r.status === 200)).toBe(true);
		// Empty All tab: `inbox-page.tsx:775-779` + `EMPTY_KEYS.all`.
		await expect(page.getByText(T.EMPTY.ALL_TITLE, { exact: true })).toBeVisible();
		await expect(page.getByText(T.EMPTY.ALL_TEXT, { exact: true })).toBeVisible();
		await expect(badge(page)).toHaveText(unreadText(0));
		await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
		await expect(page.getByRole('tab', { name: T.FILTERS.MENTIONS, exact: true })).toBeVisible();
		await expect(page.getByRole('tab', { name: T.FILTERS.ASSIGNED, exact: true })).toBeVisible();
		await expect(barButton(page, T.FILTERS.MORE)).toBeVisible();
		await expect(barButton(page, T.SOURCES.LABEL)).toBeVisible();
		await expect(page.getByLabel(T.SEARCH)).toBeVisible();
		await expect(appToasts(page)).toHaveCount(0);
		report('extension-path', { inboxLog: inboxLog.map((r) => `${r.method} ${r.path}?${r.query} → ${r.status}`) });
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('the page as printed: title, tabs, day groups and each row; the reads it sent', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole('heading', { name: T.TITLE, exact: true })).toBeVisible();
		await expect(badge(page)).toHaveText(unreadText(6));
		await expect(page.getByRole('tab', { name: unreadTab(6), exact: true })).toBeVisible(); // "Unread 6" — measured aria name
		for (const group of [
			EN.notifications.GROUPS.TODAY,
			EN.notifications.GROUPS.YESTERDAY,
			EN.notifications.GROUPS.EARLIER
		]) {
			await expect(groupSection(page, group)).toBeVisible();
		}
		await expect(groupSection(page, EN.notifications.GROUPS.TODAY).locator('[data-inbox-row]')).toHaveCount(3);
		await expect(groupSection(page, EN.notifications.GROUPS.YESTERDAY).locator('[data-inbox-row]')).toHaveCount(1);
		await expect(groupSection(page, EN.notifications.GROUPS.EARLIER).locator('[data-inbox-row]')).toHaveCount(1);
		report('rows', {
			mention: await rowText(page, 'probe-mention'),
			message: await rowText(page, 'probe-message'),
			question: await rowText(page, 'probe-question'),
			assignment: await rowText(page, 'probe-assignment'),
			comment: await rowText(page, 'probe-comment'),
			reads: [...new Set(sortedReads(harness.reads()))]
		});
		// Each row exactly as printed (measured verbatim): avatar initials, the event sentence from
		// `notifications.EVENTS.*`, the age, then the quoted subject; a decision row prints its title twice plus the chip.
		expect(await rowText(page, 'probe-mention')).toBe('A Ana mentioned you 1h Probe mention subject');
		expect(await rowText(page, 'probe-message')).toBe('D Dana sent you a message 2h #general Probe message text');
		expect(await rowText(page, 'probe-question')).toBe(
			'Will you take the Friday review? 3h Will you take the Friday review? Your answer'
		);
		expect(await rowText(page, 'probe-assignment')).toBe('B Ben assigned you 1d Probe task title');
		expect(await rowText(page, 'probe-comment')).toBe('C Cleo commented 2d Probe comment subject');
		// The snoozed and archived store items are not in the All list (`inbox-entry.ts:393-401`).
		await expect(rowButton(page, 'probe-broadcast')).toHaveCount(0);
		await expect(rowButton(page, 'probe-payment')).toHaveCount(0);
		// The reads, deduped: one list read of the All tab and the counts read (`use-inbox-items.ts:50-57,166-178`).
		expect([...new Set(sortedReads(harness.reads()))]).toEqual([
			'GET /api/inbox/items/counts',
			'GET /api/inbox/items?tab=all&limit=40'
		]);
		// Nothing reached the mock itself on these paths — the stub answered.
		expect((await mock.requests()).filter((r) => r.path.startsWith(INBOX_API))).toEqual([]);
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('tabs and filters: the URL after, the read each sends, and an empty tab', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });

		// Mentions narrows on the client — the All-tab query is unchanged, so no new read (`use-inbox-items.ts:25-31`).
		const beforeMentions = harness.calls.length;
		await page.getByRole('tab', { name: T.FILTERS.MENTIONS, exact: true }).click();
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('tab=mentions');
		await expect(rowButton(page, 'probe-mention')).toBeVisible();
		await expect(rowButton(page, 'probe-message')).toHaveCount(0);
		await expect(rowButton(page, 'probe-assignment')).toHaveCount(0);
		expect(harness.callsSince(beforeMentions).filter((c) => c.method === 'GET')).toEqual([]);

		// Assigned, same client narrowing.
		await page.getByRole('tab', { name: T.FILTERS.ASSIGNED, exact: true }).click();
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('tab=assigned');
		await expect.poll(() => rowIds(page)).toEqual(['probe-assignment']);

		// Unread is the one filter the platform is asked for: `unread=true` on the All tab.
		const beforeUnread = harness.calls.length;
		await page.getByRole('tab', { name: unreadTab(6), exact: true }).click();
		await expect
			.poll(() => harness.callsSince(beforeUnread).some((c) => c.search.includes('unread=true')), {
				timeout: 15_000
			})
			.toBe(true);
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('tab=unread');
		expect([...new Set(harness.callsSince(beforeUnread).map((c) => `${c.method} ${c.path}${c.search}`))]).toEqual([
			'GET /api/inbox/items?tab=all&unread=true&limit=40'
		]);
		await expect
			.poll(() => rowIds(page))
			.toEqual(['probe-mention', 'probe-message', 'probe-question', 'probe-assignment', 'probe-comment']);

		// A secondary tab: asked for by name, and its empty state (`EMPTY_KEYS.snoozed`).
		const beforeSnoozed = harness.calls.length;
		await barButton(page, T.FILTERS.MORE).click();
		await page.getByRole('menuitem', { name: T.FILTERS.SNOOZED }).click();
		await expect
			.poll(() => harness.callsSince(beforeSnoozed).map((c) => `${c.path}${c.search}`), { timeout: 15_000 })
			.toContain(`${INBOX_API}/items?tab=snoozed&limit=40`);
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('tab=snoozed');
		await expect.poll(() => rowIds(page)).toEqual(['probe-broadcast']); // the one store item with a future `snoozedUntil`
		await barButton(page, T.FILTERS.MORE).click();
		const beforeDone = harness.calls.length;
		await page.getByRole('menuitem', { name: T.FILTERS.DONE }).click();
		await expect
			.poll(() => harness.callsSince(beforeDone).map((c) => `${c.path}${c.search}`), { timeout: 15_000 })
			.toContain(`${INBOX_API}/items?tab=done&limit=40`);
		await expect(page.getByText(T.EMPTY.DONE_TITLE, { exact: true })).toBeVisible();
		await expect(page.getByText(T.EMPTY.DONE_TEXT, { exact: true })).toBeVisible();

		// Back to All, then the source filter: a URL and a client narrowing, no read.
		await page.getByRole('tab', { name: 'All', exact: true }).click();
		await expect(rowButton(page, 'probe-mention')).toBeVisible();
		const beforeSource = harness.calls.length;
		await barButton(page, T.SOURCES.LABEL).click();
		await page.getByRole('menuitemradio', { name: T.SOURCES.TASKS, exact: true }).click();
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('source=tasks');
		await expect.poll(() => rowIds(page)).toEqual(['probe-mention', 'probe-assignment', 'probe-comment']);
		await page.waitForTimeout(1_200); // quiet window: proves the source filter sent no new read (`use-inbox-items.ts:25-31` sends only tab/unread/q)
		expect(harness.callsSince(beforeSource).filter((c) => c.method === 'GET')).toEqual([]);
		report('filters', { mockInbox: (await mock.requests()).filter((r) => r.path.startsWith(INBOX_API)).length });
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('opening a row: the detail pane, and the read it sends', async ({ page, fixture, shield }) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });
		await expect(badge(page)).toHaveText(unreadText(6));

		await rowButton(page, 'probe-mention').click(); // `handleOpen` marks an unread entry read (`inbox-page.tsx:376-385`)
		await expect
			.poll(() => writeCalls(harness, '/state', '"isRead":true').length, { timeout: 15_000 })
			.toBeGreaterThanOrEqual(1);
		const body = parseBody(writeCalls(harness, '/state', '"isRead":true')[0]);
		expect(Object.keys(body).sort()).toEqual(['isRead', 'organizationId', 'tenantId']); // `api.service.ts:653-661` adds the scope ids
		expect(body.isRead).toBe(true);
		await expect(badge(page)).toHaveText(unreadText(5));

		// The pane as printed: sentence, date, subject; no Open button for an entry without a target, and `NO_TARGET`.
		await expect(aside(page)).toContainText('Ana mentioned you');
		await expect(aside(page)).toContainText('Probe mention subject');
		await expect(aside(page)).toContainText(T.DETAIL.NO_TARGET);
		await expect(aside(page).getByRole('button', { name: T.DETAIL.OPEN, exact: true })).toHaveCount(0);
		const barArias = await aside(page)
			.getByRole('button')
			.evaluateAll((nodes) =>
				nodes
					.map((b) => b.getAttribute('aria-label'))
					.filter(Boolean)
					.sort()
			);
		expect(barArias).toEqual(['Mark as done', 'Mark as unread', 'Snooze', 'Archive'].sort());
		// The URL did not move: a row click keeps the inbox (`opensInboxTarget`, `inbox-entry.ts:144-148`).
		expect(new URL(page.url()).pathname).toBe(INBOX_PATH);

		// From the pane: mark unread — the same state route with `isRead:false`.
		await aside(page).getByRole('button', { name: EN.notifications.MARK_UNREAD, exact: true }).click();
		await expect
			.poll(() => writeCalls(harness, '/state', '"isRead":false').length, { timeout: 15_000 })
			.toBeGreaterThanOrEqual(1);
		await expect(badge(page)).toHaveText(unreadText(6));
		report('opened-pane', { aside: flat(await aside(page).innerText()).slice(0, 300) });
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('archive from the row: the toast with its own Undo, the Archived tab, and Unarchive', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });
		await expect(rowButton(page, 'probe-payment')).toHaveCount(0); // an archived store item is not on All

		await rowAction(page, 'probe-mention', EN.notifications.ARCHIVE); // `inbox-row.tsx` action cluster
		await expect.poll(() => writeCalls(harness, '/state', '"isArchived":true').length, { timeout: 15_000 }).toBe(1);
		expect(Object.keys(parseBody(writeCalls(harness, '/state', '"isArchived":true')[0])).sort()).toEqual([
			'isArchived',
			'organizationId',
			'tenantId'
		]); // probe P5 measured exactly these body keys
		await expect(rowButton(page, 'probe-mention')).toHaveCount(0);
		await expect(toastWith(page, 'Notification archived')).toBeVisible({ timeout: 15_000 }); // `TOASTS.ARCHIVED` for count 1

		// the Undo belongs to that one toast — toasts stack faster than they expire (probe P5)
		await page.mouse.move(2, 2);
		await toastWith(page, 'Notification archived')
			.getByRole('button', { name: T.TOASTS.UNDO, exact: true })
			.click();
		await expect
			.poll(() => writeCalls(harness, '/state', '"isArchived":false').length, { timeout: 15_000 })
			.toBe(1);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 15_000 });

		// The Archived tab asks the platform for its own tab (`use-inbox-items.ts:50-57`).
		const beforeArchived = harness.calls.length;
		await barButton(page, T.FILTERS.MORE).click();
		await page.getByRole('menuitem', { name: T.FILTERS.ARCHIVED, exact: true }).click();
		await expect
			.poll(() => harness.callsSince(beforeArchived).map((c) => `${c.path}${c.search}`), { timeout: 15_000 })
			.toContain(`${INBOX_API}/items?tab=archived&limit=40`);
		await expect.poll(() => rowIds(page)).toEqual(['probe-payment']);
		await rowAction(page, 'probe-payment', T.ACTIONS.UNARCHIVE); // the Archived tab's own label (`inbox.ACTIONS.UNARCHIVE`)
		await expect
			.poll(() => writeCalls(harness, '/state', '"isArchived":false').length, { timeout: 15_000 })
			.toBe(2);
		await expect(rowButton(page, 'probe-payment')).toHaveCount(0);
		await expect(page.getByText(T.EMPTY.ARCHIVED_TITLE, { exact: true })).toBeVisible();
		report('archive-undo', {
			archivedWrites: harness
				.writes()
				.filter((c) => String(c.body).includes('isArchived'))
				.map((c) => `${c.path} ${c.body}`)
		});
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('snooze: the preset times the page sends, the Snoozed tab, Unsnooze, done and not-done', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });

		await rowAction(page, 'probe-mention', T.ACTIONS.SNOOZE); // `snooze-menu.tsx:47-56` offers the three presets
		// the menu items' accessible names carry the formatted wake-up time ("Later today Fri 7:29 AM" — measured),
		// so they are matched by their label only
		await expect(page.getByRole('menuitem', { name: T.SNOOZE.LATER_TODAY })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: T.SNOOZE.TOMORROW })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: T.SNOOZE.NEXT_WEEK })).toBeVisible();
		report('snooze-menu', { items: await page.getByRole('menuitem').allInnerTexts() }); // probe P5 printed "Tomorrow / Sat 9:00 AM" style times

		const beforeTomorrow = new Date();
		await page.getByRole('menuitem', { name: T.SNOOZE.TOMORROW }).click();
		await expect
			.poll(() => writeCalls(harness, 'probe-mention', 'snoozedUntil').length, { timeout: 15_000 })
			.toBe(1);
		// "tomorrow at nine" in the browser's own zone (`inbox-entry.ts:450-454`, `snoozeUntil`), recomputed here in Node
		// for the same machine and zone (probe P5: browser zone Europe/Madrid, sent `2026-11-28T08:00:00.000Z` = 09:00 there).
		expect(parseBody(writeCalls(harness, 'probe-mention', 'snoozedUntil')[0]).snoozedUntil).toBe(
			snoozeFormula.tomorrow(beforeTomorrow).toISOString()
		);
		await expect(rowButton(page, 'probe-mention')).toHaveCount(0); // a snoozed entry leaves All
		await expect(toastWith(page, 'Notification snoozed')).toBeVisible({ timeout: 15_000 });

		await page.mouse.move(2, 2);
		await toastWith(page, 'Notification snoozed').getByRole('button', { name: T.TOASTS.UNDO, exact: true }).click();
		await expect
			.poll(() => harness.writes().filter((c) => String(c.body).includes('"snoozedUntil":null')).length, {
				timeout: 15_000
			})
			.toBe(1); // the Undo sends `snoozedUntil: null`
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 15_000 });

		// 'Next week' is the next Monday at nine (`inbox-entry.ts:455-458`).
		await rowAction(page, 'probe-comment', T.ACTIONS.SNOOZE);
		const beforeWeek = new Date();
		await page.getByRole('menuitem', { name: T.SNOOZE.NEXT_WEEK }).click();
		await expect
			.poll(
				() =>
					harness
						.writes()
						.some((c) => c.path.includes('probe-comment') && String(c.body).includes('snoozedUntil')),
				{ timeout: 15_000 }
			)
			.toBe(true);
		expect(
			String(
				harness
					.writes()
					.find((c) => c.path.includes('probe-comment') && String(c.body).includes('snoozedUntil'))?.body
			)
		).toContain(snoozeFormula.nextWeek(beforeWeek).toISOString());

		await rowAction(page, 'probe-message', T.ACTIONS.SNOOZE);
		await page.getByRole('menuitem', { name: T.SNOOZE.TOMORROW }).click();
		await expect
			.poll(
				() =>
					harness
						.writes()
						.some((c) => c.path.includes('probe-message') && String(c.body).includes('snoozedUntil')),
				{ timeout: 15_000 }
			)
			.toBe(true);

		await page.getByRole('tab', { name: 'All', exact: true }).click();
		await expect.poll(() => rowIds(page)).toEqual(['probe-mention', 'probe-question', 'probe-assignment']);

		// The Snoozed tab, asked for by name; a snoozed row prints its wake-up time (`inbox-row.tsx:198-202`).
		const beforeSnoozed = harness.calls.length;
		await barButton(page, T.FILTERS.MORE).click();
		await page.getByRole('menuitem', { name: T.FILTERS.SNOOZED }).click();
		await expect
			.poll(() => harness.callsSince(beforeSnoozed).map((c) => `${c.path}${c.search}`), { timeout: 15_000 })
			.toContain(`${INBOX_API}/items?tab=snoozed&limit=40`);
		await expect.poll(() => rowIds(page)).toEqual(['probe-message', 'probe-broadcast', 'probe-comment']); // newest first (`inbox.service.ts:33` order, this store's answers)
		await expect(rowWrap(page, 'probe-comment')).toContainText('9:00 AM'); // the snooze chip (`formatNotificationDate`, probe P5 "Nov 28, 2026, 9:00 AM")
		await rowAction(page, 'probe-comment', T.ACTIONS.SNOOZE);
		await expect(page.getByRole('menuitem', { name: T.SNOOZE.UNSNOOZE })).toBeVisible(); // only while snoozed (`snooze-menu.tsx:57-62`)
		await page.getByRole('menuitem', { name: T.SNOOZE.UNSNOOZE }).click();
		await expect
			.poll(
				() =>
					harness
						.writes()
						.filter(
							(c) => c.path.includes('probe-comment') && String(c.body).includes('"snoozedUntil":null')
						).length,
				{ timeout: 15_000 }
			)
			.toBe(1);
		await page.getByRole('tab', { name: 'All', exact: true }).click();
		await expect(rowButton(page, 'probe-comment')).toBeVisible();

		// done / not done (`inbox-row.tsx` ACTIONS.DONE / ACTIONS.NOT_DONE)
		await rowAction(page, 'probe-assignment', T.ACTIONS.DONE);
		await expect
			.poll(() => writeCalls(harness, 'probe-assignment', '"isDone":true').length, { timeout: 15_000 })
			.toBe(1);
		await expect(toastWith(page, 'Marked as done')).toBeVisible({ timeout: 15_000 });
		await expect(rowButton(page, 'probe-assignment')).toHaveCount(0);
		const beforeDone = harness.calls.length;
		await barButton(page, T.FILTERS.MORE).click();
		await page.getByRole('menuitem', { name: T.FILTERS.DONE }).click();
		await expect
			.poll(() => harness.callsSince(beforeDone).map((c) => `${c.path}${c.search}`), { timeout: 15_000 })
			.toContain(`${INBOX_API}/items?tab=done&limit=40`);
		await rowAction(page, 'probe-assignment', T.ACTIONS.NOT_DONE);
		await expect
			.poll(() => writeCalls(harness, 'probe-assignment', '"isDone":false').length, { timeout: 15_000 })
			.toBe(1);
		report('snooze-done', {
			snoozedWrites: harness
				.writes()
				.filter((c) => String(c.body).includes('snoozedUntil'))
				.map((c) => `${c.path} ${c.body}`)
		});
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('Mark all as read: the unread set it fetches first, the POST it sends, the button then disabled', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });
		await expect(badge(page)).toHaveText(unreadText(6));

		const before = harness.calls.length;
		await barButton(page, T.ACTIONS.MARK_ALL_READ).click();
		await expect
			.poll(() => harness.callsSince(before).some((c) => c.method === 'POST'), { timeout: 20_000 })
			.toBe(true);
		// probe P8 measured exactly these two calls:
		expect(harness.callsSince(before).map((c) => `${c.path}${c.search}`)).toContain(
			`${INBOX_API}/items?tab=all&unread=true&limit=100`
		); // the unread set (`use-inbox-actions.ts:181-196`)
		const post = harness.callsSince(before).find((c) => c.method === 'POST');
		expect(post?.path).toBe(`${INBOX_API}/items/mark-all-read`);
		expect(parseBody(post)).toEqual({ tab: 'all' }); // `inbox.service.ts:66` posts this route without the scope ids
		await expect(toastWith(page, T.TOASTS.ALL_READ)).toBeVisible({ timeout: 10_000 });
		await expect(badge(page)).toHaveText(unreadText(0), { timeout: 15_000 });
		await expect(barButton(page, T.ACTIONS.MARK_ALL_READ)).toBeDisabled(); // `inbox-page.tsx:622`
		report('mark-all', {
			calls: harness.callsSince(before).map((c) => `${c.method} ${c.path}${c.search} ${c.body ?? ''}`)
		});
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('selection: the checkboxes, the bar it opens, bulk read, bulk archive and that toast Undo', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-assignment')).toBeVisible({ timeout: 30_000 });

		// `inbox-row.tsx:169,216-221` — the checkbox needs the row hovered (it sits in the action cluster)
		await rowWrap(page, 'probe-assignment').hover();
		await rowWrap(page, 'probe-assignment').getByRole('checkbox', { name: T.ACTIONS.SELECT }).click();
		await rowWrap(page, 'probe-comment').hover();
		await rowWrap(page, 'probe-comment').getByRole('checkbox', { name: T.ACTIONS.SELECT }).click();
		await expect(page.getByText(selectedText(2), { exact: true })).toBeVisible({ timeout: 15_000 });
		const bar = page
			.locator('div')
			.filter({ hasText: new RegExp(`^${selectedText(2)}$`) })
			.last(); // the bar `inbox-page.tsx:728-770`
		expect(
			await bar.locator('button[aria-label]').evaluateAll((n) => n.map((b) => b.getAttribute('aria-label')))
		).toEqual(['Mark as read', 'Mark as done', 'Archive', 'Clear selection']);

		await bar.getByRole('button', { name: EN.notifications.MARK_READ, exact: true }).click(); // bulk: one state write per selected entry (`use-inbox-actions.ts` concurrency 8)
		await expect.poll(() => writeCalls(harness, '/state', '"isRead":true').length, { timeout: 15_000 }).toBe(2);
		await expect(page.getByText(selectedText(2), { exact: true })).toBeVisible(); // reading keeps the selection (probe P7 "2 selected")

		await bar.getByRole('button', { name: EN.notifications.ARCHIVE, exact: true }).click();
		await expect.poll(() => writeCalls(harness, '/state', '"isArchived":true').length, { timeout: 15_000 }).toBe(2);
		await expect(rowButton(page, 'probe-assignment')).toHaveCount(0);
		await expect(toastWith(page, '2 notifications archived')).toBeVisible({ timeout: 15_000 }); // `TOASTS.ARCHIVED` for count 2 (probe P7)

		await page.mouse.move(2, 2);
		await toastWith(page, '2 notifications archived')
			.getByRole('button', { name: T.TOASTS.UNDO, exact: true })
			.click();
		await expect
			.poll(() => writeCalls(harness, '/state', '"isArchived":false').length, { timeout: 15_000 })
			.toBe(2);
		await expect(rowButton(page, 'probe-assignment')).toBeVisible({ timeout: 15_000 });
		await expect(rowButton(page, 'probe-comment')).toBeVisible();

		// Measured: archiving the selection drops it — Undo brings the entries back but not the selection, the bar is gone.
		await expect(page.getByText(selectedText(2), { exact: true })).toHaveCount(0);
		await rowWrap(page, 'probe-assignment').hover();
		await rowWrap(page, 'probe-assignment').getByRole('checkbox', { name: T.ACTIONS.SELECT }).click();
		await expect(page.getByText(selectedText(1), { exact: true })).toBeVisible({ timeout: 15_000 });
		await barButton(page, T.ACTIONS.CLEAR_SELECTION).click(); // unique on the page (probe2 P7 clicked it page-wide)
		await expect(page.getByText(/selected/)).toHaveCount(0, { timeout: 15_000 });
		report('selection', {
			storeAfter: harness
				.items()
				.filter((i) => ['probe-assignment', 'probe-comment'].includes(i.id))
				.map((i) => ({ id: i.id, recipient: i.recipient }))
		});
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('search: what is typed is asked for, and Clear search puts the list back', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });

		const beforeSearch = harness.calls.length;
		await page.getByLabel(T.SEARCH).fill('probe message'); // the search field (`inbox-page.tsx:636-666`); `q` is plain state (`:174,643`) fed straight into the list query
		await expect
			.poll(() => harness.callsSince(beforeSearch).some((c) => c.search.includes('q=probe')), { timeout: 15_000 })
			.toBe(true);
		const qRead = harness.callsSince(beforeSearch).find((c) => c.search.includes('q=probe'));
		expect(qRead?.search).toBe('?tab=all&q=probe%20message&limit=40'); // probe P8 measured this exact query
		await expect.poll(() => rowIds(page)).toEqual(['probe-message']);

		await barButton(page, T.ACTIONS.CLEAR_SEARCH).click();
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 15_000 }); // the cleared query is the cached All-tab page — no new read (probe P8)
		const qReadsAfterClear = harness.calls.filter((c) => c.method === 'GET' && c.search.includes('q=')).length;
		expect(qReadsAfterClear).toBe(1);
		report('search', { searches: harness.reads().map((c) => c.search) });
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('the decision panel: what it asks for first, and the reply it sends', async ({ page, fixture, shield }) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-question')).toBeVisible({ timeout: 30_000 });
		await expect(rowWrap(page, 'probe-question')).toContainText(T.DECISION.TITLE); // the decision chip (probe P3)

		// The panel lives in the aside; the mobile sheet (`inbox-page.tsx:822-832`) holds a second copy of these
		// controls, so every decision locator is scoped to the aside (probe P9 hit a strict violation page-wide).
		const panel = aside(page);
		await rowButton(page, 'probe-question').click();
		await expect(panel.getByRole('radio', { name: 'Yes' })).toBeVisible({ timeout: 15_000 }); // `inbox-decision.tsx:80-98`; 'Yes' carries the Recommended span
		await expect(panel.getByText(T.DECISION.RECOMMENDED, { exact: true })).toBeVisible();
		await expect(panel.getByLabel(T.DECISION.REASON_REQUIRED)).toBeVisible(); // `requireReason: true` → REASON_REQUIRED (`:101-106`)
		await expect(panel.getByRole('button', { name: T.DECISION.SEND, exact: true })).toBeVisible();

		const beforeSend = harness.calls.length;
		await panel.getByRole('button', { name: T.DECISION.SEND, exact: true }).click();
		await expect(panel.getByText(T.DECISION.MISSING_OPTION, { exact: true })).toBeVisible(); // nothing is posted without an option (`inbox-decision.tsx:117`)
		await page.waitForTimeout(1_000); // quiet window: proves the blocked send posted nothing
		expect(harness.callsSince(beforeSend).filter((c) => c.method === 'POST').length).toBe(0);

		await panel.getByRole('radio', { name: 'No' }).click();
		await panel.getByRole('button', { name: T.DECISION.SEND, exact: true }).click();
		await expect(panel.getByText(T.DECISION.MISSING_REASON, { exact: true })).toBeVisible(); // a required reason blocks the send too
		await page.waitForTimeout(1_000); // quiet window again: still nothing posted
		expect(harness.callsSince(beforeSend).filter((c) => c.method === 'POST').length).toBe(0);

		await panel.getByLabel(T.DECISION.REASON_REQUIRED).fill('Running late');
		await panel.getByRole('button', { name: T.DECISION.SEND, exact: true }).click();
		await expect
			.poll(() => harness.callsSince(beforeSend).some((c) => c.method === 'POST'), { timeout: 15_000 })
			.toBe(true);
		const post = harness.callsSince(beforeSend).find((c) => c.method === 'POST');
		expect(post?.path).toBe(`${INBOX_API}/items/probe-question/reply`);
		expect(parseBody(post)).toEqual({ optionId: 'no', text: 'Running late' }); // `inbox.service.ts:60` posts no scope ids here
		report('decision-send', { body: post?.body, aside: flat(await panel.innerText()).slice(0, 300) });
		await expect(toastWith(page, T.DECISION.SENT)).toBeVisible({ timeout: 15_000 });
		await expect(panel).toContainText(T.DECISION.ANSWERED_WITH.replace('{option}', 'No')); // the answered shape (`inbox-decision.tsx`, `ANSWERED_WITH`)
		await expect(rowWrap(page, 'probe-question')).not.toContainText(T.DECISION.TITLE); // answered → no decision chip
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('a refused read shows the error state and Try again recovers; a refused write changes nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const script: InboxScript = {
			items: servedItems(),
			listRefusal: { status: 500, message: 'Probe read refusal' }
		};
		const harness = await serveInbox(page, script);
		await openInbox(page, fixture);

		// The list read is refused (React Query retries once, `core/query/config/index.ts:31`), then the error state shows
		// (`inbox-page.tsx:774` → `notification-states.tsx:71-84`: `role="alert"` + LOAD_ERROR + RETRY button).
		await expect(page.getByText(T.LOAD_ERROR, { exact: true })).toBeVisible({ timeout: 40_000 });
		await expect(barButton(page, T.RETRY)).toBeVisible();
		report('refused-read', { consoleErrors: shield.consoleErrors() });
		harness.script.listRefusal = undefined;
		await barButton(page, T.RETRY).click(); // `inbox-page.tsx:210` → `items.retry()`
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });

		// A refused write: the failure toast, and the store (and the row) untouched.
		harness.script.stateRefusal = { status: 422, message: 'Probe write refusal' };
		const beforeWrite = harness.calls.length;
		await rowAction(page, 'probe-mention', EN.notifications.ARCHIVE);
		await expect(toastWith(page, T.TOASTS.UPDATE_FAILED)).toBeVisible({ timeout: 15_000 }); // `handleArchive` → `inbox-page.tsx:404-410` ApiError message
		expect(harness.callsSince(beforeWrite).some((c) => c.method === 'PATCH')).toBe(true);
		expect(harness.items().find((i) => i.id === 'probe-mention')?.recipient?.isArchived ?? false).toBe(false); // the refusal changed nothing
		await expect(rowButton(page, 'probe-mention')).toHaveCount(1);
		report('refused-write', {
			write: harness.callsSince(beforeWrite).find((c) => c.method === 'PATCH')?.body,
			toasts: await appToasts(page).allInnerTexts(),
			consoleErrors: shield.consoleErrors()
		});
		// only the two refusals this file armed are excused in the console
		await expect(
			consoleFindings(shield, [
				// the HttpClient error lines name the path relative to the API origin (measured): "HTTP Error: GET
				// /inbox/items?tab=all&limit=40 500", "HTTP Error: PATCH /inbox/items/probe-mention/state 422"
				{ verb: 'GET', pathFragment: '/inbox/items?tab=all&limit=40', status: 500 },
				{ verb: 'PATCH', pathFragment: '/inbox/items/probe-mention/state', status: 422 }
			])
		).toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});

	test('?item= deep link: an entry in the list opens in the pane; an entry outside it is fetched on its own', async ({
		page,
		fixture,
		shield
	}) => {
		const offPage = notice('probe-offpage', {
			type: 'Broadcast',
			title: 'Zoe published an announcement "Probe offpage"',
			createdAt: hoursAgo(70)
		});
		const harness = await serveInbox(page, { items: servedItems(), singleItems: [offPage] });
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });

		// `inbox-page.tsx:507-524`: with the entry in the loaded list, `?item=` opens it exactly like a row click.
		await signInAndVisit(page, fixture, `${INBOX_PATH}?item=probe-assignment`);
		await expect(rowButton(page, 'probe-assignment')).toBeVisible({ timeout: 30_000 });
		await expect
			.poll(() => writeCalls(harness, 'probe-assignment/state', '"isRead":true').length, { timeout: 15_000 })
			.toBe(1); // opening it marks it read
		expect(
			Object.keys(parseBody(writeCalls(harness, 'probe-assignment/state', '"isRead":true')[0])).sort()
		).toEqual(['isRead', 'organizationId', 'tenantId']);
		await expect(aside(page)).toContainText('Probe task title');
		await expect(aside(page)).toContainText(T.DETAIL.NO_TARGET); // an entry with no target keeps the pane on the inbox
		await expect(badge(page)).toHaveText(unreadText(5), { timeout: 15_000 });
		report('deep-link-in-list', { aside: flat(await aside(page).innerText()).slice(0, 300) });

		// An entry the loaded page does not hold: the id is read on its own through `inboxService.getItem`
		// (`inbox-page.tsx:518-523`) and opened. What is measurable every run: that single read and its read-write.
		await signInAndVisit(page, fixture, `${INBOX_PATH}?item=probe-offpage`);
		await expect
			.poll(() => harness.reads().some((c) => c.path === `${INBOX_API}/items/probe-offpage`), { timeout: 30_000 })
			.toBe(true);
		await expect
			.poll(() => writeCalls(harness, 'probe-offpage/state', '"isRead":true').length, { timeout: 15_000 })
			.toBe(1);
		// Measured, untagged (the quoted comment promises the read, which happens) — `inbox-page.tsx:517`: "Not in the
		// loaded list (older, archived, done or snoozed elsewhere): read it on its own." — and the lone read and
		// its read-write do happen (pinned below). But the opened pane settled back at `inbox.DETAIL.NO_SELECTION`
		// in some runs and stayed open in others (measured both ways): it is opened while the workspace scope has
		// not arrived yet, and `inbox-page.tsx:233-234` ("after a switch (another tab can make one) the pane lets
		// it go") then drops it. Only the requests are pinned here.
		report('deep-link-off-list', {
			aside: flat(await aside(page).innerText()).slice(0, 300),
			reads: sortedReads(harness.reads()).filter((r) => r.includes('probe-offpage'))
		});
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('the keyboard layer: J/K move, U reads, X selects, E archives — and typing in the search sends none of that', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveInbox(page, { items: servedItems() });
		await openInbox(page, fixture);
		await expect(rowButton(page, 'probe-mention')).toBeVisible({ timeout: 30_000 });

		// `use-inbox-keyboard.ts`: focus follows `data-inbox-row` rows.
		const activeRow = () =>
			page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('data-inbox-row'));
		await rowButton(page, 'probe-mention').focus();
		await expect.poll(activeRow).toBe('probe-mention');
		await page.keyboard.press('j');
		await expect.poll(activeRow, { timeout: 15_000 }).toBe('probe-message');
		await page.keyboard.press('k');
		await expect.poll(activeRow, { timeout: 15_000 }).toBe('probe-mention');
		await page.keyboard.press('u');
		await expect
			.poll(
				() =>
					harness
						.writes()
						.some((c) => c.path.includes('probe-mention') && String(c.body).includes('"isRead":true')),
				{ timeout: 15_000 }
			)
			.toBe(true);
		await page.keyboard.press('x');
		await expect(page.getByText(selectedText(1), { exact: true })).toBeVisible({ timeout: 15_000 });
		await page.keyboard.press('e');
		await expect
			.poll(
				() =>
					harness
						.writes()
						.some((c) => c.path.includes('probe-mention') && String(c.body).includes('"isArchived":true')),
				{ timeout: 15_000 }
			)
			.toBe(true);

		// `isTypingTarget` (`use-inbox-keyboard.ts:20-25`): letters inside the search field are search, not shortcuts.
		const writesBeforeTyping = harness.writes().length;
		await page.getByLabel(T.SEARCH).click();
		await page.keyboard.press('u');
		await page.waitForTimeout(2_000); // quiet window: proves the typed 'u' sent no state write and only a search read
		expect(harness.writes().length).toBe(writesBeforeTyping);
		expect(harness.reads().filter((c) => c.search.includes('q=u')).length).toBe(1);
		report('keyboard', { writesBeforeTyping, writesAfterTyping: harness.writes().length });
		await expect(consoleFindings(shield, [])).toEqual([]);
	});

	test('the bell-only path: when the counts probe answers 404 the page runs the notifications bell', async ({
		page,
		fixture,
		shield
	}) => {
		const inbox = await serveInbox(page, { items: [], countsRefusal: 404 }); // 404 is an "endpoint unavailable" answer (`api-error.service.ts:253-255`)
		const bell = await serveBell(page, [
			{
				id: 'bell-mention',
				title: 'Ana Mentioned you in "Bell mention subject"',
				type: 'Mention',
				createdAt: hoursAgo(1),
				isRead: false,
				sentByEmployee: { fullName: 'Ana Bell' }
			},
			{
				id: 'bell-assignment',
				title: 'Ben Assigned you "Bell task title"',
				type: 'Assignment',
				createdAt: hoursAgo(25),
				isRead: false,
				sentByEmployee: { fullName: 'Ben Bell' }
			},
			{
				id: 'bell-read',
				title: 'Cleo Commented on "Bell read subject"',
				type: 'Comment',
				createdAt: hoursAgo(26),
				isRead: true
			}
		]);
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });
		await signInAndVisit(page, fixture, INBOX_PATH);

		await expect(rowButton(page, 'bell-mention')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText(T.LEGACY_NOTICE, { exact: true })).toBeVisible(); // `inbox-page.tsx:726`
		await expect.poll(() => rowIds(page)).toEqual(['bell-mention', 'bell-assignment', 'bell-read']);
		await expect(badge(page)).toHaveText(unreadText(2)); // from the take=1 unread query's total (`employee-notification.service.ts:62-73`)

		// The two bell reads, pinned by their query parameters (`employee-notification.service.ts:41-73`):
		await expect.poll(() => bell.reads().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
		const params = bell.reads().map((c) => new URLSearchParams(c.search));
		expect(
			params.some(
				(p) =>
					p.get('take') === '50' &&
					p.get('where[isArchived]') === 'false' &&
					p.get('order[createdAt]') === 'DESC' &&
					p.get('order[id]') === 'DESC' &&
					!!p.get('where[receiverEmployeeId]')
			)
		).toBe(true);
		expect(params.some((p) => p.get('take') === '1' && p.get('where[isRead]') === 'false')).toBe(true);
		expect(inbox.reads().length).toBe(1); // the availability probe ran once, got 404, and the extension was never used again
		// the extension controls are not rendered on this path (`inbox-page.tsx:636-666,676-698`, `inbox-row.tsx` canTriage):
		await expect(page.getByRole('button', { name: T.ACTIONS.SNOOZE, exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: T.ACTIONS.DONE, exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: T.FILTERS.MORE, exact: true })).toHaveCount(0);
		await expect(page.getByLabel(T.SEARCH)).toHaveCount(0);

		// Mark-all while two are unread (the button disables once none are — probe P8's rule, same code path):
		const beforeAll = bell.calls.length;
		await barButton(page, T.ACTIONS.MARK_ALL_READ).click();
		await expect
			.poll(
				() =>
					bell
						.callsSince(beforeAll)
						.some((c) => c.method === 'PUT' && c.path === `${BELL_API}/mark-all-read`),
				{ timeout: 15_000 }
			)
			.toBe(true); // `use-notification-inbox.ts:213-225`
		// measured body: only the scope ids `api.service.ts` adds — `{tenantId, organizationId}`
		expect(Object.keys(parseBody(bell.callsSince(beforeAll).find((c) => c.method === 'PUT'))).sort()).toEqual([
			'organizationId',
			'tenantId'
		]);
		await expect(badge(page)).toHaveText(unreadText(0), { timeout: 15_000 });
		await expect(barButton(page, T.ACTIONS.MARK_ALL_READ)).toBeDisabled();
		report('bell-mark-all', { body: bell.callsSince(beforeAll).find((c) => c.method === 'PUT')?.body });

		// one back to unread, then archive (`use-notification-inbox.ts:229-250`: PUT `/employee-notification/<id>`):
		await rowAction(page, 'bell-mention', EN.notifications.MARK_UNREAD);
		await expect
			.poll(
				() => bell.writes().some((c) => c.path === `${BELL_API}/bell-mention` && parseBody(c).isRead === false),
				{ timeout: 15_000 }
			)
			.toBe(true);
		await expect(badge(page)).toHaveText(unreadText(1), { timeout: 15_000 });
		// measured unread body: `{"isRead":false,"readAt":null,…}` + the scope ids
		const unreadCall = bell.writes().find((c) => c.path === `${BELL_API}/bell-mention`);
		expect(Object.keys(parseBody(unreadCall)).sort()).toEqual(['isRead', 'organizationId', 'readAt', 'tenantId']);
		expect(parseBody(unreadCall).readAt).toBeNull();
		await rowAction(page, 'bell-assignment', EN.notifications.ARCHIVE);
		await expect
			.poll(
				() =>
					bell
						.writes()
						.some((c) => c.path === `${BELL_API}/bell-assignment` && parseBody(c).isArchived === true),
				{ timeout: 15_000 }
			)
			.toBe(true);
		// measured archive body: `{isArchived:true, archivedAt, isRead:true, readAt,…}` — archiving a bell row reads it too
		const archiveCall = bell.writes().find((c) => c.path === `${BELL_API}/bell-assignment`);
		expect(Object.keys(parseBody(archiveCall)).sort()).toEqual([
			'archivedAt',
			'isArchived',
			'isRead',
			'organizationId',
			'readAt',
			'tenantId'
		]);
		expect(parseBody(archiveCall).isRead).toBe(true);
		await expect.poll(() => rowIds(page)).toEqual(['bell-mention', 'bell-read']); // archived leaves the bell list
		// as printed (measured verbatim): the sender comes from `sentByEmployee.fullName` (`use-notification-inbox.ts` relations)
		expect(await rowText(page, 'bell-mention')).toBe('AB Ana Bell mentioned you 1h Bell mention subject');
		report('bell', {
			bellWrites: bell.writes().map((c) => `${c.method} ${c.path} ${c.body}`),
			rowText: await rowText(page, 'bell-mention')
		});
		// only the counts probe this file refused is excused
		await expect(
			consoleFindings(shield, [
				{ verb: 'GET', pathFragment: '/inbox/items/counts', status: 404 } // measured: "HTTP Error: GET /inbox/items/counts 404"
			])
		).toEqual([]);
		await expect(shield.pageErrors()).toEqual([]);
	});
});
