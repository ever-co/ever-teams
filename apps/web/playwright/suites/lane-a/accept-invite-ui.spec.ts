import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What the invited person sees on `/auth/accept-invite`, and what the browser really sends there, on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:33-38`). The visitor is
 * **not signed in**: every case opens the page on the plain `page` fixture with a cleared jar, the way
 * `suites/lane-b/signup-forms.spec.ts` and `suites/lane-c/social-welcome-ui.spec.ts` open an auth page without a session —
 * never through the signed-in `app()` fixture.
 *
 * ## Where the numbers came from
 *
 * Four throwaway probes on this lane on 2026-11-28: `D:\Coding\.tmp\probe-acceptinvite\probe1.spec.ts`
 * (`D:\Coding\.tmp\s3-lane-a-acceptinvite-probe-1.log`, 7 passed / 6 failed), `probe2.spec.ts`
 * (`…probe-2.log`, 5 passed / 4 failed), `probe3.spec.ts` (`…probe-3.log`, 4 passed) and `probe4.spec.ts`
 * (`…probe-4.log`, 2 passed — the fourth exists because probe 2 Q8 stubbed the follow-up reads itself and so attributed to
 * the mock what its own empty answers caused; test 12 is pinned from probe 4 instead). Every body, status, cookie name,
 * copy line, landing path and console line pinned below is one those logs printed; this file's own `MEASURE` lines repeat
 * them in its runs. The probes' own bugs (a click on the terms' hidden input, a click on a disabled submit, an
 * `page.evaluate` that raced the landing navigation) are written around here, not into it.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own app and shell (its `GET /api/auth/session`, `GET /api/health`, `POST /api/log` and footer all
 * answer themselves in every case), the lane's NextAuth, and the lane mock — including what it answers for the two reads
 * the hook makes after the accept in test 12: `GET /api/user-organization` is not one of its handlers, so it gets the
 * catch-all `pagination([])` (`cypress/support/mock-gauzy-server.mjs:895`), while `GET /api/organization-team` is answered
 * by its own fixture team (`:655` `pagination([data.team])`, probe 4 `D1.readsFromMock` / `D1.mockPaths`) — and its tenant
 * guard on `POST /api/auth/switch-organization` (`:617-624`). The lane publishes `GAUZY_API_SERVER_URL` and
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` as the mock origin and blanks `GAUZY_API_BASE_SERVER_URL` /
 * `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` (`playwright/test-servers.ts:118-121`), so `GAUZY_API_BASE_SERVER_URL.value` is
 * the mock origin (`core/constants/config/constants.tsx:229-231`), the client's axios base is `<mock origin>/api`
 * (`core/services/client/api.service.ts:512-520`), and this page is in **direct mode**:
 * `isProxyMode = !GAUZY_API_BASE_SERVER_URL.value` (`core/hooks/auth/use-accept-invite.ts:67`) is `false`. So the app's own
 * server route `app/api/invite/accept/route.ts` is **not** in this file's path — probe 1's API-request listing shows no
 * app-origin `/api/invite/*`; both invitation calls go to the mock origin.
 *
 * **Served by this file:** the two invitation calls, which the mock has no handler for (it mocks `POST /api/invite/emails`
 * and `GET /api/invite` / `/api/invite/me` only, and answers any other non-GET by echoing the body it was sent,
 * `mock-gauzy-server.mjs:894`); and, where a test wants the sign-in to finish, the two reads the hook makes after the
 * accept answers (`GET /api/user-organization`, `GET /api/organization-team`, `use-accept-invite.ts:73,90`) and the code
 * step's `POST /api/auth/two-factor/verify`. Every `page.route` here is a predicate
 * `url.origin === MOCK_API_ORIGIN && <exact path list>` — never a `**`-style glob over the API, never a prefix: in probe 2 Q6 a
 * `pathname.startsWith('/api/invite/')` matcher swallowed the shell's own `GET /api/invite/me` (answered 599 → a `DEV Query
 * failed` toast), so each path is named. Every stub answers `OPTIONS` with 204 and restates the mock's CORS headers
 * (`mock-gauzy-server.mjs:1084-1101`) before it records a call — without them the browser throws the answer away, since
 * the page is on `localhost:3031` and this API on `127.0.0.1:3992`. `route.fetch()` is never called. Test 12 phase 1 is the
 * one place that lets a request through: it records the read and hands it to the mock with `route.continue()`, and the
 * mock's own log is then the witness that the answer was the mock's; in phase 2 the same two reads are answered here, and
 * this file's log is the witness.
 *
 * ## The code this file drives (each line read from its file before being named)
 *
 * - `app/[locale]/auth/accept-invite/page.tsx` → `AcceptInvitePageComponent`
 *   (`core/components/pages/auth/accept-invite/page-component.tsx:60`): `code = searchParams?.get('code')?.split('/')[0]`
 *   `:63`, `email = searchParams?.get('email')` `:64`; the once-per-(code,email) effect `:100-116` (the `validatedKeyRef`
 *   guard `:99-103` is the 2026-08-17 loop regression, pinned by `core/hooks/auth/use-accept-invite.test.tsx:4-9`), which
 *   for a missing code or e-mail sets FAILED and logs `console.error('Missing parameters: code and/or email')` `:111`;
 *   LOADING → `AuthState tone="loading"` `:122`; FAILED → `InvitationExpiredMessageCard` `:126`; VALIDATED →
 *   `ValidatedInvitation` (local, `:22`; `AuthHeading` title `t('auth.invite.TITLE', { organization })` `:46`, the rich
 *   `auth.invite.DESCRIPTION` naming the invitation address `:47`, `EntityTile` `:40-44`) plus the form, and `InviteScene`
 *   `:144-153`; `twoFactor.pending` → `TwoFactorStep` in place of the form `:141-143`; `onCompleteRegistration` `:76-95`
 *   splits the typed name (`firstName` = every word but the last, `lastName` = the last).
 * - `core/hooks/auth/use-accept-invite.ts`: `validateInvitation` `:118-150` (LOADING → VALIDATED, or FAILED +
 *   `console.error('Failed to validate invitation:', error)` `:146`); `handleAcceptInvitation` `:25-116` (returns early
 *   unless VALIDATED `:37`; a refusal goes through `twoFactorChallengeOf` (`core/lib/auth/two-factor.ts:52-76`) →
 *   `askForSecondFactor(challenge, '')` and returns `SECOND_FACTOR_ASKED` `:58-61`, otherwise it is rethrown `:62`; direct
 *   mode then reads the organizations `:73-88` and the teams `:90-95`, and writes `setAuthCookies` `:97-110`; a crash of
 *   that chain is only logged `:111-113`). `core/hooks/invitations/use-invite-validation.ts` is the mutation layer
 *   (`validateByCodeMutation` `:42-54`, `acceptInvitationMutation` `:58-65`, `acceptInvitationLoading` = its `isPending` `:75`).
 * - `core/services/client/api/organizations/teams/invites/invite.service.ts`: `acceptInvite` `:316-336` posts
 *   `/invite/accept` with `includeTenantAndOrganizationIds = false` — that is the *fourth* argument of `APIService.post`
 *   (`core/services/client/api.service.ts:630-661`, `directAPI` is a config field that defaults to true `:637`, and the ids
 *   are injected only at `:654-660`); `validateInvitationByCodeAndEmail` `:337-359` posts `/invite/validate-by-code`.
 *   Answers are validated against `inviteVerifiedSchema` (`core/types/schemas/user/invite.schema.ts:65-74`) and
 *   `invitationAcceptedResponse` (`:104-112`); a refusal is boxed by `ApiErrorService.fromAxiosError`
 *   (`core/services/client/api-error.service.ts:262-300`, whose `twoFactorFieldsOf` `:86-99` lifts a body's `challenge` and
 *   `expiresAt` into `details` when `body.code === 'TWO_FACTOR_REQUIRED'`).
 * - `core/components/pages/auth/accept-invite/complete-invitation-registration-form.tsx`: the browser's own gate first (the
 *   `<form>` has no `noValidate` `:111`, the name field is `required` `:121`), then `meetsPasswordMinLength` →
 *   `minLengthRuleOf(t)` `:50-53`, then the mismatch → `t('errors.PASSWORDS_DO_NOT_MATCH')` `:55-58` (every submit starts
 *   from `setErrors(NO_ERRORS)` `:47`, and editing a field clears its own error `:90-100`), then `onCompleteRegistration`
 *   `:61`, `SECOND_FACTOR_ASKED` returning without navigation `:63-65`, `setLoadingWorkspace(true)` + `navigateAfterSignIn()`
 *   `:66-67`, and a refusal → `t('auth.invite.FAILED')` `:69` shown by an `AuthNotice` `:168`
 *   (`core/components/auth/kit/auth-notice.tsx:22-46`, `div role="alert"` for `error`) while the typed values stay; the
 *   terms gate `requiresTermsAgreement = Boolean(TERMS_LINK)` `:34` and `isJoinDisabled` `:97-98`; the fields `:112-145`
 *   (ids `accept-invite-name`, `accept-invite-password`, `accept-invite-confirm`), `PasswordChecks` `:145`
 *   (`core/components/auth/kit/password-checks.tsx:136-176`, a `<ul>` of `<li>` rows: a label plus an `sr-only` state), the
 *   checkbox `:149-163` (`core/components/common/checkbox.tsx` → Base UI: the id `accept-invite-agree-terms` sits on the
 *   **hidden input**, the clickable element is `span[data-slot=checkbox][role=checkbox]`) and its terms link `:161-163`
 *   (`TERMS_LINK`, `core/constants/config/constants.tsx:433`), and the submit `Button` `:170-177`
 *   (`core/components/common/button.tsx:97-110`: `aria-busy` while loading, `disabled` from `isJoinDisabled`, the spinner
 *   `core/components/common/loader.tsx:11-14` `animate-spin`). Its own unit test
 *   `complete-invitation-registration-form.test.tsx:48-131` is the stated intent for the refusals, the kept notice and the
 *   second-factor branch.
 * - `core/components/pages/auth/accept-invite/invitation-expired-message-card.tsx:12-22` (`AuthState tone="warning"` →
 *   `section role="alert"`, `core/components/auth/kit/auth-state.tsx:33-52`) with its `Link href={DEFAULT_APP_PATH}` =
 *   `/auth/passcode` on this lane (`core/constants/config/constants.tsx:98-101`; `NEXT_PUBLIC_DEMO` is blank
 *   `playwright/test-servers.ts:130-134`).
 * - `core/components/pages/auth/sign-in/two-factor-step.tsx:75-200` and `core/hooks/auth/use-two-factor-sign-in.ts:22-56`
 *   (the challenge `use-accept-invite.ts:59` asked for, verified through `authService.verifyTwoFactor`
 *   (`core/services/client/api/auth/auth.service.ts:261-273`) → direct mode's `POST /auth/two-factor/verify`), with
 *   `TWO_FACTOR_CODE_LENGTH = 6` (`core/lib/auth/two-factor.ts:4`).
 * - `core/lib/auth/navigate-after-sign-in.ts:21-45` — a full `window.location.assign('/')`, because no return path was set
 *   for this sign-in (`takePathAfterSignIn` `:118-140`); `core/lib/helpers/cookies/index.ts:232-270` writes the session
 *   cookies from the values `use-accept-invite.ts:97-110` hands it.
 *
 * ## What this file does not cover
 *
 * - `pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST.*` is **not reachable here**, and nothing in this file claims
 *   it is: the only component that renders it is
 *   `core/components/pages/auth/accept-invite/workspace-not-found-message-card.tsx` (`:13-14`), and no page or component
 *   imports it (`grep -rn WorkspaceNotFoundMessageCard apps/web` returns its own definition `:7` only), so no answer this
 *   file can serve brings it up on `/auth/accept-invite`. Test 6 shows what this page does instead for every failed check:
 *   the one `INVALID_INVITATION` card.
 * - The `auth.workspace.OPENING` / `pages.authTeam.LOADING_WORKSPACE` state (`form.tsx:100-108`) never painted in any run:
 *   `setLoadingWorkspace(true)` and `navigateAfterSignIn()` run in the same tick (`:66-67`), and the probes caught the page
 *   going from the form straight to the landing document (`…probe-3.log` R1 `peek.0 → peek.2`, and R2 with the follow-up
 *   reads held). Test 10 pins the button's busy state instead, and finding 4 says the rest.
 * - The code step's recovery-code branch (`two-factor-step.tsx:111-121,166-181`) is pinned as present, not driven.
 * - A real Gauzy token: the token this file answers is its own three-part string, which is why the signed-in landing logs
 *   findings 5 and 6.
 *
 * ## Findings (all untagged: no comment, type or unit test at a `file:line` states a different intent for any of them)
 *
 * 1. `WORKSPACE_NOT_EXIST` copy and its card exist with no importer — see "not covered" above.
 * 2. An empty name produces **no message at all**: the click lands, the browser's own `required` (`form.tsx:121` on a form
 *    with no `noValidate`, `:111`) cancels the submit before `handleSubmit` runs, so `setErrors` is never reached (probe 2
 *    Q2: no `*-error`, no `[role=alert]`, the form unchanged, 0 accept calls). Test 7 pins that.
 * 3. A failed check has exactly one face: a 400, a 404 **and a 200 whose body the app's own `inviteVerifiedSchema`
 *    refuses** all end in the same `INVALID_INVITATION` card (probe 1 P4, P14) — the page never distinguishes "wrong code"
 *    from "the API answered something unusable". Test 6 pins all three.
 * 4. The follow-up reads never make the submit busy: `acceptInvitationLoading` is only the accept mutation's `isPending`
 *    (`use-invite-validation.ts:75`), so while `GET /api/user-organization` is unanswered the button is enabled and not busy
 *    (`…probe-3.log` R2 `submit.disabled=false, busy=null`), and the "workspace opening" card above never shows. Test 10
 *    pins both halves.
 * 5. The accept's answer never reaches NextAuth on this lane: the jar holds the Gauzy cookies plus NextAuth's own
 *    `authjs.callback-url` / `authjs.csrf-token`, and **no `authjs.session-token`** (`…probe-2.log` Q6) — the signed-in
 *    shell runs on the Gauzy cookies only.
 * 6. Because the token this file serves is not a Gauzy token, the signed-in landing logs two named lines: the shell
 *    decoding its `auth-token` cookie fails (`core/lib/auth/jwt-utils.ts:58`), and the shell's own attempt to switch the
 *    token to the active team's organization is refused by the lane mock's tenant guard
 *    (`core/lib/auth/token-organization.ts:68-88` → `mock-gauzy-server.mjs:617-624`, which grants an organization only of
 *    the request's own tenant). Both are excused by their exact text, and only in the three cases that land signed in
 *    (tests 8, 10 and 12 phase 1).
 * 7. A second-factor refusal is **not** a failure for the form: `use-accept-invite.ts:58-61` returns
 *    `SECOND_FACTOR_ASKED`, `form.tsx:63-65` treats that as not its business, so the 403 logs the client's critical line,
 *    no `Failed to accept invitation:` line and no `auth.invite.FAILED` notice (test 11).
 * 8. `Back to sign in` from the code step discards everything typed: the form remounts with empty name and passwords, the
 *    terms unticked and the submit disabled (`…probe-3.log` R3 `afterBack`), while the sidebar scene keeps the name from the
 *    page component's own `typedName` (`page-component.tsx:131`). Test 11 pins it.
 * 9. The organization the invitation named is only a **filter with a fallback**: `use-accept-invite.ts:85-88` takes
 *    `items.find((el) => el.organization?.name === invitationState.data.organization.name) || items[0]`, so when the
 *    organization list does not hold it the person is signed into whatever the API's own lists say anyway. On this lane the
 *    mock lists no organization for `GET /api/user-organization` (the catch-all `pagination([])`) yet answers
 *    `GET /api/organization-team` with its fixture team (`mock-gauzy-server.mjs:895`, `:655`), so the accept still ends
 *    signed in — on the mock's team, with the invitation's organization name nowhere on the landing
 *    (`…probe-4.log` D1: `h1 = ["Fixture Team A"]`, `auth-tenant-id` = the served tenant, no `Probe Fourth Org`). Test 12
 *    phase 1 pins that.
 * 10. An empty **team** list is not handled: `teams.items?.[0]` is taken and `team.id` (`use-accept-invite.ts:102`) throws a
 *     `TypeError`, `setAuthCookies` (`:110`) never runs, the person is told nothing (the crash is only logged, `:112`), and
 *     `/` sends them to the sign-in page (`…probe-4.log` D2 documents `200 → 307 → /auth/passcode 200` with every session
 *     cookie empty). Test 12 phase 2 pins that.
 *
 * ## Console lines this file excuses, each named in full
 *
 * - `SHELL_STORE_NOISE` — React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`).
 * - `LOCAL_API_HEALTH_CHECK_TIMEOUT` — the shell's own probe of the app's local API timing out while the dev server is
 *   busy (`core/services/client/api/default.ts:42`), excused exactly as `suites/lane-b/profile-settings-ui.spec.ts:281`
 *   excuses it, and never by a shorter prefix.
 * - `JWT_DECODE_FAILURE` and `TOKEN_SWITCH_REFUSED` — the two lines finding 6 explains, excused only in the three tests
 *   that land signed in (8, 10 and 12 phase 1).
 * - `MISSING_PARAMS_LOG`, `SCHEMA_REFUSAL_LOG`, `EMPTY_TEAM_LIST_CRASH` (finding 10, test 12 phase 2), and the armed
 *   refusals (`armedHttpError` / `armedForbiddenError` / `armedMutationFailure` / `armedValidateFailure` /
 *   `armedAcceptFailure`), each carrying the exact verb, service path, status or message this file itself sent.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** English, read from `locales/en.json` by key — never retyped as a literal in a test. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: {
		invite: Record<string, string>;
		field: Record<string, string>;
		password: Record<string, string>;
		twoFactor: Record<string, string>;
		signIn: Record<string, string>;
		signUp: { SIGN_IN: string };
		scene: Record<string, string>;
	};
	errors: { PASSWORDS_DO_NOT_MATCH: string };
	form: { AGREE_TO: string };
	layout: { footer: { TERMS_AND_CONDITIONS: string } };
	common: { JOIN_REQUEST: string };
	pages: {
		invite: {
			acceptInvite: {
				messages: {
					INVALID_INVITATION: { TITLE: string; DESCRIPTION: string };
					WORKSPACE_NOT_EXIST: { TITLE: string; DESCRIPTION: string };
				};
			};
		};
	};
};

const COPY = {
	joinRequest: EN.common.JOIN_REQUEST,
	namePlaceholder: EN.auth.field.NAME_PLACEHOLDER,
	passwordPlaceholder: EN.auth.field.PASSWORD_PLACEHOLDER,
	minLengthRule: EN.auth.password.RULE_MIN_LENGTH,
	ruleMatch: EN.auth.password.RULE_MATCH,
	ruleMet: EN.auth.password.RULE_MET,
	ruleNotMet: EN.auth.password.RULE_NOT_MET,
	passwordsDoNotMatch: EN.errors.PASSWORDS_DO_NOT_MATCH,
	terms: EN.layout.footer.TERMS_AND_CONDITIONS,
	inviteChecking: EN.auth.invite.CHECKING,
	inviteFailed: EN.auth.invite.FAILED,
	invalidInvitation: EN.pages.invite.acceptInvite.messages.INVALID_INVITATION,
	workspaceNotExist: EN.pages.invite.acceptInvite.messages.WORKSPACE_NOT_EXIST,
	signInLink: EN.auth.signUp.SIGN_IN,
	signInDescription: EN.auth.signIn.CODE_DESCRIPTION,
	sceneTitle: EN.auth.scene.INVITE_TITLE,
	twoFactorTitle: EN.auth.twoFactor.TITLE,
	twoFactorCodeLabel: EN.auth.twoFactor.CODE_LABEL,
	twoFactorSubmit: EN.auth.twoFactor.SUBMIT,
	twoFactorBack: EN.auth.twoFactor.BACK,
	twoFactorUseRecovery: EN.auth.twoFactor.USE_RECOVERY,
	twoFactorWrongCode: EN.auth.twoFactor.WRONG_CODE
};

/** `auth.invite.TITLE` = "Join {organization}". */
const filled = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

/** `auth.password.RULE_MIN_LENGTH` = `{count, plural, one {At least # character} other {At least # characters}}`, rendered
 * the way next-intl renders it. */
const pluralOf = (template: string, count: number) => {
	const branches = template.match(/(one|other) \{[^{}]*\}/g) ?? [];
	const chosen = branches.find((branch) => branch.startsWith(count === 1 ? 'one ' : 'other ')) ?? template;
	return chosen
		.replace(/^(one|other) \{/, '')
		.replace(/\}$/, '')
		.replaceAll('#', String(count));
};

/** `core/lib/utils/password-strength.ts:8`. */
const PASSWORD_MIN_LENGTH = 8;
/** `core/lib/auth/two-factor.ts:4`. */
const TWO_FACTOR_CODE_LENGTH = 6;

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a accept-invite] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1084-1096`), restated on every answer written below. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const VALIDATE_ROUTE = '/api/invite/validate-by-code';
const ACCEPT_ROUTE = '/api/invite/accept';
const ORGANIZATIONS_ROUTE = '/api/user-organization';
const TEAMS_ROUTE = '/api/organization-team';
const TWO_FACTOR_VERIFY_ROUTE = '/api/auth/two-factor/verify';

/** Everything below is this file's own invention: no real credential, and an answer's token is only ever compared. */
const INVITED_EMAIL = 'lane-a-invitee@ever.example';
const INVITE_CODE = 'LAA1B2C34';
const INVITED_NAME = 'Lane Invitee Person';
const FIRST_NAME = 'Lane Invitee';
const LAST_NAME = 'Person';
const TYPED_PASSWORD = 'LaneInvite!8';
const ORGANIZATION_NAME = 'Lane A Invite Org';
const TEAM_NAME = 'Lane A Invite Team';
const TERMS_HREF = 'https://ever.team/tos';
const USER_ID = '2f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const USER_ORGANIZATION_ID = '3f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const ORGANIZATION_ID = '4f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const TEAM_ID = '5f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const INVITE_ID = '1f1c3d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const TENANT_ID = 'lane-a-tenant';
const TWO_FACTOR_CHALLENGE = 'lane-a-second-factor-challenge';

/** `inviteVerifiedSchema` (`invite.schema.ts:65-74`); a null `fullName` is what an e-mail invitation carries. */
const VALIDATE_ANSWER = {
	id: INVITE_ID,
	email: INVITED_EMAIL,
	fullName: null,
	organization: { name: ORGANIZATION_NAME, image: null }
};
/** `invitationAcceptedResponse` (`:104-112`): `user` (`userSchema`, `core/types/schemas/user/user.schema.ts:121`), `token`,
 * `refresh_token?`, `team?`. `token` is a three-part string of this file, not a signed Gauzy JWT (finding 6). */
const acceptedAnswer = () => ({
	user: { id: USER_ID, tenantId: TENANT_ID, email: INVITED_EMAIL, firstName: FIRST_NAME, lastName: LAST_NAME },
	token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsYW5lLWEtaW52aXRlZSJ9.lane-a-signature',
	refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsYW5lLWEtcmVmcmVzaCJ9.lane-a-signature'
});
/** `userOrganizationSchema` is `.strict()` and needs `id` (a uuid) and `isDefault`
 * (`core/types/schemas/organization/user-organization.schema.ts:8-27`); the `organization` relation is what
 * `use-accept-invite.ts:85-88` matches the invitation's organization name against, and `organizationId` is what ends up in
 * the `auth-organization-id` cookie (`:105`). */
const ORGANIZATIONS_ANSWER = {
	items: [
		{
			id: USER_ORGANIZATION_ID,
			userId: USER_ID,
			isDefault: true,
			tenantId: TENANT_ID,
			organizationId: ORGANIZATION_ID,
			organization: {
				id: ORGANIZATION_ID,
				name: ORGANIZATION_NAME,
				isDefault: true,
				profile_link: 'lane-a-invite-org',
				totalEmployees: 1,
				banner: null
			}
		}
	],
	total: 1
};
/** `organizationTeamSchema` (`core/types/schemas/team/organization-team.schema.ts:46-84`): `id` (a uuid) and `name`. */
const TEAMS_ANSWER = {
	items: [{ id: TEAM_ID, name: TEAM_NAME, tenantId: TENANT_ID, organizationId: ORGANIZATION_ID }],
	total: 1
};
/** An account that belongs to no organization and no team; also exactly what the lane mock's catch-all answers
 * (`mock-gauzy-server.mjs:895` `pagination([])`), which probe 4 D1 measured on the wire. */
const EMPTY_LIST = { items: [], total: 0 };

/** An armed refusal, with its message kept beside the answer so a test can name it in its console excuse. */
const refusal = (status: number, message: string) => ({ status, message, body: { statusCode: status, message } });

type ServedAnswer = { status: number; body: unknown };

/** Read by the handler at call time, so a test can re-arm an answer without touching the routes. */
type ServedPlan = {
	validate?: ServedAnswer;
	/** Outstanding until the test resolves it: the page waits on the answer. */
	validateHold?: Promise<void>;
	accept?: ServedAnswer;
	acceptHold?: Promise<void>;
	/** Routed here so they can be recorded; test 8 answers them, test 12 phase 1 lets them through (see below). */
	followUpReads?: boolean;
	/** Recorded here, then handed to the lane mock with `route.continue()`: the mock's own answer is what the page acts on. */
	readsToMock?: boolean;
	/** Answered here with `{ items: [], total: 0 }` — what an account with no organization and no team gets (test 12 phase 2). */
	emptyReads?: boolean;
	readsHold?: Promise<void>;
	twoFactorVerify?: ServedAnswer;
};

type ServedCall = { method: string; path: string; search: string; body: string | null };

type InviteHarness = {
	calls: ServedCall[];
	/** False while the accept's answer is held: the witness that an assertion ran mid-call. */
	readonly acceptAnswered: boolean;
	countOf: (method: string, path: string) => number;
	bodyOf: (method: string, path: string) => Record<string, unknown> | null;
	indexOf: (method: string, path: string) => number;
	describe: () => string;
};

/** This file's stand-in for the two invitation calls, and for the follow-up reads and the code step's verify when asked. */
async function serveInvites(page: Page, plan: ServedPlan): Promise<InviteHarness> {
	const calls: ServedCall[] = [];
	const paths = [VALIDATE_ROUTE, ACCEPT_ROUTE];
	if (plan.followUpReads) paths.push(ORGANIZATIONS_ROUTE, TEAMS_ROUTE);
	if (plan.twoFactorVerify) paths.push(TWO_FACTOR_VERIFY_ROUTE);
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && paths.includes(url.pathname);

	const state = { acceptAnswered: true };

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

		if (url.pathname === VALIDATE_ROUTE) {
			const served = plan.validate ?? { status: 200, body: VALIDATE_ANSWER };
			if (plan.validateHold) await plan.validateHold;
			return answer(served.status, served.body);
		}
		if (url.pathname === ACCEPT_ROUTE) {
			const served = plan.accept ?? { status: 200, body: acceptedAnswer() };
			if (plan.acceptHold) {
				state.acceptAnswered = false;
				await plan.acceptHold;
			}
			state.acceptAnswered = true;
			return answer(served.status, served.body);
		}
		if (url.pathname === ORGANIZATIONS_ROUTE) {
			// recorded above, then handed on: the mock answers it, and its own log proves the answer was the mock's
			if (plan.readsToMock) return route.continue();
			if (plan.readsHold) await plan.readsHold;
			return answer(200, plan.emptyReads ? EMPTY_LIST : ORGANIZATIONS_ANSWER);
		}
		if (url.pathname === TEAMS_ROUTE) {
			if (plan.readsToMock) return route.continue();
			return answer(200, plan.emptyReads ? EMPTY_LIST : TEAMS_ANSWER);
		}
		if (url.pathname === TWO_FACTOR_VERIFY_ROUTE) {
			const served = plan.twoFactorVerify ?? refusal(401, 'lane-a code refused');
			return answer(served.status, served.body);
		}
		return answer(599, { statusCode: 599, message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		get acceptAnswered() {
			return state.acceptAnswered;
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

const openInvitePage = async (page: Page, query: string) => {
	await page.context().clearCookies();
	await page.goto(`${APP_ORIGIN}/auth/accept-invite${query}`, { waitUntil: 'domcontentloaded' });
};

const nameField = (page: Page) => page.locator('#accept-invite-name');
const passwordField = (page: Page) => page.locator('#accept-invite-password');
const confirmField = (page: Page) => page.locator('#accept-invite-confirm');
/** Base UI's box: the id sits on the hidden input, this span is what a pointer can reach. */
const termsBox = (page: Page) => page.locator('[data-slot="checkbox"]');
const joinButton = (page: Page) => page.getByRole('button', { name: COPY.joinRequest, exact: true });
const fieldError = (page: Page, id: string) => page.locator(`#${id}-error`);
const ruleRow = (page: Page, label: string) => page.getByRole('listitem').filter({ hasText: label });
/** The `AuthNotice` a refused accept leaves in the form (`form.tsx:168`), kept apart from a field's own error line. */
const failedNotice = (page: Page) => page.getByRole('alert').filter({ hasText: COPY.inviteFailed });
/** The `AuthState` card: `role="alert"` for a warning, `role="status"` + `aria-busy` while loading. */
const stateCard = (page: Page, role: 'alert' | 'status') => page.locator(`section[role="${role}"]`);
/** The invitation address, spelled once for the tests that assert the page never left it. */
const inviteUrlOf = (code: string, email: string) => `${APP_ORIGIN}/auth/accept-invite?code=${code}&email=${email}`;
const inviteTitle = (page: Page) =>
	page.getByRole('heading', { level: 1, name: filled(EN.auth.invite.TITLE, { organization: ORGANIZATION_NAME }) });

const tickTerms = async (page: Page) => {
	await termsBox(page).click({ timeout: 15_000 });
	await expect(termsBox(page), 'the terms checkbox did not take the click').toHaveAttribute('aria-checked', 'true');
};

/** Polls the call log instead of reading it once: a call is waited for, never assumed from some text appearing. */
const waitForCall = async (harness: InviteHarness, method: string, path: string) => {
	await expect
		.poll(() => harness.countOf(method, path), {
			timeout: 30_000,
			message: `no ${method} ${path} was sent; the page sent: ${harness.describe()}`
		})
		.toBeGreaterThan(0);
};

/** Polls for a call that must come **after** an index in the log, so a read is never matched to an earlier call. */
const waitForCallAfter = async (harness: InviteHarness, method: string, path: string, afterIndex: number) => {
	await expect
		.poll(() => harness.calls.slice(afterIndex + 1).some((call) => call.method === method && call.path === path), {
			timeout: 30_000,
			message: `no ${method} ${path} after index ${afterIndex}; the page sent: ${harness.describe()}`
		})
		.toBe(true);
};

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own local-API health probe timing out while the dev server is busy
 * (`core/services/client/api/default.ts:42`), excused by this whole line, exactly as
 * `suites/lane-b/profile-settings-ui.spec.ts:281` excuses it — never by a shorter prefix. */
const LOCAL_API_HEALTH_CHECK_TIMEOUT = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/** `core/lib/auth/jwt-utils.ts:58`, named in full as `suites/lane-b/profile-settings-ui.spec.ts:261-263` names it: the
 * shell decodes the `auth-token` cookie, and the token this file answers is not a signed Gauzy JWT (finding 6). */
const JWT_DECODE_FAILURE = '[JWT] Failed to decode token:';
/** `core/lib/auth/token-organization.ts:88`, reached because the lane mock grants a switch only for an organization of the
 * request's own tenant (`cypress/support/mock-gauzy-server.mjs:617-624`) and this file's tenant is not the mock's (finding 6). */
const TOKEN_SWITCH_REFUSED =
	'[Auth] Could not switch the token to the organization of the active team: ApiError: Unauthorized';
/** The client's own HTTP error line for a refusal this file armed (`core/services/logs/logger-adapter.service.ts:198`). */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
/** The same logger's louder line for a 403 (`logger-adapter.service.ts:194-197`). */
const armedForbiddenError = (verb: string, path: string) =>
	`[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path} - Permission Denied`;
/** The dev-mode mutation toaster, named with the exact message the armed stub sent. */
const armedMutationFailure = (message: string) => `Mutation failed: ApiError: ${message}`;
/** `use-accept-invite.ts:146` and the form's `:70`, each printed with the exact message this file served. */
const armedValidateFailure = (message: string) => `Failed to validate invitation: ApiError: ${message}`;
const armedAcceptFailure = (message: string) => `Failed to accept invitation: ApiError: ${message}`;
/** `invite.service.ts` logging a 200 its own schema refused (probe 1 P14). */
const SCHEMA_REFUSAL_LOG = '[ERROR] [InviteService] Validate invitation by code and email validation failed:';
/** `validateApiResponse`'s message, rethrown by the same two hook lines as an `ApiError` becomes a `ValidationError`. */
const SCHEMA_REFUSAL_MESSAGE =
	'Validation failed in validateInvitationByCodeAndEmail API response: organization: Invalid input: expected object, received undefined';
/** `page-component.tsx:111`. */
const MISSING_PARAMS_LOG = 'Missing parameters: code and/or email';
/** `use-accept-invite.ts:112` logging the `team.id` crash of `:102`, reached when the team list comes back empty
 * (finding 10, test 12 phase 2; probe 4 D2 measured exactly this one line). */
const EMPTY_TEAM_LIST_CRASH = "Accept invitation error: TypeError: Cannot read properties of undefined (reading 'id')";

/** Everything the lane itself logs, whatever a test does (`SHELL_STORE_NOISE` and the health-probe timeout). */
const LANE_NOISE = [SHELL_STORE_NOISE, LOCAL_API_HEALTH_CHECK_TIMEOUT];

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !LANE_NOISE.some((noise) => line.includes(noise)))
		.filter((line) => !expected.some((text) => line.includes(text)));

const fillTheForm = async (page: Page) => {
	await tickTerms(page);
	await nameField(page).fill(INVITED_NAME, { timeout: 15_000 });
	await passwordField(page).fill(TYPED_PASSWORD, { timeout: 15_000 });
	await confirmField(page).fill(TYPED_PASSWORD, { timeout: 15_000 });
	await joinButton(page).click({ timeout: 15_000 });
};

test.describe('lane-a · /auth/accept-invite: what the invited person sees and what the browser sends', () => {
	test('1 · an address with no code: the expired card, its Sign in link, and no invitation check', async ({
		page,
		shield
	}) => {
		const harness = await serveInvites(page, {});
		await openInvitePage(page, `?email=${INVITED_EMAIL}`);

		const card = stateCard(page, 'alert');
		await expect(card.getByRole('heading', { level: 1, name: COPY.invalidInvitation.TITLE })).toBeVisible();
		await expect(card).toContainText(COPY.invalidInvitation.DESCRIPTION);
		await expect(card.getByRole('link', { name: COPY.signInLink, exact: true })).toHaveAttribute(
			'href',
			'/auth/passcode'
		);
		await expect(inviteTitle(page)).toHaveCount(0);

		// the card is the page's own answer to the missing code, so a check would already be in the log: this 1.5 s window
		// proves none was sent
		await page.waitForTimeout(1_500);
		report('missing code', { calls: harness.describe() });
		expect(harness.calls, `an address with no code still sent something: ${harness.describe()}`).toEqual([]);
		expect(
			consoleFindings(shield, [MISSING_PARAMS_LOG]),
			`the missing-code page logged more than its own missing-parameter line: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('2 · an address with no e-mail: the same card, and no invitation check', async ({ page, shield }) => {
		const harness = await serveInvites(page, {});
		await openInvitePage(page, `?code=${INVITE_CODE}`);

		const card = stateCard(page, 'alert');
		await expect(card.getByRole('heading', { level: 1, name: COPY.invalidInvitation.TITLE })).toBeVisible();
		await expect(card).toContainText(COPY.invalidInvitation.DESCRIPTION);
		await expect(card.getByRole('link', { name: COPY.signInLink, exact: true })).toHaveAttribute(
			'href',
			'/auth/passcode'
		);

		// same as test 1: the card is the positive signal, and the 1.5 s window proves nothing was sent
		await page.waitForTimeout(1_500);
		report('missing email', { calls: harness.describe() });
		expect(harness.calls, `an address with no e-mail still sent something: ${harness.describe()}`).toEqual([]);
		expect(
			consoleFindings(shield, [MISSING_PARAMS_LOG]),
			`the missing-address page logged more than its own missing-parameter line: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('3 · a valid code and e-mail: what is posted, and the screen the answer paints', async ({ page, shield }) => {
		const harness = await serveInvites(page, {});
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);

		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		const body = harness.bodyOf('POST', VALIDATE_ROUTE) ?? {};
		report('validate body', { keys: Object.keys(body).sort(), code: body.code, email: body.email });
		expect(body, `the validate body held ${Object.keys(body).sort().join(', ')} instead of code and email`).toEqual(
			{
				code: INVITE_CODE,
				email: INVITED_EMAIL
			}
		);
		expect(harness.countOf('POST', VALIDATE_ROUTE), `the check ran more than once: ${harness.describe()}`).toBe(1);

		await expect(inviteTitle(page)).toBeVisible();
		// `auth.invite.DESCRIPTION` = "The invitation was sent to <address>{email}</address>. Choose your name and a
		// password to join." — the part before the address, taken from the key, and the served address inside it
		const descriptionStart = EN.auth.invite.DESCRIPTION.split('<address>')[0];
		await expect(
			page.locator('p').filter({ hasText: descriptionStart }).first(),
			'the heading description did not name the served address'
		).toContainText(INVITED_EMAIL);

		await expect(nameField(page)).toHaveValue('');
		await expect(nameField(page)).toHaveAttribute('placeholder', COPY.namePlaceholder);
		// the `required` the browser enforces on this field (`form.tsx:121`), read as the property, as probe 1 P1 measured it
		expect(await nameField(page).evaluate((node) => (node as HTMLInputElement).required)).toBe(true);
		await expect(passwordField(page)).toHaveValue('');
		await expect(passwordField(page)).toHaveAttribute('placeholder', COPY.passwordPlaceholder);
		await expect(confirmField(page)).toHaveAttribute('placeholder', COPY.passwordPlaceholder);
		await expect(page.getByText(pluralOf(COPY.minLengthRule, PASSWORD_MIN_LENGTH), { exact: true })).toBeVisible();
		await expect(page.getByText(COPY.ruleMatch, { exact: true })).toBeVisible();
		await expect(ruleRow(page, pluralOf(COPY.minLengthRule, PASSWORD_MIN_LENGTH))).toContainText(COPY.ruleNotMet);
		await expect(ruleRow(page, COPY.ruleMatch)).toContainText(COPY.ruleNotMet);
		// the terms gate: unticked, the submit is disabled (`form.tsx:97-98`)
		await expect(termsBox(page)).toHaveAttribute('aria-checked', 'false');
		await expect(joinButton(page)).toBeDisabled();
		await expect(page.getByRole('link', { name: COPY.terms, exact: true })).toHaveAttribute('href', TERMS_HREF);
		// the sidebar scene names the served organization
		await expect(page.getByText(COPY.sceneTitle, { exact: true })).toBeVisible();
		await expect(page.getByText(ORGANIZATION_NAME, { exact: true }).first()).toBeVisible();

		// the validated screen is on screen, so an accept would already be in the log: this 1.5 s window proves there is
		// none, and that a clean check logs nothing
		await page.waitForTimeout(1_500);
		report('validated screen', { calls: harness.describe() });
		expect(
			harness.countOf('POST', ACCEPT_ROUTE),
			`the page accepted without being asked: ${harness.describe()}`
		).toBe(0);
		expect(
			consoleFindings(shield),
			`a clean validated page logged: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('4 · a code carrying a /… suffix: only the part before the slash is validated', async ({ page, shield }) => {
		const harness = await serveInvites(page, {});
		await openInvitePage(page, `?code=${INVITE_CODE}%2Ffrom-the-e-mail-link&email=${INVITED_EMAIL}`);

		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		const body = harness.bodyOf('POST', VALIDATE_ROUTE) ?? {};
		report('suffixed code sent', { code: body.code });
		// `page-component.tsx:63` cuts the address's code at '/' before the check runs
		expect(body, `the suffixed code was not cut at the slash: ${body.code}`).toEqual({
			code: INVITE_CODE,
			email: INVITED_EMAIL
		});
		await expect(inviteTitle(page)).toBeVisible();
		expect(
			consoleFindings(shield),
			`the suffixed-code page logged: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('5 · the invitation check held unanswered: the page waits in its loading tone', async ({ page, shield }) => {
		let release: () => void = () => undefined;
		const hold = new Promise<void>((resolve) => {
			release = resolve;
		});
		const harness = await serveInvites(page, { validateHold: hold });
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);

		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		const loading = stateCard(page, 'status');
		await expect(loading).toHaveAttribute('aria-busy', 'true');
		await expect(loading.getByRole('heading', { level: 1, name: COPY.inviteChecking })).toBeVisible();
		// nothing else of the page is offered while the answer is outstanding (the loading card above is the positive signal)
		await expect(nameField(page)).toHaveCount(0);

		release();
		await expect(nameField(page), 'the form never arrived after the check answered').toBeVisible();
		expect(
			harness.countOf('POST', VALIDATE_ROUTE),
			`a held check was sent more than once: ${harness.describe()}`
		).toBe(1);
		report('held check', { calls: harness.describe() });
		expect(consoleFindings(shield), `the held-check page logged: ${shield.consoleErrors().join(' || ')}`).toEqual(
			[]
		);
	});

	test("6 · the check refused 400, then 404, then a 200 the app's own schema refuses: one card each time", async ({
		page,
		shield
	}) => {
		const fourHundred = refusal(400, 'lane-a check refused four hundred');
		const fourOhFour = refusal(404, 'lane-a check refused four oh four');
		// a 200 that `inviteVerifiedSchema` refuses: no `organization` (`invite.schema.ts:65-74`)
		const schemaRefusal = { status: 200, body: { id: INVITE_ID, email: INVITED_EMAIL, fullName: null } };
		const plan: ServedPlan = { validate: fourHundred };
		const harness = await serveInvites(page, plan);
		const card = stateCard(page, 'alert');

		const expectExpiredCard = async () => {
			await expect(card.getByRole('heading', { level: 1, name: COPY.invalidInvitation.TITLE })).toBeVisible();
			await expect(card).toContainText(COPY.invalidInvitation.DESCRIPTION);
			await expect(card.getByRole('link', { name: COPY.signInLink, exact: true })).toHaveAttribute(
				'href',
				'/auth/passcode'
			);
			await expect(nameField(page)).toHaveCount(0);
		};

		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await expectExpiredCard();
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		expect(
			harness.countOf('POST', VALIDATE_ROUTE),
			`the 400 case sent more than one check: ${harness.describe()}`
		).toBe(1);

		// the same address and page, a refused 404 this time (the plan is read per call, so no route is touched)
		harness.calls.length = 0;
		plan.validate = fourOhFour;
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await expectExpiredCard();
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		expect(
			harness.countOf('POST', VALIDATE_ROUTE),
			`the 404 case sent more than one check: ${harness.describe()}`
		).toBe(1);

		// and the same address answered 200 with something the app's own schema refuses (finding 3)
		harness.calls.length = 0;
		plan.validate = schemaRefusal;
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await expectExpiredCard();
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		expect(
			harness.countOf('POST', VALIDATE_ROUTE),
			`the schema refusal sent more than one check: ${harness.describe()}`
		).toBe(1);

		report('refused checks', { statuses: [fourHundred.status, fourOhFour.status, schemaRefusal.status] });
		expect(
			consoleFindings(shield, [
				armedHttpError('POST', '/invite/validate-by-code', fourHundred.status),
				armedHttpError('POST', '/invite/validate-by-code', fourOhFour.status),
				armedMutationFailure(fourHundred.message),
				armedMutationFailure(fourOhFour.message),
				armedValidateFailure(fourHundred.message),
				armedValidateFailure(fourOhFour.message),
				SCHEMA_REFUSAL_LOG,
				`Mutation failed: ValidationError: ${SCHEMA_REFUSAL_MESSAGE}`,
				`Failed to validate invitation: ValidationError: ${SCHEMA_REFUSAL_MESSAGE}`
			]),
			`a refused check logged more than the three refusals this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('7 · what the form refuses before it sends anything: the terms gate, an empty name, a short password, two that differ', async ({
		page,
		shield
	}) => {
		const harness = await serveInvites(page, {});
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await expect(nameField(page)).toBeVisible();

		// the terms gate first: unticked, the submit is disabled, so nothing below it can even be attempted
		await expect(joinButton(page)).toBeDisabled();
		await tickTerms(page);
		await expect(joinButton(page)).toBeEnabled();

		// an empty name: the field's own `required` (no `noValidate` on the form, `form.tsx:111`) cancels the submit inside
		// the browser, so `handleSubmit` never runs and the app shows nothing of its own (finding 2)
		await joinButton(page).click({ timeout: 15_000 });
		await expect(fieldError(page, 'accept-invite-name')).toHaveCount(0);
		await expect(failedNotice(page)).toHaveCount(0);

		// a password shorter than PASSWORD_MIN_LENGTH
		const minLengthText = pluralOf(COPY.minLengthRule, PASSWORD_MIN_LENGTH);
		await nameField(page).fill(INVITED_NAME, { timeout: 15_000 });
		await passwordField(page).fill('short', { timeout: 15_000 });
		await confirmField(page).fill('short', { timeout: 15_000 });
		await joinButton(page).click({ timeout: 15_000 });
		await expect(fieldError(page, 'accept-invite-password')).toHaveText(minLengthText);
		await expect(passwordField(page)).toHaveAttribute('aria-describedby', 'accept-invite-password-error');
		// the rule list under the fields: length unmet; the match rule met, because the two typed values are equal
		await expect(ruleRow(page, minLengthText)).toContainText(COPY.ruleNotMet);
		await expect(ruleRow(page, COPY.ruleMatch)).toContainText(COPY.ruleMet);

		// both long enough but different (`form.tsx:55-58`; every submit starts from `setErrors(NO_ERRORS)` `:47`)
		await passwordField(page).fill(`${TYPED_PASSWORD}x`, { timeout: 15_000 });
		await confirmField(page).fill(TYPED_PASSWORD, { timeout: 15_000 });
		await joinButton(page).click({ timeout: 15_000 });
		await expect(fieldError(page, 'accept-invite-confirm')).toHaveText(COPY.passwordsDoNotMatch);
		await expect(fieldError(page, 'accept-invite-password')).toHaveCount(0);
		await expect(ruleRow(page, minLengthText)).toContainText(COPY.ruleMet);
		await expect(ruleRow(page, COPY.ruleMatch)).toContainText(COPY.ruleNotMet);

		// every refusal above is on screen, so an accept would have been recorded by now: this 1.5 s window proves none was
		await page.waitForTimeout(1_500);
		report('refused forms', { calls: harness.describe() });
		expect(
			harness.countOf('POST', ACCEPT_ROUTE),
			`a refused form still reached the API: ${harness.describe()}`
		).toBe(0);
		expect(
			harness.countOf('POST', VALIDATE_ROUTE),
			`a refused form checked the invitation again: ${harness.describe()}`
		).toBe(1);
		expect(consoleFindings(shield), `the refused forms logged: ${shield.consoleErrors().join(' || ')}`).toEqual([]);
	});

	test('8 · a good form: the accept body, the reads it triggers, the cookies it writes, and the page it lands on', async ({
		page,
		shield
	}) => {
		const harness = await serveInvites(page, { followUpReads: true });
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);

		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		const acceptAt = harness.indexOf('POST', ACCEPT_ROUTE);
		const body = harness.bodyOf('POST', ACCEPT_ROUTE) ?? {};
		const user = (body.user ?? {}) as Record<string, unknown>;
		report('accept body', { keys: Object.keys(body).sort(), userKeys: Object.keys(user).sort() });
		// `page-component.tsx:76-95` splits the typed name; `invite.service.ts:316-336` adds no tenant or organization ids
		expect(body, `the accept body held ${Object.keys(body).sort().join(', ')}`).toEqual({
			user: { firstName: FIRST_NAME, lastName: LAST_NAME, email: INVITED_EMAIL },
			password: TYPED_PASSWORD,
			code: INVITE_CODE,
			email: INVITED_EMAIL
		});

		// the two reads `use-accept-invite.ts:73,90` make after the accept answered, each found after that accept in the log
		await waitForCallAfter(harness, 'GET', ORGANIZATIONS_ROUTE, acceptAt);
		await waitForCallAfter(harness, 'GET', TEAMS_ROUTE, acceptAt);
		const organizationsCall = harness.calls.slice(acceptAt + 1).find((call) => call.path === ORGANIZATIONS_ROUTE);
		const teamsCall = harness.calls.slice(acceptAt + 1).find((call) => call.path === TEAMS_ROUTE);
		report('follow-up reads', {
			organizationsSearch: organizationsCall?.search,
			teamsSearch: teamsCall?.search
		});
		expect(
			organizationsCall?.search ?? '',
			'the organization read did not ask for the served user and tenant'
		).toContain(USER_ID);
		expect(organizationsCall?.search ?? '').toContain(TENANT_ID);
		expect(teamsCall?.search ?? '', 'the team read did not ask for the served organization').toContain(
			ORGANIZATION_ID
		);

		// the cookies `setAuthCookies` writes (`use-accept-invite.ts:97-110` → `core/lib/helpers/cookies/index.ts:232-270`):
		// named here, values only ever compared, never printed
		const sessionCookies = [
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
					return sessionCookies.every(
						(name) => (jar.find((cookie) => cookie.name === name)?.value.length ?? 0) > 0
					);
				},
				{ timeout: 30_000, message: 'the accept wrote no session cookies' }
			)
			.toBe(true);
		const jar = await page.context().cookies();
		const cookieValue = (name: string) => jar.find((cookie) => cookie.name === name)?.value ?? '';
		expect(cookieValue('auth-active-team'), 'the active-team cookie is not the team this file served').toBe(
			TEAM_ID
		);
		expect(cookieValue('auth-organization-id'), 'the organization cookie is not the one this file served').toBe(
			ORGANIZATION_ID
		);
		expect(cookieValue('auth-user-id'), 'the user cookie is not the user this file served').toBe(USER_ID);
		expect(cookieValue('auth-tenant-id'), 'the tenant cookie is not the tenant this file served').toBe(TENANT_ID);
		// the accept's answer never reaches NextAuth on this lane (finding 5)
		expect(
			jar.some((cookie) => cookie.name === 'authjs.session-token'),
			'the accept wrote a NextAuth session cookie after all'
		).toBe(false);
		expect(
			jar.some((cookie) => cookie.name === 'authjs.csrf-token'),
			'the jar holds no NextAuth csrf cookie either'
		).toBe(true);
		report('landing cookies', { names: jar.map((cookie) => cookie.name).sort() });

		// `navigateAfterSignIn()` is a full page load of '/' (`navigate-after-sign-in.ts:21-45`), polled, never evaluated
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/`);
		await expect(
			page.getByRole('heading', { level: 1, name: TEAM_NAME }),
			'the landing page did not open the team this file served'
		).toBeVisible();
		await expect(nameField(page)).toHaveCount(0);

		expect(
			consoleFindings(shield, [JWT_DECODE_FAILURE, TOKEN_SWITCH_REFUSED]),
			`the signed-in landing logged more than the two lines this file's unsigned token causes: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('9 · the accept refused 400, then 500: the failure notice, what was typed kept, and no navigation', async ({
		page,
		shield
	}) => {
		const fourHundred = refusal(400, 'lane-a accept refused four hundred');
		const fiveHundred = refusal(500, 'lane-a accept refused five hundred');
		const plan: ServedPlan = { followUpReads: true, accept: fourHundred };
		const harness = await serveInvites(page, plan);
		const inviteUrl = inviteUrlOf(INVITE_CODE, INVITED_EMAIL);

		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);

		await expect(failedNotice(page), 'a refused accept showed no notice').toHaveText(COPY.inviteFailed);
		await expect(nameField(page)).toHaveValue(INVITED_NAME);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(confirmField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(termsBox(page)).toHaveAttribute('aria-checked', 'true');
		// the form stays usable: enabled, not busy, no spinner (`form.tsx:97-98`, `button.tsx:97-110`)
		await expect(joinButton(page)).toBeEnabled();
		await expect(joinButton(page)).not.toHaveAttribute('aria-busy', 'true');
		await expect(joinButton(page).locator('.animate-spin')).toHaveCount(0);
		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		expect(
			harness.countOf('POST', ACCEPT_ROUTE),
			`the 400 case sent more than one accept: ${harness.describe()}`
		).toBe(1);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(inviteUrl);

		// the same address and form, a 500 this time
		harness.calls.length = 0;
		plan.accept = fiveHundred;
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);

		await expect(failedNotice(page), 'the 500 refusal showed no notice').toHaveText(COPY.inviteFailed);
		await expect(nameField(page)).toHaveValue(INVITED_NAME);
		await expect(passwordField(page)).toHaveValue(TYPED_PASSWORD);
		await expect(joinButton(page)).toBeEnabled();
		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		expect(
			harness.countOf('POST', ACCEPT_ROUTE),
			`the 500 case sent more than one accept: ${harness.describe()}`
		).toBe(1);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(inviteUrl);
		// neither refusal signed anybody in: no active team in the jar
		expect(
			(await page.context().cookies()).some(
				(cookie) => cookie.name === 'auth-active-team' && cookie.value.length > 0
			),
			'a refused accept wrote an active team after all'
		).toBe(false);

		report('refused accepts', { statuses: [fourHundred.status, fiveHundred.status] });
		expect(
			consoleFindings(shield, [
				armedHttpError('POST', '/invite/accept', fourHundred.status),
				armedHttpError('POST', '/invite/accept', fiveHundred.status),
				armedMutationFailure(fourHundred.message),
				armedMutationFailure(fiveHundred.message),
				armedAcceptFailure(fourHundred.message),
				armedAcceptFailure(fiveHundred.message)
			]),
			`a refused accept logged more than the two refusals this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('10 · the accept held unanswered: the submit is busy and disabled mid-call, and its own reads do not make it busy', async ({
		page,
		shield
	}) => {
		let releaseAccept: () => void = () => undefined;
		let releaseReads: () => void = () => undefined;
		const acceptHold = new Promise<void>((resolve) => {
			releaseAccept = resolve;
		});
		const readsHold = new Promise<void>((resolve) => {
			releaseReads = resolve;
		});
		const harness = await serveInvites(page, { followUpReads: true, acceptHold, readsHold });
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);

		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		expect(harness.acceptAnswered, 'the held accept answered before this file could look at it').toBe(false);
		const submit = joinButton(page);
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await expect(submit).toBeDisabled();
		await expect(submit.locator('.animate-spin'), 'the busy submit showed no spinner').toHaveCount(1);
		// the whole form is still on screen while the call is outstanding
		await expect(nameField(page)).toHaveValue(INVITED_NAME);
		await expect(failedNotice(page)).toHaveCount(0);

		releaseAccept();
		await expect.poll(() => harness.acceptAnswered, { timeout: 30_000 }).toBe(true);
		const acceptAt = harness.indexOf('POST', ACCEPT_ROUTE);
		await waitForCallAfter(harness, 'GET', ORGANIZATIONS_ROUTE, acceptAt);
		// that read is still outstanding and the button is already back to normal (finding 4): not busy, not disabled, no
		// "workspace opening" card, and the page is still the invitation
		await expect(
			submit,
			'the follow-up read made the submit busy although the accept had already answered'
		).not.toHaveAttribute('aria-busy', 'true');
		await expect(submit).toBeEnabled();
		await expect(stateCard(page, 'status')).toHaveCount(0);
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(inviteUrlOf(INVITE_CODE, INVITED_EMAIL));

		releaseReads();
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/`);
		report('held accept', { calls: harness.describe() });
		expect(
			consoleFindings(shield, [JWT_DECODE_FAILURE, TOKEN_SWITCH_REFUSED]),
			`the landing logged more than the two lines this file's unsigned token causes: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test('11 · the accept asks for the second factor: the code step, its own call, and Back to an emptied form', async ({
		page,
		shield
	}) => {
		const challenge = refusal(403, 'lane-a accept asked for the second factor');
		const codeRefusal = refusal(401, 'lane-a code refused');
		const harness = await serveInvites(page, {
			followUpReads: true,
			accept: {
				status: challenge.status,
				body: {
					statusCode: challenge.status,
					message: challenge.message,
					code: 'TWO_FACTOR_REQUIRED',
					challenge: TWO_FACTOR_CHALLENGE,
					expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
				}
			},
			twoFactorVerify: codeRefusal
		});
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);

		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		await expect(
			page.getByRole('heading', { level: 1, name: COPY.twoFactorTitle }),
			'the accept that asked for a second factor showed no code step'
		).toBeVisible();
		await expect(failedNotice(page), 'the second-factor ask was treated as a failure').toHaveCount(0);
		const slots = page.locator('input[inputmode="numeric"]');
		await expect(slots, 'the code step did not offer one slot per code digit').toHaveCount(TWO_FACTOR_CODE_LENGTH);
		await expect(slots.first()).toHaveAttribute('maxlength', '1');
		await expect(page.getByText(COPY.twoFactorCodeLabel, { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: COPY.twoFactorSubmit, exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: COPY.twoFactorUseRecovery, exact: true })).toBeVisible();
		// `auth.twoFactor.DESCRIPTION` names the invitation's address, the same address the invitation was served for
		const codeDescriptionStart = EN.auth.twoFactor.DESCRIPTION.split('<address>')[0].replaceAll(
			'{length}',
			String(TWO_FACTOR_CODE_LENGTH)
		);
		await expect(
			page.locator('p').filter({ hasText: codeDescriptionStart }).first(),
			'the code step did not name the served address'
		).toContainText(INVITED_EMAIL);
		// the invitation's own scene stays in the sidebar
		await expect(page.getByText(COPY.sceneTitle, { exact: true })).toBeVisible();

		// six digits submit the step themselves (`two-factor-step.tsx:171-175`)
		await slots.first().pressSequentially('123456', { delay: 40 });
		await waitForCall(harness, 'POST', TWO_FACTOR_VERIFY_ROUTE);
		const verifyBody = harness.bodyOf('POST', TWO_FACTOR_VERIFY_ROUTE) ?? {};
		report('two-factor verify body', { keys: Object.keys(verifyBody).sort(), challenge: verifyBody.challenge });
		expect(verifyBody, `the code step sent challenge ${verifyBody.challenge} with code ${verifyBody.code}`).toEqual(
			{
				challenge: TWO_FACTOR_CHALLENGE,
				code: '123456'
			}
		);
		await expect(
			page.getByRole('alert').filter({ hasText: COPY.twoFactorWrongCode }),
			'a refused code said nothing'
		).toBeVisible();

		await page.getByRole('button', { name: COPY.twoFactorBack, exact: true }).click({ timeout: 15_000 });
		await expect(inviteTitle(page), 'Back did not return to the form').toBeVisible();
		// the form remounted, so everything typed is gone and the terms gate is shut again (finding 8)
		await expect(nameField(page)).toHaveValue('');
		await expect(passwordField(page)).toHaveValue('');
		await expect(confirmField(page)).toHaveValue('');
		await expect(termsBox(page)).toHaveAttribute('aria-checked', 'false');
		await expect(joinButton(page)).toBeDisabled();

		expect(
			harness.countOf('POST', ACCEPT_ROUTE),
			`the second-factor case accepted more than once: ${harness.describe()}`
		).toBe(1);
		expect(
			harness.countOf('GET', ORGANIZATIONS_ROUTE),
			`a challenged accept ran its follow-up reads anyway: ${harness.describe()}`
		).toBe(0);
		expect(
			consoleFindings(shield, [
				armedForbiddenError('POST', '/invite/accept'),
				armedMutationFailure(challenge.message),
				armedMutationFailure(codeRefusal.message)
			]),
			`the second-factor flow logged more than the refusals this file armed: ${shield.consoleErrors().join(' || ')}`
		).toEqual([]);
	});

	test("12 · what the follow-up lists decide: the mock's own team signs the person in, an empty list signs nobody in", async ({
		page,
		shield,
		mock
	}) => {
		// phase 1: this file answers only the two invitation calls and lets both follow-up reads through to the lane
		// mock, which lists no organization (`mock-gauzy-server.mjs:895`) but does list its own team (`:655`)
		const plan: ServedPlan = { followUpReads: true, readsToMock: true };
		const harness = await serveInvites(page, plan);

		// the mock's own answer to the organization read, read from where it is served (probe 4 D1: `{total: 0, items: []}`)
		const organizationLists: number[] = [];
		page.on('response', (response) => {
			const url = new URL(response.url());
			if (url.origin !== MOCK_API_ORIGIN || url.pathname !== ORGANIZATIONS_ROUTE) return;
			void response
				.json()
				.then((body) => {
					const items = (body as { items?: unknown[] }).items;
					if (Array.isArray(items)) organizationLists.push(items.length);
				})
				.catch(() => undefined);
		});

		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);
		await waitForCall(harness, 'POST', ACCEPT_ROUTE);

		// both reads were recorded here and answered by the mock: this file's log and the mock's log hold them alike
		await waitForCallAfter(harness, 'GET', ORGANIZATIONS_ROUTE, harness.indexOf('POST', ACCEPT_ROUTE));
		await waitForCallAfter(harness, 'GET', TEAMS_ROUTE, harness.indexOf('POST', ACCEPT_ROUTE));
		const mockPaths = await mock.paths();
		report('phase 1 mock paths', {
			mockPaths: mockPaths.filter((path) => path === ORGANIZATIONS_ROUTE || path === TEAMS_ROUTE),
			organizationLists
		});
		expect(
			mockPaths.some((path) => path === ORGANIZATIONS_ROUTE),
			`the mock never saw the organization read: ${mockPaths.join(' | ')}`
		).toBe(true);
		expect(
			mockPaths.some((path) => path === TEAMS_ROUTE),
			`the mock never saw the team read: ${mockPaths.join(' | ')}`
		).toBe(true);
		await expect
			.poll(() => organizationLists.length, {
				timeout: 30_000,
				message: "the mock's organization answer was never read"
			})
			.toBeGreaterThan(0);
		expect(organizationLists[0], 'the mock was expected to list no organization for this account').toBe(0);

		// and the accept still signed the person in — into the mock's team, not into the organization the invitation named
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/`);
		const landingHeading = page.getByRole('heading', { level: 1 }).first();
		await expect(landingHeading).toBeVisible();
		report('phase 1 landing heading', { heading: (await landingHeading.innerText()).trim() });
		await expect(landingHeading, 'the landing page opened no workspace at all').not.toHaveText('');
		await expect(landingHeading, 'the landing opened the organization the invitation named').not.toContainText(
			ORGANIZATION_NAME
		);
		await expect(page.getByText(ORGANIZATION_NAME, { exact: true })).toHaveCount(0);
		await expect(nameField(page)).toHaveCount(0);
		const phaseOneJar = await page.context().cookies();
		const phaseOneCookie = (name: string) => phaseOneJar.find((cookie) => cookie.name === name)?.value ?? '';
		report('phase 1 cookies', {
			tenantIdLength: phaseOneCookie('auth-tenant-id').length,
			activeTeamLength: phaseOneCookie('auth-active-team').length
		});
		// `setAuthCookies` (`use-accept-invite.ts:97-110`) ran with this file's accept answer …
		expect(phaseOneCookie('auth-tenant-id'), 'the tenant cookie is not the tenant this file served').toBe(
			TENANT_ID
		);
		// … and with the team id the mock's own list handed it (`:102,104`)
		expect(
			phaseOneCookie('auth-active-team').length,
			'no team id was written, so the mock listed no team'
		).toBeGreaterThan(0);

		// phase 2: the same invitation, the same page, but both lists answered empty — what an account with no
		// organization and no team gets
		harness.calls.length = 0;
		plan.readsToMock = false;
		plan.emptyReads = true;
		await openInvitePage(page, `?code=${INVITE_CODE}&email=${INVITED_EMAIL}`);
		await waitForCall(harness, 'POST', VALIDATE_ROUTE);
		await fillTheForm(page);
		await waitForCall(harness, 'POST', ACCEPT_ROUTE);
		await waitForCallAfter(harness, 'GET', TEAMS_ROUTE, harness.indexOf('POST', ACCEPT_ROUTE));

		// `teams.items?.[0]` is undefined and `team.id` (`:102`) throws, so `setAuthCookies` (`:110`) never runs and `/`
		// sends the visitor to the sign-in page (`…probe-4.log` D2: 200 → 307 → /auth/passcode 200)
		await expect.poll(() => page.url(), { timeout: 30_000 }).toBe(`${APP_ORIGIN}/auth/passcode`);
		await expect(page.getByText(COPY.signInDescription, { exact: false })).toBeVisible();
		await expect(nameField(page)).toHaveCount(0);
		expect(
			(await page.context().cookies()).some(
				(cookie) => cookie.name === 'auth-active-team' && cookie.value.length > 0
			),
			'the crashed chain wrote an active team after all'
		).toBe(false);
		report('phase 2 calls', { calls: harness.describe() });
		expect(harness.countOf('GET', TEAMS_ROUTE), `phase 2 sent no team read: ${harness.describe()}`).toBeGreaterThan(
			0
		);

		// the person is told nothing: the only sign is the logged crash (finding 10)
		expect(
			consoleFindings(shield, [JWT_DECODE_FAILURE, TOKEN_SWITCH_REFUSED, EMPTY_TEAM_LIST_CRASH]),
			`these two phases logged more than the mock's team, the unsigned token and the empty team list: ${shield
				.consoleErrors()
				.map((line) => line.split('\n')[0])
				.join(' || ')}`
		).toEqual([]);
	});
});
