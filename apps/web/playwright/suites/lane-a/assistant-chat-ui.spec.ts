import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';

/**
 * What a signed-in person sees and what the browser really sends on **Assistant** (`/assistant`,
 * `app/[locale]/(main)/assistant/page.tsx:1-4` → `core/components/features/assistant/assistant-page.tsx:28`
 * `AssistantPageContent`, wrapped by `withAuthentication` at `:149`), on lane-a (app `http://localhost:3031`,
 * mock `http://127.0.0.1:3992`, control `3994`, `playwright/test-servers.ts:38`).
 *
 * ## SAFETY — the chat never reaches a provider
 *
 * The page posts to the app's own `POST /api/chat`, and `app/api/chat/route.ts:209-240` forwards it to a real AI
 * provider (the user's own key at `:229-231`, or the deployment's Groq / Cloudflare / OpenAI / OpenRouter chain at
 * `:233-239`). This file therefore never lets one chat request reach that route:
 *
 * - `serveChat(page)` is the **first thing every test does**, before its first `page.goto` (the `signInAndVisit` of
 *   `playwright/helpers.ts:439-451` is what navigates, and it is always called after `serveChat`). It routes the app
 *   origin's `GET`/`POST` on `/api/chat` and on every path under it — the wider half is the SDK's reconnect twin
 *   `GET /api/chat/<chatId>/stream` (`ai/src/ui/http-chat-transport.ts:266-269`), which a plain chat-path glob would
 *   leave un-routed.
 * - Every answer is `route.fulfill(...)`. `route.continue()` and `route.fetch()` appear nowhere in this file, and
 *   `page.unroute` is never called on it. The only other verb is `route.abort('aborted')`, reachable only from the
 *   `catch` of a fulfill that could not land — a guard for the Stop case, and an abort is the opposite of forwarding:
 *   nothing is sent anywhere. What proves the Stop request died in the browser is `route.request().failure()`, measured
 *   `net::ERR_ABORTED` (`p4-assistant-1.log` P15).
 * - The only key this file uses is its own invention `FAKE_KEY`; every log line about it is `keyShape(...)` — a
 *   boolean, a length or an equality — never the value. `grep` of the value in the run logs is 0.
 * - The custom-provider case types `http://127.0.0.1:9/`, a port nothing listens on, and the answer still comes from
 *   this file's handler; the run also prints the hosts the browser really called, and `127.0.0.1:9` is not among them.
 *
 * ## Where the numbers came from
 *
 * All of them are printed measurements, from throwaway probes on this lane (`D:\Coding\.tmp\probe-assistant\`):
 * `p1-assistant-3.log` (6 passed, P1–P6: the empty page, the dialog and its provider defaults, the first send's body,
 * the second send's body, what a reload keeps, the custom provider and the hosts the browser really dialed),
 * `p2-assistant-2.log` (P9–P11: New chat / Clear conversation / Recent chats, the composer's empty state, its example
 * chips, the absence of any file control, the server-AI answer and the legacy history key), `p2-assistant-3.log` (P8:
 * the 401 / 429 / 500 rows and the body their retry sends), `p3-assistant-1.log` (P12–P14: the availability window,
 * the three doors to the dialog, the Recent chats menu with nothing stored, the Copy control) and
 * `p4-assistant-1.log` (P15: Stop — the held answer, `net::ERR_ABORTED`, the page after, the next send's body). Then
 * this file's own two acceptance runs (logs named in `D:\Coding\.tmp\lane-a-assistant-status.md`) re-read every value
 * in the assertions below.
 *
 * ## Two brief items this page cannot reach, and why
 *
 * - **An attachment in the composer**: the assistant composer's own controls are the model button, the dictation
 *   button and Send/Stop and nothing else (`assistant-composer.tsx:170-182`; `grep` for a file input or an
 *   "attachment" identifier over `core/components/features/assistant/` returns 0). The run pins the absence instead:
 *   test 1 asserts `input[type="file"]` count 0 (measured `p2-assistant-2.log` P10 `fileInputs: 0`).
 * - **The error row's "Configure" button**: `ErrorRow` swaps its one action for `CONFIGURE_BUTTON` only when the
 *   person is *not* configured (`assistant-conversation.tsx:56-62`; the `RETRY` branch is `:51-55`), yet without a
 *   configuration the composer is disabled and `canSend` is false (`assistant-composer.tsx:136-138`, `:166`), so no
 *   request can fail and no error row can ever mount. The two branches are therefore mutually unreachable: test 7
 *   pins the `RETRY` branch and the `CONFIGURE_BUTTON` count 0 on that row.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's Next dev server (the page, its shell, its dev mode), the lane's mock as the app's backend for
 * the sign-in and the shell reads, and the NextAuth session stub of `playwright/helpers.ts:317-329`.
 * `GET /api/editor-assist` is answered by the **app's own route** (`app/api/editor-assist/route.ts:132-138`, whose
 * body is `{ server: hasServerAiProvider() }`): on this lane it answers `{"server":false}` (measured,
 * `p2-assistant-2.log` P11), which is what makes the page ask the person for their own key
 * (`core/hooks/ai/use-server-ai-availability.ts:17` → `use-assistant-chat.ts:120`).
 *
 * **Served by this file:** `POST /api/chat` itself — every answer, streamed or refused, is written here. The served
 * stream is the AI SDK's own UI-message SSE shape that `createUIMessageStreamResponse` writes
 * (`ai/src/ui-message-stream/create-ui-message-stream-response.ts:31-49` with `UI_MESSAGE_STREAM_HEADERS` from
 * `ai/src/ui-message-stream/ui-message-stream-headers.ts:1-7`): `data: {"type":…}` lines for `start`, `start-step`,
 * `text-start` / `text-delta` / `text-end` (one `id`), `finish-step`, `finish` — the chunk types
 * `ai/src/ui-message-stream/ui-message-chunks.ts:26-214` allows and `ai/src/ui/process-ui-message-stream.ts:491-542`
 * consumes. A `text-delta` without its `text-start` would throw `UIMessageStreamError`
 * (`ai/src/ui/process-ui-message-stream.ts:504-514`), which is why the served stream repeats the same part id. A
 * refusal is plain JSON `{ "error": "…" }` with the status, exactly what `app/api/chat/route.ts:188`, `:222` and
 * `:225` return; the SDK turns a non-`ok` response into an `APICallError` whose `message` is the raw body
 * (`ai/src/ui/create-ui-api-call-error.ts:12-22`), and `readableChatError` (`assistant-helpers.ts:23-33`) pulls
 * `error` back out for the row.
 *
 * **Not in this file's path:** `app/api/chat/route.ts` itself (its auth guard, SSRF guard, rate limit and provider
 * chain are pinned by `app/api/chat/route.test.ts:109-267`), and `app/api/editor-assist` beyond the one availability
 * read the page performs. `suites/mock/routes.spec.ts:43` already pins that `/assistant` renders, and
 * `suites/lane-d/page-gate-lane.spec.ts:122` that the middleware lets it through unsigned.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/features/assistant/assistant-page.tsx`: the skeleton until mounted `:102`; the conversation only
 *   when there are messages `:105-118`; `AssistantWelcome` when empty `:119`; the composer always `:120-135`;
 *   `AssistantExamples` when empty `:136`; `ChatConfigDialog` mounted with the page `:139-144` and `handleSaveConfig`
 *   `:60-66` (save, then close).
 * - `core/components/features/assistant/hooks/use-assistant-chat.ts`: the transport `:24-27`; the per-request config
 *   `:47-57` (`undefined` without an apiKey, `:48-50`); the history scope `{ userId, workspaceId, teamId }` `:109-115`
 *   and its per-scope session id `:43-45`, `:122`; `useChat({ id, messages, transport })` `:133-137`; `submitInput`
 *   requiring trimmed text `:140-147`; `retry` → `regenerate({ body: { config } })` `:149-151`; the write to
 *   `chat-history` `:164-173`; `clearConversation` `:175-178`; `startNewChat` `:180-184`; `selectSession` `:186-194`;
 *   `isStreaming` / `isWaitingForAnswer` / `isBusy` from `chat.status` `:197-199`.
 * - `core/components/features/assistant/components/assistant-composer.tsx`: `canSend = hasText && isConfigured`
 *   `:136-138`; the placeholder switch `:140-142` and `pickPlaceholder` `:187-192`; the `ADD_API_KEY` button while not
 *   configured `:45-57` and the model button (`aria-label` `chatView.CHANGE_MODEL`, label = the saved model or
 *   `DEFAULT_MODEL`) `:36-75`, `:29-34`; Send ⇄ Stop `:77-120`; the textarea's `aria-label`
 *   `chatView.COMPOSER_LABEL` `:170`; the whole `PromptInput` disabled while not configured `:166`.
 * - `core/components/features/assistant/prompt-kit/prompt-input.tsx`: `role="presentation"` wrapper `:110-121`;
 *   Enter submits and Shift+Enter does not `:134-145`, `:185-191`; the textarea carries `disabled` `:204`.
 * - `core/components/features/assistant/components/assistant-empty-state.tsx`: `MissingKeyNotice` (title, description,
 *   `CONFIGURE_BUTTON`) `:11-33`, shown only while not configured `:51`; `AssistantWelcome`'s `EMPTY_TITLE` heading
 *   `:49`; `AssistantExamples` `:61-85` over `assistant-examples.ts:11-31`.
 * - `core/components/features/assistant/components/assistant-conversation.tsx`: `ThinkingRow` while `isWaitingForAnswer`
 *   `:26-34`, `:114`; `ErrorRow` with `readableChatError` and the `RETRY` button (or `CONFIGURE_BUTTON` when not
 *   configured) `:36-76`, `:115-117`; one `AssistantMessage` per message `:101-113`; the `SCROLL_TO_BOTTOM` button
 *   `:119-121`.
 * - `core/components/features/assistant/components/assistant-message.tsx`: the user row (author name + text) `:58-65`;
 *   the answer row (author name, `TypingLoader` until the first token, `MessageContent markdown`, and the Copy button
 *   only once the text exists and is not streaming) `:67-98`; `CopyMessageButton` `:14-56` with its 1500 ms
 *   `COPIED_FEEDBACK_MS` `:12`, `:18-24`.
 * - `core/components/features/assistant/components/assistant-top-bar.tsx`: the History menu trigger whose own text is
 *   the session title or `NEW_CHAT` `:108-120`, `:158-163`, `:177-178`; the menu's `NEW_CHAT` item `:125-128`, its
 *   `CLEAR_CONVERSATION` item only while the page has messages `:129-134`, the `RECENT_CHATS` label / `NO_CONVERSATIONS`
 *   paragraph `:136-142`, one row per stored session with `formatSessionTime` and `aria-current` `:72-93`, `:143-151`;
 *   the icon actions `NEW_CHAT` and `Configuration` `:191-202`.
 * - `core/components/features/assistant/assistant-helpers.ts`: `readableChatError` `:23-33` (empty → the fallback, a
 *   `{ "error": … }` body → its `error`, else the message as it is), `displayNameOf` `:53-64` (the user's first name
 *   wins over the `YOU` label), `formatSessionTime` `:42-51`.
 * - `core/components/features/chat-panel/components/chat-config-dialog.tsx`: `ChatConfig` `:17-22`; `PROVIDERS` and
 *   their default models `:31-36`; `DEFAULT_PROVIDER` `:39` and `defaultModelOf` `:41-43`; the provider switch
 *   `handleProviderChange` `:79-85`; `canSave = trimmedApiKey.length > 0` `:87-89`; `handleSave` trimming and keeping
 *   `baseURL` only for `custom` `:92-104`; the fields `:113-183` (the `role="radiogroup"` provider row `:118-139`,
 *   `type="password"` key `:146-153`, the model input `:161-167`, the `type="url"` base URL only for `custom`
 *   `:170-183`); Cancel / Save `:186-193`. `use-ai-config.ts`: `CHAT_CONFIG_KEY` `:6`, the snapshot + `storage` event
 *   `:31-72`, `storeConfig` `:74-83`, `saveConfig` `:91-93`, `isConfigured = Boolean(config?.apiKey)` `:94`.
 * - `core/components/features/chat-panel/chat-history.ts`: `CHAT_HISTORY_KEY` `:1`, the scoped key
 *   `chatHistoryKey` `:114-120`, `conversationTitle` (the first user message, cut at 52 chars) `:44-53`, the session
 *   shape `:99-106`, the per-scope read that first drops the legacy origin-wide key `:130-140` (its comment `:133`),
 *   the write `:142-149`, `textOfChatMessage` `:63-70` and `toChatUiMessages` `:84-97`.
 * - the SDK, because the body and the stream are its format, not the app's: `ai/src/ui/http-chat-transport.ts:188-213`
 *   (the POST body `{ ...options.body, id, messages, trigger, messageId }` and the `content-type: application/json`
 *   header), `:215-221` (a non-`ok` answer becomes `createUIApiCallError`), `ai/src/ui/chat.ts:369-504` (`sendMessage`
 *   pushes the user message, then the request), `:510-543` (`regenerate` cuts the messages before the last assistant
 *   message and re-sends), `:769-775`+`946-967`+`1141-1168` (`stop()` aborts the in-flight request; an aborted request
 *   lands as status `ready`, not `error`), `ai/src/ui/process-ui-message-stream.ts:491-542` (the text parts) and
 *   `ai/src/ui/create-ui-api-call-error.ts:12-22` (the refusal message is the raw body).
 */

const CHAT_CONFIG_KEY = 'ever-teams-chat-config';
const CHAT_HISTORY_KEY = 'ever-teams-chat-history-v1';

/** `locales/en.json`: `chatConfig` `:3557-3570`, `chatView` `:3571-3617`. Read by key, never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	chatConfig: Record<string, string>;
	chatView: Record<string, string>;
};
const C = EN.chatConfig;
const V = EN.chatView;

/** `APP_NAME` as this lane's runtime renders it (measured `p1-assistant-3.log` P2/P3: `Ask Ever Teams`, `Ever Teams Assistant`). */
const APP_NAME = 'Ever Teams';
const ASSISTANT_NAME = V.ASSISTANT_NAME.replaceAll('{appName}', APP_NAME);
const READY_PLACEHOLDER = V.ASK_PLACEHOLDER.replaceAll('{appName}', APP_NAME);

/** The invented key. Never printed: only `keyShape`. */
const FAKE_KEY = 'fake-key-for-e2e-0000';
/** Nothing listens on this port (`chatConfig.BASE_URL_PLACEHOLDER` is a shape only). */
const DEAD_BASE_URL = 'http://127.0.0.1:9/';

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a assistant] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A key, described without ever being shown. */
const keyShape = (value: unknown) => ({
	present: typeof value === 'string' && value.length > 0,
	length: typeof value === 'string' ? value.length : null,
	isTheFakeKey: value === FAKE_KEY
});

/**
 * The page's own `<main>`. The shell renders a second `<main>` around it, so a bare `page.locator('main')` is a
 * strict-mode violation (measured in `p1-assistant-2.log`, cases P3, P4, P6).
 */
const pageMain = (page: Page) => page.getByTestId('page-scroll-owner').getByRole('main');

const readLocalStorage = (page: Page, key: string) => page.evaluate((name) => window.localStorage.getItem(name), key);

const localStorageKeys = (page: Page) => page.evaluate(() => Object.keys(window.localStorage));

/** Every stored chat-history entry of this signed-in person: the scoped keys `chatHistoryKey` builds. */
const scopedHistory = async (page: Page) => {
	const keys = (await localStorageKeys(page)).filter((key) => key.startsWith(`${CHAT_HISTORY_KEY}:`));
	return page.evaluate(
		(names: string[]) =>
			names.map((name) => {
				const value: unknown = JSON.parse(String(window.localStorage.getItem(name)));
				return Array.isArray(value) ? value.map((session) => (session as { title: string }).title) : [];
			}),
		keys
	);
};

// ── the /api/chat stand-in ────────────────────────────────────────────────────────────────────────────────

/** The app origin's chat route and the SDK's reconnect twin `/api/chat/<chatId>/stream`. */
const CHAT_ROUTE = (url: URL) =>
	url.origin === APP_ORIGIN && (url.pathname === '/api/chat' || url.pathname.startsWith('/api/chat/'));

type ChatCall = {
	method: string;
	path: string;
	body: string | null;
	json: Record<string, unknown> | null;
	contentType: string;
};

type StreamScript = { kind: 'stream'; deltas: string[]; markdown?: boolean };
type RefuseScript = { kind: 'refuse'; status: number; error: string };
type HoldScript = { kind: 'hold' };
type ChatScript = StreamScript | RefuseScript | HoldScript;

type ChatHarness = {
	calls: ChatCall[];
	setScript: (script: ChatScript) => void;
	releaseHold: () => void;
	holdState: () => { released: boolean; failure: string | null; fulfillError: string | null };
	shapes: () => string[];
	/** The last `POST` this file answered (never `calls[i]`: on a page that polls, an action's write may not be first). */
	lastPost: () => ChatCall | undefined;
};

/**
 * The answer in the exact shape the app's own route writes: `createUIMessageStreamResponse` pipes the chunks through
 * `JsonToSseTransformStream` and answers with `UI_MESSAGE_STREAM_HEADERS`
 * (`ai/src/ui-message-stream/create-ui-message-stream-response.ts:31-49`,
 * `ai/src/ui-message-stream/ui-message-stream-headers.ts:1-7`). `start-step` / `finish-step` are what
 * `streamText().toUIMessageStream()` emits around the text, and they are visible in the body of the next request as a
 * `step-start` part (measured `p1-assistant-3.log` P4).
 */
const sseBody = (deltas: string[]) => {
	const partId = 'served-text-1';
	const chunks: Record<string, unknown>[] = [
		{ type: 'start' },
		{ type: 'start-step' },
		{ type: 'text-start', id: partId }
	];
	deltas.forEach((delta) => chunks.push({ type: 'text-delta', id: partId, delta }));
	chunks.push({ type: 'text-end', id: partId }, { type: 'finish-step' }, { type: 'finish', finishReason: 'stop' });
	return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('');
};

const STREAM_HEADERS = {
	'content-type': 'text/event-stream',
	'cache-control': 'no-cache',
	connection: 'keep-alive',
	'x-vercel-ai-ui-message-stream': 'v1',
	'x-accel-buffering': 'no'
};

/**
 * The chat stand-in. **Every test calls this before its first navigation**, and the handler only ever answers:
 * `route.fulfill` for a served answer or refusal; for the one request the page aborted itself (Stop) the fulfill may
 * already be dead, so the handler records `request().failure()` and then `route.abort('aborted')` — never a continue,
 * never a fetch, so nothing can reach `app/api/chat/route.ts`.
 */
async function serveChat(page: Page): Promise<ChatHarness> {
	const calls: ChatCall[] = [];
	let script: ChatScript = { kind: 'stream', deltas: ['Served answer.'] };
	/** What a held request is answered with once released: an empty stream, so a stopped question never gets words. */
	const heldDeltas: string[] = [];
	const hold = { released: false, failure: null as string | null, fulfillError: null as string | null };
	let release: (() => void) | undefined;

	await page.route(CHAT_ROUTE, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const bodyText = request.postData();
		let json: Record<string, unknown> | null = null;
		try {
			json = bodyText === null ? null : (JSON.parse(bodyText) as Record<string, unknown>);
		} catch {
			json = null;
		}
		calls.push({
			method: request.method(),
			path: url.pathname,
			body: bodyText,
			json,
			contentType: String(request.headers()['content-type'] ?? '')
		});

		// `Request.failure()` is synchronous here and returns `null | { errorText }`
		// (`playwright-core/types/types.d.ts:21117-21124`)
		const failureText = () => {
			const failure = request.failure();
			return failure === null ? null : failure.errorText;
		};

		const active = script;
		let answer: { status: number; body: string; headers: Record<string, string> };
		if (active.kind === 'refuse') {
			answer = {
				status: active.status,
				body: JSON.stringify({ error: active.error }),
				headers: { 'content-type': 'application/json' }
			};
		} else if (active.kind === 'hold') {
			await new Promise<void>((done) => {
				release = done;
			});
			hold.released = true;
			hold.failure = failureText();
			answer = { status: 200, body: sseBody(heldDeltas), headers: STREAM_HEADERS };
		} else {
			answer = { status: 200, body: sseBody(active.deltas), headers: STREAM_HEADERS };
		}

		try {
			await route.fulfill(answer);
		} catch (error) {
			hold.fulfillError = error instanceof Error ? error.message : String(error);
			if (active.kind === 'hold') hold.failure = failureText();
			await route.abort('aborted').catch(() => undefined);
		}
	});

	return {
		calls,
		setScript: (next) => {
			script = next;
			hold.released = false;
			hold.failure = null;
			hold.fulfillError = null;
		},
		releaseHold: () => release?.(),
		holdState: () => ({ ...hold }),
		shapes: () => calls.map((call) => `${call.method} ${call.path}`),
		lastPost: () => [...calls].reverse().find((call) => call.method === 'POST')
	};
}

/** Records every request the context made, on any origin: the witness that a typed base URL was never dialed. */
function recordRequests(page: Page) {
	const seen: Array<{ method: string; url: string }> = [];
	page.context().on('request', (request) => {
		seen.push({ method: request.method(), url: request.url() });
	});
	return {
		hosts: () => [...new Set(seen.map((call) => new URL(call.url).host))],
		to: (host: string) => seen.filter((call) => new URL(call.url).host === host)
	};
}

// ── the config, driven through the dialog (never by writing local storage) ────────────────────────────────

/** Opens the dialog the page offers and saves with the fake key. */
async function configureWithFakeKey(page: Page, options: { provider?: string; model?: string; baseURL?: string } = {}) {
	await page.getByRole('button', { name: V.ADD_API_KEY }).click({ timeout: 15_000 });
	await saveInDialog(page, options);
}

/** Saves in whichever dialog is open: the top bar's `Configuration` or the composer's model button open the same one. */
async function saveInDialog(page: Page, options: { provider?: string; model?: string; baseURL?: string } = {}) {
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	if (options.provider) {
		await dialog.getByRole('radio', { name: options.provider, exact: true }).click({ timeout: 15_000 });
	}
	await dialog.getByLabel(C.API_KEY_LABEL).fill(FAKE_KEY);
	if (options.model !== undefined) {
		await dialog.getByLabel(C.MODEL_LABEL).fill(options.model);
	}
	if (options.baseURL !== undefined) {
		await dialog.getByLabel(C.BASE_URL_LABEL).fill(options.baseURL);
	}
	await dialog.getByRole('button', { name: C.SAVE, exact: true }).click({ timeout: 15_000 });
	await expect(dialog).toBeHidden({ timeout: 15_000 });
}

/** The saved configuration as local storage holds it: field names, provider, model — the key only as `keyShape`. */
async function savedConfig(page: Page) {
	const raw = await readLocalStorage(page, CHAT_CONFIG_KEY);
	const parsed = raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
	return {
		stored: parsed !== null,
		fields: parsed ? Object.keys(parsed).sort() : null,
		provider: parsed?.provider ?? null,
		model: parsed?.model ?? null,
		baseURL: parsed?.baseURL ?? null,
		apiKey: keyShape(parsed?.apiKey)
	};
}

// ── console ───────────────────────────────────────────────────────────────────────────────────────────────

/** React's dev-mode store warning, not this page's (the filter `suites/lane-a/chat-conversation-ui.spec.ts:1074-1083` uses). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The browser's own line for an answer this file armed with a 4xx/5xx status. */
const armedStatusLine = (status: number) => `Failed to load resource: the server responded with a status of ${status}`;

const consoleFindings = (shield: Shield, armed: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((text) => line.includes(text)));

/** Every chat request this file answered, read from its own harness. */
const chatCallCount = (chat: ChatHarness) => chat.calls.filter((call) => call.method === 'POST').length;

/** The body of the chat `POST` this file last answered, described (the key only as `keyShape`). */
const bodyShape = (call: ChatCall | undefined) => {
	const body = call?.json ?? {};
	const messages = Array.isArray(body.messages) ? (body.messages as Record<string, unknown>[]) : [];
	const config = (body.config ?? null) as Record<string, unknown> | null;
	return {
		keys: Object.keys(body).sort(),
		trigger: body.trigger ?? null,
		messageId: body.messageId ?? null,
		chatIdIsAChatSession: typeof body.id === 'string' && body.id.startsWith('chat-'),
		contentType: call?.contentType ?? null,
		messageRoles: messages.map((message) => message.role),
		messageParts: messages.map((message) =>
			Array.isArray(message.parts) ? (message.parts as Record<string, unknown>[]).map((part) => part.type) : null
		),
		messageTexts: messages.map((message) =>
			Array.isArray(message.parts)
				? (message.parts as Record<string, unknown>[])
						.filter((part) => part.type === 'text')
						.map((part) => part.text)
				: null
		),
		plainContentSent: messages.map((message) => 'content' in message),
		configKeys: config ? Object.keys(config).sort() : null,
		configProvider: config?.provider ?? null,
		configModel: config?.model ?? null,
		configBaseURL: config?.baseURL ?? null,
		configApiKey: keyShape(config?.apiKey)
	};
};

/** The provider buttons' own labels: `chat-config-dialog.tsx:31-36` (they are not i18n keys). */
const PROVIDER_LABELS = ['OpenAI', 'Groq', 'Together AI', 'Custom (OpenAI-compatible)'];
/** `chat-config-dialog.tsx:32-35` `defaultModel`, and `:42` the fallback an empty model box gets. */
const DEFAULT_MODEL_OPENAI = 'gpt-4o-mini';
const DEFAULT_MODEL_GROQ = 'llama-3.3-70b-versatile';
const DEFAULT_MODEL_TOGETHER = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

const userNameOf = (fixture: { names: Record<string, string> }) => fixture.names.user.split(' ')[0];

test.describe('assistant chat UI (/assistant, lane-a)', () => {
	test('1. signed in with no configuration: the page exactly as printed, and nothing sent', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);

		await expect(main.getByRole('heading', { level: 1 })).toHaveText(V.EMPTY_TITLE);
		await expect(main.getByRole('heading', { level: 2 })).toHaveText(V.EXAMPLES_LABEL);
		await expect(main.getByText(V.NO_KEY_TITLE, { exact: true })).toHaveCount(1);
		await expect(main.getByText(V.NO_KEY_DESCRIPTION, { exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.CONFIGURE_BUTTON, exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.ADD_API_KEY, exact: true })).toHaveCount(1);
		await expect(composer).toHaveAttribute('placeholder', V.INPUT_PLACEHOLDER_NO_KEY);
		await expect(composer).toBeDisabled();
		await expect(main.getByRole('button', { name: V.SEND, exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.SEND, exact: true })).toBeDisabled();
		await expect(main.getByRole('button', { name: V.STOP, exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.DEFAULT_MODEL, exact: true })).toHaveCount(0);
		for (const label of [
			'EXAMPLE_TASK_LABEL',
			'EXAMPLE_BREAKDOWN_LABEL',
			'EXAMPLE_UPDATE_LABEL',
			'EXAMPLE_PRIORITIES_LABEL'
		]) {
			await expect(main.getByRole('button', { name: V[label], exact: true })).toHaveCount(1);
		}
		// the composer offers dictation only, never a file control (`assistant-composer.tsx:178-181`)
		await expect(page.locator('input[type="file"]')).toHaveCount(0);
		await expect(main.getByText(V.EMPTY_CONFIGURED, { exact: true })).toHaveCount(0);

		// a quiet window that proves something did NOT happen: no chat request ever started
		await page.waitForTimeout(1_000);
		report('1 no-config page', {
			chatCalls: chat.shapes(),
			chatPosts: chatCallCount(chat),
			composerPlaceholder: await composer.getAttribute('placeholder'),
			composerDisabled: await composer.isDisabled(),
			fileInputs: await page.locator('input[type="file"]').count(),
			mainText: flat(await main.innerText())
		});
		expect(chatCallCount(chat)).toBe(0);
		expect(await savedConfig(page)).toEqual({
			stored: false,
			fields: null,
			provider: null,
			model: null,
			baseURL: null,
			apiKey: keyShape(undefined)
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('2. the configuration dialog: its fields, each provider model, and the empty-key gate', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');

		await page.getByRole('button', { name: V.ADD_API_KEY, exact: true }).click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(C.DIALOG_TITLE);
		await expect(dialog).toContainText(C.DIALOG_DESCRIPTION);
		await expect(dialog.getByRole('radiogroup')).toHaveAccessibleName(C.PROVIDER_LABEL);
		await expect(dialog.getByRole('radio')).toHaveCount(4);
		await expect
			.poll(() =>
				dialog
					.getByRole('radio')
					.evaluateAll((nodes) =>
						nodes.map((node) => `${String(node.textContent).trim()}::${node.getAttribute('aria-checked')}`)
					)
			)
			.toEqual([
				`${PROVIDER_LABELS[0]}::true`,
				`${PROVIDER_LABELS[1]}::false`,
				`${PROVIDER_LABELS[2]}::false`,
				`${PROVIDER_LABELS[3]}::false`
			]);

		const apiKey = dialog.getByLabel(C.API_KEY_LABEL);
		const model = dialog.getByLabel(C.MODEL_LABEL);
		await expect(apiKey).toHaveAttribute('type', 'password');
		await expect(apiKey).toHaveAttribute('placeholder', C.API_KEY_PLACEHOLDER);
		await expect(apiKey).toHaveAttribute('autocomplete', 'off');
		await expect(dialog).toContainText(C.API_KEY_HINT);
		await expect(model).toHaveValue(DEFAULT_MODEL_OPENAI);
		await expect(model).toHaveAttribute('placeholder', C.MODEL_PLACEHOLDER);
		await expect(dialog.getByLabel(C.BASE_URL_LABEL)).toHaveCount(0);

		report('2 empty-key gate', {
			saveDisabledWithNothing: await dialog.getByRole('button', { name: C.SAVE, exact: true }).isDisabled(),
			emptyKeyAlerts: await dialog.getByRole('alert').count(),
			dialogTextWithNothing: flat(await dialog.innerText())
		});
		await expect(dialog.getByRole('button', { name: C.SAVE, exact: true })).toBeDisabled();
		await apiKey.fill('   ');
		await expect(dialog.getByRole('button', { name: C.SAVE, exact: true })).toBeDisabled();
		await expect(dialog.getByRole('alert')).toHaveCount(0);
		await expect(dialog).toContainText(C.API_KEY_HINT);

		// each provider's default model, and the base URL field that only `custom` gets
		const modelsByProvider: Record<string, string> = {};
		for (const label of PROVIDER_LABELS) {
			await dialog.getByRole('radio', { name: label, exact: true }).click({ timeout: 15_000 });
			await expect(dialog.getByRole('radio', { name: label, exact: true })).toHaveAttribute(
				'aria-checked',
				'true'
			);
			modelsByProvider[label] = await model.inputValue();
			report('2 provider switch', {
				label,
				modelValue: modelsByProvider[label],
				baseUrlFields: await dialog.getByLabel(C.BASE_URL_LABEL).count()
			});
		}
		expect(modelsByProvider[PROVIDER_LABELS[1]]).toBe(DEFAULT_MODEL_GROQ);
		expect(modelsByProvider[PROVIDER_LABELS[2]]).toBe(DEFAULT_MODEL_TOGETHER);
		// measured, untagged (a gap, not a contradicted intent): the table gives a custom provider an empty default
		// model (`chat-config-dialog.tsx:35` `defaultModel: ''`), and `handleProviderChange` rewrites the box only
		// when that default is non-empty (`:82 if (providerInfo?.defaultModel)`) — so switching to Custom leaves the
		// previous provider's model in it, as the line above printed. `handleSave` only reaches
		// `defaultModelOf(provider)` (`:97`, `:41-43`) when the box is emptied by hand.
		expect(modelsByProvider[PROVIDER_LABELS[3]]).toBe(DEFAULT_MODEL_TOGETHER);
		await expect(dialog.getByLabel(C.BASE_URL_LABEL)).toHaveCount(1);
		await expect(dialog.getByLabel(C.BASE_URL_LABEL)).toHaveAttribute('type', 'url');
		await expect(dialog.getByLabel(C.BASE_URL_LABEL)).toHaveAttribute('placeholder', C.BASE_URL_PLACEHOLDER);

		// Cancel stores nothing
		await apiKey.fill(FAKE_KEY);
		await expect(dialog.getByRole('button', { name: C.SAVE, exact: true })).toBeEnabled();
		await dialog.getByRole('button', { name: C.CANCEL, exact: true }).click({ timeout: 15_000 });
		await expect(dialog).toBeHidden({ timeout: 15_000 });
		expect(await savedConfig(page)).toEqual({
			stored: false,
			fields: null,
			provider: null,
			model: null,
			baseURL: null,
			apiKey: keyShape(undefined)
		});
		report('2 after cancel', { chatCalls: chat.shapes() });
		expect(chatCallCount(chat)).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('3. saving with the fake key: what local storage keeps and what the page then shows', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const config = await savedConfig(page);
		report('3 saved config', {
			...config,
			localStorageKeys: (await localStorageKeys(page)).filter((key) => key.startsWith('ever-teams'))
		});
		expect(config).toEqual({
			stored: true,
			fields: ['apiKey', 'model', 'provider'],
			provider: 'openai',
			model: DEFAULT_MODEL_OPENAI,
			baseURL: null,
			apiKey: { present: true, length: FAKE_KEY.length, isTheFakeKey: true }
		});

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(main.getByText(V.NO_KEY_TITLE, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.ADD_API_KEY, exact: true })).toHaveCount(0);
		await expect(composer).toHaveAttribute('placeholder', READY_PLACEHOLDER);
		await expect(composer).toBeEnabled();
		await expect(main.getByRole('button', { name: V.CHANGE_MODEL, exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.CHANGE_MODEL, exact: true })).toHaveText(DEFAULT_MODEL_OPENAI);

		// the model button opens the very same dialog, prefilled with what was saved (`p3-assistant-1.log` P13): the
		// key box is a `type="password"` field holding the saved key, described here by its length only
		await main.getByRole('button', { name: V.CHANGE_MODEL, exact: true }).click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(C.DIALOG_TITLE);
		await expect(dialog.getByLabel(C.MODEL_LABEL)).toHaveValue(DEFAULT_MODEL_OPENAI);
		report('3 the prefilled dialog', {
			apiKeyValueLength: (await dialog.getByLabel(C.API_KEY_LABEL).inputValue()).length,
			saveDisabled: await dialog.getByRole('button', { name: C.SAVE, exact: true }).isDisabled()
		});
		await expect(dialog.getByRole('button', { name: C.SAVE, exact: true })).toBeEnabled();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);

		// a quiet window that proves something did NOT happen: saving a key, and opening and closing the dialog again,
		// never start a chat request and never log anything
		await page.waitForTimeout(1_000);
		report('3 page after save', {
			chatCalls: chat.shapes(),
			ariaLabels: await page
				.locator('button[aria-label]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
			mainText: flat(await main.innerText())
		});
		expect(chatCallCount(chat)).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('4. a served streamed answer: the two rows and the POST body', async ({ page, fixture, shield }) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const question = 'Assistant probe question one';
		const answer = 'Served answer.';
		chat.setScript({ kind: 'stream', deltas: [answer] });

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);
		await composer.fill(question);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });

		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(1);
		const shape = bodyShape(chat.lastPost());
		report('4 first POST', shape);
		expect(shape).toEqual({
			keys: ['config', 'id', 'messages', 'trigger'],
			trigger: 'submit-message',
			messageId: null,
			chatIdIsAChatSession: true,
			contentType: 'application/json',
			messageRoles: ['user'],
			messageParts: [['text']],
			messageTexts: [[question]],
			plainContentSent: [false],
			configKeys: ['apiKey', 'model', 'provider'],
			configProvider: 'openai',
			configModel: DEFAULT_MODEL_OPENAI,
			configBaseURL: null,
			configApiKey: { present: true, length: FAKE_KEY.length, isTheFakeKey: true }
		});

		await expect(main.getByText(question, { exact: true })).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText(userNameOf(fixture), { exact: true })).toBeVisible();
		await expect(main.getByText(V.YOU, { exact: true })).toHaveCount(0);
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(1);
		await expect(main.getByText(answer, { exact: true })).toHaveCount(1);
		await expect(main.getByText(V.COPIED, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.COPY, exact: true })).toHaveCount(1);

		// the Copy button of the finished answer row copies exactly that text and shows `COPIED` for
		// `COPIED_FEEDBACK_MS` (`assistant-message.tsx:12`, `:26-33`, `:79` `canCopy = hasContent && !isStreaming`)
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
		await main.getByRole('button', { name: V.COPY, exact: true }).click({ timeout: 15_000 });
		await expect(main.getByRole('button', { name: V.COPIED, exact: true })).toHaveCount(1);
		const clipboard = await page.evaluate(async () => window.navigator.clipboard.readText());
		report('4 the Copy button', { clipboardEqualsAnswer: clipboard === answer, clipboardLength: clipboard.length });
		expect(clipboard).toBe(answer);
		await expect(main.getByText(V.THINKING, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.RETRY, exact: true })).toHaveCount(0);
		await expect(composer).toHaveValue('');
		await expect(main.getByRole('button', { name: V.STOP, exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.SEND, exact: true })).toHaveCount(1);

		report('4 after the answer', {
			mainText: flat(await main.innerText()),
			chatCalls: chat.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('5. a second message carries the whole conversation', async ({ page, fixture, shield }) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		const model = 'probe-model-x';
		await configureWithFakeKey(page, { model });

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);
		const first = 'First question';
		const second = 'Second question';

		chat.setScript({ kind: 'stream', deltas: ['One.'] });
		await composer.fill(first);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect(main.getByText('One.', { exact: true })).toHaveCount(1, { timeout: 30_000 });

		chat.setScript({ kind: 'stream', deltas: ['Two ', 'and ', 'three.'] });
		await composer.fill(second);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(2);

		const shape = bodyShape(chat.lastPost());
		report('5 second POST', shape);
		expect(shape).toEqual({
			keys: ['config', 'id', 'messages', 'trigger'],
			// the SDK's own trigger and message id (`ai/src/ui/http-chat-transport.ts:191-197`)
			trigger: 'submit-message',
			messageId: null,
			chatIdIsAChatSession: true,
			contentType: 'application/json',
			messageRoles: ['user', 'assistant', 'user'],
			// the served `start-step` chunk survives as a `step-start` part on the assistant message
			messageParts: [['text'], ['step-start', 'text'], ['text']],
			messageTexts: [[first], ['One.'], [second]],
			plainContentSent: [false, false, false],
			configKeys: ['apiKey', 'model', 'provider'],
			configProvider: 'openai',
			configModel: model,
			configBaseURL: null,
			configApiKey: { present: true, length: FAKE_KEY.length, isTheFakeKey: true }
		});
		expect(chat.calls[0]?.json?.id).toBe(chat.calls[1]?.json?.id);

		await expect(main.getByText('Two and three.', { exact: true })).toHaveCount(1, { timeout: 30_000 });
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(2);
		report('5 after two answers', { mainText: flat(await main.innerText()), chatCalls: chat.shapes() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('7. a refusal this file served: the error row, its button, and what Try again sends', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);
		const question = 'Question that will be refused';
		const servedError = 'Served refusal: the key was rejected.';
		chat.setScript({ kind: 'refuse', status: 401, error: servedError });

		await composer.fill(question);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });

		const alert = main.getByRole('alert');
		await expect(alert).toBeVisible({ timeout: 30_000 });
		// the served `{ "error": … }` body is the row's message: the SDK makes the raw body the error message
		// (`ai/src/ui/create-ui-api-call-error.ts:12-22`) and `readableChatError` takes `error` out of it
		// (`assistant-helpers.ts:23-33`), so `chatView.ERROR_FALLBACK` never shows here. The message is the row's only
		// `<p>`, and the row's whole text is that message followed by its one action button (measured
		// `p2-assistant-3.log` P8: `paragraphText` is the served error exactly, `alertText` adds `Try again`).
		await expect(alert.locator('p')).toHaveText(servedError);
		await expect(alert).toHaveText(`${servedError}${V.RETRY}`);
		await expect(alert.getByRole('button', { name: V.RETRY, exact: true })).toHaveCount(1);
		await expect(alert.getByRole('button', { name: V.CONFIGURE_BUTTON, exact: true })).toHaveCount(0);
		await expect(main.getByText(V.ERROR_FALLBACK, { exact: true })).toHaveCount(0);
		await expect(main.getByText(V.THINKING, { exact: true })).toHaveCount(0);
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.COPY, exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.SEND, exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.STOP, exact: true })).toHaveCount(0);
		// the typed text is gone even though nothing was answered (`use-assistant-chat.ts:145`)
		await expect(composer).toHaveValue('');

		report('7 the 401 row', {
			alertText: flat(await alert.innerText()),
			paragraphText: flat(await alert.locator('p').innerText()),
			servedError,
			alertButtons: await alert.getByRole('button').allInnerTexts(),
			mainText: flat(await main.innerText()),
			chatCalls: chat.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield, [armedStatusLine(401)])).toEqual([]);

		// Try again: `retry()` → `regenerate({ body: { config } })` (`use-assistant-chat.ts:149-151`), and the SDK
		// drops everything from the last assistant message on (`ai/src/ui/chat.ts:516-536`) — a refusal pushed none,
		// so the same single user message goes out again, with the regenerate trigger.
		const answer = 'Answer after the retry.';
		chat.setScript({ kind: 'stream', deltas: [answer] });
		await alert.getByRole('button', { name: V.RETRY, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(2);

		const shape = bodyShape(chat.lastPost());
		report('7 the retry POST', shape);
		expect(shape).toEqual({
			keys: ['config', 'id', 'messages', 'trigger'],
			trigger: 'regenerate-message',
			messageId: null,
			chatIdIsAChatSession: true,
			contentType: 'application/json',
			messageRoles: ['user'],
			messageParts: [['text']],
			messageTexts: [[question]],
			plainContentSent: [false],
			configKeys: ['apiKey', 'model', 'provider'],
			configProvider: 'openai',
			configModel: DEFAULT_MODEL_OPENAI,
			configBaseURL: null,
			configApiKey: { present: true, length: FAKE_KEY.length, isTheFakeKey: true }
		});

		await expect(main.getByText(answer, { exact: true })).toHaveCount(1, { timeout: 30_000 });
		await expect(alert).toHaveCount(0);
		await expect(main.getByText(question, { exact: true })).toHaveCount(1);
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(1);
		report('7 after the retry', { mainText: flat(await main.innerText()), chatCalls: chat.shapes() });
		expect(consoleFindings(shield, [armedStatusLine(401)])).toEqual([]);
	});

	test('6. Stop: the held answer, the aborted request, and what the page shows after', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const main = pageMain(page);
		const composer = page.getByLabel(V.COMPOSER_LABEL);
		const question = 'Question I stop before any answer';

		// nothing is answered until this file releases it, so the request stays in flight: `status === 'submitted'`
		// (`use-assistant-chat.ts:198`) is what puts the Stop control and the Thinking row on screen
		// (`assistant-composer.tsx:90-104`, `assistant-conversation.tsx:114`).
		chat.setScript({ kind: 'hold' });
		await composer.fill(question);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });

		const stopButton = main.getByRole('button', { name: V.STOP, exact: true });
		await expect(stopButton).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText(V.THINKING, { exact: true })).toHaveCount(1);
		await expect(main.getByText(V.SEND, { exact: true })).toHaveCount(0);
		await expect(main.getByText(question, { exact: true })).toHaveCount(1);
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('alert')).toHaveCount(0);
		report('6 while the answer is held', { chatCalls: chat.shapes(), mainText: flat(await main.innerText()) });

		await stopButton.click({ timeout: 15_000 });
		chat.releaseHold();

		// the request died in the browser: `stop()` aborts the fetch's signal (`ai/src/ui/chat.ts:769-775`), which the
		// harness sees as `route.request().failure()` = `net::ERR_ABORTED` (measured `p4-assistant-1.log` P15; the
		// fulfill this file tried afterwards did not even have to fail — the request was already dead). An aborted
		// request lands as status `ready`, not `error` (`:1141-1168`), so no error row is expected.
		await expect.poll(() => chat.holdState().failure, { timeout: 30_000 }).toBe('net::ERR_ABORTED');
		await expect.poll(() => main.getByRole('button', { name: V.SEND, exact: true }).count()).toBe(1);

		const state = chat.holdState();
		report('6 after Stop', {
			holdState: state,
			thinking: await main.getByText(V.THINKING, { exact: true }).count(),
			stopButtons: await main.getByRole('button', { name: V.STOP, exact: true }).count(),
			sendButtons: await main.getByRole('button', { name: V.SEND, exact: true }).count(),
			assistantRows: await main.getByText(ASSISTANT_NAME, { exact: true }).count(),
			userRows: await main.getByText(question, { exact: true }).count(),
			alerts: await main.getByRole('alert').count(),
			composerValue: await composer.inputValue(),
			chatCalls: chat.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(state.released).toBe(true);
		expect(state.failure).toBe('net::ERR_ABORTED');
		// `status` went back to `ready`, so the composer is a Send again — disabled, because its box is empty
		await expect(main.getByRole('button', { name: V.STOP, exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.SEND, exact: true })).toBeDisabled();
		await expect(main.getByText(V.THINKING, { exact: true })).toHaveCount(0);
		// the stopped question is a user row with no answer under it, and nothing offers a Copy
		await expect(main.getByText(ASSISTANT_NAME, { exact: true })).toHaveCount(0);
		await expect(main.getByText(question, { exact: true })).toHaveCount(1);
		await expect(main.getByRole('button', { name: V.COPY, exact: true })).toHaveCount(0);
		await expect(composer).toHaveValue('');
		await expect(composer).toHaveAttribute('placeholder', READY_PLACEHOLDER);

		// the chat is usable again, and the stopped question is still part of the conversation it carries
		const answer = 'Answer after the stop.';
		chat.setScript({ kind: 'stream', deltas: [answer] });
		await composer.fill('Question after the stop');
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(2);
		const shape = bodyShape(chat.lastPost());
		report('6 the send after Stop', shape);
		expect(shape.messageRoles).toEqual(['user', 'user']);
		expect(shape.messageTexts).toEqual([[question], ['Question after the stop']]);
		expect(shape.trigger).toBe('submit-message');
		await expect(main.getByText(answer, { exact: true })).toHaveCount(1, { timeout: 30_000 });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('8. New chat: the conversation is cleared, and the next send carries only the new question', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const main = pageMain(page);

		// with nothing stored the menu holds only `New chat` plus its "no conversations" line, and no
		// `Clear conversation` item — that one appears only while the page has messages (`assistant-top-bar.tsx:129-134`)
		const emptyTrigger = page.getByRole('button').filter({ hasText: V.NEW_CHAT });
		await expect(emptyTrigger).toHaveCount(1);
		await emptyTrigger.click({ timeout: 15_000 });
		await expect(page.getByRole('menuitem')).toHaveCount(1);
		await expect(page.getByText(V.NO_CONVERSATIONS, { exact: true })).toHaveCount(1);
		await expect(page.getByText(V.RECENT_CHATS, { exact: true })).toHaveCount(1);
		await expect(page.getByRole('menuitem', { name: V.CLEAR_CONVERSATION, exact: true })).toHaveCount(0);
		report('8 the empty Recent chats menu', {
			menuitems: await page.getByRole('menuitem').allInnerTexts(),
			menuText: flat(await page.getByRole('menu').innerText())
		});
		await page.keyboard.press('Escape');
		await expect(page.getByRole('menuitem')).toHaveCount(0, { timeout: 15_000 });

		const firstQuestion = 'Conversation before New chat';
		chat.setScript({ kind: 'stream', deltas: ['Answer of the first chat.'] });
		await page.getByLabel(V.COMPOSER_LABEL).fill(firstQuestion);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect(main.getByText('Answer of the first chat.', { exact: true })).toHaveCount(1, { timeout: 30_000 });

		// the top bar's icon action (`assistant-top-bar.tsx:192-194`); measured in `p2-assistant-2.log` P9 that this
		// is the control the name `New chat` resolves to once a conversation title has replaced the trigger's text
		await page.getByRole('button', { name: V.NEW_CHAT, exact: true }).first().click({ timeout: 15_000 });
		await expect(main.getByText(V.EMPTY_TITLE, { exact: true })).toBeVisible({ timeout: 15_000 });
		await expect(main.getByText(firstQuestion, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.EXAMPLE_TASK_LABEL, exact: true })).toHaveCount(1);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toHaveValue('');
		report('8 after New chat', { mainText: flat(await main.innerText()), chatCalls: chat.shapes() });

		const secondQuestion = 'Question of the new chat';
		chat.setScript({ kind: 'stream', deltas: ['Answer of the new chat.'] });
		await page.getByLabel(V.COMPOSER_LABEL).fill(secondQuestion);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(2);
		const shape = bodyShape(chat.lastPost());
		report('8 the send after New chat', {
			...shape,
			chatIdsDiffer: chat.calls[0]?.json?.id !== chat.calls[1]?.json?.id
		});
		expect(shape.messageRoles).toEqual(['user']);
		expect(shape.messageTexts).toEqual([[secondQuestion]]);
		expect(chat.calls[0]?.json?.id).not.toBe(chat.calls[1]?.json?.id);

		// the chat that New chat left behind is still stored, and the Recent chats menu opens it again
		const history = await scopedHistory(page);
		report('8 stored history', { history });
		const trigger = page.getByRole('button').filter({ hasText: 'Question of the new chat' });
		await expect(trigger).toHaveCount(1);
		await trigger.click({ timeout: 15_000 });
		await expect(page.getByRole('menuitem')).not.toHaveCount(0, { timeout: 15_000 });
		report('8 the Recent chats menu', {
			menuitems: await page.getByRole('menuitem').allInnerTexts(),
			menuText: flat(await page.getByRole('menu').innerText())
		});
		await page.getByRole('menuitem').filter({ hasText: firstQuestion }).click({ timeout: 15_000 });
		await expect(main.getByText(firstQuestion, { exact: true })).toHaveCount(1, { timeout: 30_000 });
		await expect(main.getByText('Answer of the first chat.', { exact: true })).toHaveCount(1);
		expect(chatCallCount(chat)).toBe(2);
		report('8 after opening the older chat', { mainText: flat(await main.innerText()), chatCalls: chat.shapes() });
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('9. a reload: the configuration is kept, the conversation is only in Recent chats', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page);

		const main = pageMain(page);
		const question = 'Question before the reload';
		await page.getByLabel(V.COMPOSER_LABEL).fill(question);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect(main.getByText('Served answer.', { exact: true })).toHaveCount(1, { timeout: 30_000 });
		await expect.poll(() => scopedHistory(page).then((groups) => groups.flat().length)).toBeGreaterThan(0);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText(V.EMPTY_TITLE, { exact: true })).toHaveCount(1);
		await expect(main.getByText(question, { exact: true })).toHaveCount(0);
		await expect(main.getByText('Served answer.', { exact: true })).toHaveCount(0);
		await expect(main.getByText(V.NO_KEY_TITLE, { exact: true })).toHaveCount(0);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toHaveAttribute('placeholder', READY_PLACEHOLDER);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toBeEnabled();
		await expect(main.getByRole('button', { name: V.CHANGE_MODEL, exact: true })).toHaveCount(1);

		const config = await savedConfig(page);
		const history = await scopedHistory(page);
		report('9 after the reload', {
			config,
			history,
			chatCalls: chat.shapes(),
			mainText: flat(await main.innerText())
		});
		expect(config.provider).toBe('openai');
		expect(config.apiKey.isTheFakeKey).toBe(true);
		expect(history.flat()).toHaveLength(1);

		// the conversation survived as a stored session: the menu lists it by its first question
		const trigger = page.getByRole('button').filter({ hasText: V.NEW_CHAT });
		await expect(trigger).toHaveCount(1);
		await trigger.click({ timeout: 15_000 });
		const row = page.getByRole('menuitem').filter({ hasText: question });
		await expect(row).toHaveCount(1);
		report('9 the reload menu', { menuitems: await page.getByRole('menuitem').allInnerTexts() });
		await row.click({ timeout: 15_000 });
		await expect(main.getByText(question, { exact: true })).toHaveCount(1, { timeout: 30_000 });
		await expect(main.getByText('Served answer.', { exact: true })).toHaveCount(1);
		expect(chatCallCount(chat)).toBe(1);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('10. history written under the old origin-wide key is dropped, not shown', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		await signInAndVisit(page, fixture, '/assistant');

		// `chat-history.ts:130-140` — and its comment at `:133` — the per-scope read first removes the former
		// origin-wide key, so a conversation written by it can never be listed for this account.
		await page.evaluate((legacyKey: string) => {
			window.localStorage.setItem(
				legacyKey,
				JSON.stringify([
					{
						id: 'legacy-session',
						title: 'Legacy conversation',
						updatedAt: Date.now(),
						messages: [{ id: 'legacy-1', role: 'user', parts: [{ type: 'text', text: 'Legacy message' }] }]
					}
				])
			);
		}, CHAT_HISTORY_KEY);
		await page.reload({ waitUntil: 'domcontentloaded' });

		const main = pageMain(page);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText('Legacy message', { exact: false })).toHaveCount(0);
		await expect.poll(() => readLocalStorage(page, CHAT_HISTORY_KEY)).toBeNull();
		const keys = await localStorageKeys(page);
		report('10 the legacy key', {
			legacyKeyStillPresent: keys.includes(CHAT_HISTORY_KEY),
			scopedKeys: keys.filter((key) => key.startsWith(`${CHAT_HISTORY_KEY}:`)),
			mainText: flat(await main.innerText()),
			chatCalls: chat.shapes()
		});
		expect(keys).not.toContain(CHAT_HISTORY_KEY);
		await expect(main.getByRole('button', { name: 'Legacy conversation', exact: true })).toHaveCount(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('11. the availability window: the skeleton shows no add-a-key notice', async ({ page, fixture, shield }) => {
		const chat = await serveChat(page);
		let release: (() => void) | undefined;
		const availability: { calls: string[] } = { calls: [] };
		// The availability read is the app's own `GET /api/editor-assist` (`app/api/editor-assist/route.ts:132-138`,
		// body `{ server: hasServerAiProvider() }`); this file answers it with the same body the lane really answers
		// (measured `p2-assistant-2.log` P11) and holds it, so the wait the skeleton is for can be seen.
		await page.route(
			(url) => url.origin === APP_ORIGIN && url.pathname === '/api/editor-assist',
			async (route) => {
				availability.calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
				await new Promise<void>((done) => {
					release = done;
				});
				await route
					.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ server: false }) })
					.catch(() => undefined);
			}
		);
		await signInAndVisit(page, fixture, '/assistant');

		const main = pageMain(page);
		await expect(main.getByText(V.EMPTY_TITLE, { exact: true })).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText(V.NO_KEY_TITLE, { exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.ADD_API_KEY, exact: true })).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.CONFIGURE_BUTTON, exact: true })).toHaveCount(0);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toHaveCount(0);
		await expect(main.getByRole('button', { name: V.EXAMPLE_TASK_LABEL, exact: true })).toHaveCount(1);
		report('11 while the availability read is open', {
			availabilityCalls: availability.calls,
			mainText: flat(await main.innerText()),
			chatCalls: chat.shapes()
		});

		release?.();
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toBeVisible({ timeout: 30_000 });
		await expect(main.getByText(V.NO_KEY_TITLE, { exact: true })).toHaveCount(1);
		await expect(page.getByLabel(V.COMPOSER_LABEL)).toHaveAttribute('placeholder', V.INPUT_PLACEHOLDER_NO_KEY);
		report('11 once the availability answer arrived', {
			availabilityCalls: availability.calls,
			mainText: flat(await main.innerText())
		});
		expect(availability.calls.length).toBeGreaterThan(0);
		expect(chatCallCount(chat)).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('12. the custom provider: the Base URL field, what is stored and sent, and that nothing is dialed', async ({
		page,
		fixture,
		shield
	}) => {
		const chat = await serveChat(page);
		const everyCall = recordRequests(page);
		await signInAndVisit(page, fixture, '/assistant');
		await configureWithFakeKey(page, { provider: PROVIDER_LABELS[3], baseURL: DEAD_BASE_URL });

		const config = await savedConfig(page);
		report('12 stored custom config', config);
		expect(config).toEqual({
			stored: true,
			fields: ['apiKey', 'baseURL', 'model', 'provider'],
			provider: 'custom',
			// measured: the box was never emptied, so the OpenAI default that opened the dialog was saved
			model: DEFAULT_MODEL_OPENAI,
			baseURL: DEAD_BASE_URL,
			apiKey: { present: true, length: FAKE_KEY.length, isTheFakeKey: true }
		});

		const main = pageMain(page);
		const question = 'Question on the custom provider';
		await page.getByLabel(V.COMPOSER_LABEL).fill(question);
		await main.getByRole('button', { name: V.SEND, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => chat.calls.length, { timeout: 30_000 }).toBe(1);

		const shape = bodyShape(chat.lastPost());
		report('12 the custom POST', { ...shape, hosts: everyCall.hosts() });
		expect(shape.configBaseURL).toBe(DEAD_BASE_URL);
		expect(shape.configProvider).toBe('custom');
		expect(shape.messageRoles).toEqual(['user']);
		expect(shape.messageTexts).toEqual([[question]]);
		await expect(main.getByText('Served answer.', { exact: true })).toHaveCount(1, { timeout: 30_000 });

		// the typed URL is in the body only: the browser dialed the app and the mock, never that host
		expect(everyCall.to('127.0.0.1:9')).toEqual([]);
		expect(everyCall.hosts().sort()).toEqual(['127.0.0.1:3992', 'localhost:3031']);
		expect(consoleFindings(shield)).toEqual([]);
	});
});
