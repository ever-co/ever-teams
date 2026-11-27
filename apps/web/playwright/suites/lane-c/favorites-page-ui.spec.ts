import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { Route } from '@playwright/test';

import { test, expect, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What the signed-in person sees and what the browser really sends on **the Favorites page** (`/favorites`,
 * `app/[locale]/(main)/favorites/page.tsx` → `core/components/pages/favorites/favorites-page.tsx:139-180`), on lane-c
 * (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `4004`, `playwright/test-servers.ts:33`).
 *
 * ## The page this file drives (every `file:line` opened)
 *
 * - `favorites-page.tsx:139-180` `FavoritesPage` — `useFavoriteEntries({ loadsProjects: true })` `:141`; the error Notice
 *   (`favorites.LOAD_FAILED` + a `favorites.RETRY` button) `:153-163`; the skeleton `:164` (`FavoritesSkeleton` `:106-120`);
 *   the empty state (`favorites.EMPTY_TITLE` / `favorites.EMPTY_DESCRIPTION`) `:165-172`; the kind sections `:173-175`;
 *   the "No longer available" group `:176` (`UnavailableSection` `:74-104`).
 * - A row `FavoriteRow` `:22-53`: `<li>` → `Link href={entry.href}` with `FavoriteLead` `:32`, the title `:33`,
 *   `#<taskNumber>` for a task `:34-36` (`entry.item.taskNumber ?? entry.item.number`), and the `favorites.ARCHIVED` badge
 *   of an archived project `:37-42`; then `FavoriteRemoveButton` labelled `favorites.REMOVE_NAMED` (`look="star"`) `:44-50`.
 * - A section `FavoriteSection` `:55-71`: `<section aria-labelledby>` + `<h2>` = the kind caption
 *   (`FAVORITE_KIND_LABEL_KEYS`, `core/lib/utils/favorites.ts:16-21`) followed by `<span>{group.entries.length}</span>` `:62`.
 * - `core/components/favorites/favorite-parts.tsx`: `FavoriteLead` `:22-54`; `RemoveButton` `:67-82` — while the change is
 *   pending it renders a `Spinner` **instead of** the button `:74-76`, and a refused change raises
 *   `toast.error(t('favorites.UPDATE_FAILED'))` `:92`; a **chat** favourite goes through `useChatActions().setMemberState`
 *   `:97-108`, not through `/favorite`.
 * - `core/hooks/favorites/use-favorite-entries.ts:53-237` — the favourites list (`use-favorites-query.ts:15-47`,
 *   `GET /favorite/employee?…`), the projects (`:84-86`, only when `loadsProjects` **and** the person has project favourites),
 *   the tasks (`:89-121`: the active team's are at hand, every other team's arrive in one `GET /favorite/type?where[entity]=Task…`,
 *   and until it answers those ids are `pendingTaskIds` `:118-121` — *neither listed nor gone*), the docs (`:124-127`),
 *   the chat (`:130-138`), `isEmpty` `:201-227`, `isLoading` `:229-232`, `isError = retries.length > 0` `:209-234`.
 * - Order and grouping: `core/lib/utils/favorites.ts:9` (`FAVORITE_KINDS` = project, task, document, chat), `:117-150`
 *   (each kind's entries sorted by title `:144`; a kind without entries is left out `:145`; a favourite whose source answered
 *   without its item is *unavailable* `:131-134`).
 * - Writes: `core/hooks/favorites/use-favorite-toggle.ts:34-127` — optimistic placeholder `:69-72`, the filed favourite
 *   replaces it `:84-86`, the rollback `:88-95`, the re-read only after the person's **last** change `:99-104`, and the
 *   concurrent guard `:111-124` (while one item's favourite is changing, no second request is sent for that item).
 * - Sidebar: `core/components/layouts/sidebar-favorites.tsx:43-82` (`loadsProjects: false`), mounted by
 *   `core/components/layouts/app-sidebar.tsx:134` and drawn as collapsible sub-rows by `core/components/layouts/nav-main.tsx:247-315`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** NextAuth and the shell (its own reads, `/api/user/me`, `/api/tasks/team`, the timer, the plans), the lane's
 * Docs-on flag (`E2E_DOCS=1`), and the mock's catch-all `pagination([])` for a path this file does not stub
 * (`cypress/support/mock-gauzy-server.mjs:895-897`), which is why the Docs availability probe
 * `GET /api/plugins/docs/documents/count` answers 200 on this lane and Docs stays "available"
 * (`core/hooks/docs/use-docs-availability.ts:33-45`).
 * **Served by this file:** the favourites and everything they point at, through `page.route` on the mock origin —
 * `GET /api/favorite/employee`, `GET /api/favorite/type`, `POST /api/favorite`, `DELETE /api/favorite/<id>`,
 * `GET /api/organization-projects`, `GET /api/plugins/docs/documents(/count)`, `GET /api/chat/{states,conversations,people}`,
 * `PATCH /api/chat/conversations/<id>/state`. The mock handles none of them (`mock-gauzy-server.mjs:890` answers
 * `POST /api/favorite` only, with an empty page). Every answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`) and answers `OPTIONS` with 204, because the page is on `localhost:3033` and the API on
 * `127.0.0.1:4002`. `route.fetch()` is never called, so the mock's own log stays empty for these paths: the witness that the
 * page acted on this file. The store is live — the list answer is always the current store, a `DELETE` (when no refusal is
 * armed) takes the row out of it, and an armed refusal changes nothing.
 * Served shapes are the ones the app validates: a favourite row `{id, entity, entityId, employeeId, organizationId,
 * tenantId}` (`core/types/schemas/favorite/favorite.schema.ts:22-38`, `.strict()`; the same shape
 * `core/types/schemas/favorite/favorite.schema.test.ts:19` builds), a favourite task per `favoriteTaskSchema`
 * (`favorite.schema.ts:44-57`), a project per `organizationProjectSchema` (the minimal row of
 * `core/types/schemas/organization/organization-project.schema.test.ts:15-22`), and a docs list `{items,total}`, unvalidated
 * (`core/services/client/api/docs/docs.service.ts:50-53`), in the row shape of `suites/lane-c/docs-home-ui.spec.ts:269-296`.
 *
 * ## Where every value came from
 *
 * Probes `D:\Coding\.tmp\probe-favorites\` on 2026-11-27, printed in `D:\Coding\.tmp\s3-lane-c-favorites-1.log` (P1-P2),
 * `-2.log` (P3-P6), `-3.log` (Q1-Q6), `-4.log` (R1-R3), `-5.log` (S1-S2), `-6.log` (T1-T3), `-7.log` (U1), plus this file's
 * own `[lane-c favorites] MEASURE` lines. Every value asserted below is one those runs printed. Two consecutive whole-file
 * runs back the green claim (log names in `/d/Coding/.tmp/lane-c-favorites-status.md`).
 *
 * ## Measured notes — all untagged. No comment, type, unit test or copy says any of this is unwanted.
 *
 * 1. **The override can turn this lane's server-on Docs flag off.** The document the lane serves carries
 *   `NEXT_PUBLIC_DOCS_ENABLED = "true"` (probe Q1 read it off `data-ever-teams-runtime-env`), and
 *   `overrideRuntimeEnv(page, { NEXT_PUBLIC_DOCS_ENABLED: 'false' })` makes the page drop the Docs section **and** every docs
 *   read: `isDocsEnabled()` (`core/lib/utils/docs-enabled.ts:8-10`) reads `readRuntimeEnv` first, and `'false'` is a truthy
 *   string, so the build-time fallback never applies. A document favourite is then listed **nowhere** — not as a row, not in
 *   "No longer available" (`use-favorite-entries.ts:159-167` leaves the whole `document` source out; `favoriteCount` `:202`
 *   does not count it either). With chat left off, its starred conversation is left out the same way (`:168-177`, `:202`).
 * 2. **A favourite task of another team is *neither listed nor gone* until `GET /favorite/type` answers.** Probe P2 read the
 *   DOM right after the shell was ready and saw `Tasks1` (the active team's task alone) with no "A task you can no longer
 *   open" row; once that read had answered, the same page showed `Tasks2` plus the row (probe P3).
 *   That is `use-favorite-entries.ts:118-121` with `favoriteGroupsOf`'s `pendingIds` rule (`core/lib/utils/favorites.ts:131-135`)
 *   working as written — the reason every wait here is on a row, never on a delay.
 * 3. **A chat favourite is not a `/favorite` row at all.** Its Remove sends `PATCH /api/chat/conversations/<id>/state` and the
 *   chat lists are re-read after it (`favorite-parts.tsx:97-108`, `core/hooks/chat/use-chat-actions.ts:335-342`); no
 *   `DELETE /api/favorite/…` is ever sent for it (probe Q2). A conversation the states star but the conversation list does not
 *   carry lands in "No longer available", and its Remove is the same chat write.
 * 4. **The concurrent guard of `use-favorite-toggle.ts:111-124` cannot be reached from this page's controls.** Removing a row
 *   takes that item out of the page *and* out of the sidebar's favourites in the same optimistic commit, so no second star or
 *   cross is left to click while its `DELETE` is open: with the request held 4 s both controls were already 0 elements and no
 *   second `DELETE` arrived (probe T2). Two *different* items are never blocked — both `DELETE`s were in flight at once, both
 *   rows left at once, and the favourites were read again exactly once for the two writes (`:99-104`; probe T1: 1 read before,
 *   2 after).
 * 5. **A refused remove says it twice.** The page's own `favorites.UPDATE_FAILED` toast *and* the shell's fallback
 *   `toasts.MUTATION_FAILED` + `toasts.REASONS.*` (`core/components/common/mutation-error-toaster.tsx:44-56`,
 *   `core/lib/utils/error-feedback.ts:153-172`): 404 → "This item no longer exists. Refresh the page.", 500 →
 *   "The server could not complete it. Try again in a moment." (probes P6, Q6). A failed mutation also prints
 *   `Mutation failed:` in the dev console (`mutation-error-toaster.tsx:47-49`) — dev-only noise, excused here **only** in the
 *   test that arms the refusal, and only for the two armed messages.
 * 6. **A favourites read that failed is never shown as "no favourites"**: the Notice with one Try again, no kind section, no
 *   empty state, no skeleton (probes Q5, T3). The sidebar keeps its own row to the page (`sidebar-favorites.tsx:79`) and shows
 *   no `favorites.NONE`, because `isEmpty` requires the favourites to have *arrived* (`use-favorite-entries.ts:227`); probe U1:
 *   the sidebar there reads `Favorites · All favorites` and nothing else of the group.
 * 7. Two reads go out for the sidebar's sake even when the person has no favourites at all: `GET /api/organization-projects`
 *   (the sidebar's own project owner, `app-sidebar.tsx:139`) and the Docs availability probe
 *   `GET /api/plugins/docs/documents/count` (`app-sidebar.tsx:121`, `use-favorite-entries.ts:125`); the per-kind sources stay
 *   silent (probe R3).
 * 8. A row's printed name carries what its mark draws: the project tile's initials before the name ("FPFixture Project"),
 *   `#1` for the active team's task (its fixture row has `number: 1` and no `taskNumber`,
 *   `cypress/support/mock-gauzy-server.mjs:183-186`, and `favorites-page.tsx:24` takes `taskNumber ?? number`) and `#PROBE-77`
 *   for another team's. The `<h2>` caption and its count are one accessible name with no space: "Projects3". The archived
 *   badge is the opposite, being its own element with an icon: the link's name joins the two with a space
 *   ("Probe Beta Project Archived", `favorites-page.tsx:34-42`, the page's accessibility snapshot of log s3-9).
 *
 * ## Not covered here
 *
 * Starring from an item's own page and the remove that follows (`suites/mock/favorites.spec.ts`), the signed-out redirect
 * (`suites/lane-b/session-routing.spec.ts`), the app's own `app/api/favorite/…` route handlers (their `route.test.ts` files),
 * the optimistic add and its rollback as such (`core/hooks/favorites/use-favorite-toggle.test.tsx`), the grouping rules as
 * such (`core/lib/utils/favorites.test.ts`), the pages a row links to (this file checks only where a link goes), the
 * `FavoriteStarButton` / `FavoriteMark` of other pages, and a failed **chat** favourite (`favorite-parts.tsx:104` — refusals
 * are armed for `/favorite` only).
 */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	favorites: {
		TITLE: string;
		DESCRIPTION: string;
		REMOVE: string;
		REMOVE_NAMED: string;
		ALL: string;
		NONE: string;
		EMPTY_TITLE: string;
		EMPTY_DESCRIPTION: string;
		UNAVAILABLE: string;
		UNAVAILABLE_HINT: string;
		UNAVAILABLE_ITEM: string;
		ARCHIVED: string;
		UPDATE_FAILED: string;
		LOAD_FAILED: string;
		RETRY: string;
		kinds: Record<string, string>;
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};
const T = EN.favorites;

/** `favorites.REMOVE_NAMED` is `Remove {name} from favorites`; what next-intl renders for one name. */
const removeNamed = (name: string) => T.REMOVE_NAMED.replace('{name}', name);
/** `favorites.UNAVAILABLE_ITEM` is an ICU `{kind, select, …}`; the arm this file needs, read out of the same value. */
const unavailableCopy = (kind: string) => {
	const arm = new RegExp(`\\b${kind} \\{([^}]*)\\}`).exec(T.UNAVAILABLE_ITEM);
	if (!arm) throw new Error(`favorites.UNAVAILABLE_ITEM has no "${kind}" arm: ${T.UNAVAILABLE_ITEM}`);
	return arm[1];
};

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const PROJECT_A = 'a0a0a0a0-0000-4000-8000-00000000000a';
const PROJECT_ARCHIVED = 'a0a0a0a0-0000-4000-8000-00000000000b';
const PROJECT_GONE = 'a0a0a0a0-0000-4000-8000-00000000000c';
const TASK_OTHER = '77777777-0000-4777-8777-00000000000d';
const TASK_GONE = '77777777-0000-4777-8777-00000000000e';
const DOC_A = 'd0d0d0d0-0000-4000-8000-00000000000f';
const DOC_B = 'd0d0d0d0-0000-4000-8000-000000000011';
const DOC_GONE = 'd0d0d0d0-0000-4000-8000-000000000010';
const CHAT_A = 'probe-chat-a';
const CHAT_GONE = 'probe-chat-gone';

const NAME_PROJECT_FIXTURE = 'Fixture Project';
const NAME_PROJECT_A = 'Probe Alpha Project';
const NAME_PROJECT_ARCHIVED = 'Probe Beta Project';
const NAME_TASK_OTHER = 'Probe Other Team Task';
const NAME_DOC_A = 'Probe Doc Page';
const NAME_CHAT_A = 'Probe Channel';

/** A favourite row, in the shape `favoriteSchema` accepts (`core/types/schemas/favorite/favorite.schema.ts:22-38`). */
const favId = (n: number) => `dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}`;
const FAV_FIXTURE_PROJECT = favId(1);
const FAV_ALPHA = favId(2);
const FAV_ARCHIVED = favId(3);
const FAV_GONE_PROJECT = favId(4);
const FAV_TEAM_TASK = favId(5);
const FAV_TASK_OTHER = favId(6);
const FAV_TASK_GONE = favId(7);
const FAV_DOC_A = favId(8);
const FAV_DOC_GONE = favId(9);

type Call = { method: string; path: string; query: string; body: string | null };

type Refusals = {
	/** `GET /api/favorite/employee` answers this status instead of the list. */
	favoritesList?: number;
	/** `DELETE /api/favorite/<id>` answers this status; the store keeps the favourite. */
	deleteStatus?: number;
	deleteMessage?: string;
	/** Hold every `DELETE` this long in the stub before answering, so a test can read the page while it is still open. */
	deleteHoldMs?: number;
};

type ServeOptions = {
	favorites: Array<Record<string, unknown>>;
	projects: Array<Record<string, unknown>>;
	pages: Array<Record<string, unknown>>;
	otherTasks: Array<Record<string, unknown>>;
	conversations: Array<Record<string, unknown>>;
	states: Array<Record<string, unknown>>;
	refuse?: Refusals;
};

type Harness = {
	/** Everything this stub was asked for, oldest first (`OPTIONS` preflights are not calls). */
	calls: () => Call[];
	callsOf: (method: string, path: string) => Call[];
	/** Distinct `METHOD PATH` pairs, sorted — concurrent reads arrive in race order, so the claim is about the set. */
	readPaths: () => string[];
	favoriteIds: () => string[];
	deleteRequested: () => string[];
	deleteAnswered: () => string[];
	/** Re-arms the DELETE refusal mid-test, so one case can see a 4xx and a 5xx. */
	armDeleteRefusal: (status: number, message: string) => void;
};

/**
 * Serves the favourites and every item they point at, on the mock origin (which handles none of them), store-backed: the
 * list answer is always the current store, so a remove changes what the next read answers.
 */
async function serveFavorites(page: Page, o: ServeOptions): Promise<Harness> {
	const store = {
		favorites: [...o.favorites],
		projects: [...o.projects],
		pages: [...o.pages],
		otherTasks: [...o.otherTasks],
		conversations: [...o.conversations],
		states: [...o.states]
	};
	const armed: { favoritesList?: number; deleteStatus?: number; deleteMessage?: string } = { ...(o.refuse ?? {}) };
	const calls: Call[] = [];
	const requested: string[] = [];
	const answered: string[] = [];
	const origin = new URL(MOCK_ORIGIN).origin;

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});
	const refusal = (route: Route, status: number, message: string) =>
		answer(route, status, { statusCode: status, message });
	const on = (re: RegExp, fn: (route: Route) => void | Promise<void>) =>
		page.route(
			(url) => url.origin === origin && re.test(url.pathname),
			(route) => {
				const request = route.request();
				const method = request.method();
				if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
				const url = new URL(request.url());
				calls.push({ method, path: url.pathname, query: url.search, body: request.postData() });
				return fn(route);
			}
		);

	// A favourite id is a uuid; the words 'employee' and 'type' are not, so these patterns cannot overlap.
	await on(/^\/api\/favorite\/[0-9a-f-]{36}$/, async (route) => {
		const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
		requested.push(id);
		if (armed.deleteStatus !== undefined)
			return refusal(route, armed.deleteStatus, armed.deleteMessage ?? 'refused');
		const hold = o.refuse?.deleteHoldMs ?? 0;
		if (hold > 0) await new Promise((done) => setTimeout(done, hold));
		const at = store.favorites.findIndex((favorite) => favorite.id === id);
		if (at >= 0) store.favorites.splice(at, 1);
		answered.push(id);
		return answer(route, 200, { affected: 1, raw: [] });
	});
	await on(/^\/api\/favorite\/employee$/, (route) => {
		if (armed.favoritesList !== undefined)
			return refusal(route, armed.favoritesList, 'Synthetic favorites refusal');
		return answer(route, 200, { items: store.favorites, total: store.favorites.length });
	});
	await on(/^\/api\/favorite\/type$/, (route) =>
		answer(route, 200, { items: store.otherTasks, total: store.otherTasks.length })
	);
	await on(/^\/api\/favorite$/, (route) => {
		const body = (route.request().postDataJSON() ?? {}) as Record<string, string>;
		const created = {
			id: randomUUID(),
			entity: body.entity,
			entityId: body.entityId,
			employeeId: body.employeeId,
			organizationId: body.organizationId,
			tenantId: body.tenantId
		};
		store.favorites.push(created);
		return answer(route, 201, created);
	});
	await on(/^\/api\/organization-projects$/, (route) =>
		answer(route, 200, { items: store.projects, total: store.projects.length })
	);
	// Reads of the pages a row links to. This file does not test those pages (see the header) — it only answers enough of
	// them that opening a row does not crash on the mock's catch-all. Registered before the two list reads below, which
	// Playwright then prefers over them (`page.route` matches the newest registration first).
	await on(/^\/api\/plugins\/docs\/documents\/([^/]+)$/, (route) => {
		const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
		const found = store.pages.find((doc) => doc.id === id);
		if (!found) return refusal(route, 404, 'this file serves no such page');
		return answer(route, 200, {
			...found,
			contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
			contentHtml: ''
		});
	});
	await on(/^\/api\/plugins\/docs\/documents\/([^/]+)\/path$/, (route) => answer(route, 200, []));
	await on(/^\/api\/plugins\/docs\/documents\/spaces$/, (route) => answer(route, 200, []));
	// `useChatBrowse` expects an array where the mock's catch-all answers `{items,total}`
	// (`core/services/client/api/chat/chat.service.ts:66-69`, `suites/lane-a/chat-list-unreads-threads-ui.spec.ts:350`).
	await on(/^\/api\/chat\/conversations\/[^/]+\/messages$/, (route) =>
		answer(route, 200, { messages: [], hasBefore: false, hasAfter: false })
	);
	await on(/^\/api\/chat\/conversations\/[^/]+\/files$/, (route) =>
		answer(route, 200, { files: [], hasMore: false })
	);
	await on(/^\/api\/chat\/conversations\/[^/]+\/members$/, (route) => answer(route, 200, []));
	await on(/^\/api\/chat\/conversations\/[^/]+$/, (route) => {
		const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
		const found = store.conversations.find((conversation) => conversation.id === id);
		if (!found) return refusal(route, 404, 'this file serves no such conversation');
		return answer(route, 200, found);
	});
	await on(/^\/api\/chat\/conversations\/browse$/, (route) => answer(route, 200, []));
	await on(/^\/api\/plugins\/docs\/documents\/count$/, (route) => answer(route, 200, store.pages.length));
	await on(/^\/api\/plugins\/docs\/documents$/, (route) =>
		answer(route, 200, { items: store.pages, total: store.pages.length })
	);
	await on(/^\/api\/chat\/states$/, (route) => answer(route, 200, { states: store.states, threads: [] }));
	await on(/^\/api\/chat\/conversations$/, (route) =>
		answer(route, 200, { conversations: store.conversations, categories: [] })
	);
	await on(/^\/api\/chat\/people$/, (route) => answer(route, 200, []));
	await on(/^\/api\/chat\/conversations\/[^/]+\/state$/, (route) => {
		const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/')[4] ?? '');
		const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
		store.states = store.states.map((s) => (String(s.conversationId) === id ? { ...s, ...body } : s));
		store.conversations = store.conversations.map((c) =>
			c.id === id && c.state ? { ...c, state: { ...(c.state as Record<string, unknown>), ...body } } : c
		);
		return answer(route, 200, {
			state: store.states.find((s) => String(s.conversationId) === id) ?? null,
			events: []
		});
	});

	return {
		calls: () => calls,
		callsOf: (method, path) => calls.filter((c) => c.method === method && c.path === path),
		readPaths: () => [...new Set(calls.map((c) => `${c.method} ${c.path}`))].sort(),
		favoriteIds: () => store.favorites.map((f) => String(f.id)),
		deleteRequested: () => requested,
		deleteAnswered: () => answered,
		armDeleteRefusal: (status, message) => {
			armed.deleteStatus = status;
			armed.deleteMessage = message;
		}
	};
}

/** One listed project, in the shape `organizationProjectSchema` accepts (see the header). */
const projectRow = (fixture: BootstrapFixture, id: string, name: string, isArchived = false) => ({
	id,
	name,
	public: true,
	owner: null,
	code: null,
	tenantId: fixture.ids.tenantA,
	organizationId: fixture.ids.organizationA,
	isArchived,
	members: [],
	teams: [],
	tags: []
});

/** One docs-tree row (`suites/lane-c/docs-home-ui.spec.ts:269-296`); a list row carries no content. */
const docRow = (fixture: BootstrapFixture, id: string, name: string) => ({
	id,
	tenantId: fixture.ids.tenantA,
	organizationId: fixture.ids.organizationA,
	kind: 'PAGE',
	parentId: null,
	index: 0,
	name,
	icon: null,
	color: null,
	description: null,
	visibility: 'ORGANIZATION',
	organizationTeamId: null,
	isArchived: false,
	archivedAt: null,
	createdByUserId: fixture.ids.user,
	createdAt: '2026-01-05T09:00:00.000Z',
	updatedAt: '2026-01-05T09:00:00.000Z',
	version: 1
});

/** A favourite task of another team, as `GET /favorite/type` answers it (`favoriteTaskSchema`, `favorite.schema.ts:44-57`). */
const otherTaskRow = () => ({
	id: TASK_OTHER,
	title: NAME_TASK_OTHER,
	number: 77,
	prefix: 'PROBE',
	taskNumber: 'PROBE-77',
	issueType: 'Bug',
	status: 'in-progress'
});

/** `IChatConversationWithState` as `GET /api/chat/conversations` answers it (the row shape of `suites/lane-a/chat-list-unreads-threads-ui.spec.ts:217-235`). */
const chatRow = (id: string, name: string, isFavorite = true) => ({
	id,
	kind: 'CHANNEL',
	name,
	topic: null,
	visibility: 'ORGANIZATION',
	categoryId: null,
	position: 0,
	isDefault: false,
	archivedAt: null,
	createdByEmployeeId: null,
	messageCount: 1,
	lastMessageAt: null,
	organizationId: null,
	createdAt: '2026-01-05T09:00:00.000Z',
	memberCount: 1,
	state: chatState(id, isFavorite)
});

/** One `GET /api/chat/states` row; `isFavorite` is what the Favorites page counts (`use-chat-conversations.ts`, `useChatStates`). */
function chatState(conversationId: string, isFavorite: boolean) {
	return {
		conversationId,
		role: 'MEMBER',
		notifyLevel: 'DEFAULT',
		isFavorite,
		unreadCount: 0,
		mentionCount: 0,
		lastReadMessageId: null,
		lastReadAt: null
	};
}

const favRow = (id: string, entity: string, entityId: string, fixture: BootstrapFixture) => ({
	id,
	entity,
	entityId,
	employeeId: fixture.ids.employee,
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA
});

/** Every kind starred: three projects (one archived, one gone), two tasks of this team's and another's (one gone), two docs
 * (one gone) and a starred conversation whose conversation is not in the list. */
const starredEverything = (fixture: BootstrapFixture) => [
	favRow(FAV_FIXTURE_PROJECT, 'OrganizationProject', fixture.ids.project, fixture),
	favRow(FAV_ALPHA, 'OrganizationProject', PROJECT_A, fixture),
	favRow(FAV_ARCHIVED, 'OrganizationProject', PROJECT_ARCHIVED, fixture),
	favRow(FAV_GONE_PROJECT, 'OrganizationProject', PROJECT_GONE, fixture),
	favRow(FAV_TEAM_TASK, 'Task', fixture.ids.task, fixture),
	favRow(FAV_TASK_OTHER, 'Task', TASK_OTHER, fixture),
	favRow(FAV_TASK_GONE, 'Task', TASK_GONE, fixture),
	favRow(FAV_DOC_A, 'Document', DOC_A, fixture),
	favRow(FAV_DOC_GONE, 'Document', DOC_GONE, fixture)
];

const servedProjects = (fixture: BootstrapFixture) => [
	projectRow(fixture, fixture.ids.project, NAME_PROJECT_FIXTURE),
	projectRow(fixture, PROJECT_A, NAME_PROJECT_A),
	projectRow(fixture, PROJECT_ARCHIVED, NAME_PROJECT_ARCHIVED, true)
];

/** Two pages in the tree, only one of them a favourite: the Docs section counts one. */
const servedPages = (fixture: BootstrapFixture) => [
	docRow(fixture, DOC_A, NAME_DOC_A),
	docRow(fixture, DOC_B, 'Probe Second Page')
];

const servedChat = () => ({
	conversations: [chatRow(CHAT_A, NAME_CHAT_A)],
	states: [chatState(CHAT_A, true), chatState(CHAT_GONE, true)]
});

/** The whole lane's worth of stubs for a person who starred something of every kind. */
const serveEverything = async (page: Page, fixture: BootstrapFixture, refuse?: Refusals): Promise<Harness> =>
	serveFavorites(page, {
		favorites: starredEverything(fixture),
		projects: servedProjects(fixture),
		pages: servedPages(fixture),
		otherTasks: [otherTaskRow()],
		...servedChat(),
		...(refuse ? { refuse } : {})
	});

/** Chat is off on this lane; a test that needs the Chat section switches it in its own browser only. */
const turnChatOn = (page: Page) => overrideRuntimeEnv(page, { NEXT_PUBLIC_CHAT_ENABLED: 'true' });

/** The `<section>` a heading belongs to, so a claim is about one list and not about the page. */
const section = (page: Page, heading: string) =>
	page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) });

const sidebar = (page: Page) => page.locator('[data-sidebar="sidebar"]');

/** The kind captions with the count each `<h2>` prints next to them, in document order ("Projects3"). */
const sectionHeads = (page: Page) =>
	page
		.locator('main section h2')
		.evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim()));

const rowTexts = (page: Page, heading: string) =>
	section(page, heading)
		.locator('li')
		.evaluateAll((lis) => lis.map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim()));

/** `mutation-error-toaster.tsx:47` prints `Mutation failed:` for every failed mutation in dev mode; the shell's store warning is not this page's. */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const DEV_MUTATION_NOISE = 'Mutation failed:';

/**
 * Console errors left after the shell noise, and after the lines **this test named** (only a test that armed a refusal may
 * name one; `expected` is empty everywhere else). An empty list is the claim.
 */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !(line.includes(DEV_MUTATION_NOISE) && expected.some((text) => line.includes(text))))
		.filter((line) => !expected.some((text) => line.includes(text)));

/**
 * The printed number of a task the shell reads itself (`GET /api/tasks/team`, served by the mock,
 * `mock-gauzy-server.mjs:677-678`), read off that answer: `favorites-page.tsx:24` prints `taskNumber ?? number`.
 */
const servedTaskNumber = (page: Page, taskId: string) =>
	new Promise<string>((resolve) => {
		page.on('response', async (response) => {
			if (new URL(response.url()).pathname !== '/api/tasks/team' || response.request().method() !== 'GET') return;
			const body = (await response.json().catch(() => null)) as {
				items?: Array<{ id: string; taskNumber?: string | null; number?: number }>;
			} | null;
			const task = body?.items?.find((item) => item.id === taskId);
			if (task) resolve(String(task.taskNumber ?? task.number));
		});
	});

const measure = (label: string, seen: Record<string, unknown>) => {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c favorites] MEASURE ${label} · ${parts}`);
};

const ALL_HEADS = [
	`${T.kinds.PROJECT}3`,
	`${T.kinds.TASK}2`,
	`${T.kinds.DOCUMENT}1`,
	`${T.kinds.CHAT}1`,
	T.UNAVAILABLE
];

/** The settled page: the other team's task and its gone twin have arrived (note 2). */
const waitUntilSettled = async (page: Page) => {
	await expect(page.getByText(unavailableCopy('task'), { exact: true })).toBeVisible({ timeout: 30_000 });
	await expect(section(page, T.kinds.CHAT).getByRole('link', { name: NAME_CHAT_A })).toBeVisible({ timeout: 30_000 });
};

test.describe('favorites page UI (lane-c)', () => {
	test("lists every kind the person starred, in the page's order, each row as printed", async ({
		page,
		fixture,
		shield
	}) => {
		await turnChatOn(page);
		const served = await serveEverything(page, fixture);
		const teamTaskNumber = servedTaskNumber(page, fixture.ids.task);
		await signInAndVisit(page, fixture, '/favorites');
		await waitUntilSettled(page);

		await expect.poll(() => sectionHeads(page)).toEqual(ALL_HEADS);

		const projects = section(page, T.kinds.PROJECT);
		await expect(projects.getByRole('link', { name: NAME_PROJECT_FIXTURE })).toHaveAttribute(
			'href',
			`/projects/${fixture.ids.project}`
		);
		await expect(projects.getByRole('link', { name: NAME_PROJECT_A })).toHaveAttribute(
			'href',
			`/projects/${PROJECT_A}`
		);
		await expect(projects.getByRole('link', { name: NAME_PROJECT_ARCHIVED })).toHaveAttribute(
			'href',
			`/projects/${PROJECT_ARCHIVED}`
		);
		// `favorites.ARCHIVED` is drawn inside the archived project's link (`favorites-page.tsx:37-42`), so the badge counts
		// once on the page and the link's own accessible name carries it too: the badge is its own element, so the name
		// joins the two with a space ("Probe Beta Project Archived" — the page's accessibility snapshot, log s3-9).
		await expect(projects.getByText(T.ARCHIVED, { exact: true })).toHaveCount(1);
		await expect(projects.getByRole('link', { name: `${NAME_PROJECT_ARCHIVED} ${T.ARCHIVED}` })).toHaveCount(1);

		const tasks = section(page, T.kinds.TASK);
		await expect(tasks.getByRole('link', { name: fixture.names.task })).toHaveAttribute(
			'href',
			`/task/${fixture.ids.task}`
		);
		await expect(tasks.getByText(`#${await teamTaskNumber}`, { exact: true })).toHaveCount(1);
		await expect(tasks.getByRole('link', { name: NAME_TASK_OTHER })).toHaveAttribute('href', `/task/${TASK_OTHER}`);
		await expect(tasks.getByText(`#${otherTaskRow().taskNumber}`, { exact: true })).toHaveCount(1);

		await expect(section(page, T.kinds.DOCUMENT).getByRole('link', { name: NAME_DOC_A })).toHaveAttribute(
			'href',
			`/docs/${DOC_A}`
		);
		await expect(section(page, T.kinds.CHAT).getByRole('link', { name: NAME_CHAT_A })).toHaveAttribute(
			'href',
			`/chat/${CHAT_A}`
		);

		// Each star says which item it removes (`favorites-page.tsx:47`).
		await expect(projects.getByRole('button', { name: removeNamed(NAME_PROJECT_A) })).toHaveCount(1);
		await expect(tasks.getByRole('button', { name: removeNamed(NAME_TASK_OTHER) })).toHaveCount(1);
		await expect(
			section(page, T.kinds.DOCUMENT).getByRole('button', { name: removeNamed(NAME_DOC_A) })
		).toHaveCount(1);
		await expect(section(page, T.kinds.CHAT).getByRole('button', { name: removeNamed(NAME_CHAT_A) })).toHaveCount(
			1
		);

		// The gone favourites, one per kind, in the order of FAVORITE_KINDS (`favorites.ts:9`, `:122-134`).
		await expect
			.poll(() => rowTexts(page, T.UNAVAILABLE))
			.toEqual([
				unavailableCopy('project'),
				unavailableCopy('task'),
				unavailableCopy('document'),
				unavailableCopy('chat')
			]);

		// The sidebar lists the same favourites — without the archived project (`sidebar-favorites.tsx:50`) and without the
		// gone ones — and ends with its own row to this page.
		const nav = sidebar(page);
		await expect(nav.getByRole('link', { name: NAME_CHAT_A })).toBeVisible({ timeout: 30_000 });
		await expect(nav.getByRole('link', { name: NAME_PROJECT_A })).toHaveCount(1);
		await expect(nav.getByRole('link', { name: NAME_PROJECT_ARCHIVED })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: T.ALL })).toHaveAttribute('href', '/favorites');
		for (const kind of ['project', 'task', 'document'])
			await expect(nav.getByText(unavailableCopy(kind), { exact: true })).toHaveCount(0);

		// Every read the page sends, as a set (a dev mount may ask twice, so a count is not the claim).
		await expect
			.poll(() => served.readPaths(), { timeout: 30_000 })
			.toEqual([
				'GET /api/chat/conversations',
				'GET /api/chat/people',
				'GET /api/chat/states',
				'GET /api/favorite/employee',
				'GET /api/favorite/type',
				'GET /api/organization-projects',
				'GET /api/plugins/docs/documents',
				'GET /api/plugins/docs/documents/count'
			]);
		const employeeQuery = new URLSearchParams(served.callsOf('GET', '/api/favorite/employee')[0].query);
		expect(employeeQuery.get('where[employeeId]')).toBe(fixture.ids.employee);
		expect(employeeQuery.get('where[organizationId]')).toBe(fixture.ids.organizationA);
		expect(employeeQuery.get('where[tenantId]')).toBe(fixture.ids.tenantA);
		expect(new URLSearchParams(served.callsOf('GET', '/api/favorite/type')[0].query).get('where[entity]')).toBe(
			'Task'
		);

		measure('all kinds', {
			heads: await sectionHeads(page),
			taskRows: await rowTexts(page, T.kinds.TASK),
			unavailable: await rowTexts(page, T.UNAVAILABLE)
		});
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('a row of each kind opens that item', async ({ page, fixture, shield }) => {
		await turnChatOn(page);
		await serveEverything(page, fixture);
		await signInAndVisit(page, fixture, '/favorites');

		const opened: Record<string, string> = {};
		for (const [heading, name, part] of [
			[T.kinds.PROJECT, NAME_PROJECT_A, `/projects/${PROJECT_A}`],
			[T.kinds.TASK, NAME_TASK_OTHER, `/task/${TASK_OTHER}`],
			[T.kinds.DOCUMENT, NAME_DOC_A, `/docs/${DOC_A}`],
			[T.kinds.CHAT, NAME_CHAT_A, `/chat/${CHAT_A}`]
		]) {
			const link = section(page, heading).getByRole('link', { name });
			await expect(link).toBeVisible({ timeout: 30_000 });
			await link.click({ timeout: 15_000 });
			// The address the click landed on, polled (`favorites-page.tsx:29` hands the row its `entry.href`).
			await expect.poll(() => page.url(), { timeout: 25_000 }).toContain(part);
			opened[heading] = new URL(page.url()).pathname;
			await page.goBack({ waitUntil: 'domcontentloaded' });
		}
		expect(opened).toEqual({
			[T.kinds.PROJECT]: `/projects/${PROJECT_A}`,
			[T.kinds.TASK]: `/task/${TASK_OTHER}`,
			[T.kinds.DOCUMENT]: `/docs/${DOC_A}`,
			[T.kinds.CHAT]: `/chat/${CHAT_A}`
		});
		measure('row targets', opened);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test("a row's star removes it at once, before the platform answers", async ({ page, fixture, shield }) => {
		// The stub holds every DELETE 4 s before answering (a delay in the stub, not a wait in the test), so the page can be
		// read while the request is still open.
		const served = await serveEverything(page, fixture, { deleteHoldMs: 4_000 });
		await turnChatOn(page);
		await signInAndVisit(page, fixture, '/favorites');
		await waitUntilSettled(page);

		const docs = section(page, T.kinds.DOCUMENT);
		const nav = sidebar(page);
		// The favourites live in the sidebar's own sub-list (`nav-main.tsx:248` `SidebarMenuSub`, `sidebar.tsx:620`
		// `data-sidebar="menu-sub"`); the sidebar also has a top-level Docs nav row of its own (the page's accessibility snapshot,
		// log s3-9: `link "Docs"` next to Home / Chat / Calendar), so the favourites caption is read inside that sub-list only.
		const favList = nav.locator('[data-sidebar="menu-sub"]');
		await expect(favList.getByText(T.kinds.DOCUMENT, { exact: true })).toHaveCount(1);
		await docs.getByRole('button', { name: removeNamed(NAME_DOC_A) }).click({ timeout: 15_000 });
		await expect.poll(() => served.deleteRequested(), { timeout: 20_000 }).toEqual([FAV_DOC_A]);
		// The answer has not arrived and the row is already out of the page and out of the sidebar (`use-favorite-toggle.ts:69-72`).
		expect(served.deleteAnswered()).toEqual([]);
		await expect(docs.getByRole('link', { name: NAME_DOC_A })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: NAME_DOC_A })).toHaveCount(0);
		// It was the only document favourite, so the whole section is gone (`favorites-page.tsx:173-175`, `favorites.ts:145`).
		await expect(section(page, T.kinds.DOCUMENT)).toHaveCount(0);
		// Still unanswered once all three are gone, so they left before the platform answered, not after.
		expect(served.deleteAnswered()).toEqual([]);

		await expect.poll(() => served.deleteAnswered(), { timeout: 25_000 }).toEqual([FAV_DOC_A]);
		expect(served.favoriteIds()).not.toContain(FAV_DOC_A);
		await expect
			.poll(() => sectionHeads(page))
			.toEqual([`${T.kinds.PROJECT}3`, `${T.kinds.TASK}2`, `${T.kinds.CHAT}1`, T.UNAVAILABLE]);
		// The sidebar list followed without a reload: its Docs caption and its row left with the entry, and the row to the
		// page is still there (`sidebar-favorites.tsx:56-58` skips a group with no entries, `:79` always lists `favorites.ALL`).
		await expect(favList.getByRole('link', { name: T.ALL })).toBeVisible({ timeout: 20_000 });
		await expect(favList.getByText(T.kinds.DOCUMENT, { exact: true })).toHaveCount(0);
		await expect(favList.getByText(T.kinds.CHAT, { exact: true })).toHaveCount(1);

		measure('optimistic remove', {
			deletes: served.deleteRequested(),
			heads: await sectionHeads(page),
			sidebarStillHasDoc: (await nav.innerText()).includes(NAME_DOC_A)
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a refused remove puts the row back and says it failed', async ({ page, fixture, shield }) => {
		await turnChatOn(page);
		const served = await serveEverything(page, fixture, {
			deleteStatus: 404,
			deleteMessage: 'Synthetic missing favorite'
		});
		await signInAndVisit(page, fixture, '/favorites');
		await waitUntilSettled(page);

		const tasks = section(page, T.kinds.TASK);
		const otherTask = tasks.getByRole('link', { name: NAME_TASK_OTHER });
		await tasks.getByRole('button', { name: removeNamed(NAME_TASK_OTHER) }).click({ timeout: 15_000 });
		await expect.poll(() => served.deleteRequested(), { timeout: 20_000 }).toEqual([FAV_TASK_OTHER]);
		await expect(page.getByText(T.UPDATE_FAILED, { exact: true })).toBeVisible({ timeout: 20_000 });
		// The shell's fallback says the same in its own words (`mutation-error-toaster.tsx:53-56`).
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(EN.toasts.REASONS.NOT_FOUND, { exact: true })).toBeVisible({ timeout: 20_000 });
		// The rollback (`use-favorite-toggle.ts:88-95`): the row is back on the page and in the sidebar, and it is still served.
		await expect(otherTask).toBeVisible({ timeout: 20_000 });
		await expect(sidebar(page).getByRole('link', { name: NAME_TASK_OTHER })).toBeVisible({ timeout: 20_000 });
		expect(served.favoriteIds()).toContain(FAV_TASK_OTHER);

		// The same removal refused by the server: another reason in words, the same rollback.
		served.armDeleteRefusal(500, 'Synthetic favorites refusal');
		const docs = section(page, T.kinds.DOCUMENT);
		const docLink = docs.getByRole('link', { name: NAME_DOC_A });
		await docs.getByRole('button', { name: removeNamed(NAME_DOC_A) }).click({ timeout: 15_000 });
		await expect.poll(() => served.deleteRequested(), { timeout: 20_000 }).toEqual([FAV_TASK_OTHER, FAV_DOC_A]);
		await expect(page.getByText(EN.toasts.REASONS.SERVER, { exact: true })).toBeVisible({ timeout: 20_000 });
		await expect(docLink).toBeVisible({ timeout: 20_000 });
		expect(served.favoriteIds()).toContain(FAV_DOC_A);

		// Parked pointer, so the toaster's countdown is running (`brief`: a toaster pauses on hover).
		await page.mouse.move(2, 2);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		await expect.poll(() => sectionHeads(page)).toEqual(ALL_HEADS);

		measure('refused remove', {
			deletes: served.deleteRequested(),
			consoleErrors: shield.consoleErrors().map((l) => l.slice(0, 120))
		});
		// Only the two refusals this test armed are excused, each by the line it prints.
		expect(
			consoleFindings(shield, [
				`[ERROR] [HttpClient] HTTP Error: DELETE /favorite/${FAV_TASK_OTHER} 404`,
				`[ERROR] [HttpClient] HTTP Error: DELETE /favorite/${FAV_DOC_A} 500`,
				'Mutation failed: ApiError: Synthetic missing favorite',
				'Mutation failed: ApiError: Synthetic favorites refusal'
			])
		).toEqual([]);
	});

	test('two removes at once: both go out, the favourites are read again once', async ({ page, fixture, shield }) => {
		await turnChatOn(page);
		const served = await serveEverything(page, fixture, { deleteHoldMs: 4_000 });
		await signInAndVisit(page, fixture, '/favorites');
		await waitUntilSettled(page);

		const projects = section(page, T.kinds.PROJECT);
		const tasks = section(page, T.kinds.TASK);
		const nav = sidebar(page);
		const readsBefore = served.callsOf('GET', '/api/favorite/employee').length;

		await projects.getByRole('button', { name: removeNamed(NAME_PROJECT_A) }).click({ timeout: 15_000 });
		await tasks.getByRole('button', { name: removeNamed(NAME_TASK_OTHER) }).click({ timeout: 15_000 });
		// Two different items: the guard of `use-favorite-toggle.ts:111-124` holds back only the *same* item, and neither row waits.
		await expect.poll(() => served.deleteRequested(), { timeout: 20_000 }).toEqual([FAV_ALPHA, FAV_TASK_OTHER]);
		expect(served.deleteAnswered()).toEqual([]);
		await expect(projects.getByRole('link', { name: NAME_PROJECT_A })).toHaveCount(0);
		await expect(tasks.getByRole('link', { name: NAME_TASK_OTHER })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: NAME_PROJECT_A })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: NAME_TASK_OTHER })).toHaveCount(0);
		// Both still unanswered once the four are gone: neither row waited for its answer.
		expect(served.deleteAnswered()).toEqual([]);

		await expect.poll(() => served.deleteAnswered(), { timeout: 25_000 }).toEqual([FAV_ALPHA, FAV_TASK_OTHER]);
		// The re-read waits for the person's last change (`use-favorite-toggle.ts:99-104`): one read for the two writes.
		await expect
			.poll(() => served.callsOf('GET', '/api/favorite/employee').length, { timeout: 25_000 })
			.toBe(readsBefore + 1);
		await expect
			.poll(() => sectionHeads(page))
			.toEqual([
				`${T.kinds.PROJECT}2`,
				`${T.kinds.TASK}1`,
				`${T.kinds.DOCUMENT}1`,
				`${T.kinds.CHAT}1`,
				T.UNAVAILABLE
			]);
		expect(served.favoriteIds()).not.toContain(FAV_ALPHA);
		expect(served.favoriteIds()).not.toContain(FAV_TASK_OTHER);

		// The same item cannot be removed twice from this page: both its controls (page and sidebar) are gone with the
		// optimistic change (note 4), so a second click on it has nothing to hit and no fourth request is sent.
		await expect(projects.getByRole('link', { name: NAME_PROJECT_FIXTURE })).toBeVisible({ timeout: 20_000 });
		await expect(nav.getByRole('button', { name: removeNamed(NAME_PROJECT_FIXTURE) })).toBeVisible({
			timeout: 20_000
		});
		await projects.getByRole('button', { name: removeNamed(NAME_PROJECT_FIXTURE) }).click({ timeout: 15_000 });
		await expect
			.poll(() => served.deleteRequested(), { timeout: 20_000 })
			.toEqual([FAV_ALPHA, FAV_TASK_OTHER, FAV_FIXTURE_PROJECT]);
		await expect(projects.getByRole('button', { name: removeNamed(NAME_PROJECT_FIXTURE) })).toHaveCount(0);
		await expect(nav.getByRole('button', { name: removeNamed(NAME_PROJECT_FIXTURE) })).toHaveCount(0);
		await expect.poll(() => served.deleteAnswered(), { timeout: 25_000 }).toHaveLength(3);
		expect(served.deleteRequested()).toHaveLength(3);

		measure('two removes', {
			deletes: served.deleteRequested(),
			readsBefore,
			readsAfter: served.callsOf('GET', '/api/favorite/employee').length,
			heads: await sectionHeads(page)
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the No longer available group lists each gone favourite and removes it', async ({
		page,
		fixture,
		shield
	}) => {
		await turnChatOn(page);
		const served = await serveEverything(page, fixture);
		await signInAndVisit(page, fixture, '/favorites');
		await waitUntilSettled(page);

		const gone = section(page, T.UNAVAILABLE);
		await expect(gone.getByText(T.UNAVAILABLE_HINT, { exact: true })).toBeVisible({ timeout: 30_000 });
		await expect
			.poll(() => rowTexts(page, T.UNAVAILABLE))
			.toEqual([
				unavailableCopy('project'),
				unavailableCopy('task'),
				unavailableCopy('document'),
				unavailableCopy('chat')
			]);
		// A gone favourite has no name and no link to offer: only `favorites.REMOVE` (`favorites-page.tsx:87-97`).
		await expect(gone.getByRole('button', { name: T.REMOVE })).toHaveCount(4);
		await expect(gone.locator('a')).toHaveCount(0);

		await gone.getByRole('button', { name: T.REMOVE }).first().click({ timeout: 15_000 });
		await expect.poll(() => served.deleteRequested(), { timeout: 20_000 }).toEqual([FAV_GONE_PROJECT]);
		await expect
			.poll(() => rowTexts(page, T.UNAVAILABLE), { timeout: 25_000 })
			.toEqual([unavailableCopy('task'), unavailableCopy('document'), unavailableCopy('chat')]);
		expect(served.favoriteIds()).not.toContain(FAV_GONE_PROJECT);

		// The gone conversation is a chat membership, so its Remove is a chat write, not a `/favorite` delete (note 3).
		await gone.getByRole('button', { name: T.REMOVE }).last().click({ timeout: 15_000 });
		await expect
			.poll(
				() =>
					served
						.calls()
						.filter((c) => c.method === 'PATCH')
						.map((c) => c.path),
				{ timeout: 25_000 }
			)
			.toEqual([`/api/chat/conversations/${CHAT_GONE}/state`]);
		expect(served.deleteRequested()).toEqual([FAV_GONE_PROJECT]);
		await expect
			.poll(() => rowTexts(page, T.UNAVAILABLE), { timeout: 25_000 })
			.toEqual([unavailableCopy('task'), unavailableCopy('document')]);

		measure('unavailable', { remaining: await rowTexts(page, T.UNAVAILABLE), deletes: served.deleteRequested() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('Docs off and chat off hide both kinds and their reads', async ({ page, fixture, shield }) => {
		// The lane serves Docs on; this test switches it off in its own browser only (note 1) and leaves chat off.
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_DOCS_ENABLED: 'false' });
		const served = await serveEverything(page, fixture);
		await signInAndVisit(page, fixture, '/favorites');
		await expect(page.getByText(unavailableCopy('task'), { exact: true })).toBeVisible({ timeout: 30_000 });

		const payloadDocs = await page.evaluate(() => {
			const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '{}';
			return (JSON.parse(raw) as Record<string, string>).NEXT_PUBLIC_DOCS_ENABLED ?? null;
		});
		expect(payloadDocs, 'the lane still publishes Docs on; only this browser switched it off').toBe('true');

		await expect.poll(() => sectionHeads(page)).toEqual([`${T.kinds.PROJECT}3`, `${T.kinds.TASK}2`, T.UNAVAILABLE]);
		// A document favourite is listed nowhere when Docs is off (`use-favorite-entries.ts:159-167`, `:202`), and so is a
		// starred conversation while chat is off (`:168-177`).
		await expect(page.getByText(NAME_DOC_A, { exact: true })).toHaveCount(0);
		await expect(page.getByText(NAME_CHAT_A, { exact: true })).toHaveCount(0);
		await expect
			.poll(() => rowTexts(page, T.UNAVAILABLE))
			.toEqual([unavailableCopy('project'), unavailableCopy('task')]);

		await expect.poll(() => served.readPaths(), { timeout: 30_000 }).toContain('GET /api/favorite/type');
		// quiet window 2 s: proves no docs and no chat read arrives although a document and a starred conversation are served
		await page.waitForTimeout(2_000);
		expect(served.calls().filter((c) => c.path.includes('/api/plugins/docs'))).toEqual([]);
		expect(served.calls().filter((c) => c.path.includes('/api/chat'))).toEqual([]);
		await expect(sidebar(page).getByRole('link', { name: T.ALL })).toBeVisible({ timeout: 20_000 });
		await expect(sidebar(page).getByRole('link', { name: NAME_DOC_A })).toHaveCount(0);

		measure('docs off chat off', { payloadDocs, heads: await sectionHeads(page), reads: served.readPaths() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a refused favourites read says so, retries, and is never shown as no favourites', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveEverything(page, fixture, { favoritesList: 500 });
		await signInAndVisit(page, fixture, '/favorites');

		const banner = page.getByText(T.LOAD_FAILED, { exact: true });
		await expect(banner).toBeVisible({ timeout: 60_000 });
		const retry = page.getByRole('button', { name: T.RETRY });
		await expect(retry).toHaveCount(1);
		// No kind section, no skeleton and — above all — no empty state (`use-favorite-entries.ts:227`, `:234`).
		await expect(page.locator('main section')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: T.EMPTY_TITLE, exact: true })).toHaveCount(0);
		await expect(page.locator('main [class*=animate-pulse]')).toHaveCount(0);
		// The sidebar keeps its own row to this page and does not claim there are no favourites (note 6).
		await expect(sidebar(page).getByRole('link', { name: T.ALL })).toBeVisible({ timeout: 30_000 });
		await expect(sidebar(page).getByText(T.NONE, { exact: true })).toHaveCount(0);

		const readsBefore = served.callsOf('GET', '/api/favorite/employee').length;
		await retry.click({ timeout: 15_000 });
		await expect
			.poll(() => served.callsOf('GET', '/api/favorite/employee').length, { timeout: 40_000 })
			.toBeGreaterThan(readsBefore);
		await expect(banner).toBeVisible({ timeout: 40_000 });
		await expect(page.locator('main section')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: T.EMPTY_TITLE, exact: true })).toHaveCount(0);

		measure('refused read', {
			readsBefore,
			readsAfter: served.callsOf('GET', '/api/favorite/employee').length
		});
		// The client logs each refused read itself (`core/services/logs/logger-adapter.service.ts`); this test armed it.
		expect(consoleFindings(shield, ['[ERROR] [HttpClient] HTTP Error: GET /favorite/employee'])).toEqual([]);
	});

	test('no favourites at all: the empty state, and only the reads a shell needs', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveFavorites(page, {
			favorites: [],
			projects: servedProjects(fixture),
			pages: servedPages(fixture),
			otherTasks: [otherTaskRow()],
			// Chat is off on this lane, so its states are never asked; nothing is starred in them either.
			conversations: [],
			states: []
		});
		await signInAndVisit(page, fixture, '/favorites');

		await expect(page.getByRole('heading', { name: T.EMPTY_TITLE, exact: true })).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText(T.EMPTY_DESCRIPTION, { exact: true })).toBeVisible({ timeout: 20_000 });
		await expect(page.locator('main').getByRole('link', { name: NAME_PROJECT_FIXTURE })).toHaveCount(0);
		await expect(section(page, T.UNAVAILABLE)).toHaveCount(0);
		await expect(sidebar(page).getByText(T.NONE, { exact: true })).toBeVisible({ timeout: 30_000 });

		await expect.poll(() => served.readPaths(), { timeout: 30_000 }).toContain('GET /api/favorite/employee');
		// quiet window 2 s: proves the per-kind sources stay unasked for a person with no favourites (note 7)
		await page.waitForTimeout(2_000);
		expect(served.readPaths()).toEqual([
			'GET /api/favorite/employee',
			'GET /api/organization-projects',
			'GET /api/plugins/docs/documents/count'
		]);

		measure('empty', { reads: served.readPaths() });
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});
});
