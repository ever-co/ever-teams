import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BrowserContext, Locator, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInWithFixture, stubNextAuthSession } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { describeCookies, sessionCookies } from './lane-auth-helpers';

/**
 * lane-b §board — what the **whiteboard page in the browser** does: `/board` →
 * `app/[locale]/(main)/board/page.tsx` → `core/components/pages/board/page-component.tsx:19-22`
 * (`withAuthentication(BoardPage, { displayName: 'BoardIntegrationPage', skeleton: BoardPageSkeleton })`) →
 * `LazyBoard` (`core/components/optimized-components/common.tsx:92-95`, `ssr:false`) →
 * `core/components/integration/boards/exalidraw.tsx:14-60`, an in-app Excalidraw canvas (Excalidraw 0.18.1, not an
 * iframe). Its data layer is `core/hooks/board/use-board.ts` (local storage, `exportToBackend`, `window.open`).
 *
 * Nothing in this file is served: the lane's own mock answers the shell's reads, and every number below was printed
 * by a run of this file or of the throwaway probes named in "Where the numbers came from". The board backend and
 * Firebase are not served because they are never reached — see "Safety".
 *
 * ## Safety: the hosts this page may call
 *
 * `Live Collaboration` can upload the drawing: `exportToBackend` (`core/lib/helpers/export-to-backend.ts:45-48`)
 * `POST`s the compressed+encrypted scene to `NEXT_PUBLIC_BOARD_BACKEND_POST_URL`, and `:57-60` uploads image files to
 * Firebase Storage (`core/lib/helpers/firebase.ts`) when the scene has any. This lane configures neither
 * (`playwright/test-servers.ts:178,179` write `NEXT_PUBLIC_BOARD_BACKEND_POST_URL: ''` and
 * `NEXT_PUBLIC_BOARD_FIREBASE_CONFIG: ''`), and the probes below saw the page ask **only** `http://localhost:3032`
 * (its own documents, `/_next/**`, `/api/auth/session`, `/api/health`, `POST /api/log`, `GET /_next/image`, and its
 * own fonts `GET /__nextjs_font/geist-latin.woff2` + `GET /_next/static/media/Assistant-{Regular,Medium}.woff2`) and
 * `http://127.0.0.1:3996` (the shell's Gauzy reads) — `probe-board-run-2.log` P1, `probe-board-run-3.log` Q4.
 * Excalidraw's fonts came from the app origin, so no CDN was asked; **no run ever aborted anything.**
 *
 * Every test installs `guardHosts()` before its first navigation: a `context.route` that aborts any host other than
 * the app's and the mock's (recording it), plus `page.on('request')` and `context.on('request')` so a popup's calls
 * are recorded too. Each test then asserts the allow-list held and that nothing was aborted, and names any aborted
 * request in the failure message. The lane shield (`playwright/fixtures.ts:82-128`) does the same job from the other
 * side and fails the test if the browser left the machine.
 *
 * ## Where the numbers came from
 *
 * Throwaway probes `D:/Coding/.tmp/probe-board/probe.spec.ts` (`probe-board-run-2.log`), `probe2.spec.ts`
 * (`probe-board-run-3.log`), `probe3.spec.ts` (`probe-board-run-4.log`), `probe4.spec.ts` (`probe-board-run-5.log`)
 * and `probe5.spec.ts` (`probe-board-run-6.log`), run on this lane on 2026-11-27 with the lane's own servers (no
 * `webServer` in their configs). Every value this file pins is a `MEASURE` line of one of those logs or of a run of
 * this file (`s3-lane-b-board-*.log`); the probes' own failures were selector problems (a canvas that no Playwright
 * click may land on, a menu item that does not exist), and what they printed stands.
 *
 * ## What the code says, line by line (each line read before it is named)
 *
 * - `exalidraw.tsx:35-53` — `<Excalidraw … onChange={debounce(saveChanges, 500)}
 *   theme={$theme === 'dark' ? THEME.DARK : THEME.LIGHT} renderTopRightUI={() => (<button onClick={onClickLiveCollaboration}>…</button>)}>`;
 *   the button holds only `LiveShareIcon` (`assets/svg.tsx:1576-1585`) and is given no `aria-label`, no `title` and no
 *   text, so its accessible name is `''` (measured, `probe-board-run-3.log` Q4). `:19` picks `$theme` from
 *   next-themes (`app/[locale]/layout-component.tsx:140-146`, `attribute="class" defaultTheme="system" enableSystem`);
 *   `:26-30` writes `localStorage[LOCAL_STORAGE_THEME]` (`core/constants/config/constants.tsx:1117` =
 *   `excalidraw-theme`) whenever `$theme` is truthy. `:40` is why the drawing lands in local storage 500 ms after a
 *   change, and `:55-57` renders the `<EverTeamsLogo … dash />` that makes the page ask `GET /_next/image`.
 * - `use-board.ts:21-33` reads `board-elements` and `board-files` once the Excalidraw API exists (`JSON.parse(… || '[]')`,
 *   then `addFiles`, `updateScene({elements})`, `scrollToContent()`); `:36-42` `saveChanges` writes both keys and
 *   returns early `if (!loaded.current)`; `:44-57` wraps `exportToBackend` in `queryClient.fetchQuery` under
 *   `queryKeys.board.liveCollaboration` = `['live-collaboration']` (`core/query/keys/index.ts:1237`); `:59-71` opens
 *   a window only `if (response.url)`, after `uri.searchParams.set('live','true')` and
 *   `withEverTeamsOrigin(uri, window.location.origin)` (`core/lib/board/board-app.ts:109-115`), through
 *   `window.open(uri.toString(), '_blank', 'noreferrer')`. `response.errorMessage` is read by nothing in this page.
 * - `export-to-backend.ts:17-18` — with no backend URL or no Board domain it answers
 *   `{ url: null, errorMessage: 'could Not Create Shareable Link' }` **without a request**; `:45-48` is the `POST`
 *   (`body: new Uint8Array(payload)`, no `Content-Type` in the code); `:50-55` puts `#json=<id>,<key>` on the Board
 *   address ("We need to store the key (and less importantly the id) as hash instead of queryParam in order to never
 *   send it to the server", `:52-53`); `:57-60` is the Firebase upload; `:63-67` a `RequestTooLargeError` answer.
 * - The unit-test intent this file does not repeat: `core/hooks/board/use-board.test.tsx:48-64` pins the share flow in
 *   isolation ("opens the shared scene in the board app, live, naming the origin of this deployment", `:48`) —
 *   `live=true`, `origin=window.location.origin`, `#json=scene-1,key-1`, `['_blank','noreferrer']` — and `:66-72` pins
 *   that a `{url:null}` answer opens nothing. This file can only reach the second half on this lane (see below).
 *
 * ## Why "Live Collaboration with a backend" is not reachable here (measured, not assumed)
 *
 * `BOARD_BACKEND_POST_URL` is a `getNextPublicEnv` object (`core/constants/config/constants.tsx:514-516`) whose getter
 * reads the module-private `NEXT_PUBLIC_ENVS.value` (`env-config.ts:154-167`, the read is `:159`), and the docstring of
 * that function says what it is for:
 *
 * > `Useful for getting the latest value of the variable at runtime rather than at build time` — `env-config.ts:148`
 *
 * yet the only test-side switch for a deployment flag, `overrideRuntimeEnv` (`playwright/helpers.ts:485-507`), installs
 * the `__EVER_TEAMS_RUNTIME_ENV__` global, which `readRuntimeEnv` reads and `getNextPublicEnv` does not; and the
 * layout's `RuntimeEnvProvider` refills that same module state from the **server's** payload on every render
 * (`core/components/providers/runtime-env-provider.tsx:16-17`, `// Normally a no-op (the <html> attribute already
 * installed the same values before any module ran).` then `installRuntimeEnv(env);`) — including
 * `NEXT_PUBLIC_BOARD_BACKEND_POST_URL: ''`, which the server publishes as an empty string because the lane starts the
 * app with it empty and "Keys that are set to an empty string are kept (empty)" (`core/services/server/runtime-env.ts:15-17`,
 * the copy loop is `:23-28`). Measured consequence
 * (`probe-board-run-3.log` Q4 "override"): with the flag pointed at a `page.route` stub on the mock origin, the click
 * produced exactly the same calls as without it (`POST /api/log`, `GET /api/time-goals`, `POST /api/log`), the stub was
 * **never** hit and no popup opened. So the `POST`, the popup URL and the `#json=` half are pinned only by the unit
 * test, and are written here as not reachable through the UI of a lane that may not restart its server. The
 * trusted-origin side of the Board address is pinned by `suites/api/board-origin.spec.ts` and
 * `suites/lane-b/board-preflight.spec.ts`.
 *
 * ## Findings
 *
 * - **The Excalidraw API this page draws on never reaches the hook, so a drawing is painted but never stored — and a
 *   stored drawing is never painted. [MEASURED, NOT INTENDED]** `exalidraw.tsx:36-39` hands the API over with
 *
 *   ```
 *   // @ts-ignore
 *   excalidrawRef={(api: ExcalidrawImperativeAPI | null) =>
 *       setExcalidrawAPI(api as ExcalidrawImperativeAPI | null)
 *   }
 *   ```
 *
 *   The callback says what is wanted: hand the API to the hook's setter (`setExcalidrawAPI(…)`, `exalidraw.tsx:38`).
 *   The installed type names the only prop that delivers it — `excalidrawAPI?: (api: ExcalidrawImperativeAPI) => void;`
 *   (`node_modules/@excalidraw/excalidraw/dist/types/excalidraw/types.d.ts:408`, @excalidraw/excalidraw 0.18.1) — and
 *   `// @ts-ignore` (`exalidraw.tsx:36`) silences the compiler's report that `excalidrawRef` is not one.
 *   `excalidrawRef` is in no file of that package's `dist/` (a `grep -rn excalidrawRef` over `dist/` printed
 *   nothing), so `setExcalidrawAPI` is never called. Read, not measured here (no backend on this lane): the same gap
 *   makes Live Collaboration export `excalidrawAPI?.getSceneElements() || []`, an empty scene (`use-board.ts:50-52`).
 *   Measured consequence: after a real drag the rectangle is on the
 *   canvas (`dark 1117` / `1060` pixels of `#1e1e1e`) while `board-elements` is `"(absent)"` after the 500 ms debounce
 *   and after 20 s (`probe-board-run-6.log` V1, `probe-board-run-5.log` U1 "elements after wait (absent after 20 s)"),
 *   a reload shows `dark 0 / distinct 1`, and a hand-written `board-elements` stays in storage byte-identical with
 *   nothing painted (`probe-board-run-5.log` U2 "stored equals seed true", `probe-board-run-4.log` R2b "painted? never
 *   painted"). `use-board.ts:17` (`if (!excalidrawAPI || loaded.current)`) and `:37` (`if (!loaded.current) return;`)
 *   are both gated on that same hand-over, which is why one broken prop silences both halves.
 * - **The Live Collaboration button has no accessible name** (`exalidraw.tsx:42-50` gives the button nothing but an
 *   icon: `aria-label` null, `title` null, an `<svg>` only, at `1142,24 20x36` in the canvas' top-right corner,
 *   `probe-board-run-3.log` Q4). Excalidraw's own toolbar buttons do name themselves (`title="Rectangle — R or 2"` and
 *   friends, `probe-board-run-4.log` R1 "titles"). No comment, type, test or copy states an intent for this button's
 *   name, so it is written as measured, not as a defect against a stated intent.
 * - **`exportToBackend`'s error message is never shown.** `use-board.ts:63` acts on `response.url` only, and
 *   `errorMessage` appears nowhere else in the board page or hook (grep of `core/hooks/board`,
 *   `core/components/integration/boards`, `core/components/pages/board`: `errorMessage` outside `use-board.ts` is
 *   `use-board.test.tsx:51,67`). Measured: after the click the page shows no such text and logs nothing.
 * - **Excalidraw's own menu, as this page mounts it, shows no theme item.** `app-main-menu.tsx:6-15` mounts eight
 *   default items, among them `MainMenu.DefaultItems.ToggleTheme` (`:13`) and `MainMenu.DefaultItems.ChangeCanvasBackground`
 *   (`:14`); the open menu offered exactly `Open`, `Save to...`, `Export image...`, `Help`, `Reset the canvas`
 *   (`probe-board-run-5.log` U1 "menu items"), and `[role="tablist"]` on the page was empty until the shell menu was
 *   opened (`probe-board-run-4.log` R3 "theme controls []`). The theme control this page really has is the shell
 *   account menu's `Theme` row (`core/components/users/user-nav-menu.tsx:336-337` → `core/components/common/theme-switch.tsx`,
 *   whose items are `ariaLabel: t('common.THEME_LIGHT')` and `ariaLabel: t('common.THEME_DARK')`, `:55-56`), and that
 *   is what feeds `exalidraw.tsx:19` in the first place; this file switches the theme there.
 * - Not covered here, on purpose: the Board API routes and their origin gate (`suites/api/board-origin.spec.ts`,
 *   `suites/lane-b/board-preflight.spec.ts`), the sign-in return to the Board (`test/auth/proxy-board-return.test.ts`,
 *   `core/lib/auth/board-return.ts`), the Board link on the dashboards (`suites/lane-a/apps-urls-dashboard-ui.spec.ts`,
 *   `suites/lane-b/team-dashboard-ui.spec.ts`), and the board-app itself (a separate deployment).
 */

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { THEME: string; THEME_LIGHT: string; THEME_DARK: string };
	pages: { systemPages: { UNAUTHORIZED_TITLE: string } };
};

/** `export-to-backend.ts:18` and `:70`, the two answers this lane can produce. */
const NO_SHAREABLE_LINK_TEXT = 'could Not Create Shareable Link';

const report = (label: string, value: unknown) =>
	console.log(`[lane-b board] MEASURE ${label} ${JSON.stringify(value)}`);

/** The two hosts a board page on this lane may call. Nothing else is allowed, and nothing else was seen. */
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, new URL(MOCK_ORIGIN).origin]);

/** `excalidraw.tsx:42-50` puts the Live Collaboration button in Excalidraw's top-right UI slot. */
const liveButton = (page: Page): Locator => page.locator('.excalidraw .layer-ui__wrapper__top-right button');

type Traffic = {
	/** Every request the context or a popup made, in the order the browser made them. */
	calls: () => Array<{ method: string; origin: string; path: string }>;
	/** The calls made after `mark()` was taken — the honest way to read "what the click did". */
	since: (mark: number) => Array<{ method: string; origin: string; path: string }>;
	origins: () => string[];
	/** Requests this guard refused, with the host that made them. */
	aborted: () => string[];
	mark: () => number;
};

/**
 * The safety guard, installed before the first navigation of every test. It records every request (including a
 * popup's, through `context.on('request')`) and aborts any host outside the two allowed ones. It answers
 * `route.fallback()` for the allowed hosts so the lane shield's own interception
 * (`playwright/fixtures.ts:110-112`) still runs.
 */
async function guardHosts(context: BrowserContext): Promise<Traffic> {
	const calls: Array<{ method: string; origin: string; path: string }> = [];
	const aborted: string[] = [];

	const record = (request: { method: () => string; url: () => string }) => {
		const url = new URL(request.url());
		calls.push({ method: request.method(), origin: url.origin, path: url.pathname });
	};
	context.on('request', record);
	context.on('page', (popup) => popup.on('request', record));

	await context.route('**/*', (route, request) => {
		const url = new URL(request.url());
		if (ALLOWED_ORIGINS.has(url.origin)) return route.fallback();
		aborted.push(`${request.method()} ${url.origin}${url.pathname}`);
		return route.abort('blockedbyclient');
	});

	return {
		calls: () => [...calls],
		since: (mark) => calls.slice(mark),
		origins: () => [...new Set(calls.map((call) => call.origin))].sort(),
		aborted: () => [...aborted],
		mark: () => calls.length
	};
}

/**
 * Asserts the safety rule for one test: the browser called the app and the mock and nothing else, and this file's
 * guard aborted nothing. Any outside host and any aborted request is named in the failure.
 */
function expectAllowedHosts(traffic: Traffic, why: string) {
	const seen = traffic.origins();
	const outside = seen.filter((origin) => !ALLOWED_ORIGINS.has(origin));
	// Both sides sorted: `traffic.origins()` sorts, and a `Set` iterates in insertion order.
	expect(
		seen,
		`${why}: the browser called ${JSON.stringify(seen)} — only ${[...ALLOWED_ORIGINS].sort().join(' and ')} may be called`
	).toEqual([...ALLOWED_ORIGINS].sort().filter((origin) => seen.includes(origin)));
	expect(
		outside,
		`${why}: the page reached ${JSON.stringify(outside)}; a board page must never name a board backend or a Firebase host`
	).toEqual([]);
	expect(
		traffic.aborted(),
		`${why}: this file's guard had to abort ${JSON.stringify(traffic.aborted())} — nothing outside the two allowed hosts should have been asked for`
	).toEqual([]);
}

/** Console noise this lane causes on purpose, named exactly as measured (no blanket filters). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** Measured on every board page load, twice, on a page that did nothing wrong (`probe-board-run-1.log` P1). */
const UNLOAD_POLICY_NOISE = 'Permissions policy violation: unload is not allowed in this document.';

const consoleFindings = (shield: Shield) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(UNLOAD_POLICY_NOISE));

/** The public configuration this page was served with, read the way `env-config.ts` reads it. Never printed whole. */
const publishedEnv = (page: Page) =>
	page.evaluate((attribute: string) => {
		const raw = document.documentElement.getAttribute(attribute) ?? '';
		try {
			return raw ? (JSON.parse(raw) as Record<string, string>) : {};
		} catch {
			return {};
		}
	}, 'data-ever-teams-runtime-env');

/** One key of the drawing's local storage, exactly as `use-board.ts:21-41` reads and writes it. */
const storedJson = (page: Page, key: string) => page.evaluate((name: string) => window.localStorage.getItem(name), key);

/**
 * What the Excalidraw surface actually painted, read off its static canvas: the colour histogram, and the box of the
 * near-black pixels a `#1e1e1e` stroke produces (`30,30,30` is that colour). An empty light-theme canvas paints one
 * colour, so `dark === 0`, `distinct === 1` and `darkBox` is null (`probe-board-run-6.log` V1).
 */
const canvasPaint = (page: Page) =>
	page.evaluate(() => {
		const canvas = document.querySelector('.excalidraw__canvas.static') as HTMLCanvasElement | null;
		const context2d = canvas?.getContext('2d');
		if (!canvas || !context2d) return { dark: 0, distinct: 0, width: 0, height: 0, pageBox: null, darkBox: null };
		const rect = canvas.getBoundingClientRect();
		const data = context2d.getImageData(0, 0, canvas.width, canvas.height).data;
		const colours = new Map<string, number>();
		let dark = 0;
		let minX = -1;
		let minY = -1;
		let maxX = -1;
		let maxY = -1;
		for (let y = 0; y < canvas.height; y += 1) {
			for (let x = 0; x < canvas.width; x += 1) {
				const i = (y * canvas.width + x) * 4;
				const key = `${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`;
				colours.set(key, (colours.get(key) ?? 0) + 1);
				if (
					data[i + 3] > 128 &&
					data[i] > 15 &&
					data[i] < 70 &&
					data[i + 1] > 15 &&
					data[i + 1] < 70 &&
					data[i + 2] > 15 &&
					data[i + 2] < 70
				) {
					dark += 1;
					if (minX < 0 || x < minX) minX = x;
					if (maxX < 0 || x > maxX) maxX = x;
					if (minY < 0 || y < minY) minY = y;
					if (maxY < 0 || y > maxY) maxY = y;
				}
			}
		}
		return {
			dark,
			distinct: colours.size,
			width: canvas.width,
			height: canvas.height,
			pageBox: { x: Math.round(rect.x), y: Math.round(rect.y) },
			darkBox: dark > 0 ? { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } : null
		};
	});

/** Excalidraw marks the active tool by the `:checked` state of the radio inside its `title`-named toolbar label. */
const activeToolTitle = (page: Page) =>
	page.evaluate(() => document.querySelector('.ToolIcon:has(input:checked)')?.getAttribute('title') ?? null);

/** Every toolbar tool this page mounts, in the order Excalidraw puts them (`probe-board-run-4.log` R1). */
const TOOL_TITLES = [
	'Keep selected tool active after drawing — Q',
	'Hand (panning tool) — H',
	'Selection — V or 1',
	'Rectangle — R or 2',
	'Diamond — D or 3',
	'Ellipse — O or 4',
	'Arrow — A or 5',
	'Line — L or 6',
	'Draw — P or 7',
	'Text — T or 8',
	'Insert image — 9',
	'Eraser — E or 0'
];

test.describe('lane-b · the whiteboard page in the browser', () => {
	test('the page as it opens: a blank Excalidraw, its own keys absent, and only this lane called', async ({
		app,
		context,
		mock,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const page = await app('/board');

		// The canvas is the page: `exalidraw.tsx:34` wraps Excalidraw in a full-height div, no iframe (`probe-board-run-1.log` P1).
		const container = page.locator('.excalidraw');
		await expect(container, 'the board page did not mount an Excalidraw surface').toBeVisible();
		await expect(container, 'the Excalidraw surface lost the container class Excalidraw gives it').toHaveClass(
			/excalidraw-container/
		);
		await expect(
			page.locator('.excalidraw__canvas.static'),
			'the board has no static canvas, so nothing was drawn to'
		).toHaveCount(1);
		await expect(
			page.locator('.excalidraw__canvas.interactive'),
			'the board has no interactive canvas, so it could not take input'
		).toHaveCount(1);

		// Nothing on the surface yet: the static canvas holds one colour (white) and the interactive one is fully
		// transparent — `probe-board-run-5.log` U1 "canvas at open": static `distinct 1 / top [["255,255,255,255",
		// 743040]]`, interactive `distinct 1 / top [["0,0,0,0", 743040]]`.
		const paint = await canvasPaint(page);
		report('paint at open', paint);
		expect(paint.dark, 'the board opened with something already painted').toBe(0);
		expect(paint.distinct, 'the empty board painted more than its one background colour').toBe(1);

		// `use-board.ts:21-23` reads both keys; at open neither exists (`probe-board-run-4.log` R1 "storage at open").
		expect(
			await storedJson(page, 'board-elements'),
			'a board that was never drawn on still holds elements'
		).toBeNull();
		expect(await storedJson(page, 'board-files'), 'a board that was never drawn on still holds files').toBeNull();
		// `exalidraw.tsx:26-30` writes the theme key from next-themes; the next-themes key itself stays unwritten
		// until someone picks a theme (`defaultTheme="system"`, `app/[locale]/layout-component.tsx:140-146`).
		expect(
			await storedJson(page, 'excalidraw-theme'),
			'exalidraw.tsx:28 did not write the theme key it writes on mount'
		).toBe('light');
		expect(
			await storedJson(page, 'theme'),
			'the page wrote next-themes own key before anyone picked a theme'
		).toBeNull();

		// What this lane was configured with — the two blanks are why the Live Collaboration cases below can only
		// fail the share (`playwright/test-servers.ts:173,178,179`).
		const env = await publishedEnv(page);
		report('published board configuration', {
			appDomain: env.NEXT_PUBLIC_BOARD_APP_DOMAIN,
			backendPostUrlSet: env.NEXT_PUBLIC_BOARD_BACKEND_POST_URL !== undefined,
			backendPostUrlEmpty: env.NEXT_PUBLIC_BOARD_BACKEND_POST_URL === '',
			firebaseSet: env.NEXT_PUBLIC_BOARD_FIREBASE_CONFIG !== undefined,
			firebaseEmpty: env.NEXT_PUBLIC_BOARD_FIREBASE_CONFIG === ''
		});
		expect(
			env.NEXT_PUBLIC_BOARD_APP_DOMAIN,
			'this lane is supposed to mount the Board at the app own origin (E2E_BOARD_APP_DOMAIN)'
		).toBe(APP_ORIGIN);
		expect(
			env.NEXT_PUBLIC_BOARD_BACKEND_POST_URL,
			'a board backend was configured after all, so the "no backend" cases below would prove nothing'
		).toBe('');
		expect(
			env.NEXT_PUBLIC_BOARD_FIREBASE_CONFIG,
			'a Firebase config was configured after all, so no test here may assume no upload is possible'
		).toBe('');

		// The shell really was served by the lane mock (`playwright/suites/lane-b/README` wiring: the browser calls the
		// mock origin itself), and the page asked nothing else.
		expect(
			(await mock.calls('/api/user/me')).length,
			'the signed-in board page never asked the test backend for its user, so the shell below is not the real one'
		).toBeGreaterThan(0);
		expectAllowedHosts(traffic, 'the board page as it opened');
		expect(
			traffic.calls().some((call) => call.origin === new URL(MOCK_ORIGIN).origin),
			`the page called no ${MOCK_ORIGIN} route at all — it is not talking to this lane's backend`
		).toBe(true);
		expect(consoleFindings(shield), 'the board page reported a console error of its own').toEqual([]);
	});

	test('the toolbar Excalidraw shows, and where the Live Collaboration button actually is', async ({
		app,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const page = await app('/board');

		const tools = page.locator('.excalidraw .App-toolbar .ToolIcon[title]');
		await expect(tools, 'Excalidraw offered a different number of tools than the measured 12').toHaveCount(
			TOOL_TITLES.length
		);
		const titles = await tools.evaluateAll((nodes) => nodes.map((node) => String(node.getAttribute('title'))));
		report('toolbar titles', titles);
		expect(
			titles,
			'the toolbar tools are named by their `title` (their text is only the shortcut digit), and this list is the measured one'
		).toEqual(TOOL_TITLES);
		expect(await activeToolTitle(page), 'the board opened on a tool other than Selection').toBe(
			'Selection — V or 1'
		);
		// The shortcut is in the title but does not reach Excalidraw from this page: pressing `r` left the tool on
		// Selection (`probe-board-run-4.log` R1 "tool after keyboard r"). The toolbar button is the way that works.
		await page.locator('.excalidraw .App-toolbar .ToolIcon[title*="Rectangle"]').click({ timeout: 15_000 });
		expect(await activeToolTitle(page), 'clicking the rectangle tool button did not make it the active tool').toBe(
			'Rectangle — R or 2'
		);

		// `exalidraw.tsx:42-50` renders the Live Collaboration button into Excalidraw's top-right UI slot.
		const live = liveButton(page);
		await expect(
			live,
			'exalidraw.tsx renderTopRightUI did not put exactly one button in the top-right slot'
		).toHaveCount(1);
		await expect(live.first(), 'the Live Collaboration button is not reachable on the page').toBeVisible();
		const geometry = await live.first().evaluate((node) => {
			const box = node.getBoundingClientRect();
			const canvas = document.querySelector('.excalidraw')?.getBoundingClientRect();
			return {
				accessibleName: node.getAttribute('aria-label') ?? node.textContent ?? '',
				title: node.getAttribute('title'),
				hasIcon: Boolean(node.querySelector('svg')),
				box: {
					x: Math.round(box.x),
					y: Math.round(box.y),
					width: Math.round(box.width),
					height: Math.round(box.height)
				},
				canvasRight: canvas ? Math.round(canvas.right) : null,
				canvasTop: canvas ? Math.round(canvas.top) : null
			};
		});
		report('live collaboration button', geometry);
		expect(geometry.hasIcon, 'the button holds no icon, so it is not the Live Collaboration one').toBe(true);
		expect(
			geometry.accessibleName,
			'exalidraw.tsx:43-50 gives the button nothing but an icon, so its accessible name is the measured empty string'
		).toBe('');
		expect(geometry.title, 'the button carried a title after all').toBeNull();
		expect(
			geometry.box.x > (geometry.canvasRight ?? 0) - 200 && geometry.box.y < (geometry.canvasTop ?? 0) + 60,
			`the button is at ${JSON.stringify(geometry.box)} inside a canvas whose right edge is ${geometry.canvasRight} and top edge is ${geometry.canvasTop} — not its top-right corner`
		).toBe(true);

		expectAllowedHosts(traffic, 'the toolbar and the Live Collaboration button');
		expect(consoleFindings(shield), 'the toolbar walk produced a console error').toEqual([]);
	});

	test('a rectangle drawn with the mouse is painted, and never written to board-elements [MEASURED, NOT INTENDED]', async ({
		app,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const page = await app('/board');

		// The tool: the toolbar button, because the shortcut in its title does not reach Excalidraw from this page
		// (`probe-board-run-4.log` R1: pressing `r` left the active tool on `Selection — V or 1`).
		await page.locator('.excalidraw .App-toolbar .ToolIcon[title*="Rectangle"]').click({ timeout: 15_000 });
		expect(await activeToolTitle(page), 'the rectangle button did not become the active tool').toBe(
			'Rectangle — R or 2'
		);

		const canvasBox = await page.locator('.excalidraw__canvas.static').boundingBox();
		if (!canvasBox) throw new Error('the static canvas has no box to draw on');
		// A 180x120 drag, at the same spot the probes used. Real pointer input through CDP, never a synthetic event.
		const start = { x: Math.round(canvasBox.x + 350), y: Math.round(canvasBox.y + 300) };
		const end = { x: start.x + 180, y: start.y + 120 };
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(end.x, end.y, { steps: 12 });
		await page.mouse.up();

		await expect.poll(async () => (await canvasPaint(page)).dark, { timeout: 20_000 }).toBeGreaterThan(0);
		const painted = await canvasPaint(page);
		report('drag canvas-space rect', { left: 350, top: 300, right: 530, bottom: 420, width: 180, height: 120 });
		report('painted rectangle', painted);

		// The painted box against the drag that made it. Measured in `probe-board-run-6.log` V1, two rounds: the dark
		// box was `348..530 x 298..420` (183x123) and `349..530 x 298..420` (182x123) for the canvas-space drag
		// `350..530 x 300..420` (180x120) — antialiasing bleeds at most 2 px outside the geometric edge, so ±4 px per
		// edge and ±8 px on the size is the tolerance this file pins.
		const box = painted.darkBox;
		if (!box) throw new Error('no painted box to measure');
		expect(
			box.minX,
			`the rectangle started at x=${box.minX}, not where the drag pressed down`
		).toBeGreaterThanOrEqual(346);
		expect(box.minX, `the rectangle started at x=${box.minX}, 4 px away from the drag`).toBeLessThanOrEqual(354);
		expect(
			box.minY,
			`the rectangle started at y=${box.minY}, not where the drag pressed down`
		).toBeGreaterThanOrEqual(296);
		expect(box.minY, `the rectangle started at y=${box.minY}, 4 px away from the drag`).toBeLessThanOrEqual(304);
		expect(
			box.maxX,
			`the rectangle ended at x=${box.maxX}, 4 px away from where the drag was released`
		).toBeGreaterThanOrEqual(526);
		expect(box.maxX, `the rectangle ended at x=${box.maxX}`).toBeLessThanOrEqual(534);
		expect(
			box.maxY,
			`the rectangle ended at y=${box.maxY}, 4 px away from where the drag was released`
		).toBeGreaterThanOrEqual(416);
		expect(box.maxY, `the rectangle ended at y=${box.maxY}`).toBeLessThanOrEqual(424);
		// The size follows from those edges: measured 183x123 and 182x123 in the probes and 182x124 in this file's own
		// first run, for a 180x120 drag.
		expect(
			box.width,
			`the painted rectangle is ${box.width} px wide for a 180 px drag (measured 183, 182, 182)`
		).toBeGreaterThanOrEqual(180);
		expect(
			box.width,
			`the painted rectangle is ${box.width} px wide for a 180 px drag (measured 183, 182, 182)`
		).toBeLessThanOrEqual(190);
		expect(
			box.height,
			`the painted rectangle is ${box.height} px tall for a 120 px drag (measured 123, 123, 124)`
		).toBeGreaterThanOrEqual(118);
		expect(
			box.height,
			`the painted rectangle is ${box.height} px tall for a 120 px drag (measured 123, 123, 124)`
		).toBeLessThanOrEqual(130);
		// The stroke colour is `#1e1e1e` = `30,30,30`; measured 1 117 and 1 060 dark pixels in the two probe rounds.
		expect(
			painted.dark,
			`the stroke painted ${painted.dark} pixels of #1e1e1e; the two probe rounds measured 1117 and 1060`
		).toBeGreaterThan(800);
		expect(
			painted.dark,
			`the stroke painted ${painted.dark} pixels of #1e1e1e; the two probe rounds measured 1117 and 1060`
		).toBeLessThan(1600);

		// `exalidraw.tsx:40` hands `saveChanges` to a 500 ms debounce. This 3 s window proves the write never happens
		// (it is a "did not happen" window, six times the debounce, not a wait for something to settle):
		// `board-elements` is still absent after the drawing, in every probe round (`probe-board-run-5.log` U1,
		// `probe-board-run-6.log` V1) — `use-board.ts:37` returns early while `loaded.current` is false, and
		// `loaded.current` only turns in the effect that needs `excalidrawAPI`, which `exalidraw.tsx:36-39` never hands
		// over (see the header finding on the ignored `excalidrawRef` prop).
		await page.waitForTimeout(3_000);
		expect(
			await storedJson(page, 'board-elements'),
			'use-board.ts:39 wrote board-elements after all, so the persistence finding below would be false'
		).toBeNull();
		expect(await storedJson(page, 'board-files'), 'use-board.ts:41 wrote board-files after all').toBeNull();

		// So a reload brings nothing back: the surface is its single background colour again.
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect
			.poll(async () => await page.locator('.excalidraw__canvas.static').count(), { timeout: 90_000 })
			.toBeGreaterThan(0);
		const afterReload = await canvasPaint(page);
		report('paint after reload', afterReload);
		expect(
			afterReload.dark,
			'the drawing survived a reload after all, so nothing was ever saved to write about'
		).toBe(0);
		expect(afterReload.distinct, 'the reloaded board painted more than its background colour').toBe(1);

		expectAllowedHosts(traffic, 'the drawn rectangle');
		expect(consoleFindings(shield), 'drawing a rectangle produced a console error').toEqual([]);
	});

	test('a drawing already in board-elements: the page opens without it [MEASURED, NOT INTENDED]', async ({
		context,
		fixture,
		page,
		shield
	}) => {
		const traffic = await guardHosts(context);

		// The shape the probes wrote (`probe-board-run-5.log` U2). It is this file's own literal, not a shape the app
		// ever stored: `use-board.ts:39` never ran, so no measured element exists to seed with.
		const seed = [
			{
				id: 'board-ui-seed-rect',
				type: 'rectangle',
				x: 120,
				y: 140,
				width: 200,
				height: 100,
				angle: 0,
				strokeColor: '#1e1e1e',
				backgroundColor: 'transparent',
				fillStyle: 'solid',
				strokeWidth: 2,
				strokeOpacity: 100,
				opacity: 100,
				groupIds: [],
				frameId: null,
				roundness: { type: 3 },
				seed: 7,
				version: 1,
				versionNonce: 1,
				isDeleted: false,
				boundElements: null,
				updated: 1,
				link: null,
				locked: false
			}
		];
		const seedText = JSON.stringify(seed);

		await page.addInitScript((value: string) => {
			window.localStorage.setItem('board-elements', value);
		}, seedText);
		// The session and the NextAuth stub the `app` fixture would have put on the context — by hand here, because
		// `app()` hard-loads the route and clears local storage on the way (`playwright/helpers.ts:423-432`), which is
		// exactly the seed this test needs to keep.
		await stubNextAuthSession(page);
		await signInWithFixture(context, fixture);
		await page.goto(`${APP_ORIGIN}/board`, { waitUntil: 'domcontentloaded' });
		await expect
			.poll(async () => await page.locator('.excalidraw__canvas.static').count(), { timeout: 90_000 })
			.toBeGreaterThan(0);

		// The seed is there before anything else touches it.
		expect(
			await storedJson(page, 'board-elements'),
			'the seed never reached local storage, so nothing below means anything'
		).toBe(seedText);

		// A "did not happen" window: `use-board.ts:25-33` pushes the stored elements into the scene in a microtask once
		// the Excalidraw API exists, so 4 s is far past it. Nothing is painted — measured in `probe-board-run-5.log`
		// U2 (canvas still one colour, 5 s apart) and `probe-board-run-4.log` R2b.
		await page.waitForTimeout(4_000);
		const painted = await canvasPaint(page);
		report('seed opened on a blank canvas', painted);
		expect(
			painted.dark,
			'a seeded board-elements was painted after all, so the load half of use-board.ts works and this test is wrong'
		).toBe(0);
		expect(painted.distinct, 'something besides the background colour was painted').toBe(1);

		// And the value is untouched: `saveChanges` never wrote a restored (or dropped) copy back.
		expect(
			await storedJson(page, 'board-elements'),
			'the page rewrote board-elements, so it read it after all'
		).toBe(seedText);

		expectAllowedHosts(traffic, 'the seeded drawing');
		expect(consoleFindings(shield), 'a seeded drawing produced a console error').toEqual([]);
	});

	test('the theme: the account menu switch, what it changes, and what a reload keeps', async ({
		app,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const page = await app('/board');
		const container = page.locator('.excalidraw');

		const classAt = async () => (await container.getAttribute('class')) ?? '';
		expect(await classAt(), 'the board opened already in its dark variant').not.toContain('theme--dark');
		expect(
			await storedJson(page, 'excalidraw-theme'),
			'excalidraw.tsx:26-30 did not write excalidraw-theme on mount'
		).toBe('light');
		expect(
			await storedJson(page, 'theme'),
			'next-themes wrote its own key before anyone switched anything'
		).toBeNull();

		// Excalidraw's own menu, as `app-main-menu.tsx:5-18` mounts it, offered `Open`, `Save to...`,
		// `Export image...`, `Help`, `Reset the canvas` and no theme item at all (`probe-board-run-5.log` U1 menu items);
		// the theme control this page really has is the shell account menu's `Theme` switch
		// (`core/components/users/user-nav-menu.tsx:337` → `core/components/common/theme-switch.tsx`), and that is what
		// feeds `exalidraw.tsx:19` in the first place.
		// The visible account trigger of the shell (the top-bar avatar of the same menu is `md:hidden` at this
		// viewport, so `:visible` keeps strict mode from matching both — the reading `lane-b/session-routing.spec.ts:232`
		// uses). Measured: 1 match, `probe-board-run-6.log` V2 "account button count 1".
		const account = page.locator('[aria-label="Account menu"]:visible');
		await expect(account, 'the shell offered no account menu to reach the theme switch from').toHaveCount(1, {
			timeout: 30_000
		});
		await account.click({ timeout: 15_000 });
		const themeSwitch = page.getByRole('tablist', { name: EN.common.THEME });
		await expect(
			themeSwitch,
			`the account menu does not offer the ${EN.common.THEME} switch user-nav-menu.tsx:337 puts there`
		).toHaveCount(1);
		await expect(
			themeSwitch.getByRole('tab', { name: EN.common.THEME_LIGHT, selected: true }),
			'the switch did not start on the light side'
		).toHaveCount(1);

		await themeSwitch.getByRole('tab', { name: EN.common.THEME_DARK }).click({ timeout: 15_000 });
		// `theme-switch.tsx:46-49` applies the theme `THEME_SWITCH_DELAY_MS` (`:19`, 200 ms) after the click; poll it,
		// do not sleep on it.
		await expect
			.poll(async () => await page.evaluate(() => String(document.documentElement.className)), {
				timeout: 20_000
			})
			.toContain('dark');
		await expect(container, 'Excalidraw did not mark its container with its dark variant').toHaveClass(
			/theme--dark/
		);
		expect(
			await storedJson(page, 'excalidraw-theme'),
			'excalidraw-theme did not follow the switch (exalidraw.tsx:28)'
		).toBe('dark');
		expect(
			await storedJson(page, 'theme'),
			'next-themes did not store the picked theme, so a reload could not keep it'
		).toBe('dark');
		report('theme after the switch', {
			containerClass: await classAt(),
			excalidrawTheme: await storedJson(page, 'excalidraw-theme'),
			published: { backendPostUrlEmpty: (await publishedEnv(page)).NEXT_PUBLIC_BOARD_BACKEND_POST_URL === '' }
		});
		// Measured in `probe-board-run-6.log` V2: the container carries `theme--dark` while the static canvas keeps its
		// one white colour — the switch marks the surface, it does not repaint the background.
		const painted = await canvasPaint(page);
		report('canvas after the theme switch', painted);
		expect(painted.distinct, 'the theme switch repainted the canvas surface after all').toBe(1);

		// Escape does not close this shell menu: `probe-board-run-6.log` V2 still listed `tablists:["Theme"]` right
		// after it. So this test navigates (a reload, which takes the popover with the page) instead of clicking
		// elsewhere, and asserts below that the menu is gone once the page came back.
		await page.keyboard.press('Escape');
		report('theme control after Escape', {
			tablists: await page.evaluate(() =>
				Array.from(document.querySelectorAll('[role="tablist"]')).map((node) => node.getAttribute('aria-label'))
			)
		});

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect
			.poll(async () => await page.locator('.excalidraw__canvas.static').count(), { timeout: 90_000 })
			.toBeGreaterThan(0);
		await expect(container, 'a reload lost the dark variant Excalidraw put on its container').toHaveClass(
			/theme--dark/
		);
		expect(await storedJson(page, 'excalidraw-theme'), 'excalidraw-theme did not survive the reload').toBe('dark');
		expect(
			await page.evaluate(() => String(document.documentElement.className)),
			'the document did not come back in the dark variant next-themes stored'
		).toContain('dark');
		await expect(
			page.getByRole('tablist', { name: EN.common.THEME }),
			'the shell menu the theme was picked from came back open, and it is a portal this page must not leave behind'
		).toHaveCount(0);

		expectAllowedHosts(traffic, 'the theme switch');
		expect(consoleFindings(shield), 'switching the theme produced a console error').toEqual([]);
	});

	test('Live Collaboration with no board backend configured: nothing sent, nothing opened, nothing shown', async ({
		app,
		context,
		shield
	}) => {
		const traffic = await guardHosts(context);
		const page = await app('/board');
		const live = liveButton(page);
		await expect(live, 'no Live Collaboration button to click').toHaveCount(1);

		const mark = traffic.mark();
		let popups = 0;
		context.on('page', () => {
			popups += 1;
		});
		await live.first().click({ timeout: 15_000 });

		// Quiet windows, both proving something did *not* happen: a popup must never arrive
		// (`use-board.ts:63` opens one only `if (response.url)`), and no upload request may follow the click.
		const popup = await context.waitForEvent('page', { timeout: 4_000 }).catch(() => null);
		expect(popup, 'Live Collaboration opened a window although this lane names no board backend URL').toBeNull();
		await page.waitForTimeout(4_000);

		const after = traffic.since(mark);
		report('calls after the click', after);
		expectAllowedHosts(traffic, 'the Live Collaboration click');
		expect(
			after.filter((call) => call.method === 'POST' && call.path !== '/api/log'),
			`the click sent an upload after all: ${JSON.stringify(after.filter((call) => call.method === 'POST' && call.path !== '/api/log'))} — exportToBackend.ts:45 should not have run at all`
		).toEqual([]);
		expect(
			after.filter((call) => call.path.startsWith('/api/board')),
			`the page called a Board API route (${JSON.stringify(after.filter((call) => call.path.startsWith('/api/board')))}); the share does not go through them`
		).toEqual([]);
		expect(popups, `a popup appeared (${popups}) even though the share could not succeed`).toBe(0);

		// And the answer it got is shown nowhere: `use-board.ts:63` reads `response.url` only (header finding).
		await expect(
			page.getByText(NO_SHAREABLE_LINK_TEXT, { exact: true }),
			`the page showed ${JSON.stringify(NO_SHAREABLE_LINK_TEXT)} after all — export-to-backend.ts:18 is shown by nothing in use-board.ts`
		).toHaveCount(0);
		expect(shield.logMatching(/Shareable Link/i), 'the app logged a shareable-link error after all').toEqual([]);
		expect(consoleFindings(shield), 'the Live Collaboration click produced a console error').toEqual([]);
	});

	test('signed out, the door answers /board with a redirect the browser follows to the sign-in page', async ({
		anon,
		shield,
		context
	}) => {
		const traffic = await guardHosts(context);
		const view = await anon('/board');

		await expect(view, 'a visitor with no session cookie was let onto the whiteboard').toHaveURL(/\/unauthorized$/);
		await expect(
			view.getByText(EN.pages.systemPages.UNAUTHORIZED_TITLE, { exact: true }),
			`the visitor landed somewhere that is not ${JSON.stringify(EN.pages.systemPages.UNAUTHORIZED_TITLE)}`
		).toBeVisible();
		// `suites/api/page-gate.spec.ts:64` pins `/board` in `PROTECTED_APP_PATHS` as a status code, and
		// `suites/lane-b/session-routing.spec.ts` pins this browser half for the families it walks
		// (`/goals`, `/inbox`, `/favorites`, `/chat`, `/docs`, `/about`, `/workspace`); this is the same answer for
		// `/board`, seen as documents: the route answered a redirect and the browser followed it.
		const documents = shield.documents();
		report(
			'documents a signed-out /board produced',
			documents.map((document) => `${document.status} ${document.url}`)
		);
		const asked = documents.find((document) => document.url.includes('/board'));
		expect(
			asked?.status,
			`/board answered ${asked?.status}; the door is expected to redirect it (constants.tsx:122 names /board protected)`
		).toBe(307);
		expect(
			documents.some((document) => document.status === 200 && document.url.includes('/unauthorized')),
			'the browser never landed on a served /unauthorized document'
		).toBe(true);
		// The door clears the session family by writing `Set-Cookie: auth-token=` with no value (`deny_redirect` in
		// `proxy.ts`), so the **names** are still in the jar after a refusal — measured here: `auth-token`,
		// `auth-refresh-token`, `auth-active-team`, `auth-tenant-id`, `auth-organization-id`, `auth-active-language`,
		// `auth-user-id`, `auth-active-task`, `auth-active-project`, `no-team-popup-show`… all with an empty value.
		// `sessionCookies` is this repo's reading of "a session in the browser": the `auth-*` family **with a value**
		// (`lane-b/lane-auth-helpers.ts:504-517`), and it is what `lane-b/session-routing.spec.ts:57-60` asserts with.
		report(
			'cookie names the refusal left',
			// Names only: a value (NextAuth's CSRF token among them) is never printed.
			(await context.cookies()).map((cookie) => `${cookie.name}=${cookie.value ? '(set)' : '(empty)'}`)
		);
		expect(
			await sessionCookies(context),
			`being sent to sign in left a session in the jar: ${await describeCookies(context)}`
		).toEqual([]);
		expectAllowedHosts(traffic, 'the signed-out board visit');
	});
});
