/**
 * Settings › Personal › Profile (`/settings/personal`) on lane-b: what the page shows, and what every control on it
 * actually asks the API for — including every way it can be refused.
 *
 * The page (`core/components/settings/pages/profile/profile-settings-page.tsx:65-110`) is five sections, each a
 * `<section id=… aria-labelledby="{id}-heading">` (`core/components/settings/kit/settings-page.tsx:68-84`):
 * `#general` (PhotoRow, two InlineTextRows, EmailRow, PasswordRow, PhoneRow), `#rate` (only when the user carries an
 * `employee`), `#this-browser`, `#sessions` and `#danger-zone`. Rows are `InlineTextRow`
 * (`core/components/settings/kit/inline-text-row.tsx`), dialogs are `ConfirmDestructiveDialog`
 * (`core/components/settings/kit/danger.tsx:68-187`).
 *
 * **Real vs served.** The Next.js app, its router, its forms, its validation, its copy and its console are real; the
 * API is the lane's mock (`cypress/support/mock-gauzy-server.mjs`, http://127.0.0.1:3996). What the mock cannot
 * express is answered here instead, by `page.route` limited to the mock origin
 * (`serve()` below: a URL predicate `url.origin === MOCK_API_ORIGIN && …`, never a bare glob over `/api/…`), store-
 * backed (a refusal changes nothing in the store, an accepted write changes it, so a reload proves the answer came
 * from the stub and not from a lucky string), and every stub answers `OPTIONS` with 204 restating the mock's own CORS
 * headers (`mock-gauzy-server.mjs:1087-1096`) before it records the call. Nothing here calls `route.fetch()`, so a
 * call my stub answered never appears in `mock.calls()` — which is how "the mock was never asked" is provable.
 * Everything the mock does answer (the fixture user, `pay-rate`, `role-permissions/me`, the shell's polls) is left to
 * it: test 1 reads the fixture user straight off `GET <mock>/api/user/me`.
 *
 * **Copy and ids.** Every sentence, label, button name, aria-label and toast this file asserts is read out of the
 * app's own copy file by its key (`message` / `fill` / `countText` / `pluralOnly` over `locales/en.json`), including
 * the counted ones (`settings.sessions.OTHER_SESSIONS`, `SIGN_OUT_OTHERS_TITLE`, `SIGN_OUT_OTHERS_CONFIRM`,
 * `SIGNED_OUT_OTHERS`, `auth.password.RULE_MIN_LENGTH`, `pages.accountDeletion.OUTCOME_ACCOUNT_REMOVED`,
 * `SOLE_ADMIN_WARNING`). What stays typed is what the test itself types (its own names, passwords, file names and stub
 * refusal messages) and what the app hard-codes outside the locale file, quoted at its line: `Character 1.` of the
 * code input (`auth-code-input.tsx:204`) and the dev run's own error toaster (`dev-error-toaster.tsx:145-171`). The
 * app's own name is read the way the page reads it (`appNameOf`), and every id a stub matches on or an assertion
 * compares comes from the lane's bootstrap (`fixture.ids`), never from a literal here.
 *
 * **Console.** No test filters a blanket prefix. Where a test arms a refusal it names the exact lines that refusal
 * produces, in the app's own words: `[ERROR] [HttpClient] HTTP Error: <METHOD> <path> <status>`, `Mutation failed:
 * ApiError: <my stub's message>`, and for the two paths that log before the mutation (`use-image-assets.ts:16`:
 * `Image asset upload error: ApiError: …`; `organization-team.service.ts` → `[App] Remove user all teams failed` +
 * `Remove user from all teams failed: ApiError: …`). The lines a test may excuse without arming them are:
 * `[JWT] Failed to decode token:` (`core/lib/auth/jwt-utils.ts:58`), which the tests that sign the fixture out
 * cannot avoid: the mock's `auth-token` cookie is not a signed JWT, and the shell decodes it while reconciling its
 * auth snapshot (`readSnapshot` -> `decodeJWT`) or re-mounting after `logOut()`. Measured on this lane: it appears
 * after an accepted `DELETE /organization-team/teams/<userId>` (that write makes `reconcileSnapshot` ->
 * `requestNewPair` -> `setAccessTokenCookie` run, run log `/d/Coding/.tmp/s3-lane-b-profile-1.log` failure 11) and
 * after an accepted account deletion. The two other lines a test may excuse without arming them are React's
 * dev-mode store warning (`The result of getSnapshot should be cached to avoid an infinite loop`, excused by
 * every other lane spec in this repo, e.g. `suites/lane-a/home-page-ui.spec.ts:409-410`) and the shell's own
 * local-API health probe timing out (`Local API Health Check Error: AxiosError: timeout of 30000ms exceeded`,
 * `core/services/client/api/default.ts:42`) — each named in full in `excusedLines` below, and each reported as
 * a finding. Every test that arms nothing else asserts nothing but those named lines is in the console.
 *
 * **Measured, not intended** (quoted words from the code, with file:line, saying the behaviour is wanted — so these
 * are findings, not tagged bugs): nothing in the page calls these behaviours unwanted. The findings this file
 * documents are listed in `## findings` at the bottom of this header and each is pinned by a test or named as
 * unreachable.
 *
 * **Not covered, with the reason measured:**
 *   - The phone row's editor cannot be opened at all on this lane. `InternationalPhoneInput`
 *     (`core/components/common/international-phone-Input.tsx`) renders the selected country's flag from
 *     `https://purecatamphetamine.github.io/country-flag-icons/3x2/<CC>.svg`; the `shield` fixture records every
 *     non-local request (`playwright/fixtures.ts:96`) and aborts it (`:111`), and its auto-expectation
 *     (`:123-125`) fails the test with `the browser left the machine (only http://localhost:3032 and the test
 *     backend are allowed)`. Measured: opening the editor produced 3 (`US`) and 7 (`ES`) such requests and failed
 *     both tests (`/d/Coding/.tmp/s3-lane-b-profile-probe-9.log:100-103,129-136`). A `page.route` cannot hide it —
 *     the `request` event fires before any route decides — and the lead's rule limits routes to the mock origin. The
 *     read half of the row is covered in test 2.
 *   - `settings.profile.NAME_TOO_LONG` (`settings-profile.ts:40`) is unreachable from this UI: both name inputs carry
 *     `maxLength={PROFILE_NAME_MAX_LENGTH}` (`profile-settings-page.tsx:79,88`), so typing 81 characters lands as 80
 *     and is saved (probe-10 `P20`: a PUT went through), and `InlineTextRow.save` closes the form for an unchanged
 *     draft **before** validating it (`inline-text-row.tsx:79-83`), so editing a served 90-character name with
 *     End + Backspace produced no alert at all (probe-12 `P27`). Test 3 pins the reachable guard (`NAME_REQUIRED`)
 *     and the input's measured `maxLength`.
 *   - `settings.profile.EMAIL_INVALID` (`email-row.tsx:135-142`) is reachable only for an address the browser
 *     accepts and `validator`'s `isEmail` does not: `not-an-email` fails HTML5 constraint validation
 *     (`input.validity.valid === false`), the form never submits and no app alert appears (probe-7 `P10`). Test 7
 *     pins both halves.
 *   - The self-edit path `PUT /employee/<id>/profile` (`rate.service.ts:95-107`) is unreachable on this lane: the
 *     fixture role always holds `ORG_EMPLOYEES_EDIT` (`mock-gauzy-server.mjs:50`), so the rate save takes
 *     `PUT /employee/<id>` (probe-7 `P8`). Test 11 pins the path that is reachable.
 *   - The apply-to-tracked-time question (`rates.APPLY_*`, `core/lib/utils/rate-apply.ts:21-36`,
 *     `use-rate-apply-question.ts:34-40`) never renders against this mock: its organization carries no
 *     `timeLogsKeepTheirRates`, so the answer is "keep it" and no question is asked. Measured in probe-7 `P8`
 *     (`#rate` radio groups after a billing-rate save: `[]`).
 *   - `pages.accountDeletion` by-e-mail-link flow (`Delete my account by email`) is another page's flow (its request
 *     and confirmation screens are not this page's controls) and is out of scope here.
 *
 * **Findings (untagged; each one measured, none of them called unwanted by the code):**
 *   1. The phone editor sends `phoneNumber: ""`, with no message of its own, when the typed number does not match
 *      the country the field selected: typing `+34600111222` on the auto-detected `US` country snapped the field
 *      back to `+1` and `PUT /api/user/<id>` carried `"phoneNumber":""` while the row went back to `Not set`
 *      (probe-9 `P15 phone PUT`). With a served Spanish number the field prefills `+34 600 11 12 22` and the write
 *      carries `+34600555666` (probe-9 `P15b`).
 *   2. A country-flag icon is fetched from a public internet host by a page whose whole suite is hermetic (see the
 *      uncovered list above).
 *   3. `#sessions` disappears completely when the list reads `[]`, and also when the API answers 404
 *      (`sessions-section.tsx:198-201`): a person who has sessions on other devices and a server that cannot list
 *      them see the same page. Tests 1 and 15 pin both.
 *   4. After a single sign-out is refused, the row is left exactly as it was and only a toast says why
 *      (`sessions-section.tsx:217`) — no inline marker on the row (probe-11 `P23`).
 *   5. `settings.profile.LEAVE_TEAMS` on a server without the route answers 404 and the dialog shows
 *      `LEAVE_TEAMS_NONE` ("…there is nothing to leave") rather than "this server cannot do it"
 *      (`account-danger-section.tsx:74-90`); the survey's `rates.REQUEST_NO_ADMIN` key does not exist — the rate
 *      404 copy is `rates.REQUEST_UNAVAILABLE` (probe-7 `P7b`).
 *   6. Typing the 8-character e-mail code one key at a time works, typing it as one string into the first slot does
 *      not: `pressSequentially('AB12CD34')` on slot 1 left `["B","1","2","C","D","3","4",""]` and a click first left
 *      `["A","","","","","","",""]`, both with Confirm still disabled (probe-12 `P28`, `P28c`), while one key per
 *      slot produced `["A","B","1","2","C","D","3","4"]` and the accepted change (probe-12 `P28b`). This is the
 *      code field's own focus handling, not the app's; the spec types per slot.
 *   7. An avatar upload the server refuses (500) produces **no user-facing toast**: the only things on screen are the
 *      row's own `settings.profile.PHOTO_UPLOAD_FAILED` line and, in a dev run, the developer error toaster naming the
 *      mutation key, the status and the server's message (`dev-error-toaster.tsx:145-171`). Every other refused write on
 *      this page does raise a `toasts.REASONS.*` toast (test 3's 400 and 500 refusals do). Measured in
 *      `/d/Coding/.tmp/s3-lane-b-profile-3.log` failure 2; test 5 pins the exact toast list.
 *   8. While a confirm dialog is open the whole `#sessions` section is `aria-hidden` (measured:
 *      `<section id="sessions" aria-hidden="true">`, `/d/Coding/.tmp/s3-lane-b-profile-2.log` failure 9), so a
 *      role-based lookup inside it sees nothing at all — only an attribute lookup such as
 *      `[aria-label="Sign out: …"]` still finds the row. Tests 14 and 16 assert the rows that way.
 *   9. The shell's own probe of the app's local API logs a console error when it times out —
 *      `Local API Health Check Error: AxiosError: timeout of 30000ms exceeded` (`core/services/client/api/default.ts:42`,
 *      `useCheckAPI.useQuery[apiCheckQuery]`, a 30 s axios timeout against the app itself). It has nothing to do with
 *      what a test asks the mock, it arrives at random in a long run (`s3-lane-b-profile-2.log` test 1,
 *      `s3-lane-b-profile-4.log` test 17, and `playwright/artifacts/lane-lane-b-server.log` from other lane-b runs), and
 *      any hermetic console check in the page's window trips on it. Named in `excusedLines` rather than filtered by a
 *      prefix.
 *   10. React's dev-mode store warning `The result of getSnapshot should be cached to avoid an infinite loop` appears on
 *      some loads and not others (it landed in test 16 of `s3-lane-b-profile-4.log`). Every other lane spec in this repo
 *      excuses this exact line (`suites/lane-a/home-page-ui.spec.ts:409-410`); this file does the same, by the exact
 *      string.
 *
 * Every asserted value came from a probe run or a whole-file run under this lane's own config: probe logs
 * `/d/Coding/.tmp/s3-lane-b-profile-probe-{4,6,7,8,9,10,11,12,13,14}.log`, probes
 * `/d/Coding/.tmp/probe-profilesettings/probe{1..8}.spec.ts` + `probe13.spec.ts`, whole-file logs
 * `/d/Coding/.tmp/s3-lane-b-profile-{1,…,10}.log` (the last two are the acceptance pair, run inside the lane lock).
 * Copy is English from `locales/en.json`, read by key — see **Copy and ids** above.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type BootstrapFixture, type Page } from '../../fixtures';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

const PAGE_PATH = '/settings/personal';
const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/**
 * Every sentence, label, button name, aria-label and toast this file asserts is read out of the app's own copy
 * file (`locales/en.json`) by its key — nothing here retypes English text. `settings.profile` is the page's own
 * namespace, `settings.sessions` / `settings.thisBrowser` / `rates` / `pages.accountDeletion` the sections and
 * dialogs, `toasts` the reason a refusal adds, `settings.common` / `common` the row and dialog controls.
 */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	auth: { password: Record<string, string> };
	common: Record<string, string>;
	errors: Record<string, string>;
	pages: { accountDeletion: Record<string, string> };
	rates: Record<string, string>;
	notifications: { NOTICES: Record<string, string> };
	settings: {
		common: Record<string, string>;
		profile: Record<string, string>;
		sessions: Record<string, string>;
		thisBrowser: Record<string, string>;
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};

/** A message read by its dotted key (`settings.profile.PHOTO_HINT`); a key that is not there throws. */
const message = (key: string): string => {
	const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], EN);
	if (typeof value !== 'string') {
		throw new Error(`locales/en.json carries no message at ${key}`);
	}
	return value;
};

/** `settings.profile.EMAIL_CODE_SENT` with `{email}` replaced. */
const fill = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), message(key));

/**
 * The branch a `{count, plural, …}` block picks for a count, `#` replaced — read out of the file, including the
 * `=0` branches (`pages.accountDeletion.OUTCOME_ACCOUNT_REMOVED`, `settings.sessions.SIGNED_OUT_OTHERS`).
 */
const pluralBranch = (raw: string, count: number): string => {
	const start = raw.indexOf('{count, plural,');
	if (start < 0) {
		throw new Error(`no plural message: ${raw}`);
	}
	let depth = 0;
	let end = -1;
	for (let index = start; index < raw.length; index += 1) {
		if (raw[index] === '{') depth += 1;
		else if (raw[index] === '}' && (depth -= 1) === 0) {
			end = index;
			break;
		}
	}
	const branches = Array.from(raw.slice(start, end + 1).matchAll(/(?:(=)?(\d+)|(one|other))\s*\{([^{}]*)\}/g));
	const branch =
		branches.find((entry) => entry[1] === '=' && Number(entry[2]) === count) ??
		branches.find((entry) => entry[3] === (count === 1 ? 'one' : 'other')) ??
		branches.at(-1);
	if (!branch) {
		throw new Error(`no plural branch for ${count} in: ${raw}`);
	}
	return String(branch[4]).replaceAll('#', String(count));
};

/** A message with a plural in it, the plural replaced by its branch (`settings.sessions.OTHER_SESSIONS`). */
const countText = (key: string, count: number) => {
	const raw = message(key);
	const start = raw.indexOf('{count, plural,');
	const branch = pluralBranch(raw, count);
	if (start === 0 && raw.trimEnd().endsWith('}}')) {
		return branch;
	}
	let depth = 0;
	let end = -1;
	for (let index = start; index < raw.length; index += 1) {
		if (raw[index] === '{') depth += 1;
		else if (raw[index] === '}' && (depth -= 1) === 0) {
			end = index;
			break;
		}
	}
	return (raw.slice(0, start) + branch + raw.slice(end + 1)).trim();
};

/** The branch alone, for an assertion that names only the counted fragment (`… 2 other members keep access.`). */
const pluralOnly = (key: string, count: number) => pluralBranch(message(key), count).trim();

/**
 * A toast the app composes from two messages: `toast.error(t('toasts.MUTATION_FAILED'), { description: t(reason) })`
 * (`core/components/common/mutation-error-toaster.tsx:53-56`); Sonner renders title and description as adjacent
 * nodes, which is why the measured text has no separator between them.
 */
const failureToast = (titleKey: string, reasonKey: string) => `${message(titleKey)} ${message(reasonKey)}`;
// Every id this file matches a route on, puts into an answer or compares against comes from the bootstrap the
// lane's mock served (`fixture.ids`, `playwright/helpers.ts:63-72,157-160`); no id is typed here. `serve()` is
// handed the fixture for exactly that reason.
/** `settings-profile.ts:10`: the megabyte cap the row's own hint and the guard both read. */
const AVATAR_MAX_MEGABYTES = 5;
/** `settings-profile.ts:10,14`: 5 MiB, and one byte more is what the guard rejects. */
const AVATAR_MAX_BYTES = AVATAR_MAX_MEGABYTES * 1024 * 1024;
/** `core/lib/utils/password-strength.ts:8`: the length rule the password row shows as its error. */
const PASSWORD_MIN_LENGTH = 8;
/** `settings-profile.ts:4`, put on both name inputs by `profile-settings-page.tsx:79,88`. */
const PROFILE_NAME_MAX_LENGTH = 80;
/** `constants.tsx:149` / `core/lib/helpers/cookies/index.ts:79-81,104-115`. */
const BROWSER_CLOSE_COOKIE = 'session-ends-with-browser';
/** `settings-profile.ts:16`: the upload folder the avatar upload is posted into. */
const AVATAR_FOLDER = 'profile_pictures_avatars';

/** The mock's own CORS answer, restated (`mock-gauzy-server.mjs:1087-1096`). */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	// The mock echoes only an origin it trusts; the app origin is the one it trusts on this lane.
	'access-control-allow-origin': APP_ORIGIN
};

type ServedUser = Record<string, unknown>;

type ServedSession = {
	id: string;
	current: boolean;
	app: string;
	appName?: string;
	appOrigin?: string;
	browser: string | null;
	os: string | null;
	userAgent: string | null;
	ipAddress: string | null;
	signedInAt: string;
	lastActiveAt: string;
};

type Refusal = { status: number; message: string; code?: string };

/** The mock's own answer for this lane's signed-in user, read rather than typed. */
const mockUser = async (): Promise<ServedUser> => {
	const response = await fetch(`${MOCK_ORIGIN}/api/user/me`);
	return (await response.json()) as ServedUser;
};

/**
 * Sessions the mock cannot describe (it answers `GET /auth/sessions` with `[]`,
 * `mock-gauzy-server.mjs:609-611`). Dates are fixed ISO instants; every test that shows one formats it with the
 * browser's own `Intl`, so no test depends on the weekday or the day of the month.
 */
const sessionsSeed = (): ServedSession[] => [
	{
		id: '77777777-7777-4777-8777-000000000001',
		current: false,
		app: 'WEB',
		appName: 'gauzy-desktop-timer',
		browser: 'Chrome 131',
		os: 'Windows',
		userAgent: null,
		ipAddress: '203.0.113.7',
		signedInAt: '2026-02-19T09:05:00.000Z',
		lastActiveAt: '2026-02-27T10:10:00.000Z'
	},
	{
		id: '77777777-7777-4777-8777-000000000002',
		current: true,
		app: 'WEB',
		// `sessionAppOf` (`sessions-section.tsx:66-79`) names this app when `appOrigin` is the browser's own host.
		appOrigin: new URL(APP_ORIGIN).host,
		browser: 'Chrome 131',
		os: 'Windows',
		userAgent: null,
		ipAddress: '198.51.100.4',
		signedInAt: '2026-02-28T08:15:00.000Z',
		lastActiveAt: '2026-02-28T08:15:00.000Z'
	},
	{
		id: '77777777-7777-4777-8777-000000000003',
		current: false,
		app: 'MOBILE',
		browser: null,
		os: 'Android',
		userAgent: null,
		ipAddress: null,
		signedInAt: '2026-02-24T21:30:00.000Z',
		lastActiveAt: '2026-02-24T21:30:00.000Z'
	}
];

/**
 * The name this app gives itself, resolved the way this page resolves it:
 * `APP_NAME = readRuntimeEnv('APP_NAME') || process.env.APP_NAME || 'Ever Teams'`
 * (`core/constants/config/constants.tsx:326`), where `readRuntimeEnv` reads the runtime-env payload the layout
 * writes on `<html>` (`core/services/server/runtime-env.ts:22-35`; `env-config.ts:29-42` allow-lists `APP_NAME`
 * as a branding key, `env-config.ts:68-79` is the reader). The lane's dev server sets no branding key, so the
 * payload carries none and `constants.tsx:326`'s own fallback is what `sessionAppOf` returns for a session that
 * came from this app's host - read off the page rather than typed here.
 */
const APP_NAME_FALLBACK = 'Ever Teams'; // `core/constants/config/constants.tsx:326`
const RUNTIME_ENV_ATTRIBUTE = 'data-ever-teams-runtime-env'; // `env-config.ts:70`
const appNameOf = async (page: Page): Promise<string> => {
	const branding = await page.evaluate((attribute) => {
		const raw = document.documentElement.getAttribute(attribute);
		if (!raw) {
			return null;
		}
		try {
			return (JSON.parse(raw) as Record<string, string>).APP_NAME ?? null;
		} catch {
			return null;
		}
	}, RUNTIME_ENV_ATTRIBUTE);
	return branding?.trim() || APP_NAME_FALLBACK;
};

/**
 * The name the app composes for a served session, mirroring `sessionAppOf` + `deviceNameOf` + `sessionNameOf`
 * (`sessions-section.tsx:47-79`): `settings.sessions.APP_ON_DEVICE` (`{app} . {device}`) only when the session
 * names an app or came from this app's host; a session the API named no app for is its device alone
 * (`DEVICE_BROWSER_ON {browser} on {os}` / `DEVICE_MOBILE_APP_ON {os}` / `DEVICE_MOBILE_APP`). Measured on this
 * lane: `gauzy-desktop-timer . Chrome 131 on Windows`, `Mobile app on Android`,
 * `Ever Teams . Chrome 131 on Windows`.
 */
const sessionNameOf = async (page: Page, session: ServedSession): Promise<string> => {
	const appName = await appNameOf(page);
	const thisHost = new URL(APP_ORIGIN).host;
	const app =
		session.appName === appName || (!!session.appOrigin && session.appOrigin === thisHost)
			? appName
			: (session.appName ?? session.appOrigin ?? null);
	const device = session.browser
		? fill('settings.sessions.DEVICE_BROWSER_ON', { browser: session.browser, os: session.os ?? '' })
		: session.os
			? fill('settings.sessions.DEVICE_MOBILE_APP_ON', { os: session.os })
			: message('settings.sessions.DEVICE_MOBILE_APP');
	return app ? fill('settings.sessions.APP_ON_DEVICE', { app, device }) : device;
};

/**
 * A session row's accessible name: `aria-label={`${t('settings.sessions.SIGN_OUT_SESSION')}: ${name}`}`
 * (`sessions-section.tsx:151`).
 */
const sessionRowLabel = async (page: Page, session: ServedSession): Promise<string> =>
	`${message('settings.sessions.SIGN_OUT_SESSION')}: ${await sessionNameOf(page, session)}`;

/**
 * The date the app prints for a session: `settings.sessions.SIGNED_IN` = `Signed in {date}`, the date read with
 * `Intl` `dateStyle: 'medium'` (`sessions-section.tsx:120-130` `format.dateTime`), in the browser's own locale.
 */
const signedInLabel = async (page: Page, iso: string): Promise<string> =>
	fill('settings.sessions.SIGNED_IN', {
		date: await page.evaluate(
			(value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)),
			iso
		)
	});

/**
 * A refusal the test armed, as the app logs it. Each test lists its own and excuses nothing else. A test names the
 * path the way its stub matches it (`user/<id>`); `http-client.ts` logs it relative to the API root with a leading
 * slash (`PUT /user/44444444-… 400`), so this adds that slash — the shape measured in
 * `/d/Coding/.tmp/s3-lane-b-profile-1.log`.
 */
const armedHttpError = (method: string, path: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: ${method} /${path.replace(/^\//, '')} ${status} `);
/**
 * None of these patterns is anchored: the `shield` fixture records a console message as `<type>: <text>` —
 * `error: [2026-11-28T…] [ERROR] [HttpClient] HTTP Error: PUT /user/<id> 400 …` — so a line never begins with the
 * words a test names it by. Measured in `/d/Coding/.tmp/s3-lane-b-profile-2.log`.
 */
const armedMutationFailure = (text: string) =>
	new RegExp(`Mutation failed: ApiError: ${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
/**
 * `[JWT] Failed to decode token:` — `core/lib/auth/jwt-utils.ts:58`. The mock's `auth-token` cookie is an unsigned
 * three-part string, so every time the shell decodes it (`decodeJWT` in its auth-snapshot reconcile, or after
 * `logOut()`) this line appears. It is the only console line any test here excuses without arming it.
 */
const JWT_DECODE_FAILURE = /\[JWT\] Failed to decode token:/;

/**
 * Three lines are excused without being armed, each named in full, each with its source — and nothing else.
 *
 *  - `JWT_DECODE_FAILURE` above: the mock's `auth-token` cookie is not a signed JWT.
 *  - `SHELL_STORE_NOISE`: React's dev-mode store warning, seen on some loads and not others. Every other lane
 *    spec in this repo excuses this exact line (e.g. `suites/lane-a/home-page-ui.spec.ts:409-410`).
 *  - `LOCAL_API_HEALTH_CHECK_TIMEOUT`: the shell's own probe of the app's local API
 *    (`core/services/client/api/default.ts:42`, `useCheckAPI.useQuery[apiCheckQuery]`, a 30 s axios timeout)
 *    timing out while the dev server is busy. Nothing a test asked the mock has to do with it: it landed in
 *    `s3-lane-b-profile-2.log` (test 1) and `s3-lane-b-profile-4.log` (test 17), and in
 *    `playwright/artifacts/lane-lane-b-server.log` from other lane-b runs. Reported, not hidden.
 */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const LOCAL_API_HEALTH_CHECK_TIMEOUT = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
const excusedLines = (armed: RegExp[]) => [
	JWT_DECODE_FAILURE,
	new RegExp(SHELL_STORE_NOISE),
	new RegExp(LOCAL_API_HEALTH_CHECK_TIMEOUT),
	...armed
];

/**
 * Asserts every collected console error is one of the lines this test armed or one of the three named above;
 * anything else is shown, not hidden.
 */
const expectOnlyArmedErrors = (errors: string[], armed: RegExp[]) => {
	const unexplained = errors.filter((line) => !excusedLines(armed).some((pattern) => pattern.test(line)));
	expect(unexplained, `console lines no stub armed: ${unexplained.join(' || ')}`).toEqual([]);
};
const expectArmedError = (errors: string[], armed: RegExp) => {
	expect(
		errors.some((line) => armed.test(line)),
		`no console line matched ${armed}`
	).toBe(true);
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const section = (page: Page, id: string) => page.locator(`#${id}`);
const alertsIn = (page: Page, id: string) => section(page, id).locator('[role="alert"]');
/**
 * The app's own dialog. `getByRole('dialog')` alone is not enough: when the app throws, Next's dev error overlay
 * mounts its own `role="dialog"` (`data-nextjs-dialog`) and every dialog assertion turns into a strict-mode
 * violation that hides the real failure — measured in `/d/Coding/.tmp/s3-lane-b-profile-probe-14.log` (P30).
 * The app's dialog content is `[data-slot="dialog-content"]` (`core/components/common/dialog.tsx`).
 */
const dialog = (page: Page) => page.locator('[data-slot="dialog-content"]');
/**
 * Text the app renders in neighbouring elements arrives with no space between them (the measured row text is
 * `Ever Teams ... Chrome 131 on WindowsThis device`), so one plain string cannot name both halves. This escapes
 * each piece and lets the whitespace between them be absent.
 */
const textSequence = (parts: string[]) =>
	new RegExp(parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'));

/**
 * The sign-out button name of every session row, in the order the rows rendered. Read through a poll by the
 * tests that need it, so it is never a bare read of a list that may still be rendering.
 */
const sessionRowLabels = async (page: Page): Promise<string[]> =>
	await section(page, 'sessions')
		.locator(`[aria-label^="${message('settings.sessions.SIGN_OUT_SESSION')}"]`)
		.evaluateAll((nodes) => nodes.map((node) => String(node.getAttribute('aria-label'))));

/**
 * An inline row's edit button: `aria-label={t('settings.common.EDIT_FIELD', { field: label })}
 * (`inline-text-row.tsx:169`), with the row's own label from `settings.profile`.
 */
const editFieldLabel = (fieldKey: string) => fill('settings.common.EDIT_FIELD', { field: message(fieldKey) });

/**
 * The money the rate row prints: `rateAmountTextOf` (`core/lib/utils/rates.ts:370-383`) through
 * `formatAmount` (`core/lib/utils/daily-report-figures.ts:586-592`) - `Intl.NumberFormat(locale, { style:
 * 'currency', currency, maximumFractionDigits: 2 })`, run in the page so the locale is the page's own
 * (`useWorkspaceLocale`).
 */
const amountText = async (page: Page, currency: string, value: number): Promise<string> =>
	await page.evaluate(
		({ code, amount }) =>
			new Intl.NumberFormat(undefined, {
				style: 'currency',
				currency: code,
				maximumFractionDigits: 2
			}).format(amount),
		{ code: currency, amount: value }
	);

/** `pages.auth.everId.LOGIN_WITH_EVER_ID` = "Login with <wordmark>Ever ID</wordmark>"; the wordmark tags are
 * markup the page renders away, so the accessible name is the stripped text.
 */
const everIdLabel = () =>
	message('pages.auth.everId.LOGIN_WITH_EVER_ID').replaceAll('<wordmark>', '').replaceAll('</wordmark>', '');

/** Sonner pauses a toast's dismiss timer while the pointer is over it; park the pointer before reading toasts. */
const parkPointer = async (page: Page) => {
	await page.mouse.move(2, 2);
};
const toastTexts = async (page: Page) => (await page.locator('[data-sonner-toast]').allInnerTexts()).map(flat);

type Stored = {
	user: ServedUser;
	sessions: ServedSession[];
	asset: Record<string, unknown> | null;
	preview: Record<string, unknown> | null;
	pendingEmail: string;
};

type Harness = {
	calls: Array<{ method: string; path: string; body: string | null }>;
	writes: () => string[];
	bodyOf: (method: string, path: string) => Record<string, unknown>;
	/** The body of the last such call, which is what a flow that writes the same path twice needs. */
	lastBodyOf: (method: string, path: string) => Record<string, unknown>;
	user: () => ServedUser;
	sessions: () => ServedSession[];
	/** How many times the deletion preview was read, which is how a re-read after a 409 is provable. */
	previewReads: () => number;
};

type ServeOptions = {
	user?: ServedUser;
	sessions?: ServedSession[] | 'unavailable' | 'error';
	employeePayRate?: { payRateValue: number | null; payRateCurrency: string | null };
	rateChangeAnswer?: { status: number; message?: string; notified?: number };
	imageAsset?: Record<string, unknown>;
	deletionPreview?: Record<string, unknown>;
	/** Asked per request, so a flow can be refused once and then accepted: `(method, path, body)`. */
	arm?: (method: string, path: string, body: Record<string, unknown>) => Refusal | null;
};

/**
 * Answers the mock's own paths that the mock cannot express, and only those, on the mock origin only.
 * Everything it does not script it answers 599 with a named reason, so an unexpected write is loud here rather than
 * quietly echoed by the mock's catch-all (`mock-gauzy-server.mjs:893-895`).
 */
const serve = async (page: Page, fixture: BootstrapFixture, options: ServeOptions = {}): Promise<Harness> => {
	const employeeId = fixture.ids.employee;
	const store: Stored = {
		user: options.user ?? (await mockUser()),
		sessions:
			options.sessions === 'unavailable' || options.sessions === 'error'
				? sessionsSeed()
				: (options.sessions ?? sessionsSeed()),
		asset: options.imageAsset ?? null,
		preview: options.deletionPreview ?? null,
		pendingEmail: ''
	};
	let previewReads = 0;
	const calls: Harness['calls'] = [];

	const scripted = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === '/api/user/me' ||
			/^\/api\/user\/[^/]+$/.test(url.pathname) ||
			url.pathname === `/api/image-assets/upload/${AVATAR_FOLDER}` ||
			url.pathname.startsWith('/api/email-reset/') ||
			url.pathname === `/api/employee/${employeeId}/pay-rate` ||
			url.pathname === '/api/employee/rate-change-request' ||
			url.pathname === `/api/employee/${employeeId}` ||
			// The app's own presence heartbeat (`PUT /employee/me/presence`), which the mock answers: it is scripted
			// here only so it cannot be mistaken for a profile write.
			url.pathname === '/api/employee/me/presence' ||
			url.pathname === '/api/auth/sessions' ||
			/^\/api\/auth\/sessions\/[^/]+$/.test(url.pathname) ||
			url.pathname === '/api/auth/sessions/sign-out-others' ||
			url.pathname === '/api/auth/signin.email' ||
			/^\/api\/organization-team\/teams\/[^/]+$/.test(url.pathname) ||
			url.pathname === '/api/account-deletion/me');

	await page.route(scripted, async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;
		// CORS first, exactly as the mock answers it, and before any call is recorded.
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}

		// The avatar upload is `multipart/form-data` (`image-asset.service.ts` posts a FormData, measured as a body that
		// starts `--…`), so a body is parsed only when it really is JSON; anything else is kept verbatim.
		const rawBody = request.postData();
		let body: Record<string, unknown> = {};
		try {
			body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
		} catch {
			body = { rawBody };
		}
		// Two calls are liveness, not profile work: the presence heartbeat and the sessions idle ping. The idle ping is
		// not on every page load — it appeared in `probe13` P30, after a dialog had been open for a while (`{ isIdle:
		// false, organizationId, tenantId }`) — and the mock has no route for it, so it is answered here and kept out of
		// `writes()`, exactly as the heartbeat is.
		const isHeartbeat = path === '/api/employee/me/presence' || path === '/api/auth/sessions/idle';
		if (!isHeartbeat) {
			calls.push({ method, path, body: request.postData() });
		}
		const answer = (status: number, payload?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: payload === undefined ? '' : JSON.stringify(payload)
			});
		const refuse = (refusal: Refusal) =>
			answer(refusal.status, {
				statusCode: refusal.status,
				message: refusal.message,
				...(refusal.code ? { code: refusal.code } : {})
			});

		if (isHeartbeat) {
			return answer(200, {});
		}
		const armed = options.arm?.(method, path, body);
		if (armed) {
			return refuse(armed);
		}

		if (path === '/api/user/me' && method === 'GET') {
			return answer(200, store.user);
		}
		if (/^\/api\/user\/[^/]+$/.test(path) && method === 'PUT') {
			// `userSchema` is all-optional with a UUID id (`core/types/schemas/user/user.schema.ts`), and the app
			// re-reads the user after the write, so the store carries the answer forward.
			store.user = { ...store.user, ...body };
			return answer(200, store.user);
		}
		if (/^\/api\/user\/[^/]+$/.test(path) && method === 'DELETE') {
			// `deleteResponseSchema` needs `{raw, affected}` (`core/types/schemas/common/delete.schema.ts`).
			return answer(200, { affected: 1, raw: [] });
		}
		if (path === `/api/image-assets/upload/${AVATAR_FOLDER}` && method === 'POST') {
			// `imageAssetSchema` is `.strict()` and needs a UUID `id`, a `name` and a `url`
			// (`core/types/schemas/common/image-asset.schema.ts`); the app then PUTs the id onto the user.
			store.asset = options.imageAsset ?? {
				id: '2f4dcc97-2222-4bbb-8ccc-000000000002',
				name: 'profile-photo.png',
				url: '/api/image-assets/profile-photo.png',
				thumb: '/api/image-assets/profile-photo-thumb.png',
				fullUrl: `${MOCK_API_ORIGIN}/api/image-assets/profile-photo.png`,
				thumbUrl: `${MOCK_API_ORIGIN}/api/image-assets/profile-photo-thumb.png`,
				width: 128,
				height: 128,
				size: 512,
				createdAt: '2026-02-20T10:00:00.000Z',
				updatedAt: '2026-02-20T10:00:00.000Z'
			};
			return answer(201, store.asset);
		}
		if (path === `/api/employee/${employeeId}/pay-rate` && method === 'GET') {
			return answer(200, {
				employeeId,
				payRateValue: options.employeePayRate?.payRateValue ?? null,
				payRateCurrency: options.employeePayRate?.payRateCurrency ?? null,
				currency: 'USD'
			});
		}
		if (path === '/api/employee/rate-change-request' && method === 'POST') {
			// `rateChangeRequestResultSchema` is `{notified?}` passthrough
			// (`core/types/schemas/organization/rates.schema.ts`).
			const outcome = options.rateChangeAnswer ?? { status: 201, notified: 2 };
			if (outcome.status >= 400) {
				return refuse({ status: outcome.status, message: outcome.message ?? 'no rate change requests here' });
			}
			return answer(201, { notified: outcome.notified ?? 2 });
		}
		if (path === `/api/employee/${employeeId}` && method === 'PUT') {
			// `rateSaveAnswerSchema` is `{repricedTimeLogs?}` (`rates.schema.ts`).
			return answer(200, { repricedTimeLogs: 3 });
		}
		if (path === '/api/email-reset/request-change-email' && method === 'POST') {
			store.pendingEmail = String(body.email ?? '');
			return answer(200, { success: true, message: 'a change code was sent' });
		}
		if (path === '/api/email-reset/verify-change-email' && method === 'POST') {
			store.user = { ...store.user, email: store.pendingEmail };
			return answer(200, { success: true, message: 'the email changed' });
		}
		if (path === '/api/auth/sessions' && method === 'GET') {
			if (options.sessions === 'unavailable') {
				return answer(404, { statusCode: 404, message: 'no sessions route here' });
			}
			if (options.sessions === 'error') {
				return answer(500, { statusCode: 500, message: 'the sessions read failed' });
			}
			return answer(200, store.sessions);
		}
		if (/^\/api\/auth\/sessions\/[^/]+$/.test(path) && method === 'DELETE') {
			const id = path.split('/').pop() ?? '';
			store.sessions = store.sessions.filter((session) => session.id !== id);
			return answer(204);
		}
		if (path === '/api/auth/sessions/sign-out-others' && method === 'POST') {
			const signedOut = store.sessions.filter((session) => !session.current).length;
			store.sessions = store.sessions.filter((session) => session.current);
			return answer(200, { signedOut });
		}
		if (path === '/api/auth/signin.email' && method === 'POST') {
			return answer(200, { status: 200, message: 'a sign-in code was sent' });
		}
		if (/^\/api\/organization-team\/teams\/[^/]+$/.test(path) && method === 'DELETE') {
			return answer(200, { affected: 1, raw: [] });
		}
		if (path === '/api/account-deletion/me' && method === 'GET') {
			previewReads += 1;
			return answer(200, store.preview ?? {});
		}
		if (path === '/api/account-deletion/me' && method === 'POST') {
			return answer(200, { deleted: true, accounts: 1, workspacesDeleted: 0 });
		}
		return answer(599, { statusCode: 599, message: `this spec scripted no answer for ${method} ${path}` });
	});

	return {
		calls,
		writes: () =>
			calls
				.filter((call) => ['PUT', 'POST', 'DELETE'].includes(call.method))
				.map((call) => `${call.method} ${call.path}`),
		bodyOf: (method, path) =>
			JSON.parse(
				String(calls.find((call) => call.method === method && call.path === path)?.body ?? '{}')
			) as Record<string, unknown>,
		lastBodyOf: (method, path) =>
			JSON.parse(
				String(calls.filter((call) => call.method === method && call.path === path).at(-1)?.body ?? '{}')
			) as Record<string, unknown>,
		user: () => store.user,
		sessions: () => store.sessions,
		previewReads: () => previewReads
	};
};

/** The photo row's status line is the hint the file input points at (`photo-row.tsx:38,120`); reading the
 *  `#general` aria-live nodes instead is ambiguous — three of them exist. */
const photoHint = async (page: Page) => {
	const input = page.locator('#general input[type="file"]');
	// A web-first assertion first, so the read that follows names a value the page already proved it carries.
	await expect(input).toHaveAttribute('aria-describedby', /\S/, { timeout: 15_000 });
	const hintId = await input.getAttribute('aria-describedby');
	return section(page, 'general').locator(`#${String(hintId)}`);
};

const firstPng = () => ({
	name: 'profile-photo.png',
	mimeType: 'image/png',
	buffer: Buffer.from(
		'89504e470d0a1a0a0000000d4948445200000080000000800806000000c33e' + '0'.repeat(400) + '49454e44ae426082',
		'hex'
	)
});

/**
 * 1. The page exactly as the lane's mock answers it: which sections exist, the fixture's own values in the rows, and
 *    the sessions section the mock's empty answer hides.
 */
test('the page as the mock answers it: the sections, the fixture’s own values, and no sessions list', async ({
	app,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	// Read the mock's own user rather than restating it: every value pinned below comes off this answer.
	const served = await mockUser();

	await expect(section(page, 'general')).toBeVisible();
	await expect(section(page, 'rate')).toBeVisible();
	await expect(section(page, 'this-browser')).toBeVisible();
	await expect(section(page, 'danger-zone')).toBeVisible();

	// `#rate` exists only because the served user carries an employee (`profile-settings-page.tsx:100-106`).
	expect(served.employee).toBeTruthy();

	// The absence of `#sessions` is asserted only after the mock logged the read it answers with `[]`
	// (`mock-gauzy-server.mjs:609-611`, `sessions-section.tsx:198-201`).
	await expect.poll(async () => (await mock.calls('auth/sessions')).length, { timeout: 20_000 }).toBeGreaterThan(0);
	await expect(section(page, 'sessions')).toHaveCount(0);

	// Headings: the page title (`settings.entries.profile.TITLE`) then the four section headings, each asserted
	// web-first: exactly four level-2 headings, and each of these names among them.
	await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4);
	for (const heading of [
		message('settings.profile.SECTION_PROFILE'),
		message('rates.OWN_SECTION'),
		message('settings.thisBrowser.TITLE'),
		message('settings.profile.SECTION_ACCOUNT')
	]) {
		await expect(page.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible();
	}
	// `settings.profile.*`: PHOTO_HINT, FIRST_NAME, LAST_NAME, EMAIL_DESCRIPTION, EMAIL_VERIFIED, PHONE, NOT_SET.
	for (const value of [
		fill('settings.profile.PHOTO_HINT', { max: AVATAR_MAX_MEGABYTES }),
		String(served.firstName),
		String(served.lastName),
		String(served.email),
		message('settings.profile.EMAIL_VERIFIED')
	]) {
		await expect(section(page, 'general')).toContainText(value);
	}
	// The mock's user carries no phone number, so the row shows `settings.profile.NOT_SET`.
	expect(served.phoneNumber ?? '').toBe('');
	// `settings.profile.PHONE` and `settings.profile.NOT_SET`, in the row's own order.
	await expect(section(page, 'general')).toContainText(
		textSequence([message('settings.profile.PHONE'), message('settings.profile.NOT_SET')])
	);

	await expect(section(page, 'rate')).toContainText(message('rates.OWN_SECTION_HINT'));
	await expect(section(page, 'rate')).toContainText(message('rates.REQUEST_CHANGE_ACTION'));
	await expect(section(page, 'this-browser')).toContainText(message('settings.thisBrowser.SIGN_OUT_ON_CLOSE'));
	await expect(section(page, 'danger-zone')).toContainText(message('settings.profile.SECTION_ACCOUNT_DESCRIPTION'));

	expectOnlyArmedErrors(shield.consoleErrors(), []);
	expect(shield.pageErrors()).toEqual([]);
});

/**
 * 2. What the mock cannot express, served here: a photo, a phone number, names that are not the fixture's, and a
 *    session list with this device first.
 */
test('what the mock cannot express is served here: the photo, the phone number, the names and the session list', async ({
	app,
	fixture,
	shield
}) => {
	const served: ServedUser = {
		...(await mockUser()),
		name: 'Probe First',
		firstName: 'ProbeFirst',
		lastName: 'ProbeLast',
		phoneNumber: '+34600111222',
		imageId: '2f4dcc97-2222-4bbb-8ccc-000000000001',
		imageUrl: `${MOCK_API_ORIGIN}/api/image-assets/profile-photo.png`
	};
	const sessions = sessionsSeed();

	const page = await app(PAGE_PATH);
	const harness = await serve(page, fixture, { user: served, sessions });
	await page.reload({ waitUntil: 'domcontentloaded' });

	// Asserted against the section itself, web-first, so no re-render can slip between a read and its assertion.
	await expect(section(page, 'general')).toContainText(String(served.firstName));
	await expect(section(page, 'general')).toContainText(String(served.lastName));
	// The raw value the user record carries is what the phone row prints (`phone-row.tsx:57`).
	await expect(section(page, 'general')).toContainText(String(served.phoneNumber));
	// With an `imageId` the photo row offers Remove and Replace instead of Upload (`photo-row.tsx:126-133`).
	await expect(
		page.getByRole('button', { name: message('settings.profile.PHOTO_REMOVE'), exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: message('settings.profile.PHOTO_REPLACE'), exact: true })
	).toBeVisible();
	// The served url is no asset, so the avatar falls back to `imgTitle(user.name)` (`photo-row.tsx:45`).
	await expect(section(page, 'general').locator('[data-slot="avatar-fallback"]')).toHaveText('PF');

	await expect(section(page, 'sessions')).toBeVisible();
	// `sessionsInOrder` (`core/lib/auth/user-sessions.ts:100-110`): the served `current` one first, then the others
	// by `lastActiveAt` descending — this device, then the desktop timer, then the Android app. The poll is the
	// web-first form of this read: it waits for the rows, then proves the order they came in.
	const others = sessions
		.filter((session) => !session.current)
		.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
	const otherLabels = await Promise.all(others.map((session) => sessionRowLabel(page, session)));
	await expect
		.poll(async () => (await sessionRowLabels(page)).join(' | '), { timeout: 25_000 })
		.toBe(otherLabels.join(' | '));

	const list = section(page, 'sessions');
	const thisDevice = sessions.find((session) => session.current) ?? sessions[0];
	// `sessionAppOf` names the session after this app because its `appOrigin` is the browser's own host, and the row
	// puts the `settings.sessions.THIS_DEVICE` chip right after that name (no space between the two nodes, hence
	// `textSequence`).
	await expect(list).toContainText(
		textSequence([await sessionNameOf(page, thisDevice), message('settings.sessions.THIS_DEVICE')])
	);
	for (const session of others) {
		await expect(list).toContainText(await signedInLabel(page, session.signedInAt));
	}
	// `settings.sessions.OTHER_SESSIONS` and the hint under it.
	await expect(list).toContainText(countText('settings.sessions.OTHER_SESSIONS', others.length));
	await expect(list).toContainText(message('settings.sessions.OTHER_SESSIONS_HINT'));

	expect(harness.writes()).toEqual([]);
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 3. The first name row: saved, unchanged, empty, refused with 400, refused with 500.
 */
test('the first name: saved, left unchanged, refused empty, refused 400, refused 500', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });
	const served = harness.user();
	const userId = String(served.id);

	const editButton = page.getByRole('button', { name: editFieldLabel('settings.profile.FIRST_NAME'), exact: true });
	await editButton.click({ timeout: 15_000 });
	const firstName = page.getByLabel(message('settings.profile.FIRST_NAME'), { exact: true });
	await expect(firstName).toBeVisible();
	await expect(firstName).toHaveValue(String(served.firstName));
	// The input carries `maxLength={PROFILE_NAME_MAX_LENGTH}` (`profile-settings-page.tsx:79`), which is why the
	// `NAME_TOO_LONG` branch cannot be reached from here (see the header).
	await expect(firstName).toHaveAttribute('maxlength', String(PROFILE_NAME_MAX_LENGTH), { timeout: 15_000 });

	// An unchanged draft closes the editor and asks for nothing (`inline-text-row.tsx:79-83`).
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	await expect(editButton).toBeVisible({ timeout: 20_000 });
	expect(harness.writes()).toEqual([]);

	await editButton.click({ timeout: 15_000 });
	await firstName.fill('');
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	// `settings.profile.NAME_REQUIRED`, and no request at all (`profile-settings-page.tsx:43-48`).
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.profile.NAME_REQUIRED'));
	expect(harness.writes()).toEqual([]);

	// Cancel leaves nothing behind.
	await page.getByRole('button', { name: message('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
	await expect(editButton).toBeVisible({ timeout: 20_000 });
	expect(harness.writes()).toEqual([]);

	await editButton.click({ timeout: 15_000 });
	await firstName.fill('Refactored');
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	await expect.poll(async () => harness.writes().length, { timeout: 20_000 }).toBe(1);
	// `saveField` (`profile-settings-page.tsx:31-41`) sends `{id, firstName}`; `ApiService` adds the two tenant ids.
	expect(harness.bodyOf('PUT', `/api/user/${userId}`)).toMatchObject({
		id: userId,
		firstName: 'Refactored',
		tenantId: String(served.tenantId ?? fixture.ids.tenantA),
		organizationId: String(served.organizationId ?? fixture.ids.organizationA)
	});
	await expect(editButton).toBeVisible({ timeout: 20_000 });
	await expect(section(page, 'general')).toContainText('Refactored');
	// The stub's store carries the answer forward, so a reload proves the row reads the saved user.
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(section(page, 'general')).toContainText('Refactored');
	expectOnlyArmedErrors(shield.consoleErrors(), []);

	// Refused with 400: the row's own `settings.common.SAVE_FAILED`, the typed value kept, the mock never asked.
	// `app()` hands back the same page re-signed-in and re-visited, and the newest route handler wins, so the
	// refusal armed here answers `PUT /api/user/<id>` and the accepted write above stays proven.
	await app(PAGE_PATH);
	const refusedHarness = await serve(page, fixture, {
		arm: (method, path) =>
			method === 'PUT' && path === `/api/user/${userId}`
				? { status: 400, message: 'the name write was refused' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page
		.getByRole('button', { name: editFieldLabel('settings.profile.FIRST_NAME'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('settings.profile.FIRST_NAME'), { exact: true }).fill('Refused name');
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	// `inline-text-row.tsx:92-96`.
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.common.SAVE_FAILED'));
	await expect(page.getByLabel(message('settings.profile.FIRST_NAME'), { exact: true })).toHaveValue('Refused name');
	await expect.poll(async () => refusedHarness.writes().length, { timeout: 20_000 }).toBe(1);
	// The mock's own log stays empty for this path: only the stub answered, which `mock.calls` proves.
	const loggedWrites = await mock.calls(`user/${userId}`);
	expect(loggedWrites.filter((row) => row.method === 'PUT').length).toBe(0);
	const refusedErrors = shield.consoleErrors();
	expectOnlyArmedErrors(refusedErrors, [
		armedHttpError('PUT', `user/${userId}`, 400),
		armedMutationFailure('the name write was refused')
	]);
	await parkPointer(page);
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(failureToast('toasts.MUTATION_FAILED', 'toasts.REASONS.INVALID'));

	// Refused with 500: the same row alert, the other reason in the toast (`toasts.REASONS.SERVER`).
	await app(PAGE_PATH);
	await serve(page, fixture, {
		arm: (method, path) =>
			method === 'PUT' && path === `/api/user/${userId}`
				? { status: 500, message: 'the name write failed on the server' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page
		.getByRole('button', { name: editFieldLabel('settings.profile.FIRST_NAME'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('settings.profile.FIRST_NAME'), { exact: true }).fill('Broken name');
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.common.SAVE_FAILED'));
	// The `[HttpClient] HTTP Error: PUT /user/<id> 500 …` line names the status, not my stub's message
	// (`probe13` P31: `…HTTP Error: PUT /user/44444444-… 500 {statusCode: 500, …}`), so it is looked for in the whole
	// console rather than in lines filtered by that message.
	expectArmedError(shield.consoleErrors(), armedHttpError('PUT', `user/${userId}`, 500));
	await parkPointer(page);
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(failureToast('toasts.MUTATION_FAILED', 'toasts.REASONS.SERVER'));
	// Nothing the spec did not arm is left in the console.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('PUT', `user/${userId}`, 400),
		armedHttpError('PUT', `user/${userId}`, 500),
		armedMutationFailure('the name write was refused'),
		armedMutationFailure('the name write failed on the server')
	]);
	// And the saved value from the accepted half of this test is still what the page shows after all that.
	expect(String(harness.user().firstName)).toBe('Refactored');
});

/**
 * 4. The photo row's own guards: a file of the wrong type and a file one byte over the limit are refused in the
 *    browser, before the app asks for anything.
 */
test('the photo: a wrong file type and an oversized file are refused before the app asks for anything', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });

	const fileInput = page.locator('#general input[type="file"]');
	const hint = await photoHint(page);
	// `settings.profile.PHOTO_HINT` with `AVATAR_MAX_MEGABYTES` (`settings-profile.ts:10`).
	await expect(hint).toContainText(fill('settings.profile.PHOTO_HINT', { max: AVATAR_MAX_MEGABYTES }));

	await fileInput.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
	// `settings.profile.PHOTO_WRONG_TYPE`; `avatarFileProblemOf` checks the type before the size
	// (`settings-profile.ts:20-30`).
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.profile.PHOTO_WRONG_TYPE'));
	// 2 s of quiet proves no upload was started behind the alert: the guard answered before `useProfileAvatar` ran.
	await page.waitForTimeout(2_000);
	expect(harness.writes()).toEqual([]);
	expect((await mock.calls('image-assets')).length).toBe(0);

	await fileInput.setInputFiles({
		name: 'oversized.png',
		mimeType: 'image/png',
		buffer: Buffer.alloc(AVATAR_MAX_BYTES + 1, 7)
	});
	// `settings.profile.PHOTO_TOO_LARGE` with `AVATAR_MAX_MEGABYTES` (`settings-profile.ts:26-28`).
	await expect(alertsIn(page, 'general')).toHaveText(
		fill('settings.profile.PHOTO_TOO_LARGE', { max: AVATAR_MAX_MEGABYTES })
	);
	// The same 2 s window for the same reason: an accepted type that is too big still sends nothing.
	await page.waitForTimeout(2_000);
	expect(harness.writes()).toEqual([]);
	expect((await mock.calls('image-assets')).length).toBe(0);

	await expect(section(page, 'general')).toContainText(message('settings.profile.PHOTO_UPLOAD'));
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 5. The photo the app does upload: the two requests it takes, the status line it prints, the remove that undoes it,
 *    and a refusal from the upload server.
 */
test('the photo: uploaded as an asset then put on the user, removed again, refused by the upload server', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const userId = String(served.id);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });
	const fileInput = page.locator('#general input[type="file"]');
	const hint = await photoHint(page);

	await fileInput.setInputFiles(firstPng());
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'POST').length, { timeout: 25_000 })
		.toBe(1);
	// `use-profile-avatar.ts:18-32`: upload the asset, then PUT its id onto the user. The PUT follows the upload's
	// answer, so the pair is polled rather than read (`s3-lane-b-profile-2.log` failure 4 caught the race).
	await expect
		.poll(async () => harness.writes().join(' | '), { timeout: 25_000 })
		.toBe(`POST /api/image-assets/upload/${AVATAR_FOLDER} | PUT /api/user/${userId}`);
	expect(harness.bodyOf('PUT', `/api/user/${userId}`)).toMatchObject({
		id: userId,
		imageId: '2f4dcc97-2222-4bbb-8ccc-000000000002'
	});
	// The mock was never asked for either call: the stub answered, and `mock.calls` stays empty for both paths.
	expect((await mock.calls('image-assets')).length).toBe(0);
	// `settings.profile.PHOTO_SAVED` lands in the status half of the hint (`photo-row.tsx:163-176`).
	await expect(hint).toContainText(message('settings.profile.PHOTO_SAVED'));
	await expect(
		page.getByRole('button', { name: message('settings.profile.PHOTO_REMOVE'), exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: message('settings.profile.PHOTO_REPLACE'), exact: true })
	).toBeVisible();
	expectOnlyArmedErrors(shield.consoleErrors(), []);

	await page
		.getByRole('button', { name: message('settings.profile.PHOTO_REMOVE'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'PUT').length, { timeout: 25_000 })
		.toBe(2);
	// `use-profile-avatar.ts:34-44` clears the id rather than dropping the user's photo field.
	// The second write to the same path is the one the Remove produced, so the last call's body is what is read.
	expect(harness.lastBodyOf('PUT', `/api/user/${userId}`)).toMatchObject({ id: userId, imageId: null });
	await expect(hint).toContainText(message('settings.profile.PHOTO_REMOVED'));
	await expect(
		page.getByRole('button', { name: message('settings.profile.PHOTO_UPLOAD'), exact: true })
	).toBeVisible();

	// Refused by the upload server: the row's own failure line and the three console lines that refusal produces.
	await app(PAGE_PATH);
	await serve(page, fixture, {
		arm: (method, path) =>
			method === 'POST' && path === `/api/image-assets/upload/${AVATAR_FOLDER}`
				? { status: 500, message: 'the upload server refused the photo' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.locator('#general input[type="file"]').setInputFiles(firstPng());
	// `settings.profile.PHOTO_UPLOAD_FAILED` with `toasts.REASONS.SERVER`.
	await expect(alertsIn(page, 'general')).toHaveText(
		fill('settings.profile.PHOTO_UPLOAD_FAILED', { reason: message('toasts.REASONS.SERVER') })
	);
	const errors = shield.consoleErrors();
	expectOnlyArmedErrors(errors, [
		armedHttpError('POST', `image-assets/upload/${AVATAR_FOLDER}`, 500),
		new RegExp('Image asset upload error: ApiError: the upload server refused the photo'),
		armedMutationFailure('the upload server refused the photo')
	]);
	// `use-image-assets.ts:16` logs the failure itself before the mutation rejects.
	expectArmedError(errors, new RegExp('Image asset upload error: ApiError: the upload server refused the photo'));
	expect((await mock.calls('image-assets')).length).toBe(0);
	await parkPointer(page);
	// Reported, not filtered: this refusal leaves **no user-facing toast** (measured,
	// `/d/Coding/.tmp/s3-lane-b-profile-3.log` failure 2). The person is told by the row's own failure line,
	// asserted above, and by nothing else. The only toast on the page is the dev run's own error toaster,
	// naming the mutation key, the armed status and this stub's message (`dev-error-toaster.tsx:145-171`).
	// The one toast this refusal does raise is the dev run's own diagnostic, not locale copy.
	await expect
		.poll(async () => await toastTexts(page), { timeout: 20_000 })
		.toEqual([
			'DEV Mutation failed useImageAssets.useMutation[createImageAssetsMutation] 500 · the upload server refused the photo Copy details'
		]);
});

/**
 * 6. The password row: the two guards that ask for nothing, and the accepted save's exact body.
 */
test('the password: too short and mismatched ask for nothing, a valid one is put as hash', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const userId = String(served.id);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });

	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SET'), exact: true })
		.click({ timeout: 15_000 });
	const password = page.getByLabel(message('settings.profile.PASSWORD_NEW'), { exact: true });
	const confirm = page.getByLabel(message('settings.profile.PASSWORD_CONFIRM'), { exact: true });
	await expect(password).toBeVisible();

	await password.fill('short1!');
	await confirm.fill('short1!');
	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SAVE'), exact: true })
		.click({ timeout: 15_000 });
	// `password-strength.ts:9,65-72` (`PASSWORD_MIN_LENGTH`) through `auth.password.RULE_MIN_LENGTH`.
	await expect(alertsIn(page, 'general')).toHaveText(countText('auth.password.RULE_MIN_LENGTH', PASSWORD_MIN_LENGTH));
	// A 1.5 s quiet window proves the guard answered locally: no PUT went out.
	await page.waitForTimeout(1_500);
	expect(harness.writes()).toEqual([]);

	await password.fill('ProbePass1!');
	await confirm.fill('ProbePass2!');
	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SAVE'), exact: true })
		.click({ timeout: 15_000 });
	// `errors.PASSWORDS_DO_NOT_MATCH`.
	await expect(alertsIn(page, 'general')).toHaveText(message('errors.PASSWORDS_DO_NOT_MATCH'));
	await page.waitForTimeout(1_500);
	expect(harness.writes()).toEqual([]);

	await confirm.fill('ProbePass1!');
	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SAVE'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'PUT').length, { timeout: 25_000 })
		.toBe(1);
	// `user.service.ts:120-131` sends the typed value as `hash` and nothing else but the two ids.
	const body = harness.bodyOf('PUT', `/api/user/${userId}`);
	expect(Object.keys(body).sort()).toEqual(['hash', 'organizationId', 'tenantId']);
	expect(body.hash).toBe('ProbePass1!');
	await expect(page.getByLabel(message('settings.profile.PASSWORD_NEW'), { exact: true })).toHaveCount(0);
	// `settings.profile.PASSWORD_SAVED`.
	await expect(section(page, 'general')).toContainText(message('settings.profile.PASSWORD_SAVED'));
	expectOnlyArmedErrors(shield.consoleErrors(), []);
	expect((await mock.calls(`user/${userId}`)).filter((row) => row.method === 'PUT').length).toBe(0);
});

/**
 * 7. A refused password save: the row's own copy, and the form staying open with what was typed.
 */
test('the password refused by the server keeps the form open and says what did not go through', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const userId = String(served.id);
	const harness = await serve(page, fixture, {
		arm: (method, path) =>
			method === 'PUT' && path === `/api/user/${userId}`
				? { status: 400, message: 'the password write was refused' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });

	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SET'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('settings.profile.PASSWORD_NEW'), { exact: true }).fill('ProbePass1!');
	await page.getByLabel(message('settings.profile.PASSWORD_CONFIRM'), { exact: true }).fill('ProbePass1!');
	await page
		.getByRole('button', { name: message('settings.profile.PASSWORD_SAVE'), exact: true })
		.click({ timeout: 15_000 });
	// `settings.profile.PASSWORD_SAVE_FAILED` with `toasts.REASONS.INVALID` (`password-row.tsx`).
	await expect(alertsIn(page, 'general')).toHaveText(
		fill('settings.profile.PASSWORD_SAVE_FAILED', { reason: message('toasts.REASONS.INVALID') })
	);
	await expect(page.getByLabel(message('settings.profile.PASSWORD_NEW'), { exact: true })).toHaveCount(1);
	const errors = shield.consoleErrors();
	expectOnlyArmedErrors(errors, [
		armedHttpError('PUT', `user/${userId}`, 400),
		armedMutationFailure('the password write was refused')
	]);
	// The write never reached the mock; only the stub refused it.
	expect(harness.writes()).toEqual([`PUT /api/user/${userId}`]);
});

/**
 * 8. The e-mail row's own guards: the address that is already yours, one the browser accepts and the app does not,
 *    and the measured gap where the browser answers first.
 */
test('the email row refuses the address you already have and one it does not accept, before any request', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const email = String(served.email);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });

	await page
		.getByRole('button', { name: message('settings.profile.EMAIL_CHANGE_LABEL'), exact: true })
		.click({ timeout: 15_000 });
	const address = page.getByLabel(message('settings.profile.EMAIL_NEW'), { exact: true });
	await expect(address).toBeVisible();
	// `settings.profile.EMAIL_CURRENT` names the current address in the step's own hint.
	await expect(section(page, 'general')).toContainText(fill('settings.profile.EMAIL_CURRENT', { email }));

	// The same address in another case: `EMAIL_SAME`, compared case-insensitively (`email-row.tsx:135-142`).
	await address.fill(String(email).toUpperCase());
	await page.getByRole('button', { name: message('common.CONTINUE'), exact: true }).click({ timeout: 15_000 });
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.profile.EMAIL_SAME'));

	// HTML-valid, but `validator`'s `isEmail` (a TLD is required) refuses it: `settings.profile.EMAIL_INVALID`.
	await address.fill('probe@b');
	await page.getByRole('button', { name: message('common.CONTINUE'), exact: true }).click({ timeout: 15_000 });
	await expect(alertsIn(page, 'general')).toHaveText(message('settings.profile.EMAIL_INVALID'));

	// Either way the mock was never asked: both guards answered before `request-change-email`.
	expect(harness.writes()).toEqual([]);
	expect((await mock.calls('email-reset')).length).toBe(0);

	// The measured gap: an address the browser itself rejects never reaches the app's guard at all — HTML5
	// constraint validation blocks the submit, so no app alert appears and no request is made.
	await address.fill('not-an-email');
	expect(await address.evaluate((node) => (node as HTMLInputElement).validity.valid)).toBe(false);
	await page.getByRole('button', { name: message('common.CONTINUE'), exact: true }).click({ timeout: 15_000 });
	// 1.5 s of quiet proves the submit was blocked rather than refused: no alert, no request, still the address step.
	await page.waitForTimeout(1_500);
	expect(await alertsIn(page, 'general').count()).toBe(0);
	expect(harness.writes()).toEqual([]);
	expect(await address.count()).toBe(1);
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 9. Changing the e-mail address end to end: the request, the code step, a resend, a wrong code, the right code.
 */
test('the email address changed: the request, the code step, a resend, a wrong code refused, the right code accepted', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const currentEmail = String(served.email);
	// The stub refuses only a code that is not the one this test will finally give, so the same flow shows both a
	// refusal and an accepted change without a second page.
	const harness = await serve(page, fixture, {
		arm: (method, path, body) =>
			method === 'POST' && path === '/api/email-reset/verify-change-email' && String(body.code) !== 'AB12CD34'
				? { status: 400, message: 'the email change was refused' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });

	const newEmail = 'probe.new@example.test';
	await page
		.getByRole('button', { name: message('settings.profile.EMAIL_CHANGE_LABEL'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('settings.profile.EMAIL_NEW'), { exact: true }).fill(newEmail);
	await page.getByRole('button', { name: message('common.CONTINUE'), exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(
			async () => harness.calls.filter((call) => call.path === '/api/email-reset/request-change-email').length,
			{
				timeout: 25_000
			}
		)
		.toBe(1);
	// `email-reset.service.ts:13` sends the address; `ApiService` adds the two ids.
	expect(harness.bodyOf('POST', '/api/email-reset/request-change-email')).toMatchObject({
		email: newEmail,
		tenantId: String(served.tenantId ?? fixture.ids.tenantA),
		organizationId: String(served.organizationId ?? fixture.ids.organizationA)
	});

	// The code step (`email-row.tsx:227-296`): `settings.profile.EMAIL_CODE_SENT` and eight one-character slots.
	await expect(section(page, 'general')).toContainText(fill('settings.profile.EMAIL_CODE_SENT', { email: newEmail }));
	const slots = page.locator('#general input[aria-label]');
	await expect(slots).toHaveCount(8);
	await expect(slots.first()).toHaveAttribute(
		'aria-label',
		`${message('settings.profile.EMAIL_CODE')}. Character 1.`
	);
	await expect(slots.first()).toHaveAttribute('maxlength', '1');
	await expect(page.getByRole('button', { name: message('common.CONFIRM'), exact: true })).toBeDisabled();

	await page
		.getByRole('button', { name: message('notifications.NOTICES.VERIFY_RESEND'), exact: true })
		.click({ timeout: 15_000 });
	// `notifications.NOTICES.VERIFY_RESEND` asks for the same request again.
	await expect
		.poll(
			async () => harness.calls.filter((call) => call.path === '/api/email-reset/request-change-email').length,
			{
				timeout: 25_000
			}
		)
		.toBe(2);
	// `settings.profile.EMAIL_CODE_RESENT` in the step's polite status paragraph.
	await expect(section(page, 'general')).toContainText(
		fill('settings.profile.EMAIL_CODE_RESENT', { email: newEmail })
	);

	// A wrong code is refused by the server: `settings.profile.EMAIL_CONFIRM_FAILED` with `toasts.REASONS.INVALID`.
	// Typed one key per slot: typing the whole string into slot 1 loses characters (header finding 6).
	for (const [index, character] of 'WRONGCOD'.split('').entries()) {
		await slots.nth(index).pressSequentially(character, { delay: 40 });
	}
	await expect(page.getByRole('button', { name: message('common.CONFIRM'), exact: true })).toBeEnabled({
		timeout: 15_000
	});
	await page.getByRole('button', { name: message('common.CONFIRM'), exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.path === '/api/email-reset/verify-change-email').length, {
			timeout: 25_000
		})
		.toBe(1);
	expect(harness.bodyOf('POST', '/api/email-reset/verify-change-email')).toMatchObject({ code: 'WRONGCOD' });
	await expect(alertsIn(page, 'general')).toHaveText(
		fill('settings.profile.EMAIL_CONFIRM_FAILED', { reason: message('toasts.REASONS.INVALID') })
	);
	const refusedErrors = shield.consoleErrors();
	// The refusal this stub armed shows up twice in the app's own words: the HTTP line and the mutation line
	// (`probe13` P32 measured both), and nothing else may be in the console here.
	expectOnlyArmedErrors(refusedErrors, [
		armedHttpError('POST', 'email-reset/verify-change-email', 400),
		armedMutationFailure('the email change was refused')
	]);
	expectArmedError(refusedErrors, armedHttpError('POST', 'email-reset/verify-change-email', 400));

	// Cancel returns to the read row, and the address is still the one the mock answers with.
	await page.getByRole('button', { name: message('common.CANCEL'), exact: true }).click({ timeout: 15_000 });
	await expect(section(page, 'general')).toContainText(currentEmail);
	expect(String(harness.user().email)).toBe(currentEmail);

	// Now the code the stub accepts: the step is opened again from the read row, because Cancel threw the code away.
	await page
		.getByRole('button', { name: message('settings.profile.EMAIL_CHANGE_LABEL'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('settings.profile.EMAIL_NEW'), { exact: true }).fill(newEmail);
	await page.getByRole('button', { name: message('common.CONTINUE'), exact: true }).click({ timeout: 15_000 });
	await expect(section(page, 'general')).toContainText(fill('settings.profile.EMAIL_CODE_SENT', { email: newEmail }));
	const retrySlots = page.locator('#general input[aria-label]');
	await expect(retrySlots).toHaveCount(8);
	for (const [index, character] of 'AB12CD34'.split('').entries()) {
		await retrySlots.nth(index).pressSequentially(character, { delay: 40 });
	}
	await page.getByRole('button', { name: message('common.CONFIRM'), exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.path === '/api/email-reset/verify-change-email').length, {
			timeout: 25_000
		})
		.toBe(2);
	await expect(section(page, 'general')).toContainText(newEmail);
	await expect(section(page, 'general')).toContainText(fill('settings.profile.EMAIL_CHANGED', { email: newEmail }));
	expect(String(harness.user().email)).toBe(newEmail);
	expect((await mock.calls('email-reset')).length).toBe(0);
});

/**
 * 10. The rate this person may only ask about: the read-only view, the request form, its body, its outcome.
 */
test('the rate a person may only ask about: the request form, the body it sends, the outcome it reports', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });

	// `rates.OWN_SECTION_HINT`, and every rate the mock knows nothing about (`pay-rate` answers null) shows NOT_SET.
	await expect(section(page, 'rate')).toContainText(message('rates.OWN_SECTION_HINT'));
	await expect(section(page, 'rate')).toContainText(message('rates.REQUEST_CHANGE_ACTION'));
	// No self-edit for a role without CHANGE_OWN_RATES (`use-rates.ts:38-51`).
	await expect(page.getByRole('button', { name: message('rates.EDIT_RATE'), exact: true })).toHaveCount(0);

	await page
		.getByRole('button', { name: message('rates.REQUEST_CHANGE_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	const form = page.getByRole('form', { name: message('rates.REQUEST_CHANGE') });
	await expect(form).toBeVisible();
	// `rates.REQUESTED_RATE`, `rates.CURRENCY`, `rates.REQUEST_REASON`.
	for (const label of [message('rates.REQUESTED_RATE'), message('rates.CURRENCY'), message('rates.REQUEST_REASON')]) {
		await expect(form.getByText(label, { exact: true })).toBeVisible();
	}

	// Nothing typed: `rates.REQUESTED_RATE_REQUIRED` and no request at all.
	await page.getByRole('button', { name: message('rates.REQUEST_SEND'), exact: true }).click({ timeout: 15_000 });
	await expect(alertsIn(page, 'rate')).toHaveText(message('rates.REQUESTED_RATE_REQUIRED'));
	// 1.5 s of quiet proves the guard answered in the form: no request left the page.
	await page.waitForTimeout(1_500);
	expect(harness.writes()).toEqual([]);

	await page.getByLabel(message('rates.REQUESTED_RATE'), { exact: true }).fill('55');
	await page.getByLabel(message('rates.REQUEST_REASON'), { exact: true }).fill('More hours this quarter');
	await page.getByRole('button', { name: message('rates.REQUEST_SEND'), exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.path === '/api/employee/rate-change-request').length, {
			timeout: 25_000
		})
		.toBe(1);
	// `rate.service.ts:79-108` posts the input plus the two ids; the currency is the form's own preselection.
	const body = harness.bodyOf('POST', '/api/employee/rate-change-request');
	expect(Object.keys(body).sort()).toEqual([
		'billRateCurrency',
		'billRateValue',
		'organizationId',
		'reason',
		'tenantId'
	]);
	expect(body.billRateValue).toBe(55);
	expect(body.reason).toBe('More hours this quarter');
	expect(body.organizationId).toBe(fixture.ids.organizationA);
	expect(body.tenantId).toBe(fixture.ids.tenantA);
	// `rates.REQUEST_SENT`, reported as the form's polite status once the answer says admins were notified.
	await expect(section(page, 'rate').locator('[role="status"]')).toContainText(message('rates.REQUEST_SENT'));
	// The accepted answer replaces the form with its status row and one Close button (`rate-change-request-form.tsx:95-105`).
	// Scoped to `#rate`: the shell's own time-zone notice carries a Close as well
	// (`core/components/layouts/default-layout/time-zone-notice.tsx`), and page-wide it is two elements.
	await expect(
		section(page, 'rate').getByRole('button', { name: message('common.CLOSE'), exact: true })
	).toBeVisible();
	expect((await mock.calls('rate-change-request')).length).toBe(0);
	expect(served.employee).toBeTruthy();
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 11. A rate change request the server cannot take, and one it takes with no admin to notify.
 */
test('a rate change request refused: no route on this server, and no admin to notify', async ({
	fixture,
	app,
	shield
}) => {
	const page = await app(PAGE_PATH);
	await serve(page, fixture, { rateChangeAnswer: { status: 404, message: 'no rate change requests here' } });
	await page.reload({ waitUntil: 'domcontentloaded' });

	await page
		.getByRole('button', { name: message('rates.REQUEST_CHANGE_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('rates.REQUESTED_RATE'), { exact: true }).fill('55');
	await page.getByRole('button', { name: message('rates.REQUEST_SEND'), exact: true }).click({ timeout: 15_000 });
	// `rates.REQUEST_UNAVAILABLE` (`rates.ts:397-403`): a 404 is read as "this server has no such route".
	await expect(alertsIn(page, 'rate')).toHaveText(message('rates.REQUEST_UNAVAILABLE'));
	const missingRoute = shield.consoleErrors();
	expectOnlyArmedErrors(missingRoute, [
		armedHttpError('POST', 'employee/rate-change-request', 404),
		armedMutationFailure('no rate change requests here')
	]);

	// Answered with nobody notified: `rates.REQUEST_NOBODY`, in the polite status rather than an alert.
	await app(PAGE_PATH);
	await serve(page, fixture, { rateChangeAnswer: { status: 201, notified: 0 } });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page
		.getByRole('button', { name: message('rates.REQUEST_CHANGE_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await page.getByLabel(message('rates.REQUESTED_RATE'), { exact: true }).fill('55');
	await page.getByRole('button', { name: message('rates.REQUEST_SEND'), exact: true }).click({ timeout: 15_000 });
	await expect(section(page, 'rate').locator('[role="status"]')).toContainText(message('rates.REQUEST_NOBODY'));
	// A request that went through but reached nobody adds no console line of its own. What this page's console holds
	// is the 404 refusal armed in the first half of this test, and nothing else.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('POST', 'employee/rate-change-request', 404),
		armedMutationFailure('no rate change requests here')
	]);
});

/**
 * 12. A role that may change its own rate: what the read view shows, and the PUT the editor sends.
 */
test('a role that may change its own rate: the editor it is offered and the PUT its save sends', async ({
	app,
	fixture,
	shield
}) => {
	const mockServed = await mockUser();
	const served: ServedUser = {
		...mockServed,
		employee: {
			...(mockServed.employee as Record<string, unknown>),
			id: fixture.ids.employee,
			billRateValue: 40,
			billRateCurrency: 'USD',
			reWeeklyLimit: 40
		}
	};
	const page = await app(PAGE_PATH, { scenario: { extraPermissions: ['CHANGE_OWN_RATES'] } });
	const harness = await serve(page, fixture, {
		user: served,
		employeePayRate: { payRateValue: 20, payRateCurrency: 'USD' }
	});
	await page.reload({ waitUntil: 'domcontentloaded' });

	// `rates.PER_HOUR {amount}/h` and `rates.WEEKLY_LIMIT_VALUE {hours} h a week`, both off the values this
	// stub served and the app's own currency formatting (`amountText` above).
	const servedEmployee = served.employee as Record<string, unknown>;
	await expect(section(page, 'rate')).toContainText(
		fill('rates.PER_HOUR', {
			amount: await amountText(
				page,
				String(servedEmployee.billRateCurrency),
				Number(servedEmployee.billRateValue)
			)
		})
	);
	await expect(section(page, 'rate')).toContainText(
		fill('rates.WEEKLY_LIMIT_VALUE', { hours: Number(servedEmployee.reWeeklyLimit) })
	);
	// `rates.OWN_SECTION_EDIT_HINT` replaces the admins-only hint once the permission is there.
	await expect(section(page, 'rate')).toContainText(message('rates.OWN_SECTION_EDIT_HINT'));
	await expect(page.getByRole('button', { name: message('rates.EDIT_RATE'), exact: true })).toBeVisible();

	await page.getByRole('button', { name: message('rates.EDIT_RATE'), exact: true }).click({ timeout: 15_000 });
	// `rates.EDIT_RATE_OF {name}`, named for the served person (`member-rate-editor.tsx`).
	await expect(
		page.getByRole('form', { name: fill('rates.EDIT_RATE_OF', { name: String(served.name) }) })
	).toBeVisible();
	for (const label of [
		message('rates.BILLING_RATE'),
		message('rates.CURRENCY'),
		message('rates.WEEKLY_LIMIT'),
		message('rates.PAY_RATE'),
		message('rates.PAY_CURRENCY')
	]) {
		await expect(page.getByLabel(label, { exact: true })).toBeVisible();
	}

	await page.getByLabel(message('rates.WEEKLY_LIMIT'), { exact: true }).fill('38');
	await page.getByRole('button', { name: message('common.SAVE'), exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'PUT').length, { timeout: 25_000 })
		.toBe(1);
	// `rate.service.ts:79-108` with the fixture role holding ORG_EMPLOYEES_EDIT: the save goes to
	// `PUT /employee/<id>`, never to `PUT /employee/<id>/profile` (see the header).
	const saved = harness.calls.find((call) => call.method === 'PUT');
	expect(saved?.path).toBe(`/api/employee/${fixture.ids.employee}`);
	expect(Object.keys(JSON.parse(String(saved?.body ?? '{}'))).sort()).toEqual([
		'organizationId',
		'reWeeklyLimit',
		'tenantId'
	]);
	expect(JSON.parse(String(saved?.body ?? '{}')).reWeeklyLimit).toBe(38);
	expect(saved?.path).not.toContain('/profile');
	await page.mouse.move(2, 2);
	// 1.5 s of quiet proves no second write followed the first (an "apply to tracked time?" answer would have).
	await page.waitForTimeout(1_500);
	expect(harness.writes()).toEqual([`PUT /api/employee/${fixture.ids.employee}`]);
	// The mock's organization carries no `timeLogsKeepTheirRates`, so the question is never asked
	// (`rate-apply.ts:21-36`, `use-rate-apply-question.ts:34-40`).
	await expect(section(page, 'rate').getByText(message('rates.APPLY_QUESTION'))).toHaveCount(0);
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 13. This browser: the switch, the cookie it writes, the reload that keeps it, and the request that never happens.
 */
test('This browser: the switch writes a cookie, survives a reload, and asks the API for nothing', async ({
	app,
	mock,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const browserSwitch = section(page, 'this-browser').getByRole('switch');
	await expect(browserSwitch).toHaveCount(1);
	// `settings.thisBrowser.SIGN_OUT_ON_CLOSE`.
	await expect(section(page, 'this-browser')).toContainText(message('settings.thisBrowser.SIGN_OUT_ON_CLOSE'));
	await expect(browserSwitch).toHaveAttribute('aria-checked', 'false');
	expect((await page.context().cookies()).some((cookie) => cookie.name === BROWSER_CLOSE_COOKIE)).toBe(false);

	const toggledAt = Date.now();
	await browserSwitch.click({ timeout: 15_000 });
	await expect(browserSwitch).toHaveAttribute('aria-checked', 'true');

	const cookie = (await page.context().cookies()).find((entry) => entry.name === BROWSER_CLOSE_COOKIE);
	if (!cookie) throw new Error(`the switch wrote no ${BROWSER_CLOSE_COOKIE} cookie in the browser context`);
	// `constants.tsx:149` names the cookie; `cookies/index.ts:104-115` writes it readable, for a year, on `/`.
	expect(cookie.value).toBe('1');
	expect(cookie.httpOnly).toBe(false);
	expect(cookie.path).toBe('/');
	expect(cookie.sameSite).toBe('Lax');
	const daysOut = (cookie.expires * 1_000 - Date.now()) / 86_400_000;
	expect(daysOut).toBeGreaterThan(360);
	expect(daysOut).toBeLessThan(370);

	// 2 s of quiet: the only thing that changed was a cookie. No user write, no session call, nothing on `/api/user/`.
	await page.waitForTimeout(2_000);
	const callsAfterToggle = (await mock.requests()).filter(
		(request) => request.startMs >= toggledAt && request.path.startsWith('/api/user/')
	);
	expect(callsAfterToggle).toEqual([]);

	// The choice is the browser's own, so it survives a reload without the app asking anything.
	await page.reload({ waitUntil: 'domcontentloaded' });
	const reloadedSwitch = section(page, 'this-browser').getByRole('switch');
	await expect(reloadedSwitch).toHaveAttribute('aria-checked', 'true');

	await reloadedSwitch.click({ timeout: 15_000 });
	await expect(reloadedSwitch).toHaveAttribute('aria-checked', 'false');
	// Switching it off deletes the cookie rather than writing `0` (`cookies/index.ts:79-81`).
	expect((await page.context().cookies()).some((entry) => entry.name === BROWSER_CLOSE_COOKIE)).toBe(false);
	expectOnlyArmedErrors(shield.consoleErrors(), []);
});

/**
 * 14. The sessions list, one other session signed out, and a refused sign-out that changes nothing.
 */
test('the sessions list: this device first, one other session signed out, a refused sign-out leaving it listed', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const seed = sessionsSeed();
	const harness = await serve(page, fixture, { sessions: seed });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(section(page, 'sessions')).toBeVisible();

	// `sessionsInOrder` again (`core/lib/auth/user-sessions.ts:100-110`): the poll waits for the rows and proves the
	// order they rendered in, so the click below names a row the page already showed.
	const others = seed
		.filter((session) => !session.current)
		.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
	const firstOther = others[0];
	const firstOtherLabel = await sessionRowLabel(page, firstOther);
	const rowLabels = await Promise.all(others.map((session) => sessionRowLabel(page, session)));
	await expect
		.poll(async () => (await sessionRowLabels(page)).join(' | '), { timeout: 25_000 })
		.toBe(rowLabels.join(' | '));

	await page.getByRole('button', { name: firstOtherLabel, exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'DELETE').length, { timeout: 25_000 })
		.toBe(1);
	// `user-session.service.ts:28` deletes one session by id; the list is read again after it settles.
	expect(harness.calls.find((call) => call.method === 'DELETE')?.path).toBe(`/api/auth/sessions/${firstOther.id}`);
	expect(harness.sessions().map((session) => session.id)).not.toContain(firstOther.id);

	await parkPointer(page);
	// `settings.sessions.SIGNED_OUT_ONE {device}` names the device the row showed.
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(fill('settings.sessions.SIGNED_OUT_ONE', { device: await sessionNameOf(page, firstOther) }));
	await expect(section(page, 'sessions')).not.toContainText(await sessionNameOf(page, firstOther));
	// `settings.sessions.OTHER_SESSIONS` recounts.
	await expect(section(page, 'sessions')).toContainText(countText('settings.sessions.OTHER_SESSIONS', 1));
	expectOnlyArmedErrors(shield.consoleErrors(), []);

	// Refused: the row stays exactly as it was and only a toast says why (`sessions-section.tsx:217`, finding 4).
	await app(PAGE_PATH);
	const refusedSeed = sessionsSeed();
	const refusedHarness = await serve(page, fixture, {
		arm: (method, path) =>
			method === 'DELETE' && path.startsWith('/api/auth/sessions/')
				? { status: 400, message: 'the sign-out was refused' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	// The name comes from the sessions this stub served; the web-first assertion is what waits for the row.
	const refusedLabel = await sessionRowLabel(
		page,
		refusedSeed
			.filter((session) => !session.current)
			.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))[0]
	);
	await expect(section(page, 'sessions').getByRole('button', { name: refusedLabel, exact: true })).toHaveCount(1);
	await page.getByRole('button', { name: refusedLabel, exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => refusedHarness.calls.filter((call) => call.method === 'DELETE').length, { timeout: 25_000 })
		.toBe(1);
	await parkPointer(page);
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(failureToast('settings.sessions.SIGN_OUT_FAILED', 'toasts.REASONS.INVALID'));
	const sessionId = refusedSeed.filter((session) => !session.current)[0].id;
	await expect(section(page, 'sessions').locator(`[aria-label="${refusedLabel}"]`)).toHaveCount(1);
	expect(refusedHarness.sessions().map((session) => session.id)).toContain(sessionId);
	const errors = shield.consoleErrors();
	expectOnlyArmedErrors(errors, [
		armedHttpError('DELETE', `auth/sessions/${sessionId}`, 400),
		armedMutationFailure('the sign-out was refused')
	]);
});

/**
 * 15. A sessions list that cannot be read: a server that fails it, and a server that has no such route.
 */
test('the sessions section when the list cannot be read: a failed read with a retry, and a server without the route', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const failedRead = await serve(page, fixture, { sessions: 'error' });
	await page.reload({ waitUntil: 'domcontentloaded' });

	// `settings.sessions.LOAD_FAILED` with `settings.sessions.RETRY` (`sessions-section.tsx:150-175`).
	await expect(section(page, 'sessions')).toContainText(message('settings.sessions.LOAD_FAILED'));
	await expect(
		section(page, 'sessions').getByRole('button', { name: message('settings.sessions.RETRY'), exact: true })
	).toBeVisible();
	// The read was asked for, and refused; `shouldRetryList` retried it `LIST_RETRIES` times
	// (`use-user-sessions.ts:27-32,50`) — the measured count is three.
	await expect
		.poll(async () => failedRead.calls.filter((call) => call.path === '/api/auth/sessions').length, {
			timeout: 25_000
		})
		.toBeGreaterThanOrEqual(3);
	const errors = shield.consoleErrors();
	const armedLines = errors.filter((line) => armedHttpError('GET', 'auth/sessions', 500).test(line));
	expect(armedLines.length, 'the refused read logged its own line (retries vary, so no exact count)').toBeGreaterThan(
		0
	);
	expectOnlyArmedErrors(errors, [armedHttpError('GET', 'auth/sessions', 500)]);

	// A 404 is a different answer: `isUnavailable` and the section is not rendered at all (finding 3).
	await app(PAGE_PATH);
	const unavailable = await serve(page, fixture, { sessions: 'unavailable' });
	await page.reload({ waitUntil: 'domcontentloaded' });
	// Wait for the sign that the read was handled — the stub recorded it — before asserting the section is absent.
	await expect
		.poll(async () => unavailable.calls.filter((call) => call.path === '/api/auth/sessions').length, {
			timeout: 25_000
		})
		.toBeGreaterThan(0);
	await expect(section(page, 'sessions')).toHaveCount(0);
	const unavailableErrors = shield.consoleErrors();
	// The three retried 500s of the first half are still in this page's console; both refusals are named here.
	expectOnlyArmedErrors(unavailableErrors, [
		armedHttpError('GET', 'auth/sessions', 500),
		armedHttpError('GET', 'auth/sessions', 404)
	]);
});

/**
 * 16. Signing every other session out: the password proof, the wrong proof, and the code path the server asked for.
 */
test('signing out the other sessions: the password proof, a wrong one, and the code path the server asked for', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const email = String(served.email);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(section(page, 'sessions')).toContainText(countText('settings.sessions.OTHER_SESSIONS', 2));

	await page
		.getByRole('button', { name: message('settings.sessions.SIGN_OUT_OTHERS'), exact: true })
		.click({ timeout: 15_000 });
	// `settings.sessions.SIGN_OUT_OTHERS_TITLE {count}`, its two consequences and `SIGN_OUT_OTHERS_CONFIRM {count}`.
	await expect(dialog(page)).toContainText(countText('settings.sessions.SIGN_OUT_OTHERS_TITLE', 2));
	await expect(dialog(page)).toContainText(message('settings.sessions.CONSEQUENCE_OTHERS'));
	await expect(dialog(page)).toContainText(message('settings.sessions.CONSEQUENCE_THIS'));
	const confirm = dialog(page).getByRole('button', {
		name: countText('settings.sessions.SIGN_OUT_OTHERS_CONFIRM', 2),
		exact: true
	});
	await expect(confirm).toBeDisabled();
	await dialog(page).getByLabel(message('settings.sessions.PASSWORD_LABEL'), { exact: true }).fill('ProbePass1!');
	await expect(confirm).toBeEnabled();
	await confirm.click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.path === '/api/auth/sessions/sign-out-others').length, {
			timeout: 25_000
		})
		.toBe(1);
	// `user-session.service.ts:23` sends the proof; only the proof and the two ids are sent.
	const proof = harness.bodyOf('POST', '/api/auth/sessions/sign-out-others');
	expect(Object.keys(proof).sort()).toEqual(['organizationId', 'password', 'tenantId']);
	await parkPointer(page);
	// `settings.sessions.SIGNED_OUT_OTHERS {count}` counts what the answer said went, from the served seed.
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(countText('settings.sessions.SIGNED_OUT_OTHERS', 2));
	await expect(dialog(page)).toHaveCount(0);
	// `settings.sessions.ONLY_THIS_DEVICE` replaces the list once nothing else is signed in.
	await expect(section(page, 'sessions')).toContainText(message('settings.sessions.ONLY_THIS_DEVICE'));
	expectOnlyArmedErrors(shield.consoleErrors(), []);

	// A wrong proof signs nobody out: `settings.sessions.WRONG_PASSWORD` in the dialog, the list untouched.
	await app(PAGE_PATH);
	const wrongSeed = sessionsSeed();
	await serve(page, fixture, {
		arm: (method, path, body) =>
			method === 'POST' && path === '/api/auth/sessions/sign-out-others' && Boolean(body.password)
				? { status: 400, message: 'the proof was not right', code: 'SESSION_CONFIRMATION_INVALID' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page
		.getByRole('button', { name: message('settings.sessions.SIGN_OUT_OTHERS'), exact: true })
		.click({ timeout: 15_000 });
	await dialog(page).getByLabel(message('settings.sessions.PASSWORD_LABEL'), { exact: true }).fill('WrongPass1!');
	await dialog(page)
		.getByRole('button', { name: countText('settings.sessions.SIGN_OUT_OTHERS_CONFIRM', 2), exact: true })
		.click({ timeout: 15_000 });
	// `sign-out-others-dialog.tsx:36-63`: `CONFIRMATION_INVALID` maps to `WRONG_PASSWORD`, not to a reason.
	await expect(dialog(page).getByRole('alert')).toHaveText(message('settings.sessions.WRONG_PASSWORD'));
	await expect(dialog(page)).toHaveCount(1);
	// The row is untouched. A session's name reaches the page in the row button's accessible name (`Sign out:` +
	// the device), not in the row's own text (`sessions-section.tsx:150-175`), so that is what is asserted.
	// The row survived. While the dialog is open the whole section is `aria-hidden` (measured:
	// `<section id="sessions" aria-hidden="true">` in `s3-lane-b-profile-2.log` failure 9), so a role lookup sees
	// nothing; the button's own `aria-label` is what carries the session's name and is what stays.
	await expect(
		section(page, 'sessions').locator(
			`[aria-label="${await sessionRowLabel(page, wrongSeed.filter((session) => !session.current)[0])}"]`
		)
	).toHaveCount(1);

	// The server refusing this kind of proof flips the dialog to the code path by itself
	// (`user-sessions.ts:142-150` `nextProofAfter`, `sign-out-others-dialog.tsx:59-61,171-180`).
	await app(PAGE_PATH);
	const codeHarness = await serve(page, fixture, {
		arm: (method, path, body) =>
			method === 'POST' && path === '/api/auth/sessions/sign-out-others' && Boolean(body.password)
				? { status: 400, message: 'this account needs a code', code: 'SESSION_CONFIRMATION_REQUIRED' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page
		.getByRole('button', { name: message('settings.sessions.SIGN_OUT_OTHERS'), exact: true })
		.click({ timeout: 15_000 });
	await dialog(page).getByLabel(message('settings.sessions.PASSWORD_LABEL'), { exact: true }).fill('ProbePass1!');
	await dialog(page)
		.getByRole('button', { name: countText('settings.sessions.SIGN_OUT_OTHERS_CONFIRM', 2), exact: true })
		.click({ timeout: 15_000 });
	// `settings.sessions.NEEDS_CODE` says why the proof changed, and `CODE_HINT` names where the code goes.
	await expect(dialog(page)).toContainText(message('settings.sessions.NEEDS_CODE'));
	await expect(dialog(page)).toContainText(fill('settings.sessions.CODE_HINT', { email }));

	await dialog(page)
		.getByRole('button', { name: message('settings.sessions.SEND_CODE'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => codeHarness.calls.filter((call) => call.path === '/api/auth/signin.email').length, {
			timeout: 25_000
		})
		.toBe(1);
	// `auth.service.ts:179-186` in direct mode posts the address plus the app's own branding.
	const codeRequest = codeHarness.bodyOf('POST', '/api/auth/signin.email');
	expect(codeRequest.email).toBe(email);
	// `settings.sessions.CODE_SENT`, and the button has become `SEND_CODE_AGAIN`.
	await expect(dialog(page)).toContainText(fill('settings.sessions.CODE_SENT', { email }));
	await expect(
		dialog(page).getByRole('button', { name: message('settings.sessions.SEND_CODE_AGAIN'), exact: true })
	).toBeVisible();

	await dialog(page).getByLabel(message('settings.sessions.CODE_LABEL'), { exact: true }).fill('AB12CD34');
	await dialog(page)
		.getByRole('button', { name: countText('settings.sessions.SIGN_OUT_OTHERS_CONFIRM', 2), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(
			async () => codeHarness.calls.filter((call) => call.path === '/api/auth/sessions/sign-out-others').length,
			{
				timeout: 25_000
			}
		)
		.toBe(2);
	// The second attempt carries the code instead of a password, and nothing else but the two ids — measured in
	// `probe13` P30: attempt 1 `{ organizationId, password, tenantId }`, attempt 2 `{ code, organizationId,
	// tenantId }` with no `password` key at all. So the *last* call of this path is the one to read.
	const codeProof = codeHarness.lastBodyOf('POST', '/api/auth/sessions/sign-out-others');
	expect(Object.keys(codeProof).sort()).toEqual(['code', 'organizationId', 'tenantId']);
	expect(codeProof.code).toBe('AB12CD34');
	await parkPointer(page);
	await expect(section(page, 'sessions')).toContainText(message('settings.sessions.ONLY_THIS_DEVICE'), {
		timeout: 20_000
	});
	// The refusal that flipped the proof is the only console noise this flow produced.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('POST', 'auth/sessions/sign-out-others', 400),
		armedMutationFailure('the proof was not right'),
		armedMutationFailure('this account needs a code')
	]);
});

/**
 * 17. The danger zone's first row: leave teams, and a server that says there is nothing to leave.
 */
test('the danger zone: leaving the teams this person joined as a member, and a refusal that says there is nothing to leave', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const userId = String(served.id);
	const harness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });

	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.LEAVE_TEAMS_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	// `settings.profile.LEAVE_TEAMS_TITLE` and its three consequence lines (`account-danger-section.tsx:41-72`);
	// unlike the deletions, leaving needs no typed confirmation.
	await expect(dialog(page)).toContainText(message('settings.profile.LEAVE_TEAMS_TITLE'));
	await expect(dialog(page)).toContainText(message('settings.profile.LEAVE_TEAMS_ROW_TEAMS'));
	await expect(dialog(page)).toContainText(message('settings.profile.LEAVE_TEAMS_ROW_TASKS'));
	await expect(dialog(page)).toContainText(message('settings.profile.LEAVE_TEAMS_ROW_KEPT'));
	await dialog(page)
		.getByRole('button', { name: message('settings.profile.LEAVE_TEAMS_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => harness.calls.filter((call) => call.method === 'DELETE').length, { timeout: 25_000 })
		.toBe(1);
	// `organization-team.service.ts` `removeUserFromAllTeams`: one DELETE naming the user, not the teams.
	expect(harness.calls.find((call) => call.method === 'DELETE')?.path).toBe(`/api/organization-team/teams/${userId}`);
	await parkPointer(page);
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(message('settings.profile.LEAVE_TEAMS_DONE'));
	await expect(dialog(page)).toHaveCount(0);
	// This accepted write is the one that makes the shell ask for a new token pair (`reconcileSnapshot` ->
	// `requestNewPair` -> `setAccessTokenCookie` -> `readSnapshot` -> `decodeJWT`, and `InitState.useEffect` ->
	// `syncTokenOrganization` -> `decodeJWT`), and the mock's token is not a signed JWT, so what is left is the
	// line the header excuses and nothing else (`core/lib/auth/jwt-utils.ts:58`).
	expectOnlyArmedErrors(shield.consoleErrors(), [JWT_DECODE_FAILURE]);

	// Refused with 404: `settings.profile.LEAVE_TEAMS_NONE` rather than a server complaint (finding 5).
	await app(PAGE_PATH);
	await serve(page, fixture, {
		arm: (method, path) =>
			method === 'DELETE' && path === `/api/organization-team/teams/${userId}`
				? { status: 404, message: 'nothing to leave here' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.LEAVE_TEAMS_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await dialog(page)
		.getByRole('button', { name: message('settings.profile.LEAVE_TEAMS_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await expect(dialog(page).getByRole('alert')).toHaveText(message('settings.profile.LEAVE_TEAMS_NONE'));
	// The four lines this one refusal produces, plus the token-decoding lines the accepted half of this test left
	// behind (the header's measured exception); nothing else is excused.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('DELETE', `organization-team/teams/${userId}`, 404),
		new RegExp('\\[App\\] Remove user from all teams failed:'),
		new RegExp('Remove user from all teams failed: ApiError: nothing to leave here'),
		armedMutationFailure('nothing to leave here'),
		JWT_DECODE_FAILURE
	]);
});

/**
 * 18. Deleting the account: the typed confirmation, a refusal that keeps the person on the page, and the accepted
 *     deletion that signs them out of it.
 */
test('the danger zone: deleting the account needs the email typed, a refusal keeps the page, and an accepted one signs out', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const userId = String(served.id);
	const email = String(served.email);
	const refusedHarness = await serve(page, fixture, {
		arm: (method, path) =>
			method === 'DELETE' && path === `/api/user/${userId}`
				? { status: 400, message: 'the deletion was refused' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });

	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.DELETE_ACCOUNT_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	// `settings.profile.DELETE_ACCOUNT_TITLE` and its two consequence rows (`account-danger-section.tsx:41-72`).
	await expect(dialog(page)).toContainText(message('settings.profile.DELETE_ACCOUNT_TITLE'));
	await expect(dialog(page)).toContainText(message('settings.profile.DELETE_ACCOUNT_ROW_ACCOUNT'));
	await expect(dialog(page)).toContainText(message('settings.profile.DELETE_ACCOUNT_ROW_TEAMS'));
	// `settings.common.TYPE_TO_CONFIRM {text}` names the account's own address, taken from the served user.
	const typed = dialog(page).getByLabel(fill('settings.common.TYPE_TO_CONFIRM', { text: email }), { exact: true });
	const confirm = dialog(page).getByRole('button', {
		name: message('settings.profile.DELETE_ACCOUNT_ACTION'),
		exact: true
	});
	await expect(confirm).toBeDisabled();
	await typed.fill(email);
	await expect(confirm).toBeEnabled();
	await confirm.click({ timeout: 15_000 });
	await expect
		.poll(async () => refusedHarness.calls.filter((call) => call.method === 'DELETE').length, { timeout: 25_000 })
		.toBe(1);
	// `settings.profile.DELETE_FAILED {reason}` inside the dialog; the dialog stays open and the page does not move.
	await expect(dialog(page).getByRole('alert')).toHaveText(
		fill('settings.profile.DELETE_FAILED', { reason: message('toasts.REASONS.INVALID') })
	);
	await expect(dialog(page)).toHaveCount(1);
	await expect(page).toHaveURL(new RegExp(`${PAGE_PATH}$`));
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('DELETE', `user/${userId}`, 400),
		armedMutationFailure('the deletion was refused')
	]);

	// Accepted: `use-user.ts:11-27` deletes the user, drops the user queries and signs out — the page the person
	// lands on is the sign-in page.
	await app(PAGE_PATH);
	const acceptedHarness = await serve(page, fixture, {});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.DELETE_ACCOUNT_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await dialog(page)
		.getByLabel(fill('settings.common.TYPE_TO_CONFIRM', { text: email }), { exact: true })
		.fill(email);
	await dialog(page)
		.getByRole('button', { name: message('settings.profile.DELETE_ACCOUNT_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => acceptedHarness.calls.filter((call) => call.method === 'DELETE').length, { timeout: 25_000 })
		.toBe(1);
	expect(acceptedHarness.calls.find((call) => call.method === 'DELETE')?.path).toBe(`/api/user/${userId}`);
	await expect(page).toHaveURL(/\/auth\/passcode$/, { timeout: 30_000 });
	// The sign-in page the person ends on offers its own ways back in.
	await expect(page.getByRole('button', { name: everIdLabel(), exact: true })).toBeVisible({
		timeout: 30_000
	});
	// What this page's console may hold now: the refusal armed in the first half, and the shell decoding the mock's
	// unsigned session token after `logOut` (`core/lib/auth/jwt-utils.ts:58`). Nothing else.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('DELETE', `user/${userId}`, 400),
		armedMutationFailure('the deletion was refused'),
		JWT_DECODE_FAILURE
	]);
});

/**
 * 19. Deleting the account and its data: the preview the confirm depends on, the planHash it carries, a 409 that
 *     changed the plan, and a preview that would not load.
 */
test('deleting the account and its data: the preview, its planHash, a 409 that changed the plan, a preview that failed', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(PAGE_PATH);
	const served = await mockUser();
	const email = String(served.email);
	const workspaceName = fixture.names.organizationA;
	// The preview this spec serves; every number and name the dialog shows comes from this answer.
	const previewAnswer = {
		email,
		expiresAt: '2026-03-05T10:00:00.000Z',
		planHash: 'served-plan-hash',
		accounts: [
			{
				workspace: workspaceName,
				role: 'ADMIN',
				organizations: [workspaceName],
				otherMembers: 2,
				outcome: 'ACCOUNT_REMOVED',
				soleAdmin: true
			}
		]
	};

	// The preview read itself failing: the dialog says so, offers `Try again`, and the confirm stays shut
	// (`delete-my-account-preview.tsx`, `use-delete-my-account.ts:24-40`).
	await serve(page, fixture, {
		arm: (method, path) =>
			method === 'GET' && path === '/api/account-deletion/me'
				? { status: 500, message: 'the preview read failed' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.DELETE_DATA_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await expect(dialog(page).locator('[data-testid="delete-my-account-preview-error"]')).toBeVisible();
	await expect(dialog(page)).toContainText(message('pages.accountDeletion.PREVIEW_ERROR'));
	await expect(
		dialog(page).getByRole('button', { name: message('pages.accountDeletion.TRY_AGAIN'), exact: true })
	).toBeVisible();
	await expect(
		dialog(page).getByRole('button', { name: message('pages.accountDeletion.CONFIRM_BUTTON'), exact: true })
	).toBeDisabled();
	expect(
		shield.consoleErrors().filter((line) => armedHttpError('GET', 'account-deletion/me', 500).test(line)).length
	).toBeGreaterThan(0);

	// A 409 on the confirm: `pages.accountDeletion.PLAN_CHANGED`, the dialog stays open, and the preview is read again.
	await app(PAGE_PATH);
	const staleHarness = await serve(page, fixture, {
		deletionPreview: previewAnswer,
		arm: (method, path) =>
			method === 'POST' && path === '/api/account-deletion/me'
				? { status: 409, message: 'the plan changed since this was loaded' }
				: null
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.DELETE_DATA_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	await expect(dialog(page).locator('[data-testid="delete-my-account-preview"]')).toBeVisible();
	const confirmButton = dialog(page).getByRole('button', {
		name: message('pages.accountDeletion.CONFIRM_BUTTON'),
		exact: true
	});
	await expect(confirmButton).toBeDisabled();
	await dialog(page)
		.getByLabel(fill('settings.common.TYPE_TO_CONFIRM', { text: email }), { exact: true })
		.fill(email);
	await expect(confirmButton).toBeEnabled();
	await confirmButton.click({ timeout: 15_000 });
	await expect
		.poll(async () => staleHarness.calls.filter((call) => call.method === 'POST').length, { timeout: 25_000 })
		.toBe(1);
	// `account-deletion.service.ts:76-97`: the confirm carries the `planHash` the preview answer handed over.
	const confirmBody = staleHarness.bodyOf('POST', '/api/account-deletion/me');
	expect(confirmBody.planHash).toBe(previewAnswer.planHash);
	expect(confirmBody.confirm).toBe(true);
	expect(Object.keys(confirmBody).sort()).toEqual([
		'appLink',
		'appLogo',
		'appName',
		'appSignature',
		'companyLink',
		'companyName',
		'confirm',
		'planHash'
	]);
	await expect(dialog(page).getByText(message('pages.accountDeletion.PLAN_CHANGED'))).toHaveText(
		message('pages.accountDeletion.PLAN_CHANGED')
	);
	await expect(dialog(page)).toHaveCount(1);
	await expect(page).toHaveURL(new RegExp(`${PAGE_PATH}$`));
	// The preview was read for the dialog and read again after the 409 (`account-danger-section.tsx:168-177`).
	await expect.poll(async () => staleHarness.previewReads(), { timeout: 25_000 }).toBe(2);
	await parkPointer(page);
	await expect
		.poll(async () => (await toastTexts(page)).join(' | '), { timeout: 20_000 })
		.toContain(failureToast('toasts.MUTATION_FAILED', 'toasts.REASONS.CONFLICT'));
	// This page's console: the 409 armed here, and the preview read armed in the first half (a failed *query*
	// logs the HTTP line only — no mutation line).
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('POST', 'account-deletion/me', 409),
		armedMutationFailure('the plan changed since this was loaded'),
		armedHttpError('GET', 'account-deletion/me', 500)
	]);

	// Accepted last, because it ends the session: the preview the person confirmed was the one served here.
	await app(PAGE_PATH);
	const acceptedHarness = await serve(page, fixture, { deletionPreview: previewAnswer });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await section(page, 'danger-zone')
		.getByRole('button', { name: message('settings.profile.DELETE_DATA_ACTION'), exact: true })
		.click({ timeout: 15_000 });
	const preview = dialog(page).locator('[data-testid="delete-my-account-preview"]');
	await expect(preview).toBeVisible();
	// `pages.accountDeletion.ORGANIZATIONS`, `OUTCOME_ACCOUNT_REMOVED` with the served member count, the served
	// sole-admin warning and `SIGN_OUT_AFTER`.
	await expect(preview).toContainText(fill('pages.accountDeletion.ORGANIZATIONS', { organizations: workspaceName }));
	await expect(preview).toContainText(pluralOnly('pages.accountDeletion.OUTCOME_ACCOUNT_REMOVED', 2));
	await expect(dialog(page).getByTestId('delete-account-sole-admin')).toHaveText(
		countText('pages.accountDeletion.SOLE_ADMIN_WARNING', 2)
	);
	await expect(preview).toContainText(message('pages.accountDeletion.SIGN_OUT_AFTER'));
	await dialog(page)
		.getByLabel(fill('settings.common.TYPE_TO_CONFIRM', { text: email }), { exact: true })
		.fill(email);
	await dialog(page)
		.getByRole('button', { name: message('pages.accountDeletion.CONFIRM_BUTTON'), exact: true })
		.click({ timeout: 15_000 });
	await expect
		.poll(async () => acceptedHarness.calls.filter((call) => call.method === 'POST').length, { timeout: 25_000 })
		.toBe(1);
	expect(acceptedHarness.bodyOf('POST', '/api/account-deletion/me').planHash).toBe(previewAnswer.planHash);
	await expect(page).toHaveURL(/\/auth\/passcode$/, { timeout: 30_000 });
	// Nothing was refused on the way out, so only the shell's own token decoding is left.
	expectOnlyArmedErrors(shield.consoleErrors(), [
		armedHttpError('POST', 'account-deletion/me', 409),
		armedHttpError('GET', 'account-deletion/me', 500),
		armedMutationFailure('the plan changed since this was loaded'),
		JWT_DECODE_FAILURE
	]);
});
