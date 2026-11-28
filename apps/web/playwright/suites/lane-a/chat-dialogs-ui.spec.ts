import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The team chat's **dialogs and channel actions** (`/chat` and `/chat/<conversationId>`), driven in the browser on lane-a
 * (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:38`). It starts
 * where `suites/lane-a/chat-conversation-ui.spec.ts:155-164` and `suites/lane-a/chat-list-unreads-threads-ui.spec.ts:148`
 * stop: the New channel / New direct / Browse dialogs and their writes, `join`, the `Create task` dialog and its task
 * write, `@` mentions with their payload, and the list's `Retry` after a refused read.
 *
 * ## What this drives
 *
 * - `app/[locale]/(main)/chat/page.tsx` → `core/components/pages/chat/chat-page.tsx`: `:94` the dialog state (`'channel' |
 *   'direct' | 'browse' | null`), `:117-122` + `:132-142` `/chat` opening the remembered (else the first) conversation and
 *   `:204` keeping the empty pane when the list has none, `:260-276` the pane's `PICK_TITLE` / `PICK_TEXT` with its Browse
 *   and New message buttons, `:106` `reportFailure()` (the `UPDATE_FAILED` toast every refused dialog write ends with),
 *   `:223-225` the list's three openers, `:323-361` the three dialogs and their writes — `actions.direct` /
 *   `actions.createChannel` / `actions.join`, each followed by `router.push('/chat/<id>')`, each rethrowing after the toast.
 * - `core/components/pages/chat/chat-dialogs.tsx`: `PeoplePicker` `:19-49` (the `SEARCH_PEOPLE` field `:30`, the filter
 *   `:22-25`, a picked row `aria-pressed` `:37`, `NO_PEOPLE` `:45`); `NewDirectDialog` `:52-93` (`NEW_MESSAGE` `:78`,
 *   `NEW_MESSAGE_TEXT` with `{max}` = `CHAT_GROUP_MAX_MEMBERS` 50 (`core/types/interfaces/common/chat.ts:40`) at `:79`,
 *   `Start` gated `busy || selected.size === 0 || selected.size >= CHAT_GROUP_MAX_MEMBERS` `:86`); `NewChannelDialog`
 *   `:96-150` (name `:131` `maxLength={120}` `autoFocus`, topic `:132` `maxLength={500}`, the private checkbox `:133-136`,
 *   `Create` gated `busy || !name.trim()` `:143`, the fields cleared **only on the success path** `:115-118`);
 *   `BrowseChannelsDialog` `:153-196` (`BROWSE_CHANNELS` / `BROWSE_TEXT`, `LOADING` `:173`, `NO_CHANNELS_TO_JOIN` `:174`,
 *   a row per channel with `MEMBER_COUNT` and its topic `:180-186`, `JOIN` disabled for the id being joined `:187`).
 * - `core/components/pages/chat/conversation-list.tsx`: `:267` the header's `NEW_MESSAGE` button, `:118-130` `SectionAction`
   and `:180-194` `AddRow` (the empty sections' openers), `:312` the list's `ChatErrorState` (`message=LOAD_ERROR`,
 *   `retryLabel=RETRY`), `:318-346` the Channels section with its Browse / New channel actions and `NO_CHANNELS` empty row,
 *   `:347-366` the Direct section with `NO_DIRECT`; `core/components/pages/chat/chat-states.tsx:99-125` (the error state's
 *   `role="alert"` and its Retry button).
 * - `core/components/pages/chat/create-task-dialog.tsx` (mounted per message from `conversation-view.tsx:469`): the title
 *   prefilled `chatTaskTitleOf(message.body)` `:28`, `CREATE_TASK_TEXT_TEAM {team}` `:72`, the busy guard `:33`, the write
 *   `:37` (title + `organizationTeamId` from `activeTeamState` + `projectId` from `teamDefaultProjectId`), `:42-43` close +
 *   `toast(TASK_CREATED)` with the `OPEN` action, `:54` `TASK_CREATE_FORBIDDEN` for 403 else `TASK_CREATE_FAILED`, and
 *   `:60` `onOpenChange={(open) => !open && !busy && onClose()}` (the dialog cannot be dismissed while the write is out).
 *   `core/lib/utils/chat-task.ts:32-40` (`chatTaskTitleOf`: the first non-empty line, mention tokens dropped, spaces
 *   collapsed, cut to `CHAT_TASK_TITLE_MAX` 255) and `core/lib/helpers/team-default-project.ts:11-22`.
 * - `core/components/pages/chat/message-composer.tsx`: `EVERYONE` `:20-23` (`!channel`, `!here`), the `@` query
 *   `:135` (`core/lib/utils/chat-format.ts:93-99`), the suggestions `:138-150` (`suggestMentions(people, query, 6)`
 *   (`core/lib/utils/chat-format.ts:104-114`) then EVERYONE), `insertMention` `:206-214` (the token `<@employeeId>`), the
 *   mention listbox `:369-398` (`role="listbox"` `aria-label=MENTION_SOMEONE`, one `role="option"` each, the two everyone
 *   rows labelled with `EVERYONE`), the textarea `:416-444` (`aria-autocomplete`, `aria-controls`, `aria-activedescendant`),
 *   `submit` `:239-250`; `conversation-view.tsx:456-466` (the page composer, `people.list`) and `core/hooks/chat/use-chat-actions.ts:139`
 *   (`mentionEmployeeIds: input.mentionEmployeeIds ?? mentionedEmployeeIds(body)` in the POST body).
 * - The writes: `core/services/client/api/chat/chat.service.ts` `createChannel` `:88-91` (`POST /chat/conversations`),
 *   `direct` `:99-102` (`POST /chat/direct {employeeIds}`), `join` `:109-112` (`POST /chat/conversations/<id>/join`, empty
 *   body), `createTask` `:248-251`; `core/hooks/chat/use-chat-actions.ts` `createChannel` `:344-351`, `direct` `:353-360`,
 *   `join` `:362-370` (each `refetchLists()` — `:80-92` — after the answer, `join` also invalidating the browse query at
 *   `:366`) and `createTask` `:247-259`; `core/hooks/chat/use-chat-conversations.ts` `useChatConversations` `:17-47`
 *   (LIST_POLL_MS 30 000 `:14`, `retry: query.refetch` `:45`), `useChatBrowse` `:50-59` (read once per 30 000 ms
 *   `staleTime`), `useChatConversation` `:62-72` (only when the list does not already know the id), and
 *   `core/hooks/chat/use-chat-scope.ts:50-73` (the people: the active team's members merged with `GET /api/chat/people`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub, the app shell, the mock's `/api/user/me`, its team and directory reads (the picker's
 * `Fixture Manager` / `Fixture Teammate` / `Fixture Restricted Teammate` come from the active team, merged in
 * `use-chat-scope.ts:62-72`), the team's own task list (the task card's title), and the mock's request log nothing here reads.
 *
 * **Served by this file:** every `/api/chat/**` read and write these tests reach, through `page.route` on the **mock
 * origin** only, with the exact path list of `CHAT_PATHS` below (never a bare glob, so the app's own `app/api/**` twins on
 * the app origin are untouched; a chat path these tests never touch is left to the mock), because `grep -c chat cypress/support/mock-gauzy-server.mjs` is **0**: unmatched, the mock answers a chat
 * `GET` with its catch-all `pagination([])` (`mock-gauzy-server.mjs:895`), a non-`GET` by echoing the body (`:894`) — an
 * echo would make a refused write look like a successful one, so every test serves its own store. Each answer restates the
 * mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097`), `OPTIONS` is answered before a
 * call is recorded, and `route.fetch()` is never called: this file's own call log is the witness that the page acted on
 * what was served here. The store *is* the answer (`serveChat` below, the shape of
 * `suites/lane-a/chat-conversation-ui.spec.ts:463-769` and `suites/lane-a/api-tokens-settings-ui.spec.ts:275-349`): reads
 * answer from the current store, a write changes it so a later read agrees with it, and a refused write (`script.refuse`)
 * changes nothing. One write can be **held** unanswered (`script.hold` + `script.holdMs`) so its busy state can be read
 * while the call is recorded, with `releaseHold()` in a `finally`.
 *
 * ## The runtime flag
 *
 * `NEXT_PUBLIC_CHAT_ENABLED` is a runtime public value (`core/lib/utils/chat-enabled.ts:8-11`) and this lane does not set
 * it: every test turns it on **in its own browser only** through `overrideRuntimeEnv` (`playwright/helpers.ts:485-507`)
 * before its first visit. `NEXT_PUBLIC_REALTIME_ENABLED` is off here as served, so the lists keep their own polls
 * (`use-chat-conversations.ts:26`) and no `/graphql` socket is opened.
 *
 * ## Where every asserted value came from
 *
 * Throwaway probes on this lane (`D:\Coding\.tmp\probe-chatdialogs\`, configs with no `webServer`):
 * `s3-lane-a-chatdialogs-probe-1.log` (P1 the list pane, its openers and where `/chat` lands, P2 the New channel dialog's
 * fields and gates, P3 New direct's picker and its write, P4 the Browse dialog's rows and its join, P5 the message's More
 * menu and the Create task dialog, P6 the suggestion list and a mention of a **non-36-character** employee id),
 * `s3-lane-a-chatdialogs-probe-2.log` (P7 the create's body, the list and the pane after it, P8 a refused create 400 then
 * 500 and what the dialog keeps, P9 a held create, P10 Browse with nothing to join, P11 the list's `Retry`, P12 a mention
 * of a 36-character employee id and `@channel`), `s3-lane-a-chatdialogs-probe-3.log` (Q1 a picked picker row as the page
 * draws it, Q2 the join's calls and the Browse reopened, Q3 the refused list read and the Retry read the right way, Q4 a
 * name the list already has, Q5 the empty list's own openers, Q6 the Create task dialog held and refused 403) and
 * `s3-lane-a-chatdialogs-probe-4.log` (R1 the name gate: spaces, `maxLength`, Escape; R2 a 409 of a name the list has and
 * the Cancel after it; R3 two people picked, the group's write and the picker's own filter). Every test below prints its
 * own `[lane-a chat-dialogs] MEASURE …` line as well, so each pinned value has a log line behind it from this file too.
 *
 * Served times are relative to `Date.now()` (`ago`), so nothing pins today's date; the one date this file reads (the
 * welcome's `Created on …`) is recomputed **in the browser** (`longDateIn`) the way `core/lib/utils/chat-timeline.ts:131`
 * formats it, from the `createdAt` this file's own store served for the channel it created.
 *
 * ## Findings (measured; with the code that explains each)
 *
 * 1. **`archive` and `addMembers` have no way to be used.** `chatService.archive` (`chat.service.ts:104-107`),
 *    `addMembers` (`:124-127`), `removeMember` (`:129-132`) and `updateConversation` (`:93-96`) are called by nothing in
 *    this app: `grep -rn "chatService\\.[a-zA-Z]*(" apps packages` lists every client method that is called and none of
 *    these appears, and the conversation header's More menu (`conversation-header.tsx:184-201`) offers Copy link,
 *    Integrations (flag on) and Leave only. So the brief's `addMembers` and `archive` tests (its 5 and 6) have no UI to
 *    drive; this file says so instead of inventing one, and covers the dialogs the page really offers. Not tagged: no
 *    comment, type or test states a UI for them.
 * 2. **A channel name the list already has is sent anyway.** `NewChannelDialog` gates `Create` on `name.trim()` and
 *    `busy` only (`chat-dialogs.tsx:143`); measured `Create` enabled with `general` typed while `#general` is in the list,
 *    and the `POST /api/chat/conversations` going out with it (probe-3 Q4, probe-4 R2). Only the platform's refusal
 *    (armed 409 here) keeps it out of the list. Not tagged: nothing states a client-side duplicate check.
 * 3. **A refused dialog write keeps everything the person typed.** `create()` clears name / topic / the picked people only
 *    on the success path (`chat-dialogs.tsx:114-118`); measured for 400, 409 and 500: the dialog stays open with its name
 *    and topic, the picked person still `aria-pressed="true"`, `Create` enabled again, the store unchanged, and one
 *    `UPDATE_FAILED` toast per attempt (probe-2 P8, probe-4 R2). This is what the code does on purpose; no tag.
 * 4. **A busy `Create task` dialog cannot be dismissed; a busy New channel one can only be cancelled through `Cancel`.**
 *    `create-task-dialog.tsx:60` refuses `onOpenChange` while `busy`, and `:84`/`:87` disable Cancel and Create task;
 *    measured: while the task write was held, both buttons were disabled and Escape left the dialog open (probe-3 Q6).
 *    `chat-dialogs.tsx` has no such guard: while a held create was out, `Cancel` was still enabled and `Create` was not
 *    (probe-2 P9), and Escape closes this dialog whenever it is not busy (probe-4 R1). Untagged — the quoted lines state
 *    exactly this.
 * 5. **The list's failure does not stop the conversation pane.** A deep link reads its conversation on its own
 *    (`use-chat-conversations.ts:62-72`), so with `GET /api/chat/conversations` refused the list shows its `LOAD_ERROR` +
 *    `Retry` alert while the pane is complete (probe-3 Q3). A second `role="alert"` with no text is on the page at the
 *    same time (measured, unexplained by `chat-states.tsx`, which renders one).
 * 6. **`next dev` adds its own `[role="dialog"]` whenever a console error is logged** (no `aria-labelledby`, 0 px high, a
 *    `Copy Error Info` button — probe-2 P8, probe-4 R2). Every dialog this file reads is therefore picked by its own
 *    title rather than by `[role="dialog"]` alone. Dev-mode only, so untagged.
 * 7. **A `@` suggestion is only a mention when the employee id is the platform's 36-character shape.** `insertMention`
 *    writes `<@employeeId>` for any id (`message-composer.tsx:209`), while `CHAT_MENTION_TOKEN_PATTERN`
 *    (`core/types/interfaces/common/chat.ts:52`, `/<(@|#)([0-9a-fA-F-]{36})>|<!(channel|here)>/`) is what
 *    `mentionedEmployeeIds` (`core/lib/utils/chat-format.ts:80-87`) and `splitMentions` (`:23-47`) read: with a served
 *    person whose employee id was `emp-alice`, the token stayed raw text in the sent body, `mentionEmployeeIds` was `[]`
 *    and the row printed the raw token (probe-1 P6); with a 36-character id all three work (probe-2 P12). Untagged — a
 *    payload the real platform would not send.
 *
 * ## What this file does not cover
 *
 * `archive`, `addMembers`, `removeMember`, `updateConversation`, `pins`, `listCategories` and `reorderCategories` (finding 1);
 * `leave`, the favourite and the notify menu, reactions, pin, edit, delete, threads and the archived pane
 * (`suites/lane-a/chat-conversation-ui.spec.ts`); the `Unreads` / `Threads` views, the list's search and its sections
 * (`suites/lane-a/chat-list-unreads-threads-ui.spec.ts`); attachments and the files pane; the `send-task-to-chat` dialog
 * (`send-task-to-chat-dialog.tsx`); the keyboard shortcuts and the command palette (including the palette's
 * `?new=message` request, `chat-page.tsx:108-129`); the category sections (this file serves no categories); the task
 * card's own status / priority / assignee menus (they write `PATCH /chat/messages/<id>/tasks/<id>`, out of this brief);
 * `CHAT_GROUP_MAX_MEMBERS`'s cap (50 people would have to be served to reach it); and the task card's own read of a task
 * the team's list does not hold (`use-chat-task-card.ts:81-94` — this file points every card at `fixture.ids.task`, which
 * the team's list holds).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `locales/en.json` → `teamChat`, flattened so a nested key such as `NOTIFY.MUTED` reads as one key. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	teamChat: Record<string, unknown>;
	common: Record<string, unknown>;
};
const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
	Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
		if (typeof value === 'string') acc[prefix + key] = value;
		else if (value && typeof value === 'object')
			Object.assign(acc, flatten(value as Record<string, unknown>, `${prefix}${key}.`));
		return acc;
	}, {});
const T = flatten(EN.teamChat);
/** The dialog's `X` button is named by `common.CLOSE` (`core/components/common/dialog.tsx:149`), not by an English literal. */
const CLOSE_BUTTON = flatten(EN.common).CLOSE;

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

/** A copy key with its `{placeholder}` filled from a value this file knows (never a re-typed sentence). */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: unknown) =>
	console.log(`[lane-a chat-dialogs] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for everything this file answers. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * Every path this file answers, as an exact list (`<id>` segments widened to one path segment), matched **after**
 * `url.origin === MOCK_API_ORIGIN` — so the app's own `app/api/**` twins on the app origin are never touched.
 */
const CHAT_PATHS: RegExp[] = [
	/^\/api\/chat\/conversations$/,
	/^\/api\/chat\/conversations\/browse$/,
	/^\/api\/chat\/conversations\/[^/]+$/,
	/^\/api\/chat\/conversations\/[^/]+\/(messages|files|members|join|read|state|typing)$/,
	/^\/api\/chat\/direct$/,
	/^\/api\/chat\/states$/,
	/^\/api\/chat\/people$/,
	/^\/api\/chat\/messages\/[^/]+\/create-task$/
];

const MINUTE = 60_000;
/** Served times are always relative to now, so no test can pin today's date or the browser's zone. */
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

/** The welcome's `Created on <long date>`, recomputed **in the browser** as `chat-timeline.ts:131` formats it. */
const longDateIn = (page: Page, iso: string) =>
	page.evaluate(
		(value: string) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', { dateStyle: 'long' }).format(
				new Date(value)
			),
		iso
	);

/** `IChatConversationWithState` (`core/types/interfaces/common/chat.ts:103-107`) as this file serves it. */
type ServedState = {
	conversationId: string;
	role: string;
	notifyLevel: string;
	isFavorite: boolean;
	unreadCount: number;
	mentionCount: number;
	lastReadMessageId: string | null;
	lastReadAt: string | null;
};
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
	createdByEmployeeId: string | null;
	messageCount: number;
	lastMessageAt: string | null;
	organizationId: string | null;
	createdAt: string;
	memberCount: number;
	members?: { employeeId: string; userId: string; role: string; joinedAt: null }[];
	state: ServedState | null;
};
/** `IChatMessage` as this file serves it (`taskReferences` is what the Create task answer adds to it). */
type ServedMessage = {
	id: string;
	conversationId: string;
	authorEmployeeId: string | null;
	authorUserId: string | null;
	kind: string;
	body: string;
	mentionEmployeeIds: string[] | null;
	mentionsChannel: boolean;
	mentionsHere: boolean;
	replyToId: string | null;
	threadRootId: string | null;
	alsoInConversation: boolean;
	replyCount: number;
	lastReplyAt: string | null;
	pinnedAt: string | null;
	pinnedByEmployeeId: string | null;
	editedAt: string | null;
	attachmentIds: string[] | null;
	attachmentNames: string | null;
	nonce: string | null;
	deletedAt: string | null;
	createdAt: string;
	reactions: { emoji: string; count: number; mine: boolean }[];
	following: boolean;
	taskReferences?: { messageId: string; taskId: string; kind: string }[];
};
type ServedCall = { method: string; path: string; query: string; body: string | null };
/** Which reads and writes this file refuses, with which status. */
type Refusals = {
	list?: number;
	messages?: number;
	send?: number;
	create?: number;
	direct?: number;
	join?: number;
	task?: number;
};
type ChatScript = {
	conversations: ServedConversation[];
	categories?: { id: string; name: string; position: number }[];
	browse?: ServedConversation[];
	people?: { employeeId: string; userId: string | null; name: string | null; imageUrl: null }[];
	messages: ServedMessage[];
	/** Who the platform says wrote a message this file creates: the signed-in fixture person. */
	author?: { employeeId: string; userId: string };
	refuse?: Refusals;
	/** One write held unanswered (`hold` names it, `holdMs` how long). */
	hold?: 'create' | 'direct' | 'join' | 'task';
	holdMs?: number;
	/** The task the Create task answer names (this file always names the fixture team's own task). */
	taskId?: string;
};
type ChatHarness = {
	/** Mutating this changes what the same route answers, so a test never has to unroute to change its mind. */
	script: ChatScript;
	/** What the store holds now: reads answer from it, writes change it, a refused write leaves it as it was. */
	store: { conversations: ServedConversation[]; messages: ServedMessage[] };
	calls: ServedCall[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	/** Every non-`GET` call from `index` on — the only way "X was sent after Y" can be read. */
	writesFrom: (index: number) => ServedCall[];
	callsFrom: (index: number) => ServedCall[];
	/** True while the armed write is recorded and not yet answered. */
	heldOpen: () => boolean;
	/** Ends the hold now (every test that arms one calls this in a `finally`). */
	releaseHold: () => void;
};

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
const channelOf = (id: string, name: string | null, over: Partial<ServedConversation> = {}): ServedConversation => ({
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
	messageCount: 1,
	lastMessageAt: ago(60),
	organizationId: null,
	createdAt: ago(600),
	memberCount: 3,
	state: stateOf(id),
	...over
});
const messageOf = (id: string, conversationId: string, over: Partial<ServedMessage> = {}): ServedMessage => ({
	id,
	conversationId,
	authorEmployeeId: null,
	authorUserId: null,
	kind: 'message',
	body: '',
	mentionEmployeeIds: null,
	mentionsChannel: false,
	mentionsHere: false,
	replyToId: null,
	threadRootId: null,
	alsoInConversation: true,
	replyCount: 0,
	lastReplyAt: null,
	pinnedAt: null,
	pinnedByEmployeeId: null,
	editedAt: null,
	attachmentIds: null,
	attachmentNames: null,
	nonce: null,
	deletedAt: null,
	createdAt: ago(60),
	reactions: [],
	following: false,
	...over
});

/** The page's own order: time, then id (`use-chat-messages.ts:111-115`). */
const byPlace = (a: ServedMessage, b: ServedMessage) => {
	const time = Date.parse(a.createdAt) - Date.parse(b.createdAt);
	return time !== 0 ? time : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};
const timelineOf = (store: ChatHarness['store'], conversationId: string) =>
	store.messages.filter((message) => message.conversationId === conversationId && !message.deletedAt).sort(byPlace);

/**
 * This file's stand-in for the platform's chat, on the mock origin, because the mock has no handler for any of it (see the
 * header). Reads answer from the current store, so a write can be followed by the re-read `refetchLists` sends.
 */
async function serveChat(page: Page, initial: ChatScript): Promise<ChatHarness> {
	const script: ChatScript = { ...initial, refuse: { ...initial.refuse } };
	const store = {
		conversations: initial.conversations.map((conversation) => ({ ...conversation })),
		messages: initial.messages.map((message) => ({ ...message }))
	};
	const calls: ServedCall[] = [];
	let created = 0;
	let held = false;
	let settleHold: (() => void) | null = null;
	let holdTimer: ReturnType<typeof setTimeout> | null = null;

	await page.route(
		(routeUrl: URL) =>
			routeUrl.origin === MOCK_API_ORIGIN && CHAT_PATHS.some((pattern) => pattern.test(routeUrl.pathname)),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const requestUrl = new URL(request.url());
			const path = requestUrl.pathname;
			const query = requestUrl.searchParams;
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method, path, query: requestUrl.search, body: request.postData() });
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});
			const refusal = (kind: keyof Refusals) => {
				const status = script.refuse?.[kind];
				if (!status) return null;
				return answer(status, { statusCode: status, message: `this file refused ${kind}` });
			};
			const conversationIn = (id: string) => store.conversations.find((conversation) => conversation.id === id);
			const find = (id: string) => store.messages.find((message) => message.id === id);
			/** Holds this write's answer until `holdMs` passes or the test releases it. */
			const hold = async (kind: NonNullable<ChatScript['hold']>) => {
				if (script.hold !== kind || !script.holdMs) return;
				held = true;
				await new Promise<void>((resolve) => {
					settleHold = resolve;
					holdTimer = setTimeout(() => resolve(), script.holdMs);
				});
				if (holdTimer) clearTimeout(holdTimer);
				holdTimer = null;
				settleHold = null;
				held = false;
			};

			if (path === '/api/chat/conversations' && method === 'GET') {
				const refused = refusal('list');
				if (refused) return refused;
				return answer(200, { conversations: store.conversations, categories: script.categories ?? [] });
			}
			if (path === '/api/chat/conversations' && method === 'POST') {
				await hold('create');
				const refused = refusal('create');
				if (refused) return refused;
				const sent = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				const id = `srv-channel-${(created += 1)}`;
				const now = new Date().toISOString();
				const memberIds = Array.isArray(sent.memberEmployeeIds) ? (sent.memberEmployeeIds as string[]) : [];
				const conversation = channelOf(id, String(sent.name ?? ''), {
					topic: sent.topic ? String(sent.topic) : null,
					visibility: String(sent.visibility ?? 'public'),
					createdAt: now,
					lastMessageAt: null,
					messageCount: 0,
					memberCount: memberIds.length + 1,
					state: stateOf(id)
				});
				store.conversations = [...store.conversations, conversation];
				return answer(201, { conversation, events: [] });
			}
			if (path === '/api/chat/direct' && method === 'POST') {
				await hold('direct');
				const refused = refusal('direct');
				if (refused) return refused;
				const sent = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				const employeeIds = Array.isArray(sent.employeeIds) ? (sent.employeeIds as string[]) : [];
				const id = `srv-direct-${(created += 1)}`;
				// The platform's own rule (`chat.service.ts:98`): two people a direct, three or more a group.
				const conversation = channelOf(id, null, {
					kind: employeeIds.length > 1 ? 'group' : 'direct',
					createdAt: new Date().toISOString(),
					lastMessageAt: null,
					messageCount: 0,
					memberCount: employeeIds.length + 1,
					members: employeeIds.map((employeeId) => ({
						employeeId,
						userId: '',
						role: 'member',
						joinedAt: null
					})),
					state: stateOf(id)
				});
				store.conversations = [...store.conversations, conversation];
				return answer(201, { conversation, created: true, events: [] });
			}
			if (path === '/api/chat/states')
				return answer(200, {
					states: store.conversations
						.map((conversation) => conversation.state)
						.filter((state): state is ServedState => state !== null),
					threads: []
				});
			if (path === '/api/chat/conversations/browse') {
				const mine = new Set(store.conversations.map((conversation) => conversation.id));
				return answer(
					200,
					(script.browse ?? []).filter((channel) => !mine.has(channel.id))
				);
			}
			if (path === '/api/chat/people') return answer(200, script.people ?? []);

			const messagesRead = /^\/api\/chat\/conversations\/([^/]+)\/messages$/.exec(path);
			if (messagesRead && method === 'GET') {
				const refused = refusal('messages');
				if (refused) return refused;
				const all = timelineOf(store, messagesRead[1]);
				const limit = Number(query.get('limit') ?? 50);
				return answer(200, {
					messages: all.slice(Math.max(0, all.length - limit)),
					hasBefore: false,
					hasAfter: false
				});
			}
			if (/^\/api\/chat\/conversations\/[^/]+\/messages$/.test(path) && method === 'POST') {
				const conversationId = path.split('/')[4];
				const sent = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				const refused = refusal('send');
				if (refused) return refused;
				const now = new Date().toISOString();
				const message = messageOf(`srv-${(created += 1)}`, conversationId, {
					body: String(sent.body ?? ''),
					nonce: sent.nonce === undefined ? null : String(sent.nonce ?? ''),
					mentionEmployeeIds: Array.isArray(sent.mentionEmployeeIds)
						? (sent.mentionEmployeeIds as string[])
						: [],
					authorEmployeeId: script.author?.employeeId ?? null,
					authorUserId: script.author?.userId ?? null,
					createdAt: now
				});
				store.messages = [...store.messages, message];
				const conversation = conversationIn(conversationId);
				if (conversation) {
					conversation.messageCount += 1;
					conversation.lastMessageAt = now;
				}
				return answer(201, { message, events: [] });
			}
			if (/^\/api\/chat\/conversations\/[^/]+\/files$/.test(path))
				return answer(200, { files: [], hasMore: false });
			const members = /^\/api\/chat\/conversations\/([^/]+)\/members$/.exec(path);
			if (members && method === 'GET') return answer(200, conversationIn(members[1])?.members ?? []);
			const typing = /^\/api\/chat\/conversations\/([^/]+)\/typing$/.exec(path);
			if (typing && method === 'POST') return answer(200, { sent: true, expiresInMs: 6000 });
			const read = /^\/api\/chat\/conversations\/([^/]+)\/read$/.exec(path);
			if (read && method === 'POST') {
				const conversation = conversationIn(read[1]);
				if (conversation?.state)
					conversation.state = {
						...conversation.state,
						unreadCount: 0,
						mentionCount: 0,
						lastReadAt: new Date().toISOString()
					};
				return answer(200, { events: [] });
			}
			const join = /^\/api\/chat\/conversations\/([^/]+)\/join$/.exec(path);
			if (join && method === 'POST') {
				await hold('join');
				const refused = refusal('join');
				if (refused) return refused;
				const found = (script.browse ?? []).find((channel) => channel.id === join[1]);
				if (!found) return answer(404, { statusCode: 404, message: 'this file has no such channel' });
				const conversation = { ...found, state: stateOf(found.id) };
				store.conversations = [...store.conversations, conversation];
				return answer(200, { conversation, events: [] });
			}
			const single = /^\/api\/chat\/conversations\/([^/]+)$/.exec(path);
			if (single && method === 'GET') {
				const found = conversationIn(single[1]);
				if (!found) return answer(404, { statusCode: 404, message: 'this file has no such conversation' });
				return answer(200, found);
			}
			const createTask = /^\/api\/chat\/messages\/([^/]+)\/create-task$/.exec(path);
			if (createTask && method === 'POST') {
				await hold('task');
				const refused = refusal('task');
				if (refused) return refused;
				const message = find(createTask[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				const sent = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				const taskId = script.taskId ?? 'srv-task-1';
				const reference = { messageId: message.id, taskId, kind: 'created' };
				message.taskReferences = [reference];
				return answer(201, {
					task: { id: taskId, title: String(sent.title ?? ''), number: 4242, prefix: 'FIX' },
					reference,
					events: []
				});
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${path}` });
		}
	);

	return {
		script,
		store,
		calls,
		shapes: () =>
			calls.map((call) => `${call.method} ${call.path}${call.query}${call.body === null ? '' : ` ${call.body}`}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		writesFrom: (index) => calls.slice(index).filter((call) => call.method !== 'GET'),
		callsFrom: (index) => calls.slice(index),
		heldOpen: () => held,
		releaseHold: () => {
			if (holdTimer) clearTimeout(holdTimer);
			settleHold?.();
		}
	};
}

const ID_GENERAL = 'c0000000-0000-4000-8000-000000000gen';
const ID_RANDOM = 'c0000000-0000-4000-8000-000000000ran';
/** The names this file serves for its two channels, so every locator names a served value rather than a typed one. */
const NAME_GENERAL = 'general';
const NAME_RANDOM = 'random';
/** The body this file serves for the message every `Create task` test starts from (two lines on purpose). */
const MSG_TASK_BODY = 'the first line of a message\nand a second line nobody copies';
/** What `chatTaskTitleOf` (`chat-task.ts:32-40`) keeps of that body: its first line. */
const MSG_TASK_TITLE = MSG_TASK_BODY.split('\n')[0];
const ID_JOIN_A = 'j0000000-0000-4000-8000-00000000000a';
const ID_JOIN_B = 'j0000000-0000-4000-8000-00000000000b';
/** The two public channels this file serves as "not joined yet". */
const NAME_JOIN_A = 'design';
const NAME_JOIN_B = 'support';
const TOPIC_JOIN_A = 'the design channel';
/** Served directory people: 36-character employee ids, the only shape `CHAT_MENTION_TOKEN_PATTERN` (chat.ts:52) reads. */
const EMP_THIRD = 'e0000000-0000-4000-8000-0000000000c3';
const EMP_ALICE = 'e0000000-0000-4000-8000-0000000000a1';
const NAME_THIRD = 'Served Third';
const NAME_ALICE = 'Alice Served';
const MSG_TASK = 'msg-task-1';
/** The composer's own `EVERYONE` row (`message-composer.tsx:20-23`: `{ employeeId: '!channel', name: 'channel' }`): the
 * token it puts in the field and the label the row is printed with. */
const EVERYONE_CHANNEL = { employeeId: '!channel', name: 'channel' };
const EVERYONE_CHANNEL_TOKEN = `<${EVERYONE_CHANNEL.employeeId}>`;
const EVERYONE_CHANNEL_LABEL = `@${EVERYONE_CHANNEL.name}`;

/** What every test is served: two channels of mine, two public channels I am not in, two people of the organization. */
const servedStore = (fixture: BootstrapFixture): ChatScript => ({
	conversations: [
		channelOf(ID_GENERAL, NAME_GENERAL, { isDefault: true, memberCount: 4, topic: 'everything of this team' }),
		channelOf(ID_RANDOM, NAME_RANDOM, {
			visibility: 'private',
			memberCount: 2,
			lastMessageAt: ago(20),
			createdAt: ago(600)
		})
	],
	categories: [],
	browse: [
		channelOf(ID_JOIN_A, NAME_JOIN_A, { memberCount: 7, topic: TOPIC_JOIN_A }),
		channelOf(ID_JOIN_B, NAME_JOIN_B, { memberCount: 12, topic: null })
	],
	people: [
		{ employeeId: EMP_THIRD, userId: null, name: NAME_THIRD, imageUrl: null },
		{ employeeId: EMP_ALICE, userId: null, name: NAME_ALICE, imageUrl: null }
	],
	author: { employeeId: fixture.ids.employee, userId: fixture.ids.user },
	messages: [
		messageOf(MSG_TASK, ID_RANDOM, {
			body: MSG_TASK_BODY,
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			createdAt: ago(200)
		})
	]
});

/** The list's own pane (`conversation-list.tsx:263` `nav aria-label=CONVERSATIONS`). */
const listPane = (page: Page) => page.getByRole('navigation', { name: T.CONVERSATIONS });
// Every `evaluate` / `evaluateAll` callback below runs **in the browser**, so it re-declares its own text helper instead
// of closing over `flat` (a closed-over spec name throws `ReferenceError` there).
const listRows = (page: Page) =>
	listPane(page)
		.getByRole('link')
		.evaluateAll((links) =>
			links.map((link) => ({
				name: (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
				href: link.getAttribute('href'),
				current: link.getAttribute('aria-current')
			}))
		);
const listButtons = (page: Page) =>
	listPane(page)
		.getByRole('button')
		.evaluateAll((buttons) =>
			buttons.map((button) => ({
				name: button.getAttribute('aria-label') ?? (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
				expanded: button.getAttribute('aria-expanded')
			}))
		);
/** The conversation pane; the shell has its own `<nav>` and three `<main>`s (`chat-page.tsx:212-236`). */
const chatPane = (page: Page) => page.locator('main.h-full.min-w-0.flex-1');
const rowOf = (page: Page, id: string) => chatPane(page).locator(`[data-message-id="${id}"]`);
const composerOf = (page: Page, name: string) =>
	chatPane(page).getByRole('textbox', { name: filled('COMPOSER_PLACEHOLDER', { name }) });
const sendButton = (page: Page) => chatPane(page).getByRole('button', { name: T.SEND });
const headerButtons = (page: Page) =>
	chatPane(page)
		.locator('header')
		.getByRole('button')
		.evaluateAll((buttons) =>
			buttons.map(
				(button) => button.getAttribute('aria-label') ?? (button.textContent ?? '').replace(/\s+/g, ' ').trim()
			)
		);

/**
 * A dialog picked by **its own title**: `next dev` adds a `[role="dialog"]` of its own (no `aria-labelledby`, 0 px high)
 * whenever a console error was logged — finding 6 — so `[role="dialog"]` alone is not this file's dialog.
 */
const appDialog = (page: Page, title: string) => page.getByRole('dialog', { name: title, exact: true });
/** Its copy, read (not asserted visible: a Base UI dialog's outer box can measure 0 px high). */
const dialogCopy = (page: Page, title: string) =>
	appDialog(page, title).evaluate((dialog) => {
		const text = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim();
		return {
			text: text(dialog),
			height: Math.round(dialog.getBoundingClientRect().height),
			inputs: Array.from(dialog.querySelectorAll('input')).map((input) => ({
				type: input.getAttribute('type'),
				label: input.getAttribute('aria-label'),
				value: input.value,
				checked: input.checked
			})),
			buttons: Array.from(dialog.querySelectorAll('button')).map((button) => ({
				name: button.getAttribute('aria-label') ?? text(button),
				disabled: button.hasAttribute('disabled'),
				pressed: button.getAttribute('aria-pressed')
			})),
			picked: Array.from(dialog.querySelectorAll('li button[aria-pressed="true"]')).map((button) => text(button))
		};
	});
/** The picker's rows, in the order the dialog lists them. */
const pickerRows = (page: Page, title: string) =>
	appDialog(page, title)
		.locator('li button')
		.evaluateAll((rows) =>
			rows.map((row) => ({
				text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
				pressed: row.getAttribute('aria-pressed')
			}))
		);
const dialogCount = (page: Page) => page.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
const optionRows = (page: Page) =>
	page.getByRole('option').evaluateAll((rows) =>
		rows.map((row) => ({
			text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
			selected: row.getAttribute('aria-selected')
		}))
	);
/** Sonner's own toasts; its dev-mode "Copy details" action is not part of what the page told the person. */
const toastTexts = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-sonner-toast]'))
			.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
			.filter((value) => !value.includes('Copy details'))
	);
/** Sonner pauses every countdown while the pointer is over the toaster, so it is parked before a toast is waited out. */
const parkPointer = async (page: Page) => {
	await page.mouse.move(2, 2);
};
/** The row's More menu is a document-level portal (`Base UI`), so its items are read from the page, not from the row. */
const openMenuItems = (page: Page) =>
	page
		.getByRole('menuitem')
		.evaluateAll((items) => items.map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim()));

/** Flag on, signed in, on the lane's own route: the flag goes into this browser before its first navigation. */
const openChat = async (page: Page, fixture: BootstrapFixture, path: string) => {
	await overrideRuntimeEnv(page, { NEXT_PUBLIC_CHAT_ENABLED: 'true' });
	await signInAndVisit(page, fixture, path);
};

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1075`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own `GET /api/health` (30 s axios timeout, `core/services/client/api/default.ts:42`) on a loaded lane. */
const HEALTH_CHECK_NOISE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/** The client's own line for a refusal this file armed (`core/services/client/api.service.ts` `logError`). */
const armedHttpError = (verb: string, endpoint: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${endpoint} ${status}`;
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

test.describe('lane-a chat dialogs', () => {
	test('an empty list: its own openers, and the pane that offers Browse and New message', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), conversations: [], browse: [], messages: [] });
		await openChat(page, fixture, '/chat');
		// Nothing to remember and nothing in the list: `/chat` is kept (`chat-page.tsx:132-142` + `:204`).
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat`);
		await expect
			.poll(() => listButtons(page).then((buttons) => buttons.length), { timeout: 20_000 })
			.toBeGreaterThan(0);
		report('empty list', {
			navText: await listPane(page).innerText().then(flat),
			paneText: await chatPane(page).innerText().then(flat),
			calls: served.shapes()
		});

		// Both empty sections (`conversation-list.tsx:336-345`, `:360-365`), each with its own opener. One copy key per
		// assertion: `toContainText` compares against the element's text, where two neighbouring elements are joined with
		// no space at all (measured: "No channels yet.New channel"), so a sentence is only asserted as one element's text.
		await expect(listPane(page)).toContainText(T.NO_CHANNELS);
		await expect(listPane(page)).toContainText(T.NO_DIRECT);
		await expect(listPane(page).getByRole('button', { name: T.NEW_CHANNEL }).first()).toBeVisible();
		await expect(listPane(page).getByRole('button', { name: T.BROWSE_CHANNELS }).first()).toBeVisible();
		await expect(chatPane(page)).toContainText(T.PICK_TITLE);
		await expect(chatPane(page)).toContainText(T.PICK_TEXT);

		// The pane's Browse button, with nothing served to join: the dialog's own empty line, and only a Close.
		await chatPane(page).getByRole('button', { name: T.BROWSE_CHANNELS }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.BROWSE_CHANNELS).count(), { timeout: 15_000 }).toBe(1);
		// The read is answered before the copy is read: `LOADING` (`chat-dialogs.tsx:173`) is what it shows until then.
		await expect
			.poll(
				() =>
					appDialog(page, T.BROWSE_CHANNELS)
						.innerText()
						.then((text) => flat(text).includes(T.NO_CHANNELS_TO_JOIN)),
				{ timeout: 20_000 }
			)
			.toBe(true);
		report('browse empty', await dialogCopy(page, T.BROWSE_CHANNELS));
		const browseDialog = appDialog(page, T.BROWSE_CHANNELS);
		await expect(browseDialog).toContainText(T.BROWSE_TEXT);
		await expect(browseDialog).toContainText(T.NO_CHANNELS_TO_JOIN);
		// With nothing to join the dialog offers its `Close` (`common.CLOSE`, `dialog.tsx:149`) and nothing else.
		await expect(browseDialog.getByRole('button', { name: CLOSE_BUTTON })).toHaveCount(1);
		await expect(browseDialog.getByRole('button')).toHaveCount(1);

		const afterClose = served.calls.length;
		await browseDialog.getByRole('button', { name: CLOSE_BUTTON }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.BROWSE_CHANNELS).count(), { timeout: 15_000 }).toBe(0);
		// A 2 s quiet window proves the close sent nothing (Browse has no write at all).
		await page.waitForTimeout(2000);
		report('browse closed', {
			newCalls: served.callsFrom(afterClose).map((call) => `${call.method} ${call.path}`)
		});
		// What the window proves is that no **write** followed the close: `BrowseChannelsDialog` offers `JOIN` and `Close`
		// and nothing else (`chat-dialogs.tsx:176-190`).
		expect(served.writesFrom(afterClose)).toEqual([]);

		// The pane's New message button: the picker with nobody picked cannot start anything.
		await chatPane(page).getByRole('button', { name: T.NEW_MESSAGE, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.NEW_MESSAGE).count(), { timeout: 15_000 }).toBe(1);
		report('new message empty', await dialogCopy(page, T.NEW_MESSAGE));
		// Nobody picked ⇒ `Start` is disabled (`chat-dialogs.tsx:86`).
		await expect(appDialog(page, T.NEW_MESSAGE).getByRole('button', { name: T.START, exact: true })).toBeDisabled();
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the New channel dialog: its fields and its gates, with no request sent', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page).getByRole('button', { name: T.NEW_CHANNEL }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.NEW_CHANNEL).count(), { timeout: 15_000 }).toBe(1);
		// The picker's own people are a read of their own (the active team's members merged with
		// `GET /api/chat/people`, `use-chat-scope.ts:50-73`), so the dialog is read once they are all there.
		const listedPeople = [fixture.names.teammate, fixture.names.denied, NAME_THIRD, NAME_ALICE];
		await expect
			.poll(
				() =>
					pickerRows(page, T.NEW_CHANNEL).then(
						(rows) => listedPeople.filter((name) => rows.some((row) => row.text.includes(name))).length
					),
				{ timeout: 20_000 }
			)
			.toBe(listedPeople.length);
		report('new channel opened', {
			opened: await dialogCopy(page, T.NEW_CHANNEL),
			rows: await pickerRows(page, T.NEW_CHANNEL)
		});

		const channelDialog = appDialog(page, T.NEW_CHANNEL);
		await expect(channelDialog).toContainText(T.NEW_CHANNEL_TEXT);
		// The two fields, then the private checkbox (`chat-dialogs.tsx:131-136`), then the picker's search (`:30`). The
		// checkbox is the dialog's only input with no `aria-label` of its own — its name comes from the `<label>` text.
		await expect(channelDialog.getByRole('textbox', { name: T.CHANNEL_NAME, exact: true })).toHaveCount(1);
		await expect(channelDialog.getByRole('textbox', { name: T.CHANNEL_TOPIC, exact: true })).toHaveCount(1);
		await expect(channelDialog.getByRole('checkbox', { name: T.PRIVATE_CHANNEL })).toHaveCount(1);
		await expect(channelDialog.getByRole('textbox', { name: T.SEARCH_PEOPLE, exact: true })).toHaveCount(1);
		await expect(channelDialog.locator('input:not([aria-label])')).toHaveCount(1);
		// Its buttons are the picker's rows, then Cancel, then Create, then the dialog's Close (`common.CLOSE`,
		// `core/components/common/dialog.tsx:149`).
		for (const name of listedPeople) await expect(channelDialog.getByRole('button', { name })).toHaveCount(1);
		await expect(channelDialog.getByRole('button', { name: T.CANCEL, exact: true })).toHaveCount(1);
		await expect(channelDialog.getByRole('button', { name: T.CREATE, exact: true })).toHaveCount(1);
		await expect(channelDialog.getByRole('button', { name: CLOSE_BUTTON })).toHaveCount(1);
		await expect(channelDialog.getByRole('button')).toHaveCount(listedPeople.length + 3);
		await expect(
			appDialog(page, T.NEW_CHANNEL).getByRole('checkbox', { name: T.PRIVATE_CHANNEL })
		).not.toBeChecked();
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('checkbox', { name: T.PRIVATE_CHANNEL })
			.check({ timeout: 15_000 });
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('checkbox', { name: T.PRIVATE_CHANNEL })).toBeChecked();
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('checkbox', { name: T.PRIVATE_CHANNEL })
			.uncheck({ timeout: 15_000 });
		// `maxLength` on the name field: 140 typed characters land as 120 (`chat-dialogs.tsx:131`).
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill('n'.repeat(140));
		await expect(page.getByRole('textbox', { name: T.CHANNEL_NAME })).toHaveValue('n'.repeat(120));
		// `Create` is gated on the trimmed name and on `busy` and on nothing else (`chat-dialogs.tsx:143`).
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill('   ');
		await expect(
			appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: T.CREATE, exact: true })
		).toBeDisabled();
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill('');
		await expect(
			appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: T.CREATE, exact: true })
		).toBeDisabled();

		// The picker lists the active team's people **without the signed-in one** (its `exclude`, `chat-dialogs.tsx:24`,
		// which `NewChannelDialog` feeds with `meEmployeeId`) plus the served directory, and nothing is picked yet.
		await expect
			.poll(() => pickerRows(page, T.NEW_CHANNEL).then((rows) => rows.filter((row) => row.pressed === 'true')))
			.toEqual([]);
		await expect
			.poll(() =>
				pickerRows(page, T.NEW_CHANNEL).then((rows) =>
					rows.some((row) => row.text.includes(fixture.names.user))
				)
			)
			.toBe(false);

		// The picker's own filter (`chat-dialogs.tsx:22-25`) and its empty line (`:45`).
		const searchField = page.getByRole('textbox', { name: T.SEARCH_PEOPLE });
		await searchField.fill('ali');
		await expect
			.poll(() => pickerRows(page, T.NEW_CHANNEL))
			.toEqual([{ text: expect.stringContaining(NAME_ALICE), pressed: 'false' }]);
		await searchField.fill('zzz');
		await expect.poll(() => pickerRows(page, T.NEW_CHANNEL)).toEqual([]);
		await expect(appDialog(page, T.NEW_CHANNEL).getByText(T.NO_PEOPLE, { exact: true })).toBeVisible();
		await searchField.fill('');
		await expect
			.poll(() => pickerRows(page, T.NEW_CHANNEL).then((fresh) => fresh.length))
			.toBe(listedPeople.length);

		// Escape closes a dialog that is not busy (`chat-page.tsx:338` hands the close straight to the page).
		await page.keyboard.press('Escape');
		await expect.poll(() => dialogCount(page), { timeout: 15_000 }).toBe(0);
		// Not one request left this page: the gates are all the client has.
		report('new channel gates', { writes: served.writesFrom(0), calls: served.shapes() });
		expect(served.writesFrom(0)).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the New channel create: the body from what was typed, the list after the re-read, the pane it opens', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page).getByRole('button', { name: T.NEW_CHANNEL }).click({ timeout: 15_000 });
		const name = 'Release room';
		const topic = 'ship-it notes';
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill(name);
		await page.getByRole('textbox', { name: T.CHANNEL_TOPIC }).fill(topic);
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('checkbox', { name: T.PRIVATE_CHANNEL })
			.check({ timeout: 15_000 });
		await appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: NAME_THIRD }).click({ timeout: 15_000 });
		await expect
			.poll(() =>
				pickerRows(page, T.NEW_CHANNEL).then((rows) =>
					rows.filter((row) => row.pressed === 'true').map((row) => row.text)
				)
			)
			.toEqual([expect.stringContaining(NAME_THIRD)]);

		const beforeCreate = served.calls.length;
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CREATE, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(beforeCreate).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const createCall = served
			.writesFrom(beforeCreate)
			.find((call) => call.method === 'POST' && call.path === '/api/chat/conversations');
		// The id the answer served for the new channel — read from the store that answered, never typed.
		const created = served.store.conversations.find((conversation) => conversation.name === name);
		const createdId = String(created?.id);
		report('create write', {
			createCall,
			body: JSON.parse(String(createCall?.body ?? '{}')),
			createdId,
			storeIds: served.store.conversations.map((c) => c.id)
		});

		// The body: what was typed, the checkbox's enum value, and the one employee id picked (`chat-dialogs.tsx:114`).
		expect(createCall?.path).toBe('/api/chat/conversations');
		expect(JSON.parse(String(createCall?.body ?? '{}'))).toEqual({
			name,
			topic,
			visibility: 'private',
			memberEmployeeIds: [EMP_THIRD]
		});
		// The list reads again after the answer (`use-chat-actions.ts:347` `refetchLists`), after the write's own index.
		await expect
			.poll(
				() =>
					served
						.callsFrom(beforeCreate + 1)
						.some((call) => call.method === 'GET' && call.path === '/api/chat/conversations'),
				{ timeout: 30_000 }
			)
			.toBe(true);
		await expect
			.poll(() => listRows(page).then((rows) => rows.map((row) => row.href)), { timeout: 30_000 })
			.toContain(`/chat/${createdId}`);
		// `router.push` lands on the new conversation (`chat-page.tsx:346`), and the dialog is gone.
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/chat/${createdId}`);
		await expect.poll(() => dialogCount(page), { timeout: 15_000 }).toBe(0);
		const createdOn = await longDateIn(page, String(created?.createdAt));
		report('after create', {
			rows: await listRows(page),
			paneText: await chatPane(page).innerText().then(flat),
			created,
			memberChip: await headerButtons(page)
		});

		// The new row is the one the page is on, named for what was typed.
		const createdRow = listPane(page).getByRole('link', { name, exact: false });
		await expect(createdRow).toHaveAttribute('href', `/chat/${createdId}`);
		await expect(createdRow).toHaveAttribute('aria-current', 'page');
		await expect(createdRow).toContainText(name);
		// The conversation the person lands on: its welcome names it, its visibility and its members (`:180-186` of
		// `chat-timeline-parts.tsx` through `conversation-view.tsx:432`).
		await expect(chatPane(page)).toContainText(filled('START_OF_CHANNEL', { name }));
		// The visibility label and the member count are two neighbouring elements (the report line shows them as the one
		// line `Private channel 2 members`), so each is asserted as its own text.
		await expect(chatPane(page)).toContainText(T.PRIVATE_CHANNEL);
		await expect(chatPane(page)).toContainText(plural('MEMBER_COUNT', 2));
		await expect(chatPane(page)).toContainText(filled('CREATED_ON', { date: createdOn }));
		await expect(composerOf(page, name)).toHaveValue('');
		await expect(
			chatPane(page)
				.locator('header')
				.getByRole('button', { name: plural('MEMBER_COUNT', 2), exact: true })
		).toHaveCount(1);
		expect(await toastTexts(page)).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a channel name the list already has: sent, refused by the platform, kept out of the list', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), refuse: { create: 409 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page).getByRole('button', { name: T.NEW_CHANNEL }).click({ timeout: 15_000 });
		// `NAME_GENERAL` is in the list as `#general`; the dialog has no idea of that (`chat-dialogs.tsx:143`, finding 2).
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill(NAME_GENERAL);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: T.CREATE, exact: true })).toBeEnabled();

		const before = served.calls.length;
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CREATE, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const write = served
			.writesFrom(before)
			.find((call) => call.method === 'POST' && call.path === '/api/chat/conversations');
		await expect
			.poll(() => toastTexts(page), { timeout: 20_000 })
			.toContainEqual(expect.stringContaining(T.UPDATE_FAILED));
		await parkPointer(page);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		report('duplicate name refused', {
			write,
			keptText: await dialogCopy(page, T.NEW_CHANNEL).then((copy) => copy.text),
			url: page.url(),
			console: shield.consoleErrors()
		});

		expect(JSON.parse(String(write?.body ?? '{}'))).toEqual({
			name: NAME_GENERAL,
			topic: null,
			visibility: 'public',
			memberEmployeeIds: []
		});
		// The dialog is kept with what was typed, ready for another try, and `Create` is enabled again (finding 3).
		await expect(appDialog(page, T.NEW_CHANNEL)).toContainText(T.NEW_CHANNEL);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.CHANNEL_NAME })).toHaveValue(
			NAME_GENERAL
		);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: T.CREATE, exact: true })).toBeEnabled();
		await expect.poll(() => page.url(), { timeout: 15_000 }).toBe(`${APP_ORIGIN}/chat/${ID_RANDOM}`);
		// The list is only readable once the modal dialog is closed (Base UI makes everything outside it inert), and the
		// refusal changed nothing: the page still lists the two channels it was served.
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CANCEL, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.NEW_CHANNEL).count(), { timeout: 15_000 }).toBe(0);
		await expect
			.poll(() => listRows(page).then((rows) => rows.map((row) => row.href)), { timeout: 20_000 })
			.toEqual(['/chat/unreads', '/chat/threads', `/chat/${ID_RANDOM}`, `/chat/${ID_GENERAL}`]);
		report('duplicate name list after Cancel', { rows: await listRows(page) });
		// A 409 the test armed, excused by its own line.
		expect(consoleFindings(shield, [armedHttpError('POST', '/chat/conversations', 409)])).toEqual([]);
	});

	test('a refused create (400, then 500): the toast, the dialog kept with what was typed, Cancel that sends nothing', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), refuse: { create: 400 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page).getByRole('button', { name: T.NEW_CHANNEL }).click({ timeout: 15_000 });
		const typedName = 'Refused channel';
		const typedTopic = 'kept as typed';
		await page.getByRole('textbox', { name: T.CHANNEL_NAME }).fill(typedName);
		await page.getByRole('textbox', { name: T.CHANNEL_TOPIC }).fill(typedTopic);
		await appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: NAME_ALICE }).click({ timeout: 15_000 });
		await expect
			.poll(() =>
				pickerRows(page, T.NEW_CHANNEL).then((rows) =>
					rows.filter((row) => row.pressed === 'true').map((row) => row.text)
				)
			)
			.toEqual([expect.stringContaining(NAME_ALICE)]);

		const before400 = served.calls.length;
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CREATE, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before400).length, { timeout: 30_000 }).toBeGreaterThan(0);
		await expect
			.poll(() => toastTexts(page), { timeout: 20_000 })
			.toContainEqual(expect.stringContaining(T.UPDATE_FAILED));
		report('refused 400', {
			write: served.writesFrom(before400)[0],
			after400: await dialogCopy(page, T.NEW_CHANNEL),
			console: shield.consoleErrors()
		});
		// The 400 kept everything typed: both fields, the search field still empty, and the picked person (`chat-dialogs.tsx:114-118`).
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.CHANNEL_NAME })).toHaveValue(
			typedName
		);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.CHANNEL_TOPIC })).toHaveValue(
			typedTopic
		);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.SEARCH_PEOPLE })).toHaveValue('');
		await expect
			.poll(() =>
				pickerRows(page, T.NEW_CHANNEL).then((rows) =>
					rows.filter((row) => row.pressed === 'true').map((row) => row.text)
				)
			)
			.toEqual([expect.stringContaining(NAME_ALICE)]);

		// The same dialog, now armed with 500: the person can try again, and the second answer is no better.
		await parkPointer(page);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		served.script.refuse = { create: 500 };
		const before500 = served.calls.length;
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CREATE, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before500).length, { timeout: 30_000 }).toBeGreaterThan(0);
		await expect
			.poll(() => toastTexts(page), { timeout: 20_000 })
			.toContainEqual(expect.stringContaining(T.UPDATE_FAILED));
		report('refused 500', {
			write: served.writesFrom(before500)[0],
			after500: await dialogCopy(page, T.NEW_CHANNEL),
			console: shield.consoleErrors()
		});

		expect(served.writesFrom(before500)[0]?.body).toBe(served.writesFrom(before400)[0]?.body);
		// The second refusal kept the same thing, and `Create` is enabled again for a third try.
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.CHANNEL_NAME })).toHaveValue(
			typedName
		);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.CHANNEL_TOPIC })).toHaveValue(
			typedTopic
		);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('textbox', { name: T.SEARCH_PEOPLE })).toHaveValue('');
		await expect
			.poll(() =>
				pickerRows(page, T.NEW_CHANNEL).then((rows) =>
					rows.filter((row) => row.pressed === 'true').map((row) => row.text)
				)
			)
			.toEqual([expect.stringContaining(NAME_ALICE)]);
		await expect(appDialog(page, T.NEW_CHANNEL).getByRole('button', { name: T.CREATE, exact: true })).toBeEnabled();
		expect(served.store.conversations.map((conversation) => conversation.id)).toEqual([ID_GENERAL, ID_RANDOM]);

		// Cancel the kept dialog: the page sends nothing more, and the store stays as it was.
		await parkPointer(page);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		const afterCancel = served.calls.length;
		await appDialog(page, T.NEW_CHANNEL)
			.getByRole('button', { name: T.CANCEL, exact: true })
			.click({ timeout: 15_000 });
		// Scoped to this dialog's own title: the refusals above made `next dev` mount a dialog of its own (finding 6).
		await expect.poll(() => appDialog(page, T.NEW_CHANNEL).count(), { timeout: 15_000 }).toBe(0);
		// A 2 s quiet window proves the Cancel sent nothing (a dialog close has no request of its own).
		await page.waitForTimeout(2000);
		report('cancel sends nothing', {
			newCalls: served.callsFrom(afterCancel).map((call) => `${call.method} ${call.path}${call.query}`)
		});
		// What the window proves is that no **write** followed the Cancel. A read can still land in it: the open
		// conversation keeps polling for newer messages every `NEWER_POLL_MS` 5 000 (`use-chat-messages.ts:16`), which is
		// exactly what this run measured (`GET …/messages?after=msg-task-1&limit=50`).
		expect(served.writesFrom(afterCancel)).toEqual([]);
		// Two attempts, two refusals, nothing stored: with the dialog closed the list is readable again and still holds
		// exactly the two channels it was served.
		await expect
			.poll(() => listRows(page).then((rows) => rows.map((row) => row.href)), { timeout: 20_000 })
			.toEqual(['/chat/unreads', '/chat/threads', `/chat/${ID_RANDOM}`, `/chat/${ID_GENERAL}`]);
		report('list after two refusals', { rows: await listRows(page) });
		expect(
			consoleFindings(shield, [
				armedHttpError('POST', '/chat/conversations', 400),
				armedHttpError('POST', '/chat/conversations', 500)
			])
		).toEqual([]);
	});

	test('New direct: the picker, Start, the write, and the conversation it opens', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page)
			.getByRole('button', { name: T.NEW_MESSAGE, exact: true })
			.first()
			.click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.NEW_MESSAGE).count(), { timeout: 15_000 }).toBe(1);
		report('new direct opened', await dialogCopy(page, T.NEW_MESSAGE));
		// The dialog's own words, `{max}` being the group limit (`chat-dialogs.tsx:79`, `chat.ts:40`).
		await expect(appDialog(page, T.NEW_MESSAGE)).toContainText(filled('NEW_MESSAGE_TEXT', { max: 50 }));
		await expect(appDialog(page, T.NEW_MESSAGE).getByRole('button', { name: T.START, exact: true })).toBeDisabled();

		await appDialog(page, T.NEW_MESSAGE)
			.getByRole('button', { name: fixture.names.teammate })
			.click({ timeout: 15_000 });
		await expect(appDialog(page, T.NEW_MESSAGE).getByRole('button', { name: T.START, exact: true })).toBeEnabled();
		const before = served.calls.length;
		await appDialog(page, T.NEW_MESSAGE)
			.getByRole('button', { name: T.START, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const write = served
			.writesFrom(before)
			.find((call) => call.method === 'POST' && call.path === '/api/chat/direct');
		// The id the answer served for the new conversation, read from the store that answered it.
		const createdId = String(served.store.conversations[served.store.conversations.length - 1].id);
		report('direct write', { write, createdId });
		expect(write?.path).toBe('/api/chat/direct');
		// The body is the picked employee ids and nothing else (`chat.service.ts:99-102`).
		expect(JSON.parse(String(write?.body ?? '{}'))).toEqual({ employeeIds: [fixture.ids.teammateEmployee] });

		await expect
			.poll(
				() =>
					served
						.callsFrom(before + 1)
						.some((call) => call.method === 'GET' && call.path === '/api/chat/conversations'),
				{ timeout: 30_000 }
			)
			.toBe(true);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/chat/${createdId}`);
		await expect.poll(() => appDialog(page, T.NEW_MESSAGE).count(), { timeout: 15_000 }).toBe(0);
		report('after direct', {
			rows: await listRows(page),
			paneText: await chatPane(page).innerText().then(flat),
			header: await headerButtons(page)
		});
		// A direct conversation is named for the other person (`conversationTitle`, `chat-format.ts:116-124`).
		const directRow = listPane(page).getByRole('link', { name: fixture.names.teammate });
		await expect(directRow).toHaveAttribute('href', `/chat/${createdId}`);
		await expect(directRow).toHaveAttribute('aria-current', 'page');
		await expect(chatPane(page)).toContainText(filled('START_OF_DIRECT', { name: fixture.names.teammate }));
		await expect(chatPane(page)).toContainText(T.START_OF_DIRECT_TEXT);
		await expect(
			chatPane(page)
				.locator('header')
				.getByRole('button', { name: plural('MEMBER_COUNT', 2), exact: true })
		).toHaveCount(1);
		expect(await toastTexts(page)).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('Browse channels: what it lists, the join, the list after it, and what it no longer lists', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => listRows(page).then((rows) => rows.length), { timeout: 20_000 }).toBeGreaterThan(0);
		await listPane(page).getByRole('button', { name: T.BROWSE_CHANNELS }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.BROWSE_CHANNELS).count(), { timeout: 15_000 }).toBe(1);
		// The browse read answers before the copy is read (it shows `LOADING` until then, `chat-dialogs.tsx:173`).
		await expect
			.poll(
				() =>
					appDialog(page, T.BROWSE_CHANNELS)
						.innerText()
						.then((text) => flat(text).includes(NAME_JOIN_B)),
				{ timeout: 20_000 }
			)
			.toBe(true);
		report('browse opened', await dialogCopy(page, T.BROWSE_CHANNELS));
		const browseDialog = appDialog(page, T.BROWSE_CHANNELS);
		await expect(browseDialog).toContainText(T.BROWSE_TEXT);
		// Both served channels, each with its own member count and its topic (`chat-dialogs.tsx:180-186`).
		await expect(browseDialog).toContainText(`${NAME_JOIN_A}${plural('MEMBER_COUNT', 7)} · ${TOPIC_JOIN_A}`);
		await expect(browseDialog).toContainText(`${NAME_JOIN_B}${plural('MEMBER_COUNT', 12)}`);
		await expect(browseDialog.getByRole('button', { name: T.JOIN, exact: true })).toHaveCount(2);
		// Neither of them is in the person's own list yet.
		await expect
			.poll(() => listRows(page).then((rows) => rows.some((row) => row.href === `/chat/${ID_JOIN_A}`)), {
				timeout: 20_000
			})
			.toBe(false);

		const before = served.calls.length;
		await appDialog(page, T.BROWSE_CHANNELS)
			.getByRole('button', { name: T.JOIN })
			.first()
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const write = served.writesFrom(before).find((call) => call.method === 'POST' && call.path.endsWith('/join'));
		report('join write', { write });
		expect(write?.path).toBe(`/api/chat/conversations/${ID_JOIN_A}/join`);
		expect(write?.body).toBe('{}');

		// The list and the browse list both read again after the answer (`use-chat-actions.ts:365-366`), both after this
		// write's own index; how many times each one is read is not something this file pins.
		await expect
			.poll(
				() => {
					const paths = served
						.callsFrom(before + 1)
						.filter((call) => call.method === 'GET')
						.map((call) => call.path);
					return [
						paths.includes('/api/chat/conversations'),
						paths.includes('/api/chat/conversations/browse')
					];
				},
				{ timeout: 30_000 }
			)
			.toEqual([true, true]);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/chat/${ID_JOIN_A}`);
		await expect.poll(() => appDialog(page, T.BROWSE_CHANNELS).count(), { timeout: 15_000 }).toBe(0);
		report('after join', {
			rows: await listRows(page),
			paneText: await chatPane(page).innerText().then(flat),
			header: await headerButtons(page)
		});
		const joinedRow = listPane(page).getByRole('link', { name: NAME_JOIN_A });
		await expect(joinedRow).toHaveAttribute('href', `/chat/${ID_JOIN_A}`);
		await expect(joinedRow).toHaveAttribute('aria-current', 'page');
		await expect(chatPane(page)).toContainText(filled('START_OF_CHANNEL', { name: NAME_JOIN_A }));
		// The header counts the served channel's own members.
		await expect(
			chatPane(page)
				.locator('header')
				.getByRole('button', { name: plural('MEMBER_COUNT', 7), exact: true })
		).toHaveCount(1);

		// Opened again: the channel just joined is no longer offered (its own re-read answers without it).
		await listPane(page).getByRole('button', { name: T.BROWSE_CHANNELS }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.BROWSE_CHANNELS).count(), { timeout: 15_000 }).toBe(1);
		// Same read-then-read rule as above: wait for the served channel before reading what the dialog lists.
		await expect
			.poll(
				() =>
					appDialog(page, T.BROWSE_CHANNELS)
						.innerText()
						.then((text) => flat(text).includes(NAME_JOIN_B)),
				{ timeout: 20_000 }
			)
			.toBe(true);
		report('browse reopened', await dialogCopy(page, T.BROWSE_CHANNELS));
		await expect(browseDialog).toContainText(`${NAME_JOIN_B}${plural('MEMBER_COUNT', 12)}`);
		await expect(browseDialog).not.toContainText(NAME_JOIN_A);
		await expect(browseDialog.getByRole('button', { name: T.JOIN, exact: true })).toHaveCount(1);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('Create task from a message: prefilled from it, held while the write is out, the card after it', async ({
		page,
		fixture,
		shield
	}) => {
		// The hold is armed for 120 s so it cannot answer by itself while the busy state is being read: only the
		// `releaseHold()` in the `finally` below ends it (the long timer is a safety net, not the release this test uses).
		const served = await serveChat(page, {
			...servedStore(fixture),
			hold: 'task',
			holdMs: 120_000,
			taskId: fixture.ids.task
		});
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect
			.poll(() => chatPane(page).locator('[data-message-id]').count(), { timeout: 20_000 })
			.toBeGreaterThan(0);
		await rowOf(page, MSG_TASK).hover();
		await rowOf(page, MSG_TASK).getByRole('button', { name: T.MORE }).click({ timeout: 15_000 });
		await expect
			.poll(() => openMenuItems(page).then((items) => items.length), { timeout: 15_000 })
			.toBeGreaterThan(0);
		await expect
			.poll(() => openMenuItems(page).then((items) => items.includes(T.CREATE_TASK)), { timeout: 15_000 })
			.toBe(true);
		report('message more menu', await openMenuItems(page));
		await page.getByRole('menuitem', { name: T.CREATE_TASK }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.CREATE_TASK_TITLE).count(), { timeout: 15_000 }).toBe(1);
		// Prefilled from the message: the **first** line of a two-line message, its spaces collapsed
		// (`chatTaskTitleOf`, `chat-task.ts:32-40`), and the active team named in its own copy.
		await expect(appDialog(page, T.CREATE_TASK_TITLE).getByRole('textbox', { name: T.TASK_TITLE })).toHaveValue(
			MSG_TASK_TITLE
		);
		report('create task opened', await dialogCopy(page, T.CREATE_TASK_TITLE));
		await expect(appDialog(page, T.CREATE_TASK_TITLE)).toContainText(
			filled('CREATE_TASK_TEXT_TEAM', { team: fixture.names.teamA })
		);

		const before = served.calls.length;
		await appDialog(page, T.CREATE_TASK_TITLE)
			.getByRole('button', { name: T.CREATE_TASK, exact: true })
			.click({ timeout: 15_000 });
		try {
			await expect.poll(() => served.writesFrom(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
			await expect.poll(() => served.heldOpen()).toBe(true);
			const write = served
				.writesFrom(before)
				.find((call) => call.method === 'POST' && call.path.endsWith('/create-task'));
			report('create task held', await dialogCopy(page, T.CREATE_TASK_TITLE));
			// While the write is out both buttons are disabled (`create-task-dialog.tsx:84`, `:87`); the dialog's own `Close`
			// (`common.CLOSE`, `dialog.tsx:149`) is the only one that stays enabled.
			await expect(
				appDialog(page, T.CREATE_TASK_TITLE).getByRole('button', { name: T.CANCEL, exact: true })
			).toBeDisabled();
			await expect(
				appDialog(page, T.CREATE_TASK_TITLE).getByRole('button', { name: T.CREATE_TASK, exact: true })
			).toBeDisabled();
			expect(JSON.parse(String(write?.body ?? '{}'))).toEqual({
				title: MSG_TASK_TITLE,
				organizationTeamId: fixture.ids.teamA,
				projectId: fixture.ids.project
			});
			// Escape: `onOpenChange` refuses to close a busy dialog (`create-task-dialog.tsx:60`). The 1 s window is what
			// proves the dialog was not closed by that key press — without it a count read could pass before any close.
			await page.keyboard.press('Escape');
			await page.waitForTimeout(1000);
			await expect(appDialog(page, T.CREATE_TASK_TITLE)).toBeVisible();
		} finally {
			served.releaseHold();
		}
		// The held answer plus the toast and the card's own read: 90 s of room for a loaded lane.
		await expect.poll(() => served.heldOpen(), { timeout: 90_000 }).toBe(false);
		await expect.poll(() => appDialog(page, T.CREATE_TASK_TITLE).count(), { timeout: 90_000 }).toBe(0);
		await expect
			.poll(() => toastTexts(page), { timeout: 30_000 })
			.toContainEqual(expect.stringContaining(T.TASK_CREATED));
		await expect
			.poll(() => rowOf(page, MSG_TASK).locator(`[data-task-id="${fixture.ids.task}"]`).count(), {
				timeout: 30_000
			})
			.toBe(1);
		report('after create task', {
			cardText: await rowOf(page, MSG_TASK)
				.locator(`[data-task-id="${fixture.ids.task}"]`)
				.innerText()
				.then(flat),
			rowText: await rowOf(page, MSG_TASK).innerText().then(flat),
			toasts: await toastTexts(page)
		});
		// The card names the task the app itself holds for this team (no read needed: `use-chat-task-card.ts:82-93`).
		const card = rowOf(page, MSG_TASK).locator(`[data-task-id="${fixture.ids.task}"]`);
		await expect(card).toContainText(fixture.names.task);
		await expect(card).toContainText(T.OPEN_TASK);
		await parkPointer(page);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('Create task refused 403: its own excuse, the dialog kept, the message untouched', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), refuse: { task: 403 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect
			.poll(() => chatPane(page).locator('[data-message-id]').count(), { timeout: 20_000 })
			.toBeGreaterThan(0);
		await rowOf(page, MSG_TASK).hover();
		await rowOf(page, MSG_TASK).getByRole('button', { name: T.MORE }).click({ timeout: 15_000 });
		await expect
			.poll(() => openMenuItems(page).then((items) => items.includes(T.CREATE_TASK)), { timeout: 15_000 })
			.toBe(true);
		await page.getByRole('menuitem', { name: T.CREATE_TASK }).click({ timeout: 15_000 });
		await expect.poll(() => appDialog(page, T.CREATE_TASK_TITLE).count(), { timeout: 15_000 }).toBe(1);
		const before = served.calls.length;
		await appDialog(page, T.CREATE_TASK_TITLE)
			.getByRole('button', { name: T.CREATE_TASK, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
		// 403 is the one refusal the dialog names itself (`create-task-dialog.tsx:54`).
		await expect
			.poll(() => toastTexts(page), { timeout: 20_000 })
			.toContainEqual(expect.stringContaining(T.TASK_CREATE_FORBIDDEN));
		report('create task refused', {
			write: served.writesFrom(before)[0],
			kept: await dialogCopy(page, T.CREATE_TASK_TITLE),
			rowText: await rowOf(page, MSG_TASK).innerText().then(flat),
			console: shield.consoleErrors()
		});

		// The dialog is kept with its prefilled title and both buttons usable again (`create-task-dialog.tsx:60` only
		// refuses a close while `busy`, and the refusal cleared it).
		await expect(appDialog(page, T.CREATE_TASK_TITLE).getByRole('textbox', { name: T.TASK_TITLE })).toHaveValue(
			MSG_TASK_TITLE
		);
		await expect(
			appDialog(page, T.CREATE_TASK_TITLE).getByRole('button', { name: T.CREATE_TASK, exact: true })
		).toBeEnabled();
		await expect(
			appDialog(page, T.CREATE_TASK_TITLE).getByRole('button', { name: T.CANCEL, exact: true })
		).toBeEnabled();
		await expect(rowOf(page, MSG_TASK)).not.toContainText(T.OPEN_TASK);
		await expect(rowOf(page, MSG_TASK).locator('[data-task-id]')).toHaveCount(0);
		// The More menu closed with the item that was clicked (Base UI menus are document-level portals).
		await expect.poll(() => page.getByRole('menuitem').count(), { timeout: 15_000 }).toBe(0);
		await parkPointer(page);
		await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 30_000 });
		// The armed 403, excused by its own line (the client calls 403 critical, `api.service.ts` `logError`).
		expect(
			consoleFindings(shield, [`🚨 CRITICAL: HTTP 403 Forbidden - POST /chat/messages/${MSG_TASK}/create-task`])
		).toEqual([]);
	});

	test('@ mentions: the suggestions, the token they put in the field, and the mention payload', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const field = composerOf(page, NAME_RANDOM);
		await expect(field).toBeVisible();
		await field.pressSequentially('ping @', { delay: 25 });
		await expect.poll(() => page.getByRole('listbox').count(), { timeout: 15_000 }).toBe(1);
		await expect(field).toHaveAttribute('aria-label', filled('COMPOSER_PLACEHOLDER', { name: NAME_RANDOM }));
		await expect(field).toHaveAttribute('aria-autocomplete', 'list');
		const listbox = page.getByRole('listbox');
		report('mention suggestions', {
			listboxLabel: await listbox.getAttribute('aria-label'),
			options: await optionRows(page)
		});
		await expect(listbox).toHaveAttribute('aria-label', T.MENTION_SOMEONE);
		// The people are the active team's (me included) and the served directory, then the two `EVERYONE` rows
		// (`message-composer.tsx:140-143` + `:20-23`).
		const suggestedPeople = [
			fixture.names.user,
			fixture.names.teammate,
			fixture.names.denied,
			NAME_THIRD,
			NAME_ALICE
		];
		await expect
			.poll(
				() =>
					optionRows(page).then((options) =>
						suggestedPeople.map((name) => options.some((option) => option.text.includes(name)))
					),
				{ timeout: 15_000 }
			)
			.toEqual(suggestedPeople.map(() => true));
		await expect
			.poll(
				() =>
					optionRows(page).then(
						(options) => options.filter((option) => option.text.includes(T.EVERYONE)).length
					),
				{
					timeout: 15_000
				}
			)
			.toBe(2);
		await expect
			.poll(
				() => optionRows(page).then((options) => options.filter((option) => option.selected === 'true').length),
				{
					timeout: 15_000
				}
			)
			.toBe(1);

		await page.getByRole('option', { name: fixture.names.teammate }).click({ timeout: 15_000 });
		// The token, then a space, in place of the typed `@` (`insertMention`, `message-composer.tsx:206-214`).
		await expect(field).toHaveValue(`ping <@${fixture.ids.teammateEmployee}> `);
		await expect.poll(() => page.getByRole('option').count(), { timeout: 15_000 }).toBe(0);

		const beforeSend = served.calls.length;
		await sendButton(page).click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(beforeSend).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const sendCall = served
			.writesFrom(beforeSend)
			.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const sentBody = JSON.parse(String(sendCall?.body ?? '{}')) as Record<string, unknown>;
		report('mention send body', { path: sendCall?.path, sentBody });
		expect(sendCall?.path).toBe(`/api/chat/conversations/${ID_RANDOM}/messages`);
		expect(Object.keys(sentBody).sort()).toEqual(['body', 'mentionEmployeeIds', 'nonce']);
		expect(sentBody.body).toBe(`ping <@${fixture.ids.teammateEmployee}>`);
		expect(sentBody.mentionEmployeeIds).toEqual([fixture.ids.teammateEmployee]);

		// The message the answer created is drawn from the store that answered (`use-chat-messages.ts` re-read).
		await expect
			.poll(() => chatPane(page).locator('[data-message-id^="srv-"]').count(), { timeout: 30_000 })
			.toBe(1);
		const sentId = String(
			await chatPane(page).locator('[data-message-id^="srv-"]').first().getAttribute('data-message-id')
		);
		await expect.poll(() => rowOf(page, sentId).locator('[data-employee-id]').count(), { timeout: 30_000 }).toBe(1);
		const chip = rowOf(page, sentId).locator(`[data-employee-id="${fixture.ids.teammateEmployee}"]`);
		report('mention row', {
			sentId,
			chipText: await chip.innerText(),
			rowText: await rowOf(page, sentId).innerText().then(flat)
		});
		// The token is drawn as a chip naming the person (`splitMentions`, `chat-format.ts:37-39`).
		await expect(chip).toHaveText(`@${fixture.names.teammate}`);

		// `@channel`: an `EVERYONE` row is picked the same way, and is **not** an employee mention.
		await field.pressSequentially('shout @', { delay: 25 });
		await expect
			.poll(() => page.getByRole('option', { name: EVERYONE_CHANNEL_LABEL }).count(), { timeout: 15_000 })
			.toBe(1);
		await page.getByRole('option', { name: EVERYONE_CHANNEL_LABEL }).click({ timeout: 15_000 });
		await expect(field).toHaveValue(`shout ${EVERYONE_CHANNEL_TOKEN} `);
		const beforeChannel = served.calls.length;
		await sendButton(page).click({ timeout: 15_000 });
		await expect.poll(() => served.writesFrom(beforeChannel).length, { timeout: 30_000 }).toBeGreaterThan(0);
		const channelCall = served
			.writesFrom(beforeChannel)
			.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const channelBody = JSON.parse(String(channelCall?.body ?? '{}')) as Record<string, unknown>;
		report('channel mention body', channelBody);
		expect(channelBody.body).toBe(`shout ${EVERYONE_CHANNEL_TOKEN}`);
		expect(channelBody.mentionEmployeeIds).toEqual([]);
		await expect
			.poll(() => chatPane(page).locator('[data-message-id^="srv-"]').count(), { timeout: 30_000 })
			.toBe(2);
		report('channel mention row', await chatPane(page).locator('[data-message-id]').last().innerText().then(flat));
		// The token `<!channel>` is printed as `@` + the `EVERYONE` name (`message-composer.tsx:20-23`).
		await expect(chatPane(page).locator('[data-message-id]').last()).toContainText(EVERYONE_CHANNEL_LABEL);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the list read refused: its alert, what Retry really re-sends, the list once answered', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), refuse: { list: 500 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		// The page's own notice for the refused read (`conversation-list.tsx:312` → `chat-states.tsx:99-112`): its message
		// and its `Retry`, both inside the list's own `role="alert"`.
		await expect.poll(() => listPane(page).getByText(T.LOAD_ERROR).count(), { timeout: 30_000 }).toBe(1);
		const readAlerts = () =>
			page
				.getByRole('alert')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		// One of those alerts carries both the message and the Retry button; a second, textless `role="alert"` is also on
		// the page (measured, unexplained by `chat-states.tsx`, which renders one), so this reads "some alert", not "one".
		await expect
			.poll(
				() =>
					readAlerts().then((texts) =>
						texts.some((text) => text.includes(T.LOAD_ERROR) && text.includes(T.RETRY))
					),
				{ timeout: 30_000 }
			)
			.toBe(true);
		report('list refused', {
			alerts: await readAlerts(),
			paneText: await chatPane(page).innerText().then(flat),
			refusedCalls: served.shapes()
		});
		// The deep conversation was read on its own, so the pane is complete while the list is not (finding 5).
		await expect(chatPane(page)).toContainText(MSG_TASK_TITLE);
		// The refused read is retried by the client: how many times is not something this file pins.
		expect(served.countOf('GET', '/api/chat/conversations')).toBeGreaterThanOrEqual(1);

		const beforeRetry = served.calls.length;
		served.script.refuse = {};
		await listPane(page).getByRole('button', { name: T.RETRY }).click({ timeout: 15_000 });
		// Only what the click caused counts, and only after the click's own index in the log.
		await expect
			.poll(
				() =>
					served
						.callsFrom(beforeRetry)
						.filter((call) => call.method === 'GET' && call.path === '/api/chat/conversations').length,
				{ timeout: 30_000 }
			)
			.toBeGreaterThanOrEqual(1);
		await expect
			.poll(() => listRows(page).then((rows) => rows.map((row) => row.href)), { timeout: 30_000 })
			.toEqual(['/chat/unreads', '/chat/threads', `/chat/${ID_RANDOM}`, `/chat/${ID_GENERAL}`]);
		const newCalls = served.callsFrom(beforeRetry).map((call) => `${call.method} ${call.path}${call.query}`);
		report('after retry', { newCalls, rows: await listRows(page), alerts: await page.getByRole('alert').count() });
		// The notice is gone from the list once the read answered.
		await expect.poll(() => listPane(page).getByText(T.LOAD_ERROR).count(), { timeout: 30_000 }).toBe(0);
		expect(served.callsFrom(beforeRetry).length).toBeGreaterThanOrEqual(1);
		expect(served.writesFrom(beforeRetry)).toEqual([]);
		// The refused reads this test armed, excused by their own lines (their count is not pinned, retries vary).
		expect(consoleFindings(shield, [armedHttpError('GET', '/chat/conversations', 500)])).toEqual([]);
	});
});
