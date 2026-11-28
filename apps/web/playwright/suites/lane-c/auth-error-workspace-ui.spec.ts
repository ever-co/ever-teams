import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { encode } from 'next-auth/jwt';

import { expect, test, waitForShellReady, type Page, type Shield } from '../../fixtures';
import type { BrowserContext } from '@playwright/test';

import { APP_ORIGIN } from '../../helpers';
import { EVER_ID_ISSUER_URL, MOCK_ORIGIN } from '../../test-servers';

/**
 * Two sign-in pages that no lane spec drove before: `/auth/error` (every `?error=` branch of its copy) and
 * `/auth/workspace` (the workspace chooser), on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`,
 * control 4004, fake Ever ID issuer 4005 — `playwright/test-servers.ts:40`, started with `E2E_EVER_ID=1`).
 *
 * Every value asserted below is one a `MEASURE` line printed in a completed run: the measuring probes are
 * `D:\Coding\.tmp\probe-autherror\probe{1..5}.mjs` with logs `D:\Coding\.tmp\s3-lane-c-autherror-probe-{1..5}.log`,
 * and every `file:line` was re-read from the source after those runs.
 *
 * ## Which components this drives
 *
 * - `app/[locale]/auth/error/page.tsx` — `enum Error` :12-25, `errorMap` :27-36, `isKnownError` :39-44
 *   (`Object.hasOwn`, its comment :38), `useSearchParams().get('error')` :53-54, the generic fallback :56 with the
 *   comment :55, `FocusShell` :60 (`core/components/layouts/focus/focus-shell.tsx:12-19`, the `<main>` the card sits in).
 * - its branches: `SignInError` `core/components/pages/auth/sign-in-error.tsx:28` (`ERROR_CODE = /^[A-Za-z]{1,40}$/`
 *   :16, `shownCodeOf` :18-26, the code line :41-45), `EverIdNoWorkspace`
 *   `core/components/pages/auth/ever-id-no-workspace.tsx:22` (`offersSignup = offerSignup && !blocked` :31),
 *   `EverIdVerifyEmail` `core/components/pages/auth/ever-id-verify-email.tsx:25` (`VERIFY_EMAIL_ROUTE` :18,
 *   `<a href>` :38, `Button onClick={restartEverIdSignIn}` :40), `ProviderAccountUnconfirmed`
 *   `core/components/pages/auth/provider-account-unconfirmed.tsx:34` (the `PAGE_TEXT` map :16-25),
 *   `ErrorPageComponent` `core/components/pages/error/error.tsx:14`, `UnauthorizedPage`
 *   `core/components/pages/unauthorized/index.tsx:12`. Shared card: `SystemPageFrame`
 *   `core/components/pages/error/system-page-frame.tsx:15-26`.
 * - `app/[locale]/auth/workspace/page.tsx` → `SocialLoginChooseWorspace`
 *   `core/components/pages/auth/workspace/page-component.tsx:24` → `WorkSpaceScreen` :63 (the session read :86-98, the
 *   preselect effect :125-159, `signInToWorkspace` :171-183) → `WorkSpaceComponent`
 *   `core/components/pages/auth/passcode/page-component.tsx:13` → `WorkspacePicker`
 *   `core/components/auth/workspace-picker.tsx:146` (the pickable list :60-85, the search :51,162-166, the rows
 *   :287-402, the no-match block :404-411, the Continue button `id="continue-to-workspace"` :414-423).
 * - the chooser's sign-in: `useAuthenticationSocialLogin.updateOAuthSession`
 *   `core/hooks/auth/use-authentication-social-login.ts:30-112` (`signinService.signInWorkspace` :41-49 →
 *   `POST /auth/signin.workspace` `core/services/client/api/auth/signin.service.ts:125-128`;
 *   `userOrganizationService.getUserOrganizations` :55 → `GET /user-organization?…`
 *   `core/services/client/api/users/user-organization.service.ts:13-33`; `pickTokenOrganization`
 *   `core/lib/auth/jwt-utils.ts:67-73`; `setAuthCookies` :92-103; `navigateAfterSignIn()` :105 →
 *   `window.location.assign('/')` `core/lib/auth/navigate-after-sign-in.ts:47`), and its failure path :107-111 →
 *   `useRememberedTeamContinue.onContinueFailed` `core/hooks/auth/use-remembered-team-continue.ts:70-78` (the reason
 *   key from `errorReasonKeyOf` `core/lib/utils/error-feedback.ts:203-205` → `toasts.REASONS.*` :153-178).
 * - `app/api/auth/ever-id/verify-email/route.ts` (`EVER_ID_VERIFY_PATH` :20, no handoff subject → `Location`
 *   `DEFAULT_APP_PATH` :30-31, the 303 :36) and `core/lib/auth/ever-id/restart.ts:8-11` →
 *   `core/lib/helpers/social-logins.ts` (`'use server'` :1, `signIn(provider.id, {redirectTo:'/auth/workspace'})` :7).
 * - `core/lib/auth/signed-in-auth-paths.ts:9-15` + `proxy.ts:443-446`: the bounce off an auth page needs a Gauzy
 *   `auth-token`/`auth-refresh-token` cookie (`has_any_token`), which this file never gives; lane-d pinned that bounce
 *   with such a cookie in `suites/lane-d/page-gate-lane.spec.ts:369-405`.
 *
 * ## Which layer is real and which is served
 *
 * - `/auth/error` makes **no API call** (measured: the lane mock logged only the shell's own `GET /api/health`); every
 *   branch is static copy plus links, so nothing is stubbed there.
 * - `/auth/workspace` reads no list from an API: the list comes from the NextAuth session. This file mints that
 *   session the way `suites/lane-c/social-welcome-ui.spec.ts:264-279` does — `encode` from `next-auth/jwt` with the
 *   lane app's own `AUTH_SECRET` (`playwright/test-servers.ts:132`) and the cookie name as the salt, cookie
 *   `authjs.session-token` (no `__Secure-` prefix on plain http), carrying `{authCookie: {…workspaces…}}`;
 *   `auth.ts:82-87` hands that payload on as `session.authCookie`, and `readSocialSession`
 *   (`core/lib/auth/social-session.ts:12-17`) accepts it because its `provider` is not `ever-id`. Measured in
 *   `…probe-3.log` J (`sessionEcho authCookieKeys [provider,access_token,refresh_token,confirmed_mail,organizationId,
 *   tenantId,userId,workspaces]`, jar `authjs.session-token=<len 1758>`) and in `…probe-4.log` M.
 * - The chooser's two HTTP calls are served **by this file on the mock origin**, because the lane mock answers 401 for
 *   any `POST /api/auth/signin.workspace` whose body token is not its own `NEW_WORKSPACE.signinToken`
 *   (`cypress/support/mock-gauzy-server.mjs:552-554`, measured as `POST /api/auth/signin.workspace 401` in
 *   `…probe-2.log` E) and has no `/user-organization` handler at all. The browser's calls are
 *   `http://127.0.0.1:4002/api/auth/signin.workspace` and `…/api/user-organization?…` (the client's axios base is
 *   `<mock origin>/api`; measured in `…probe-4.log` M). `OPTIONS` is answered 204 with the mock's own CORS headers
 *   restated before any call is recorded, and `route.fetch()` is never used, so `mock.calls('signin.workspace')`
 *   staying empty is the proof that this file's stub answered.
 * - The verify-email link is **not followed**: its route is read with `maxRedirects: 0`, and the sign-in-again
 *   button's follow-up request to the issuer origin (`EVER_ID_ISSUER_URL`, `test-servers.ts:62`) is aborted with a
 *   `page.route` on that exact origin.
 *
 * ## Findings — all measured, none tagged (each is what the code says it does)
 *
 * 1. **Every action of the error page is a link, not a button** — `main` held 0 `<button>` for all 9 cases probed and
 *    exactly 1 for `?error=EverIdEmailUnverified` (`…probe-1.log`), which is `Button type="button"
 *    onClick={restartEverIdSignIn}` (`ever-id-verify-email.tsx:40`). `DEFAULT_APP_PATH` printed as `/auth/passcode`
 *    everywhere (the lane runs with `NEXT_PUBLIC_DEMO` blank, `test-servers.ts:137`; `constants.tsx:98-101`).
 * 2. **Only the generic branch has a heading.** `SignInError` prints its title in an `<h1>`
 *    (`sign-in-error.tsx:36`); the other five print it in `Text`, which is a `<div>`
 *    (`core/components/common/typography.tsx:11-14`), so `getByRole('heading')` finds nothing there (`…probe-1.log`
 *    `headings []` for every mapped value). `SystemPageFrame`'s own comment (:4) names "the title" without saying a
 *    heading, so nothing here claims an intent the code contradicts.
 * 3. **`isKnownError` is prototype-safe, and the code line is a separate rule.** `?error=constructor`,
 *    `toString`, `valueOf`, `hasOwnProperty`, `__proto__` all fell through to the generic page with no page error
 *    (`…probe-1.log`); four of them still printed `Error code: <name>` because they match `/^[A-Za-z]{1,40}$/`
 *    (`sign-in-error.tsx:16`), and only `__proto__` did not print (the underscores), i.e. what hides a prototype key
 *    from the code line is that regex, not the `Object.hasOwn` check (`page.tsx:38-44`).
 * 4. **`Signed in as` is the first workspace's address, not the session's.** The chooser printed
 *    `person+alpha.workspace@example.test` while the workspace sign-in it then sent carried
 *    `confirmed_mail: "person@example.test"` (`…probe-4.log` M) — `accountEmail = pickable[0]?.workspace.user?.email`
 *    (`workspace-picker.tsx:169`), where the session's own address is `signinResult.confirmed_mail`
 *    (`page-component.tsx:90-91`).
 * 5. **The search needs 7 workspaces** (`SEARCH_FROM = 7` `workspace-picker.tsx:51`, used :165): with 2 it is absent
 *    (`…probe-3.log` G, `…probe-4.log` M), with 7 it is there (`…probe-2.log` D).
 * 6. **`NO_TEAMS_BADGE` can only be seen when every workspace is empty**: a workspace with no teams is dropped from
 *    the list as soon as any workspace has teams (`:74-78`, measured in `…probe-3.log` G — `Beta Workspace` appears
 *    nowhere in `main`), and only when all are empty are they all listed, each with `No teams`, beside the
 *    `EMPTY_WORKSPACE_WARNING_*` notice (`:277-281,335-339`, measured in `…probe-3.log` H). That is what the comment
 *    at :55-59 says the list does.
 * 7. **Continue stays enabled when the search matches nothing.** With `zzz-no-such` no row was listed, yet
 *    `#continue-to-workspace` was not disabled (`…probe-5.log` S) — the selection is looked up in `pickable`, not in
 *    the filtered `shown` (`workspace-picker.tsx:167,171-172`). A gap: the list says there is nothing to open.
 * 8. **A workspace with no tenant is renamed, and disappears if it also has no teams.** With teams it reads
 *    `New workspace, not set up yet` (`…probe-5.log` Q; `workspace-picker.tsx:294-295`,
 *    `core/lib/utils/workspace.utils.ts:17-19,25-33`); without teams it was hidden from the picker while the aside
 *    scene still drew its `Person No Tenant` tile (`…probe-3.log` I).
 * 9. **The chooser presses Continue by itself when the list carries a remembered team** — a `remembered-teams`
 *    localStorage record for the session's e-mail, or a workspace whose `user.lastTeamId` is listed and whose
 *    `user.lastLoginAt` is inside 30 days, moves the preselect to that workspace/team and sends the workspace sign-in
 *    without any click (`page-component.tsx:118-122,140-158`, `use-remembered-team-continue.ts:59-68`,
 *    `core/lib/auth/remembered-team.ts:119-143,152-172`; measured in `…probe-4.log` N.remembered / N.server, and
 *    pinned as "no auto-continue" by `use-workspace-analysis.ts:112-114` for 0 teams, which `…probe-3.log` H confirms:
 *    the mock logged nothing). Not tested here: it lands on `/` and mounts the whole shell, which lane-c already
 *    pins elsewhere.
 * 10. **A refused workspace sign-in leaves the chooser exactly as it was** — same URL, same rows, no auth cookie
 *     written, one toast whose sentence is chosen from the status (`401 → toasts.REASONS.SESSION`,
 *     `500 → toasts.REASONS.SERVER`; `error-feedback.ts:153-178`), measured in `…probe-3.log` K.
 *
 * ## Console rule
 *
 * `shield.consoleErrors()` is asserted empty in every `/auth/error` case and in every chooser case that only opens
 * the page; `shield.pageErrors()` is asserted empty everywhere. `SHELL_STORE_NOISE` (React's dev-mode
 * `The result of getSnapshot should be cached…`, `brief-common` 2026-11-25, as in
 * `suites/lane-c/chat-conversation-ui.spec.ts:1074-1083`) and `LANE_HEALTH_CHECK_FLAKE` (the shell's own
 * `GET /api/health` timing out: `console.error('Local API Health Check Error:', error)`
 * `core/services/client/api/default.ts:42`, printed once in `…probe-1.log`) are each filtered for that whole line,
 * never for a shorter prefix. In the two refused-continue
 * cases only the two lines this file armed are excused, each named in full: the client's own
 * `[ERROR] [HttpClient] HTTP Error: POST /auth/signin.workspace <status>` (printed for 500 and 409, not for 401, as
 * measured in `…probe-3.log` K) and `Workspace signin error: ApiError: <the exact message this file's stub answered>`
 * (`use-authentication-social-login.ts:108`). Chrome's `Failed to load resource: … <status>` line is already in
 * `helpers.ts:30-44` `CONSOLE_NOISE`. Nothing else is excused anywhere in this file.
 *
 * ## Not covered
 *
 * - The **Ever ID** shape of the chooser (`readEverIdSession` `core/lib/auth/ever-id/session.ts`, the finish-setup
 *   `POST /api/auth/ever-id/finish-setup` `core/hooks/auth/use-ever-id-workspace-choice.ts:37`, the
 *   `teamsUnavailable` / `tenantless` / `preselectIndex` props `page-component.tsx:209-210`): making one needs an Ever
 *   ID session, which on this lane only a real OIDC round trip through the fake issuer writes
 *   (`auth.ts:46-54` `everIdJwtPayload` runs on `account.provider === 'ever-id'`), and no helper or fixture here
 *   produces one without changing shared code.
 * - `Create a new workspace` (`workspace-picker.tsx:425-432` → `setPathAfterSignIn(CREATE_WORKSPACE_PATH)`), the
 *   keyboard row picker (`handleListKeyDown` :205-225), `Not you?` (`:246-258` → `router.back()`, measured in
 *   `…probe-4.log` O as a trip back to `/auth/passcode`, asserted nowhere), and how each `?error=` value is produced
 *   server-side (`core/services/server/ever-id/sign-in.ts:52-61`, `core/services/server/requests/o-auth.ts:237-242`)
 *   — this file hands the codes to the page directly.
 * - What the issuer answers after `Sign in with Ever ID again`: this file stops at the request the button starts.
 */

const LOG = '[lane-c auth-error workspace]';

/** Prints what one case saw, so the run log carries the values its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`${LOG} MEASURE ${label} · ${parts}`);
}

/**
 * Every key this file copies is named here, so a key that lives in another namespace (or does not exist) is a
 * compile error rather than an `undefined` handed to `getByText`. `toasts.REASONS` stays open because its key is
 * chosen by the status code (`error-feedback.ts:153-178`).
 */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: {
		error: { TITLE: string; TEXT: string; RETRY: string; CODE: string };
		workspace: {
			TITLE: string;
			DESCRIPTION: string;
			NOT_YOU: string;
			NO_MATCH_TEXT: string;
			NO_MATCH_TITLE: string;
			SEARCH: string;
			SIGNED_IN_AS: string;
			TEAMS_OF: string;
			TEAM_COUNT: string;
		};
		scene: { MEMBER_COUNT: string; WORKSPACE_TEXT: string; WORKSPACE_TITLE: string };
	};
	common: { CONTINUE: string };
	pages: {
		auth: {
			everId: {
				NO_WORKSPACE_TITLE: string;
				NO_WORKSPACE_BODY: string;
				NO_WORKSPACE_SIGNUP_BODY: string;
				CREATE_WORKSPACE: string;
				WORKSPACE_BLOCKED_TITLE: string;
				WORKSPACE_BLOCKED_BODY: string;
				SIGN_IN_ANOTHER_WAY: string;
				EMAIL_UNVERIFIED_TITLE: string;
				EMAIL_UNVERIFIED_BODY: string;
				VERIFY_EMAIL: string;
				SIGN_IN_AGAIN: string;
			};
			provider: {
				ACCOUNT_UNCONFIRMED_TITLE: string;
				ACCOUNT_UNCONFIRMED_BODY: string;
				ACCOUNT_NOT_SET_UP_TITLE: string;
				ACCOUNT_NOT_SET_UP_BODY: string;
				SIGN_IN_WITH_EMAIL: string;
			};
			NO_TEAMS_BADGE: string;
			WORKSPACE_OPEN_FAILED: string;
			EMPTY_WORKSPACE_WARNING_TITLE: string;
			EMPTY_WORKSPACE_WARNING_MESSAGE: string;
			WORKSPACE_NOT_SET_UP: string;
		};
		authLogin: { ERROR_SIGNIN: string };
		error: { TITLE: string; HEADING_TITLE: string; HEADING_DESCRIPTION: string };
		systemPages: { UNAUTHORIZED_TITLE: string; UNAUTHORIZED_TEXT: string; SIGN_IN: string };
		unauthorized: { TRY_AGAIN: string };
	};
	toasts: { REASONS: Record<string, string> };
};

const AUTH = EN.auth;
const EVER_ID = EN.pages.auth.everId;
const PROVIDER = EN.pages.auth.provider;

/** `t('key', {name})`: the `{name}` placeholder of a next-intl sentence. */
const fill = (template: string, values: Record<string, string | number>): string =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

/** The `one`/`other` arm of a next-intl plural, as the page renders it (`{count, plural, one {# team} …}`). */
const plural = (template: string, count: number): string => {
	const arm = count === 1 ? 'one' : 'other';
	const start = template.indexOf(`${arm} {`);
	if (start < 0) {
		return template;
	}
	const body = template.slice(start + arm.length + 2, template.indexOf('}', start + arm.length + 2));
	return body.replace('#', String(count));
};

const teamCount = (count: number) => plural(AUTH.workspace.TEAM_COUNT, count);
const memberCount = (count: number) => plural(AUTH.scene.MEMBER_COUNT, count);
const codeLine = (code: string) => fill(AUTH.error.CODE, { code });
const teamsOf = (workspace: string) => fill(AUTH.workspace.TEAMS_OF, { workspace: workspace });

/**
 * `DEFAULT_APP_PATH`, the href every sign-in-way link of these pages uses: `constants.tsx:98-101` picks
 * `/auth/password` only when `NEXT_PUBLIC_DEMO` is `'true'`, and the lane starts it blank (`test-servers.ts:137`).
 * Measured as `/auth/passcode` in `…probe-1.log`, as the href of every link of every branch.
 */
const DEFAULT_APP_PATH = '/auth/passcode';

/** `ever-id-verify-email.tsx:18` (`VERIFY_EMAIL_ROUTE`), the app's own route `app/api/auth/ever-id/verify-email`. */
const VERIFY_EMAIL_ROUTE = '/api/auth/ever-id/verify-email';

/** The lane's fake Ever ID issuer origin (`test-servers.ts:62`): the only origin this file aborts. */
const ISSUER_ORIGIN = new URL(EVER_ID_ISSUER_URL).origin;

/** The lane app's own Auth.js secret (`test-servers.ts:132`) and the cookie its session lives in. */
const AUTH_SECRET = 'playwright-deterministic-secret';
const SESSION_COOKIE = 'authjs.session-token';

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** The client's axios base is `<mock origin>/api` (`…probe-4.log` M), so these are the paths the browser asks for. */
const API_PREFIX = '/api';
const SIGNIN_WORKSPACE_PATH = '/auth/signin.workspace';
const USER_ORGANIZATION_PATH = '/user-organization';

/** React's dev-mode shell-store warning, excluded for this exact text only (header: "Console rule"). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The lane flake: the shell's own `GET /api/health` timing out, printed by
 * `console.error('Local API Health Check Error:', error)` (`core/services/client/api/default.ts:42`).
 * Excused for this whole line only (brief-common 2026-11-28), never for a shorter prefix.
 */
const LANE_HEALTH_CHECK_FLAKE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
const ALLOWED_CONSOLE_NOISE = [SHELL_STORE_NOISE, LANE_HEALTH_CHECK_FLAKE];
const consoleFindings = (shield: Shield) =>
	shield.consoleErrors().filter((line) => !ALLOWED_CONSOLE_NOISE.some((noise) => line.includes(noise)));

/** The two lines a refused workspace sign-in prints because this file armed the refusal (header: "Console rule"). */
const armedSignInFailureLines = (status: number, stubMessage: string): string[] => [
	`[ERROR] [HttpClient] HTTP Error: POST ${SIGNIN_WORKSPACE_PATH} ${status}`,
	`Workspace signin error: ApiError: ${stubMessage}`
];
const consoleFindingsApartFromArmed = (shield: Shield, status: number, stubMessage: string): string[] => {
	const armed = armedSignInFailureLines(status, stubMessage);
	return consoleFindings(shield).filter((line) => !armed.some((text) => line.includes(text)));
};

/* --------------------------------- /auth/error: the branches --------------------------------- */

type BranchCase = {
	error: string;
	/** the copy the branch must show, by the key the component asks for */
	title: string;
	bodies: string[];
	links: Array<{ name: string; href: string }>;
	buttons: string[];
	/** copy this branch must not show */
	absent: string[];
	/** the `file:line` of the branch the map picks */
	source: string;
};

/** The eight values `errorMap` maps (`page.tsx:27-36`), with what each branch printed in `…probe-1.log`. */
const BRANCHES: BranchCase[] = [
	{
		error: 'EverIdNoWorkspace',
		title: EVER_ID.NO_WORKSPACE_TITLE,
		bodies: [EVER_ID.NO_WORKSPACE_BODY],
		links: [{ name: EVER_ID.SIGN_IN_ANOTHER_WAY, href: DEFAULT_APP_PATH }],
		buttons: [],
		absent: [EVER_ID.NO_WORKSPACE_SIGNUP_BODY, EVER_ID.CREATE_WORKSPACE, EVER_ID.WORKSPACE_BLOCKED_TITLE],
		source: 'ever-id-no-workspace.tsx:22 (reason defaults to `no_workspace`, offerSignup false)'
	},
	{
		error: 'EverIdNoWorkspaceSignup',
		title: EVER_ID.NO_WORKSPACE_TITLE,
		bodies: [EVER_ID.NO_WORKSPACE_BODY, EVER_ID.NO_WORKSPACE_SIGNUP_BODY],
		links: [
			{ name: EVER_ID.SIGN_IN_ANOTHER_WAY, href: DEFAULT_APP_PATH },
			{ name: EVER_ID.CREATE_WORKSPACE, href: '/auth/signup' }
		],
		buttons: [],
		absent: [EVER_ID.WORKSPACE_BLOCKED_TITLE],
		source: 'page.tsx:29 → <EverIdNoWorkspace offerSignup />, href `/auth/signup` at ever-id-no-workspace.tsx:57'
	},
	{
		error: 'EverIdWorkspaceBlocked',
		title: EVER_ID.WORKSPACE_BLOCKED_TITLE,
		bodies: [EVER_ID.WORKSPACE_BLOCKED_BODY],
		links: [{ name: EVER_ID.SIGN_IN_ANOTHER_WAY, href: DEFAULT_APP_PATH }],
		buttons: [],
		absent: [EVER_ID.NO_WORKSPACE_TITLE, EVER_ID.NO_WORKSPACE_SIGNUP_BODY, EVER_ID.CREATE_WORKSPACE],
		source: 'ever-id-no-workspace.tsx:30-31,34-37 (`offersSignup = offerSignup && !blocked`)'
	},
	{
		error: 'EverIdEmailUnverified',
		title: EVER_ID.EMAIL_UNVERIFIED_TITLE,
		bodies: [EVER_ID.EMAIL_UNVERIFIED_BODY],
		links: [
			{ name: EVER_ID.VERIFY_EMAIL, href: VERIFY_EMAIL_ROUTE },
			{ name: EVER_ID.SIGN_IN_ANOTHER_WAY, href: DEFAULT_APP_PATH }
		],
		buttons: [EVER_ID.SIGN_IN_AGAIN],
		absent: [],
		source: 'ever-id-verify-email.tsx:25'
	},
	{
		error: 'ProviderAccountUnconfirmed',
		title: PROVIDER.ACCOUNT_UNCONFIRMED_TITLE,
		bodies: [PROVIDER.ACCOUNT_UNCONFIRMED_BODY],
		links: [{ name: PROVIDER.SIGN_IN_WITH_EMAIL, href: DEFAULT_APP_PATH }],
		buttons: [],
		absent: [PROVIDER.ACCOUNT_NOT_SET_UP_TITLE],
		source: 'provider-account-unconfirmed.tsx:34 (reason defaults to `unconfirmed`, PAGE_TEXT :17-20)'
	},
	{
		error: 'ProviderAccountNotSetUp',
		title: PROVIDER.ACCOUNT_NOT_SET_UP_TITLE,
		bodies: [PROVIDER.ACCOUNT_NOT_SET_UP_BODY],
		links: [{ name: PROVIDER.SIGN_IN_WITH_EMAIL, href: DEFAULT_APP_PATH }],
		buttons: [],
		absent: [PROVIDER.ACCOUNT_UNCONFIRMED_TITLE],
		source: 'page.tsx:33 → <ProviderAccountUnconfirmed reason="not-set-up" />, PAGE_TEXT :21-24'
	},
	{
		error: 'Configuration',
		title: EN.pages.error.HEADING_TITLE,
		bodies: [EN.pages.error.TITLE, EN.pages.error.HEADING_DESCRIPTION],
		links: [
			{ name: EN.pages.unauthorized.TRY_AGAIN, href: DEFAULT_APP_PATH },
			{ name: EN.pages.authLogin.ERROR_SIGNIN, href: DEFAULT_APP_PATH }
		],
		buttons: [],
		absent: [EN.pages.systemPages.UNAUTHORIZED_TITLE],
		source: 'error/error.tsx:14; the eyebrow `pages.error.TITLE` :20, the two links :27 and :33'
	},
	{
		error: 'AccessDenied',
		title: EN.pages.systemPages.UNAUTHORIZED_TITLE,
		bodies: [EN.pages.systemPages.UNAUTHORIZED_TEXT],
		links: [{ name: EN.pages.systemPages.SIGN_IN, href: DEFAULT_APP_PATH }],
		buttons: [],
		absent: [EN.pages.error.HEADING_TITLE],
		source: 'unauthorized/index.tsx:12'
	}
];

const errorUrl = (error: string | null): string =>
	`/auth/error${error === null ? '' : `?error=${encodeURIComponent(error)}`}`;

/** The card the page renders, so a copy check never reads the header's own links. */
const cardOf = (page: Page) => page.locator('main');

async function openErrorPage(anon: (path: string) => Promise<Page>, error: string, title: string): Promise<Page> {
	const page = await anon(errorUrl(error));
	// A positive signal before any absence check below: this branch's own title, polled.
	await expect(cardOf(page).getByText(title, { exact: true }), `${error}: ${title} shown`).toHaveCount(1, {
		timeout: 30_000
	});
	return page;
}

test.describe('lane-c · /auth/error: every ?error= branch, its copy and its links', () => {
	for (const branch of BRANCHES) {
		test(`A · ?error=${branch.error}: ${branch.source}`, async ({ anon, shield }) => {
			const page = await openErrorPage(anon, branch.error, branch.title);
			const card = cardOf(page);

			await expect(card.getByText(branch.title, { exact: true }), `the title ${branch.title}`).toHaveCount(1);
			for (const body of branch.bodies) {
				await expect(card.getByText(body, { exact: true }), `the sentence ${body}`).toHaveCount(1);
			}
			for (const link of branch.links) {
				const anchor = card.getByRole('link', { name: link.name });
				await expect(anchor, `the link ${link.name}`).toHaveCount(1);
				await expect(anchor, `${link.name} links to ${link.href}`).toHaveAttribute('href', link.href);
			}
			await expect(card.getByRole('button'), 'the only action of this branch that is a button').toHaveCount(
				branch.buttons.length
			);
			for (const label of branch.buttons) {
				await expect(card.getByRole('button', { name: label })).toHaveCount(1);
			}
			// No mapped branch prints its title in a heading: `Text` renders a <div>
			// (core/components/common/typography.tsx:11-14), and the only <h1> of these pages is
			// SignInError's (core/components/pages/auth/sign-in-error.tsx:36), which `errorMap` (page.tsx:27-36)
			// never picks. Measured as `headings []` for all eight values in …probe-1.log.
			await expect(card.getByRole('heading'), `?error=${branch.error} prints no heading`).toHaveCount(0);
			for (const absent of branch.absent) {
				await expect(
					card.getByText(absent, { exact: true }),
					`${absent} belongs to another branch`
				).toHaveCount(0);
			}

			const links = await card
				.getByRole('link')
				.evaluateAll((els) => els.map((el) => `${el.textContent ?? ''}/${el.getAttribute('href')}`));
			measure(`A · ${branch.error}`, {
				documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
				links,
				consoleErrors: consoleFindings(shield),
				pageErrors: shield.pageErrors()
			});

			expect(consoleFindings(shield), 'a static error page logged no error').toEqual([]);
			expect(shield.pageErrors(), 'and threw nothing').toEqual([]);
			expect(shield.documents(), 'one document answered this page').toHaveLength(1);
			expect(shield.documents()[0].status).toBe(200);
		});
	}

	test('B · no ?error= and an unknown code: the generic sign-in error, and its code line only for a next-auth-shaped code', async ({
		anon,
		shield
	}) => {
		// `page.tsx:55-56` sends every unmapped value to SignInError; `sign-in-error.tsx:16,41-45` prints the code only
		// when it is 1..40 letters. Printed / not printed, as measured in …probe-1.log.
		const CODES: Array<{ code: string | null; shown: boolean }> = [
			{ code: null, shown: false },
			{ code: 'OAuthSignin', shown: true },
			{ code: 'OAuthCallback', shown: true },
			{ code: 'Verification', shown: true },
			{ code: 'Default', shown: true },
			{ code: 'a'.repeat(40), shown: true },
			{ code: 'ERROR', shown: true },
			{ code: 'a'.repeat(41), shown: false },
			{ code: 'code123', shown: false },
			{ code: 'OAuthSignin!', shown: false },
			{ code: 'OAuth Signin', shown: false },
			{ code: '<b>x</b>', shown: false }
		];

		const seen: Array<{ code: string | null; shown: boolean; codeLines: number; markup: number }> = [];
		for (const { code, shown } of CODES) {
			const page = await anon(errorUrl(code));
			const card = cardOf(page);
			await expect(card.getByRole('heading', { level: 1 }), `auth.error.TITLE (${AUTH.error.TITLE})`).toHaveText(
				AUTH.error.TITLE
			);
			await expect(card.getByText(AUTH.error.TEXT, { exact: true })).toHaveCount(1);
			const retry = card.getByRole('link', { name: AUTH.error.RETRY });
			await expect(retry).toHaveCount(1);
			await expect(retry).toHaveAttribute('href', DEFAULT_APP_PATH);

			const codeLocator = card.getByText(codeLine(code ?? ''), { exact: true });
			await expect(
				codeLocator,
				shown ? `auth.error.CODE shows ${code}` : `auth.error.CODE is not printed for ${code}`
			).toHaveCount(shown ? 1 : 0);
			// The code is React text, never markup: a `<b>` element would mean the query reached the DOM as HTML.
			const markup = await card.evaluate((node) => node.querySelectorAll('b, i').length);
			expect(markup, `${code} was not painted as markup`).toBe(0);
			seen.push({ code, shown, codeLines: await codeLocator.count(), markup });
		}

		measure('B · unknown codes', { seen, consoleErrors: consoleFindings(shield), pageErrors: shield.pageErrors() });
		expect(consoleFindings(shield), 'no branch of the generic page logged an error').toEqual([]);
		expect(shield.pageErrors(), 'and threw nothing').toEqual([]);
	});

	test('C · a prototype key is not a branch: the generic page, the code line only where the letters allow it, no crash', async ({
		anon,
		shield
	}) => {
		// `page.tsx:38-44` `Object.hasOwn` is the guard; `/^[A-Za-z]{1,40}$/` (`sign-in-error.tsx:16`) is a separate rule.
		const KEYS: Array<{ key: string; codeShown: boolean }> = [
			{ key: 'constructor', codeShown: true },
			{ key: 'toString', codeShown: true },
			{ key: 'valueOf', codeShown: true },
			{ key: 'hasOwnProperty', codeShown: true },
			{ key: '__proto__', codeShown: false }
		];

		const seen: Array<{ key: string; codeShown: boolean; codeLineShown: boolean }> = [];
		for (const { key, codeShown } of KEYS) {
			const page = await anon(errorUrl(key));
			const card = cardOf(page);
			await expect(card.getByRole('heading', { level: 1 })).toHaveText(AUTH.error.TITLE);
			await expect(card.getByText(AUTH.error.TEXT, { exact: true })).toHaveCount(1);
			// None of the mapped branches leaked through the prototype: their copy is absent.
			await expect(card.getByText(EVER_ID.NO_WORKSPACE_TITLE, { exact: true })).toHaveCount(0);
			await expect(card.getByText(PROVIDER.ACCOUNT_UNCONFIRMED_TITLE, { exact: true })).toHaveCount(0);
			const codeShownByPage = (await card.getByText(codeLine(key), { exact: true }).count()) === 1;
			await expect(
				card.getByText(codeLine(key), { exact: true }),
				`the code line follows the letters rule, not the prototype rule (${key})`
			).toHaveCount(codeShown ? 1 : 0);
			seen.push({ key, codeShown, codeLineShown: codeShownByPage });
		}

		measure('C · prototype keys', {
			seen,
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(shield.pageErrors(), 'no prototype key threw in the page').toEqual([]);
		expect(consoleFindings(shield), 'and logged no error').toEqual([]);
	});

	test('D · ?error=EverIdEmailUnverified: the verify link, its route without a handoff cookie, and what Sign in again starts', async ({
		page,
		context,
		anon,
		mock,
		shield
	}) => {
		// Never followed out of the lane: the issuer origin is a lane server (127.0.0.1:4005), so the shield's own
		// block does not cover it and this file aborts it on that exact origin. A page-level route is used because
		// it takes precedence over the shield's context-wide one.
		await page.route(
			(url) => url.origin === ISSUER_ORIGIN,
			(route) => route.abort('aborted')
		);
		await anon(errorUrl('EverIdEmailUnverified'));
		const started: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (url.pathname.startsWith('/_next') || /\.(ico|png|svg|woff2?|map)$/.test(url.pathname)) return;
			started.push(`${request.method()} ${url.origin}${url.pathname}${url.search}`);
		});

		const card = cardOf(page);
		await expect(card.getByText(EVER_ID.EMAIL_UNVERIFIED_TITLE, { exact: true })).toHaveCount(1);
		const verifyLink = card.getByRole('link', { name: EVER_ID.VERIFY_EMAIL });
		await expect(verifyLink).toHaveCount(1);
		await expect(verifyLink, `ever-id-verify-email.tsx:18,38`).toHaveAttribute('href', VERIFY_EMAIL_ROUTE);

		// What that href answers for a browser that holds no Ever ID handoff cookie: `route.ts:30-36`.
		// 120 s, not the 30 s default: the first hit compiles this route cold (`…probe-1.log` P2 timed out on it).
		const answer = await context.request.get(`${APP_ORIGIN}${VERIFY_EMAIL_ROUTE}`, {
			maxRedirects: 0,
			timeout: 120_000
		});
		expect(answer.status(), 'the route answers 303, not a body').toBe(303);
		expect(answer.headers()['location'], 'with no subject it sends the person back to the sign-in page').toBe(
			DEFAULT_APP_PATH
		);
		expect(answer.headers()['cache-control']).toBe('no-store');

		// `Sign in with Ever ID again`: `restartEverIdSignIn` (`restart.ts:8-11`) calls the server action
		// `signInFunction` (`social-logins.ts:1,7`), so the browser posts to the page it is on, and the action then
		// asks the issuer for a fresh sign-in.
		await card.getByRole('button', { name: EVER_ID.SIGN_IN_AGAIN }).click({ timeout: 15_000 });
		await expect
			.poll(() => started.filter((line) => line.startsWith('POST ') && line.includes('/auth/error')), {
				timeout: 30_000,
				message: 'the server action POST never started'
			})
			.not.toHaveLength(0);
		await expect
			.poll(() => started.filter((line) => line.includes(ISSUER_ORIGIN) && line.includes('/oidc/authorize')), {
				timeout: 30_000,
				message: 'the sign-in-again request to the issuer never started'
			})
			.not.toHaveLength(0);

		// A quiet window, not a wait for something: it proves the aborted issuer request did not move this page.
		await page.waitForTimeout(2_000);
		await expect(page).toHaveURL(new RegExp(`^${APP_ORIGIN}/auth/error\\?error=EverIdEmailUnverified$`));
		await expect(card.getByText(EVER_ID.EMAIL_UNVERIFIED_TITLE, { exact: true })).toHaveCount(1);

		measure('D · verify-email and sign-in-again', {
			route: `${answer.status()} ${answer.headers()['location']}`,
			startedAfterClick: started.filter(
				(line) => !line.includes('/api/auth/session') && !line.includes('/api/log')
			),
			mockCalls: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(await mock.requests(), 'the page asked the test backend for nothing').toHaveLength(0);
		expect(shield.pageErrors(), 'the aborted issuer request threw nothing in the page').toEqual([]);
		expect(consoleFindings(shield), 'and logged no error').toEqual([]);
		expect(shield.externalCalls(), 'nothing left this machine (the issuer is a lane server)').toEqual([]);
	});

	test('E · no branch logs a console error or a page error, and every value answers 200', async ({
		anon,
		shield
	}) => {
		const page = await anon(errorUrl(BRANCHES[0].error));
		const documents: Array<{ error: string | null; status: number }> = [];
		for (const branch of BRANCHES) {
			const response = await page.goto(`${APP_ORIGIN}${errorUrl(branch.error)}`, {
				waitUntil: 'domcontentloaded',
				timeout: 120_000
			});
			await expect(cardOf(page).getByText(branch.title, { exact: true })).toHaveCount(1, { timeout: 30_000 });
			documents.push({ error: branch.error, status: response?.status() ?? 0 });
		}
		await page.goto(`${APP_ORIGIN}/auth/error`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
		await expect(cardOf(page).getByText(AUTH.error.TITLE, { exact: true })).toHaveCount(1, { timeout: 30_000 });

		measure('E · console across all branches', {
			documents,
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(
			documents.map((d) => d.status),
			'every ?error= value was served, none redirected'
		).toEqual(documents.map(() => 200));
		expect(consoleFindings(shield), 'the whole sweep logged nothing').toEqual([]);
		expect(shield.pageErrors(), 'and threw nothing').toEqual([]);
	});
});

/* -------------------------------- /auth/workspace: the chooser -------------------------------- */

const ALPHA = 'Alpha Workspace';
const BETA = 'Beta Workspace';
const SESSION_EMAIL = 'person@example.test';

const teamRow = (id: string, name: string, members: number) => ({
	team_id: id,
	team_name: name,
	team_logo: '',
	team_member_count: String(members),
	profile_link: 'manager',
	prefix: null
});

/** One entry of the session's workspace list (`ISigninEmailConfirmWorkspaces`, `core/types/interfaces/auth/auth.ts:67-84`). */
function workspaceEntry(
	name: string,
	teams: ReturnType<typeof teamRow>[],
	options: { tenant?: boolean; lastTeamId?: string; lastLoginAt?: string } = {}
) {
	const user: Record<string, unknown> = {
		email: `person+${name.toLowerCase().replace(/\s+/g, '.')}@example.test`,
		imageUrl: '',
		name: `Person ${name}`,
		tenant: { name, logo: '' },
		...(options.lastTeamId ? { lastTeamId: options.lastTeamId } : {}),
		...(options.lastLoginAt ? { lastLoginAt: options.lastLoginAt } : {})
	};
	if (options.tenant === false) {
		delete user.tenant;
	}
	return { token: `workspace-token-${name}`, user, current_teams: teams };
}

/** `helpers.ts:196-200` keeps its token builder module-private, so this file restates the lane's own shape. */
function base64Url(value: object): string {
	return Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}
function syntheticAccessToken(userId: string, organizationId: string, rotation: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti: rotation };
	return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.fixture`;
}

/** The session cookie Auth.js would have written for this workspace list (`social-session.ts:12-17` accepts it). */
async function mintWorkspaceSession(context: BrowserContext, workspaces: unknown[]): Promise<void> {
	await context.clearCookies();
	await context.addCookies([
		{
			name: SESSION_COOKIE,
			value: await encode({
				token: {
					authCookie: {
						provider: 'google',
						access_token: syntheticAccessToken('user-1', 'org-1', 'initial'),
						refresh_token: { token: 'synthetic-refresh' },
						confirmed_mail: SESSION_EMAIL,
						organizationId: 'org-1',
						tenantId: 'tenant-1',
						userId: 'user-1',
						workspaces
					}
				},
				secret: AUTH_SECRET,
				salt: SESSION_COOKIE
			}),
			domain: new URL(APP_ORIGIN).hostname,
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'Lax' as const
		}
	]);
}

const rowsOf = (page: Page) => page.locator('main [data-picker-row]');
const continueButton = (page: Page) => page.locator('#continue-to-workspace');

/** Every row the chooser listed, as printed: its text and its pressed / expanded state. */
async function readRows(page: Page): Promise<Array<{ text: string; pressed: string | null; expanded: string | null }>> {
	await expect(rowsOf(page).first(), 'the chooser listed a workspace').toBeVisible({ timeout: 30_000 });
	return rowsOf(page).evaluateAll((els) =>
		els.map((el) => ({
			text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
			pressed: el.getAttribute('aria-pressed'),
			expanded: el.getAttribute('aria-expanded')
		}))
	);
}

async function openChooser(page: Page, context: BrowserContext, workspaces: unknown[]): Promise<Page> {
	await mintWorkspaceSession(context, workspaces);
	await page.goto(`${APP_ORIGIN}/auth/workspace`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
	await expect(
		page.locator('main').getByRole('heading', { level: 1 }),
		`auth.workspace.TITLE (${AUTH.workspace.TITLE})`
	).toHaveText(AUTH.workspace.TITLE);
	return page;
}

/** The cookies of the auth family that carry a value; values are never printed. */
async function writtenAuthCookies(context: BrowserContext): Promise<string[]> {
	return (await context.cookies())
		.filter((cookie) => cookie.name.startsWith('auth-') && cookie.value !== '')
		.map((cookie) => cookie.name);
}

type ServedCall = { method: string; pathname: string; search: string; body: string | null };

/**
 * This file's stand-in for the chooser's two calls, on the mock origin (see the header). A refusal answers Gauzy's
 * error shape and records nothing else; the organization read always answers the two fixture organizations.
 */
async function serveWorkspaceSignIn(
	page: Page,
	signin: { status: number; message?: string; accessToken?: string }
): Promise<ServedCall[]> {
	const calls: ServedCall[] = [];
	const cors = {
		'access-control-allow-credentials': 'true',
		'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
		'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
		'access-control-expose-headers': '*',
		'cache-control': 'no-store',
		'access-control-allow-origin': APP_ORIGIN
	};
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === `${API_PREFIX}${SIGNIN_WORKSPACE_PATH}` ||
			url.pathname === `${API_PREFIX}${USER_ORGANIZATION_PATH}`);

	await page.route(matcher, (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: cors });
		}
		const url = new URL(request.url());
		calls.push({ method: request.method(), pathname: url.pathname, search: url.search, body: request.postData() });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...cors, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});

		if (url.pathname === `${API_PREFIX}${USER_ORGANIZATION_PATH}`) {
			return answer(200, {
				items: [
					{ id: 'user-org-1', userId: 'user-1', organizationId: 'org-1', tenantId: 'tenant-1' },
					{ id: 'user-org-2', userId: 'user-1', organizationId: 'org-2', tenantId: 'tenant-1' }
				],
				total: 2
			});
		}
		if (signin.status >= 400) {
			return answer(signin.status, { statusCode: signin.status, message: signin.message });
		}
		return answer(200, {
			user: {
				id: 'user-1',
				email: SESSION_EMAIL,
				tenantId: 'tenant-1',
				firstName: 'Person',
				lastName: 'Example'
			},
			token: signin.accessToken,
			refresh_token: 'synthetic-workspace-refresh'
		});
	});

	return calls;
}

/**
 * Polls this file's own stub log for a recorded call and hands it back typed. `afterIndex` restricts the search to
 * calls recorded after that index, which is how a read that must follow an answer is proved to follow it.
 */
async function waitForCall(
	calls: ServedCall[],
	pick: (call: ServedCall) => boolean,
	message: string,
	afterIndex = -1
): Promise<ServedCall> {
	const later = () => calls.slice(afterIndex + 1).find(pick);
	await expect.poll(later, { timeout: 30_000, message }).not.toBeUndefined();
	return later() as ServedCall;
}

const twoWorkspaces = () => [
	workspaceEntry(ALPHA, [teamRow('team-1', 'Team One', 4), teamRow('team-2', 'Team Two', 1)]),
	workspaceEntry(BETA, [teamRow('team-3', 'Team Beta', 2)])
];

test.describe('lane-c · /auth/workspace: the chooser, its list and its Continue', () => {
	test('F · an anonymous visitor is served the chooser with no list and a Continue that cannot be pressed', async ({
		anon,
		mock,
		shield
	}) => {
		const page = await anon('/auth/workspace');
		const card = page.locator('main');
		await expect(card.getByRole('heading', { level: 1 }), `auth.workspace.TITLE`).toHaveText(AUTH.workspace.TITLE);
		await expect(card.getByText(AUTH.workspace.DESCRIPTION, { exact: true })).toHaveCount(1);
		// The scene beside the picker (`page-component.tsx:33-39`).
		await expect(card.getByText(AUTH.scene.WORKSPACE_TITLE, { exact: true })).toHaveCount(1);
		await expect(card.getByText(AUTH.scene.WORKSPACE_TEXT, { exact: true })).toHaveCount(1);

		// No session, so no list: `isContinueDisabled = isSubmitting || !hasListedSelection` (workspace-picker.tsx:171-172).
		await expect(rowsOf(page)).toHaveCount(0);
		await expect(continueButton(page), 'with nothing listed the chooser cannot sign in to it').toBeDisabled();
		await expect(card.getByRole('button', { name: EN.common.CONTINUE })).toHaveCount(1);
		await expect(
			card.getByText(AUTH.workspace.SIGNED_IN_AS, { exact: true }),
			'no account line without a session'
		).toHaveCount(0);
		await expect(card.getByRole('button', { name: AUTH.workspace.NOT_YOU })).toHaveCount(0);
		await expect(card.getByPlaceholder(AUTH.workspace.SEARCH)).toHaveCount(0);

		measure('F · anonymous chooser', {
			documents: shield.documents().map((d) => `${d.status} ${new URL(d.url).pathname}`),
			rows: await rowsOf(page).count(),
			continueDisabled: await continueButton(page).isDisabled(),
			mockCalls: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(shield.documents(), 'the page was served, not gated').toHaveLength(1);
		expect(shield.documents()[0].status).toBe(200);
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('G · a session with two workspaces: the list as printed, which row is pressed, and no search below 7 rows', async ({
		page,
		context,
		shield
	}) => {
		await openChooser(page, context, twoWorkspaces());
		const card = page.locator('main');

		const rows = await readRows(page);
		// 4 rows: Alpha + its two teams, Beta with its one team; the selected workspace carries no keycap, the other
		// one shows its position (`workspace-picker.tsx:296-301,342-349`).
		await expect(rowsOf(page)).toHaveCount(4);
		await expect(rowsOf(page).filter({ hasText: ALPHA })).toHaveCount(1);
		await expect(rowsOf(page).filter({ hasText: ALPHA })).toHaveAttribute('aria-pressed', 'true');
		await expect(rowsOf(page).filter({ hasText: BETA })).toHaveAttribute('aria-pressed', 'false');
		// The counts are read on the rows. A page-wide read would count the scene's own repeat of the selected
		// team (`…probe-3.log` G mainText ends `… Where you land … AW Alpha Workspace TO Team One TO Team One 4 members`).
		await expect(
			rowsOf(page).filter({ hasText: ALPHA }),
			'auth.workspace.TEAM_COUNT on the Alpha row'
		).toContainText(teamCount(2));
		await expect(rowsOf(page).filter({ hasText: BETA })).toContainText(teamCount(1));
		await expect(
			rowsOf(page).filter({ hasText: 'Team One' }),
			'auth.scene.MEMBER_COUNT on the selected team row'
		).toContainText(memberCount(4));
		await expect(rowsOf(page).filter({ hasText: 'Team Two' })).toContainText(memberCount(1));
		await expect(card.getByRole('group', { name: teamsOf(ALPHA) })).toHaveCount(1);
		await expect(
			card.getByText(EN.pages.auth.NO_TEAMS_BADGE, { exact: true }),
			'neither workspace is empty'
		).toHaveCount(0);
		await expect(card.locator('kbd')).toHaveCount(1);
		await expect(card.locator('kbd').first()).toHaveText('2');
		await expect(card.locator('kbd').first()).toHaveAttribute('aria-hidden', 'true');

		// `Signed in as` / `Not you?` (`workspace-picker.tsx:240-259`); the address is the first workspace's own (`finding 4`).
		const alphaEmail = `person+${ALPHA.toLowerCase().replace(/\s+/g, '.')}@example.test`;
		await expect(card.getByText(AUTH.workspace.SIGNED_IN_AS, { exact: true })).toHaveCount(1);
		await expect(card.getByText(alphaEmail, { exact: true })).toHaveCount(1);
		await expect(
			card.getByText(SESSION_EMAIL, { exact: true }),
			'the session address is not the one printed'
		).toHaveCount(0);
		await expect(card.getByRole('button', { name: AUTH.workspace.NOT_YOU })).toHaveCount(1);
		await expect(
			card.getByPlaceholder(AUTH.workspace.SEARCH),
			'SEARCH_FROM is 7 (workspace-picker.tsx:51,165)'
		).toHaveCount(0);
		await expect(continueButton(page)).toBeEnabled();

		// Preselected: the first workspace and its first team (`page-component.tsx:140-158`, no hint in this session).
		await expect(rowsOf(page).filter({ hasText: 'Team One' })).toHaveAttribute('aria-pressed', 'true');
		await expect(rowsOf(page).filter({ hasText: 'Team Two' })).toHaveAttribute('aria-pressed', 'false');

		measure('G · two workspaces', {
			rows,
			printedEmail: alphaEmail,
			searchInputs: await card.getByPlaceholder(AUTH.workspace.SEARCH).count(),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'opening the chooser logged nothing').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('H · the workspace with no teams is hidden as soon as another has teams', async ({
		page,
		context,
		shield
	}) => {
		await openChooser(page, context, [
			workspaceEntry(ALPHA, [teamRow('team-1', 'Team One', 4), teamRow('team-2', 'Team Two', 1)]),
			workspaceEntry(BETA, [])
		]);
		const card = page.locator('main');

		await expect(rowsOf(page)).toHaveCount(3);
		await expect(rowsOf(page).filter({ hasText: ALPHA })).toContainText(teamCount(2));
		// The positive signal above is the listed row; only then is the absence of the empty one read.
		await expect(
			card.getByText(BETA, { exact: true }),
			'pickableWorkspacesOf drops it (workspace-picker.tsx:74-78)'
		).toHaveCount(0);
		await expect(card.getByText(EN.pages.auth.NO_TEAMS_BADGE, { exact: true })).toHaveCount(0);
		await expect(card.getByText(EN.pages.auth.EMPTY_WORKSPACE_WARNING_TITLE, { exact: true })).toHaveCount(0);
		await expect(continueButton(page)).toBeEnabled();

		measure('H · one empty workspace hidden', {
			rows: await readRows(page),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('H2 · with no teams anywhere, every workspace is listed with the No teams badge and the warning', async ({
		page,
		context,
		mock,
		shield
	}) => {
		await openChooser(page, context, [workspaceEntry(ALPHA, []), workspaceEntry(BETA, [])]);
		const card = page.locator('main');

		await expect(rowsOf(page)).toHaveCount(2);
		await expect(card.getByText(EN.pages.auth.NO_TEAMS_BADGE, { exact: true })).toHaveCount(2);
		await expect(card.getByText(EN.pages.auth.EMPTY_WORKSPACE_WARNING_TITLE, { exact: true })).toHaveCount(1);
		await expect(card.getByText(EN.pages.auth.EMPTY_WORKSPACE_WARNING_MESSAGE, { exact: true })).toHaveCount(1);
		await expect(rowsOf(page).filter({ hasText: ALPHA })).toHaveAttribute('aria-pressed', 'true');
		await expect(continueButton(page), 'a person with no team may still go on and create one').toBeEnabled();
		// A quiet window, not a wait for something: the list is already shown above, and with 0 teams the chooser
		// never auto-submits (`use-workspace-analysis.ts:112-114`), so nothing was sent during those 2 s.
		await page.waitForTimeout(2_000);
		expect(await mock.calls('signin.workspace'), 'no workspace sign-in was sent').toHaveLength(0);

		measure('H2 · all workspaces empty', {
			rows: await readRows(page),
			mockCalls: (await mock.requests()).map((r) => `${r.method} ${r.path}`),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('H3 · a workspace with no tenant is named "New workspace, not set up yet"', async ({
		page,
		context,
		shield
	}) => {
		await openChooser(page, context, [
			workspaceEntry(ALPHA, [teamRow('team-1', 'Team One', 4)]),
			workspaceEntry(BETA, [teamRow('team-3', 'Team Beta', 2)], { tenant: false })
		]);
		const card = page.locator('main');

		// 3 rows, as measured in …probe-5.log Q: the selected Alpha with its one team row, and the tenant-less one,
		// collapsed, so its own team row is not listed (only the expanded workspace lists its teams).
		await expect(rowsOf(page)).toHaveCount(3);
		await expect(card.getByText(EN.pages.auth.WORKSPACE_NOT_SET_UP, { exact: true })).toHaveCount(1);
		await expect(card.getByText(BETA, { exact: true }), 'its own name is not printed for it').toHaveCount(0);
		// The team count of that workspace is still printed next to it.
		await expect(rowsOf(page).filter({ hasText: EN.pages.auth.WORKSPACE_NOT_SET_UP })).toContainText(teamCount(1));

		measure('H3 · tenant-less workspace', {
			rows: await readRows(page),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('I · seven workspaces bring the search; a query that matches none leaves no row and says so', async ({
		page,
		context,
		shield
	}) => {
		const many = Array.from({ length: 7 }, (_, index) =>
			workspaceEntry(`Workspace ${index + 1}`, [teamRow(`team-${index + 1}`, `Team ${index + 1}`, index + 1)])
		);
		await openChooser(page, context, many);
		const card = page.locator('main');

		await expect(rowsOf(page)).toHaveCount(8);
		const search = card.getByRole('searchbox', { name: AUTH.workspace.SEARCH });
		await expect(search, 'the search appears from SEARCH_FROM = 7').toHaveCount(1);
		await expect(search).toHaveAttribute('placeholder', AUTH.workspace.SEARCH);

		await search.fill('workspace 3', { timeout: 15_000 });
		await expect(rowsOf(page), 'the filter keeps exactly the matching workspace').toHaveCount(1);
		await expect(rowsOf(page).first()).toContainText('Workspace 3');

		const noMatchQuery = 'zzz-no-such';
		await search.fill(noMatchQuery, { timeout: 15_000 });
		await expect(rowsOf(page)).toHaveCount(0);
		await expect(
			card.getByText(fill(AUTH.workspace.NO_MATCH_TITLE, { query: noMatchQuery }), { exact: true })
		).toHaveCount(1);
		await expect(card.getByText(AUTH.workspace.NO_MATCH_TEXT, { exact: true })).toHaveCount(1);
		// finding 7: the selection is looked up in the unfiltered list, so Continue is not disabled by the query.
		await expect(continueButton(page)).toBeEnabled();

		measure('I · the search', {
			rowsForMatch: await rowsOf(page).count(),
			continueDisabled: await continueButton(page).isDisabled(),
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('J · Continue: the workspace sign-in body, the organization read that follows it, and where the person lands', async ({
		page,
		context,
		mock,
		shield
	}) => {
		const accessToken = syntheticAccessToken('user-1', 'org-2', 'workspace-signin');
		const calls = await serveWorkspaceSignIn(page, { status: 200, accessToken });
		await openChooser(page, context, twoWorkspaces());

		// Pick the second workspace, so the body can only match the row that was pressed.
		await rowsOf(page).filter({ hasText: BETA }).click({ timeout: 15_000 });
		await expect(rowsOf(page).filter({ hasText: BETA })).toHaveAttribute('aria-pressed', 'true');
		await expect(rowsOf(page).filter({ hasText: ALPHA })).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('main').getByRole('group', { name: teamsOf(BETA) })).toHaveCount(1);

		await page.mouse.move(2, 2);
		await continueButton(page).click({ timeout: 15_000 });

		const signin = await waitForCall(
			calls,
			(call) => call.method === 'POST' && call.pathname.endsWith(SIGNIN_WORKSPACE_PATH),
			'the workspace sign-in was never sent to this file stub'
		);
		const body = JSON.parse(signin.body ?? '{}') as Record<string, unknown>;
		expect(Object.keys(body).sort(), 'the body of signInWorkspace (signin.service.ts:125-128)').toEqual([
			'defaultTeamId',
			'email',
			'lastTeamId',
			'token'
		]);
		expect(body.email, 'the session e-mail, not the printed one').toBe(SESSION_EMAIL);
		expect(body.token).toBe(`workspace-token-${BETA}`);
		expect(body.defaultTeamId).toBe('team-3');
		expect(
			body.lastTeamId,
			'the chosen team, never an empty lastTeamId (use-authentication-social-login.ts:46-48)'
		).toBe('team-3');

		// The organization read follows the answer: looked for after this call index, never counted since the load.
		const signinIndex = calls.indexOf(signin);
		const organizationRead = await waitForCall(
			calls,
			(call) => call.method === 'GET' && call.pathname.endsWith(USER_ORGANIZATION_PATH),
			'the organization read never followed the workspace sign-in',
			signinIndex
		);
		expect(organizationRead.search).toBe(
			'?where%5BuserId%5D=user-1&where%5BtenantId%5D=tenant-1&relations%5B0%5D=organization'
		);

		await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe('/');
		await waitForShellReady(page);
		const jar = await writtenAuthCookies(context);
		const cookies = await context.cookies();
		const written = (name: string) => cookies.find((cookie) => cookie.name === name)?.value;

		measure('J · successful Continue', {
			calls: calls.map((call) => `${call.method} ${call.pathname}`),
			authCookies: jar.sort(),
			tokenMatchesStubAnswer: written('auth-token') === accessToken,
			refreshMatchesStubAnswer: written('auth-refresh-token') === 'synthetic-workspace-refresh',
			mockSignInCalls: (await mock.requests()).filter((r) => r.path.includes('signin.workspace')).length,
			consoleErrors: consoleFindings(shield),
			pageErrors: shield.pageErrors()
		});
		expect(
			await mock.calls('signin.workspace'),
			'the lane mock never saw this call: this file answered it'
		).toHaveLength(0);
		expect(jar.sort(), 'setAuthCookies wrote the session (use-authentication-social-login.ts:92-103)').toEqual(
			expect.arrayContaining([
				'auth-token',
				'auth-refresh-token',
				'auth-tenant-id',
				'auth-user-id',
				'auth-active-team'
			])
		);
		expect(written('auth-token') === accessToken, 'the token cookie holds the token the answer carried').toBe(true);
		expect(written('auth-refresh-token') === 'synthetic-workspace-refresh').toBe(true);
		expect(consoleFindings(shield), 'the sign-in and the shell it opened logged nothing').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	for (const refusal of [401, 500]) {
		const stubMessage = `lane-c refused the workspace sign-in (${refusal})`;
		const reasonKey = refusal === 401 ? 'SESSION' : 'SERVER';
		test(`K · Continue refused ${refusal}: the WORKSPACE_OPEN_FAILED toast with its ${reasonKey} reason, the chooser kept`, async ({
			page,
			context,
			mock,
			shield
		}) => {
			const calls = await serveWorkspaceSignIn(page, { status: refusal, message: stubMessage });
			await openChooser(page, context, twoWorkspaces());
			await expect(rowsOf(page)).toHaveCount(4);

			// The pointer parked away from the toaster, so the toast is not kept alive by a hover.
			await page.mouse.move(2, 2);
			await continueButton(page).click({ timeout: 15_000 });

			const signinCall = await waitForCall(
				calls,
				(call) => call.method === 'POST',
				'the workspace sign-in was never sent'
			);
			// sonner mounts its region at document level, not inside `main`.
			const toast = page.locator('[data-sonner-toast]').filter({ hasText: EN.pages.auth.WORKSPACE_OPEN_FAILED });
			await expect(
				toast,
				'the toast named by page-component.tsx:185 → use-remembered-team-continue.ts:75'
			).toHaveCount(1);
			await expect(
				toast.first(),
				`errorReasonKeyOf maps ${refusal} to toasts.REASONS.${reasonKey}`
			).toContainText(EN.toasts.REASONS[reasonKey]);

			await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe('/auth/workspace');
			await expect(rowsOf(page), 'the list is still there to choose from').toHaveCount(4);
			await expect(continueButton(page)).toBeEnabled();
			expect(await writtenAuthCookies(context), 'a refused workspace sign-in wrote no cookie').toEqual([]);
			// The toast above is the positive signal that the refusal arrived; only then is the absence read.
			expect(
				await mock.calls('signin.workspace'),
				'the lane mock never saw this call: this file answered it'
			).toHaveLength(0);

			measure(`K · refused ${refusal}`, {
				call: `${signinCall.method} ${signinCall.pathname}`,
				// sonner closes a toast on its own timer, so the log reads whatever is still up: the assertion
				// above already proved the sentence and its reason while it was there.
				toasts: (await toast.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()),
				rows: await rowsOf(page).count(),
				consoleErrors: consoleFindings(shield),
				pageErrors: shield.pageErrors()
			});
			expect(
				consoleFindingsApartFromArmed(shield, refusal, stubMessage),
				'only the armed refusal lines are excused'
			).toEqual([]);
			expect(shield.pageErrors(), 'the refusal threw nothing in the page').toEqual([]);
		});
	}
});
