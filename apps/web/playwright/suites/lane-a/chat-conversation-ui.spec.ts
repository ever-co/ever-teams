import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The team chat's **conversation page** (`/chat/<conversationId>`), driven in the browser on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:38`). Its sibling
 * `suites/lane-a/chat-list-unreads-threads-ui.spec.ts` covers the list beside it; this file starts where that one ends.
 *
 * ## What this drives
 *
 * - `app/[locale]/(main)/chat/[conversationId]/page.tsx` → `core/components/pages/chat/chat-page.tsx`: the flag gate
 *   (`:82-84` `router.replace('/')`), the hooks (`:89` list, `:91` `useChatConversation(id, known, enabled)` — the single
 *   conversation is read **only when the list does not already know it**), `:105` states, the auto-open of the remembered
 *   conversation (`:132-142`, `core/lib/utils/chat-navigation.ts:112-120` with the `chat-last-conversation` key
 *   `:144-151`), the thread opened from the query (`:153-168` `openThread` / `closeThread` on `?thread=`), the pane's
 *   branches (`:236-305`: the conversation, `NOT_AVAILABLE_*` `:253-258`), and the thread `<aside>` (`:307-319`, whose
 *   `archived` comes from `current.conversation.archivedAt`).
 * - `core/components/pages/chat/conversation-view.tsx`: `archived` `:133`, the auto-read effect `:205-211` (only with a
 *   newest message, a member state, `atBottom` — `away === 'bottom'` `:117`, `AT_BOTTOM_PX` 40 `:51` — and `readPaused`
 *   `:127` clear), the scroll rules `:214-235`, `send` `:259-274` (its `readPaused.current = false` at `:267`), the row
 *   handlers `:307-341` (`onUnreadFrom` `:316-324`, `onCopyLink` `:331-334`), the header wiring `:406-419`, the timeline
 *   `role="log"` `:427`, the welcome / error / empty states, `NEW_DIVIDER` `:357`, the archived branch that replaces the
 *   composer with `ARCHIVED_NOTICE` `:450-454`, and `readOnly={archived}` `:396`.
 * - `core/components/pages/chat/conversation-header.tsx`: `MembersChip` `:36-94` (`MEMBER_COUNT` as its `aria-label`
 *   `:51`), `canLeave` `:134`, the favourite button `:160` (`aria-pressed`), the notification menu `:163-177`
 *   (`DropdownMenuRadioItem`s `NOTIFY.ALL` / `NOTIFY.MENTIONS` / `NOTIFY.MUTED`), the More menu `:178-202` (Copy link,
 *   `onOpenIntegrations` only when the webhooks flag is on, Leave when `canLeave`).
 * - `core/components/pages/chat/message-item.tsx`: the hover toolbar `:92-96` (`pointer-events-none … opacity-0` until
 *   `group-hover/message` or `group-has-[:focus-visible]/message`), `QUICK_REACTIONS` `:31` cut at `TOOLBAR_REACTIONS` 3
 *   `:34`, `canReact = !deleted && !outbox` `:132` (which gates the **whole** toolbar `:317-374`), the pinned line
 *   `:166-171`, the row's `<time dateTime title>` `:204`, `DELETED` `:211`, the pending dim `:220`, `EDITED` `:222-226`,
 *   the reaction chips `:253-271` (`aria-pressed`), the replies button `:284-302`, the failed block `:303-314`
 *   (`SEND_FAILED` + `RETRY` + `DISCARD`), and the More menu `:345-371` (Copy link, Pin/Unpin, Mark unread from here,
 *   Create task, and Edit / Delete only for the message's own author or a manager).
 * - `core/components/pages/chat/message-composer.tsx`: `submit` `:239-250` (the `sending` guard), Enter `:322-326`, the
 *   `cannotSend` `:336` state, the textarea `aria-label={placeholder}` `:435`, `CANCEL` / `SAVE` in edit mode
 *   `:502-511`, the Send button `:512`, and the `ALSO_SEND_TO_CONVERSATION` checkbox `:519-528`.
 * - `core/components/pages/chat/thread-pane.tsx`: its header `:212-230` (`h2` `THREAD` + the conversation label, Follow /
 *   Unfollow `:222-226` with `aria-pressed={!!root.following}`, Close `:227-229`), its own `role="log"` `:231`,
 *   `RepliesDivider` / `NO_REPLIES` `:239-243`, its composer `:256-267`, and `readOnly: archived` reaching only
 *   `itemProps` `:191`.
 * - `core/components/pages/chat/chat-timeline-parts.tsx`: the three dividers (`role="separator"` + `aria-label`,
 *   `:15`, `:25`, `:35`) and `ConversationWelcome` `:82-110`. `core/lib/utils/chat-timeline.ts`: `timelineItems`
 *   `:47-70`, `dayLabel` `:82-89`, `clockTime` `:116-121`, `fullDateTime` `:131-133`; `core/lib/utils/chat-format.ts`
 *   `continuesGroup` `:144-147` (same author, not deleted, not a reply, under 5 minutes).
 * - The outbox in `core/hooks/chat/use-chat-actions.ts`: `ChatOutboxMessage` `:25-29`, `send` `:98-163` (the pending row
 *   keyed `pending:<nonce>` `:103-109`, `inTimeline` `:131`, the POST body `:139`, a refusal marking **the same row**
 *   `outbox:'failed'` `:155-158`), `retry` `:165-181` (the same nonce, per the comment at `:92-93`), `discardFailed`
 *   `:187-196`, `edit` `:198-206`, `remove` `:208-219` (a row is kept only when it has replies), `pin` `:221-227`,
 *   `react` `:261-290` (optimistic, then the platform's answer, back to the old copy if refused), `read` `:293-302`,
 *   `unreadFrom` `:304-310`, `setFollow` `:325-333`, `setMemberState` `:335-342`, `leave` `:372-379`;
 *   `core/hooks/chat/use-chat-messages.ts`: `NEWER_POLL_MS` 5 000 `:16`, `HELD_REFRESH_MS` 30 000 `:21`,
 *   `isLocalMessage` `:42`, `isLeftOutOfPages` `:117-120`, `refreshHeldWindow` `:141-160` (its first read is
 *   `?around=<oldest held>`), the thread's own `refetchInterval` `:435`.
 * - The client `core/services/client/api/chat/chat.service.ts`: `getConversation` `:83-87`, `leave` `:114-118`,
 *   `setMemberState` `:134-140`, `messages` `:154-159` (`CHAT_PAGE_SIZE` 50 at `:43`), `files` `:161-166`
 *   (`CHAT_FILES_PAGE_SIZE` 100 at `:46`), `typing` `:216-220`, `pins` `:222-226`, `send` `:227-231`, `edit` `:232-236`,
 *   `remove` `:237-241`, `pin` `:242-247`, `react` `:288-295`, `thread` `:296-301`, `setFollow` `:307-313`, `read`
 *   `:314-318`, `unreadFrom` `:319-323`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub, the app shell, the mock's `/api/user/me`, its team and directory reads (the fixture
 * people `Fixture Manager` / `Fixture Teammate` the rows are named for come from the active team, merged in
 * `use-chat-scope.ts:56-66`, which is why an empty `/api/chat/people` still shows their names), and the mock's request
 * log the flag-off test reads.
 *
 * **Served by this file:** every `/api/chat/**` read and write, through `page.route` on the **mock origin** (the pattern
 * of `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`, and the same served chat layer as
 * `suites/lane-a/chat-list-unreads-threads-ui.spec.ts:293-429`), because `grep -c chat cypress/support/mock-gauzy-server.mjs`
 * is **0**: unmatched, the mock answers a chat `GET` with its catch-all `pagination([])` (`mock-gauzy-server.mjs:895`), a
 * non-`GET` by echoing the body (`:894`) and a `DELETE` with `{affected:1,raw:[]}` (`:893`) — an echo would make a
 * refused write look like a successful one, so every test serves its own store. Each answer restates the mock's own CORS
 * answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097`), and `route.fetch()` is never called, so this
 * file's own call log is the witness that the page acted on what was served here. The store *is* the answer: it pages
 * `after=` / `before=` / `around=` the way the platform's pages do (`use-chat-messages.ts:141-160`), a write changes it
 * so a later read agrees with it, and a refused write (`script.refuse`) changes nothing.
 *
 * ## The runtime flag
 *
 * `NEXT_PUBLIC_CHAT_ENABLED` is a runtime public value (`core/lib/utils/chat-enabled.ts:8-11`) and this lane does not set
 * it: the `<html data-ever-teams-runtime-env>` payload holds **52** keys, none of them that one (probe-1 P1, and test 13
 * prints it again from this file). Every other test turns the flag on **in its own browser only** through
 * `overrideRuntimeEnv` (`playwright/helpers.ts:485-507`) before its first visit — and since that is an init script that
 * stays for the life of the page, the flag-off test is its own test on a page that never had it. `NEXT_PUBLIC_REALTIME_ENABLED`,
 * `NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED`, `NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED` and `NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED`
 * are all off here as served: no `/graphql` socket (`core/lib/realtime/config.ts` `isRealtimeEnabled`), a plain (not
 * virtual) timeline, no link-preview cards, and no `Integrations` entry in the header's More menu.
 *
 * ## Where every asserted value came from
 *
 * Throwaway probes on this lane (`D:\Coding\.tmp\probe-chatconversation\`, configs with no `webServer`):
 * `s3-lane-a-chatconversation-probe-1.log` (P1 the reads of a fresh deep link, the header, the separators, the composer
 * and the welcome block; P3 a refused send, its failed row, its `Retry` body and its two console lines; P4 the edit
 * composer, its `PATCH` body and the row after; P5 the delete with no confirm step and the timeline after; P7 `pin` /
 * `unpin` and the absence of any `…/pins` read; P9 the automatic read at the bottom and the `unread` request; P11 the
 * archived pane and the actions its rows still offer; P12 an unknown id), `s3-lane-a-chatconversation-probe-2.log`
 * (Q1 the pending row, the composer's state while it waits, the send body and the row after; Q3 the thread read, its
 * header, its rows and dividers, its reply body, follow / unfollow and closing it; Q4 the header's buttons, the favourite
 * `PATCH` and the notify menu's three `menuitemradio`s with the `PATCH` each of them sends; Q10 an unknown id) and
 * `s3-lane-a-chatconversation-probe-3.log` (R1 the reaction requests with the row hovered, R2 the copy link as the browser
 * was asked to copy it, R3 the leave and where the page goes, R4 the archived conversation's own message and its thread
 * pane, R5 mark-unread and the automatic read), `s3-lane-a-chatconversation-probe-4.log` (S2 mark-unread from the newest
 * row and where the "New" line lands, S3 what `Discard` does to a failed row, S4 a refused reaction and the row it rolls
 * back to, S1 the archived rows' writes) and `s3-lane-a-chatconversation-probe-5.log` (E1 the archived edit composer, its
 * `PATCH`, the tombstone of a deleted root that has replies, and the archived thread pane's composer). Two values came
 * from this file's own first run (`s3-lane-a-chatconversation-1.log`) after an earlier probe had read them wrong: while a
 * message is being edited the **page's** composer keeps its `Send` button (disabled, empty) beside the edit control's
 * `Cancel` + `Save`, because only that one composer swaps Send for Save (`message-composer.tsx:502-512`); and a reaction
 * chip's text is `👍1`, emoji and count with no space between the two spans (`message-item.tsx:256-270`), so the chips
 * are picked by their `aria-pressed` rather than by a name with a space in it.
 * Every test below prints its own `[lane-a chat-conversation] MEASURE …` line as well, so each pinned value has a log
 * line behind it from this file too.
 *
 * Served times are always relative to `Date.now()` (`ago`), so nothing pins today's date; a clock or a full date is
 * compared with the same formatting recomputed **in the browser** (`clockTimeIn`, `fullDateTimeIn`, `longDateIn`), which
 * is how `chat-timeline.ts:116-133` computes it, so no test hard-codes the browser's time zone.
 *
 * ## Findings (measured; with the code that explains each)
 *
 * 1. **A conversation page does not read the pin list.** `chatService.pins` (`chat.service.ts:222-226`) is never asked
 *    for this view: measured `GET …/pins` 0 while `POST …/pin` and `POST …/unpin` both went through (probe-1 P7),
 *    because the pinned line comes from the message's own `pinnedAt` (`message-item.tsx:166-171`). Not tagged: no test
 *    or comment says the list should be read here.
 * 2. **An archived conversation can still be written to from its messages and from its thread pane.**
 *    `ARCHIVED_NOTICE` (`locales/en.json:7012`) says "it can be read, not written to", and `conversation-view.tsx:450-454`
 *    really does drop the composer — but `readOnly` reaches only `ChatAppBlocks` / attachments (`message-item.tsx:229`,
 *    `:249`) and is documented as the flag for an app message's buttons (`message-item.tsx:72-73`), so the toolbar's
 *    react / Pin / Edit / Delete still fire, and `thread-pane.tsx:256-267` renders its composer **whatever** the
 *    conversation is (`archived` reaches only `itemProps` `:191`, through `chat-page.tsx:317`). Measured: `POST
 *    …/reactions/…`, `POST …/pin`, `PATCH /api/chat/messages/…` and a thread reply all succeeded on an archived
 *    conversation. `[MEASURED, NOT INTENDED]` — the notice's own wording and `conversation-view.test.tsx:215-219`
 *    ("an archived conversation without a composer") state read-only; no test covers the archived message actions or the
 *    archived thread composer.
 * 3. **Deleting a message asks for no confirmation.** `conversation-view.tsx:313` calls `actions.remove` straight from
 *    the menu; measured 0 `[role="dialog"]` before and after the click, and a `DELETE` with an empty body (probe-1 P5).
 *    No unit test states a confirmation step. `[MEASURED, NOT INTENDED]` only in the sense that none exists to compare
 *    with: this is stated as measured behaviour, not as a defect.
 * 4. **Marking a conversation unread from a message stops the automatic read until something is sent.**
 *    `conversation-view.tsx:319` sets `readPaused.current = true` and only `send` clears it (`:267`), while the read
 *    effect returns on `readPaused` (`:207`). Measured: after `Mark unread from here`, scrolling up and back to the
 *    bottom sent no `POST …/read`, and a send did (probe-3 R5). Not tagged as a defect — the comment above that effect
 *    (`:205`) names exactly this rule, and `conversation-view.test.tsx:258-267` (read at the bottom, not while scrolled
 *    up) never marks anything unread, so it tests the armed case only.
 * 5. **With no live channel the page keeps re-reading.** `NEWER_POLL_MS` 5 000 (`use-chat-messages.ts:16`) and
 *    `HELD_REFRESH_MS` 30 000 (`:21`) plus the list's own 30 000 (`use-chat-conversations.ts:14`): measured on an idle
 *    conversation page `GET …/messages?after=<newest>&limit=50` every ~5 s, and a 30 s beat of `GET /api/chat/conversations`
 *    + `GET /api/chat/states` + `GET …/messages?around=<oldest held>&limit=50` (probe-2 Q1 / Q2 call logs). Not tagged:
 *    it is what the polling intervals say.
 *
 * ## What this file does not cover
 *
 * Attachments and the file panel (`chat-files.tsx`, `use-chat-files` — only the `?limit=100&skip=0` read is pinned, in
 * test 1), link previews and the webhook dialog (both flags off on this lane), the `Create task` dialog and its task
 * writes, `@` mentions and their payload, the emoji picker beyond the three toolbar reactions, the keyboard shortcuts
 * (`Alt+↑`/`Alt+↓`, `Shift+Escape`) and the command palette, the `Unreads` / `Threads` views and the list itself (the
 * sibling file), the typing indicator's *incoming* side (`POST …/typing` is measured as a request only), the virtual
 * timeline (flag off here), `join`, `archive`, `addMembers`, the New channel / New direct / Browse dialogs, and a message
 * whose author is neither of the lane's fixture people (`use-chat-scope.ts:56-66` merges the team directory, so an unknown
 * author renders as no name — no test here serves one).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const CHAT_API = '/api/chat';

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

const report = (label: string, value: unknown) =>
	console.log(`[lane-a chat-conversation] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The conversation pane; the shell has its own `<nav>` and three `<main>`s (`chat-page.tsx:212-236`). */
const chatPane = (page: Page) => page.locator('main.h-full.min-w-0.flex-1');
const timeline = (page: Page) => chatPane(page).getByRole('log');
const rowOf = (page: Page, id: string) => chatPane(page).locator(`[data-message-id="${id}"]`);
const composerOf = (page: Page, name: string) => chatPane(page).getByRole('textbox', { name: `Message ${name}` });
const sendButton = (page: Page) => chatPane(page).getByRole('button', { name: T.SEND });
/** The header's own More button: a message toolbar has one too, so it is scoped to the bar (`conversation-header.tsx:178`). */
const headerMore = (page: Page) => chatPane(page).locator('header').getByRole('button', { name: T.MORE });
/** The thread pane is the `<aside>` that carries the Thread heading; the list's aside is the other one. */
const threadPane = (page: Page) =>
	page.locator('aside').filter({ has: page.getByRole('heading', { name: T.THREAD, exact: true }) });

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for everything this file answers. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const MINUTE = 60_000;
/** Served times are always relative to now, so no test can pin today's date or the browser's zone. */
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

/** `clockTime` / `fullDateTime` / the welcome's long date, recomputed **in the browser** as `chat-timeline.ts:116-133` does. */
const clockTimeIn = (page: Page, iso: string) =>
	page.evaluate(
		(value: string) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
				hour: 'numeric',
				minute: '2-digit'
			}).format(new Date(value)),
		iso
	);
const fullDateTimeIn = (page: Page, iso: string) =>
	page.evaluate(
		(value: string) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value)),
		iso
	);
const longDateIn = (page: Page, iso: string) =>
	page.evaluate(
		(value: string) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', { dateStyle: 'long' }).format(
				new Date(value)
			),
		iso
	);
/** `dayLabel` (`chat-timeline.ts:82-89`) recomputed **in the browser**, so a served time that falls on yesterday is
 * labelled the way the page labels it instead of being guessed from the machine that runs the test. */
const dayLabelIn = (page: Page, iso: string) =>
	page.evaluate((value: string) => {
		const locale = document.documentElement.lang || 'en';
		const date = new Date(value);
		const startOfDay = (moment: Date) =>
			new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()).getTime();
		const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
		if (daysAgo === 0 || daysAgo === 1) {
			const text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(daysAgo === 0 ? 0 : -1, 'day');
			return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
		}
		const sameYear = date.getFullYear() === new Date().getFullYear();
		return new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			...(sameYear ? {} : { year: 'numeric' })
		}).format(date);
	}, iso);

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
/** `IChatMessage` as this file serves it. */
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
/** Which writes and reads this file refuses, with which status. */
type Refusals = {
	list?: number;
	messages?: number;
	thread?: number;
	send?: number;
	edit?: number;
	remove?: number;
	react?: number;
	pin?: number;
	follow?: number;
	read?: number;
	unread?: number;
	state?: number;
	leave?: number;
};
type ChatScript = {
	conversations: ServedConversation[];
	categories?: { id: string; name: string; position: number }[];
	browse?: ServedConversation[];
	people?: { employeeId: string; userId: string | null; name: string | null; imageUrl: null }[];
	messages: ServedMessage[];
	/** Older messages exist than the newest page this file answers (`hasBefore` → the `LOAD_OLDER` button). */
	hasBefore?: Record<string, boolean>;
	/** Holds the answer of a message `POST` this long, so a pending row can be seen (`script.pendingDelayMs`). */
	pendingDelayMs?: number;
	/** Who the platform says wrote a message this file creates: the signed-in fixture person. */
	author?: { employeeId: string; userId: string };
	refuse?: Refusals;
};
type ChatHarness = {
	/** Mutating this changes what the same route answers, so a test never has to unroute to change its mind. */
	script: ChatScript;
	/** What the store holds now: reads answer from it, writes change it. */
	store: { conversations: ServedConversation[]; messages: ServedMessage[]; followed: Set<string> };
	calls: ServedCall[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	queriesOf: (method: string, path: string) => string[];
	writes: () => string[];
	writesFrom: (index: number) => string[];
	callsFrom: (index: number) => ServedCall[];
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
	messageCount: 4,
	lastMessageAt: null,
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
/** A deleted message with no replies is left out of the platform's pages (`use-chat-messages.ts:117-120`). */
const leftOutOfPages = (message: ServedMessage) => !!message.deletedAt && !(message.replyCount > 0);
/** The conversation's timeline: a thread-only reply is not in it (`use-chat-actions.ts:131`). */
const timelineOf = (store: ChatHarness['store'], conversationId: string) =>
	store.messages
		.filter(
			(message) =>
				message.conversationId === conversationId &&
				(!message.threadRootId || message.alsoInConversation) &&
				!leftOutOfPages(message)
		)
		.sort(byPlace);

/**
 * This file's stand-in for the platform's chat, on the mock origin, because the mock has no handler for any of it (see the
 * header). Reads answer from the current store, so a write can be followed by a re-read that agrees with it.
 */
async function serveChat(page: Page, initial: ChatScript): Promise<ChatHarness> {
	const script: ChatScript = { ...initial, refuse: { ...initial.refuse } };
	const store = {
		conversations: initial.conversations.map((conversation) => ({ ...conversation })),
		messages: initial.messages.map((message) => ({ ...message })),
		followed: new Set<string>()
	};
	const calls: ServedCall[] = [];
	let created = 0;

	await page.route(
		(originUrl: URL) => originUrl.origin === MOCK_API_ORIGIN && originUrl.pathname.startsWith(CHAT_API),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const requestUrl = new URL(request.url());
			const path = requestUrl.pathname;
			const query = requestUrl.searchParams;
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
			const find = (id: string) => store.messages.find((message) => message.id === id);
			const conversationIn = (id: string) => store.conversations.find((conversation) => conversation.id === id);

			if (path === '/api/chat/conversations' && method === 'GET') {
				const refused = refusal('list');
				if (refused) return refused;
				return answer(200, { conversations: store.conversations, categories: script.categories ?? [] });
			}
			if (path === '/api/chat/states')
				return answer(200, {
					states: store.conversations
						.map((conversation) => conversation.state)
						.filter((state): state is ServedState => state !== null),
					threads: []
				});
			if (path === '/api/chat/conversations/browse') return answer(200, script.browse ?? []);
			if (path === '/api/chat/people') return answer(200, script.people ?? []);

			const messagesRead = /^\/api\/chat\/conversations\/([^/]+)\/messages$/.exec(path);
			if (messagesRead && method === 'GET') {
				const refused = refusal('messages');
				if (refused) return refused;
				const all = timelineOf(store, messagesRead[1]);
				const limit = Number(query.get('limit') ?? 50);
				const after = query.get('after');
				const before = query.get('before');
				const around = query.get('around');
				let page1: ServedMessage[];
				let hasBefore: boolean;
				let hasAfter: boolean;
				if (after) {
					const at = all.findIndex((message) => message.id === after);
					page1 = all.slice(at + 1, at + 1 + limit);
					hasBefore = false;
					hasAfter = at + 1 + limit < all.length;
				} else if (before) {
					const at = all.findIndex((message) => message.id === before);
					page1 = all.slice(Math.max(0, at - limit), Math.max(0, at));
					hasBefore = at - limit > 0;
					hasAfter = false;
				} else if (around) {
					const at = all.findIndex((message) => message.id === around);
					const start = Math.max(0, at - Math.floor(limit / 2));
					page1 = all.slice(start, start + limit);
					hasBefore = start > 0;
					hasAfter = start + limit < all.length;
				} else {
					page1 = all.slice(Math.max(0, all.length - limit));
					hasBefore = !!script.hasBefore?.[messagesRead[1]];
					hasAfter = false;
				}
				return answer(200, { messages: page1, hasBefore, hasAfter });
			}
			if (/^\/api\/chat\/conversations\/[^/]+\/messages$/.test(path) && method === 'POST') {
				const conversationId = path.split('/')[4];
				const sent = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				if (script.pendingDelayMs) await new Promise((resolve) => setTimeout(resolve, script.pendingDelayMs));
				const refused = refusal('send');
				if (refused) return refused;
				const now = new Date().toISOString();
				const message = messageOf(`srv-${(created += 1)}`, conversationId, {
					body: String(sent.body ?? ''),
					nonce: sent.nonce === undefined ? null : String(sent.nonce ?? ''),
					threadRootId: sent.threadRootId ? String(sent.threadRootId) : null,
					replyToId: sent.replyToId ? String(sent.replyToId) : null,
					alsoInConversation: sent.alsoInConversation === true,
					mentionEmployeeIds: Array.isArray(sent.mentionEmployeeIds)
						? (sent.mentionEmployeeIds as string[])
						: [],
					authorEmployeeId: script.author?.employeeId ?? null,
					authorUserId: script.author?.userId ?? null,
					createdAt: now
				});
				store.messages = [...store.messages, message];
				if (message.threadRootId) {
					const root = find(message.threadRootId);
					if (root) {
						root.replyCount += 1;
						root.lastReplyAt = now;
					}
				}
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
				const refused = refusal('read');
				if (refused) return refused;
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
			const leave = /^\/api\/chat\/conversations\/([^/]+)\/leave$/.exec(path);
			if (leave && method === 'POST') {
				const refused = refusal('leave');
				if (refused) return refused;
				store.conversations = store.conversations.filter((conversation) => conversation.id !== leave[1]);
				return answer(200, { events: [] });
			}
			const stateWrite = /^\/api\/chat\/conversations\/([^/]+)\/state$/.exec(path);
			if (stateWrite && method === 'PATCH') {
				const refused = refusal('state');
				if (refused) return refused;
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				store.conversations = store.conversations.map((conversation) =>
					conversation.id === stateWrite[1] && conversation.state
						? {
								...conversation,
								state: {
									...conversation.state,
									...(body.notifyLevel === undefined
										? {}
										: { notifyLevel: String(body.notifyLevel) }),
									...(body.isFavorite === undefined ? {} : { isFavorite: Boolean(body.isFavorite) })
								}
							}
						: conversation
				);
				return answer(200, { state: conversationIn(stateWrite[1])?.state ?? null, events: [] });
			}
			const single = /^\/api\/chat\/conversations\/([^/]+)$/.exec(path);
			if (single && method === 'GET') {
				const found = conversationIn(single[1]);
				if (!found) return answer(404, { statusCode: 404, message: 'this file has no such conversation' });
				return answer(200, found);
			}

			const thread = /^\/api\/chat\/messages\/([^/]+)\/thread$/.exec(path);
			if (thread && method === 'GET') {
				const refused = refusal('thread');
				if (refused) return refused;
				const root = find(thread[1]);
				if (!root) return answer(404, { statusCode: 404, message: 'no such message' });
				return answer(200, {
					root: { ...root, following: store.followed.has(thread[1]) },
					messages: store.messages
						.filter((message) => message.threadRootId === thread[1] && !leftOutOfPages(message))
						.sort(byPlace),
					hasBefore: false,
					hasAfter: false
				});
			}
			const follow = /^\/api\/chat\/messages\/([^/]+)\/(follow|unfollow)$/.exec(path);
			if (follow && method === 'POST') {
				const refused = refusal('follow');
				if (refused) return refused;
				const following = follow[2] === 'follow';
				if (following) store.followed.add(follow[1]);
				else store.followed.delete(follow[1]);
				return answer(200, { following, events: [] });
			}
			const pin = /^\/api\/chat\/messages\/([^/]+)\/(pin|unpin)$/.exec(path);
			if (pin && method === 'POST') {
				const refused = refusal('pin');
				if (refused) return refused;
				const message = find(pin[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				message.pinnedAt = pin[2] === 'pin' ? new Date().toISOString() : null;
				return answer(200, { message, events: [] });
			}
			const react = /^\/api\/chat\/messages\/([^/]+)\/reactions\/(.+)$/.exec(path);
			if (react && (method === 'POST' || method === 'DELETE')) {
				const refused = refusal('react');
				if (refused) return refused;
				const emoji = decodeURIComponent(react[2]);
				const message = find(react[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				const at = message.reactions.findIndex((entry) => entry.emoji === emoji);
				if (method === 'POST') {
					if (at === -1) message.reactions = [...message.reactions, { emoji, count: 1, mine: true }];
					else
						message.reactions[at] = {
							...message.reactions[at],
							count: message.reactions[at].count + 1,
							mine: true
						};
				} else if (at !== -1) {
					const next = { ...message.reactions[at], count: message.reactions[at].count - 1, mine: false };
					if (next.count <= 0) message.reactions.splice(at, 1);
					else message.reactions[at] = next;
				}
				return answer(200, { message, events: [] });
			}
			const unread = /^\/api\/chat\/messages\/([^/]+)\/unread$/.exec(path);
			if (unread && method === 'POST') {
				const refused = refusal('unread');
				if (refused) return refused;
				const message = find(unread[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				const conversation = conversationIn(message.conversationId);
				if (conversation?.state) {
					const fromHere = timelineOf(store, message.conversationId).filter(
						(entry) => byPlace(entry, message) >= 0
					);
					conversation.state = {
						...conversation.state,
						unreadCount: fromHere.length,
						lastReadMessageId: null,
						lastReadAt: new Date(Date.parse(message.createdAt) - 1).toISOString()
					};
				}
				return answer(200, { events: [] });
			}
			const editOrRemove = /^\/api\/chat\/messages\/([^/]+)$/.exec(path);
			if (editOrRemove && method === 'PATCH') {
				const refused = refusal('edit');
				if (refused) return refused;
				const message = find(editOrRemove[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				message.body = String(body.body ?? message.body);
				message.editedAt = new Date().toISOString();
				if (Array.isArray(body.mentionEmployeeIds))
					message.mentionEmployeeIds = body.mentionEmployeeIds as string[];
				return answer(200, { message, events: [] });
			}
			if (editOrRemove && method === 'DELETE') {
				const refused = refusal('remove');
				if (refused) return refused;
				const message = find(editOrRemove[1]);
				if (!message) return answer(404, { statusCode: 404, message: 'no such message' });
				message.deletedAt = new Date().toISOString();
				message.body = '';
				return answer(200, { events: [] });
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
		queriesOf: (method, path) =>
			calls.filter((call) => call.method === method && call.path === path).map((call) => call.query),
		writes: () =>
			calls
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? ''}`.trim()),
		writesFrom: (index) =>
			calls
				.slice(index)
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? ''}`.trim()),
		callsFrom: (index) => calls.slice(index)
	};
}

const ID_GENERAL = 'c0000000-0000-4000-8000-000000000gen';
const ID_RANDOM = 'c0000000-0000-4000-8000-000000000ran';
const ID_DIRECT = 'd0000000-0000-4000-8000-000000000001';
const ID_ARCHIVED = 'c0000000-0000-4000-8000-000000000old';
const ID_UNKNOWN = '00000000-0000-4000-8000-000000000000';
const MSG_OLD = 'msg-old-1';
const MSG_MINE = 'msg-mine-2';
const MSG_REACTION = 'msg-reaction-3';
const MSG_NEWEST = 'msg-new-4';
const MSG_ARCHIVED_MINE = 'msg-archived-mine';
const MSG_ARCHIVED_ROOT = 'msg-archived-root';

/** What the served times are, so a row's clock can be recomputed in the browser instead of guessed. */
const TIME_OLD = ago(300);
const TIME_MINE = ago(200);
const TIME_REACTION = ago(120);
const TIME_NEWEST = ago(30);
const TIME_CONVERSATION = ago(600);
const TIME_ARCHIVE_ROOT = ago(1950);
const TIME_ARCHIVE_MINE = ago(2000);

/** The conversations every test is served: a private channel with four messages and a thread, the team's default
 * channel, a direct conversation, and an archived channel whose messages are the reader's own and a root with a reply. */
const servedStore = (fixture: BootstrapFixture): ChatScript => ({
	conversations: [
		channelOf(ID_GENERAL, 'general', { isDefault: true, memberCount: 4, topic: 'everything of this team' }),
		channelOf(ID_RANDOM, 'random', {
			visibility: 'private',
			memberCount: 2,
			lastMessageAt: TIME_NEWEST,
			createdAt: TIME_CONVERSATION
		}),
		channelOf(ID_DIRECT, null, {
			kind: 'direct',
			memberCount: 2,
			lastMessageAt: ago(5),
			members: [
				{ employeeId: fixture.ids.employee, userId: fixture.ids.user, role: 'member', joinedAt: null },
				{
					employeeId: fixture.ids.teammateEmployee,
					userId: fixture.ids.teammateUser,
					role: 'member',
					joinedAt: null
				}
			]
		}),
		channelOf(ID_ARCHIVED, 'archived-old', { archivedAt: ago(60 * 24), memberCount: 2 })
	],
	categories: [],
	browse: [],
	people: [],
	author: { employeeId: fixture.ids.employee, userId: fixture.ids.user },
	messages: [
		messageOf(MSG_OLD, ID_RANDOM, {
			body: 'first message here',
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			createdAt: TIME_OLD
		}),
		messageOf(MSG_MINE, ID_RANDOM, {
			body: 'a message of mine',
			authorEmployeeId: fixture.ids.employee,
			authorUserId: fixture.ids.user,
			createdAt: TIME_MINE
		}),
		messageOf(MSG_REACTION, ID_RANDOM, {
			body: 'a thread root with a reaction',
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			createdAt: TIME_REACTION,
			replyCount: 2,
			lastReplyAt: ago(90),
			reactions: [{ emoji: '👍', count: 1, mine: false }],
			following: false
		}),
		messageOf(MSG_NEWEST, ID_RANDOM, {
			body: 'the newest one',
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			createdAt: TIME_NEWEST
		}),
		messageOf(`${MSG_REACTION}-r1`, ID_RANDOM, {
			body: 'first reply',
			threadRootId: MSG_REACTION,
			alsoInConversation: false,
			authorEmployeeId: fixture.ids.employee,
			authorUserId: fixture.ids.user,
			createdAt: ago(100)
		}),
		messageOf(`${MSG_REACTION}-r2`, ID_RANDOM, {
			body: 'second reply',
			threadRootId: MSG_REACTION,
			alsoInConversation: false,
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			createdAt: ago(90)
		}),
		messageOf(MSG_ARCHIVED_MINE, ID_ARCHIVED, {
			body: 'my own message of an archived channel',
			authorEmployeeId: fixture.ids.employee,
			authorUserId: fixture.ids.user,
			createdAt: TIME_ARCHIVE_MINE
		}),
		messageOf(MSG_ARCHIVED_ROOT, ID_ARCHIVED, {
			body: 'a root in the archived channel',
			authorEmployeeId: fixture.ids.teammateEmployee,
			authorUserId: fixture.ids.teammateUser,
			replyCount: 1,
			lastReplyAt: ago(1900),
			createdAt: TIME_ARCHIVE_ROOT
		}),
		messageOf(`${MSG_ARCHIVED_ROOT}-r1`, ID_ARCHIVED, {
			body: 'its reply',
			threadRootId: MSG_ARCHIVED_ROOT,
			alsoInConversation: false,
			authorEmployeeId: fixture.ids.employee,
			authorUserId: fixture.ids.user,
			createdAt: ago(1900)
		})
	]
});

/** A row as the page draws it: its id, its words, its `<time>`s and the buttons in it. */
const rowSnapshot = (page: Page, id: string) =>
	rowOf(page, id).evaluate((row) => ({
		id: row.getAttribute('data-message-id'),
		text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
		times: Array.from(row.querySelectorAll('time')).map((time) => ({
			dateTime: time.getAttribute('datetime'),
			title: time.getAttribute('title'),
			text: (time.textContent ?? '').trim()
		})),
		buttons: Array.from(row.querySelectorAll('button')).map((button) => ({
			name: button.getAttribute('aria-label') ?? (button.textContent ?? '').trim(),
			pressed: button.getAttribute('aria-pressed')
		})),
		dimmed: Array.from(row.querySelectorAll('*'))
			.filter((node) => getComputedStyle(node).opacity !== '1')
			.map((node) => node.tagName.toLowerCase()),
		rowOpacity: getComputedStyle(row).opacity
	}));

const rowsSnapshot = (page: Page) =>
	timeline(page)
		.locator('[data-message-id]')
		.evaluateAll((rows) =>
			rows.map((row) => ({
				id: row.getAttribute('data-message-id'),
				text: (row.textContent ?? '').replace(/\s+/g, ' ').trim()
			}))
		);

/** The timeline's own row order: dividers by their label, messages by their id. */
const timelineOrder = (page: Page) =>
	timeline(page).evaluate((log) => {
		const out: string[] = [];
		const walk = (root: Element) => {
			for (const node of Array.from(root.children)) {
				if (node.getAttribute('role') === 'separator') out.push(`separator:${node.getAttribute('aria-label')}`);
				else if (node.hasAttribute('data-message-id'))
					out.push(`message:${node.getAttribute('data-message-id')}`);
				else walk(node);
			}
		};
		walk(log);
		return out;
	});

const separatorsOf = (page: Page) =>
	timeline(page)
		.locator('[role="separator"]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));

/** The bar on top of the pane (`conversation-header.tsx:139-203`). */
const headerOf = (page: Page) =>
	chatPane(page)
		.locator('header')
		.evaluateAll((headers) =>
			headers.map((header) => ({
				text: (header.textContent ?? '').replace(/\s+/g, ' ').trim(),
				h1: (header.querySelector('h1')?.textContent ?? '').trim(),
				buttons: Array.from(header.querySelectorAll('button')).map((button) => ({
					name: button.getAttribute('aria-label') ?? (button.textContent ?? '').trim(),
					pressed: button.getAttribute('aria-pressed'),
					disabled: button.hasAttribute('disabled')
				}))
			}))
		);

const paneText = (page: Page) => chatPane(page).innerText().then(flat);

const toastTexts = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-sonner-toast]'))
			.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
			.filter((value) => !value.includes('Copy details'))
	);

/** `[role="dialog"]` count: a Base UI menu is `role="menu"`, so this counts a real confirmation dialog only. */
const dialogCount = (page: Page) => page.evaluate(() => document.querySelectorAll('[role="dialog"]').length);

/**
 * A message's hover toolbar is `pointer-events-none … opacity-0` until the row is hovered or something inside it is
 * focus-visible (`message-item.tsx:92-96`), so every toolbar action hovers its row first.
 */
const hoverRow = async (page: Page, id: string) => {
	await rowOf(page, id).hover();
};

/** The menu entries currently open (Base UI opens them in a document-level portal). */
const openMenuItems = (page: Page) =>
	page
		.getByRole('menuitem')
		.evaluateAll((items) => items.map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim()));
const openRadioItems = (page: Page) =>
	page.getByRole('menuitemradio').evaluateAll((items) =>
		items.map((item) => ({
			text: (item.textContent ?? '').replace(/\s+/g, ' ').trim(),
			checked: item.getAttribute('aria-checked')
		}))
	);

/**
 * Button names inside the pane, filtered to the ones asked for. The wanted names are passed **into** the browser as an
 * argument — a page callback cannot see this file's `T`.
 */
const paneButtonsNamed = (page: Page, names: string[]) =>
	chatPane(page)
		.getByRole('button')
		.evaluateAll(
			(buttons, wanted: string[]) =>
				buttons
					.map((button) => button.getAttribute('aria-label') ?? (button.textContent ?? '').trim())
					.filter((name) => wanted.includes(name)),
			names
		);

/**
 * A reaction chip is a button carrying `aria-pressed` (`message-item.tsx:256-265`); nothing else in a row does, so the
 * chips are picked by that attribute instead of by their accessible name (its text is `👍1`, emoji and count with no
 * space between the spans).
 */
const chipOf = (page: Page, id: string, index = 0) => rowOf(page, id).locator('button[aria-pressed]').nth(index);

/**
 * A Base UI menu lives in a document-level portal that keeps intercepting pointer events while it is open (measured: a
 * `hover` on a row retried 300+ times against `<div role="presentation" data-base-ui-inert>` from `[data-base-ui-portal]`),
 * so a menu that was only *read* is closed before the next hover or click.
 */
const closeMenu = async (page: Page) => {
	await page.keyboard.press('Escape');
	await expect.poll(() => page.getByRole('menuitem').count(), { timeout: 10_000 }).toBe(0);
};

/**
 * This file's own recorder wrapped around the browser's `clipboard.writeText`: it keeps what the page asked the browser to
 * copy and still calls the browser's own method (`conversation-view.tsx:333`, `:346`). `clipboard.readText()` is never
 * used — without a granted permission Chromium answers it with a prompt nobody in a test answers.
 */
const installClipboardRecorder = (page: Page) =>
	page.addInitScript(() => {
		(window as unknown as { __copied: string[] }).__copied = [];
		const holder = window.navigator.clipboard;
		const original = holder?.writeText?.bind(holder);
		Object.defineProperty(window.navigator, 'clipboard', {
			configurable: true,
			get: () => ({
				writeText: (value: string) => {
					(window as unknown as { __copied: string[] }).__copied.push(value);
					return original
						? original(value).catch(() => undefined)
						: Promise.reject(new Error('no clipboard'));
				}
			})
		});
	});
const copiedTexts = (page: Page) => page.evaluate(() => (window as unknown as { __copied?: string[] }).__copied ?? []);

/** Flag on, signed in, on the lane's own route: the flag goes into this browser before its first navigation. */
const openChat = async (
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	options: { requireShell?: boolean } = {}
) => {
	await overrideRuntimeEnv(page, { NEXT_PUBLIC_CHAT_ENABLED: 'true' });
	await signInAndVisit(page, fixture, path, { requireShell: options.requireShell });
};

/** The runtime payload as the page was served it, and what the code reads out of it. */
const runtimeEnvOf = (page: Page) =>
	page.evaluate(() => {
		const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '{}';
		const payload = JSON.parse(raw) as Record<string, string>;
		return {
			payloadKeys: Object.keys(payload).length,
			payloadHasChatKey: 'NEXT_PUBLIC_CHAT_ENABLED' in payload,
			runtimeReads:
				(globalThis as { __EVER_TEAMS_RUNTIME_ENV__?: Record<string, string> }).__EVER_TEAMS_RUNTIME_ENV__
					?.NEXT_PUBLIC_CHAT_ENABLED ?? null
		};
	});

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

test.describe('lane-a chat conversation', () => {
	test('opening a served conversation: its header, its rows, and the reads it sent', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => page.url(), { timeout: 20_000 }).toBe(`${APP_ORIGIN}/chat/${ID_RANDOM}`);
		// The reads are read out **now**, before this test waits long enough for the 5 s forward poll to arrive.
		const openedCalls = served.shapes();
		const env = await runtimeEnvOf(page);
		const header = (await headerOf(page))[0];
		const rows = await rowsSnapshot(page);
		const oldRow = await rowSnapshot(page, MSG_OLD);
		const mineRow = await rowSnapshot(page, MSG_MINE);
		const newestRow = await rowSnapshot(page, MSG_NEWEST);
		const separators = await separatorsOf(page);
		const pane = await paneText(page);
		const createdOn = await longDateIn(page, TIME_CONVERSATION);
		report('open', { env, header, rows, oldRow, separators, pane, openedCalls });

		// The flag this test set, and what the payload the page was served with holds.
		expect(env.payloadKeys).toBe(52);
		expect(env.payloadHasChatKey).toBe(false);
		expect(env.runtimeReads).toBe('true');

		// The bar: the conversation's name, its members, favourite, notifications, More (`conversation-header.tsx:139-202`).
		expect(header.h1).toBe('random');
		expect(header.buttons.map((button) => button.name)).toEqual([
			T.BACK,
			T.FILES,
			plural('MEMBER_COUNT', 2),
			T.FAVORITE,
			T.NOTIFY_LEVEL,
			T.MORE
		]);
		expect(header.buttons[3].pressed).toBe('false');

		// The timeline rows, in the page's own order, each naming its author, its words and its time.
		expect(rows.map((row) => row.id)).toEqual([MSG_OLD, MSG_MINE, MSG_REACTION, MSG_NEWEST]);
		expect(oldRow.times).toHaveLength(1);
		expect(oldRow.times[0].dateTime).toBe(TIME_OLD);
		expect(oldRow.times[0].text).toBe(await clockTimeIn(page, TIME_OLD));
		expect(oldRow.times[0].title).toBe(await fullDateTimeIn(page, TIME_OLD));
		expect(oldRow.text).toContain('Fixture Teammate');
		expect(oldRow.text).toContain('first message here');
		expect(mineRow.text).toContain('Fixture Manager');
		expect(mineRow.text).toContain('a message of mine');
		// No message continues another here: `continuesGroup` needs the same author within 5 minutes (`chat-format.ts:144-147`).
		expect(newestRow.times[0].dateTime).toBe(TIME_NEWEST);
		expect(newestRow.text).toContain('the newest one');

		// One day divider per local day the four served messages fall on (`chat-timeline.ts:47-70` + `dayLabel` `:82-89`),
		// and no "New" line: this conversation was opened with nothing unread.
		const dayLabels: string[] = [];
		for (const iso of [TIME_OLD, TIME_MINE, TIME_REACTION, TIME_NEWEST]) {
			const label = await dayLabelIn(page, iso);
			if (!dayLabels.includes(label)) dayLabels.push(label);
		}
		expect(separators).toEqual(dayLabels);
		// The conversation's welcome (`chat-timeline-parts.tsx:82-110`) and the composer.
		expect(pane).toContain(T.START_OF_CHANNEL.replace('{name}', 'random'));
		expect(pane).toContain(T.START_OF_CHANNEL_TEXT);
		expect(pane).toContain(T.PRIVATE_CHANNEL);
		expect(pane).toContain(plural('MEMBER_COUNT', 2));
		expect(pane).toContain(T.CREATED_ON.replace('{date}', createdOn));
		await expect(composerOf(page, 'random')).toHaveAttribute(
			'aria-label',
			T.COMPOSER_PLACEHOLDER.replace('{name}', 'random')
		);
		await expect(composerOf(page, 'random')).toHaveValue('');
		await expect(sendButton(page)).toBeDisabled();

		// The reads this one opening sent: five for the page, one page of messages, one page of files — nothing else. They
		// go out concurrently, so their order is a race (lead runs saw `states` first and fifth): compare them sorted.
		expect([...openedCalls].sort()).toEqual(
			[
				'GET /api/chat/people',
				'GET /api/chat/conversations',
				`GET /api/chat/conversations/${ID_RANDOM}`,
				'GET /api/chat/conversations/browse',
				'GET /api/chat/states',
				`GET /api/chat/conversations/${ID_RANDOM}/messages?limit=50`,
				`GET /api/chat/conversations/${ID_RANDOM}/files?limit=100&skip=0`
			].sort()
		);
		expect(served.writes()).toEqual([]);
		expect(served.countOf('GET', '/api/chat/threads')).toBe(0);
		expect(served.countOf('GET', `/api/chat/conversations/${ID_RANDOM}/pins`)).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('sending a message: the row while the platform is still answering, the POST body, the row after', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, { ...servedStore(fixture), pendingDelayMs: 4000 });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const field = composerOf(page, 'random');
		await expect(field).toBeVisible();
		await expect(sendButton(page)).toBeDisabled();

		await field.pressSequentially('a message being sent by the spec', { delay: 12 });
		await expect(sendButton(page)).toBeEnabled();
		const beforeSend = await rowsSnapshot(page);
		await sendButton(page).click();

		// The row the app drew for itself, keyed by the nonce it will send (`use-chat-actions.ts:103-109`).
		await expect(chatPane(page).locator('[data-message-id^="pending:"]')).toHaveCount(1);
		const pendingRow = (
			await chatPane(page)
				.locator('[data-message-id^="pending:"]')
				.evaluateAll((rows) =>
					rows.map((row) => ({
						id: row.getAttribute('data-message-id'),
						text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
						buttons: Array.from(row.querySelectorAll('button')).map((button) =>
							button.getAttribute('aria-label')
						),
						dimmed: Array.from(row.querySelectorAll('*'))
							.filter((node) => getComputedStyle(node).opacity !== '1')
							.map((node) => node.tagName.toLowerCase()),
						rowOpacity: getComputedStyle(row).opacity
					}))
				)
		)[0];
		report('pending', { pendingRow, composerValue: await field.inputValue(), beforeSend });

		expect(pendingRow.id).toMatch(/^pending:/);
		expect(pendingRow.text).toContain('a message being sent by the spec');
		// An outbox row has no hover toolbar at all: `canReact = !deleted && !outbox` (`message-item.tsx:132`).
		expect(pendingRow.buttons).toEqual([]);
		// Only its body is dimmed (`message-item.tsx:220`), not the row.
		expect(pendingRow.dimmed.length).toBeGreaterThan(0);
		expect(pendingRow.rowOpacity).toBe('1');
		// The composer is already empty and its Send is disabled while the platform answers (`message-composer.tsx:241-249`).
		await expect(field).toHaveValue('');
		await expect(sendButton(page)).toBeDisabled();

		await expect.poll(() => served.writes().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const sentCall = served.calls.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const sentBody = JSON.parse(String(sentCall?.body ?? '{}')) as Record<string, unknown>;
		report('send body', { sentCall, sentBody });
		expect(sentCall?.path).toBe(`/api/chat/conversations/${ID_RANDOM}/messages`);
		// The body this file measured: the text, the nonce field the outbox keys its row by, and the mentions. Nothing else.
		expect(Object.keys(sentBody).sort()).toEqual(['body', 'mentionEmployeeIds', 'nonce']);
		expect(sentBody.body).toBe('a message being sent by the spec');
		expect(String(sentBody.nonce)).toMatch(/^[0-9a-f-]{30,40}$/);
		expect(pendingRow.id).toBe(`pending:${String(sentBody.nonce)}`);

		// The app's own row is replaced by the platform's copy.
		await expect(chatPane(page).locator('[data-message-id^="srv-"]')).toHaveCount(1);
		await expect(chatPane(page).locator('[data-message-id^="pending:"]')).toHaveCount(0);
		const servedId = (await rowsSnapshot(page)).at(-1)?.id ?? '';
		const afterRow = await rowSnapshot(page, servedId);
		report('after send', { servedId, afterRow });
		expect(afterRow.text).toContain('a message being sent by the spec');
		expect(afterRow.text).toContain('Fixture Manager');
		expect(afterRow.buttons.map((button) => button.name)).toEqual([
			T.REACT_WITH.replace('{emoji}', '👍'),
			T.REACT_WITH.replace('{emoji}', '✅'),
			T.REACT_WITH.replace('{emoji}', '👀'),
			T.ADD_REACTION,
			T.REPLY_IN_THREAD,
			T.MORE
		]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a refused send: the row it leaves behind, and what Retry sends again', async ({ page, fixture, shield }) => {
		const served = await serveChat(page, { ...servedStore(fixture), refuse: { send: 500 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const field = composerOf(page, 'random');
		await field.pressSequentially('a message the platform refuses', { delay: 12 });
		await sendButton(page).click();

		const pendingId = (
			await chatPane(page)
				.locator('[data-message-id^="pending:"]')
				.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-message-id')))
		)[0];
		const failedRow = await rowSnapshot(page, String(pendingId));
		report('refused send row', { pendingId, failedRow, toasts: await toastTexts(page) });

		// The same row, marked failed: its excuse, `RETRY` and `DISCARD` (`message-item.tsx:303-314`).
		expect(failedRow.text).toContain('a message the platform refuses');
		expect(failedRow.text).toContain(T.SEND_FAILED);
		expect(failedRow.buttons.map((button) => button.name)).toEqual([T.RETRY, T.DISCARD]);
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toContainEqual(expect.stringContaining(T.SEND_FAILED));

		const firstBody = JSON.parse(
			String(served.calls.find((call) => call.method === 'POST' && call.path.endsWith('/messages'))?.body ?? '{}')
		) as Record<string, unknown>;
		const indexRetry = served.calls.length;
		await rowOf(page, String(pendingId)).getByRole('button', { name: T.RETRY }).click();
		await expect.poll(() => served.writesFrom(indexRetry).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const retryCall = served
			.callsFrom(indexRetry)
			.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const retryBody = JSON.parse(String(retryCall?.body ?? '{}')) as Record<string, unknown>;
		// A short quiet window: the row is still there because the retry was refused as well.
		await page.waitForTimeout(1_500);
		const stillFailed = await rowSnapshot(page, String(pendingId));
		report('retry', { retryCall, retryBody, firstBody, stillFailed, toasts: await toastTexts(page) });

		// `retry` sends the same outbox entry again (`use-chat-actions.ts:165-181`, the comment at `:92-93`).
		expect(retryBody.nonce).toBe(firstBody.nonce);
		expect(retryBody.body).toBe('a message the platform refuses');
		await expect(rowOf(page, String(pendingId))).toBeVisible();
		expect(stillFailed.buttons.map((button) => button.name)).toEqual([T.RETRY, T.DISCARD]);

		// The only console lines this page printed are the ones naming this path **and** the armed status.
		report('refused send console', {
			lines: shield.consoleErrors().map((line) => line.slice(0, 170)),
			findings: consoleFindings(shield, [
				armedRefusal(`HTTP Error: POST /chat/conversations/${ID_RANDOM}/messages 500`)
			])
		});
		expect(
			consoleFindings(shield, [armedRefusal(`HTTP Error: POST /chat/conversations/${ID_RANDOM}/messages 500`)])
		).toEqual([]);
	});

	test('editing my own message: the control, the PATCH, the row after', async ({ page, fixture, shield }) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const ownRow = rowOf(page, MSG_MINE);
		await expect(ownRow).toBeVisible();
		const rowBefore = await rowSnapshot(page, MSG_MINE);

		// The menu a message offers its own author (`message-item.tsx:345-371`).
		await hoverRow(page, MSG_MINE);
		await ownRow.getByRole('button', { name: T.MORE }).click();
		const menu = await openMenuItems(page);
		report('edit menu', { menu, rowBefore });
		expect(menu).toEqual([T.COPY_LINK, T.PIN, T.MARK_UNREAD_FROM, T.CREATE_TASK, T.EDIT, T.DELETE]);
		await page.getByRole('menuitem', { name: T.EDIT }).click();

		/*
		 * The row is replaced by a composer in edit mode: the timeline item becomes a plain `<div>` holding a
		 * `MessageComposer` with `editing` (`conversation-view.tsx:359-372`), and that composer renders `Cancel` + `Save`
		 * *instead of* its own Send button (`message-composer.tsx:502-512`). The page's own composer stays below it, so the
		 * pane holds three of those buttons — `Cancel`, `Save` from the edit control and the page composer's `Send`, still
		 * disabled because that composer is empty. The row itself has no `data-message-id` while it is being edited.
		 */
		const editField = chatPane(page).getByRole('textbox', { name: T.EDIT });
		await expect(editField).toHaveValue('a message of mine');
		await expect(chatPane(page).getByRole('button', { name: T.SAVE })).toBeEnabled();
		await expect(chatPane(page).getByRole('button', { name: T.CANCEL })).toBeVisible();
		const editButtons = await paneButtonsNamed(page, [T.CANCEL, T.SAVE, T.SEND]);
		report('edit control', {
			textboxes: await chatPane(page).getByRole('textbox').count(),
			editButtons,
			sendDisabled: await chatPane(page).getByRole('button', { name: T.SEND }).isDisabled(),
			editedRowCells: await chatPane(page).locator(`[data-message-id="${MSG_MINE}"]`).count()
		});
		expect(editButtons).toEqual([T.CANCEL, T.SAVE, T.SEND]);
		await expect(chatPane(page).getByRole('button', { name: T.SEND })).toBeDisabled();
		expect(await chatPane(page).locator(`[data-message-id="${MSG_MINE}"]`).count()).toBe(0);
		const editedText = 'a message of mine, edited by the spec';
		const indexEdit = served.calls.length;
		await editField.fill(editedText);
		await chatPane(page).getByRole('button', { name: T.SAVE }).click();
		await expect.poll(() => served.writesFrom(indexEdit).length, { timeout: 15_000 }).toBeGreaterThan(0);

		const editCall = served
			.callsFrom(indexEdit)
			.find((call) => call.method === 'PATCH' && call.path === `/api/chat/messages/${MSG_MINE}`);
		const editBody = JSON.parse(String(editCall?.body ?? '{}')) as Record<string, unknown>;
		const rowAfter = await rowSnapshot(page, MSG_MINE);
		report('edit', { editCall, editBody, rowAfter });
		expect(editBody.body).toBe(editedText);
		expect(editBody.mentionEmployeeIds).toEqual([]);
		// `editedAt` is the platform's own answer, so its tooltip is compared with the same formatting the page used.
		const editedAt = served.store.messages.find((message) => message.id === MSG_MINE)?.editedAt ?? '';
		expect(rowAfter.text).toContain(editedText);
		expect(rowAfter.text).toContain(T.EDITED);
		await expect(ownRow.getByTitle(await fullDateTimeIn(page, editedAt))).toBeVisible();
		// No toast for an edit (`conversation-view.tsx:295-303`), and no console noise.
		expect(await toastTexts(page)).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('deleting my own message: the confirm step, the request, the timeline after', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await hoverRow(page, MSG_MINE);
		await rowOf(page, MSG_MINE).getByRole('button', { name: T.MORE }).click();
		report('delete before', { dialogsBefore: await dialogCount(page), menu: await openMenuItems(page) });
		expect(await dialogCount(page)).toBe(0);

		const indexDelete = served.calls.length;
		await page.getByRole('menuitem', { name: T.DELETE }).click();
		// `conversation-view.tsx:313` calls `actions.remove` straight away: no confirmation is asked for.
		report('delete right after the click', { dialogsAfter: await dialogCount(page) });
		expect(await dialogCount(page)).toBe(0);
		await expect.poll(() => served.writesFrom(indexDelete).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const deleteCall = served
			.callsFrom(indexDelete)
			.find((call) => call.method === 'DELETE' && call.path === `/api/chat/messages/${MSG_MINE}`);
		expect(deleteCall?.body ?? '').toBe('');

		// A deleted message with no replies is left out of the platform's pages (`use-chat-messages.ts:117-120`), so the row
		// is gone; the lists are read again (`use-chat-actions.ts:218`).
		await expect(rowOf(page, MSG_MINE)).toHaveCount(0);
		const rows = await rowsSnapshot(page);
		report('delete after', {
			deleteCall,
			rows,
			listReads: served.countOf('GET', '/api/chat/conversations'),
			toasts: await toastTexts(page)
		});
		expect(rows.map((row) => row.id)).toEqual([MSG_OLD, MSG_REACTION, MSG_NEWEST]);
		expect(served.countOf('GET', '/api/chat/conversations')).toBeGreaterThan(0);
		expect(await toastTexts(page)).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('reacting to a message and taking the reaction back', async ({ page, fixture, shield }) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const plain = await rowSnapshot(page, MSG_OLD);
		report('row before reacting', plain);
		expect(plain.buttons.map((button) => button.name)).toEqual([
			T.REACT_WITH.replace('{emoji}', '👍'),
			T.REACT_WITH.replace('{emoji}', '✅'),
			T.REACT_WITH.replace('{emoji}', '👀'),
			T.ADD_REACTION,
			T.REPLY_IN_THREAD,
			T.MORE
		]);

		// The hover toolbar offers three of the five `QUICK_REACTIONS` (`message-item.tsx:31`, `:34`).
		await hoverRow(page, MSG_OLD);
		const indexAdd = served.calls.length;
		await rowOf(page, MSG_OLD)
			.getByRole('button', { name: T.REACT_WITH.replace('{emoji}', '👍') })
			.click();
		await expect.poll(() => served.writesFrom(indexAdd).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const addCall = served.writesFrom(indexAdd)[0];
		const withMine = await rowSnapshot(page, MSG_OLD);
		report('after adding', { addCall, withMine });
		expect(addCall).toBe(`POST /api/chat/messages/${MSG_OLD}/reactions/${encodeURIComponent('👍')} {}`);
		// The chip is the emoji and its count with no space between them (`message-item.tsx:256-270`).
		expect(withMine.text).toContain('👍1');
		expect(withMine.buttons.find((button) => button.name === '👍1')?.pressed).toBe('true');
		await expect(chipOf(page, MSG_OLD)).toHaveAttribute('aria-pressed', 'true');

		// The same chip takes the reaction back: a `DELETE` of the same address (`chat.service.ts:288-295`).
		await hoverRow(page, MSG_OLD);
		const indexRemove = served.calls.length;
		await chipOf(page, MSG_OLD).click();
		await expect.poll(() => served.writesFrom(indexRemove).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const removeCall = served.writesFrom(indexRemove)[0];
		const backAgain = await rowSnapshot(page, MSG_OLD);
		report('after removing', { removeCall, backAgain });
		expect(removeCall).toBe(`DELETE /api/chat/messages/${MSG_OLD}/reactions/${encodeURIComponent('👍')}`);
		expect(backAgain.text).not.toContain('👍1');
		expect(backAgain.buttons.filter((button) => button.pressed !== null)).toEqual([]);

		// Mine on top of someone else's: the root already holds a 👍 that is not mine.
		const rootBefore = await rowSnapshot(page, MSG_REACTION);
		await hoverRow(page, MSG_REACTION);
		const indexMine = served.calls.length;
		await rowOf(page, MSG_REACTION)
			.getByRole('button', { name: T.REACT_WITH.replace('{emoji}', '✅') })
			.click();
		await expect.poll(() => served.writesFrom(indexMine).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const mineRow = await rowSnapshot(page, MSG_REACTION);
		report('mine on top of someone else', {
			write: served.writesFrom(indexMine)[0],
			rootBefore: rootBefore.buttons.filter((button) => button.pressed !== null),
			rootAfter: mineRow.buttons.filter((button) => button.pressed !== null)
		});
		expect(mineRow.buttons.find((button) => button.name === '👍1')?.pressed).toBe('false');
		expect(mineRow.buttons.find((button) => button.name === '✅1')?.pressed).toBe('true');

		// Refused: the optimistic chip goes back to what the platform said (`use-chat-actions.ts:285-288`).
		const refused = await serveChat(page, { ...servedStore(fixture), refuse: { react: 500 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await hoverRow(page, MSG_REACTION);
		const indexRefused = refused.calls.length;
		await rowOf(page, MSG_REACTION)
			.getByRole('button', { name: T.REACT_WITH.replace('{emoji}', '👍') })
			.click();
		await expect.poll(() => refused.writesFrom(indexRefused).length, { timeout: 15_000 }).toBeGreaterThan(0);
		// The optimistic chip is rolled back once the refusal lands: wait for that with a retrying read, not a sleep.
		await expect
			.poll(
				async () =>
					(await rowSnapshot(page, MSG_REACTION)).buttons.find((button) => button.name === '👍1')?.pressed,
				{ timeout: 15_000 }
			)
			.toBe('false');
		const rolledBack = await rowSnapshot(page, MSG_REACTION);
		report('refused reaction', {
			writes: refused.writesFrom(indexRefused),
			rolledBack: rolledBack.buttons.filter((button) => button.pressed !== null),
			toasts: await toastTexts(page)
		});
		expect(rolledBack.buttons.find((button) => button.name === '👍1')?.pressed).toBe('false');
		expect(await toastTexts(page)).toContainEqual(expect.stringContaining('That change was not saved'));
		expect(
			consoleFindings(shield, [
				armedRefusal(
					`HTTP Error: POST /chat/messages/${MSG_REACTION}/reactions/${encodeURIComponent('👍')} 500`
				)
			])
		).toEqual([]);
	});

	test('pinning a message and unpinning it', async ({ page, fixture, shield }) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const before = await rowSnapshot(page, MSG_OLD);
		expect(before.text).not.toContain(T.PINNED);

		const indexPin = served.calls.length;
		await hoverRow(page, MSG_OLD);
		await rowOf(page, MSG_OLD).getByRole('button', { name: T.MORE }).click();
		await page.getByRole('menuitem', { name: T.PIN }).click();
		await expect.poll(() => served.writesFrom(indexPin).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const pinnedRow = await rowSnapshot(page, MSG_OLD);
		report('pinned', { writes: served.writesFrom(indexPin), pinnedRow });
		expect(served.writesFrom(indexPin)).toEqual([`POST /api/chat/messages/${MSG_OLD}/pin {}`]);
		// The pin shows as a line above the author (`message-item.tsx:166-171`), and the menu now offers `Unpin`.
		expect(pinnedRow.text.startsWith(T.PINNED)).toBe(true);

		await hoverRow(page, MSG_OLD);
		const indexUnpin = served.calls.length;
		await rowOf(page, MSG_OLD).getByRole('button', { name: T.MORE }).click();
		await page.getByRole('menuitem', { name: T.UNPIN }).click();
		await expect.poll(() => served.writesFrom(indexUnpin).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const unpinnedRow = await rowSnapshot(page, MSG_OLD);
		report('unpinned', { writes: served.writesFrom(indexUnpin), unpinnedRow });
		expect(served.writesFrom(indexUnpin)).toEqual([`POST /api/chat/messages/${MSG_OLD}/unpin {}`]);
		expect(unpinnedRow.text).not.toContain(T.PINNED);

		// This view never reads the pin list (`chat.service.ts:222-226`).
		expect(served.countOf('GET', `/api/chat/conversations/${ID_RANDOM}/pins`)).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a thread: its own read, the reply it sends, follow and unfollow, closing it', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_RANDOM}?thread=${MSG_REACTION}`);
		const pane = threadPane(page);
		await expect(pane.getByRole('heading', { name: T.THREAD, exact: true })).toBeVisible();
		const openIndex = served.calls.length;
		const paneHeader = await pane.locator('header').evaluateAll((headers) =>
			headers.flatMap((header) =>
				Array.from(header.querySelectorAll('button')).map((button) => ({
					name: button.getAttribute('aria-label') ?? (button.textContent ?? '').trim(),
					pressed: button.getAttribute('aria-pressed')
				}))
			)
		);
		const paneRows = () =>
			pane
				.getByRole('log')
				.locator('[data-message-id]')
				.evaluateAll((rows) =>
					rows.map((row) => ({
						id: row.getAttribute('data-message-id'),
						text: (row.textContent ?? '').replace(/\s+/g, ' ').trim()
					}))
				);
		const rows = await paneRows();
		const dividers = await pane
			.getByRole('separator')
			.evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')));
		report('thread open', {
			url: page.url(),
			paneHeader,
			rows,
			dividers,
			paneCalls: served.callsFrom(openIndex).map((call) => `${call.method} ${call.path}${call.query}`)
		});

		// The pane reads its own page of replies (`chat.service.ts:296-301`), the root first.
		expect(served.countOf('GET', `/api/chat/messages/${MSG_REACTION}/thread`)).toBeGreaterThan(0);
		expect(served.queriesOf('GET', `/api/chat/messages/${MSG_REACTION}/thread`)).toContain('?limit=50');
		// The root and its two replies, and the divider that counts them (`thread-pane.tsx:239-243`).
		expect(rows.map((row) => row.id)).toEqual([MSG_REACTION, `${MSG_REACTION}-r1`, `${MSG_REACTION}-r2`]);
		expect(dividers).toEqual([await dayLabelIn(page, TIME_REACTION), plural('REPLIES', 2)]);
		expect(paneHeader.map((button) => button.name)).toEqual([T.BACK, T.FOLLOW, T.CLOSE]);
		expect(paneHeader[1].pressed).toBe('false');
		await expect(pane.getByRole('textbox', { name: T.REPLY_PLACEHOLDER })).toHaveCount(1);

		// Follow, then unfollow: one POST each way (`chat.service.ts:307-313`).
		const indexFollow = served.calls.length;
		await pane.getByRole('button', { name: T.FOLLOW }).click();
		await expect.poll(() => served.writesFrom(indexFollow).length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(served.writesFrom(indexFollow)).toEqual([`POST /api/chat/messages/${MSG_REACTION}/follow {}`]);
		await expect(pane.getByRole('button', { name: T.UNFOLLOW })).toHaveAttribute('aria-pressed', 'true');

		// A reply from the pane: it names its root and stays out of the conversation unless told otherwise.
		const field = pane.getByRole('textbox', { name: T.REPLY_PLACEHOLDER });
		await field.pressSequentially('a reply from the thread pane', { delay: 10 });
		const indexReply = served.calls.length;
		await pane.getByRole('button', { name: T.SEND }).click();
		await expect.poll(() => served.writesFrom(indexReply).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const replyCall = served
			.callsFrom(indexReply)
			.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const replyBody = JSON.parse(String(replyCall?.body ?? '{}')) as Record<string, unknown>;
		report('thread reply', {
			replyCall,
			replyBody,
			paneRows: await paneRows(),
			timelineRows: await rowsSnapshot(page)
		});
		expect(Object.keys(replyBody).sort()).toEqual([
			'alsoInConversation',
			'body',
			'mentionEmployeeIds',
			'nonce',
			'threadRootId'
		]);
		expect(replyBody.threadRootId).toBe(MSG_REACTION);
		expect(replyBody.alsoInConversation).toBe(false);
		await expect.poll(async () => (await paneRows()).map((row) => row.id), { timeout: 15_000 }).toContain('srv-1');
		// A thread-only reply is not in the conversation's timeline (`use-chat-actions.ts:131`).
		expect((await rowsSnapshot(page)).map((row) => row.id)).not.toContain('srv-1');

		// The checkbox the pane offers for a reply that should also stand in the conversation.
		await pane.getByRole('checkbox').click();
		await field.pressSequentially(' and also in the conversation', { delay: 10 });
		const indexAlso = served.calls.length;
		await pane.getByRole('button', { name: T.SEND }).click();
		await expect.poll(() => served.writesFrom(indexAlso).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const alsoCall = served
			.callsFrom(indexAlso)
			.find((call) => call.method === 'POST' && call.path.endsWith('/messages'));
		const alsoBody = JSON.parse(String(alsoCall?.body ?? '{}')) as Record<string, unknown>;
		report('thread reply also to the conversation', { alsoBody, timelineRows: await rowsSnapshot(page) });
		expect(alsoBody.alsoInConversation).toBe(true);
		await expect
			.poll(async () => (await rowsSnapshot(page)).map((row) => row.id), { timeout: 15_000 })
			.toContain('srv-2');

		const indexUnfollow = served.calls.length;
		await pane.getByRole('button', { name: T.UNFOLLOW }).click();
		await expect.poll(() => served.writesFrom(indexUnfollow).length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(served.writesFrom(indexUnfollow)).toEqual([`POST /api/chat/messages/${MSG_REACTION}/unfollow {}`]);

		// Closing it takes the query out of the address and the pane out of the page (`chat-page.tsx:153-168`).
		await pane.getByRole('button', { name: T.CLOSE }).click();
		await expect.poll(() => page.url(), { timeout: 15_000 }).toBe(`${APP_ORIGIN}/chat/${ID_RANDOM}`);
		report('thread closed', { url: page.url(), asides: await page.locator('aside').count() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the automatic read at the bottom, marking a conversation unread from a message, and what does not read it back', async ({
		page,
		fixture,
		shield
	}) => {
		const base = servedStore(fixture);
		base.conversations = base.conversations.map((conversation) =>
			conversation.id === ID_RANDOM && conversation.state
				? {
						...conversation,
						state: {
							...conversation.state,
							unreadCount: 3,
							mentionCount: 0,
							lastReadMessageId: MSG_MINE,
							lastReadAt: new Date(Date.parse(TIME_MINE) - 1).toISOString()
						}
					}
				: conversation
		);
		const served = await serveChat(page, base);
		const readPath = `/api/chat/conversations/${ID_RANDOM}/read`;
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await expect.poll(() => served.countOf('POST', readPath), { timeout: 15_000 }).toBeGreaterThan(0);
		const openedOrder = await timelineOrder(page);
		report('opened unread', {
			order: openedOrder,
			reads: served.countOf('POST', readPath),
			state: served.store.conversations.find((c) => c.id === ID_RANDOM)?.state
		});
		// At the bottom with unread the page reads the whole conversation (`conversation-view.tsx:205-211`), and the "New"
		// line stands above the first message **of someone else** after the last read one (`chat-timeline.ts:26-41`).
		expect(served.writesFrom(0)).toEqual([`POST ${readPath} {}`]);
		expect(openedOrder).toEqual([
			`separator:${await dayLabelIn(page, TIME_OLD)}`,
			`message:${MSG_OLD}`,
			`message:${MSG_MINE}`,
			`separator:${T.NEW_DIVIDER}`,
			`message:${MSG_REACTION}`,
			`message:${MSG_NEWEST}`
		]);

		// `Mark unread from here` moves the line to the row the reader chose and leaves the conversation unread.
		await hoverRow(page, MSG_NEWEST);
		await rowOf(page, MSG_NEWEST).getByRole('button', { name: T.MORE }).click();
		const indexUnread = served.calls.length;
		await page.getByRole('menuitem', { name: T.MARK_UNREAD_FROM }).click();
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toContainEqual(expect.stringContaining(T.MARKED_UNREAD));
		const movedOrder = await timelineOrder(page);
		report('marked unread from the newest row', {
			writes: served.writesFrom(indexUnread),
			toasts: await toastTexts(page),
			order: movedOrder,
			state: served.store.conversations.find((c) => c.id === ID_RANDOM)?.state
		});
		expect(served.writesFrom(indexUnread)).toEqual([`POST /api/chat/messages/${MSG_NEWEST}/unread {}`]);
		expect(movedOrder).toEqual([
			`separator:${await dayLabelIn(page, TIME_OLD)}`,
			`message:${MSG_OLD}`,
			`message:${MSG_MINE}`,
			`message:${MSG_REACTION}`,
			`separator:${T.NEW_DIVIDER}`,
			`message:${MSG_NEWEST}`
		]);

		// Marking it unread pauses the automatic read (`conversation-view.tsx:319`); only a send clears it (`:267`), so
		// neither staying at the bottom nor scrolling away and back reads it again.
		const readsAfterMarking = served.countOf('POST', readPath);
		// A short quiet window: the read must *not* come back on its own.
		await page.waitForTimeout(3_000);
		await timeline(page).evaluate((log) => {
			log.scrollTop = 0;
		});
		await page.waitForTimeout(1_200);
		await timeline(page).evaluate((log) => {
			log.scrollTop = log.scrollHeight;
		});
		await page.waitForTimeout(2_500);
		report('after scrolling up and back to the bottom', {
			readsAfterMarking,
			readsNow: served.countOf('POST', readPath)
		});
		expect(served.countOf('POST', readPath)).toBe(readsAfterMarking);

		const field = composerOf(page, 'random');
		await field.pressSequentially('a message sent while the channel was unread', { delay: 10 });
		const indexSend = served.calls.length;
		await sendButton(page).click();
		await expect.poll(() => served.writesFrom(indexSend).length, { timeout: 15_000 }).toBeGreaterThan(0);
		await expect.poll(() => served.countOf('POST', readPath), { timeout: 15_000 }).toBe(readsAfterMarking + 1);
		report('after sending while unread', {
			writes: served.writesFrom(indexSend),
			reads: served.countOf('POST', readPath),
			order: await timelineOrder(page)
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the conversation header: favourite, the notification level menu, copy link, leave', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await installClipboardRecorder(page);
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		const header = chatPane(page).locator('header');
		const stateNow = () =>
			served.store.conversations.find((conversation) => conversation.id === ID_RANDOM)?.state ?? null;

		// Favourite: `aria-pressed` flips at once and one `PATCH …/state` carries the choice
		// (`conversation-view.tsx:343`, `chat.service.ts:134-140`).
		const indexFavorite = served.calls.length;
		const favourite = header.getByRole('button', { name: T.FAVORITE });
		await expect(favourite).toHaveAttribute('aria-pressed', 'false');
		await favourite.click();
		await expect.poll(() => served.writesFrom(indexFavorite).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const favoriteBody = JSON.parse(
			String(served.callsFrom(indexFavorite).find((call) => call.method !== 'GET')?.body ?? '{}')
		) as Record<string, unknown>;
		report('favourite', {
			write: served.writesFrom(indexFavorite)[0],
			favoriteBody,
			pressed: await favourite.getAttribute('aria-pressed')
		});
		expect(favoriteBody.isFavorite).toBe(true);
		await expect(favourite).toHaveAttribute('aria-pressed', 'true');

		// The notification menu: three radio entries, each one its own `PATCH`. (The items live in a document-level
		// portal, so they are *not* scoped to the pane; the trigger is.)
		const notify = header.getByRole('button', { name: T.NOTIFY_LEVEL });
		await notify.click();
		const radios = await openRadioItems(page);
		report('notify menu', { radios });
		expect(radios.map((radio) => radio.text)).toEqual([T['NOTIFY.ALL'], T['NOTIFY.MENTIONS'], T['NOTIFY.MUTED']]);
		expect(radios[0].checked).toBe('true');
		for (const [label, level] of [
			[T['NOTIFY.MENTIONS'], 'mentions'],
			[T['NOTIFY.MUTED'], 'muted'],
			[T['NOTIFY.ALL'], 'all']
		] as const) {
			if (
				!(await page
					.getByRole('menuitemradio', { name: label })
					.isVisible()
					.catch(() => false))
			)
				await notify.click();
			const index = served.calls.length;
			await page.getByRole('menuitemradio', { name: label }).click();
			await expect.poll(() => served.writesFrom(index).length, { timeout: 15_000 }).toBeGreaterThan(0);
			// The first *write* after the click: the 5 s messages poll can land a GET in between (a lead run saw it).
			const write = served.callsFrom(index).find((call) => call.method !== 'GET');
			const body = JSON.parse(String(write?.body ?? '{}')) as Record<string, unknown>;
			report(`notify ${level}`, {
				write: write && `${write.method} ${write.path}`,
				body,
				state: stateNow()?.notifyLevel
			});
			expect(body.notifyLevel).toBe(level);
			expect(stateNow()?.notifyLevel).toBe(level);
		}

		// Copy link: what the page asked the browser to copy, and the confirmation it shows.
		await headerMore(page).click();
		const menu = await openMenuItems(page);
		report('header More menu', { menu });
		expect(menu).toEqual([T.COPY_LINK, T.LEAVE]);
		await page.getByRole('menuitem', { name: T.COPY_LINK }).click();
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toContainEqual(expect.stringContaining(T.LINK_COPIED));
		report('copy link (conversation)', { copied: await copiedTexts(page) });
		expect(await copiedTexts(page)).toContain(`${APP_ORIGIN}/chat/${ID_RANDOM}`);
		await hoverRow(page, MSG_MINE);
		await rowOf(page, MSG_MINE).getByRole('button', { name: T.MORE }).click();
		await page.getByRole('menuitem', { name: T.COPY_LINK }).click();
		await expect
			.poll(() => copiedTexts(page), { timeout: 15_000 })
			.toContain(`${APP_ORIGIN}/chat/${ID_RANDOM}?m=${MSG_MINE}`);
		report('copy link (message)', { copied: await copiedTexts(page) });

		// Leave: no confirmation step, one POST, and the page leaves the conversation (`conversation-view.tsx:347-351`).
		// The message's own menu closed when its `Copy link` was used, so the header menu is opened again for `Leave`.
		report('leave before', { dialogs: await dialogCount(page) });
		expect(await dialogCount(page)).toBe(0);
		const indexLeave = served.calls.length;
		await headerMore(page).click();
		await page.getByRole('menuitem', { name: T.LEAVE }).click();
		await expect.poll(() => served.writesFrom(indexLeave).length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(served.writesFrom(indexLeave)).toEqual([`POST /api/chat/conversations/${ID_RANDOM}/leave {}`]);
		expect(await dialogCount(page)).toBe(0);
		// `/chat` replaces itself with the next conversation the page picks (`chat-page.tsx:132-142`): wait for the address.
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(`/chat/${ID_DIRECT}`);
		report('after leaving', {
			chatCalls: served.callsFrom(indexLeave).map((call) => `${call.method} ${call.path}${call.query}`),
			url: page.url(),
			header: await headerOf(page),
			leftInStore: served.store.conversations.map((conversation) => conversation.name)
		});
		expect(served.store.conversations.map((conversation) => conversation.id)).not.toContain(ID_RANDOM);

		// Where `Leave conversation` is not offered at all: a direct conversation and the team's default channel
		// (`canLeave`, `conversation-header.tsx:134`).
		for (const [id, name] of [
			[ID_DIRECT, 'a direct conversation'],
			[ID_GENERAL, 'the default channel']
		] as const) {
			await openChat(page, fixture, `/chat/${id}`);
			await headerMore(page).click();
			const items = await openMenuItems(page);
			report(`More menu of ${name}`, { items, header: await headerOf(page) });
			expect(items).toEqual([T.COPY_LINK]);
			// Closed before navigating on: an open menu portal swallows the next click.
			await closeMenu(page);
		}

		// A refused leave keeps the reader where they were and says so.
		const refused = await serveChat(page, { ...servedStore(fixture), refuse: { leave: 500 } });
		await openChat(page, fixture, `/chat/${ID_RANDOM}`);
		await headerMore(page).click();
		const indexRefused = refused.calls.length;
		await page.getByRole('menuitem', { name: T.LEAVE }).click();
		await expect.poll(() => refused.writesFrom(indexRefused).length, { timeout: 15_000 }).toBeGreaterThan(0);
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toContainEqual(expect.stringContaining('That change was not saved'));
		report('refused leave', {
			url: page.url(),
			writes: refused.writesFrom(indexRefused),
			toasts: await toastTexts(page)
		});
		expect(new URL(page.url()).pathname).toBe(`/chat/${ID_RANDOM}`);
		expect(
			consoleFindings(shield, [armedRefusal(`HTTP Error: POST /chat/conversations/${ID_RANDOM}/leave 500`)])
		).toEqual([]);
	});

	test('an archived conversation: the notice instead of the composer, and the message actions that remain', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_ARCHIVED}`);
		const pane = await paneText(page);
		const rows = await rowsSnapshot(page);
		const separators = await separatorsOf(page);
		const dayLabels: string[] = [];
		for (const iso of [TIME_ARCHIVE_MINE, TIME_ARCHIVE_ROOT]) {
			const label = await dayLabelIn(page, iso);
			if (!dayLabels.includes(label)) dayLabels.push(label);
		}
		report('archived pane', {
			pane,
			rows,
			separators,
			textboxes: await chatPane(page).getByRole('textbox').count()
		});

		// The composer is replaced by the notice (`conversation-view.tsx:450-454`), and the old messages are still there.
		await expect(chatPane(page).getByText(T.ARCHIVED_NOTICE)).toBeVisible();
		expect(await chatPane(page).getByRole('textbox').count()).toBe(0);
		expect(rows.map((row) => row.id)).toEqual([MSG_ARCHIVED_MINE, MSG_ARCHIVED_ROOT]);
		expect(separators).toEqual(dayLabels);
		// The hover toolbar of an archived message is unchanged (`readOnly` only reaches the app blocks,
		// `message-item.tsx:229`, `:249`).
		expect((await rowSnapshot(page, MSG_ARCHIVED_MINE)).buttons.map((button) => button.name)).toEqual([
			T.REACT_WITH.replace('{emoji}', '👍'),
			T.REACT_WITH.replace('{emoji}', '✅'),
			T.REACT_WITH.replace('{emoji}', '👀'),
			T.ADD_REACTION,
			T.REPLY_IN_THREAD,
			T.MORE
		]);
		await hoverRow(page, MSG_ARCHIVED_MINE);
		await rowOf(page, MSG_ARCHIVED_MINE).getByRole('button', { name: T.MORE }).click();
		const menu = await openMenuItems(page);
		report('archived message menu', { menu });
		expect(menu).toEqual([T.COPY_LINK, T.PIN, T.MARK_UNREAD_FROM, T.CREATE_TASK, T.EDIT, T.DELETE]);
		// Closed first: an open menu portal intercepts the pointer, and the next action hovers the row again.
		await closeMenu(page);

		// `[MEASURED, NOT INTENDED]` — every one of those writes is answered by the platform and lands on the row.
		const indexReact = served.calls.length;
		await hoverRow(page, MSG_ARCHIVED_MINE);
		await rowOf(page, MSG_ARCHIVED_MINE)
			.getByRole('button', { name: T.REACT_WITH.replace('{emoji}', '👍') })
			.click();
		await expect.poll(() => served.writesFrom(indexReact).length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(served.writesFrom(indexReact)).toEqual([
			`POST /api/chat/messages/${MSG_ARCHIVED_MINE}/reactions/${encodeURIComponent('👍')} {}`
		]);

		const indexPin = served.calls.length;
		await hoverRow(page, MSG_ARCHIVED_MINE);
		await rowOf(page, MSG_ARCHIVED_MINE).getByRole('button', { name: T.MORE }).click();
		await page.getByRole('menuitem', { name: T.PIN }).click();
		await expect.poll(() => served.writesFrom(indexPin).length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect((await rowSnapshot(page, MSG_ARCHIVED_MINE)).text.startsWith(T.PINNED)).toBe(true);

		await hoverRow(page, MSG_ARCHIVED_MINE);
		await rowOf(page, MSG_ARCHIVED_MINE).getByRole('button', { name: T.MORE }).click();
		await page.getByRole('menuitem', { name: T.EDIT }).click();
		const indexEdit = served.calls.length;
		await chatPane(page).getByRole('textbox', { name: T.EDIT }).fill('edited although archived');
		await chatPane(page).getByRole('button', { name: T.SAVE }).click();
		await expect.poll(() => served.writesFrom(indexEdit).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const editedRow = await rowSnapshot(page, MSG_ARCHIVED_MINE);
		report('archived edit', { write: served.writesFrom(indexEdit)[0], editedRow });
		expect(editedRow.text).toContain('edited although archived');
		expect(editedRow.text).toContain(T.EDITED);

		// A deleted message that has replies stays as a tombstone (`use-chat-messages.ts:117-120`).
		await hoverRow(page, MSG_ARCHIVED_ROOT);
		await rowOf(page, MSG_ARCHIVED_ROOT).getByRole('button', { name: T.MORE }).click();
		expect(await dialogCount(page)).toBe(0);
		const indexDelete = served.calls.length;
		await page.getByRole('menuitem', { name: T.DELETE }).click();
		await expect.poll(() => rowOf(page, MSG_ARCHIVED_ROOT).innerText(), { timeout: 15_000 }).toContain(T.DELETED);
		const tombstone = await rowSnapshot(page, MSG_ARCHIVED_ROOT);
		report('archived delete', { write: served.writesFrom(indexDelete)[0], tombstone });
		expect(served.writesFrom(indexDelete)).toEqual([`DELETE /api/chat/messages/${MSG_ARCHIVED_ROOT}`]);
		// A deleted row keeps its replies but has no toolbar of its own (`canReact`, `message-item.tsx:132`): the only button
		// left in it is the one that opens the thread.
		expect(tombstone.buttons).toHaveLength(1);
		expect(tombstone.buttons[0].name.startsWith(plural('REPLIES', 1))).toBe(true);

		// `[MEASURED, NOT INTENDED]` the thread pane beside an archived conversation still offers its composer
		// (`thread-pane.tsx:256-267`; `archived` reaches only `itemProps` `:191`).
		await openChat(page, fixture, `/chat/${ID_ARCHIVED}?thread=${MSG_ARCHIVED_ROOT}`);
		const pane2 = threadPane(page);
		report('archived thread pane', {
			text: await pane2.innerText().then((value) => value.replace(/\s+/g, ' ').trim()),
			textboxes: await pane2.getByRole('textbox').count(),
			notice: await pane2.getByText(T.ARCHIVED_NOTICE).count()
		});
		await expect(pane2.getByRole('textbox', { name: T.REPLY_PLACEHOLDER })).toHaveCount(1);
		const field = pane2.getByRole('textbox', { name: T.REPLY_PLACEHOLDER });
		await field.pressSequentially('a reply into an archived conversation', { delay: 10 });
		const indexReply = served.calls.length;
		await pane2.getByRole('button', { name: T.SEND }).click();
		await expect.poll(() => served.writesFrom(indexReply).length, { timeout: 15_000 }).toBeGreaterThan(0);
		const replyBody = JSON.parse(
			String(served.callsFrom(indexReply).find((call) => call.method === 'POST')?.body ?? '{}')
		) as Record<string, unknown>;
		report('archived thread reply', { body: replyBody });
		expect(replyBody.threadRootId).toBe(MSG_ARCHIVED_ROOT);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a deep link to a conversation the platform does not know', async ({ page, fixture, shield }) => {
		const served = await serveChat(page, servedStore(fixture));
		await openChat(page, fixture, `/chat/${ID_UNKNOWN}`);
		const pane = await paneText(page);
		const header = await headerOf(page);
		report('unknown conversation', {
			url: page.url(),
			pane,
			header,
			textboxes: await chatPane(page).getByRole('textbox').count(),
			calls: served.shapes()
		});
		await expect(chatPane(page).getByText(T.NOT_AVAILABLE_TITLE)).toBeVisible();
		await expect(chatPane(page).getByText(T.NOT_AVAILABLE_TEXT)).toBeVisible();
		// No header, no composer: the pane is the empty state only (`chat-page.tsx:253-258`).
		expect(header).toEqual([]);
		expect(await chatPane(page).getByRole('textbox').count()).toBe(0);
		// The list-level reads still happen, and the unknown conversation is asked for once — its messages are never asked.
		// Concurrent reads: their order is a race, so compare them sorted.
		expect([...served.shapes()].sort()).toEqual(
			[
				'GET /api/chat/people',
				'GET /api/chat/conversations',
				`GET /api/chat/conversations/${ID_UNKNOWN}`,
				'GET /api/chat/conversations/browse',
				'GET /api/chat/states'
			].sort()
		);
		expect(served.countOf('GET', `/api/chat/conversations/${ID_UNKNOWN}/messages`)).toBe(0);
		expect(
			consoleFindings(shield, [armedRefusal(`HTTP Error: GET /chat/conversations/${ID_UNKNOWN} 404`)])
		).toEqual([]);
	});

	test('with the deployment flag off, /chat/<id> is not this page', async ({ page, fixture, mock }) => {
		// The lane exactly as it is served: no `overrideRuntimeEnv`, and a chat stub that is never asked anything.
		const served = await serveChat(page, servedStore(fixture));
		await signInAndVisit(page, fixture, `/chat/${ID_RANDOM}`, { requireShell: false });
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/');
		const env = await runtimeEnvOf(page);
		const chatPaths = (await mock.paths()).filter((entry) => entry.includes('/chat'));
		report('flag off', {
			url: page.url(),
			env,
			chatCallsOfThisFile: served.shapes(),
			chatPathsTheMockSaw: chatPaths
		});
		expect(env.payloadKeys).toBe(52);
		expect(env.payloadHasChatKey).toBe(false);
		expect(served.shapes()).toEqual([]);
		expect(chatPaths).toEqual([]);
	});
});
