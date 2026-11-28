import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a password sign-in does **after** the form accepts what was typed, on `/auth/password`, lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:38`). The visitor is
 * **not signed in**: every case opens the page on the plain `page` fixture with a cleared jar, the way
 * `suites/lane-a/accept-invite-ui.spec.ts:449-452` and `suites/lane-b/password-journey.spec.ts` open an auth page, never
 * through the signed-in `app()` fixture. `suites/lane-b/password-journey.spec.ts` covers what the form refuses before any
 * request and a session-less mock echo; this file covers the refusal copy the API can give, the workspace step, the second
 * factor, the form's own aids (show / hide, the busy submit) and the address bar (`?method=`, `?email=`).
 *
 * ## Where the numbers came from
 *
 * Nine throwaway probes on this lane on 2026-11-28, in `D:\Coding\.tmp\probe-passwordsignin\`, whose logs are
 * `D:\Coding\.tmp\s3-lane-a-passwordsignin-probe-1.log` … `-9.log`. Every copy line, status, body shape, cookie name, row
 * state, cookie jar and console line pinned below is one those logs printed; this file's own `MEASURE` lines repeat them in
 * its runs. Nothing here is typed from memory.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own app and its auth layout (its `GET /api/auth/session`, `GET /api/health`, `POST /api/log` and the
 * footer answer themselves), the lane's NextAuth, and the lane mock. The lane publishes `GAUZY_API_SERVER_URL` and
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` as the mock origin and blanks `GAUZY_API_BASE_SERVER_URL`
 * (`playwright/test-servers.ts:118-121`), so `GAUZY_API_BASE_SERVER_URL.value` is the mock origin
 * (`core/constants/config/constants.tsx:229-231`) and this page is in **direct mode**: the client's axios base is
 * `<mock origin>/api` (`core/services/client/api.service.ts:512-520`), so the password sign-in is
 * `POST <mock origin>/api/auth/signin.email.password` (`core/services/client/api/auth/auth.service.ts:188-193`) and the
 * workspace sign-in `POST <mock origin>/api/auth/signin.workspace` (`core/services/client/api/auth/signin.service.ts:125-129`).
 * This app's own `app/api/auth/*` twins are never asked. A 401 on an `/auth/*` page is that request's own answer, never a
 * session renewal (`core/services/client/api.service.ts:73-78,339-344`).
 *
 * **Served by this file:** the password sign-in's answer (the mock echoes any POST it does not know, so it can neither
 * refuse a credential nor hand back a workspace list) and the workspace sign-in's answer, its follow-up
 * `GET /api/user-organization` (which the mock answers with `pagination([])`, `cypress/support/mock-gauzy-server.mjs:895`)
 * and the code step's `POST /api/auth/two-factor/verify`. Every `page.route` here is a predicate
 * `url.origin === MOCK_API_ORIGIN && <exact path list>` — never a glob, never a prefix. Every stub answers `OPTIONS` with 204
 * and restates the mock's CORS headers (`mock-gauzy-server.mjs:1084-1096`) before it records a call. `route.fetch()` is never
 * called. A token or a password value is never printed: bodies are compared by key and value, and only booleans are logged.
 *
 * ## The code this file drives (each line read from its file before being named)
 *
 * - `app/[locale]/auth/password/page.tsx` → `AuthPassword` (`core/components/pages/auth/password/page-component.tsx:4`) →
 *   `SignInPage defaultMethod="password"` (`core/components/pages/auth/sign-in/sign-in-page.tsx`): the method from
 *   `?method=` `:33-38,81`, `writeMethodToAddressBar` (a `history.replaceState`) `:41-45`, the `?email=` prefill `:110-121`
 *   (only while the form's own address is empty), `stepOf` `:54-68`, the second-factor override `:129-134`, the steps
 *   rendered `:211-224`, `restartSignIn` `:145-154`, and the layout's `headerLinkHref="/auth/signup"` +
 *   `showDeleteAccountLink` `:202-210`.
 * - `credentials-step.tsx`: the method switch `:176`, `#passcode-email` `:184-197`, the `PasswordField` `#pw-password`
 *   `:202-215` inside its `AuthReveal isOpen={isPassword}` wrapper `:198` (`core/components/auth/kit/auth-reveal.tsx:91-105`:
 *   a closed method keeps its children mounted, `inert`, in a collapsed grid row — finding 7),
 *   the failure `AuthNotice tone="error" title={loginFailure}` `:216` from `password.errors.loginFailed` `:70`,
 *   the submit `Button loading={isLoading} disabled={isLoading}` `:218-225`, the "Forgot password?" link `:152-156`, the
 *   `SessionEndedNotice` `:175`, and `SocialLogins` only when the lane is not in demo mode `:227`.
 * - `core/components/auth/kit/auth-field.tsx`: the reveal button's `aria-label` `:114-119,177-187`, the input type
 *   `:121-126,192`, and the error line `#pw-password-error` `:50-54,88-102`. Its Caps Lock hint `#pw-password-hint`
 *   (`:128-133,151-162`) is **not** driven — see "What this file does not cover".
 * - `core/hooks/auth/use-authentication-password.ts`: the client gate `:57`, `POST …/signin.email.password` `:64`, the
 *   `data.status` 4xx branch `:68-71`, the workspace branch `:73-77`, the catch `:79-93`, `handleWorkspaceSubmit`
 *   `:138-162` (`lastTeamId: selectedTeam || undefined` `:158`), and `signInToWorkspaceRequest` `:96-136` (challenge
 *   `:122-126`). `useQueryCall` (`core/hooks/common/use-query.ts:29-49`) is what makes `signInLoading` /
 *   `signInWorkspaceLoading` flip; it shows no toast of its own.
 * - `core/services/client/api.service.ts:245-257` + `core/services/client/api-error.service.ts:136,262-300`: every axios
 *   refusal is rethrown as an `ApiErrorService` (`extends Error`), which is why the hook's `isAxiosError` branch
 *   `:80-83` never runs on this leg (finding 1).
 * - `core/services/client/api/auth/signin.service.ts:162-209,236-286`: the workspace sign-in, then `GET /api/user-organization`
 *   and `pickTokenOrganization` (`core/lib/auth/jwt-utils.ts:67-73`), then `setAuthCookies`
 *   (`core/lib/helpers/cookies/index.ts:232-270`), else `notReadyError` `:289-295`.
 * - `workspace-steps.tsx` `PasswordWorkspaceStep` `:201-263`: the selection reset and its candidate list `:222-244`
 *   (`firstListedTeam`, `core/lib/auth/remembered-team.ts:130-141`), `goBack` `:248-251`; `WorkspaceChoice` `:34-83` (the
 *   picker is hidden and `auth.workspace.OPENING` shown while a team opens by itself);
 *   `core/hooks/auth/use-remembered-team-continue.ts:36-95` (`autoContinue` presses `#continue-to-workspace` 100 ms after
 *   mount; `onContinueFailed` `:73-81` is the failure toast).
 * - `core/components/auth/workspace-picker.tsx`: `pickableWorkspacesOf` `:60-85`, the rows `[data-picker-row]` `:309-359`,
 *   the teams group `role="group"` `:361-399`, the "Signed in as" block with "Not you?" `:240-260`, the empty-workspace
 *   notice `:277-281`, `#continue-to-workspace` `:414-423`.
 * - `core/components/pages/auth/sign-in/two-factor-step.tsx:74-212` and `core/hooks/auth/use-two-factor-sign-in.ts:22-56`
 *   with `TWO_FACTOR_CODE_LENGTH = 6` (`core/lib/auth/two-factor.ts:4`) and `twoFactorSignInFailureOf` `:143-166`.
 * - `core/lib/auth/error-feedback` … `core/lib/utils/error-feedback.ts:159-176`: the reason line under the failure toast
 *   (401 → `toasts.REASONS.SESSION`, 5xx → `toasts.REASONS.SERVER`).
 * - `core/components/pages/auth/sign-in/session-ended-notice.tsx:84-96` with its storage
 *   (`core/lib/auth/session-ended-notice.ts`: `sessionStorage` key `ever-teams.session-ended`, `{at, timer?}`) and the timer
 *   line `:34-49` (`STALE_TIMER_THRESHOLD`, `core/constants/config/constants.tsx:798-811`).
 * - Footer delete-account link `core/components/layouts/default-layout/auth-layout.tsx:281-291` → `ACCOUNT_DELETION_PATH`
 *   (`core/lib/auth/account-deletion.ts:16`).
 *
 * ## Findings (all untagged: no comment, type or unit test at a `file:line` states a different intent for any of them)
 *
 * 1. The hook's axios-400 branch is dead on this leg: `core/hooks/auth/use-authentication-password.ts:80-83` reads
 *    `err.response.status === 400` and `err.response.data.errors`, but `api.service.ts:245-257` rethrows every refusal as an
 *    `ApiErrorService` (which has no `response`), so a 400 with per-field `errors` lands on the `loginFailed` branch `:88-92`
 *    instead and the API's per-field text is never painted. Test 4 pins all of it.
 * 2. A 5xx says nothing on screen: `statusCode 500` does not start with `'4'` (`:89`), and `err.errors` on an
 *    `ApiErrorService` is undefined (`:85`), so the person is left with the form as it was and only a console line. Test 4 pins it.
 * 3. A 200 whose body carries a 4xx `status` is a **field** refusal (`:68-71`), a refusal from `ApiErrorService` is a
 *    **notice** (`:88-92`): two faces of the same "wrong credentials" outcome, on different elements. Tests 3 and 4.
 * 4. `PasswordWorkspaceStep` renders no notice for its own `errors`: a refused workspace sign-in is only the
 *    `onContinueFailed` toast (`use-remembered-team-continue.ts:73-81`); the picker itself stays exactly as it was. Tests 6, 7 and 8.
 * 5. `Back to sign in` from the code step keeps what was typed: unlike the accept-invite form (its own local state), the
 *    password form's values live in the hook (`use-authentication-password.ts:32`), and `restartSignIn`
 *    (`sign-in-page.tsx:145-154`) only clears errors and the screen. Test 9 pins it.
 * 6. A **401 on this leg logs nothing at all**: 400, 403 and 500 each print the client's own HTTP line (`s3-…-probe-3.log`),
 *    a 401 prints none — on the password sign-in (`s3-…-probe-3.log`, "console") and on the workspace sign-in
 *    (`s3-…-probe-2.log`, "after 401": `consoleErrors: []`). Tests 4, 6, 7 and 8 therefore excuse **no** line for their 401s.
 * 7. The method a person is **not** on is not removed from the document: `AuthReveal` keeps its children mounted and marks
 *    them `inert` with a collapsed grid row (`core/components/auth/kit/auth-reveal.tsx:91-105`), so `#pw-password` is still
 *    there — `s3-…-probe-8.log` measured `?method=code` as `count 1, visible true, inertAncestors true`. Only `inert` keeps
 *    it from the keyboard. Test 12 pins both sides of it.
 *
 * ## Console lines this file excuses, each named in full
 *
 * - `SHELL_STORE_NOISE`, `LOCAL_API_HEALTH_CHECK_TIMEOUT` (the shell's own `GET /api/health` timing out,
 *   `core/services/client/api/default.ts:42`) — lane noise, excused by the whole line.
 * - `armedHttpError('POST', '/auth/signin.email.password', 400 | 500)` and `armedHttpError('POST', '/auth/signin.workspace', 500)`
 *   — the client's own line for the refusal this file armed (`core/services/logs/logger-adapter.service.ts:198`), named with
 *   the verb, service path and status it sent (`s3-…-probe-3.log`, "console").
 * - `armedForbiddenError('POST', '/auth/signin.email.password' | '/auth/signin.workspace')` — the same logger's louder line
 *   for a 403 (`logger-adapter.service.ts:194-197`), the only line a 403 prints on this leg.
 * - Nothing else is excused: a 401 prints no line (finding 6), and every test that arms one expects no console line.
 *
 * ## What this file does not cover
 *
 * - **No Caps Lock test.** `auth-field.tsx:128-133` reads `getModifierState('CapsLock')` off key events, and this lane's
 *   Chromium could not be made to report CapsLock to the page at all: `s3-…-probe-3.log` ("any caps reading at all") recorded
 *   every key event from a Playwright `press('CapsLock')`, a held `CapsLock`, a raw CDP CapsLock key event and CDP
 *   `modifiers` 8 / 16 / 64 with `caps:false` on all of them (8 turned out to be Shift), and `#pw-password-hint` never
 *   appeared. Pinning the hint would mean asserting against a value no probe ever produced.
 * - No social-login button is clicked (`credentials-step.tsx:227` renders them on this lane); they leave the machine.
 * - `notReadyError` (`signin.service.ts:289-295`) and the `finishSignupSetup` leg `:196-206` are not driven: they need an
 *   answer with no organization, which this file's workspace success case deliberately does give one to.
 * - `auth.workspace.OPENING` (test 11) is pinned as the state that paints while the remembered team's workspace answer is
 *   still outstanding, and its refusal face; the `autoContinue` press itself is not timed. `forgetRememberedTeam`
 *   (`core/lib/auth/remembered-team.ts:236-241`), which that refusal writes, is not pinned: it is only observable on a
 *   second sign-in, and this file's probe read of it right after the refusal found no record (`s3-…-diag-2.log`).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** English, read from `locales/en.json` by key — never retyped as a literal in a test. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: {
		field: Record<string, string>;
		method: Record<string, string>;
		signIn: Record<string, string>;
		workspace: Record<string, string>;
		twoFactor: Record<string, string>;
		scene: Record<string, string>;
		sessionEnded: Record<string, string>;
	};
	pages: {
		auth: Record<string, string>;
		accountDeletion: { DELETE_BY_EMAIL_LINK: string };
	};
	toasts: { REASONS: Record<string, string> };
	common: { CONTINUE: string };
};

const COPY = {
	emailLabel: EN.auth.field.EMAIL_LABEL,
	passwordLabel: EN.auth.field.PASSWORD_LABEL,
	passwordPlaceholder: EN.auth.field.PASSWORD_PLACEHOLDER,
	showPassword: EN.auth.field.SHOW_PASSWORD,
	hidePassword: EN.auth.field.HIDE_PASSWORD,
	methodCode: EN.auth.method.CODE,
	methodPassword: EN.auth.method.PASSWORD,
	methodLabel: EN.auth.method.LABEL,
	submitPassword: EN.auth.signIn.SUBMIT_PASSWORD,
	sendCode: EN.auth.signIn.SEND_CODE,
	forgotPassword: EN.auth.signIn.FORGOT_PASSWORD,
	createAccount: EN.auth.signIn.CREATE_ACCOUNT,
	workspaceTitle: EN.auth.workspace.TITLE,
	workspaceDescription: EN.auth.workspace.DESCRIPTION,
	signedInAs: EN.auth.workspace.SIGNED_IN_AS,
	notYou: EN.auth.workspace.NOT_YOU,
	workspaceTeamsOf: EN.auth.workspace.TEAMS_OF,
	workspaceTeamCount: EN.auth.workspace.TEAM_COUNT,
	workspaceCreateNew: EN.auth.workspace.CREATE_NEW,
	workspaceOpening: EN.auth.workspace.OPENING,
	workspaceOpeningText: EN.auth.workspace.OPENING_TEXT,
	twoFactorTitle: EN.auth.twoFactor.TITLE,
	twoFactorDescription: EN.auth.twoFactor.DESCRIPTION,
	twoFactorSubmit: EN.auth.twoFactor.SUBMIT,
	twoFactorBack: EN.auth.twoFactor.BACK,
	twoFactorUseRecovery: EN.auth.twoFactor.USE_RECOVERY,
	twoFactorWrongCode: EN.auth.twoFactor.WRONG_CODE,
	twoFactorSceneTitle: EN.auth.twoFactor.SCENE_TITLE,
	twoFactorSceneText: EN.auth.twoFactor.SCENE_TEXT,
	sceneMembers: EN.auth.scene.MEMBER_COUNT,
	workspaceOpenFailed: EN.pages.auth.WORKSPACE_OPEN_FAILED,
	emptyWorkspaceTitle: EN.pages.auth.EMPTY_WORKSPACE_WARNING_TITLE,
	emptyWorkspaceMessage: EN.pages.auth.EMPTY_WORKSPACE_WARNING_MESSAGE,
	noTeamsBadge: EN.pages.auth.NO_TEAMS_BADGE,
	sessionEndedTitle: EN.auth.sessionEnded.TITLE,
	sessionEndedText: EN.auth.sessionEnded.TEXT,
	sessionEndedTimerRunning: EN.auth.sessionEnded.TIMER_RUNNING,
	sessionEndedTimerStillRunning: EN.auth.sessionEnded.TIMER_STILL_RUNNING,
	sessionEndedStopSaved: EN.auth.sessionEnded.STOP_SAVED,
	reasonSession: EN.toasts.REASONS.SESSION,
	reasonServer: EN.toasts.REASONS.SERVER,
	Continue: EN.common.CONTINUE,
	deleteAccount: EN.pages.accountDeletion.DELETE_BY_EMAIL_LINK
};

/** `auth.workspace.TEAMS_OF` = "Teams of {workspace}". */
const filled = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

/** `{count, plural, one {# team} other {# teams}}`, rendered the way next-intl renders it. */
const pluralOf = (template: string, count: number) => {
	const branches = template.match(/(one|other) \{[^{}]*\}/g) ?? [];
	const chosen = branches.find((branch) => branch.startsWith(count === 1 ? 'one ' : 'other ')) ?? template;
	return chosen
		.replace(/^(one|other) \{/, '')
		.replace(/\}$/, '')
		.replaceAll('#', String(count));
};

/** `core/lib/auth/two-factor.ts:4`. */
const TWO_FACTOR_CODE_LENGTH = 6;
/** `core/components/pages/auth/sign-in/credentials-step.tsx:185,204`. */
const EMAIL_FIELD_ID = 'passcode-email';
const PASSWORD_FIELD_ID = 'pw-password';
/** `sign-in-page.tsx:205`, `credentials-step.tsx:153`, `core/lib/auth/account-deletion.ts:16`. */
const SIGNUP_PATH = '/auth/signup';
const FORGOT_PASSWORD_PATH = '/auth/forgot-password';
const ACCOUNT_DELETION_PATH = '/delete-account';
/** `core/lib/auth/session-ended-notice.ts:19`, `core/lib/auth/remembered-team.ts:12`. */
const SESSION_ENDED_STORAGE_KEY = 'ever-teams.session-ended';
const REMEMBERED_TEAMS_STORAGE_KEY = 'remembered-teams';

const report = (label: string, value: unknown) =>
	console.log(`[lane-a password-signin] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1084-1096`), restated on every answer written below. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const SIGNIN_PASSWORD_ROUTE = '/api/auth/signin.email.password';
const SIGNIN_WORKSPACE_ROUTE = '/api/auth/signin.workspace';
const USER_ORGANIZATION_ROUTE = '/api/user-organization';
const TWO_FACTOR_VERIFY_ROUTE = '/api/auth/two-factor/verify';

/** Everything below is this file's own invention: no real credential, and no token value is ever printed. */
const SIGN_IN_EMAIL = 'lane-a-pw-signin@ever.example';
const TYPED_PASSWORD = 'LaneAPassword!7';
const TENANT_ID = '1f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const USER_ID = '2f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const ORGANIZATION_ID = '3f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const WORKSPACE_A = 'Lane A Workspace A';
const WORKSPACE_B = 'Lane A Workspace B';
const WORKSPACE_A_EMAIL = 'lane-a-pw@ever.example';
const WORKSPACE_B_EMAIL = 'lane-a-pw-b@ever.example';
const TEAM_A1 = '4f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const TEAM_A2 = '5f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const TEAM_B1 = '6f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const TEAM_A1_NAME = 'Lane A Team A1';
const TEAM_A2_NAME = 'Lane A Team A2';
const TEAM_B1_NAME = 'Lane A Team B1';
const TEAM_A1_MEMBERS = 3;
const TEAM_A2_MEMBERS = 1;
const TEAM_B1_MEMBERS = 12;
const TOKEN_A = 'lane-a-workspace-token-A';
const TOKEN_B = 'lane-a-workspace-token-B';
const REFRESH_TOKEN = 'lane-a-refresh-token';
const TWO_FACTOR_CHALLENGE = 'lane-a-second-factor-challenge';
/** The 4xx this file puts inside a 200 body (`use-authentication-password.ts:68`). */
const BODY_STATUS_4XX = 401;

/** `auth.twoFactor.DESCRIPTION` as the page renders it: `{length}` filled in, and `<address>` is markup, not text. */
const codeDescription = () =>
	filled(COPY.twoFactorDescription.replace(/<\/?address>/g, ''), {
		length: TWO_FACTOR_CODE_LENGTH,
		email: SIGN_IN_EMAIL
	});

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * A three-part unsigned token of this file: `startWorkspaceSession` (`signin.service.ts:236-286`) decodes it
 * (`decodeJWT`, `core/lib/auth/jwt-utils.ts:40-60` — `exp`/`iat` present, so no decode warning) and its `organizationId`
 * claim is the organization the cookie ends up naming, so the signed-in shell has no organization to switch to.
 */
const syntheticAccessToken = () => {
	const now = Math.floor(Date.now() / 1000);
	return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
		sub: USER_ID,
		tenantId: TENANT_ID,
		organizationId: ORGANIZATION_ID,
		iat: now,
		exp: now + 86_400
	})}.lane-a-signature`;
};

const teamRow = (id: string, name: string, members: number) => ({
	team_id: id,
	team_name: name,
	team_logo: '',
	team_member_count: String(members),
	profile_link: 'lane-a-profile',
	prefix: null
});

/** One entry of the sign-in's workspace list (`ISigninEmailConfirmWorkspaces`, `core/types/interfaces/auth/auth.ts:67-84`). */
const workspaceEntry = (name: string, email: string, token: string, teams: ReturnType<typeof teamRow>[]) => ({
	token,
	user: {
		email,
		imageUrl: '',
		name: `Lane A Person ${name}`,
		tenant: { name, logo: '' }
	},
	current_teams: teams
});

const TWO_WORKSPACES = [
	workspaceEntry(WORKSPACE_A, WORKSPACE_A_EMAIL, TOKEN_A, [
		teamRow(TEAM_A1, TEAM_A1_NAME, TEAM_A1_MEMBERS),
		teamRow(TEAM_A2, TEAM_A2_NAME, TEAM_A2_MEMBERS)
	]),
	workspaceEntry(WORKSPACE_B, WORKSPACE_B_EMAIL, TOKEN_B, [teamRow(TEAM_B1, TEAM_B1_NAME, TEAM_B1_MEMBERS)])
];
const TWO_TEAMLESS_WORKSPACES = [
	workspaceEntry(WORKSPACE_A, WORKSPACE_A_EMAIL, TOKEN_A, []),
	workspaceEntry(WORKSPACE_B, WORKSPACE_B_EMAIL, TOKEN_B, [])
];

/** An armed refusal, with its message kept beside the answer so a test can name it in its console excuse. */
const refusal = (status: number, message: string) => ({ status, message, body: { statusCode: status, message } });

const challengeRefusal = (status: number, message: string) => ({
	status,
	message,
	body: {
		statusCode: status,
		message,
		code: 'TWO_FACTOR_REQUIRED',
		challenge: TWO_FACTOR_CHALLENGE,
		expiresAt: new Date(Date.now() + 10 * 60_000).toISOString()
	}
});

type ServedAnswer = { status: number; body: unknown };

/** Read by the handler at call time, so a test can re-arm an answer without touching the routes. */
type ServedPlan = {
	password?: ServedAnswer;
	/** Outstanding until the test resolves it: the page waits on the answer. */
	passwordHold?: Promise<void>;
	/** Answered instead of the default two-workspace list, with the sign-in's `defaultTeamId`. */
	workspaces?: unknown[];
	defaultTeamId?: string;
	workspace?: ServedAnswer;
	workspaceHold?: Promise<void>;
	/** Served for `GET /api/user-organization`, which `startWorkspaceSession` asks after a 200 (`signin.service.ts:248-256`). */
	organizations?: unknown;
	twoFactorVerify?: ServedAnswer;
};

type ServedCall = { method: string; path: string; search: string; body: string | null };

type SignInHarness = {
	calls: ServedCall[];
	/** The exact access token this file's workspace answer served, kept so a cookie can be compared to it (never printed). */
	readonly servedAccessToken: string;
	/** False while an armed answer is held: the witness that an assertion ran mid-call. */
	readonly passwordAnswered: boolean;
	readonly workspaceAnswered: boolean;
	countOf: (method: string, path: string) => number;
	bodyOf: (method: string, path: string) => Record<string, unknown> | null;
	indexOf: (method: string, path: string) => number;
	describe: () => string;
};

/** This file's stand-in for the two sign-in calls, the organization read they trigger, and the code step's verify. */
async function serveSignIn(page: Page, plan: ServedPlan): Promise<SignInHarness> {
	const calls: ServedCall[] = [];
	/** Built once per test so the cookie this file later reads can be compared to the token it actually served. */
	const servedAccessToken = syntheticAccessToken();
	const state = { passwordAnswered: true, workspaceAnswered: true };
	const paths = [SIGNIN_PASSWORD_ROUTE, SIGNIN_WORKSPACE_ROUTE, USER_ORGANIZATION_ROUTE, TWO_FACTOR_VERIFY_ROUTE];
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && paths.includes(url.pathname);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({ method, path: url.pathname, search: url.search, body: request.postData() });

		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});

		if (url.pathname === SIGNIN_PASSWORD_ROUTE) {
			const served =
				plan.password ??
				({
					status: 200,
					body: { workspaces: plan.workspaces ?? TWO_WORKSPACES, defaultTeamId: plan.defaultTeamId }
				} satisfies ServedAnswer);
			if (plan.passwordHold) {
				state.passwordAnswered = false;
				await plan.passwordHold;
				state.passwordAnswered = true;
			}
			return answer(served.status, served.body);
		}
		if (url.pathname === SIGNIN_WORKSPACE_ROUTE) {
			if (plan.workspaceHold) {
				state.workspaceAnswered = false;
				await plan.workspaceHold;
				state.workspaceAnswered = true;
			}
			const served =
				plan.workspace ??
				({
					status: 200,
					body: {
						user: {
							id: USER_ID,
							email: SIGN_IN_EMAIL,
							tenantId: TENANT_ID,
							firstName: 'Lane',
							lastName: 'A'
						},
						token: servedAccessToken,
						refresh_token: REFRESH_TOKEN
					}
				} satisfies ServedAnswer);
			return answer(served.status, served.body);
		}
		if (url.pathname === USER_ORGANIZATION_ROUTE) {
			return plan.organizations === undefined
				? answer(200, {
						items: [
							{
								id: 'lane-a-user-org',
								userId: USER_ID,
								tenantId: TENANT_ID,
								organizationId: ORGANIZATION_ID,
								isDefault: true
							}
						],
						total: 1
					} satisfies unknown)
				: answer(200, plan.organizations);
		}
		if (url.pathname === TWO_FACTOR_VERIFY_ROUTE) {
			const served = plan.twoFactorVerify ?? refusal(401, 'lane-a code refused');
			return answer(served.status, served.body);
		}
		return answer(599, { statusCode: 599, message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		servedAccessToken,
		get passwordAnswered() {
			return state.passwordAnswered;
		},
		get workspaceAnswered() {
			return state.workspaceAnswered;
		},
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		bodyOf: (method, path) => {
			const call = calls.find((entry) => entry.method === method && entry.path === path);
			return call?.body ? (JSON.parse(call.body) as Record<string, unknown>) : null;
		},
		indexOf: (method, path) => calls.findIndex((call) => call.method === method && call.path === path),
		describe: () =>
			calls
				.map((call) => `${call.method} ${call.path}${call.search ? `?${call.search.slice(1)}` : ''}`)
				.join(' | ')
	};
}

const openSignIn = async (page: Page, path: string) => {
	await page.context().clearCookies();
	await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
};

const emailField = (page: Page) => page.locator(`#${EMAIL_FIELD_ID}`);
const passwordField = (page: Page) => page.locator(`#${PASSWORD_FIELD_ID}`);
const fieldError = (page: Page, id: string) => page.locator(`#${id}-error`);
const revealButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const submitButton = (page: Page) => page.getByRole('button', { name: COPY.submitPassword, exact: true });
const methodTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
/** An `AuthNotice` (`core/components/auth/kit/auth-notice.tsx:35-46`): `role="alert"` for error and warning. */
const notice = (page: Page, text: string) => page.getByRole('alert').filter({ hasText: text });
const pickerRows = (page: Page) => page.locator('[data-picker-row]');
const continueButton = (page: Page) => page.locator('#continue-to-workspace');
const toasts = (page: Page) => page.locator('[data-sonner-toast]');

/** Polls this file's own stub log for a recorded call: a call is waited for, never assumed from some text appearing. */
const waitForCall = async (harness: SignInHarness, method: string, path: string) => {
	await expect
		.poll(() => harness.countOf(method, path), {
			timeout: 30_000,
			message: `no ${method} ${path} in this file's log; the page sent: ${harness.describe()}`
		})
		.toBeGreaterThan(0);
};

/** The same, restricted to the calls recorded after index `afterIndex` — how a read that must follow an answer is proved. */
const waitForCallAfter = async (harness: SignInHarness, method: string, path: string, afterIndex: number) => {
	await expect
		.poll(() => harness.calls.slice(afterIndex + 1).some((call) => call.method === method && call.path === path), {
			timeout: 30_000,
			message: `no ${method} ${path} after index ${afterIndex}; the page sent: ${harness.describe()}`
		})
		.toBe(true);
};

/** Fills both fields and submits: the way a person reaches the steps this file is about. */
const submitCredentials = async (page: Page) => {
	await expect(emailField(page)).toBeVisible({ timeout: 30_000 });
	await emailField(page).fill(SIGN_IN_EMAIL);
	await passwordField(page).fill(TYPED_PASSWORD);
	await submitButton(page).click({ timeout: 15_000 });
};

/** The workspace step, as the sign-in's answer paints it. */
const reachWorkspaceStep = async (page: Page, harness: SignInHarness) => {
	await waitForCall(harness, 'POST', SIGNIN_PASSWORD_ROUTE);
	await expect(page.getByRole('heading', { level: 1, name: COPY.workspaceTitle })).toBeVisible({ timeout: 30_000 });
	await expect(continueButton(page)).toBeVisible();
};

const readRows = async (page: Page) => {
	await expect(pickerRows(page).first()).toBeVisible({ timeout: 30_000 });
	return pickerRows(page).evaluateAll((els) =>
		els.map((el) => ({
			text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
			pressed: el.getAttribute('aria-pressed'),
			expanded: el.getAttribute('aria-expanded')
		}))
	);
};

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own local-API health probe timing out while the dev server is busy
 * (`core/services/client/api/default.ts:42`) — the known lane flake, excused by this whole line, never a shorter prefix. */
const LOCAL_API_HEALTH_CHECK_TIMEOUT = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/** The client's own HTTP error line for a refusal this file armed (`core/services/logs/logger-adapter.service.ts:198`). */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
/** The same logger's louder line for a 403 (`logger-adapter.service.ts:194-197`). */
const armedForbiddenError = (verb: string, path: string) =>
	`[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path} - Permission Denied`;

const LANE_NOISE = [SHELL_STORE_NOISE, LOCAL_API_HEALTH_CHECK_TIMEOUT];

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !LANE_NOISE.some((noise) => line.includes(noise)))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The refusal copy `use-authentication-password.ts` types itself (no locale key carries it). */
const FIELD_REFUSAL_COPY = 'Email address or password invalid';
const LOGIN_FAILED_COPY = 'Incorrect email address or password';

test.describe('lane-a · the password sign-in beyond its form', () => {
	test('1 · the show / hide toggle: its name, the input type, the typed password kept, and nothing sent', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, {});
		await openSignIn(page, '/auth/password');

		await expect(passwordField(page)).toHaveAttribute('type', 'password');
		await expect(revealButton(page, COPY.showPassword)).toHaveAttribute('aria-label', COPY.showPassword);
		await passwordField(page).fill(TYPED_PASSWORD);

		await revealButton(page, COPY.showPassword).click({ timeout: 15_000 });
		// `revealLabelKey` / `inputTypeOf` (`auth-field.tsx:114-126`): the name and the type flip together, the value stays
		await expect(revealButton(page, COPY.hidePassword)).toHaveAttribute('aria-label', COPY.hidePassword);
		await expect(passwordField(page)).toHaveAttribute('type', 'text');
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);

		await revealButton(page, COPY.hidePassword).click({ timeout: 15_000 });
		await expect(revealButton(page, COPY.showPassword)).toHaveAttribute('aria-label', COPY.showPassword);
		await expect(passwordField(page)).toHaveAttribute('type', 'password');
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);

		// the button is `type="button"` inside the form (`auth-field.tsx:178-187`): the two flips above are the positive
		// signal, and this 1.5 s window proves no request followed them
		await page.waitForTimeout(1_500);
		report('reveal toggle', { calls: harness.describe() });
		expect(harness.calls, `the show / hide toggle sent something to the API: ${harness.describe()}`).toEqual([]);
		expect(consoleFindings(shield), `the reveal toggle logged: ${shield.consoleErrors().join(' || ')}`).toEqual([]);
	});

	test('2 · the sign-in held unanswered: the submit busy and disabled mid-call, then the answer', async ({
		page,
		shield
	}) => {
		let releasePassword: () => void = () => undefined;
		const passwordHold = new Promise<void>((resolve) => {
			releasePassword = resolve;
		});
		const harness = await serveSignIn(page, { password: refusal(200, ''), passwordHold });
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);

		await waitForCall(harness, 'POST', SIGNIN_PASSWORD_ROUTE);
		expect(harness.passwordAnswered, 'the held sign-in answered before this file could look at it').toBe(false);
		const submit = submitButton(page);
		// `credentials-step.tsx:218-225` hands `signInLoading` to `Button` (`core/components/common/button.tsx:97-110`)
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await expect(submit).toBeDisabled();
		await expect(submit.locator('.animate-spin'), 'the busy submit showed no spinner').toHaveCount(1);
		await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(fieldError(page, EMAIL_FIELD_ID)).toHaveCount(0);
		await expect(fieldError(page, PASSWORD_FIELD_ID)).toHaveCount(0);

		releasePassword();
		await expect.poll(() => harness.passwordAnswered, { timeout: 30_000 }).toBe(true);
		await expect(submit).not.toHaveAttribute('aria-busy', 'true');
		await expect(submit).toBeEnabled();
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/password`);
		report('held sign-in', { calls: harness.describe() });
		expect(
			harness.countOf('POST', SIGNIN_PASSWORD_ROUTE),
			`the held sign-in was sent more than once: ${harness.describe()}`
		).toBe(1);
		expect(consoleFindings(shield), `the held sign-in logged: ${shield.consoleErrors().join(' || ')}`).toEqual([]);
	});

	test('3 · a 200 whose body carries a 4xx status: the refusal on the address field, the typed values kept', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, {
			password: {
				status: 200,
				body: { status: BODY_STATUS_4XX, message: 'lane-a 4xx inside a 200' }
			}
		});
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await waitForCall(harness, 'POST', SIGNIN_PASSWORD_ROUTE);

		// `use-authentication-password.ts:68-71` → `errors.email`, which `credentials-step.tsx:193` paints as the field's own
		// error line; the copy is typed by the hook at `:69`
		await expect(fieldError(page, EMAIL_FIELD_ID)).toContainText(FIELD_REFUSAL_COPY);
		await expect(emailField(page)).toHaveAttribute('aria-invalid', 'true');
		await expect(notice(page, LOGIN_FAILED_COPY)).toHaveCount(0);
		await expect(fieldError(page, PASSWORD_FIELD_ID)).toHaveCount(0);
		await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(continueButton(page)).toHaveCount(0);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/password`);
		report('200 with a 4xx body', {
			calls: harness.describe(),
			bodyKeys: Object.keys(harness.bodyOf('POST', SIGNIN_PASSWORD_ROUTE) ?? {}).sort()
		});
		expect(
			consoleFindings(shield),
			`a 200 whose body carries a 4xx logged: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('4 · a 400, a 401, a 403 and a 500: the notice they give, and the field errors and the 500 they do not', async ({
		page,
		shield
	}) => {
		const fourHundred = {
			status: 400,
			message: 'lane-a password sign-in refused four hundred',
			body: {
				statusCode: 400,
				message: 'lane-a password sign-in refused four hundred',
				errors: { password: 'lane-a field refusal' }
			}
		};
		const fourHundredOne = refusal(401, 'lane-a password sign-in refused four hundred one');
		const fourHundredThree = refusal(403, 'lane-a password sign-in refused four hundred three');
		const fiveHundred = refusal(500, 'lane-a password sign-in refused five hundred');
		const plan: ServedPlan = { password: fourHundred };
		const harness = await serveSignIn(page, plan);
		const arms: string[] = [];

		for (const served of [fourHundred, fourHundredOne, fourHundredThree, fiveHundred]) {
			plan.password = served;
			await openSignIn(page, '/auth/password');
			await submitCredentials(page);
			await waitForCall(harness, 'POST', SIGNIN_PASSWORD_ROUTE);
			// exactly the line each armed status prints (`s3-…-probe-2.log` / `-probe-3.log`): 400 and 500 print the client's
			// HTTP error line, a 403 prints only its CRITICAL line, and a 401 prints nothing (finding 6)
			if (served.status === 403) arms.push(armedForbiddenError('POST', '/auth/signin.email.password'));
			else if (served.status !== 401)
				arms.push(armedHttpError('POST', '/auth/signin.email.password', served.status));

			const bodyKeys = Object.keys(harness.bodyOf('POST', SIGNIN_PASSWORD_ROUTE) ?? {}).sort();
			if (served.status === 500) {
				// finding 2: nothing on screen at all (`use-authentication-password.ts:85,88-92`)
				await expect(notice(page, LOGIN_FAILED_COPY)).toHaveCount(0);
				await expect(fieldError(page, EMAIL_FIELD_ID)).toHaveCount(0);
				await expect(fieldError(page, PASSWORD_FIELD_ID)).toHaveCount(0);
			} else {
				await expect(notice(page, LOGIN_FAILED_COPY)).toBeVisible();
				// finding 1: the API's own per-field text never reaches the form (`api.service.ts:245-257` boxes it away)
				await expect(fieldError(page, EMAIL_FIELD_ID)).toHaveCount(0);
				await expect(fieldError(page, PASSWORD_FIELD_ID)).toHaveCount(0);
			}
			await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL);
			await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
			await expect(continueButton(page)).toHaveCount(0);
			await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/password`);
			report('refused sign-in', { status: served.status, bodyKeys, calls: harness.describe() });
			harness.calls.length = 0;
		}

		expect(
			consoleFindings(shield, arms),
			`the four refusals logged more than the lines this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('5 · the workspace step as the answer prints it, and "Not you?" back to the credentials', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, { workspaces: TWO_WORKSPACES, defaultTeamId: TEAM_B1 });
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await reachWorkspaceStep(page, harness);

		// "Signed in as" + the first entry's own address (`workspace-picker.tsx:169,240-260`), all served values
		await expect(page.getByText(COPY.signedInAs, { exact: true })).toBeVisible();
		await expect(page.getByText(WORKSPACE_A_EMAIL, { exact: true })).toBeVisible();

		const rows = await readRows(page);
		const rowOf = (name: string) => rows.find((row) => row.text.includes(name));
		report('workspace rows', rows);
		expect(rows.length, `the chooser listed ${rows.length} rows: ${rows.map((row) => row.text).join(' | ')}`).toBe(
			3
		);
		await expect(pickerRows(page).filter({ hasText: WORKSPACE_A })).toHaveCount(1);
		await expect(pickerRows(page).filter({ hasText: WORKSPACE_B })).toHaveCount(1);
		expect(
			[rowOf(WORKSPACE_A)?.pressed, rowOf(WORKSPACE_B)?.pressed],
			`the chooser did not mark the preselected workspace: ${JSON.stringify(rows)}`
		).toEqual(['false', 'true']);
		// the preselected workspace's teams are open, the other one's are not (`workspace-picker.tsx:148-156,292`); a closed
		// workspace that *has* teams says `aria-expanded="false"`, not nothing (`s3-…-probe-8.log`, "chooser header")
		expect(
			[rowOf(WORKSPACE_A)?.expanded, rowOf(WORKSPACE_B)?.expanded],
			`the chooser did not open the preselected workspace: ${JSON.stringify(rows)}`
		).toEqual(['false', 'true']);
		// the row's own text runs its name straight into the count, with no separator between them
		expect(rowOf(WORKSPACE_A)?.text ?? '', `the first row lost its name: ${rowOf(WORKSPACE_A)?.text}`).toContain(
			WORKSPACE_A
		);
		expect(
			rowOf(WORKSPACE_A)?.text ?? '',
			`the first row does not print its team count: ${rowOf(WORKSPACE_A)?.text}`
		).toContain(pluralOf(COPY.workspaceTeamCount, 2));
		expect(
			rowOf(WORKSPACE_B)?.text ?? '',
			`the preselected row does not print its team count: ${rowOf(WORKSPACE_B)?.text}`
		).toContain(pluralOf(COPY.workspaceTeamCount, 1));
		await expect(
			page.getByRole('group', { name: filled(COPY.workspaceTeamsOf, { workspace: WORKSPACE_B }) })
		).toBeVisible();
		const teamRowText =
			(await page.locator('[data-picker-row]').filter({ hasText: TEAM_B1_NAME }).first().textContent()) ?? '';
		expect(teamRowText, `the preselected team row lost its name: ${teamRowText}`).toContain(TEAM_B1_NAME);
		// `auth.scene.MEMBER_COUNT` rendered for the served member count
		expect(teamRowText, `the preselected team does not print its member count: ${teamRowText}`).toContain(
			pluralOf(COPY.sceneMembers, TEAM_B1_MEMBERS)
		);
		await expect(continueButton(page)).toHaveText(COPY.Continue);
		await expect(continueButton(page)).toBeEnabled();
		await expect(page.getByRole('button', { name: COPY.workspaceCreateNew, exact: true })).toHaveCount(1);

		await page.getByRole('button', { name: COPY.notYou, exact: true }).click({ timeout: 15_000 });
		// `PasswordWorkspaceStep.goBack` (`workspace-steps.tsx:248-251`) sets the screen back; the hook keeps the values
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(continueButton(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: COPY.submitPassword, exact: true })).toBeVisible();
		report('back to credentials', { calls: harness.describe() });
		expect(
			harness.countOf('POST', SIGNIN_WORKSPACE_ROUTE),
			`the chooser signed in without being asked: ${harness.describe()}`
		).toBe(0);
		expect(consoleFindings(shield), `the workspace step logged: ${shield.consoleErrors().join(' || ')}`).toEqual(
			[]
		);
	});

	test('6 · picking another workspace and team: the rows, and what Continue really sends', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, {
			workspaces: TWO_WORKSPACES,
			defaultTeamId: TEAM_B1,
			workspace: refusal(401, 'lane-a picked team refused')
		});
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await reachWorkspaceStep(page, harness);

		await pickerRows(page).filter({ hasText: WORKSPACE_A }).first().click({ timeout: 15_000 });
		// polled until the click shows (the picked workspace opened its two teams), then read
		await expect.poll(async () => (await readRows(page)).length, { timeout: 15_000 }).toBe(4);
		const afterWorkspace = await readRows(page);
		report('rows after picking the other workspace', afterWorkspace);
		// picking a workspace opens it and marks it chosen, and its teams are listed under it (`workspace-picker.tsx:148-156`)
		expect(
			afterWorkspace.length,
			`picking a workspace listed ${afterWorkspace.length} rows: ${afterWorkspace.map((row) => row.text).join(' | ')}`
		).toBe(4);
		const pickedWorkspaceRow = afterWorkspace.find((row) => row.text.includes(WORKSPACE_A));
		expect(
			[pickedWorkspaceRow?.pressed, pickedWorkspaceRow?.expanded],
			`the picked workspace is not marked and opened: ${JSON.stringify(afterWorkspace)}`
		).toEqual(['true', 'true']);
		// `PasswordWorkspaceStep`'s reset selects the picked workspace's first listed team (`workspace-steps.tsx:222-244`,
		// `firstListedTeam`, `core/lib/auth/remembered-team.ts:130-141`)
		expect(
			afterWorkspace.find((row) => row.text.includes(TEAM_A1_NAME))?.pressed,
			`picking the workspace did not select its first team: ${JSON.stringify(afterWorkspace)}`
		).toBe('true');
		await expect(
			page.getByRole('group', { name: filled(COPY.workspaceTeamsOf, { workspace: WORKSPACE_A }) })
		).toBeVisible();
		await pickerRows(page).filter({ hasText: TEAM_A2_NAME }).first().click({ timeout: 15_000 });
		// polled until the picked team is marked, then read
		await expect
			.poll(async () => (await readRows(page)).find((row) => row.text.includes(TEAM_A2_NAME))?.pressed, {
				timeout: 15_000
			})
			.toBe('true');
		const afterTeam = await readRows(page);
		const pickedTeamRow = afterTeam.find((row) => row.text.includes(TEAM_A2_NAME));
		expect(pickedTeamRow?.pressed, `the picked team is not marked: ${JSON.stringify(afterTeam)}`).toBe('true');
		// the other team's row keeps the singular branch of `auth.scene.MEMBER_COUNT` for its 1 member
		expect(
			pickedTeamRow?.text ?? '',
			`the picked team row does not print its member count: ${pickedTeamRow?.text}`
		).toContain(pluralOf(COPY.sceneMembers, TEAM_A2_MEMBERS));
		expect(
			afterTeam.find((row) => row.text.includes(TEAM_A1_NAME))?.pressed,
			`the first team stayed marked after another was picked: ${JSON.stringify(afterTeam)}`
		).toBe('false');

		await continueButton(page).click({ timeout: 15_000 });
		await waitForCall(harness, 'POST', SIGNIN_WORKSPACE_ROUTE);
		const workspaceAt = harness.indexOf('POST', SIGNIN_WORKSPACE_ROUTE);
		const body = harness.calls[workspaceAt].body
			? (JSON.parse(harness.calls[workspaceAt].body as string) as Record<string, unknown>)
			: {};
		report('workspace sign-in body', {
			keys: Object.keys(body).sort(),
			emailIsTyped: body.email === SIGN_IN_EMAIL,
			tokenIsThePickedWorkspace: body.token === TOKEN_A,
			lastTeamIdIsThePickedTeam: body.lastTeamId === TEAM_A2
		});
		expect(body, `the workspace sign-in sent ${JSON.stringify(Object.keys(body).sort())}`).toEqual({
			email: SIGN_IN_EMAIL,
			token: TOKEN_A,
			lastTeamId: TEAM_A2
		});
		expect(
			harness.countOf('POST', SIGNIN_WORKSPACE_ROUTE),
			`Continue sent the workspace sign-in more than once: ${harness.describe()}`
		).toBe(1);
		// the 401 is this file's own armed refusal; the chooser stays as it was
		await expect(continueButton(page)).toBeEnabled({ timeout: 30_000 });
		await expect(continueButton(page)).not.toHaveAttribute('aria-busy', 'true');
		// the credentials form is not on this step at all (`s3-…-probe-10.log`, "dom reads": `pwPassword 0`)
		await expect(passwordField(page)).toHaveCount(0);
		report('picked team refused', { calls: harness.describe() });
		await page.mouse.move(2, 2);
		// finding 6: the armed 401 prints no console line, so nothing is excused here
		expect(
			consoleFindings(shield),
			`the picked-team refusal logged a line this file did not arm: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('7 · the workspace sign-in refused, 401 and 500: the toast and its reason, the step kept', async ({
		page,
		shield
	}) => {
		const fourHundredOne = refusal(401, 'lane-a workspace sign-in refused four hundred one');
		const fiveHundred = refusal(500, 'lane-a workspace sign-in refused five hundred');
		const plan: ServedPlan = { workspaces: TWO_WORKSPACES, defaultTeamId: TEAM_B1, workspace: fourHundredOne };
		const harness = await serveSignIn(page, plan);
		const arms: string[] = [];

		for (const served of [fourHundredOne, fiveHundred]) {
			plan.workspace = served;
			await openSignIn(page, '/auth/password');
			await submitCredentials(page);
			await reachWorkspaceStep(page, harness);
			await continueButton(page).click({ timeout: 15_000 });
			await waitForCall(harness, 'POST', SIGNIN_WORKSPACE_ROUTE);
			// only the 500 prints a line here (`s3-…-probe-2.log`, "after 500" vs "after 401": `consoleErrors: []`)
			if (served.status !== 401) arms.push(armedHttpError('POST', '/auth/signin.workspace', served.status));

			// finding 4: the only face is `onContinueFailed` (`use-remembered-team-continue.ts:73-81`), whose reason line is
			// `errorReasonKeyOf` (`core/lib/utils/error-feedback.ts:159-176`)
			await expect(toasts(page).filter({ hasText: COPY.workspaceOpenFailed })).toHaveCount(1, {
				timeout: 30_000
			});
			const reason = served.status === 401 ? COPY.reasonSession : COPY.reasonServer;
			await expect(toasts(page).filter({ hasText: reason })).toHaveCount(1);
			await expect(pickerRows(page)).toHaveCount(3);
			await expect(continueButton(page)).toBeEnabled();
			await expect(continueButton(page)).not.toHaveAttribute('aria-busy', 'true');
			report('refused workspace sign-in', { status: served.status, calls: harness.describe() });
			harness.calls.length = 0;
			// sonner pauses its countdowns while the pointer is over the toaster
			await page.mouse.move(2, 2);
			await expect(toasts(page)).toHaveCount(0, { timeout: 30_000 });
		}

		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/password`);
		expect(
			consoleFindings(shield, arms),
			`the two refusals logged more than the two this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('8 · a workspace list with no teams: every row listed with its warning, and no lastTeamId sent', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, {
			workspaces: TWO_TEAMLESS_WORKSPACES,
			workspace: refusal(401, 'lane-a teamless workspace sign-in refused')
		});
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await reachWorkspaceStep(page, harness);

		// `pickableWorkspacesOf` (`workspace-picker.tsx:60-85`): with no teams anywhere all of them are listed, each with
		// its badge, and `isSelectedEmpty` adds the warning notice `:277-281`
		const rows = await readRows(page);
		report('teamless rows', rows);
		expect(rows.length, `the chooser listed ${rows.length} rows: ${rows.map((row) => row.text).join(' | ')}`).toBe(
			2
		);
		for (const name of [WORKSPACE_A, WORKSPACE_B]) {
			const row = rows.find((entry) => entry.text.includes(name));
			expect(row?.text ?? '', `the empty workspace ${name} carries no badge: ${row?.text}`).toContain(
				COPY.noTeamsBadge
			);
		}
		await expect(notice(page, COPY.emptyWorkspaceTitle)).toBeVisible();
		await expect(notice(page, COPY.emptyWorkspaceTitle)).toContainText(COPY.emptyWorkspaceMessage);
		await expect(continueButton(page)).toBeEnabled();

		await continueButton(page).click({ timeout: 15_000 });
		await waitForCall(harness, 'POST', SIGNIN_WORKSPACE_ROUTE);
		const body = harness.bodyOf('POST', SIGNIN_WORKSPACE_ROUTE) ?? {};
		report('teamless workspace sign-in body', {
			keys: Object.keys(body).sort(),
			tokenIsTheFirstWorkspace: body.token === TOKEN_A
		});
		// `use-authentication-password.ts:158`: no team picked, so no `lastTeamId` (`:156-157` says why)
		expect(
			Object.keys(body).sort(),
			`the teamless workspace sign-in sent ${Object.keys(body).sort().join(', ')}`
		).toEqual(['email', 'token']);
		expect(body.token, 'the teamless workspace sign-in sent another workspace token').toBe(TOKEN_A);
		await page.mouse.move(2, 2);
		await expect(toasts(page).filter({ hasText: COPY.workspaceOpenFailed })).toHaveCount(1);
		await expect(toasts(page)).toHaveCount(0, { timeout: 30_000 });
		// finding 6: the armed 401 prints no console line (`s3-…-probe-2.log`, "after 401")
		expect(
			consoleFindings(shield),
			`the teamless case logged a line this file did not arm: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('9 · the workspace sign-in asks for a second factor: the code step, a wrong code, and Back', async ({
		page,
		shield
	}) => {
		const challenge = challengeRefusal(403, 'lane-a workspace sign-in asks for the second factor');
		const codeRefusal = refusal(401, 'lane-a second-factor code refused');
		const harness = await serveSignIn(page, {
			workspaces: TWO_WORKSPACES,
			defaultTeamId: TEAM_B1,
			workspace: challenge,
			twoFactorVerify: codeRefusal
		});
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await reachWorkspaceStep(page, harness);
		await continueButton(page).click({ timeout: 15_000 });

		await expect(page.getByRole('heading', { level: 1, name: COPY.twoFactorTitle })).toBeVisible({
			timeout: 30_000
		});
		// `AuthCodeInput` renders `TWO_FACTOR_CODE_LENGTH` slots (`core/components/auth/kit/auth-code-input.tsx`): one digit
		// each, `type="tel"`, and only the first one asks the browser for the one-time code (`s3-…-probe-4.log`, "slot attrs")
		const slots = page.locator('input[inputmode="numeric"]');
		await expect(slots, 'the code step did not offer one slot per code digit').toHaveCount(TWO_FACTOR_CODE_LENGTH);
		for (let index = 0; index < TWO_FACTOR_CODE_LENGTH; index += 1) {
			await expect(slots.nth(index)).toHaveAttribute('maxlength', '1');
			await expect(slots.nth(index)).toHaveAttribute('type', 'tel');
		}
		await expect(slots.first()).toHaveAttribute('autocomplete', 'one-time-code');
		await expect(slots.nth(1)).toHaveAttribute('autocomplete', 'off');
		await expect(page.getByRole('button', { name: COPY.twoFactorSubmit, exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: COPY.twoFactorUseRecovery, exact: true })).toBeVisible();
		await expect(page.getByText(COPY.twoFactorSceneTitle, { exact: true })).toBeVisible();
		await expect(page.getByText(COPY.twoFactorSceneText, { exact: true })).toBeVisible();
		// `auth.twoFactor.DESCRIPTION` names its own length and the signed-in address; `<address>` is markup, not text
		await expect(page.getByText(codeDescription())).toBeVisible();
		await expect(notice(page, COPY.workspaceOpenFailed)).toHaveCount(0);
		await expect(toasts(page)).toHaveCount(0);

		// the step focuses its first slot, and six typed digits submit it themselves (`two-factor-step.tsx:188-195`)
		await expect(slots.first()).toBeFocused({ timeout: 30_000 });
		await page.keyboard.type('123456');
		await waitForCall(harness, 'POST', TWO_FACTOR_VERIFY_ROUTE);
		const verifyBody = harness.bodyOf('POST', TWO_FACTOR_VERIFY_ROUTE) ?? {};
		report('two-factor verify body', {
			keys: Object.keys(verifyBody).sort(),
			challengeIsServed: verifyBody.challenge === TWO_FACTOR_CHALLENGE
		});
		expect(
			verifyBody,
			`the code step sent challenge ${verifyBody.challenge} for team ${verifyBody.teamId}`
		).toEqual({
			challenge: TWO_FACTOR_CHALLENGE,
			code: '123456'
		});
		await expect(page.getByRole('alert').filter({ hasText: COPY.twoFactorWrongCode })).toBeVisible({
			timeout: 30_000
		});
		// a refused code empties every slot and keeps the step (`use-two-factor-sign-in.ts`, `twoFactorSignInFailureOf`)
		for (let index = 0; index < TWO_FACTOR_CODE_LENGTH; index += 1) {
			await expect(slots.nth(index)).toHaveValue('');
		}
		await expect(page.getByRole('heading', { level: 1, name: COPY.twoFactorTitle })).toBeVisible();
		await expect(continueButton(page)).toHaveCount(0);

		await page.getByRole('button', { name: COPY.twoFactorBack, exact: true }).click({ timeout: 15_000 });
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		// finding 5: the password form's values live in the hook, so Back keeps them
		await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(slots).toHaveCount(0);
		report('second factor flow', { calls: harness.describe() });
		expect(
			harness.countOf('POST', SIGNIN_WORKSPACE_ROUTE),
			`the challenged sign-in asked for the workspace again: ${harness.describe()}`
		).toBe(1);
		expect(
			// the armed 403 challenge is the only line this leg prints; the refused code (401) prints none (finding 6)
			consoleFindings(shield, [armedForbiddenError('POST', '/auth/signin.workspace')]),
			`the second-factor flow logged more than the refusals this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('10 · the workspace sign-in accepted: what is sent, the cookies it writes, the page it lands on', async ({
		page,
		shield
	}) => {
		const harness = await serveSignIn(page, { workspaces: TWO_WORKSPACES, defaultTeamId: TEAM_B1 });
		await openSignIn(page, '/auth/password');
		await submitCredentials(page);
		await reachWorkspaceStep(page, harness);
		await continueButton(page).click({ timeout: 15_000 });
		await waitForCall(harness, 'POST', SIGNIN_WORKSPACE_ROUTE);
		const workspaceAt = harness.indexOf('POST', SIGNIN_WORKSPACE_ROUTE);
		const body = harness.bodyOf('POST', SIGNIN_WORKSPACE_ROUTE) ?? {};
		expect(body, `the workspace sign-in sent ${JSON.stringify(Object.keys(body).sort())}`).toEqual({
			email: SIGN_IN_EMAIL,
			token: TOKEN_B,
			lastTeamId: TEAM_B1
		});

		// `startWorkspaceSession` (`signin.service.ts:248-256`) asks this file's organization read after that answer
		await waitForCallAfter(harness, 'GET', USER_ORGANIZATION_ROUTE, workspaceAt);
		const organizationSearch =
			harness.calls.slice(workspaceAt + 1).find((call) => call.path === USER_ORGANIZATION_ROUTE)?.search ?? '';
		expect(
			organizationSearch,
			`the organization read did not name the served user: ${organizationSearch}`
		).toContain(USER_ID);

		const sessionCookieNames = [
			'auth-token',
			'auth-refresh-token',
			'auth-tenant-id',
			'auth-organization-id',
			'auth-active-team',
			'auth-user-id'
		];
		await expect
			.poll(
				async () => {
					const jar = await page.context().cookies();
					return sessionCookieNames.every(
						(name) => (jar.find((cookie) => cookie.name === name)?.value.length ?? 0) > 0
					);
				},
				{ timeout: 30_000, message: 'the workspace sign-in wrote no session cookies' }
			)
			.toBe(true);
		const jar = await page.context().cookies();
		const cookieValue = (name: string) => jar.find((cookie) => cookie.name === name)?.value ?? '';
		expect(cookieValue('auth-active-team'), 'the active-team cookie is not the team this file served').toBe(
			TEAM_B1
		);
		expect(cookieValue('auth-organization-id'), 'the organization cookie is not the one this file served').toBe(
			ORGANIZATION_ID
		);
		expect(cookieValue('auth-user-id'), 'the user cookie is not the user this file served').toBe(USER_ID);
		expect(cookieValue('auth-tenant-id'), 'the tenant cookie is not the tenant this file served').toBe(TENANT_ID);
		expect(cookieValue('auth-refresh-token'), 'the refresh-token cookie is not the one this file served').toBe(
			REFRESH_TOKEN
		);
		// compared to the exact string this file put in its own answer — never printed
		expect(cookieValue('auth-token'), 'the access-token cookie is not the token this file served').toBe(
			harness.servedAccessToken
		);
		report('landing cookies', { names: jar.map((cookie) => cookie.name).sort() });

		// `navigateAfterSignIn()` is a full page load of '/' (`core/lib/auth/navigate-after-sign-in.ts:21-45`), polled
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/`);
		await expect(passwordField(page)).toHaveCount(0);
		await expect(emailField(page)).toHaveCount(0);
		report('accepted workspace sign-in', { calls: harness.describe() });
		expect(consoleFindings(shield), `the signed-in landing logged: ${shield.consoleErrors().join(' || ')}`).toEqual(
			[]
		);
	});

	test('11 · a remembered team presses Continue by itself, and what its refusal puts back', async ({
		page,
		shield
	}) => {
		let releaseWorkspace: () => void = () => undefined;
		const workspaceHold = new Promise<void>((resolve) => {
			releaseWorkspace = resolve;
		});
		const harness = await serveSignIn(page, {
			workspaces: TWO_WORKSPACES,
			workspaceHold,
			workspace: refusal(401, 'lane-a automatic continue refused')
		});
		await openSignIn(page, '/auth/password');
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		// The record `rememberTeam` would have left here (`core/lib/auth/remembered-team.ts:11,198-217`): the team this
		// browser last opened for this address, written once the page is loaded and before anything is submitted, so the
		// chooser reads it exactly as a second sign-in would. (Written after the load, not from `page.addInitScript`: on
		// this lane an init-script write was gone by the time the chooser mounted — `s3-…-diag-1.log`, `seeded:false`.)
		await page.evaluate(
			(seed) => {
				window.localStorage.setItem(
					seed.key,
					JSON.stringify({ [seed.email]: { teamId: seed.teamId, usedAt: Date.now() } })
				);
			},
			{ key: REMEMBERED_TEAMS_STORAGE_KEY, email: SIGN_IN_EMAIL, teamId: TEAM_B1 }
		);
		await submitCredentials(page);
		await waitForCall(harness, 'POST', SIGNIN_PASSWORD_ROUTE);
		report('remembered storage at the chooser', {
			seeded: await page.evaluate(
				(key) => window.localStorage.getItem(key) !== null,
				REMEMBERED_TEAMS_STORAGE_KEY
			),
			allRows: await pickerRows(page).count(),
			visibleRows: await page.locator('[data-picker-row]:visible').count(),
			openingLine: await page.getByText(COPY.workspaceOpening).count()
		});

		// `useRememberedTeamContinue` (`core/hooks/auth/use-remembered-team-continue.ts:36-95`) presses the picker's own
		// Continue 100 ms after it mounts, for the team the last sign-in used: no click happens in this test
		await expect(page.getByText(COPY.workspaceOpening, { exact: true })).toBeVisible({ timeout: 30_000 });
		await waitForCall(harness, 'POST', SIGNIN_WORKSPACE_ROUTE);
		expect(harness.workspaceAnswered, 'the automatic continue answered before this file could look at it').toBe(
			false
		);
		// `WorkspaceChoice` keeps the picker mounted and hides its whole wrapper (`workspace-steps.tsx:34-83`,
		// `cn('w-full', shouldAutoSubmit && 'hidden')`): the rows are in the document, none of them is visible
		await expect(pickerRows(page)).toHaveCount(3);
		await expect(pickerRows(page).first()).toBeHidden();
		await expect(continueButton(page)).toBeHidden();
		await expect(continueButton(page)).toHaveAttribute('aria-busy', 'true');
		await expect(
			page.getByText(filled(COPY.workspaceOpeningText, { workspace: WORKSPACE_B }), { exact: true })
		).toBeVisible();
		const body = harness.bodyOf('POST', SIGNIN_WORKSPACE_ROUTE) ?? {};
		report('automatic continue', {
			keys: Object.keys(body).sort(),
			tokenIsTheRememberedWorkspace: body.token === TOKEN_B,
			lastTeamIdIsTheRememberedTeam: body.lastTeamId === TEAM_B1
		});
		expect(body, `the automatic continue sent ${JSON.stringify(Object.keys(body).sort())}`).toEqual({
			email: SIGN_IN_EMAIL,
			token: TOKEN_B,
			lastTeamId: TEAM_B1
		});

		releaseWorkspace();
		await expect.poll(() => harness.workspaceAnswered, { timeout: 30_000 }).toBe(true);
		// the refusal face: the chooser is shown again, the opening state is gone, and the toast names its reason
		await expect(toasts(page).filter({ hasText: COPY.workspaceOpenFailed })).toHaveCount(1, { timeout: 30_000 });
		await expect(toasts(page).filter({ hasText: COPY.reasonSession })).toHaveCount(1);
		await expect(pickerRows(page).first()).toBeVisible({ timeout: 30_000 });
		await expect(continueButton(page)).toBeVisible();
		await expect(continueButton(page)).toBeEnabled();
		await expect(page.getByText(COPY.workspaceOpening, { exact: true })).toHaveCount(0);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/password`);
		// `onContinueFailed` (`use-remembered-team-continue.ts:73-81`) also drops the remembered team through
		// `forgetRememberedTeam`; that storage effect is not pinned here — it only shows on a second sign-in, and one probe
		// read of it after this refusal found no record at all (`s3-…-diag-2.log`), so this file pins the visible face only.
		await page.mouse.move(2, 2);
		await expect(toasts(page)).toHaveCount(0, { timeout: 30_000 });
		report('refused automatic continue', { calls: harness.describe() });
		expect(
			harness.countOf('POST', SIGNIN_WORKSPACE_ROUTE),
			`the automatic continue sent the workspace sign-in more than once: ${harness.describe()}`
		).toBe(1);
		// finding 6: the armed 401 prints no console line
		expect(
			consoleFindings(shield),
			`the automatic continue logged a line this file did not arm: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('12 · ?method=code opens the code form, the tab switch writes the address bar, a reload keeps the method', async ({
		page,
		shield
	}) => {
		const inertPasswordField = page.locator(`[inert] #${PASSWORD_FIELD_ID}`);
		const sendCodeButton = page.getByRole('button', { name: COPY.sendCode, exact: true });
		const signInButton = page.getByRole('button', { name: COPY.submitPassword, exact: true });

		await openSignIn(page, '/auth/password?method=code');
		await expect(emailField(page)).toBeVisible({ timeout: 30_000 });
		await expect(methodTab(page, COPY.methodCode)).toHaveAttribute('aria-selected', 'true');
		await expect(methodTab(page, COPY.methodPassword)).toHaveAttribute('aria-selected', 'false');
		await expect(sendCodeButton).toHaveCount(1);
		await expect(signInButton).toHaveCount(0);
		// finding 7: the method the person is not on is not removed — `AuthReveal` keeps `#pw-password` mounted and marks it
		// `inert` in a collapsed grid row, so only `inert` keeps it from the keyboard (`s3-…-probe-9.log`, "code exact counts")
		await expect(passwordField(page)).toHaveCount(1);
		await expect(inertPasswordField).toHaveCount(1);

		await methodTab(page, COPY.methodPassword).click({ timeout: 15_000 });
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		await expect(inertPasswordField).toHaveCount(0);
		await expect(signInButton).toHaveCount(1);
		await expect(sendCodeButton).toHaveCount(0);
		// `writeMethodToAddressBar` (`sign-in-page.tsx:41-45`) is a `history.replaceState`: the address bar follows
		await expect.poll(() => page.url(), { timeout: 30_000 }).toContain('method=password');
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		await expect(methodTab(page, COPY.methodPassword)).toHaveAttribute('aria-selected', 'true');

		await methodTab(page, COPY.methodCode).click({ timeout: 15_000 });
		await expect.poll(() => page.url(), { timeout: 30_000 }).toContain('method=code');
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(emailField(page)).toBeVisible({ timeout: 30_000 });
		await expect(methodTab(page, COPY.methodCode)).toHaveAttribute('aria-selected', 'true');
		await expect(sendCodeButton).toHaveCount(1);
		await expect(inertPasswordField).toHaveCount(1);
		report('method address bar', { url: page.url(), inertPasswordField: await inertPasswordField.count() });
		expect(consoleFindings(shield), `the method switch logged: ${shield.consoleErrors().join(' || ')}`).toEqual([]);
	});

	test('13 · ?email= prefills the password form, and the links the page offers', async ({ page, shield }) => {
		await openSignIn(page, `/auth/password?email=${encodeURIComponent(SIGN_IN_EMAIL)}`);
		await expect(emailField(page)).toHaveValue(SIGN_IN_EMAIL, { timeout: 30_000 });
		await expect(passwordField(page)).toHaveValue('');
		await expect(passwordField(page)).toHaveAttribute('type', 'password');

		// hrefs read from the code's constants, never followed out of the lane
		await expect(page.getByRole('link', { name: COPY.createAccount, exact: true })).toHaveAttribute(
			'href',
			SIGNUP_PATH
		);
		await expect(page.getByRole('link', { name: COPY.forgotPassword, exact: true })).toHaveAttribute(
			'href',
			FORGOT_PASSWORD_PATH
		);
		await expect(page.locator('[data-testid="auth-delete-account-link"]')).toHaveAttribute(
			'href',
			ACCOUNT_DELETION_PATH
		);
		await expect(page.locator('[data-testid="auth-delete-account-link"]')).toHaveText(COPY.deleteAccount);
		report('prefill and links', {
			createAccount: await page.getByRole('link', { name: COPY.createAccount, exact: true }).getAttribute('href'),
			forgot: await page.getByRole('link', { name: COPY.forgotPassword, exact: true }).getAttribute('href'),
			deleteAccount: await page.locator('[data-testid="auth-delete-account-link"]').getAttribute('href')
		});
		expect(consoleFindings(shield), `the prefilled page logged: ${shield.consoleErrors().join(' || ')}`).toEqual(
			[]
		);
	});

	test('14 · the session-ended notice on /auth/password, with and without a timer run', async ({ page, shield }) => {
		/** The text a notice line carries before its first placeholder: the part a locale key fixes, clock times aside. */
		const lineStart = (template: string) => template.split(/\{[a-zA-Z]+\}/)[0];
		const timerLine = lineStart(COPY.sessionEndedTimerRunning);
		const stopSavedLine = lineStart(COPY.sessionEndedStopSaved);

		await openSignIn(page, '/auth/password');
		await expect(passwordField(page)).toBeVisible({ timeout: 30_000 });
		// the page carries an empty `role="alert"` of its own, so every read here is filtered by the copy it must carry
		await expect(notice(page, COPY.sessionEndedTitle)).toHaveCount(0);

		await page.addInitScript((key: string) => {
			window.sessionStorage.setItem(key, JSON.stringify({ at: Date.now() }));
		}, SESSION_ENDED_STORAGE_KEY);
		await page.goto(`${APP_ORIGIN}/auth/password`, { waitUntil: 'domcontentloaded' });
		const plainNotice = notice(page, COPY.sessionEndedTitle).filter({ hasText: COPY.sessionEndedText });
		await expect(plainNotice).toBeVisible({ timeout: 30_000 });
		await expect(plainNotice).not.toContainText(timerLine);
		await expect(plainNotice).not.toContainText(COPY.sessionEndedTimerStillRunning);
		await expect(plainNotice).not.toContainText(stopSavedLine);

		// a timer saved a minute ago: `STALE_TIMER_THRESHOLD` (`core/constants/config/constants.tsx:798-811`) still lets it run
		const savedUntil = new Date(Date.now() - 60_000).toISOString();
		await page.addInitScript(
			(seed: { key: string; savedUntil: string }) => {
				window.sessionStorage.setItem(
					seed.key,
					JSON.stringify({
						at: Date.now(),
						timer: { timeLogId: 'lane-a-time-log', savedUntil: seed.savedUntil }
					})
				);
			},
			{ key: SESSION_ENDED_STORAGE_KEY, savedUntil }
		);
		await page.goto(`${APP_ORIGIN}/auth/password`, { waitUntil: 'domcontentloaded' });
		const timerNotice = notice(page, COPY.sessionEndedTitle);
		await expect(timerNotice).toBeVisible({ timeout: 30_000 });
		// the closed-tab rule (`session-ended-notice.tsx:34-49`) picks `auth.sessionEnded.TIMER_RUNNING`; its two clock
		// times are this run's own clock and locale (`s3-…-probe-3.log`), so only the line before its first placeholder is pinned
		await expect(timerNotice).toContainText(timerLine);
		await expect(timerNotice).not.toContainText(COPY.sessionEndedTimerStillRunning);
		await expect(timerNotice).not.toContainText(stopSavedLine);
		report('session ended notice', {
			savedUntil,
			noticeText: ((await timerNotice.textContent()) ?? '').replace(/\s+/g, ' ').trim().length
		});
		expect(
			consoleFindings(shield),
			`the session-ended notice logged: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});
});
