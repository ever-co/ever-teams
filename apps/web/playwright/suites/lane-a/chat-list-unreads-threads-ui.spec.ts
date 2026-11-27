import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	overrideRuntimeEnv,
	signInAndVisit,
	waitForShellReady,
	type BootstrapFixture
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The team chat's **left pane and its two whole-pane views**, driven in the browser on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:38`).
 *
 * ## What this drives
 *
 * - `app/[locale]/(main)/chat/page.tsx`, `chat/unreads/page.tsx`, `chat/threads/page.tsx`,
 *   `chat/[conversationId]/page.tsx` → `core/components/pages/chat/chat-page.tsx`: the flag gate (`:82-84`
 *   `router.replace('/')`, `:198` the skeleton while it navigates), the hook mounts (`:89` list, `:91` the open
 *   conversation, `:92` threads on the threads view only, `:93` browse on every view, `:105` states, `:80` presence),
 *   the auto-open of the remembered or first conversation (`:132-142` with `core/lib/utils/chat-navigation.ts:112-120`),
 *   the Unreads filter `list.conversations.filter(isUnread)` (`:200`), `markAllRead` (`:170-175`), the shortcuts
 *   (`:186-196`), the pane branches (`:237-304`: the conversation, `NOT_AVAILABLE_*` `:253-258`, `PICK_*` `:260-276`, the
 *   two views) and the list beside it (`:212-234`).
 * - `core/components/pages/chat/conversation-list.tsx`: the sections and their counts (`Section`, count `:170`), a row
 *   (`Row` `:48-95`: glyph, title, mention badge `:86-90`, unread badge only when `mentions === 0 && loud` `:91`,
 *   `loud = isUnread && !muted` `:71`), the Unreads / Threads place rows (`:308-309`), the search (`:271-292`; `Enter`
 *   `:228-235`, plain `Escape` `:222-227`, Clear `:281-291`), the flat filtered list (`:300-306`, `NO_CONVERSATIONS`
 *   `:302`), the empty sections (`NO_CHANNELS` `:336-345`, `NO_DIRECT` `:360-365`), the folded-section rule (`needsReader`
 *   `:240-241`) and the compact list error (`:312`). Order and grouping: `core/lib/utils/chat-list.ts:16-39` (archived
 *   dropped `:17`, a category with no channel dropped `:37`) over `core/lib/utils/chat-format.ts:133-141` (favourites
 *   first, then `lastMessageAt` descending, then name).
 * - `core/components/pages/chat/chat-views.tsx`: `ViewFrame` `:23-51` (h1, the count pill only when `count > 0` `:44`),
 *   `ChatUnreadsView` `:55-137` (count `conversations.length` `:84`, `Mark all as read` `disabled` when empty `:87`, the
 *   card's title / `UNREAD_COUNT` / `<time>` `:107-119`, its two badges `:120-127`) and `ChatThreadsView` `:140-230`
 *   (count = threads with `unreadReplies > 0` `:166,169`, `where` `:180`, `REPLIES` `:206`, `LAST_REPLY` `:207-214`, the
 *   badge `:217-221`).
 * - `core/components/pages/chat/chat-states.tsx`: `ChatEmptyState` `:85-96` and `ChatErrorState` `role="alert"` `:99-125`.
 * - `core/components/pages/chat/conversation-header.tsx` only as far as *opening* a conversation reaches it: the members
 *   chip `:36-94` (`MEMBER_COUNT` `:51`, the member read on open `:45`), the favourite button `:160`, the notify trigger
 *   `:163-177`, the More menu `:178-202` with `canLeave` `:134`.
 * - `core/lib/utils/chat-timeline.ts:92-101` (`relativeTime`) and `:131-133` (`fullDateTime`); `chat-list.ts:45-55`
 *   (`filterConversations`) and `:66-68` (`badgeCount`, capped at 99); `chat-format.ts:114-130` (`conversationTitle`,
 *   `isUnread`); `chat-navigation.ts:97-106` (`directPartnerOf`) with `conversation-glyph.tsx:66-71` →
 *   `chat-presence-dot.tsx` → `core/components/timer/timer-status.tsx`.
 * - The client `core/services/client/api/chat/chat.service.ts` (`listMine` `:61-64`, `browse` `:66-69`, `people`
 *   `:72-76`, `states` `:78-81`, `getConversation` `:83-86`, `members` `:119-122`, `followedThreads` `:302-305`, `readAll`
 *   `:324-327`, `restoreRead` `:329-332`) through `core/hooks/chat/use-chat-conversations.ts`, `use-chat-scope.ts` and
 *   `use-chat-actions.ts`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub, the app shell, the mock's `/api/user/me`, its team and directory reads (the fixture
 * people `Fixture Manager` / `Fixture Teammate` that the rows, cards and popovers name come from the active team, merged
 * in `use-chat-scope.ts:56-66` — which is why an empty `/api/chat/people` answer still shows their names), and the mock's
 * request log the flag-off test reads.
 *
 * **Served by this file:** every `/api/chat/**` read and write, through `page.route` on the **mock origin** (the pattern
 * of `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`), because `grep -c chat cypress/support/mock-gauzy-server.mjs`
 * is **0**: unmatched, the mock answers a chat `GET` with its catch-all `pagination([])` = `{ items: [], total: 0 }`
 * (`mock-gauzy-server.mjs:894-897`, `pagination` at `:9`). Test 2 pins that catch-all, and it is the reason every other
 * test serves its own store. Each answer restates the mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`,
 * `OPTIONS` → 204 at `:1097`), and `route.fetch()` is never called, so this file's own call log is the witness that the
 * page acted on what was served here. The store *is* the answer: a successful `read-all` clears it and hands out its own
 * `snapshotId`, a refused one leaves it untouched, and `read-restore` puts the counts back from that snapshot — the only
 * way "the unreads came back" can be told apart from "the server never cleared them".
 *
 * **The browser talks to the mock, never to the app's own route twins** (the lane's wiring: `playwright/test-servers.ts`
 * plus the axios base `<mock origin>/api`). Measured in probe-2 P2: the chat reads of a chat load were `GET
 * http://127.0.0.1:3992/api/chat/{conversations,states,threads,conversations/browse,people}`, all 200, and that same
 * load's app-origin `/api/*` calls were none of them (`appApi: []`).
 *
 * ## The runtime flag
 *
 * `NEXT_PUBLIC_CHAT_ENABLED` is a runtime public value (`core/lib/utils/chat-enabled.ts:8-11`), and this lane does not set
 * it: the `<html data-ever-teams-runtime-env>` payload served here holds **52** keys and none is that one (probe-2 P1,
 * printed in the browser after the redirect landed). Test 1 is the lane exactly as it is served. Every later test turns
 * the flag on **in its own browser only** through the shared `overrideRuntimeEnv` (`playwright/helpers.ts:485-507`),
 * before its first visit — the way `suites/lane-a/task-trash-ui.spec.ts` does. No lane-a spec turns chat on lane-wide.
 *
 * ## Where every asserted value came from
 *
 * Throwaway probes on this lane (`D:\Coding\.tmp\probe-chatlist\`, configs with no `webServer`):
 * `s3-lane-a-chatlist-probe-2.log` (P1 the flag-off URLs, the 52-key payload and the empty chat request log; P2 the
 * catch-all bodies; P3 the copy of all three views with nothing to list and the reads each sends with their headers; P4
 * the auto-open, the sections, rows and badges; P6-P7 the Unreads and Threads cards with their `dateTime`, `title` and
 * relative texts, and the header of each view; P8 the call delta of each view switch; P9 opening a conversation from a
 * row; P10 a deep link of a listed and of an unlisted conversation; P11 the search; P12 a 500 list, its error and a list
 * that is not a list; P13 `read-all`, its Undo and a refused one; P14 the status dots; P15 section folding; P16 the
 * favourite `PATCH`), `s3-lane-a-chatlist-probe-3.log` (R1 the catch-all's effect on the page; R2 the remembered
 * conversation without a storage-clearing visit; R3 the dot's markup and its rows; R4 the members chip and the read it
 * triggers; R6 the badge cap; R7 an Undo that really restores; R8 a conversation whose `state` is null) and
 * `s3-lane-a-chatlist-probe-4.log` (S1 the header of a default channel, S2 the More menu of a private channel and of a
 * direct conversation, S3 the dot hover and the row's accessible name, S5 the members popover and what it lists). Every
 * test below prints its own `[lane-a chat-list] MEASURE …` line too, so each pinned value has a log line behind it from
 * this file as well. All served times are relative to `Date.now()`, and only their **relative** text is asserted: nothing
 * pins today's date or a time zone (a `<time>` tooltip is recomputed in the browser, the way `fullDateTime` computes it).
 *
 * ## Findings (measured; with the code that explains each)
 *
 * 1. **The lane's catch-all breaks the chat page.** `chatService.browse` returns `response.data` unchecked
 *    (`chat.service.ts:66-69`), `useChatBrowse` types it as the channel array (`use-chat-conversations.ts:58`) and
 *    `BrowseChannelsDialog` maps it: with the mock's `{ items: [], total: 0 }` the page logs `TypeError: channels.map is
 *    not a function at BrowseChannelsDialog` and no section renders (probe-3 R1, whose whole page text was the shell's
 *    time-zone notice plus `Chat Unreads Threads`). No chat read in `chat.service.ts` is validated (it imports
 *    `validateApiResponse`; no chat method calls it). Test 2 pins it. It is a hardening idea for the client, not a page
 *    defect: the shape is the lane's own mock answer.
 * 2. **A list answer that is not an array becomes one row per character.** `sortConversations` spreads its input
 *    (`chat-format.ts:133-141` `[...conversations]`), so `"not-an-array"` renders 12 rows all titled `teamChat.UNNAMED`
 *    in a `Direct messages 12` section, and React calls the duplicate keys out (`Check the render method of 'Section'`).
 *    Test 12 pins it.
 * 3. **The list's Unreads badge counts an archived conversation the list itself drops.** The badge is
 *    `conversations.filter(isUnread).length` over the unfiltered list (`use-chat-conversations.ts:33`), while
 *    `conversationSections` drops archived conversations (`chat-list.ts:17`): measured badge 5 over 5 conversations
 *    holding unreads of which only 4 appear as rows (probe-2 P4/P6). The Unreads **view** shows the archived one too
 *    (`chat-page.tsx:200` filters the same unfiltered list) — its card is in test 6. Not tagged: no comment, type or
 *    unit test states a different intent; `chat-list.ts:17` is a deliberate drop and no test says which list the badge is
 *    supposed to count.
 * 4. **The two view counts mean different things.** Unreads counts conversations (`chat-views.tsx:84`); Threads counts the
 *    threads holding unread replies (`:166,169`), so a Threads view of 4 cards shows the pill `2`, and `ViewFrame` `:44`
 *    shows no pill at all at 0 (probe-2 P3/P7).
 * 5. **A row's status dot says nothing to a screen reader.** A direct row's partner dot is a `data-presence` span
 *    (`conversation-glyph.tsx:66-71` → `chat-presence-dot.tsx`); hovering the row added no tooltip to the DOM and left the
 *    row named `FT Fixture Teammate 1` (probe-4 S3, probe-3 R3), because `TimerStatus` renders its label only inside a
 *    hover tooltip (`core/components/timer/timer-status.tsx:78-96`). Not tagged: nothing states that the dot is announced.
 * 6. **Brief item 8 is not reachable from the list.** The sidebar offers links (`conversation-list.tsx:76-92`, `:308-309`),
 *    section toggles (`:162-171`), the search and the New / Browse buttons (`:267`, `:328-343`, `:356-363`) — and **no**
 *    per-row mark-read, archive, mute or leave control: test 4 counts the buttons inside every row and finds none. Those
 *    writes live in the conversation header (`conversation-header.tsx:160` favourite, `:163-177` notify, `:178-202` More)
 *    behind an open conversation, and the only write the list itself offers is the Unreads view's `Mark all as read`
 *    (`chat-views.tsx:87-89`) — test 11 measures it. `archive` / `unarchive` / `leave` (`chat.service.ts:104-117`) are
 *    reachable only from the header and the dialogs, out of this file's scope.
 * 7. **`Shift+Escape` in the filter is not a clear key.** The page's own shortcut runs `markAllRead` (`chat-page.tsx:193`),
 *    so the list keeps what was typed (`conversation-list.tsx:222-227`): measured `POST /api/chat/read-all {}` after
 *    `Shift+Escape` with `no` in the box, and the box still holding `no` (probe-2 P11). Test 10 pins it.
 *
 * ## What this file does not cover
 *
 * The conversation itself: its messages, composer, attachments, reactions, pins, follows, tasks and webhooks (the
 * `ConversationView`, `ThreadPane`, `chat-dialogs.tsx`); the New channel / New direct / Browse channels dialogs and their
 * writes; the keyboard walk `Alt+↑`/`Alt+↓` and the command palette; the live-channel typing line; the
 * `/chat/<id>?thread=` links (a card here is checked only as far as the address it points at); the notify levels (the
 * three `menuitemradio` entries were seen in probe-4's page snapshot — `Every message` checked, `Mentions only`, `Muted` —
 * but that probe timed out clicking one, so no notify `PATCH` body is pinned here; the only header write measured on this
 * lane is the favourite `PATCH {"isFavorite":true,…}` of probe-2 P16); and what the list's `Retry` button really does
 * after a refused read (probe-2 P12 caught the *empty* state moments after the click, which is too early to call a
 * defect). Opening a conversation is covered only as far as its URL, the reads it costs and the header it draws. `/chat`
 * with a served list is **not** a stable view (it replaces itself with `/chat/<id>`, `chat-page.tsx:132-142`), so this
 * file pins that redirect instead of a bare list.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const CHAT_API = '/api/chat';
const CHAT_VIEWS = ['/chat', '/chat/unreads', '/chat/threads'];
/** The separator the cards print between a count and a time; it is `aria-hidden` text (`chat-views.tsx:112`, `:210`). */
const DOT = '·';

/** `locales/en.json` → `teamChat`, flattened so a nested key such as `NOTIFY.MUTED` reads as one key. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	teamChat: Record<string, unknown>;
};
const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
	Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
		if (typeof value === 'string') acc[prefix + key] = value;
		else if (value && typeof value === 'object')
			Object.assign(acc, flatten(value as Record<string, unknown>, `${prefix}${key}.`));
		return acc;
	}, {});
const T = flatten(EN.teamChat);

/** The ICU plurals of `en.json`, picked the way next-intl picks them: an exact `=n`, then `one`, then `other`. */
const plural = (key: string, count: number) => {
	const branches = [...T[key].matchAll(/(?:=(\d+)|([a-z]+))\s*\{([^}]*)\}/g)];
	const chosen =
		branches.find((branch) => branch[1] === String(count)) ??
		branches.find((branch) => branch[2] === (count === 1 ? 'one' : 'other')) ??
		branches.find((branch) => branch[2] === 'other');
	if (!chosen) throw new Error(`teamChat.${key} has no plural branch for ${count}`);
	return chosen[3].replace(/#/g, String(count));
};
/** `teamChat.LAST_REPLY` is `Last reply {time}` — filled with the relative text the page puts there. */
const lastReply = (time: string) => T.LAST_REPLY.replace('{time}', time);

const report = (label: string, value: unknown) =>
	console.log(`[lane-a chat-list] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The chat page's own two halves; the shell has its own `<nav>` and three `<main>`s (`chat-page.tsx:212-236`). */
const chatNav = (page: Page) => page.getByRole('navigation', { name: T.CONVERSATIONS });
const chatPane = (page: Page) => page.locator('main.h-full.min-w-0.flex-1');

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for everything this file answers. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `IChatConversationWithState` (`core/types/interfaces/common/chat.ts:103-107`) as this file serves it. */
type ServedState = {
	conversationId: string;
	role: string;
	notifyLevel: string;
	isFavorite: boolean;
	unreadCount: number;
	mentionCount: number;
	lastReadMessageId: null;
	lastReadAt: null;
};
type ServedMember = { employeeId: string; userId: string; role: string; joinedAt: null };
type ServedConversation = {
	id: string;
	kind: string;
	name: string | null;
	topic: string | null;
	visibility: string;
	categoryId: string | null;
	position: number;
	isDefault: boolean;
	archivedAt: string | null;
	createdByEmployeeId: null;
	messageCount: number;
	lastMessageAt: string | null;
	organizationId: null;
	createdAt: string;
	memberCount: number;
	members?: ServedMember[];
	state: ServedState | null;
};
/** A followed thread (`chat.service.ts:302-305`) as this file serves it. */
type ServedThread = {
	id: string;
	conversationId: string;
	kind: string;
	body: string;
	mentionsChannel: boolean;
	mentionsHere: boolean;
	alsoInConversation: boolean;
	replyCount: number;
	unreadReplies: number;
	lastReplyAt: string | null;
	createdAt: string;
	deletedAt: string | null;
	attachmentIds: string[] | null;
	attachmentNames: string | null;
	authorEmployeeId: string | null;
	authorUserId: string | null;
};

type ServedCall = {
	method: string;
	path: string;
	query: string;
	body: string | null;
	tenant: string;
	organization: string;
	team: string;
};

type ChatScript = {
	conversations?: ServedConversation[];
	categories?: { id: string; name: string; position: number }[];
	threads?: ServedThread[];
	stateThreads?: { rootMessageId: string; conversationId: string; unreadReplies: number }[];
	browse?: ServedConversation[];
	people?: { employeeId: string; userId: string | null; name: string | null; imageUrl: null }[];
	/** Replaces the list answer with a raw body: a payload that is not a list. */
	listBody?: string;
	/** Refuses a read instead of answering it. */
	listStatus?: number;
	readAllStatus?: number;
};

type ChatHarness = {
	/** Mutating this changes what the same route answers, so a test never has to unroute to change its mind. */
	script: ChatScript;
	calls: ServedCall[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	writes: () => string[];
};

/**
 * This file's stand-in for the platform's chat, on the mock origin, because the mock has no handler for any of it (see the
 * header). Reads answer the current store, so a write can be followed by a re-read that agrees with it.
 */
async function serveChat(page: Page, initial: ChatScript): Promise<ChatHarness> {
	const script: ChatScript = { ...initial };
	const store = {
		conversations: [...(script.conversations ?? [])],
		categories: script.categories ?? [],
		threads: script.threads ?? [],
		stateThreads: script.stateThreads ?? [],
		browse: script.browse ?? [],
		people: script.people ?? []
	};
	const calls: ServedCall[] = [];
	/** What `read-all` undid, so `read-restore` can put the counts back the way the platform's snapshot does. */
	let snapshot: { id: string; state: ServedState | null }[] | null = null;

	await page.route(
		(originUrl: URL) => originUrl.origin === MOCK_API_ORIGIN && originUrl.pathname.startsWith(CHAT_API),
		(route) => {
			const request = route.request();
			const method = request.method();
			const requestUrl = new URL(request.url());
			const path = requestUrl.pathname;
			const headers = request.headers();
			if (method !== 'OPTIONS')
				calls.push({
					method,
					path,
					query: requestUrl.search,
					body: request.postData(),
					tenant: headers['tenant-id'] ?? '',
					organization: headers['organization-id'] ?? '',
					team: headers['organization-team-id'] ?? ''
				});
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			const answer = (status: number, body?: unknown, raw?: string) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: raw !== undefined ? raw : body === undefined ? '' : JSON.stringify(body)
				});

			if (path === '/api/chat/conversations') {
				if (script.listStatus && script.listStatus >= 400)
					return answer(script.listStatus, {
						statusCode: script.listStatus,
						message: 'this file refused the list'
					});
				if (script.listBody !== undefined) return answer(200, undefined, script.listBody);
				return answer(200, { conversations: store.conversations, categories: store.categories });
			}
			if (path === '/api/chat/states')
				return answer(200, {
					states: store.conversations
						.map((conversation) => conversation.state)
						.filter((state): state is ServedState => state !== null),
					threads: store.stateThreads
				});
			if (path === '/api/chat/threads') return answer(200, store.threads);
			if (path === '/api/chat/conversations/browse') return answer(200, store.browse);
			if (path === '/api/chat/people') return answer(200, store.people);
			if (path === '/api/chat/read-all') {
				if (script.readAllStatus && script.readAllStatus >= 400)
					return answer(script.readAllStatus, {
						statusCode: script.readAllStatus,
						message: 'this file refused read-all'
					});
				snapshot = store.conversations.map((conversation) => ({
					id: conversation.id,
					state: conversation.state
				}));
				store.conversations = store.conversations.map((conversation) =>
					conversation.state
						? { ...conversation, state: { ...conversation.state, unreadCount: 0, mentionCount: 0 } }
						: conversation
				);
				return answer(200, {
					updated: store.conversations.length,
					snapshotId: 'chatlist-snapshot-1',
					events: []
				});
			}
			if (path === '/api/chat/read-restore') {
				if (snapshot) {
					const restored = new Map(snapshot.map((entry) => [entry.id, entry.state]));
					store.conversations = store.conversations.map((conversation) =>
						restored.has(conversation.id)
							? { ...conversation, state: restored.get(conversation.id) ?? conversation.state }
							: conversation
					);
				}
				return answer(200, { restored: snapshot?.length ?? 0, events: [] });
			}
			// A conversation's own reads, answered quietly: this file does not test the conversation (see the header).
			if (/^\/api\/chat\/conversations\/[^/]+\/messages$/.test(path))
				return answer(200, { messages: [], hasBefore: false, hasAfter: false });
			if (/^\/api\/chat\/conversations\/[^/]+\/files$/.test(path))
				return answer(200, { files: [], hasMore: false });
			const members = /^\/api\/chat\/conversations\/([^/]+)\/members$/.exec(path);
			if (members && method === 'GET')
				return answer(
					200,
					store.conversations.find((conversation) => conversation.id === members[1])?.members ?? []
				);
			const single = /^\/api\/chat\/conversations\/([^/]+)$/.exec(path);
			if (single && method === 'GET') {
				const found = store.conversations.find((conversation) => conversation.id === single[1]);
				if (!found) return answer(404, { statusCode: 404, message: 'this file has no such conversation' });
				return answer(200, found);
			}
			const stateWrite = /^\/api\/chat\/conversations\/([^/]+)\/state$/.exec(path);
			if (stateWrite && method === 'PATCH') {
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				store.conversations = store.conversations.map((conversation) =>
					conversation.id === stateWrite[1] && conversation.state
						? { ...conversation, state: { ...conversation.state, ...body } }
						: conversation
				);
				return answer(200, {
					state: store.conversations.find((conversation) => conversation.id === stateWrite[1])?.state,
					events: []
				});
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		script,
		calls,
		shapes: () =>
			calls.map((call) => `${call.method} ${call.path}${call.query}${call.body === null ? '' : ` ${call.body}`}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		writes: () =>
			calls
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? ''}`)
	};
}

/** React's dev-mode store warning, not this page's (the named filters of `api-tokens-settings-ui.spec.ts:419-433`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** A refusal this file armed: excused only by the line that names its path **and** its status. */
const armedRefusal = (needle: string) => needle;
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

const MINUTE = 60_000;
/** Served times are always relative to now, so no test can pin today's date or the browser's zone. */
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
/** `fullDateTime` (`chat-timeline.ts:131-133`) recomputed **in the browser**, with the same options and the page's locale. */
const fullDateTime = (page: Page, iso: string) =>
	page.evaluate(
		(value: string) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value)),
		iso
	);

const CATEGORY_ENG = { id: 'a0000000-0000-4000-8000-0000000000e1', name: 'Engineering', position: 0 };
const CATEGORY_PROJ = { id: 'a0000000-0000-4000-8000-0000000000e2', name: 'Projects', position: 1 };

const ID_GENERAL = 'c0000000-0000-4000-8000-000000000gen';
const ID_RANDOM = 'c0000000-0000-4000-8000-000000000ran';
const ID_SECRET = 'c0000000-0000-4000-8000-000000000sec';
const ID_NOISY = 'c0000000-0000-4000-8000-000000000noi';
const ID_LAUNCH = 'c0000000-0000-4000-8000-000000000lau';
const ID_ARCHIVED = 'c0000000-0000-4000-8000-000000000old';
const ID_DIRECT = 'd0000000-0000-4000-8000-000000000001';
const ID_UNKNOWN = '00000000-0000-4000-8000-000000000000';

const stateOf = (conversationId: string, over: Partial<ServedState> = {}): ServedState => ({
	conversationId,
	role: 'member',
	notifyLevel: 'all',
	isFavorite: false,
	unreadCount: 0,
	mentionCount: 0,
	lastReadMessageId: null,
	lastReadAt: null,
	...over
});

const channelOf = (id: string, name: string, over: Partial<ServedConversation> = {}): ServedConversation => ({
	id,
	kind: 'channel',
	name,
	topic: null,
	visibility: 'public',
	categoryId: null,
	position: 0,
	isDefault: false,
	archivedAt: null,
	createdByEmployeeId: null,
	messageCount: 3,
	lastMessageAt: null,
	organizationId: null,
	createdAt: ago(600),
	memberCount: 3,
	state: stateOf(id),
	...over
});

/** The list this file serves: two categories (one holding nothing), channels with an unread / mention / muted / favourite
 * / archived mix, and a direct conversation whose other person is the lane's fixture teammate. */
const servedList = (fixture: BootstrapFixture): ServedConversation[] => [
	channelOf(ID_GENERAL, 'general', {
		isDefault: true,
		memberCount: 4,
		lastMessageAt: ago(20),
		state: stateOf(ID_GENERAL, { unreadCount: 4 })
	}),
	channelOf(ID_RANDOM, 'random', { lastMessageAt: ago(200) }),
	channelOf(ID_SECRET, 'secret', {
		visibility: 'private',
		lastMessageAt: ago(60),
		state: stateOf(ID_SECRET, { unreadCount: 2, mentionCount: 1 })
	}),
	channelOf(ID_NOISY, 'noisy', {
		lastMessageAt: ago(30),
		state: stateOf(ID_NOISY, { unreadCount: 9, notifyLevel: 'muted' })
	}),
	channelOf(ID_LAUNCH, 'launch', {
		categoryId: CATEGORY_PROJ.id,
		memberCount: 7,
		lastMessageAt: ago(10),
		state: stateOf(ID_LAUNCH, { isFavorite: true })
	}),
	channelOf(ID_ARCHIVED, 'archived-old', {
		archivedAt: ago(60 * 24),
		state: stateOf(ID_ARCHIVED, { unreadCount: 3 })
	}),
	{
		id: ID_DIRECT,
		kind: 'direct',
		name: null,
		topic: null,
		visibility: 'public',
		categoryId: null,
		position: 0,
		isDefault: false,
		archivedAt: null,
		createdByEmployeeId: null,
		messageCount: 2,
		lastMessageAt: ago(5),
		organizationId: null,
		createdAt: ago(900),
		memberCount: 2,
		members: [
			{ employeeId: fixture.ids.employee, userId: fixture.ids.user, role: 'member', joinedAt: null },
			{
				employeeId: fixture.ids.teammateEmployee,
				userId: fixture.ids.teammateUser,
				role: 'member',
				joinedAt: null
			}
		],
		state: stateOf(ID_DIRECT, { unreadCount: 1 })
	}
];

const threadOf = (id: string, conversationId: string, over: Partial<ServedThread>): ServedThread => ({
	id,
	conversationId,
	kind: 'message',
	body: '',
	mentionsChannel: false,
	mentionsHere: false,
	alsoInConversation: true,
	replyCount: 0,
	unreadReplies: 0,
	lastReplyAt: null,
	createdAt: ago(1440),
	deletedAt: null,
	attachmentIds: null,
	attachmentNames: null,
	authorEmployeeId: null,
	authorUserId: null,
	...over
});

/** Everything the left pane shows: its sections, and its rows with their badges, dots, open mark and inner buttons. */
const listSnapshot = (page: Page) =>
	chatNav(page).evaluate((nav) => {
		const text = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim();
		return {
			navText: text(nav),
			sections: Array.from(nav.querySelectorAll('button[aria-expanded]')).map((button) => ({
				label: text(button),
				expanded: button.getAttribute('aria-expanded')
			})),
			rows: Array.from(nav.querySelectorAll('a[href^="/chat"]')).map((link) => ({
				href: link.getAttribute('href'),
				text: text(link),
				ariaCurrent: link.getAttribute('aria-current'),
				badges: Array.from(link.querySelectorAll('span'))
					.filter((span) => /^[0-9]+\+?$/.test(text(span)))
					.map((span) => ({ text: text(span), title: span.getAttribute('title') })),
				presence: Array.from(link.querySelectorAll('[data-presence]')).map((node) =>
					node.getAttribute('data-presence')
				),
				buttons: link.querySelectorAll('button').length
			}))
		};
	});

/** The Unreads / Threads cards: where each links, what it prints, and what its badges are titled with. */
const cardRows = (page: Page) =>
	chatPane(page)
		.locator('li a')
		.evaluateAll((links) =>
			links.map((link) => ({
				href: link.getAttribute('href'),
				text: (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
				times: Array.from(link.querySelectorAll('time')).map((time) => ({
					dateTime: time.getAttribute('datetime'),
					title: time.getAttribute('title'),
					text: (time.textContent ?? '').trim()
				})),
				badges: Array.from(link.querySelectorAll('span[title]')).map((span) => ({
					text: (span.textContent ?? '').trim(),
					title: span.getAttribute('title')
				}))
			}))
		);

/** The bar on top of the pane (`chat-views.tsx:31-47`, `conversation-header.tsx:139-203`). */
const headerOf = (page: Page) =>
	chatPane(page)
		.locator('header')
		.evaluateAll((headers) =>
			headers.map((header) => ({
				text: (header.textContent ?? '').replace(/\s+/g, ' ').trim(),
				h1: (header.querySelector('h1')?.textContent ?? '').trim(),
				countPill: Array.from(header.querySelectorAll('span'))
					.map((span) => (span.textContent ?? '').trim())
					.filter((value) => /^[0-9]+$/.test(value)),
				buttons: Array.from(header.querySelectorAll('button')).map((button) => ({
					name: button.getAttribute('aria-label') ?? (button.textContent ?? '').trim(),
					pressed: button.getAttribute('aria-pressed'),
					disabled: button.hasAttribute('disabled')
				}))
			}))
		);

const paneText = (page: Page) => chatPane(page).innerText().then(flat);

/** Sonner toasts, their action label included (`chat-page.tsx:170-175` puts `UNDO` in one). */
const toastTexts = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-sonner-toast]'))
			.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
			.filter((value) => !value.includes('Copy details'))
	);

/** Flag on, signed in, on the lane's own route: the flag goes into this browser before the first navigation. */
const openChat = async (
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	options: { requireShell?: boolean } = {}
) => {
	await overrideRuntimeEnv(page, { NEXT_PUBLIC_CHAT_ENABLED: 'true' });
	await signInAndVisit(page, fixture, path, { requireShell: options.requireShell });
};

test.describe('lane-a chat list, unreads and threads', () => {
	test('with the deployment flag off, /chat, /chat/unreads and /chat/threads send the reader to / and ask the chat API nothing', async ({
		page,
		app,
		mock
	}) => {
		const seen: Record<string, { finalUrl: string; chatMockPaths: string[] }> = {};
		for (const path of CHAT_VIEWS) {
			// The lane exactly as it is served: no `overrideRuntimeEnv`, no chat stub of any kind.
			await app(path, { requireShell: false });
			await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/');
			const chatMockPaths = (await mock.paths()).filter((entry) => entry.includes('/chat'));
			expect(chatMockPaths, `${path}: the mock was asked nothing about chat`).toEqual([]);
			seen[path] = { finalUrl: page.url(), chatMockPaths };
		}
		const payloadKeys = await page.evaluate(() =>
			Object.keys(
				JSON.parse(document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '{}') as Record<
					string,
					string
				>
			)
		);
		report('flag-off', {
			finalUrls: seen,
			payloadKeys: payloadKeys.length,
			payloadHasChatKey: payloadKeys.includes('NEXT_PUBLIC_CHAT_ENABLED')
		});

		// The flag is what matters, not how many other public settings this machine happens to have.
		expect(payloadKeys).not.toContain('NEXT_PUBLIC_CHAT_ENABLED');
		expect(Object.values(seen).map((entry) => entry.finalUrl)).toEqual([
			`${APP_ORIGIN}/`,
			`${APP_ORIGIN}/`,
			`${APP_ORIGIN}/`
		]);
	});

	test('the lane answers an unstubbed chat read with its catch-all empty page, and the chat page cannot work with that shape', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await openChat(page, fixture, '/chat', { requireShell: false });
		// The chat reads the page itself asked for, read out of the mock's log **before** this test fetches anything:
		// the four reads every view asks for, and no `GET /chat/threads` (that one belongs to the threads view only,
		// `chat-page.tsx:92`). Every one of them answered 200 — the catch-all never refuses.
		const pageReads = [
			'GET /api/chat/conversations 200',
			'GET /api/chat/conversations/browse 200',
			'GET /api/chat/people 200',
			'GET /api/chat/states 200'
		];
		await expect
			.poll(
				async () =>
					[
						...new Set(
							(await mock.calls(CHAT_API)).map((call) => `${call.method} ${call.path} ${call.status}`)
						)
					].sort(),
				{ timeout: 20_000 }
			)
			.toEqual(pageReads);
		const bodies = await page.evaluate(async (base: string) => {
			const paths = [
				'/api/chat/conversations',
				'/api/chat/states',
				'/api/chat/threads',
				'/api/chat/conversations/browse',
				'/api/chat/people'
			];
			const out: Record<string, { status: number; body: string }> = {};
			for (const path of paths) {
				const response = await fetch(`${base}${path}`, { credentials: 'include' });
				out[path] = { status: response.status, body: await response.text() };
			}
			return out;
		}, MOCK_API_ORIGIN);
		report('catch-all', {
			pageReads,
			bodies,
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 120))
		});

		// Every one of them is the mock's `pagination([])` (`mock-gauzy-server.mjs:895`), the same answer for all five.
		expect(Object.values(bodies).map((entry) => entry.body)).toEqual(new Array(5).fill('{"items":[],"total":0}'));

		// …and the page cannot make an array out of it: `browse` reaches `BrowseChannelsDialog` unchecked
		// (`chat.service.ts:66-69`, `use-chat-conversations.ts:58`), its `channels.map` throws, and no section renders.
		expect(shield.logMatching(/channels\.map is not a function/).length).toBeGreaterThan(0);
		await expect(chatNav(page).locator('button[aria-expanded]')).toHaveCount(0);
		await expect(page.getByText(T.CHANNELS, { exact: true })).toHaveCount(0);
	});

	test('flag on with nothing to list: the copy of all three views, and the reads each of them sends', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, {
			conversations: [],
			categories: [],
			threads: [],
			stateThreads: [],
			browse: [],
			people: []
		});
		const baseReads = [
			'/api/chat/conversations',
			'/api/chat/conversations/browse',
			'/api/chat/people',
			'/api/chat/states'
		];
		const measured: Record<
			string,
			{
				url: string;
				navText: string;
				paneText: string;
				header: unknown;
				readPaths: string[];
				queries: string[];
				scope: ServedCall[];
			}
		> = {};

		for (const path of CHAT_VIEWS) {
			const before = served.calls.length;
			await openChat(page, fixture, path);
			// An empty list does not trigger the auto-open (`chat-page.tsx:132-142`, `chat-navigation.ts:112-120`).
			await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(path);

			// What the empty list offers, counted because the same words sit on more than one control: `New channel` twice
			// (the Channels section's action button `conversation-list.tsx:331` and the empty section's add row `:340`),
			// Browse channels once (the Channels section's other action button `:328`), and `New message` **three** times
			// (the list header's compose button `:267`, the Direct section's action button `:356`, and the empty Direct
			// section's add row `:363`).
			await expect(chatNav(page).getByText(T.NO_CHANNELS, { exact: true })).toBeVisible();
			await expect(chatNav(page).getByRole('button', { name: T.NEW_CHANNEL, exact: true })).toHaveCount(2);
			await expect(chatNav(page).getByRole('button', { name: T.BROWSE_CHANNELS, exact: true })).toHaveCount(1);
			await expect(chatNav(page).getByText(T.NO_DIRECT, { exact: true })).toBeVisible();
			await expect(chatNav(page).getByRole('button', { name: T.NEW_MESSAGE, exact: true })).toHaveCount(3);

			if (path === '/chat') {
				// Nothing picked: the empty conversation pane and its two ways in (`chat-page.tsx:260-276`), no bar above it.
				await expect(chatPane(page).getByText(T.PICK_TITLE, { exact: true })).toBeVisible();
				await expect(chatPane(page).getByText(T.PICK_TEXT, { exact: true })).toBeVisible();
				await expect(
					chatPane(page).getByRole('button', { name: T.BROWSE_CHANNELS, exact: true })
				).toBeVisible();
				await expect(chatPane(page).getByRole('button', { name: T.NEW_MESSAGE, exact: true })).toBeVisible();
				expect(await headerOf(page)).toEqual([]);
			}
			if (path === '/chat/unreads') {
				await expect(chatPane(page).getByText(T.NO_UNREADS_TITLE, { exact: true })).toBeVisible();
				await expect(chatPane(page).getByText(T.NO_UNREADS_TEXT, { exact: true })).toBeVisible();
				// Nothing to clear, so the action is not clickable (`chat-views.tsx:87`).
				await expect(chatPane(page).getByRole('button', { name: T.MARK_ALL_READ, exact: true })).toBeDisabled();
			}
			if (path === '/chat/threads') {
				await expect(chatPane(page).getByText(T.NO_THREADS_TITLE, { exact: true })).toBeVisible();
				await expect(chatPane(page).getByText(T.NO_THREADS_TEXT, { exact: true })).toBeVisible();
			}

			const reads = served.calls.slice(before).filter((call) => call.method === 'GET');
			measured[path] = {
				url: page.url(),
				navText: (await listSnapshot(page)).navText,
				paneText: await paneText(page),
				header: await headerOf(page),
				readPaths: [...new Set(reads.map((call) => call.path))].sort(),
				queries: [...new Set(reads.map((call) => call.query))],
				scope: reads.slice(0, 4).map((call) => ({ ...call }))
			};
		}
		report('empty store', { measured, writes: served.writes(), consoleErrors: shield.consoleErrors() });

		// Every view asks the same four reads (`chat-page.tsx:89-93`); only the threads view adds `GET /chat/threads` (`:92`).
		// No chat read carries a query string, and only the tenant travels — as a header, no scope org or team.
		expect(measured['/chat'].readPaths).toEqual(baseReads);
		expect(measured['/chat/unreads'].readPaths).toEqual(baseReads);
		expect(measured['/chat/threads'].readPaths).toEqual([...baseReads, '/api/chat/threads'].sort());
		expect(Object.values(measured).map((entry) => entry.queries)).toEqual([[''], [''], ['']]);
		for (const entry of Object.values(measured)) {
			for (const call of entry.scope) {
				expect(call.tenant).toBe(fixture.ids.tenantA);
				expect(call.organization).toBe('');
				expect(call.team).toBe('');
			}
		}
		expect(served.writes()).toEqual([]);
		// A 0 count prints no pill on either view (`chat-views.tsx:44`). The Unreads bar also carries its action, so its
		// text is the title plus `Mark all as read`; the Threads bar has no action at all (`:169` passes none).
		expect(measured['/chat/unreads'].header).toEqual([
			expect.objectContaining({
				text: `${T.UNREADS} ${T.MARK_ALL_READ}`,
				h1: T.UNREADS,
				countPill: [],
				buttons: [
					{ name: T.BACK, pressed: null, disabled: false },
					{ name: T.MARK_ALL_READ, pressed: null, disabled: true }
				]
			})
		]);
		expect(measured['/chat/threads'].header).toEqual([
			expect.objectContaining({
				text: T.THREADS,
				h1: T.THREADS,
				countPill: [],
				buttons: [{ name: T.BACK, pressed: null, disabled: false }]
			})
		]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a served list: /chat opens the first of it, and the pane groups and orders the rest', async ({
		page,
		fixture,
		shield
	}) => {
		const conversations = servedList(fixture);
		const served = await serveChat(page, {
			conversations,
			categories: [CATEGORY_ENG, CATEGORY_PROJ],
			stateThreads: [{ rootMessageId: 'thread-1', conversationId: ID_GENERAL, unreadReplies: 3 }]
		});
		await openChat(page, fixture, '/chat');
		// `/chat` is not a view: it replaces itself with the remembered conversation, or the first of the list.
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_LAUNCH}`);
		const remembered = await page.evaluate(() => window.localStorage.getItem('chat-last-conversation'));
		const snapshot = await listSnapshot(page);
		report('served list', {
			url: page.url(),
			remembered,
			sections: snapshot.sections,
			rows: snapshot.rows,
			reads: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});

		// Sections in category order with an empty category dropped (`chat-list.ts:34-37`); inside a section favourites
		// first and then the newest message (`chat-format.ts:133-141`); the archived conversation left out (`:17`).
		expect(snapshot.sections).toEqual([
			{ label: `${CATEGORY_PROJ.name}1`, expanded: 'true' },
			{ label: `${T.CHANNELS}4`, expanded: 'true' },
			{ label: `${T.DIRECT_MESSAGES}1`, expanded: 'true' }
		]);
		expect(snapshot.rows.map((row) => row.href)).toEqual([
			'/chat/unreads',
			'/chat/threads',
			`/chat/${ID_LAUNCH}`,
			`/chat/${ID_GENERAL}`,
			`/chat/${ID_NOISY}`,
			`/chat/${ID_SECRET}`,
			`/chat/${ID_RANDOM}`,
			`/chat/${ID_DIRECT}`
		]);
		expect(snapshot.rows.map((row) => row.text)).toEqual([
			`${T.UNREADS}5`,
			`${T.THREADS}3`,
			'#launch',
			'#general4',
			'#noisy',
			'secret1',
			'#random',
			'FTFixture Teammate1'
		]);
		// What a row badges itself with: an unread count where nothing mentions (`conversation-list.tsx:91`), a mention
		// badge that says what it counts (`:86-90`), and nothing at all for a muted row (`loud` `:71`).
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_GENERAL}`)?.badges).toEqual([
			{ text: '4', title: null }
		]);
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_SECRET}`)?.badges).toEqual([
			{ text: '1', title: plural('MENTION_COUNT', 1) }
		]);
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_NOISY}`)?.badges).toEqual([]);
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_DIRECT}`)?.badges).toEqual([
			{ text: '1', title: null }
		]);
		// The row that is open says so (`conversation-list.tsx:79`), and the conversation it opened is remembered.
		expect(snapshot.rows.filter((row) => row.ariaCurrent === 'page').map((row) => row.href)).toEqual([
			`/chat/${ID_LAUNCH}`
		]);
		expect(remembered).toBe(ID_LAUNCH);

		// The two place rows: Unreads counts every conversation the platform listed that holds something, the archived one
		// included (`use-chat-conversations.ts:33`) although the list itself drops it (`chat-list.ts:17`); Threads sums
		// the unread replies of `GET /chat/states` (`:114`).
		expect(snapshot.rows.find((row) => row.href === '/chat/unreads')?.text).toBe(`${T.UNREADS}5`);
		expect(snapshot.rows.find((row) => row.href === '/chat/threads')?.text).toBe(`${T.THREADS}3`);
		expect(snapshot.rows.map((row) => row.href)).not.toContain(`/chat/${ID_ARCHIVED}`);

		// Finding 6: a row is a link and nothing else — no per-row mark-read, archive, mute or leave control.
		expect(snapshot.rows.map((row) => row.buttons)).toEqual(new Array(snapshot.rows.length).fill(0));

		// It came with the list, so it costs no single-conversation read (`use-chat-conversations.ts:62-72` `!known`),
		// only its timeline and its files.
		expect(served.countOf('GET', `/api/chat/conversations/${ID_LAUNCH}`)).toBe(0);
		expect(served.countOf('GET', `/api/chat/conversations/${ID_LAUNCH}/messages`)).toBeGreaterThan(0);
		expect(served.writes()).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a busy conversation caps its badges at 99+ while the card still prints the platform number', async ({
		page,
		fixture
	}) => {
		const conversations = servedList(fixture).map((conversation) => {
			if (conversation.id === ID_GENERAL)
				return { ...conversation, state: { ...conversation.state!, unreadCount: 120 } };
			if (conversation.id === ID_SECRET)
				return { ...conversation, state: { ...conversation.state!, unreadCount: 3, mentionCount: 150 } };
			return conversation;
		});
		await serveChat(page, {
			conversations,
			categories: [CATEGORY_ENG, CATEGORY_PROJ],
			stateThreads: [{ rootMessageId: 'thread-1', conversationId: ID_GENERAL, unreadReplies: 250 }],
			threads: [
				threadOf('thread-1', ID_GENERAL, {
					body: 'a very busy thread',
					replyCount: 250,
					unreadReplies: 250,
					lastReplyAt: ago(15),
					authorEmployeeId: fixture.ids.teammateEmployee,
					authorUserId: fixture.ids.teammateUser
				})
			]
		});
		await openChat(page, fixture, '/chat/unreads');
		const snapshot = await listSnapshot(page);
		const cards = await cardRows(page);
		const header = await headerOf(page);
		report('badge cap', {
			listRows: snapshot.rows.map((row) => ({ href: row.href, text: row.text, badges: row.badges })),
			cards,
			header
		});

		// `badgeCount` caps what a badge may print (`chat-list.ts:66-68`) and a mention title keeps the real number,
		// while the card's own `UNREAD_COUNT` text is the number the platform sent.
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_GENERAL}`)?.badges).toEqual([
			{ text: '99+', title: null }
		]);
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_SECRET}`)?.badges).toEqual([
			{ text: '99+', title: plural('MENTION_COUNT', 150) }
		]);
		expect(snapshot.rows.find((row) => row.href === '/chat/threads')?.text).toBe(`${T.THREADS}99+`);
		expect(cards.find((card) => card.href === `/chat/${ID_GENERAL}`)?.text).toBe(
			`#general${plural('UNREAD_COUNT', 120)}${DOT}20 minutes ago99+`
		);
		expect(cards.find((card) => card.href === `/chat/${ID_SECRET}`)?.text).toBe(
			`secret${plural('UNREAD_COUNT', 3)}${DOT}1 hour ago99+3`
		);
		// The view counts conversations, not badges (`chat-views.tsx:84`).
		expect(header[0].countPill).toEqual(['5']);
	});

	test('the Unreads view lists every conversation holding something, in the list order, with its count and its time', async ({
		page,
		fixture
	}) => {
		const conversations = servedList(fixture);
		await serveChat(page, { conversations, categories: [CATEGORY_ENG, CATEGORY_PROJ] });
		await openChat(page, fixture, '/chat/unreads');
		const header = await headerOf(page);
		const rows = await cardRows(page);
		report('unreads view', {
			header,
			rows,
			servedTimes: conversations.map((c) => ({ id: c.id, lastMessageAt: c.lastMessageAt }))
		});

		// The same unfiltered list the sidebar was built from (`chat-page.tsx:200`), in the list's own order: the
		// conversation no row shows is a card here.
		expect(rows.map((row) => row.href)).toEqual([
			`/chat/${ID_DIRECT}`,
			`/chat/${ID_GENERAL}`,
			`/chat/${ID_NOISY}`,
			`/chat/${ID_SECRET}`,
			`/chat/${ID_ARCHIVED}`
		]);
		expect(header[0].h1).toBe(T.UNREADS);
		expect(header[0].countPill).toEqual(['5']);
		expect(header[0].buttons.map((button) => button.name)).toEqual([T.BACK, T.MARK_ALL_READ]);
		expect(header[0].buttons[1].disabled).toBe(false);

		expect(rows[0].text).toBe(`FTFixture Teammate${plural('UNREAD_COUNT', 1)}${DOT}5 minutes ago1`);
		expect(rows[1].text).toBe(`#general${plural('UNREAD_COUNT', 4)}${DOT}20 minutes ago4`);
		// A muted conversation is unread here too, with its own count (`chat-views.tsx:107-119`).
		expect(rows[2].text).toBe(`#noisy${plural('UNREAD_COUNT', 9)}${DOT}30 minutes ago9`);
		// Mention badge first, titled with what it counts (`:120-124`), then the unread badge (`:125-127`).
		expect(rows[3].text).toBe(`secret${plural('UNREAD_COUNT', 2)}${DOT}1 hour ago12`);
		expect(rows[3].badges).toEqual([{ text: '1', title: plural('MENTION_COUNT', 1) }]);
		expect(rows[3].times[0].text).toBe('1 hour ago');
		// No `lastMessageAt` renders no time at all (`:111-118`).
		expect(rows[4].text).toBe(`#archived-old${plural('UNREAD_COUNT', 3)}3`);
		expect(rows[4].times).toEqual([]);

		// The `<time>` carries the served instant as `dateTime` and the full time as its tooltip (`chat-timeline.ts:131-133`).
		expect(rows[0].times[0].dateTime).toBe(conversations[6].lastMessageAt);
		expect(rows[0].times[0].title).toBe(await fullDateTime(page, conversations[6].lastMessageAt!));
	});

	test('the Threads view names each thread, counts only the ones holding news, and titles each badge', async ({
		page,
		fixture
	}) => {
		const conversations = servedList(fixture);
		const threads = [
			threadOf('thread-1', ID_GENERAL, {
				body: 'Shall we ship on Friday?',
				replyCount: 6,
				unreadReplies: 2,
				lastReplyAt: ago(120),
				authorEmployeeId: fixture.ids.teammateEmployee,
				authorUserId: fixture.ids.teammateUser
			}),
			threadOf('thread-2', ID_SECRET, { body: '', attachmentIds: ['doc-1'], attachmentNames: 'plan.pdf' }),
			threadOf('thread-3', 'unknown-conversation-id', {
				body: 'a root whose conversation is not in the list',
				replyCount: 1,
				unreadReplies: 1,
				lastReplyAt: ago(300)
			}),
			threadOf('thread-4', ID_RANDOM, {
				body: 'deleted root',
				deletedAt: ago(10),
				replyCount: 2,
				lastReplyAt: ago(400),
				authorEmployeeId: fixture.ids.employee,
				authorUserId: fixture.ids.user
			})
		];
		const served = await serveChat(page, {
			conversations,
			categories: [CATEGORY_ENG, CATEGORY_PROJ],
			threads,
			stateThreads: threads.map((thread) => ({
				rootMessageId: thread.id,
				conversationId: thread.conversationId,
				unreadReplies: thread.unreadReplies
			}))
		});
		await openChat(page, fixture, '/chat/threads');
		const header = await headerOf(page);
		const rows = await cardRows(page);
		report('threads view', { header, rows, threadsReads: served.countOf('GET', '/api/chat/threads') });

		// `GET /api/chat/threads` is asked on this view only (`chat-page.tsx:92`).
		expect(served.countOf('GET', '/api/chat/threads')).toBeGreaterThan(0);
		// Four cards listed; the pill counts the two that hold unread replies (`chat-views.tsx:166,169`).
		expect(rows).toHaveLength(4);
		expect(header[0].countPill).toEqual(['2']);

		expect(rows[0].href).toBe(`/chat/${ID_GENERAL}?thread=thread-1`);
		// `where` is the conversation's own title, then the author, then the root, then the reply counts (`:180-214`).
		expect(rows[0].text).toBe(
			`FT#general${DOT}Fixture TeammateShall we ship on Friday?${plural('REPLIES', 6)}${DOT}${lastReply('2 hours ago')}2`
		);
		expect(rows[0].badges).toEqual([{ text: '2', title: plural('UNREAD_REPLIES', 2) }]);
		expect(rows[0].times[0].dateTime).toBe(threads[0].lastReplyAt);

		// `replyCount: 0` reads as the invitation (`locales/en.json` `teamChat.REPLIES` `=0` branch), and a thread with no
		// reply carries no time and no badge.
		expect(rows[1].href).toBe(`/chat/${ID_SECRET}?thread=thread-2`);
		expect(rows[1].text).toBe('#secret📎 plan.pdfReply in thread');
		expect(rows[1].times).toEqual([]);
		expect(rows[1].badges).toEqual([]);

		// A root of a conversation the list does not know falls back to the word for a thread (`:180`).
		expect(rows[2].href).toBe('/chat/unknown-conversation-id?thread=thread-3');
		expect(rows[2].text).toBe(
			`${T.THREAD}a root whose conversation is not in the list${plural('REPLIES', 1)}${DOT}${lastReply('5 hours ago')}1`
		);
		expect(rows[2].badges).toEqual([{ text: '1', title: plural('UNREAD_REPLIES', 1) }]);

		// A deleted root prints the platform's own words for it (`:199`, `previewLineOf` of `chat-format.ts`, `teamChat.DELETED`).
		expect(rows[3].text).toBe(
			`FM#random${DOT}Fixture Manager${T.DELETED}${plural('REPLIES', 2)}${DOT}${lastReply('6 hours ago')}`
		);
		expect(rows[3].badges).toEqual([]);
	});

	test('moving between the views by the pane own links: the address each lands on and the read each one costs', async ({
		page,
		fixture
	}) => {
		const conversations = servedList(fixture);
		const served = await serveChat(page, {
			conversations,
			categories: [CATEGORY_ENG, CATEGORY_PROJ],
			threads: [
				threadOf('thread-1', ID_GENERAL, {
					body: 'a followed thread',
					replyCount: 1,
					unreadReplies: 4,
					lastReplyAt: ago(10),
					authorEmployeeId: fixture.ids.teammateEmployee,
					authorUserId: fixture.ids.teammateUser
				})
			],
			stateThreads: [{ rootMessageId: 'thread-1', conversationId: ID_GENERAL, unreadReplies: 4 }]
		});
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_RANDOM}`);
		const before = {
			listReads: served.countOf('GET', '/api/chat/conversations'),
			threadsReads: served.countOf('GET', '/api/chat/threads'),
			writes: served.writes().length
		};

		await chatNav(page).getByRole('link', { name: T.UNREADS, exact: false }).click();
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/chat/unreads');
		await expect(chatNav(page).getByRole('link', { name: T.UNREADS, exact: false })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expect(chatNav(page).getByRole('link', { name: T.THREADS, exact: false })).not.toHaveAttribute(
			'aria-current'
		);

		await chatNav(page).getByRole('link', { name: T.THREADS, exact: false }).click();
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/chat/threads');
		await expect
			.poll(() => served.countOf('GET', '/api/chat/threads'), { timeout: 20_000 })
			.toBeGreaterThan(before.threadsReads);
		const onThreads = {
			listReads: served.countOf('GET', '/api/chat/conversations'),
			writes: served.writes().length
		};

		await chatNav(page).getByRole('link', { name: 'random', exact: true }).click();
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(`/chat/${ID_RANDOM}`);
		report('view switches', {
			before,
			onThreads,
			listReadsAfterBack: served.countOf('GET', '/api/chat/conversations'),
			writesAfter: served.writes().length,
			calls: served.shapes()
		});

		// The lists are cached (`staleTime 15 s`, `use-chat-conversations.ts:14,25`): switching views re-reads no list and
		// writes nothing, and Threads is the only view that asks for anything new.
		expect(onThreads.listReads).toBe(before.listReads);
		expect(served.countOf('GET', '/api/chat/conversations')).toBe(before.listReads);
		expect(onThreads.writes).toBe(before.writes);
		expect(served.writes()).toEqual([]);
		expect(served.countOf('GET', '/api/chat/threads')).toBe(before.threadsReads + 1);
	});

	test('opening a conversation from a row: its address, the reads it sends, and the header it draws', async ({
		page,
		fixture,
		shield
	}) => {
		const conversations = servedList(fixture);
		const served = await serveChat(page, { conversations, categories: [CATEGORY_ENG, CATEGORY_PROJ] });
		await openChat(page, fixture, '/chat');
		await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('/chat/');
		await chatNav(page).getByRole('link', { name: 'random', exact: true }).click();
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_RANDOM}`);

		const header = await headerOf(page);
		const snapshot = await listSnapshot(page);
		report('open a conversation', {
			url: page.url(),
			header,
			ariaCurrent: snapshot.rows.filter((row) => row.ariaCurrent).map((row) => row.href),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});

		// It came with the list, so it costs no single-conversation read (`use-chat-conversations.ts:62-72` `!known`) and
		// no member read either (`conversation-header.tsx:45`); its timeline is what it does ask for.
		expect(served.countOf('GET', `/api/chat/conversations/${ID_RANDOM}`)).toBe(0);
		expect(served.countOf('GET', `/api/chat/conversations/${ID_RANDOM}/members`)).toBe(0);
		expect(served.countOf('GET', `/api/chat/conversations/${ID_RANDOM}/messages`)).toBeGreaterThan(0);
		expect(snapshot.rows.filter((row) => row.ariaCurrent === 'page').map((row) => row.href)).toEqual([
			`/chat/${ID_RANDOM}`
		]);

		// The bar this conversation draws: its name without the `#` (the glyph carries the `#`, `conversation-glyph.tsx:47`),
		// the member chip named by `MEMBER_COUNT`, and the reader's own buttons.
		expect(header[0].h1).toBe('random');
		expect(header[0].text).toBe('#random3');
		expect(header[0].buttons.map((button) => button.name)).toEqual([
			T.BACK,
			'Files',
			plural('MEMBER_COUNT', 3),
			T.FAVORITE,
			T.NOTIFY_LEVEL,
			T.MORE
		]);
		expect(header[0].buttons.find((button) => button.name === T.FAVORITE)?.pressed).toBe('false');

		// The More menu of a channel that is not the default one: the link, and the way out (`:178-202`, `canLeave` `:134`).
		await chatPane(page).getByRole('button', { name: T.MORE, exact: true }).click();
		await expect.poll(() => page.getByRole('menuitem').count(), { timeout: 20_000 }).toBeGreaterThan(0);
		const moreItems = (await page.getByRole('menuitem').allInnerTexts()).map(flat);
		report('more menu (channel)', { items: moreItems });
		expect(moreItems).toEqual([T.COPY_LINK, T.LEAVE]);
		await page.keyboard.press('Escape');

		// The member chip is a dialog trigger; opening it is what reads the members, and the popover names the people this
		// file listed for that conversation.
		await chatNav(page).getByRole('link', { name: 'Fixture Teammate', exact: false }).first().click();
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_DIRECT}`);
		const chip = chatPane(page).getByRole('button', { name: plural('MEMBER_COUNT', 2), exact: true });
		await expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
		expect(served.countOf('GET', `/api/chat/conversations/${ID_DIRECT}/members`)).toBe(0);
		await chip.click();
		await expect
			.poll(() => served.countOf('GET', `/api/chat/conversations/${ID_DIRECT}/members`), { timeout: 20_000 })
			.toBe(1);
		const dialog = page.getByRole('dialog').first();
		await expect(dialog).toBeVisible();
		const dialogText = flat(await dialog.innerText());
		const directHeader = (await headerOf(page))[0];
		report('member chip', { dialogText, directHeader });
		expect(dialogText).toContain(plural('MEMBER_COUNT', 2));
		// The lane's fixture people come from the active team (`use-chat-scope.ts:56-66`), and `teamChat.YOU` marks me.
		expect(dialogText).toContain('Fixture Manager');
		expect(dialogText).toContain('Fixture Teammate');
		expect(dialogText).toContain(T.YOU);
		expect(directHeader.text).toBe('FTFixture Teammate2');
		// A direct conversation offers the link and nothing else (`canLeave` excludes `Direct`, `:134`).
		await chatPane(page).getByRole('button', { name: T.MORE, exact: true }).click();
		await expect.poll(() => page.getByRole('menuitem').count(), { timeout: 20_000 }).toBeGreaterThan(0);
		const directMore = (await page.getByRole('menuitem').allInnerTexts()).map(flat);
		report('more menu (direct)', { items: directMore });
		expect(directMore).toEqual([T.COPY_LINK]);
		await page.keyboard.press('Escape');
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the list search narrows what is already loaded, opens the first match on Enter, and asks the API nothing', async ({
		page,
		fixture
	}) => {
		const served = await serveChat(page, {
			conversations: servedList(fixture),
			categories: [CATEGORY_ENG, CATEGORY_PROJ]
		});
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const search = chatNav(page).getByRole('textbox', { name: T.SEARCH_CONVERSATIONS });
		const seen: Record<string, string[]> = {};
		const extraCalls: string[] = [];
		for (const query of ['r', 'ran', 'se', 'Teammate', '#launch', 'zzz']) {
			const before = served.calls.length;
			await search.fill(query);
			const snapshot = await listSnapshot(page);
			seen[query] = snapshot.rows.map((row) => row.text);
			extraCalls.push(...served.calls.slice(before).map((call) => `${call.method} ${call.path}`));
			report('search', { query, rows: seen[query], navText: snapshot.navText });
		}

		// `filterConversations` (`chat-list.ts:45-55`): the title without its `#`, any case, what starts with what was
		// typed first and the rest in the list order; a person of a direct conversation matches by name too.
		expect(seen['r']).toEqual(['#random', 'FTFixture Teammate1', '#general4', 'secret1']);
		expect(seen['ran']).toEqual(['#random']);
		expect(seen['se']).toEqual(['secret1']);
		expect(seen['Teammate']).toEqual(['FTFixture Teammate1']);
		expect(seen['#launch']).toEqual(['#launch']);
		// Nothing matched: the list says so, and the sections give way to one flat counted list (`:300-306`).
		await expect(chatNav(page).getByText(T.NO_CONVERSATIONS, { exact: true })).toBeVisible();

		await search.fill('sec');
		await search.press('Enter');
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_SECRET}`);
		await expect(search).toHaveValue('');
		report('search enter', { url: page.url(), rows: (await listSnapshot(page)).rows.map((row) => row.text) });

		await search.fill('ran');
		await page.keyboard.press('Escape');
		await expect(search).toHaveValue('');
		await search.fill('no');
		await chatNav(page).getByRole('button', { name: T.CLEAR_SEARCH, exact: true }).click();
		await expect(search).toHaveValue('');

		// Typing cost no request at all: the filter runs over what is already loaded (`conversation-list.tsx:211-212`).
		report('search requests', { extraCalls });
		expect(extraCalls).toEqual([]);
	});

	test('Shift+Escape in the filter is the pages mark-all-read shortcut, not a clear key', async ({
		page,
		fixture
	}) => {
		const served = await serveChat(page, {
			conversations: servedList(fixture),
			categories: [CATEGORY_ENG, CATEGORY_PROJ]
		});
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const search = chatNav(page).getByRole('textbox', { name: T.SEARCH_CONVERSATIONS });
		await search.fill('no');
		await expect.poll(async () => (await listSnapshot(page)).rows.map((row) => row.text)).toEqual([`#noisy`]);
		await search.press('Shift+Escape');
		await expect.poll(() => served.countOf('POST', '/api/chat/read-all'), { timeout: 20_000 }).toBe(1);
		report('shift+escape', {
			inputValue: await search.inputValue(),
			writes: served.writes(),
			rows: (await listSnapshot(page)).rows.map((row) => row.text)
		});

		// `conversation-list.tsx:222-227` leaves Shift+Escape to the page's shortcut (`chat-page.tsx:193`): the query stays,
		// and what it wrote is the same bodyless `read-all` the Unreads view offers (`chat.service.ts:324-327`).
		await expect(search).toHaveValue('no');
		expect(served.writes()).toEqual(['POST /api/chat/read-all {}']);
	});

	test('the lists only write: Mark all as read posts read-all, its Undo posts read-restore, and a refusal leaves everything', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, {
			conversations: servedList(fixture),
			categories: [CATEGORY_ENG, CATEGORY_PROJ]
		});
		await openChat(page, fixture, '/chat/unreads');
		const before = (await listSnapshot(page)).rows.map((row) => row.text);
		expect(before).toEqual([
			`${T.UNREADS}5`,
			T.THREADS,
			'#launch',
			'#general4',
			'#noisy',
			'secret1',
			'#random',
			'FTFixture Teammate1'
		]);

		await chatPane(page).getByRole('button', { name: T.MARK_ALL_READ, exact: true }).click();
		await expect.poll(() => served.countOf('POST', '/api/chat/read-all'), { timeout: 20_000 }).toBe(1);
		const readAll = served.calls.find((call) => call.method === 'POST' && call.path === '/api/chat/read-all');
		await expect
			.poll(async () => (await listSnapshot(page)).rows.map((row) => row.text))
			.toEqual([
				'Unreads',
				T.THREADS,
				'#launch',
				'#general',
				'#noisy',
				'secret',
				'#random',
				'FTFixture Teammate'
			]);
		const cleared = { rows: (await listSnapshot(page)).rows.map((row) => row.text), pane: await paneText(page) };
		report('mark all read', {
			body: readAll?.body,
			cleared,
			calls: served.shapes(),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors()
		});

		// `POST /chat/read-all` with no body of its own (`chat.service.ts:324-327`), then both lists are read again
		// (`use-chat-actions.ts` `refetchLists`), and the view has nothing left to show.
		expect(readAll?.body).toBe('{}');
		expect(cleared.rows).toEqual([
			'Unreads',
			T.THREADS,
			'#launch',
			'#general',
			'#noisy',
			'secret',
			'#random',
			'FTFixture Teammate'
		]);
		expect(cleared.pane).toContain(T.NO_UNREADS_TITLE);
		expect(cleared.pane).toContain(T.NO_UNREADS_TEXT);
		await expect(chatPane(page).getByRole('button', { name: T.MARK_ALL_READ, exact: true })).toBeDisabled();
		// The toast carries the way back (`chat-page.tsx:170-175`).
		expect(await toastTexts(page)).toEqual([`${T.ALL_READ}${T.UNDO}`]);

		await page.getByRole('button', { name: T.UNDO }).click();
		await expect.poll(() => served.countOf('POST', '/api/chat/read-restore'), { timeout: 20_000 }).toBe(1);
		await expect.poll(async () => (await listSnapshot(page)).rows.map((row) => row.text)).toEqual(before);
		const restore = served.calls.find((call) => call.path === '/api/chat/read-restore');
		report('undo', {
			restoreBody: restore?.body,
			rows: (await listSnapshot(page)).rows.map((row) => row.text),
			pane: await paneText(page)
		});
		// The Undo posts back the `snapshotId` this file's own `read-all` answer handed out (`chat.service.ts:329-332`).
		expect(restore?.body).toBe('{"snapshotId":"chatlist-snapshot-1"}');

		served.script.readAllStatus = 403;
		await chatPane(page).getByRole('button', { name: T.MARK_ALL_READ, exact: true }).click();
		await expect.poll(() => toastTexts(page), { timeout: 20_000 }).toContain(T.UPDATE_FAILED);
		await expect.poll(() => served.countOf('POST', '/api/chat/read-all'), { timeout: 20_000 }).toBe(2);
		const refused = { rows: (await listSnapshot(page)).rows.map((row) => row.text), pane: await paneText(page) };
		report('refused mark all read', {
			...refused,
			writes: served.writes(),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 150))
		});

		// The refusal is what the reader hears (`chat-page.tsx:106,174` `UPDATE_FAILED`), and the store still holds its
		// unreads: the badges are exactly what they were, so nothing was pretended.
		expect(refused.rows).toEqual(before);
		expect(refused.pane).not.toContain(T.NO_UNREADS_TITLE);
		expect(consoleFindings(shield, [armedRefusal('HTTP 403 Forbidden - POST /chat/read-all')])).toEqual([]);
	});

	test('a refused list read shows the pages own error, and a list that is not a list becomes a row per character', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { conversations: [], categories: [], listStatus: 500 });
		await openChat(page, fixture, '/chat/unreads');
		const refused = {
			navText: (await listSnapshot(page)).navText,
			pane: await paneText(page),
			alerts: (await page.getByRole('alert').allInnerTexts()).map(flat)
		};
		report('500 list', {
			...refused,
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 150))
		});

		// The compact error in the list (`conversation-list.tsx:312`) and the full one in the view (`chat-views.tsx:93` →
		// `ChatErrorState` `chat-states.tsx:99-125`), both `role="alert"`, both naming the retry.
		expect(refused.navText).toBe(`Chat${T.UNREADS}${T.THREADS}${T.LOAD_ERROR}${T.RETRY}`);
		expect(refused.pane).toBe(`${T.UNREADS} ${T.MARK_ALL_READ} ${T.LOAD_ERROR} ${T.RETRY}`);
		expect(refused.alerts.filter((text) => text.includes(T.LOAD_ERROR))).toEqual([
			`${T.LOAD_ERROR} ${T.RETRY}`,
			`${T.LOAD_ERROR} ${T.RETRY}`
		]);
		// Only the client line naming this file's armed path and status is excused.
		expect(consoleFindings(shield, [armedRefusal('HTTP Error: GET /chat/conversations 500')])).toEqual([]);

		delete served.script.listStatus;
		served.script.listBody = '{"conversations":"not-an-array","categories":null}';
		await openChat(page, fixture, '/chat/unreads');
		const snapshot = await listSnapshot(page);
		report('malformed list', {
			navText: snapshot.navText,
			sections: snapshot.sections,
			rows: snapshot.rows.map((row) => ({ text: row.text, href: row.href })),
			pane: await paneText(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 150))
		});

		// `sortConversations` spreads its input (`chat-format.ts:133-141`), so the 12 characters of the string became 12
		// rows all titled with the word for an unnamed conversation (the two place rows beside them are unaffected), each
		// linking to `/chat/undefined` because a character has no `id`, and React called the duplicate keys out.
		const junkRows = snapshot.rows.filter((row) => row.text === T.UNNAMED);
		expect(junkRows.map((row) => row.text)).toEqual(new Array(12).fill(T.UNNAMED));
		expect(junkRows.map((row) => row.href)).toEqual(new Array(12).fill('/chat/undefined'));
		expect(snapshot.sections.map((section) => section.label)).toEqual([T.CHANNELS, `${T.DIRECT_MESSAGES}12`]);
		expect(shield.logMatching(/unique "key" prop/).length).toBeGreaterThan(0);
		// None of it counts as unread, so the view still shows its empty state (`chat-format.ts:128-130`).
		expect(await paneText(page)).toContain(T.NO_UNREADS_TITLE);
	});

	test('only a direct row carries a status dot, and it adds nothing to the row name', async ({ page, fixture }) => {
		await serveChat(page, { conversations: servedList(fixture), categories: [CATEGORY_ENG, CATEGORY_PROJ] });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const snapshot = await listSnapshot(page);
		const directRow = chatNav(page).getByRole('link', { name: 'Fixture Teammate', exact: false }).first();
		await directRow.hover();
		report('presence', {
			rows: snapshot.rows.map((row) => ({ href: row.href, presence: row.presence })),
			directRowText: flat(await directRow.innerText()),
			directRowAriaLabel: await directRow.getAttribute('aria-label'),
			dotCount: await directRow.locator('[data-presence]').count(),
			tooltipTexts: (await page.getByRole('tooltip').allInnerTexts()).map(flat)
		});

		// `directPartnerOf` (`chat-navigation.ts:97-106`) gives a dot to a direct conversation only, and the status comes
		// from the active team's members (`core/hooks/chat/use-chat-presence.ts`): the lane's fixture teammate reads `idle`.
		expect(snapshot.rows.filter((row) => row.presence.length > 0).map((row) => row.href)).toEqual([
			`/chat/${ID_DIRECT}`
		]);
		expect(snapshot.rows.find((row) => row.href === `/chat/${ID_DIRECT}`)?.presence).toEqual(['idle']);
		expect(
			snapshot.rows
				.filter((row) => (row.href ?? '').startsWith('/chat/c0000000'))
				.every((row) => row.presence.length === 0)
		).toBe(true);
		// The dot is a hover tooltip (`timer-status.tsx:78-96`): the row stays named by its initials, its title and its
		// badge, with nothing said about the status.
		expect(flat(await directRow.innerText())).toBe('FT Fixture Teammate 1');
		expect(await directRow.getAttribute('aria-label')).toBe(null);
		expect((await page.getByRole('tooltip').allInnerTexts()).map(flat)).toEqual([]);
	});

	test('a folded section keeps what waits for the reader, and lets the muted one go', async ({ page, fixture }) => {
		await serveChat(page, { conversations: servedList(fixture), categories: [CATEGORY_ENG, CATEGORY_PROJ] });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const before = await listSnapshot(page);
		const channelsButton = chatNav(page).getByRole('button', { name: new RegExp(`^${T.CHANNELS}`) });
		await expect(channelsButton).toHaveAttribute('aria-expanded', 'true');
		await channelsButton.click();
		const folded = await listSnapshot(page);
		await channelsButton.click();
		const after = await listSnapshot(page);
		report('folding', {
			beforeSections: before.sections,
			foldedSections: folded.sections,
			foldedRows: folded.rows.map((row) => row.text),
			afterRows: after.rows.map((row) => row.text)
		});

		expect(folded.sections).toEqual([
			{ label: `${CATEGORY_PROJ.name}1`, expanded: 'true' },
			{ label: `${T.CHANNELS}4`, expanded: 'false' },
			{ label: `${T.DIRECT_MESSAGES}1`, expanded: 'true' }
		]);
		// The list's own rule (`conversation-list.tsx:240-241`): the open conversation, anything that mentions me, and
		// anything unread that is not muted. `#noisy` is muted and mentions nothing, so it folds away; the unread
		// `#general` and `secret` and the open `#random` stay, and the untouched Projects section keeps `#launch`.
		expect(folded.rows.map((row) => row.text)).toEqual([
			`${T.UNREADS}5`,
			T.THREADS,
			'#launch',
			'#general4',
			'secret1',
			'#random',
			'FTFixture Teammate1'
		]);
		expect(after.rows.map((row) => row.text)).toEqual(before.rows.map((row) => row.text));
	});

	test('a deep link costs its own read: an unknown conversation says it is not available, and the list beside it is untouched', async ({
		page,
		fixture
	}) => {
		const served = await serveChat(page, {
			conversations: servedList(fixture),
			categories: [CATEGORY_ENG, CATEGORY_PROJ]
		});
		await openChat(page, fixture, `/chat/${ID_UNKNOWN}`);
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_UNKNOWN}`);
		const pane = await paneText(page);
		report('unknown deep link', {
			url: page.url(),
			singleReads: served.countOf('GET', `/api/chat/conversations/${ID_UNKNOWN}`),
			pane,
			listRows: (await listSnapshot(page)).rows.map((row) => row.text)
		});

		// Not in the list, so the single read is asked for (`use-chat-conversations.ts:62-72`, `retry: false`), and when it
		// does not answer, the pane says so instead of offering "pick one" (`chat-page.tsx:253-258`).
		expect(served.countOf('GET', `/api/chat/conversations/${ID_UNKNOWN}`)).toBe(1);
		expect(pane).toContain(T.NOT_AVAILABLE_TITLE);
		expect(pane).toContain(T.NOT_AVAILABLE_TEXT);
		expect((await listSnapshot(page)).rows.map((row) => row.text)).toEqual([
			`${T.UNREADS}5`,
			T.THREADS,
			'#launch',
			'#general4',
			'#noisy',
			'secret1',
			'#random',
			'FTFixture Teammate1'
		]);
	});

	test('the conversation the reader left is what /chat opens again, not the first of the list', async ({
		page,
		fixture
	}) => {
		const served = await serveChat(page, {
			conversations: servedList(fixture),
			categories: [CATEGORY_ENG, CATEGORY_PROJ]
		});
		await openChat(page, fixture, '/chat');
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_LAUNCH}`);
		// A visit that keeps storage: `signInAndVisit` → `hardVisit` clears localStorage (`helpers.ts:423-431`), which is
		// exactly what this test must not do, so the two later visits are plain navigations.
		await page.goto(`${APP_ORIGIN}/chat/${ID_SECRET}`, { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_SECRET}`);
		const stored = await page.evaluate(() => window.localStorage.getItem('chat-last-conversation'));
		await page.goto(`${APP_ORIGIN}/chat`, { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_SECRET}`);
		report('remembered conversation', {
			stored,
			urlAfterReturning: page.url(),
			singleReadsOfSecret: served.countOf('GET', `/api/chat/conversations/${ID_SECRET}`),
			calls: served.shapes()
		});

		// `chat-last-conversation` is what the auto-open reads first (`chat-page.tsx:132-142`, `chat-navigation.ts:112-120`):
		// the reader comes back to the conversation they were in, not to the top of the list.
		expect(stored).toBe(ID_SECRET);
		// Opening a conversation by a fresh address costs its one read even when the list holds it (`:62-72`).
		expect(served.countOf('GET', `/api/chat/conversations/${ID_SECRET}`)).toBeGreaterThan(0);
	});
});
