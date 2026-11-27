import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, overrideRuntimeEnv, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees on **Settings › Personal › Notifications** (`/settings/personal/notifications`,
 * `app/[locale]/(main)/settings/personal/notifications/page.tsx` → `NotificationsSettingsPage`,
 * `core/components/settings/pages/notifications/notifications-settings-page.tsx:132`) on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994, `playwright/test-servers.ts:38`), with the lane's
 * flags `E2E_EVER_ID=1 E2E_MEET=1` (neither changes anything on this page: no Ever ID route and no meeting route is
 * used here). The long-running **timer threshold** is pinned by `suites/mock/notifications.spec.ts` (its choices, its
 * save, its read-back, it kept across another save, a failed read) and `suites/mock/routes.spec.ts:60` is a smoke visit:
 * this file covers the rest of the page and never re-tests that threshold's value.
 *
 * ## Where the values came from
 *
 * Measured first in the throwaway probe `D:\Coding\.tmp\probe-notifsettings\probe1.spec.ts` / `probe2.spec.ts` (logs
 * `D:\Coding\.tmp\s3-lane-a-notifsettings-p1.log` and `-p2.log`, both on this lane on 2026-11-27), then confirmed by
 * this file's own lane runs (logs named at the end of this header). Three corrections the probe forced:
 * - probe 1's first case registered its stub **after** the visit, so the page's read went to the mock's own handler and
 *   the recorded calls were empty; probe 2 fixed the order (stub first, then cookies, then navigate — what
 *   `playwright/helpers.ts:405-424` `signInAndVisit` is for) and every test here uses that order.
 * - probe 1 read a select's options with `page.evaluate`, which also caught the **previous** select's still-mounted
 *   hidden popup and reported 4 options for the `Every kind` select; every option list here is read through
 *   `getByRole('option')`, which sees only the open popup.
 * - probe 1's `overrideRuntimeEnv` ran **after** the visit, so the flags never reached the page and no push section
 *   appeared; probe 2 ran it before and got both sections. The override is an init script
 *   (`playwright/helpers.ts:489-507`), so the order is part of the measurement.
 * - probe 2 polled "a call was recorded" against a count the earlier read already satisfied, so its typing case looked
 *   saved when it was not; probe 3 (`D:\Coding\.tmp\probe-notifsettings\probe3.spec.ts`, log
 *   `D:\Coding\.tmp\s3-lane-a-notifsettings-p3.log`) measured the quiet-hours save instead of assuming it (finding 10),
 *   and probe 2's "the typed 11:15 PM saved 23:15 on the first blur" line is what that probe corrected.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app shell and its NextAuth stub; the mock's `GET /api/user/me`; the mock's catch-all for every
 * path this file does not stub (`cypress/support/mock-gauzy-server.mjs:895` `pagination([])` = `{ items: [], total: 0 }`),
 * which is what answers `GET /inbox/delivery/status` (finding 5) and `GET /api/inbox/items/counts` (the bell, mounted by
 * the shell once the Inbox flag is on).
 *
 * **Served by this file:** `GET|POST|PUT /api/employee-notification-setting[/<id>]` and, in the flag tests,
 * `GET /api/inbox/push-subscriptions`, `POST /api/inbox/push-subscriptions` and
 * `GET /api/inbox/push-subscriptions/public-key` — `page.route` on the mock origin, in the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`. The mock *does* answer the setting row
 * (`mock-gauzy-server.mjs:695-723`, seeded by `scenario.notificationPreferences`), but its request log carries no body
 * (`:1041-1048`, pinned by `tools/performance/mock-gauzy-server.test.mjs`) and this file is about the bodies — so the
 * stub replaces that handler here, store-backed: the read always answers the current store, so a write changes what the
 * next read (or a reload) says, and a refused write changes nothing. Every answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`); `route.fetch()` is never called, so a stubbed
 * test proves the page acted on this file's store and not on the mock. The browser calls the mock origin directly, never
 * the app's own `app/api/**` twins (`suites/lane-a/README.md:63-72`).
 *
 * **The two flags.** Lane-a leaves `NEXT_PUBLIC_INBOX_ENABLED` and `NEXT_PUBLIC_REALTIME_ENABLED` unset — measured, not
 * assumed: with them unset the page renders **no** `#notification-push` and **no** `#notification-sound` (probe-1 P8,
 * test 1 here), which is the lane's wiring (`playwright/test-servers.ts` sets neither; `core/lib/utils/inbox-enabled.ts:8-10`
 * and `core/lib/realtime/config.ts:30-34` read them at runtime through `readRuntimeEnv`). The flag tests turn them on
 * **in the browser only** with `overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' … })`; test 9 turns on the
 * Inbox alone (Sound needs both, `notification-push-section.tsx:310`) and test 10 turns on both.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `notifications-settings-page.tsx`: the rows only once the read settled (`showsRows` `:144-146`), skeleton `:194`,
 *   unavailable Notice `:195-201`, load-error Notice + `notifications.RETRY` `:202-213`; Tasks (`#notifications`,
 *   `WORK_TYPES` `:58`) `:216-256` with the task-update row `:238-255` (`applied.taskUpdate !== false` `:249`, saves
 *   `{ taskUpdate: isOn }` `:252`), Team and account (`GROUP_PEOPLE`, `PEOPLE_TYPES` `:60`) `:257-266`,
 *   `#notification-time-tracking` `:267-283`, `#notification-task-due` `:284-300`, Boards `:301-305`,
 *   `#notification-meetings` `:306-320`, `#notification-email` `:321-345`, `BrowserPushSection` `:346-353`,
 *   `SoundSection` `:354`, `#notification-quiet-hours` `:355-372`. A type row's email-mode select renders only while its
 *   switch is on (`:109-118`); its switch is `#notification-setting-<key>` (`:97`); a type save `:148-165` (its toast is
 *   `notifications.SETTINGS_PAGE.SAVE_FAILED` `:160`) and a preferences save `:167-173` (its toast is
 *   `…CHANNELS.SAVE_FAILED` `:171`); `onEmailMode` `:175-176` sends `undefined` for `default`; `onQuietHours` `:177`.
 * - `notification-channel-rows.tsx`: `EmailModeSelect` `:43-74` (`allowDefault` `:53-55` puts `MODE_DEFAULT` first),
 *   `EmailDefaultRow` `:83-102` (no `allowDefault`), `QuietHoursRow` `:114-187` (switch from `useId` `:116`, `From`/`Until`
 *   `TimeField`s `:153-175` saved when a field is left `:128-144`, switched on = `DEFAULT_QUIET_HOURS` in the browser's
 *   zone `:181-183`, the zone printed from the saved window else the browser's `:121`), `DigestHourRow` `:196-220` (24
 *   items, label `digestHourLabel` `:208`/`:213`).
 * - `reminder-threshold-row.tsx:39-96`: the offered thresholds, then the `off` item `:89-91`; a saved value the list does
 *   not offer is appended sorted `:55`; the kind's email-mode select only while a threshold is chosen or the kind is
 *   filed whatever the lead `:65-74` (`meeting-reminder-row.tsx:28` passes `isFiledWithoutReminder`).
 * - `board-notification-rows.tsx:38-74`: two rows, each only an `EmailModeSelect` (`#notification-board-share`,
 *   `#notification-board-mention`), no switch — as its own comment `:13-17` states.
 * - `notification-push-section.tsx`: `BrowserPushSection` returns nothing while `loading`/`unavailable` `:54-55`; the
 *   description follows the state `:57-60`; `canSwitch` `:61`; `hasDevices` `:62`; the switch
 *   `#notification-push-switch` `:93-100`; `PushKindRows` `:139-226` (one `#notification-push-<key>` per type `:182`,
 *   saved as `pushByType[<Type>]` `:198`, the reminder/meeting/Board kinds `:148-175`); `PushDeviceRows` `:236-301`
 *   (name from `pushDeviceNameOf` `:241`, date from `formatNotificationDate` `:251`/`:257`, remove button `:285-295`);
 *   `SoundSection` `:307-324` (needs inbox **and** realtime `:310`; switch `#notification-sound-switch` on
 *   `useInboxSound` `:319`).
 * - `use-notification-settings.ts`: the read `:115-119` → `employee-notification-setting.service.ts:17-32`
 *   (`qs.stringify({ where: { tenantId, organizationId, employeeId }, take: 1 })`, `:22-25`); the save `:127-146` — a
 *   type switch sends `{ [key]: isOn }`, a preferences save sends the **whole patched** `preferences` (`:137` →
 *   `withPreferencePatch`), `PUT …/<id>` when the cached row has an id (`:139-141`) and `POST` otherwise (`:143`);
 *   optimistic `onMutate` `:166-174`, the answer applied `:175-182`, the revert `:183-186` (`withSaveReverted`
 *   `:75-98`); saves queued one after the other `:121-165`; with no row yet a second save is refused while the first is
 *   in flight (`:150-155` of the page).
 * - `notification-preferences.ts`: `NOTIFICATION_EMAIL_MODES` `:8`, `DEFAULT_DIGEST_HOUR = 8` `:11`,
 *   `DEFAULT_QUIET_HOURS` `:14`, `defaultEmailModeOf` `:27-36` (unset = `immediate`), `ownEmailModeOf` `:39-45`,
 *   `quietHoursOf` `:75-81`, `digestHourOf` `:84-87`, `browserTimeZone` `:90-96`, `digestHourLabel` `:99-105`,
 *   `withPreferencePatch` + `mergedByType` `:107-139` (a kind patched to `undefined` leaves the map).
 * - `use-inbox-web-push.ts`: `useInboxWebPush(enabled)` `:89-192` — `unavailable` when the flag is off `:102-106`, the
 *   key read `:108`, `browserPushState` `:71-79` (`unsupported` → `blocked` when `Notification.permission === 'denied'` →
 *   `off` when there is no subscription or permission is not granted → `on` only when the platform lists this browser's
 *   endpoint), `enable` `:125-155` (permission, the worker `public/inbox-push-sw.js`, `PushManager.subscribe`, then
 *   `POST /inbox/push-subscriptions`), `disable` `:157-172`. `supportsWebPush` `core/lib/utils/web-push.ts:88-91`;
 *   `pushDeviceNameOf` `:75-81`. The sound choice is the browser's own: `use-inbox-alerts.ts:88-98` with
 *   `core/lib/utils/inbox-alert.ts:16` (`localStorage['ever-teams.inbox.sound']`), `:45-62`.
 * - `core/hooks/inbox/use-inbox-delivery-status.ts:16-27` + `core/services/client/api/inbox/inbox-delivery.service.ts:36-53`
 *   (finding 5); `core/components/common/mutation-error-toaster.tsx:23-30`, `:47-49` (finding 7).
 *
 * ## Findings (measured here; each is untagged, with the `file:line` that explains it)
 *
 * 1. **The read is one request naming the person's scope**: `GET /employee-notification-setting` with
 *    `where[tenantId]`, `where[organizationId]`, `where[employeeId]` and `take=1`, the fixture's own
 *    `tenantA`/`organizationA`/`employee` ids (`employee-notification-setting.service.ts:22-25`; probe-2 Q1, test 1).
 * 2. **A type row turned off hides its email-mode select** (`notifications-settings-page.tsx:109-118`): the saved
 *    `emailByType[<Type>]` stays on the server and is neither shown nor editable while the row is off, and comes back
 *    with the row. Same rule for a reminder row with no threshold chosen (`reminder-threshold-row.tsx:65-74`), except
 *    the meeting kind, which stays offered (`meeting-reminder-row.tsx:28`). A gap for the reader, not a contradiction.
 * 3. **A type switch's PUT carries no `preferences` key; only a POST does** — `create` adds
 *    `preferences: input.preferences ?? {}` because Gauzy's DTO requires it (`employee-notification-setting.service.ts:34-47`),
 *    `update` does not (`:49-61`), so a partial update never rewrites the preferences it did not touch.
 * 4. **A preferences save sends the whole merged `preferences`, not the patch** (`use-notification-settings.ts:137`),
 *    so every later write repeats the earlier keys (`notification-preferences.ts:124-139`; probe-2 Q3, tests 5 and 7).
 * 5. **`GET /inbox/delivery/status` is read on every visit of this page**, even with the Inbox flag off
 *    (`notifications-settings-page.tsx:141`, `use-inbox-delivery-status.ts:16-27`). On this lane the mock's catch-all
 *    answers `{items:[],total:0}`, which `isInboxDeliveryStatus` rejects (`inbox-delivery.service.ts:36-43`), so the
 *    page shows no email notice and logs nothing.
 * 6. **Team and account is the only section of this page without an `id`** (`notifications-settings-page.tsx:257-266`):
 *    its heading is printed (`settings.notifications.GROUP_PEOPLE`) but there is no addressable section, so the tests
 *    here reach its rows by their switch ids.
 * 7. **A refused write leaves the page standing**: the row's own sentence (
 *    `notifications.SETTINGS_PAGE.SAVE_FAILED` for a type switch `notifications-settings-page.tsx:160`,
 *    `…CHANNELS.SAVE_FAILED` for a preferences save `:171`), the control back as the server has it
 *    (`use-notification-settings.ts:183-186` + `withSaveReverted` `:75-98`), and **no** fallback toast — the mutation has
 *    an `onError`, which `mutation-error-toaster.tsx:23-30` treats as "the caller handles it".
 * 8. **Not reachable through the UI on this lane: `push.state === 'on'`, and a device list that includes this browser.**
 *    `enable` (`use-inbox-web-push.ts:125-155`) needs a real `PushManager.subscribe`, whose endpoint comes from the
 *    browser vendor's push service, which the shield blocks (`playwright/fixtures.ts:95-100`, `:110-112`), and `on` then
 *    needs the platform to list that endpoint (`:77-78`). What this file measures instead is what the page does when
 *    switching on cannot complete (test 10), and that no request left the lane.
 * 9. **While the settings read is open the page offers nothing to switch** (test 13): no `role=switch`, no
 *    `section[id]` at all — only the skeleton (`notifications-settings-page.tsx:144-146`, `:194`), so "save during the
 *    load" is not a case this UI has. `:150-155` (no row yet, a save already in flight) is the other way the page refuses
 *    a second save; it needs two clicks in the same tick and is not driven here.
 * 10. **A typed quiet-hours start is saved only when the whole time field is left** (`QuietHoursRow`'s `save`
 *    `notification-channel-rows.tsx:121-144`, wired to both fields' blur at `:155-175`). Probe 3 measured both halves: a
 *    Tab from the input lands on that field's own "Pick a time" button (`focused: BUTTON label=Pick a time`) and sends
 *    nothing — the blur handler holds the pair as it was before the typed text was parsed — while the next leave, a
 *    second Tab (R1) or going to the window's other end (R2), PUTs the typed `23:15`. Test 6 pins both halves.
 * 11. **Turning `NEXT_PUBLIC_REALTIME_ENABLED` on makes this lane log its own refused websocket**: the app opens
 *    `ws://<mock origin>/graphql` and the mock answers the upgrade with `200` instead of `101`, so Chromium logs
 *    `WebSocket connection to '…' failed` six times (run 2, test 10). It is the lane's mock refusing a websocket, not
 *    this page failing; only the test that turns that flag on names it, and every other test needs an empty console.
 *
 * ## What this file does not cover
 *
 * The long-running timer threshold and the failed-read state with its `Try again` button
 * (`suites/mock/notifications.spec.ts:32-133`); the `UNAVAILABLE_TITLE` branch (`notifications-settings-page.tsx:195-201`,
 * which needs an account with no workspace — every test here signs into the fixture workspace); the two
 * `EMAIL_OFF` / `EMAIL_UNAVAILABLE` notices (`:326-339`), which need a delivery status the lane's mock does not answer;
 * the team-defaults Notice (`:221-229`), which needs a team carrying `notificationDefaults` — the lane's mock serves
 * teams without one (`grep notificationDefaults cypress/support/mock-gauzy-server.mjs`: no hit), so
 * `withTeamNotificationDefaults` (`team-notification-defaults.ts:36-58`) is the identity here and test 1 pins only the
 * absence of that Notice; the device remove action and `DEVICE_REMOVE_FAILED` (`notification-push-section.tsx:73-79`,
 * `:285-295`); the realtime chime (`use-inbox-alerts.ts:100-118`); and the `default`/`true` legacy shape Gauzy may store
 * in `preferences.email` (`notification-preferences.ts:27-36`), which this file serves only as the three modes.
 *
 * ## Runs that pinned it
 *
 * Probes: `D:\Coding\.tmp\s3-lane-a-notifsettings-p1.log`, `-p2.log`, `-p3.log`. This file on lane-a, 2026-11-27:
 * `-1.log` 11 failed — four bugs of this file itself: an ICU plural read without the words the message keeps around it,
 * `flat` used inside a browser callback, a recorded-call index compared with `>` instead of `>=`, and a heading name
 * that `Sent to your devices` also matches; `-2.log` 3 failed — the task-update row belongs to `#notifications`, a typed
 * quiet-hours start needs the whole time field left (finding 10), and the lane logs its own refused realtime websocket
 * (finding 11); `-3.log` 2 failed — a websocket is an origin too, and the dev server's `/_next/hmr` socket is one;
 * `-4.log` and `-5.log` **13 passed** (2.1 m, 2.5 m), back to back with no edit between them. Every
 * `[lane-a notif-settings] MEASURE …` line in those logs is a value this file asserts or reports; the runs of this file
 * after them (each also `13 passed`) are listed in the worker's status file
 * `D:\Coding\.tmp\lane-a-notifsettings-status.md`, which is kept current.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PAGE_PATH = '/settings/personal/notifications';
const ROW_ROUTE = '/api/employee-notification-setting';
/**
 * The same row's path as the **client logs** it: the service URL, without the API base's `/api` (probe 2 Q4 measured
 * `[ERROR] [HttpClient] HTTP Error: PUT /employee-notification-setting/row-1 400`, `api.service.ts` `logError` of the
 * URL the service was given).
 */
const ROW_SERVICE_PATH = '/employee-notification-setting';
const PUSH_ROUTE = '/api/inbox/push-subscriptions';
/** `core/lib/utils/inbox-alert.ts:16` — the sound choice's storage key. */
const SOUND_STORAGE_KEY = 'ever-teams.inbox.sound';

/** `locales/en.json`: `notifications.SETTINGS_PAGE` (with `.CHANNELS`), `settings.notifications`, `settings.entries.notifications`, `toasts`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	notifications: {
		RETRY: string;
		SETTINGS_PAGE: {
			INTRO: string;
			TASK_UPDATE_TEXT: string;
			SAVE_FAILED: string;
			TEAM_DEFAULTS_TEXT: string;
			ROWS: Record<
				'ASSIGNMENT' | 'MENTION' | 'COMMENT' | 'INVITATION' | 'MESSAGE' | 'PAYMENT',
				{ TITLE: string }
			>;
			CHANNELS: Record<string, string>;
			TIMER: Record<string, string>;
			TASK_DUE: Record<string, string>;
			MEETINGS: Record<string, string>;
			BOARDS: Record<string, string>;
		};
	};
	settings: {
		notifications: Record<string, string>;
		entries: { notifications: { TITLE: string; DESCRIPTION: string } };
		teamGeneral: { TASK_UPDATE_DEFAULT_LABEL: string };
	};
	toasts: { MUTATION_FAILED: string };
};
const S = EN.notifications.SETTINGS_PAGE;
const C = S.CHANNELS;
const N = EN.settings.notifications;
const ENTRY = EN.settings.entries.notifications;
const TASK_UPDATE_LABEL = EN.settings.teamGeneral.TASK_UPDATE_DEFAULT_LABEL;
const TYPE_KEYS = ['assignment', 'mention', 'comment', 'invitation', 'message', 'payment'] as const;

/** A `{name}` in an en.json message, filled the way next-intl fills it. */
const filled = (text: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, String(value)), text);

/**
 * An ICU plural of en.json, replaced **in place** so the words the message keeps around the block survive:
 * `TASK_DUE.BEFORE_HOURS` is `{hours, plural, one {# hour} other {# hours}} before`, and the page prints the whole
 * message (`48 hours before`, run 1 measured against this file's shorter `48 hours`). The branch is picked the way
 * next-intl picks it: an exact `=n`, then `one`, then `other`.
 */
const plural = (text: string, count: number) => {
	const block = /\{\s*\w+\s*,\s*plural\s*,((?:[^{}]|\{[^{}]*\})*)\}/.exec(text);
	if (!block) {
		return text;
	}
	const branches = [...block[1].matchAll(/(?:=(\d+)|([a-z]+))\s*\{([^{}]*)\}/g)];
	const chosen =
		branches.find((branch) => branch[1] === String(count)) ??
		branches.find((branch) => branch[2] === (count === 1 ? 'one' : 'other')) ??
		branches.find((branch) => branch[2] === 'other');
	if (!chosen) throw new Error(`en.json message has no plural branch for ${count}: ${text}`);
	const branch = chosen[3].replace(/#/g, String(count));

	return `${text.slice(0, block.index)}${branch}${text.slice(block.index + block[0].length)}`.trim();
};

const dueLabel = (hours: number | null) => (hours === null ? S.TASK_DUE.OFF : plural(S.TASK_DUE.BEFORE_HOURS, hours));
const meetingLabel = (minutes: number | null) =>
	minutes === null ? S.MEETINGS.OFF : filled(S.MEETINGS.BEFORE_MINUTES, { minutes });
const modeLabel = (mode: 'default' | 'immediate' | 'digest' | 'off') =>
	({ default: C.MODE_DEFAULT, immediate: C.MODE_IMMEDIATE, digest: C.MODE_DIGEST, off: C.MODE_OFF })[mode];

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a notif-settings] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `IEmployeeNotificationSetting` (`core/types/interfaces/common/employee-notification.ts:83-93`) as this file serves it. */
type ServedRow = {
	id: string;
	employeeId?: string | null;
	assignment?: boolean | null;
	mention?: boolean | null;
	comment?: boolean | null;
	invitation?: boolean | null;
	message?: boolean | null;
	payment?: boolean | null;
	preferences?: Record<string, unknown> | null;
};

type ServedPushDevice = {
	id: string;
	endpoint: string;
	userAgent?: string | null;
	lastUsedAt?: string | null;
	createdAt?: string | null;
};

type Refusal = { status: number; message: string };
type ServedCall = { method: string; path: string; search: string; body: Record<string, unknown> | null };

type Script = {
	/** null: the read answers an empty list, so the first write is a POST. */
	row: ServedRow | null;
	/** Refuse the writes with these, in order; the last one is reused once they run out. */
	writeRefusals?: Refusal[];
	/** Hold the settings read open until `releaseRead()` is called. */
	holdRead?: boolean;
	/** Served only when set: the web-push key, and the person's devices. */
	pushPublicKey?: string;
	pushDevices?: ServedPushDevice[];
};

type SettingsHarness = {
	calls: ServedCall[];
	/** The row the store holds now — what the next read, or a reload, would answer. */
	row: () => ServedRow | null;
	shapes: () => string[];
	callsTo: (pathStart: string) => ServedCall[];
	/**
	 * The first non-`GET` call to a path made at or after index `after`, where `after` is `calls.length` taken before
	 * the click (a call recorded by that click sits exactly at that index — run 1 lost every write to that off-by-one).
	 * A polling page never has the write at a fixed index, so the index is compared, never assumed.
	 */
	writeAfter: (pathStart: string, after: number) => ServedCall | undefined;
	releaseRead: () => void;
};

/**
 * This file's stand-in for Gauzy's `employee-notification-setting` — and, in the flag tests, for the web-push device
 * routes — on the mock origin. The read always answers the current store, so a write changes what the next read says:
 * the only way "the row was saved" can be told apart from "the control moved in this tab". A refused write changes
 * nothing, exactly as a refusal on the server would.
 */
async function serveSettings(page: Page, initial: Script): Promise<SettingsHarness> {
	const store: { row: ServedRow | null; devices: ServedPushDevice[] } = {
		row: initial.row ? { ...initial.row } : null,
		devices: (initial.pushDevices ?? []).map((device) => ({ ...device }))
	};
	const refusals = [...(initial.writeRefusals ?? [])];
	const calls: ServedCall[] = [];
	let release: () => void = () => undefined;
	const readGate = initial.holdRead
		? new Promise<void>((resolve) => {
				release = resolve;
			})
		: Promise.resolve();
	let created = 0;

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === ROW_ROUTE ||
				url.pathname.startsWith(`${ROW_ROUTE}/`) ||
				url.pathname === PUSH_ROUTE ||
				url.pathname.startsWith(`${PUSH_ROUTE}/`)),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

			const raw = request.postData();
			const call: ServedCall = {
				method,
				path: url.pathname,
				search: url.search,
				body: raw ? (JSON.parse(raw) as Record<string, unknown>) : null
			};
			calls.push(call);
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});
			const refusal = () => {
				const next = refusals.length > 1 ? refusals.shift() : refusals[0];
				return answer(next?.status ?? 599, {
					statusCode: next?.status ?? 599,
					message: next?.message ?? 'this file scripted no answer for that write'
				});
			};

			if (url.pathname === `${PUSH_ROUTE}/public-key`) {
				return initial.pushPublicKey
					? answer(200, { publicKey: initial.pushPublicKey })
					: answer(404, { statusCode: 404, message: 'this file scripted no web push key' });
			}
			if (url.pathname === PUSH_ROUTE && method === 'GET') return answer(200, store.devices);
			if (url.pathname === PUSH_ROUTE && method === 'POST') {
				const device: ServedPushDevice = {
					id: 'served-device-new',
					endpoint: String(call.body?.endpoint ?? ''),
					userAgent: String(call.body?.userAgent ?? '')
				};
				store.devices = [...store.devices, device];
				return answer(201, device);
			}
			if (url.pathname.startsWith(`${PUSH_ROUTE}/`) && method === 'DELETE') {
				const id = decodeURIComponent(url.pathname.slice(PUSH_ROUTE.length + 1));
				store.devices = store.devices.filter((device) => device.id !== id);
				return answer(204);
			}

			if (url.pathname === ROW_ROUTE && method === 'GET') {
				await readGate;
				return answer(200, { items: store.row ? [store.row] : [], total: store.row ? 1 : 0 });
			}
			if (url.pathname === ROW_ROUTE && method === 'POST') {
				if (refusals.length > 0) return refusal();
				created += 1;
				store.row = { ...(call.body as ServedRow), id: `served-row-${created}` };
				return answer(201, store.row);
			}
			if (url.pathname.startsWith(`${ROW_ROUTE}/`) && method === 'PUT') {
				if (refusals.length > 0) return refusal();
				const id = url.pathname.slice(ROW_ROUTE.length + 1);
				store.row = { ...(store.row ?? { id }), ...(call.body as ServedRow), id };
				return answer(200, store.row);
			}
			return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
		}
	);

	return {
		calls,
		row: () => store.row,
		shapes: () =>
			calls.map(
				(call) => `${call.method} ${call.path}${call.body === null ? '' : ` ${JSON.stringify(call.body)}`}`
			),
		callsTo: (pathStart) => calls.filter((call) => call.path.startsWith(pathStart)),
		writeAfter: (pathStart, after) =>
			calls.find(
				(call) => call.path.startsWith(pathStart) && call.method !== 'GET' && calls.indexOf(call) >= after
			),
		releaseRead: () => release()
	};
}

/**
 * The origin of every request **and every websocket** this page opened — the witness that nothing left the lane.
 * A websocket is not a `request` event in Playwright, and this lane has two of them (run 3 measured both): the dev
 * server's own hot-reload socket `ws://<app host>/_next/hmr`, and, where the realtime flag is on, the app's
 * `ws://<mock host>/graphql` (finding 11).
 */
function recordOrigins(page: Page): () => string[] {
	const origins = new Set<string>();
	page.on('request', (request) => origins.add(new URL(request.url()).origin));
	page.on('websocket', (socket) => origins.add(new URL(socket.url()).origin));
	return () => [...origins].sort();
}

/** The host of an origin, so a `ws://` socket and the `http://` site of the same machine count as one lane host. */
const hostOf = (origin: string) => new URL(origin).host;
/** The only two hosts a page of this lane may be seen touching. */
const LANE_HOSTS = [hostOf(APP_ORIGIN), hostOf(MOCK_API_ORIGIN)].sort();

/** React's dev-mode store warning, not this page's (`brief-common.md`; `chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:47-49`, printed in dev for every failed mutation. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The client's own log of a refusal this file armed (`core/services/client/api.service.ts` `logError`). */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
/**
 * The lane's own realtime noise, measured in run 2 (`s3-lane-a-notifsettings-2.log`): where
 * `NEXT_PUBLIC_REALTIME_ENABLED` is on the app opens `ws://<mock origin>/graphql`, and the mock answers the upgrade
 * with `200` instead of `101`, so Chromium logs the failed handshake six times. It is the lane's mock refusing a
 * websocket, not this page failing: named and excused **only** in test 10, the one test that turns that flag on.
 */
const LANE_REALTIME_WS_NOISE = `WebSocket connection to '${MOCK_API_ORIGIN.replace(/^http/, 'ws')}/graphql' failed`;

/**
 * The console errors left after the shell noise and after the lines this test names (the exact refusals it armed, or
 * the lane noise its own flags open — each named at the call). `armedWrites` is true **only** in the test that arms a
 * refused write — `Mutation failed:` is never excused blanket-wide.
 */
const consoleFindings = (shield: Shield, armed: string[] = [], armedWrites: boolean = false) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !(armedWrites && line.includes(DEV_MUTATION_NOISE)))
		.filter((line) => !armed.some((text) => line.includes(text)));

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Sonner's toasts; the dev-only one carries "Copy details" (`api-tokens-settings-ui.spec.ts:477-478`). The texts are
 * flattened **here**, never inside `evaluateAll`: a browser callback cannot see a function of this file (run 1 died
 * with `ReferenceError: flat is not defined`).
 */
const toastTexts = async (page: Page) =>
	(await page.locator('[data-sonner-toast]').evaluateAll((els) => els.map((el) => el.textContent ?? ''))).map(flat);
const toastWith = async (page: Page, text: string) => (await toastTexts(page)).some((toast) => toast.includes(text));

/** The settings read this page sent, from this file's own record of it. */
const readOf = (server: SettingsHarness) => server.callsTo(ROW_ROUTE).find((call) => call.method === 'GET');
const queryOf = (search: string) => [...new URLSearchParams(search).entries()].sort().map(([k, v]) => `${k}=${v}`);

/** A Base UI select: open it and read only the open popup's options. The caller closes it with `closeMenus`. */
const openSelect = async (trigger: Locator): Promise<string[]> => {
	await trigger.click({ timeout: 15_000 });
	// the popup is open before its options are read: a read right after the click could see none yet
	await expect(trigger.page().getByRole('option').first()).toBeVisible({ timeout: 15_000 });
	return (
		await trigger
			.page()
			.getByRole('option')
			.evaluateAll((els) => els.map((el) => el.textContent ?? ''))
	).map(flat);
};

/** Menus are document-level portals that block pointer events while open: close one before clicking elsewhere. */
const closeMenus = async (page: Page) => {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('option')).toHaveCount(0, { timeout: 10_000 });
};

const typeSwitch = (page: Page, key: string) => page.locator(`#notification-setting-${key}`);
const typeTitle = (key: string) => S.ROWS[key.toUpperCase() as keyof typeof S.ROWS].TITLE;
const emailSelect = (page: Page, kindLabel: string) =>
	page.getByRole('combobox', { name: `${C.MODE_LABEL}: ${kindLabel}` });
const quietSection = (page: Page) => page.locator('#notification-quiet-hours');
const quietSwitch = (page: Page) => quietSection(page).locator('[role=switch]').first();

/** The values the page prints, computed in the page by the same `Intl` call the app makes (`digestHourLabel` `:99-105`). */
const printedHour = (page: Page, hour: number) =>
	page.evaluate(
		(value) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
				hour: 'numeric',
				minute: '2-digit'
			}).format(new Date(2026, 0, 1, value)),
		hour
	);
/** `formatNotificationDate` (`core/lib/utils/notification-inbox.ts:324-326`), computed in the page the same way. */
const printedDateTime = (page: Page, iso: string) =>
	page.evaluate(
		(value) =>
			new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value)),
		iso
	);
/** `browserTimeZone()` (`notification-preferences.ts:90-96`), read from the page that uses it. */
const printedZone = (page: Page) => page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

test.describe('personal notification settings, the whole page', () => {
	test('1 a served row: every section, every control, one scoped read, no flag-gated section', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const server = await serveSettings(page, {
			row: {
				id: 'served-row-1',
				employeeId: ids.employee,
				assignment: true,
				mention: false,
				comment: true,
				invitation: false,
				message: true,
				payment: null,
				preferences: {
					email: 'digest',
					emailByType: { Assignment: 'off' },
					dnd: { start: '23:00', end: '06:30' },
					digestHour: 17,
					taskUpdate: false,
					taskDueReminderHours: 48,
					meetingReminderMinutes: 30
				}
			}
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.getByRole('heading', { level: 1, name: ENTRY.TITLE, exact: true })).toBeVisible({
			timeout: 30_000
		});
		await expect(page.getByText(ENTRY.DESCRIPTION, { exact: true })).toBeVisible();
		await expect(page.getByText(S.INTRO, { exact: true })).toBeVisible();

		// The read, polled until it is on the record, then its query exactly as sent (finding 1).
		await expect
			.poll(() => readOf(server), { timeout: 30_000, message: 'the page never read its settings row' })
			.toBeDefined();
		const read = readOf(server) as ServedCall;
		expect(read.path, 'one read of the settings row, on the mock origin').toBe(ROW_ROUTE);
		expect(
			queryOf(read.search),
			'the read names the tenant, the organization and the employee, and asks for one row'
		).toEqual(
			[
				'take=1',
				`where[employeeId]=${ids.employee}`,
				`where[organizationId]=${ids.organizationA}`,
				`where[tenantId]=${ids.tenantA}`
			].sort()
		);
		report('1 reads', { settingsReads: server.callsTo(ROW_ROUTE).length, paths: server.calls.map((c) => c.path) });

		// Every switch's state is the row's; a null is on (`isNotificationTypeOn` `use-notification-settings.ts:38-43`).
		const switches: Array<[string, boolean]> = [
			['#notification-setting-assignment', true],
			['#notification-setting-mention', false],
			['#notification-setting-comment', true],
			['#notification-setting-invitation', false],
			['#notification-setting-message', true],
			['#notification-setting-payment', true],
			['#notification-task-update', false]
		];
		for (const [selector, isOn] of switches) {
			await expect(page.locator(selector), `${selector} shows the row's value`).toHaveAttribute(
				'aria-checked',
				isOn ? 'true' : 'false'
			);
		}
		await expect(quietSwitch(page), 'the saved window shows as quiet hours on').toHaveAttribute(
			'aria-checked',
			'true'
		);

		// The printed value of every select, each named by the row it belongs to.
		await expect(emailSelect(page, typeTitle('assignment'))).toHaveText(modeLabel('off'));
		await expect(emailSelect(page, typeTitle('comment'))).toHaveText(modeLabel('default'));
		await expect(emailSelect(page, typeTitle('message'))).toHaveText(modeLabel('default'));
		await expect(emailSelect(page, typeTitle('payment'))).toHaveText(modeLabel('default'));
		// A row turned off offers no email-mode select at all (finding 2).
		await expect(emailSelect(page, typeTitle('mention'))).toHaveCount(0);
		await expect(emailSelect(page, typeTitle('invitation'))).toHaveCount(0);

		await expect(page.locator('#notification-task-due [role=combobox]').last()).toHaveText(dueLabel(48));
		await expect(page.locator('#notification-meetings [role=combobox]').last()).toHaveText(meetingLabel(30));
		await expect(quietSection(page).locator('[role=combobox]').first()).toHaveText(await printedHour(page, 17));
		await expect(page.locator('#notification-email [role=combobox]')).toHaveText(modeLabel('digest'));
		// Time tracking is here; its threshold's own value belongs to suites/mock/notifications.spec.ts.
		await expect(page.getByRole('heading', { level: 2, name: S.TIMER.TITLE, exact: true })).toBeVisible();
		await expect(emailSelect(page, S.TIMER.LABEL)).toHaveText(modeLabel('default'));

		// The window's zone is the browser's own (`QuietHoursRow:121`, `browserTimeZone`), printed in the row's text.
		await expect(
			quietSection(page).getByText(filled(C.QUIET_TEXT, { timeZone: await printedZone(page) }), { exact: true })
		).toBeVisible();
		// The task-update row belongs to the **Tasks** section (`id="notifications"`, page :217-255), not to quiet hours:
		// its label is `settings.teamGeneral.TASK_UPDATE_DEFAULT_LABEL` and its text `SETTINGS_PAGE.TASK_UPDATE_TEXT`
		// (:238-255). Run 2 measured that the quiet-hours section holds neither.
		await expect(page.locator('#notifications').getByText(S.TASK_UPDATE_TEXT, { exact: true })).toBeVisible();
		await expect(page.locator('#notifications').getByText(TASK_UPDATE_LABEL, { exact: true })).toBeVisible();
		await expect(
			page.locator('#notifications #notification-task-update'),
			'that row is in this section'
		).toBeVisible();
		report('1 window on the workspace clock', {
			from: await page.getByLabel(C.QUIET_FROM).inputValue(),
			to: await page.getByLabel(C.QUIET_TO).inputValue()
		});

		// This lane has neither flag on: the two gated sections are absent.
		await expect(page.locator('#notification-push')).toHaveCount(0);
		await expect(page.locator('#notification-sound')).toHaveCount(0);
		// And the fixture's teams carry no notification defaults, so no team-defaults notice (see the header).
		await expect(page.getByText(S.TEAM_DEFAULTS_TEXT, { exact: true })).toHaveCount(0);

		// The sections as printed, in document order; Team and account has no id (finding 6). The count is a web-first
		// assertion first, so the read below is taken on a page that already settled.
		await expect(page.locator('section[id]')).toHaveCount(7);
		const sections = await page.locator('section[id]').evaluateAll((els) => els.map((el) => el.id));
		expect(sections, 'the sections of the page').toEqual([
			'notifications',
			'notification-time-tracking',
			'notification-task-due',
			'notification-boards',
			'notification-meetings',
			'notification-email',
			'notification-quiet-hours'
		]);
		await expect(page.getByRole('heading', { level: 2, name: N.GROUP_PEOPLE, exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: S.BOARDS.TITLE, exact: true })).toBeVisible();

		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the page threw').toEqual([]);
	});

	test("2 with no row yet: the page's defaults, a POST, then a PUT to the id it made", async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: null });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(typeSwitch(page, 'assignment')).toBeVisible({ timeout: 30_000 });
		for (const key of TYPE_KEYS) {
			await expect(typeSwitch(page, key), `${key} is on when there is no row`).toHaveAttribute(
				'aria-checked',
				'true'
			);
			await expect(emailSelect(page, typeTitle(key))).toHaveText(modeLabel('default'));
		}
		await expect(page.locator('#notification-task-update')).toHaveAttribute('aria-checked', 'true');
		await expect(quietSwitch(page)).toHaveAttribute('aria-checked', 'false');
		await expect(
			quietSection(page).getByText(filled(C.QUIET_TEXT, { timeZone: await printedZone(page) }), { exact: true })
		).toBeVisible();
		await expect(quietSection(page).getByLabel(C.QUIET_FROM)).toHaveCount(0);
		// The labels of an unset preference: `defaultEmailModeOf` :27-36, `digestHourOf` :84-87 with DEFAULT_DIGEST_HOUR
		// :11, `taskDueReminderHoursOf` (task-due-reminders.ts:20-27) with its default :9, `meetingReminderMinutesOf`
		// (meeting-notices.ts:92-99) with its default :83.
		await expect(page.locator('#notification-email [role=combobox]')).toHaveText(modeLabel('immediate'));
		await expect(quietSection(page).locator('[role=combobox]').first()).toHaveText(await printedHour(page, 8));
		await expect(page.locator('#notification-task-due [role=combobox]').last()).toHaveText(dueLabel(24));
		await expect(page.locator('#notification-meetings [role=combobox]').last()).toHaveText(meetingLabel(15));

		// The first save is a POST: there is no row to update (use-notification-settings.ts:139-143).
		let before = server.calls.length;
		await typeSwitch(page, 'assignment').click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'the first save was not a write'
			})
			.toBeDefined();
		let write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		expect(write.method, 'with no row the save is a POST').toBe('POST');
		expect(write.body, "the POST is the switch, the scope, and the empty preferences Gauzy's DTO requires").toEqual(
			{
				assignment: false,
				preferences: {},
				...scope
			}
		);
		const createdId = (server.row() as ServedRow).id;
		report('2 created row', { id: createdId, stored: server.row() });

		// The next save goes to the id the POST answered.
		before = server.calls.length;
		await typeSwitch(page, 'comment').click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'the second save was not a write'
			})
			.toBeDefined();
		write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		expect(write.method, 'with a row now the save is a PUT').toBe('PUT');
		expect(write.path, 'the PUT goes to the id the POST answered').toBe(`${ROW_ROUTE}/${createdId}`);
		expect(write.body, 'a PUT carries only what it changes (finding 3)').toEqual({ comment: false, ...scope });

		await expect(typeSwitch(page, 'assignment')).toHaveAttribute('aria-checked', 'false');
		await expect(typeSwitch(page, 'comment')).toHaveAttribute('aria-checked', 'false');

		// A reload reads the row back: both changes are the server's, not this tab's.
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(typeSwitch(page, 'assignment')).toBeVisible({ timeout: 30_000 });
		await expect(typeSwitch(page, 'assignment'), 'the saved switch reads back off').toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(typeSwitch(page, 'comment'), 'the saved switch reads back off').toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(typeSwitch(page, 'mention'), 'the untouched switch reads back on').toHaveAttribute(
			'aria-checked',
			'true'
		);
		report('2 after the reload', { reads: server.callsTo(ROW_ROUTE).length, stored: server.row() });

		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('3 each of the six type switches writes its own field', async ({ page, fixture, shield }) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, {
			row: {
				id: 'served-row-2',
				assignment: true,
				mention: true,
				comment: true,
				invitation: true,
				message: true,
				payment: true
			}
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(typeSwitch(page, 'assignment')).toBeVisible({ timeout: 30_000 });

		const bodies: Record<string, unknown> = {};
		for (const key of TYPE_KEYS) {
			const before = server.calls.length;
			await typeSwitch(page, key).click({ timeout: 15_000 });
			await expect
				.poll(() => server.writeAfter(ROW_ROUTE, before), {
					timeout: 20_000,
					message: `turning ${key} off sent no write`
				})
				.toBeDefined();
			const write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
			bodies[key] = write.body;
			expect(write.body, `${key} writes exactly its own field, plus the scope`).toEqual({
				[key]: false,
				...scope
			});
			await expect(typeSwitch(page, key), `${key} now shows off`).toHaveAttribute('aria-checked', 'false');
			// Off: no email-mode select for that row (finding 2).
			await expect(emailSelect(page, typeTitle(key))).toHaveCount(0);
		}
		report('3 bodies of the six switches', bodies);
		expect(server.row()?.preferences ?? null, 'no type switch touched the preferences').toBe(null);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('4 the task-update switch saves preferences.taskUpdate and reads back off', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: { id: 'served-row-3' } });
		await signInAndVisit(page, fixture, PAGE_PATH);

		const taskUpdate = page.locator('#notification-task-update');
		await expect(taskUpdate).toBeVisible({ timeout: 30_000 });
		// No preferences yet: on (`applied.taskUpdate !== false`, notifications-settings-page.tsx:249).
		await expect(taskUpdate).toHaveAttribute('aria-checked', 'true');
		await expect(taskUpdate).toHaveAccessibleName(TASK_UPDATE_LABEL);

		const before = server.calls.length;
		await taskUpdate.click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'the task-update save was not a write'
			})
			.toBeDefined();
		const write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('4 task-update write', { method: write.method, path: write.path, body: write.body });
		expect(
			write.body,
			'the row is a preferences patch (use-notification-settings.ts:137, :252 of the page)'
		).toEqual({
			preferences: { taskUpdate: false },
			...scope
		});
		await expect(taskUpdate).toHaveAttribute('aria-checked', 'false');

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(taskUpdate).toBeVisible({ timeout: 30_000 });
		await expect(taskUpdate, 'the saved choice is read back').toHaveAttribute('aria-checked', 'false');
		expect(server.row()?.preferences, 'the served row holds it').toEqual({ taskUpdate: false });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test("5 email modes: every kind, and one kind's own choice back to the default", async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: { id: 'served-row-4' } });
		await signInAndVisit(page, fixture, PAGE_PATH);

		// The every-kind select offers the three modes and no `default` (EmailDefaultRow passes no allowDefault, :93-98).
		const everyKind = page.locator('#notification-email [role=combobox]');
		await expect(everyKind).toBeVisible({ timeout: 30_000 });
		const everyOptions = await openSelect(everyKind);
		report('5 every-kind options', { options: everyOptions });
		await closeMenus(page);
		expect(everyOptions, 'the every-kind select offers only the three modes').toEqual([
			modeLabel('immediate'),
			modeLabel('digest'),
			modeLabel('off')
		]);

		for (const [label, mode] of [
			[modeLabel('digest'), 'digest'],
			[modeLabel('off'), 'off']
		] as const) {
			const before = server.calls.length;
			await everyKind.click({ timeout: 15_000 });
			await page.getByRole('option', { name: label, exact: true }).click({ timeout: 15_000 });
			await expect
				.poll(() => server.writeAfter(ROW_ROUTE, before), {
					timeout: 20_000,
					message: `picking ${label} sent no write`
				})
				.toBeDefined();
			const write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
			expect(write.body, `${label} writes preferences.email, plus the scope`).toEqual({
				preferences: { email: mode },
				...scope
			});
			await expect(everyKind).toHaveText(label);
		}

		// A kind's own select does offer the default, and picking it takes the kind's choice out of the map again.
		const mentionSelect = emailSelect(page, typeTitle('mention'));
		await expect(mentionSelect).toHaveText(modeLabel('default'));
		const kindOptions = await openSelect(mentionSelect);
		report('5 kind options', { options: kindOptions });
		await closeMenus(page);
		expect(kindOptions, 'a kind select offers the default first (EmailModeSelect:53-55)').toEqual([
			modeLabel('default'),
			modeLabel('immediate'),
			modeLabel('digest'),
			modeLabel('off')
		]);

		let before = server.calls.length;
		await mentionSelect.click({ timeout: 15_000 });
		await page.getByRole('option', { name: modeLabel('off'), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'the own mode of Mentions sent no write'
			})
			.toBeDefined();
		let write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('5 own mode write', { body: write.body });
		expect(write.body, "the kind's mode is merged over the preferences already saved (finding 4)").toEqual({
			preferences: { email: 'off', emailByType: { Mention: 'off' } },
			...scope
		});
		await expect(mentionSelect).toHaveText(modeLabel('off'));

		before = server.calls.length;
		await mentionSelect.click({ timeout: 15_000 });
		await page.getByRole('option', { name: modeLabel('default'), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'back to the default sent no write'
			})
			.toBeDefined();
		write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		expect(
			write.body?.preferences,
			'"use the default" writes the map without that kind (mergedByType, notification-preferences.ts:108-118)'
		).toEqual({ email: 'off', emailByType: {} });
		await expect(mentionSelect).toHaveText(modeLabel('default'));
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('6 quiet hours and the daily digest: what on saves, and what a reload shows', async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: null });
		await signInAndVisit(page, fixture, PAGE_PATH);
		const zone = await printedZone(page);
		const digest = quietSection(page).locator('[role=combobox]').first();
		const from = quietSection(page).getByLabel(C.QUIET_FROM);
		const to = quietSection(page).getByLabel(C.QUIET_TO);

		await expect(quietSwitch(page)).toBeVisible({ timeout: 30_000 });
		await expect(quietSwitch(page)).toHaveAttribute('aria-checked', 'false');
		await expect(from).toHaveCount(0);

		let before = server.calls.length;
		await quietSwitch(page).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'switching quiet hours on sent no write'
			})
			.toBeDefined();
		let write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		expect(
			write.body,
			"on = DEFAULT_QUIET_HOURS in the browser's zone (QuietHoursRow:181-183, notification-preferences.ts:14)"
		).toEqual({ preferences: { dnd: { start: '22:00', end: '07:00', timeZone: zone } }, ...scope });

		// The window is editable now, printed on the workspace's clock (TimeField, common/time-field.tsx:112-163).
		await expect(from).toBeVisible();
		await expect(to).toBeVisible();
		report('6 window as printed', { from: await from.inputValue(), to: await to.inputValue() });

		// A typed start is saved when the window is left (`QuietHoursRow`'s `save` :121-144, wired to the fields' blur at
		// :155-175). Probe 3 measured how far "left" reaches: a Tab from the input lands on that field's own
		// "Pick a time" button (`focused: BUTTON label=Pick a time`) and sends **nothing** — the blur handler still holds
		// the pair as it was before the typed text was parsed; the save comes when the composite field is really left
		// (probe 3 R1's second Tab and R2's click on the window's other end both PUT `23:15`).
		before = server.calls.length;
		await from.fill('11:15 PM');
		await from.press('Tab'); // still inside the same time field: onto its picker button
		// 2 s of quiet, and it proves only that that Tab wrote nothing — the quiet-hours save is still the one write this
		// page made, and nothing is snapshotted after the window.
		await page.waitForTimeout(2_000);
		expect(
			server.callsTo(ROW_ROUTE).filter((call) => call.method !== 'GET'),
			"a Tab onto the field's own picker button sent nothing"
		).toHaveLength(1);
		await page.getByLabel(C.QUIET_TO).click({ timeout: 15_000 }); // the window's other end: the field is left
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'leaving the window with a typed start sent no write'
			})
			.toBeDefined();
		write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('6 typed start saved', { body: write.body });
		expect(write.body, 'the typed 12-hour time is saved as 23:15, the other end kept').toEqual({
			preferences: { dnd: { start: '23:15', end: '07:00', timeZone: zone } },
			...scope
		});

		// The digest hour: every hour of the day, named the way the locale names it.
		before = server.calls.length;
		const digestOptions = await openSelect(digest);
		expect(
			digestOptions.length,
			'the digest offers all 24 hours (notification-channel-rows.tsx:26, :211-215)'
		).toBe(24);
		const digest17 = await printedHour(page, 17);
		expect(digestOptions, 'the hours are printed with the page locale').toContain(digest17);
		await page.getByRole('option', { name: digest17, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'picking the digest hour sent no write'
			})
			.toBeDefined();
		write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('6 digest write', { body: write.body });
		expect(write.body, 'the digest hour is merged over the quiet window (finding 4)').toEqual({
			preferences: { dnd: { start: '23:15', end: '07:00', timeZone: zone }, digestHour: 17 },
			...scope
		});
		await expect(digest).toHaveText(digest17);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(quietSwitch(page)).toBeVisible({ timeout: 30_000 });
		await expect(quietSwitch(page), 'quiet hours read back on').toHaveAttribute('aria-checked', 'true');
		await expect(quietSection(page).getByLabel(C.QUIET_FROM)).toHaveCount(1);
		await expect(quietSection(page).getByLabel(C.QUIET_TO)).toHaveCount(1);
		await expect(quietSection(page).locator('[role=combobox]').first(), 'the digest hour reads back').toHaveText(
			digest17
		);
		report('6 after the reload', { stored: server.row() });
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test("7 due dates and meetings: each control's choices and what one change sends", async ({
		page,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: { id: 'served-row-5' } });
		await signInAndVisit(page, fixture, PAGE_PATH);

		// Due dates: the six thresholds of task-due-reminders.ts:17, then off.
		const due = page.locator('#notification-task-due [role=combobox]').last();
		await expect(due).toBeVisible({ timeout: 30_000 });
		await expect(due).toHaveText(dueLabel(24));
		const dueOptions = await openSelect(due);
		await closeMenus(page);
		expect(dueOptions, 'the thresholds, then off (reminder-threshold-row.tsx:84-91)').toEqual([
			dueLabel(1),
			dueLabel(4),
			dueLabel(24),
			dueLabel(48),
			dueLabel(72),
			dueLabel(168),
			dueLabel(null)
		]);

		let before = server.calls.length;
		await due.click({ timeout: 15_000 });
		await page.getByRole('option', { name: dueLabel(null), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'turning the due-date reminder off sent no write'
			})
			.toBeDefined();
		let write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('7 due-off write', { body: write.body });
		expect(write.body, 'off is saved as null (task-due-reminders.ts:22-24)').toEqual({
			preferences: { taskDueReminderHours: null },
			...scope
		});
		await expect(due).toHaveText(dueLabel(null));
		// With no threshold chosen the kind offers no email mode (reminder-threshold-row.tsx:65-74).
		await expect(emailSelect(page, S.TASK_DUE.LABEL)).toHaveCount(0);

		// Meetings: five leads and "only when it starts"; its email mode stays offered whatever the lead.
		const meeting = page.locator('#notification-meetings [role=combobox]').last();
		await expect(meeting).toHaveText(meetingLabel(15));
		const meetingOptions = await openSelect(meeting);
		await closeMenus(page);
		expect(meetingOptions, 'the leads of meeting-notices.ts:86, then its off label').toEqual([
			meetingLabel(5),
			meetingLabel(10),
			meetingLabel(15),
			meetingLabel(30),
			meetingLabel(60),
			meetingLabel(null)
		]);
		await expect(emailSelect(page, S.MEETINGS.LABEL)).toHaveText(modeLabel('default'));

		before = server.calls.length;
		await meeting.click({ timeout: 15_000 });
		await page.getByRole('option', { name: meetingLabel(null), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'turning the meeting reminder off sent no write'
			})
			.toBeDefined();
		write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('7 meeting-off write', { body: write.body });
		expect(write.body, 'no lead is saved as null, and the earlier write is kept (finding 4)').toEqual({
			preferences: { taskDueReminderHours: null, meetingReminderMinutes: null },
			...scope
		});
		await expect(meeting).toHaveText(meetingLabel(null));
		// `isFiledWithoutReminder` (meeting-reminder-row.tsx:28): the email mode stays while no reminder is chosen.
		await expect(emailSelect(page, S.MEETINGS.LABEL)).toHaveCount(1);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('8 the board rows read and write an email mode, and nothing else', async ({ page, fixture, shield }) => {
		const ids = fixture.ids;
		const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
		const server = await serveSettings(page, { row: { id: 'served-row-6' } });
		await signInAndVisit(page, fixture, PAGE_PATH);
		const boards = page.locator('#notification-boards');
		await expect(boards).toBeVisible({ timeout: 30_000 });

		await expect(boards.getByText(S.BOARDS.SHARE_LABEL, { exact: true })).toBeVisible();
		await expect(boards.getByText(S.BOARDS.MENTION_LABEL, { exact: true })).toBeVisible();
		await expect(boards.getByText(S.BOARDS.TEXT, { exact: true })).toHaveCount(2);
		// No switch of their own: the section renders only the email-mode select (board-notification-rows.tsx:51-70).
		await expect(boards.locator('[role=switch]')).toHaveCount(0);

		const share = page.locator('#notification-board-share');
		const mention = page.locator('#notification-board-mention');
		await expect(share).toHaveText(modeLabel('default'));
		await expect(mention).toHaveText(modeLabel('default'));
		const boardOptions = await openSelect(share);
		await closeMenus(page);
		expect(boardOptions, 'a Board row offers the default and the three modes').toEqual([
			modeLabel('default'),
			modeLabel('immediate'),
			modeLabel('digest'),
			modeLabel('off')
		]);

		const before = server.calls.length;
		await share.click({ timeout: 15_000 });
		await page.getByRole('option', { name: modeLabel('off'), exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: "the board row's mode sent no write"
			})
			.toBeDefined();
		const write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('8 board write', { body: write.body });
		expect(
			write.body,
			'a Board kind is saved under its platform type name (EEmployeeNotificationType.BoardShare, board-notification-rows.tsx:20)'
		).toEqual({ preferences: { emailByType: { BoardShare: 'off' } }, ...scope });
		await expect(share).toHaveText(modeLabel('off'));
		await expect(mention, 'the other Board row is untouched').toHaveText(modeLabel('default'));
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('9 Inbox flag on, realtime off: the push section is there, the sound section is not', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		const ids = fixture.ids;
		// The permission is granted here, so the row can only be `off` (this browser has no subscription); test 11
		// leaves the permission as the browser has it and measures what that says.
		await context.grantPermissions(['notifications'], { origin: APP_ORIGIN });
		// Inbox on, realtime left as the lane has it: SoundSection needs both (notification-push-section.tsx:310).
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });
		const servedAt = '2026-11-01T10:00:00.000Z';
		const server = await serveSettings(page, {
			row: { id: 'served-row-7' },
			pushPublicKey: 'BFserved-probe-key-not-a-real-vapid-key',
			pushDevices: [
				{
					id: 'served-device-1',
					endpoint: 'https://push.invalid.test/endpoint-1',
					userAgent:
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
					createdAt: servedAt
				}
			]
		});
		const origins = recordOrigins(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		const push = page.locator('#notification-push');
		await expect(push).toBeVisible({ timeout: 30_000 });
		await expect(push.getByRole('heading', { level: 2, name: C.PUSH_TITLE, exact: true })).toBeVisible();
		await expect(push.getByText(C.PUSH_INTRO, { exact: true })).toBeVisible();
		// No push subscription in this browser, permission undetermined: off, and the switch is free to try (:61).
		await expect(push.getByText(C.PUSH_OFF, { exact: true })).toBeVisible();
		const pushSwitch = page.locator('#notification-push-switch');
		await expect(pushSwitch).toHaveAttribute('aria-checked', 'false');
		await expect(pushSwitch).toBeEnabled();

		// A device the platform lists is enough to show the kinds and the devices (:62, :103, :113).
		await expect(push.getByRole('heading', { level: 3, name: C.PUSH_KINDS_TITLE, exact: true })).toBeVisible();
		await expect(push.getByRole('heading', { level: 3, name: C.DEVICES_TITLE, exact: true })).toBeVisible();
		// The name is read off the device's own user agent (`pushDeviceNameOf`, web-push.ts:41-52, :75-81): Chrome + Windows.
		const deviceName = filled(C.DEVICE_NAME, { browser: 'Chrome', system: 'Windows' });
		await expect(push.getByText(deviceName, { exact: true })).toBeVisible();
		// The date is the served instant printed with Intl, never typed.
		await expect(
			push.getByText(filled(C.DEVICE_ADDED, { date: await printedDateTime(page, servedAt) }), { exact: true })
		).toBeVisible();
		await expect(push.getByRole('button', { name: `${C.DEVICE_REMOVE}: ${deviceName}` })).toBeVisible();

		// One switch per kind, saved as this browser's own preference (pushByType).
		for (const key of TYPE_KEYS) {
			await expect(page.locator(`#notification-push-${key}`), `${key} offers a device switch`).toHaveAttribute(
				'aria-checked',
				'true'
			);
		}
		const before = server.calls.length;
		await page.locator('#notification-push-assignment').click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, before), {
				timeout: 20_000,
				message: 'the device switch sent no write'
			})
			.toBeDefined();
		const write = server.writeAfter(ROW_ROUTE, before) as ServedCall;
		report('9 device-kind write', { body: write.body });
		expect(write.body, 'a device switch is pushByType[<Type>] (notification-push-section.tsx:198)').toEqual({
			preferences: { pushByType: { Assignment: false } },
			tenantId: ids.tenantA,
			organizationId: ids.organizationA
		});
		await expect(page.locator('#notification-push-assignment')).toHaveAttribute('aria-checked', 'false');

		// Realtime is off on this lane, so the whole Sound section is absent (:310).
		await expect(page.locator('#notification-sound')).toHaveCount(0);
		expect(
			[...new Set(origins().map(hostOf))].sort(),
			"every request and socket of this page stayed on the lane's two hosts"
		).toEqual(LANE_HOSTS);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('10 both flags on with the permission granted: the sound choice stays in the browser, and switching push on cannot complete', async ({
		page,
		context,
		fixture,
		shield
	}) => {
		await context.grantPermissions(['notifications'], { origin: APP_ORIGIN });
		await overrideRuntimeEnv(page, {
			NEXT_PUBLIC_INBOX_ENABLED: 'true',
			NEXT_PUBLIC_REALTIME_ENABLED: 'true'
		});
		const server = await serveSettings(page, {
			row: { id: 'served-row-8' },
			pushPublicKey: 'BFserved-probe-key-not-a-real-vapid-key',
			pushDevices: []
		});
		const origins = recordOrigins(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.locator('#notification-push')).toBeVisible({ timeout: 30_000 });
		const sound = page.locator('#notification-sound');
		await expect(sound, 'inbox AND realtime: the Sound section is offered').toBeVisible();
		await expect(sound.getByRole('heading', { level: 2, name: C.SOUND_TITLE, exact: true })).toBeVisible();
		await expect(sound.getByText(C.SOUND_LABEL, { exact: true })).toBeVisible();
		await expect(sound.getByText(C.SOUND_TEXT, { exact: true })).toBeVisible();
		const soundSwitch = page.locator('#notification-sound-switch');
		await expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
		report('10 permission granted', { permission: await notificationPermission(page) });

		// The sound choice is this browser's own: localStorage, not the settings row.
		await soundSwitch.click({ timeout: 15_000 });
		await expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
		await expect
			.poll(() => page.evaluate((key) => window.localStorage.getItem(key), SOUND_STORAGE_KEY), {
				timeout: 10_000,
				message: 'the sound choice did not reach localStorage (inbox-alert.ts:54-62)'
			})
			.toBe('on');
		// 2 s of quiet, and it proves only that nothing was requested: the sound switch never touches the settings row.
		// No snapshot is taken after this window — the assertions below are retrying ones.
		await page.waitForTimeout(2_000);
		expect(
			server.calls.filter((call) => call.method !== 'GET'),
			'the sound choice sent nothing to the server'
		).toEqual([]);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(soundSwitch).toBeVisible({ timeout: 30_000 });
		await expect(soundSwitch, 'the choice survived the reload: it lives in this browser').toHaveAttribute(
			'aria-checked',
			'true'
		);
		await soundSwitch.click({ timeout: 15_000 });
		await expect(soundSwitch).toHaveAttribute('aria-checked', 'false');
		await expect
			.poll(() => page.evaluate((key) => window.localStorage.getItem(key), SOUND_STORAGE_KEY), {
				timeout: 10_000
			})
			.toBe('off');

		// Switching browser notifications on: the permission is granted, but this browser cannot make a push
		// subscription here (finding 8), so `enable` never reaches the register call
		// (use-inbox-web-push.ts:133-143) and the row stays off with the section's own failure sentence.
		const callsBefore = server.calls.length;
		await page.locator('#notification-push-switch').click({ timeout: 15_000 });
		await expect(page.locator('#notification-push-switch'), 'the push row stayed off').toHaveAttribute(
			'aria-checked',
			'false',
			{ timeout: 20_000 }
		);
		await page.mouse.move(2, 2); // sonner pauses every countdown while the pointer is over the toaster
		await expect
			.poll(() => toastWith(page, C.PUSH_FAILED), {
				timeout: 20_000,
				message: 'the section never raised its own failure sentence'
			})
			.toBe(true);
		report('10 after the push switch', {
			newCalls: server.calls.slice(callsBefore).map((call) => `${call.method} ${call.path}`),
			toasts: await toastTexts(page)
		});
		expect(
			server.calls.filter((call) => call.method === 'POST' && call.path === PUSH_ROUTE),
			'no push device was ever registered'
		).toEqual([]);
		expect(await pushDevicesOf(page), 'the device list stayed the one this file served (empty)').toEqual([]);
		expect(
			[...new Set(origins().map(hostOf))].sort(),
			"every request and socket of this page stayed on the lane's two hosts"
		).toEqual(LANE_HOSTS);
		// The only console lines this test may show are the lane's refused realtime handshake, which its own realtime
		// flag opens (`LANE_REALTIME_WS_NOISE`); nothing else is excused here.
		expect(
			consoleFindings(shield, [LANE_REALTIME_WS_NOISE]),
			'the page logged an error besides the realtime handshake this flag opens on this lane'
		).toEqual([]);
	});

	test('11 flags on, permission left as the browser has it: what the push row says', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_INBOX_ENABLED: 'true' });
		await serveSettings(page, {
			row: { id: 'served-row-9' },
			pushPublicKey: 'BFserved-probe-key-not-a-real-vapid-key'
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		const push = page.locator('#notification-push');
		await expect(push).toBeVisible({ timeout: 30_000 });
		const pushSwitch = page.locator('#notification-push-switch');
		await expect(pushSwitch).toBeVisible();
		await expect(pushSwitch, 'no subscription: off').toHaveAttribute('aria-checked', 'false');
		// Run 1 measured this browser's state on the lane: `Notification.permission` is `default` (nothing asked for it)
		// and the platform lists no device for it, so `browserPushState` lands on `off` (use-inbox-web-push.ts:75-79) —
		// the row shows its own off sentence and the switch is free to try (`canSwitch`, :61).
		await expect(push.getByText(C.PUSH_OFF, { exact: true }), 'an unasked browser reads as off').toBeVisible();
		await expect(pushSwitch, 'off is a state this browser can change here').toBeEnabled();
		// Which state this browser is in, read out of it (browserPushState, use-inbox-web-push.ts:71-79).
		report('11 state of this browser', {
			permission: await notificationPermission(page),
			disabled: await pushSwitch.evaluate((el) => el.hasAttribute('disabled')),
			text: flat(await push.evaluate((el) => el.textContent ?? ''))
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('12 a refused write: the page says so in its own sentence and puts the control back', async ({
		page,
		fixture,
		shield
	}) => {
		const server = await serveSettings(page, {
			row: { id: 'refused-row', assignment: true, preferences: { taskUpdate: true } },
			writeRefusals: [
				{ status: 400, message: 'this file refused the switch' },
				{ status: 500, message: 'this file refused the preference save' }
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		// A type switch refused with a 4xx: the row's own sentence, and the switch back as the server has it.
		await expect(typeSwitch(page, 'assignment')).toBeVisible({ timeout: 30_000 });
		await expect(typeSwitch(page, 'assignment')).toHaveAttribute('aria-checked', 'true');
		const beforeSwitch = server.calls.length;
		await typeSwitch(page, 'assignment').click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, beforeSwitch), {
				timeout: 20_000,
				message: 'the switch sent no write'
			})
			.toBeDefined();
		report('12 refused switch', { shapes: server.shapes().filter((shape) => shape.startsWith('PUT')) });
		await page.mouse.move(2, 2); // sonner pauses its countdown under the pointer
		await expect
			.poll(() => toastWith(page, S.SAVE_FAILED), {
				timeout: 20_000,
				message: 'the refused switch raised no sentence'
			})
			.toBe(true);
		await expect(typeSwitch(page, 'assignment'), 'the switch is back as it was').toHaveAttribute(
			'aria-checked',
			'true',
			{ timeout: 20_000 }
		);
		expect(server.row()?.assignment, 'a refused write changed nothing on the served row').toBe(true);

		// A preferences save refused with a 500: the preferences sentence, and the task-update switch back on.
		const taskUpdate = page.locator('#notification-task-update');
		const beforePreference = server.calls.length;
		await taskUpdate.click({ timeout: 15_000 });
		await expect
			.poll(() => server.writeAfter(ROW_ROUTE, beforePreference), {
				timeout: 20_000,
				message: 'the preference save sent no write'
			})
			.toBeDefined();
		await expect
			.poll(() => toastWith(page, C.SAVE_FAILED), {
				timeout: 20_000,
				message: 'the refused preference save raised no sentence'
			})
			.toBe(true);
		await expect(taskUpdate, 'the refused preferences save put the switch back').toHaveAttribute(
			'aria-checked',
			'true',
			{ timeout: 20_000 }
		);
		expect(server.row()?.preferences, 'the refused preferences save changed nothing on the served row').toEqual({
			taskUpdate: true
		});

		// The fallback toast stayed silent (finding 7: mutation-error-toaster.tsx:23-30 leaves a mutation with its own
		// onError to it), so the page's two sentences are the only toasts this run raises.
		await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toHaveCount(0);

		// The only console lines allowed here are the two refusals this test armed, and the dev mutation log those
		// refusals cause (`armedWrites: true` — nowhere else in this file).
		report('12 console', { errors: shield.consoleErrors() });
		expect(
			consoleFindings(
				shield,
				[
					armedHttpError('PUT', `${ROW_SERVICE_PATH}/refused-row`, 400),
					armedHttpError('PUT', `${ROW_SERVICE_PATH}/refused-row`, 500)
				],
				true
			),
			'the page logged an error besides what this test armed'
		).toEqual([]);
		expect(shield.pageErrors(), 'the page crashed on a refused write').toEqual([]);
	});

	test('13 while the read is still open the page offers nothing to switch', async ({ page, fixture, shield }) => {
		const server = await serveSettings(page, { row: { id: 'pending-row' }, holdRead: true });
		await signInAndVisit(page, fixture, PAGE_PATH);

		// Nothing to click while the read is pending: only the skeleton (notifications-settings-page.tsx:144-146, :194),
		// so "a write during the load" is not a case this UI has (finding 9) — measured, not assumed. The page is up and
		// its read is on the record (and held) before anything is checked absent.
		await expect(page.getByRole('heading', { level: 1, name: ENTRY.TITLE, exact: true })).toBeVisible({
			timeout: 30_000
		});
		await expect
			.poll(() => readOf(server), { timeout: 30_000, message: 'the page never asked for its settings row' })
			.toBeDefined();
		await expect(page.locator('[role=switch]')).toHaveCount(0);
		await expect(page.locator('section[id]')).toHaveCount(0);
		expect(
			server.callsTo(ROW_ROUTE).filter((call) => call.method !== 'GET'),
			'nothing was written while the read was held'
		).toEqual([]);

		server.releaseRead();
		await expect(typeSwitch(page, 'assignment')).toBeVisible({ timeout: 30_000 });
		await expect(typeSwitch(page, 'assignment')).toHaveAttribute('aria-checked', 'true');
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});
});

/** `Notification`'s own state in this browser, read out of the page. */
async function notificationPermission(page: Page): Promise<'default' | 'granted' | 'denied'> {
	return page.evaluate(() => Notification.permission) as Promise<'default' | 'granted' | 'denied'>;
}

/** The devices the page lists, by their row labels. */
async function pushDevicesOf(page: Page): Promise<string[]> {
	return (
		await page
			.locator('#notification-push')
			.getByRole('button', { name: C.DEVICE_REMOVE })
			.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))
	).map(flat);
}
