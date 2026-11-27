import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Route } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	hardVisit,
	overrideRuntimeEnv,
	signInWithFixture,
	stubNextAuthSession,
	waitForShellReady
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Settings › Personal › Preferences**
 * (`/settings/personal/preferences`, `app/[locale]/(main)/settings/personal/preferences/page.tsx:1-5` →
 * `core/components/settings/pages/preferences/preferences-settings-page.tsx:13-48`), on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `3994`, `playwright/test-servers.ts:38`).
 *
 * ## Where the numbers came from
 *
 * Every pinned value was printed by a throwaway probe on this lane first: `D:\Coding\.tmp\probe-preferences\probe.spec.ts`
 * with `probe.config.mjs` (no `webServer`), seventeen runs in `D:\Coding\.tmp\probe-preferences\`:
 * `probe-1.log` (the page as the mock answers it and the reads it sends, the browser's own zone, the theme's effect on
 * `<html>`); `probe-2.log` (the language row's three states, the zone picker's items and its search and empty state,
 * saves refused with 400 and with 500, a 200 that kept the old profile, a profile with no zone, the three app-switcher
 * placements, Auto sync with the flag off then on); `probe-3.log` (6 passed: theme tiles and a reload, the language pick
 * with its write body and the page after, a refused zone save, a profile with no zone, the data-sync block, the
 * mock-as-is reads); `probe-4.log` (a language save refused with 500 — its reload leg was written wrong and timed out,
 * so `probe-8.log` measured it again); `probe-5.log` + `probe-6.log` (a saved zone, and every console line of a language
 * pick, uncut); `probe-7.log` (2 passed: a saved zone — the row, the announcement and the shell notice after it);
 * `probe-8.log` (a refused language save and the load after it); `probe-9.log` (3 passed: the Detect button, a 200 that
 * keeps the old profile, a refused languages read); `probe-10.log` (the languages row's failure state and its retry);
 * `probe-11.log` (every main-frame URL of a refused language pick over 10 s, and the offset the picker prints for each
 * candidate zone); `probe-12.log` (the refused language pick with its navigation history and its settled storage, and the
 * browser zone read before and after the page loads — equal here); `probe-13.log` to `probe-15.log` (dry runs of the zone
 * tests: the notice title compared with `timeZoneNotice.TITLE` filled with the run's own zones and offsets, the picker
 * row's exact text, the write body, the announcement and the `Keep` / `Use` labels); `probe-16.log` (the rewritten zone and
 * language tests as dry runs: the notice title at load and after a save, the picker row's offset against the trigger's,
 * the write body, the trigger's own text sampled once a second for 20 s after the save, and every main-frame URL recorded
 * once the page is already open); `probe-17.log` (the refused zone save: its two toasts, and the notice title, its
 * `Keep` / `Use` labels, the row and the announcement all keeping what they held).
 * The write bodies and the copy are quoted from those logs. Three things are deliberately **not** pinned:
 * the zone list's size (the picker lists what this browser's `Intl` offers — `probe-2.log` counted 419 here and that is
 * a machine's number); this machine's own time zone (every test reads it in `page.evaluate`); and the two zones a test
 * serves or saves — each test, on its own, serves the first name in `ZONE_CANDIDATES` that this browser is not in and
 * saves the next one the picker lists, and every offset used is read out of the picker's own row or from the same `Intl`
 * call the app uses.
 * Here, in `probe-15.log`, that chose the profile zone `Pacific/Kiritimati` (`UTC +14:00`), the saved zone
 * `Asia/Tokyo` (`UTC +09:00`) and this browser's own zone `Europe/Madrid` (`UTC +01:00`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock answers the two reads this page makes when nothing is stubbed — `GET /api/user/me` → the
 * fixture user (`cypress/support/mock-gauzy-server.mjs:607`, `timeZone: 'UTC'`, no `preferredLanguage`) and
 * `GET /api/languages` → `pagination([])` (`:778`), which `languageService.getLanguages`
 * (`core/services/client/api/languages/language.service.ts:26-38`) validates against `languageItemListSchema`
 * (`core/types/schemas/common/language.schema.ts:31-54`). Everything else on the page — the shell's reads, the NextAuth
 * stub, the app's own layout — is the lane's, as in every lane-a file. Test 1 runs on the served profile only (see
 * below); the mock-as-is language row ("No language is available.") is pinned by
 * `suites/lane-b/locale-rendering.spec.ts:145-163` and is not repeated here.
 *
 * **Served by this file:** the profile read, the language list and the profile write, with `page.route` on the **mock
 * origin** (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-357`), because the mock has no handler for
 * a profile write: `if (method !== 'GET') return body ?? { success: true }` (`mock-gauzy-server.mjs:894`) would answer a
 * `PUT /api/user/<id>` with the body it was sent, which fails `userSchema` (`core/types/schemas/user/user.schema.ts:72-121`).
 * Three narrow matchers only (`/api/user/me`, `/api/languages`, `/api/user/<id>`), so the mock keeps answering
 * everything else exactly as the lane serves it. Each answer restates the mock's own CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097`) — the page is on `localhost:3031` and the API on
 * `127.0.0.1:3992`. `route.fetch()` is never called, so `mock.calls('/user/')` stays empty in a stubbed test: that is
 * the witness that the page acted on this file's answers. The store is shared, so the read after a write answers the
 * written profile — the only way "the profile changed" can be told apart from "the page only looks changed".
 *
 * **The browser talks to the mock, never to the app's route twins** (`playwright/test-servers.ts:104-110` +
 * `core/constants/config/constants.tsx` `GAUZY_API_BASE_SERVER_URL` + `core/services/client/axios.ts`, spelled out in
 * `suites/lane-a/README.md:63-72`): measured in `probe-1.log` P1 and `probe-3.log` R6, the settings calls were
 * `GET http://127.0.0.1:3992/api/user/me?…` and `GET http://127.0.0.1:3992/api/languages?is_system=true`.
 * `app/api/**` proxies are not in this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/preferences/preferences-settings-page.tsx`: `useFillMissingTimeZone()` `:15`; the page
 *   title and description `:19-20`; Theme section `:22-29`; the App switcher section only when `HAS_EVER_APP_SWITCHER`
 *   `:30-39`; the Language + Time zone section `:40-45`; `<DataSyncSection />` `:46`.
 * - `preference-tile.tsx:22-46`: one `<label>` per tile — `<input type="radio" className="peer sr-only">` `:25-32` (so
 *   the tile's own text is what the pointer hits), the picked ring + `SelectedMark` `:42`, the label span `:44`.
 * - `theme-tiles.tsx:11,13-17,40-52`: `THEME_CHOICES = ['light','dark','system']`, the labels
 *   `common.THEME_LIGHT` / `common.THEME_DARK` / `settings.preferences.THEME_SYSTEM`, an `sr-only` legend naming the
 *   fieldset `:41`, and `setTheme` from next-themes `:49`.
 * - `app-switcher-tiles.tsx:30-37,43-44`: the pick is a Jotai write (`appSwitcherPlacementState`,
 *   `core/stores/common/app-switcher.ts:13-20`, `atomWithStorage('app-switcher-placement', 'sidebar', …, { getOnInit: true })`);
 *   `isPicked` waits for the mount `:44`; the `SYNC_SAVE_FAILED` toast `:33-36` is only reachable when the browser
 *   refuses its own storage.
 * - `language-row.tsx:24-60`: the `Select` with `SelectTrigger` `:25-28` (its accessible name comes from the row's
 *   `<label htmlFor>`), the skeleton while the list loads `:38-47`, `LANGUAGE_LOAD_FAILED` + `notifications.RETRY`
 *   `:48-57`, `LANGUAGE_EMPTY` `:58-60`; the shown name comes from `currentCode` = the **routing** locale
 *   (`use-preferred-language.ts:50`).
 * - `use-preferred-language.ts:24-41`: an unknown code writes nothing `:26-29`; then the app cookie `:30`, the routing
 *   cookie `:31`, `changeLanguage` `:32`, the account write `:33-36`, `router.replace('/<code>/settings/personal/preferences')` `:38`.
 * - `use-language-settings.ts:29-34` `filterLanguagesByCode` (`select:` at `:135`): a served language whose code the app
 *   does not offer never reaches the picker.
 * - `time-zone-row.tsx:36-57,69-104`: the announcement in an `sr-only` `aria-live="polite"` span `:36-40,101-103`; the
 *   failure toast `timeZoneNotice.SAVE_FAILED` `:42-46`; the trigger labelled by the row's `<label htmlFor={triggerId}>`
 *   `:70-77` showing `display.label` + `UTC_OFFSET` `:78-85` or `TIME_ZONE_PICK` `:86-90`; the `common.DETECT` button
 *   `:98-100`; the list is `dynamic(…, { ssr: false })` `:25`.
 * - `time-zone-list.tsx:21-51`: cmdk `Command` with `TIME_ZONE_SEARCH` `:27`, `TIME_ZONE_EMPTY` `:29`, one
 *   `CommandItem` per option with `keywords={[label, 'UTC<offset>']}` `:34-39` and a `SelectedMark` for the current zone `:44`.
 * - `data-sync-section.tsx:17-84`: the `SYNC_MODE` fieldset with `PULL` `checked readOnly` `:36` and `REAL_TIME`
 *   `disabled readOnly` `:39-50`, its hint `<p>` wired by `aria-describedby` `:24,52-54`; `SettingsSection id="sync-zone"`
 *   `:72`; `SwitchRow id="settings-auto-sync"` with the modes as `revealed` `:74-81` (revealed only while checked,
 *   `core/components/settings/kit/settings-switch.tsx:70-101`).
 * - `use-data-sync-preference.ts:13-49` + `core/lib/utils/settings-data-sync.ts:3,10-15,42-45`: the flag is read from
 *   `localStorage 'conf-is-data-sync'` and written as JSON; `core/hooks/settings/use-time-zone-setting.ts:76-99` is the
 *   page's own fill of a missing zone.
 * - The shell: `core/components/layouts/default-layout/time-zone-notice.tsx:22-49,85-110` with
 *   `core/hooks/settings/use-time-zone-notice.ts:98-155` and `core/lib/utils/time-zone-notice.ts:84-113`; the switcher
 *   `core/components/common/app-switcher/app-switcher-menu.tsx:69-80` (`aria-label = switchers.SWITCH_APP`) and
 *   `app-rail.tsx:86-98` (`<nav aria-label={switchers.EVER_APPS}>`, one link per app named `switchers.APP_OPENS_IN_NEW_TAB`).
 * - The API verbs: `core/services/client/api/users/user.service.ts:147-153` `updateUserAvatar` = **`PUT /user/<id>`** +
 *   `noteProfileSaved()` + `validateApiResponse(userSchema, …)`; `freshReadParam()` `:106-113` adds its parameter only in
 *   proxy mode, so on this lane the read is `GET /api/user/me?relations[0]=role&relations[1]=tenant&includeEmployee=true`
 *   (measured `probe-3.log` R6).
 *
 * ## Copy
 *
 * Every English string is read from `locales/en.json` by key (`settings.preferences` `:5733-5761`,
 * `settings.entries.preferences` `:4727-4730`, `timeZoneNotice`, `common`, `notifications.RETRY`, `switchers`), never
 * typed. The French copy test 4 checks is read the same way from `locales/fr.json`.
 *
 * ## Findings, each with the run that printed it
 *
 * - **A profile save is `PUT /api/user/<id>`, and the mock never answers one.** The brief named
 *   `POST /api/users/update`; this page never sends it. Every save carried exactly four body keys — `id`,
 *   `organizationId`, `tenantId` plus the field written: `preferredLanguage` (`probe-3.log`, `probe-4.log`) or
 *   `timeZone` (`probe-3.log`, `probe-5.log`, `probe-7.log`, `probe-9.log`, `probe-10.log`, `probe-13.log`,
 *   `probe-15.log`). The written value is always `formatStoredTimeZone`'s form — the zone name, then `(UTC ±hh:mm)`
 *   (`settings-time-zone.ts:109-112`): `Asia/Tokyo (UTC +09:00)` for the zone this run's picker row named, and
 *   `Detect` writes what this browser reads in `Intl` (`Europe/Madrid (UTC +01:00)` here).
 * - The page's own reads, with nothing stubbed: `GET /api/user/me?relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true`
 *   and `GET /api/languages?is_system=true`, no write, no external call, no console line (`probe-1.log`, `probe-3.log`,
 *   pinned in test 1 as sorted sets).
 * - **A language pick moves the browser first, and a refused account save does not move it back.** The pick wrote
 *   `NEXT_LOCALE=fr` and `auth-active-language=fr` plus `localStorage 'preferredLanguage'`, and the URL became
 *   `…/fr/settings/personal/preferences`. With the account write refused by 500 the same thing happened: with the recorder
 *   installed once the page is open, every main-frame URL recorded after the pick was
 *   `http://localhost:3031/fr/settings/personal/preferences` — exactly one navigation in a 10 s window and one in the run
 *   test 5 now does (`probe-11.log` C1, `probe-12.log` C3, `probe-16.log` V3), the URL reached it within the 25 s
 *   `expect.poll` window, and the page came back with the French headings and a `Français` trigger while the served profile
 *   kept `preferredLanguage: 'en'`.
 *   `router.replace` is not gated on the write (`use-preferred-language.ts:34-38`), which is the order
 *   `core/hooks/settings/use-preferred-language.test.tsx:54` pins: `it('writes the routing cookie with the language
 *   picked, before the page moves to it')`. The account wins the *stored* language in the end: `changeLanguage` writes
 *   `localStorage 'preferredLanguage'` (`use-language.ts:24-28`) and the user query re-applies the account's value
 *   (`use-user-language-preference.ts:14-21`), so the storage settled back on `en` in both runs (`probe-11.log` C1
 *   `preferredLanguage=en`, `probe-12.log` C3 the same before and after a reload). Deliberate code throughout, so no tag.
 * - **Every zone a test serves or saves is chosen while the test runs.** `ZONE_CANDIDATES` is the only pool: the profile
 *   zone is the first candidate that is not this browser's zone, the saved zone the next one the picker really lists, so
 *   the shell's notice always has two zones to name. Measured on this machine: profile `Pacific/Kiritimati (UTC +14:00)`,
 *   saved `Asia/Tokyo (UTC +09:00)`, browser `Europe/Madrid (UTC +01:00)` (`probe-15.log` C5, `probe-13.log` C6,
 *   `probe-16.log` V1, `probe-17.log` V2). A profile served as the bare zone name prints its own offset in the row and in
 *   the notice (`zoneNameOf` + `timeZoneDisplayOf`, `settings-time-zone.ts:40-50,163-171`), which is what lets the offsets
 *   come from the picker's rows instead of from this file: `probe-16.log` V1 checked the offset the row printed against
 *   the one the trigger printed for the same zone and they were the same (`+14:00` both).
 * - **A saved zone reaches the row about 1.7 s after the write, not with it.** `probe-16.log` V1 sampled the trigger once
 *   a second for 20 s after picking `Asia/Tokyo`: at 0 ms it still read `Pacific/Kiritimati UTC +14:00`, from 1714 ms on
 *   every sample read `Asia/Tokyo UTC +09:00`, and the store already held `Asia/Tokyo (UTC +09:00)` from the start — the
 *   row shows what the user query holds, which is refreshed by the write's re-read. That is why every assertion after a
 *   save in tests 6, 8 and 9 is a web-first one and none of them is a single read.
 * - The picker's row text is `<label>` + `UTC_OFFSET` (+ `common.SELECTED` for the zone the profile holds) with **no
 *   whitespace between the two spans**: `probe-15.log` C5 printed `Pacific/KiritimatiUTC +14:00Selected` from the row's
 *   `textContent`, while `innerText` of the same row puts a space between them. Every expected row text here is built
 *   from the copy keys and compared with `toHaveText`, which compares the `textContent` form.
 * - The shell's notice is compared whole, never half a sentence typed: `noticeTitleOf` fills `timeZoneNotice.TITLE`'s four
 *   placeholders the way `time-zone-notice.tsx:22-31` does, and the printed line was equal to it in every state a test
 *   reaches — at load, after a save and after a save refused with 400 (`probe-16.log` V1 `titleMatch` / `savedTitleMatch`
 *   true, `probe-17.log` V2 `titleMatch` true; at load `Your profile uses Pacific/Kiritimati (UTC +14:00). This browser is
 *   in Europe/Madrid (UTC +01:00).`). The locator behind it, `noticeLines`, is built from the two title keys' own first
 *   words (`TITLE` and `TITLE_NO_PROFILE_ZONE`), and it found exactly 1 line in each of those states, which is what makes
 *   the 0-line assertions in tests 8 and 11 say something rather than nothing.
 * - A served language whose code the app does not offer never reaches the picker: 4 languages served, 3 options
 *   (`English`, `Français`, `Deutsch`) — `use-language-settings.ts:29-34` with `core/hooks/settings/use-preferred-language.test.tsx:75`
 *   `it('writes nothing for a language the app does not offer')`.
 * - The zone trigger's own text is the zone name and its `UTC {offset}` span on one line with nothing between them
 *   (`Africa/KinshasaUTC +01:00` in `probe-6.log`, `Pacific/KiritimatiUTC +14:00Selected` in `probe-15.log` C5 for the
 *   picker's row), so the row is asserted with two `toContainText` and the list row with one `toHaveText` built from
 *   `UTC_OFFSET` and `common.SELECTED`, never from a typed concatenation.
 * - A refused save speaks twice: the row's `timeZoneNotice.SAVE_FAILED` toast **and** the shared
 *   `core/components/common/mutation-error-toaster.tsx` toast `toasts.MUTATION_FAILED`, with `toasts.REASONS.INVALID` for
 *   400 (`probe-13.log` C6) and `toasts.REASONS.SERVER` for 500 (`probe-4.log`, `probe-12.log` C3). The row, the
 *   announcement (`main [aria-live=polite]` stays `''`), the notice, its `Keep` / `Use` labels and the served profile keep
 *   what they held either way: `probe-17.log` V2 printed that set after a 400 — row `Pacific/Kiritimati UTC +14:00`,
 *   announcement `''`, notice line unchanged with `Keep Pacific/Kiritimati` / `Use Europe/Madrid`, store
 *   `Pacific/Kiritimati`.
 *   The same refusal prints `console.error('Mutation failed:', …)` (`mutation-error-toaster.tsx:48`): that line is named
 *   only in the two tests that armed the refusal (5 and 7), so a mutation that fails anywhere else is a finding. A failed
 *   *read* never prints it — `core/components/common/dev-error-toaster.tsx:17-18` turns a query failure into a toast only.
 * - **A 200 that keeps the old profile is not a save:** `timeZoneNotice.SAVE_FAILED` only, no `MUTATION_FAILED`, row and
 *   profile unchanged (`probe-9.log`) — measured, and stated by `core/hooks/settings/use-time-zone-setting.ts:41`: "An API
 *   whose update does not take the zone answers success and keeps the old one: what it holds counts".
 * - The languages read refused with 502: the row shows `settings.preferences.LANGUAGE_LOAD_FAILED` with a
 *   `notifications.RETRY` button inside its `role="alert"`, and its retry sends one more read — 4 reads before, 5 after
 *   (`probe-10.log`). `LANGUAGE_EMPTY` never appears in that state, and the failure copy shares its span with the retry
 *   button, so an `exact: true` match finds nothing there.
 * - Auto sync: the flag is `localStorage 'conf-is-data-sync'` written as JSON; off stores `'false'` and clears
 *   `conf-data-sync-mode`; the `Sync mode` fieldset (Pull checked, Real time disabled, `SYNC_MODE_HINT`) exists only while
 *   the switch is on, and a reload keeps it off (`probe-2.log`, `probe-3.log`).
 * - **The App switcher section is absent as the lane serves the page** — no section, no tiles (`probe-1.log`), because the
 *   lane sets no `NEXT_PUBLIC_EVER_APP_LINKS`, so `HAS_EVER_APP_SWITCHER` is false (`preferences-settings-page.tsx:30-39`).
 *   Test 3 reaches it with `overrideRuntimeEnv` pointing one app at the mock origin, which keeps `shield.externalCalls()`
 *   empty; the rail link's `switchers.OPENS_IN_NEW_TAB` wording is in its `aria-label` (`app-rail.tsx:86-98`), not in its
 *   text — filtering on text found 0.
 * - Console: every test that writes the profile sees one line that no test armed, `Encountered a script tag while
 *   rendering React component. Scripts inside React components are never executed when rendering on the client. Consider
 *   using template tag instead (…Element/template).` — `probe-5.log` and `probe-6.log` printed it whole, once each,
 *   between the write's `GET /user/me` re-reads and the re-render's `Jitsu …` logs; a page that only loads prints no such
 *   line. **Its text names no component and it carries no stack**, so this file can only excuse it by its exact name
 *   (tests 4-9 and 11). Its likely source is read in the dependency, not measured here — see the last bullet.
 *
 * ## Left out, and why
 *
 * - `settings.preferences.SYNC_SAVE_FAILED` on the switcher tiles (`app-switcher-tiles.tsx:33-36`) needs the browser to
 *   refuse its own `localStorage`; blocking storage on a page whose shell reads it tests the harness, not the app.
 * - The number of reads the data-sync interval repeats is **not** pinned here: inside one run the polling effect is
 *   invisible in TanStack Query's stale window (`probe-3.log` R5 measured off 2→2 and on 4→4), and lane-b already pins
 *   that — `suites/lane-b/public-team-page-ui.spec.ts:1122` `test('9 the refresh interval repeats nothing inside the stale window')`.
 *   Test 12 pins the switch, the modes it reveals, both stored values and a reload only.
 * - `LazySyncZone` (`core/components/optimized-components/settings.tsx:45`) is exported and imported nowhere in the app, so
 *   no preference on this page reaches it; the only other writer of the sync flag is `core/components/common/toggler.tsx:138`,
 *   outside this page.
 * - The shell's offer for a profile with no zone never reaches this screen: `useFillMissingTimeZone()`
 *   (`preferences-settings-page.tsx:15` → `use-time-zone-setting.ts:75-99`, whose own comment reads "Timesheets and
 *   reports fall back to UTC for a user without a time zone.") writes the browser's zone first — measured as the fill
 *   write in `probe-10.log` — so test 11 pins the notice lines and its Keep/Use buttons at 0.
 *   `core/components/layouts/default-layout/time-zone-notice.test.tsx:71`
 *   `it('offers the browser zone to a profile without one, with nothing to keep')` covers that component with a
 *   `profileZone: null` state this page's own hook never lets it hold: a state the code prevents, not an intent the
 *   product states that the browser contradicts, so it carries no tag either.
 * - **Left open:** which component renders the script tag behind `Encountered a script tag while rendering React
 *   component`. The line itself gives nothing away — no component name, no stack (see the finding above). Ruled out by
 *   reading: the layout's gtag block is commented out (`app/[locale]/layout-component.tsx:120-133`), and the chatwoot
 *   widget inserts its script through the DOM inside an effect (`core/components/integration/chatwoot/index.tsx:13-21`),
 *   not as JSX. A likely source, **read in the dependency and not measured on this page**: `next-themes` 0.4.6 renders
 *   its bootstrap as an inline `<script>` inside `ThemeProvider` (`t.createElement("script", { …,
 *   dangerouslySetInnerHTML: { __html: \`(${M.toString()})(${p})\` } })` in `node_modules/next-themes/dist/index.mjs`),
 *   and React prints this exact warning when a `<script>` renders as a component child on the client. That fits the
 *   timing too: the line appears when a profile write re-renders the tree that holds the theme provider, and this page
 *   changes the theme through the very same provider (test 2). Finding it for certain would mean reading further into the
 *   app, which this brief does not allow, so the spec excuses the line by its exact name.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PREFERENCES_PATH = '/settings/personal/preferences';
const USER_ME_PATH = '/api/user/me';
const LANGUAGES_PATH = '/api/languages';

/** `locales/en.json`: `settings.preferences` `:5733-5761`, `settings.entries.preferences` `:4727-4730`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: {
		preferences: Record<string, string>;
		entries: { preferences: { TITLE: string; DESCRIPTION: string } };
	};
	timeZoneNotice: Record<string, string>;
	common: Record<string, string>;
	notifications: Record<string, string>;
	switchers: Record<string, string>;
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
};
/** The same keys in French, for the test that moves the page to French (`locales/fr.json`). */
const FR = JSON.parse(readFileSync(join(__dirname, '../../../locales/fr.json'), 'utf8')) as {
	settings: { preferences: Record<string, string>; entries: { preferences: { TITLE: string } } };
};
const T = EN.settings.preferences;
const NOTICE = EN.timeZoneNotice;
/** `mutation-error-toaster.tsx:49-53` with `errorReasonKeyOf` (`core/lib/utils/error-feedback.ts:21-31`). */
const MUTATION_FAILED = EN.toasts.MUTATION_FAILED;
/** `common.SELECTED` is the `sr-only` word `SelectedMark` prints inside a picked tile. */
const SELECTED = EN.common.SELECTED;
const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a preferences] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** React's dev-mode store warning, not this page's (see `chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * `mutation-error-toaster.tsx:48` prints `console.error('Mutation failed:', …)` for every mutation that reached
 * `onError`. It is excused only in a test that armed the refusal (tests 5 and 7), so a mutation failing where nothing
 * was armed is a finding. A failed *read* is not printed here: `core/components/common/dev-error-toaster.tsx:17-18`
 * turns a query failure into a toast only.
 */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;
/**
 * React's own warning that a `<script>` element was rendered inside a component, measured whole as
 * "Encountered a script tag while rendering React component. Scripts inside React components are never executed when
 * rendering on the client. Consider using template tag instead (…Element/template)." — `probe-5.log` S2 / `probe-6.log`
 * S2 printed that single line, and **its text names no component and carries no stack**: it arrives as one
 * `console.error` between the write's `✅ Response: 200 GET /user/me` lines and the re-render's `Jitsu …` logs, and only
 * after a profile write made the shell re-read `/api/user/me` (a page that only loads prints nothing).
 * A likely source, read in the dependency rather than measured here: next-themes 0.4.6 renders its bootstrap as an
 * inline script (`t.createElement("script", { … dangerouslySetInnerHTML … })` in
 * `node_modules/next-themes/dist/index.mjs`), which is exactly the shape React 19 warns about when it renders on the
 * client. Excluded by measurement: the layout's gtag block is commented out
 * (`app/[locale]/layout-component.tsx:120-133`) and the chatwoot widget inserts its script through the DOM inside an
 * effect (`core/components/integration/chatwoot/index.tsx:13-21`). Excused by its exact name, and left open in the header.
 */
const REACT_SCRIPT_TAG_WARNING = 'Encountered a script tag while rendering React component';

/** What the shield still reports after every line this test named is removed: an unnamed line is a finding. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

const flat = (value: string | null) =>
	String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim();

/**
 * This browser's own side of the time zone, read in the page and never assumed: the zone the way `detectTimeZone` reads
 * it (`core/lib/utils/settings-time-zone.ts:114-124`), the label the way `timeZoneLabelOf` prints it (`:105-107`, `_` →
 * a space) and the offset the way `utcOffsetOf` reads it (`:75-90`, `Intl` `longOffset` with the `GMT` prefix dropped,
 * falling back to `ZERO_OFFSET` `+00:00`). `probe-15.log` C5 measured both the zone and the offset identical before the
 * page loads and after it, so a test may choose its profile zone from this before the first navigation.
 */
const browserZoneOf = (page: Page) =>
	page.evaluate(() => {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const longOffset =
			new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
				.formatToParts(new Date())
				.find((part) => part.type === 'timeZoneName')?.value ?? '';
		return {
			zone,
			label: zone.replace(/_/g, ' '),
			offset: longOffset.replace('GMT', '').replace(/−/g, '-') || '+00:00',
			prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches
		};
	});

/** `timeZoneLabelOf` (`core/lib/utils/settings-time-zone.ts:105-107`): every zone label on this page is the name with `_` shown as a space. */
const zoneLabelOf = (zone: string) => zone.replace(/_/g, ' ');

/**
 * `utcOffsetOf` run in the page for any zone name (`core/lib/utils/settings-time-zone.ts:75-90`): the offset the page
 * prints for a zone the file served, so a test never types one. `probe-15.log` C5 measured it equal to the offset the
 * picker printed for the same zone.
 */
const offsetOfZone = (page: Page, zone: string) =>
	page.evaluate((name: string) => {
		const longOffset =
			new Intl.DateTimeFormat('en-US', { timeZone: name, timeZoneName: 'longOffset' })
				.formatToParts(new Date())
				.find((part) => part.type === 'timeZoneName')?.value ?? '';
		return longOffset.replace('GMT', '').replace(/−/g, '-') || '+00:00';
	}, zone);

/**
 * The stored form `formatStoredTimeZone` writes (`core/lib/utils/settings-time-zone.ts:109-112`): the zone name, then
 * `(UTC ±hh:mm)`. Only used here to name the zone a test picked, never this machine's zone.
 */
const zoneValue = (label: string, offset: string) => `${label} (UTC ${offset})`;

/**
 * The zones a test may take, always from this list, never a fixed one: each test takes the first candidate that is not
 * this browser's own zone, and the next one for the zone it saves, so the shell's notice always has two different zones
 * to name. All six were counted in the picker on this machine (`probe-11.log` C2, `probe-15.log` C5), and none is
 * spelled with an underscore, so its label is its name (`settings-time-zone.ts:105-107`). `Asia/Kathmandu` is out of the
 * list because `probe-11.log` C2 measured this browser's picker printing no row for it.
 */
const ZONE_CANDIDATES = [
	'Pacific/Kiritimati',
	'Asia/Tokyo',
	'Africa/Kinshasa',
	'Atlantic/Azores',
	'America/Anchorage',
	'Europe/Lisbon'
];

/** A candidate list that ran out on some browser is a loud failure, never a silent fallback to a typed zone. */
const requiredZone = (zone: string | undefined, what: string) => {
	if (!zone) {
		throw new Error(`${what}: no zone left in ${ZONE_CANDIDATES.join(', ')} that this browser is not already in`);
	}
	return zone;
};

/** The served profile's zone: a candidate this browser is not in, held as the plain name (`probe-15.log` C5 measured the row printing its own offset for it). */
const profileZoneFor = async (page: Page) => {
	const browserZone = (await browserZoneOf(page)).zone;
	return requiredZone(
		ZONE_CANDIDATES.find((zone) => zone !== browserZone),
		'the profile zone'
	);
};

/** The mock's `baseUser` shape (`mock-gauzy-server.mjs:100-121`, role `:80-86`, employee `:139-150`), as this file serves it. */
const profileOf = (ids: Record<string, string>, names: Record<string, string>, overrides: Record<string, unknown>) => ({
	id: ids.user,
	name: names.user,
	firstName: 'Fixture',
	lastName: 'Manager',
	email: 'manager@example.test',
	timeZone: 'UTC',
	isEmailVerified: true,
	tenantId: ids.tenantA,
	roleId: ids.role,
	role: { id: ids.role, name: 'ADMIN', isSystem: true, rolePermissions: [], tenantId: ids.tenantA },
	defaultOrganizationId: ids.organizationA,
	lastOrganizationId: ids.organizationA,
	defaultTeamId: ids.teamA,
	lastTeamId: ids.teamA,
	employeeId: ids.employee,
	employee: {
		id: ids.employee,
		userId: ids.user,
		fullName: names.user,
		isTrackingEnabled: true,
		isTrackingTime: false,
		isActive: true,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA
	},
	tenant: { id: ids.tenantA, name: names.workspaceA },
	...overrides
});

type ServedCall = { method: string; path: string; search: string; body: string | null };
type ServedLanguage = { code: string; name: string };

type ServedScript = {
	profile: Record<string, unknown>;
	languages?: ServedLanguage[];
	/** Set instead of `languages`: the list read itself refuses. */
	languagesFails?: number;
	/** Set when the profile write must refuse with this status. */
	updateFails?: number;
	/** Answer a write with success and the profile it already held (`use-time-zone-setting.ts:41`). */
	updateKeepsOldProfile?: boolean;
};

type Served = {
	calls: ServedCall[];
	store: { profile: Record<string, unknown> };
	userPath: string;
	/** This file's writes to the profile route only, so a shell write cannot be mistaken for one. */
	profileWrites: () => ServedCall[];
	readsOf: (path: string) => ServedCall[];
	shapes: () => string[];
};

/**
 * This file's stand-in for the profile and the language list, on the mock origin, because the mock answers neither the
 * way this page needs (`mock-gauzy-server.mjs:607`, `:778`, `:894`). The profile answer is always the current store, so
 * the read after a write answers the written profile.
 */
async function servePreferences(page: Page, script: ServedScript): Promise<Served> {
	const store = { profile: { ...script.profile } };
	const calls: ServedCall[] = [];
	const userPath = `/api/user/${String(script.profile.id)}`;
	const mockPath = (target: string) => (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname === target;

	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN) return;
		calls.push({ method: request.method(), path: url.pathname, search: url.search, body: request.postData() });
	});

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});

	await page.route(mockPath(USER_ME_PATH), (route) => {
		if (route.request().method() === 'OPTIONS') return answer(route, 204);
		return answer(route, 200, store.profile);
	});

	await page.route(mockPath(LANGUAGES_PATH), (route) => {
		if (route.request().method() === 'OPTIONS') return answer(route, 204);
		if (script.languagesFails) {
			return answer(route, script.languagesFails, {
				statusCode: script.languagesFails,
				message: 'this file refused the languages'
			});
		}
		const items = (script.languages ?? []).map((language, index) => ({
			id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
			name: language.name,
			code: language.code,
			description: `served language ${language.code}`,
			color: '#123456',
			is_system: true,
			tenantId: script.profile.tenantId
		}));
		return answer(route, 200, { items, total: items.length });
	});

	await page.route(mockPath(userPath), (route) => {
		const request = route.request();
		if (request.method() !== 'PUT') return answer(route, 204);
		if (script.updateFails) {
			return answer(route, script.updateFails, {
				statusCode: script.updateFails,
				message: 'this file refused the profile write'
			});
		}
		// `updateKeepsOldProfile`: an API that answers success while keeping what it held
		if (script.updateKeepsOldProfile) return answer(route, 200, store.profile);
		const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
		const next = { ...store.profile };
		if (typeof body.preferredLanguage === 'string') next.preferredLanguage = body.preferredLanguage;
		if (typeof body.timeZone === 'string') next.timeZone = body.timeZone;
		store.profile = next;
		return answer(route, 200, next);
	});

	return {
		calls,
		store,
		userPath,
		profileWrites: () => calls.filter((call) => call.path === userPath && call.method === 'PUT'),
		readsOf: (path) => calls.filter((call) => call.path === path && call.method === 'GET'),
		shapes: () =>
			calls
				.filter((call) => call.path === LANGUAGES_PATH || call.path.startsWith('/api/user/'))
				.map((call) => `${call.method} ${call.path}${call.search}`)
				.sort()
	};
}

/** Routes first, cookies second, navigation last (`signInAndVisit` navigates, and these tests must intercept first). */
async function openPreferences(page: Page, fixture: { ids: Record<string, string>; names: Record<string, string> }) {
	await signInWithFixture(page.context(), fixture as never, 'A');
	await stubNextAuthSession(page);
	await hardVisit(page, PREFERENCES_PATH);
}

const section = (page: Page, name: string) => page.getByRole('group', { name });
const themeGroup = (page: Page) => section(page, T.SECTION_THEME);
const switcherGroup = (page: Page) => section(page, T.SECTION_APP_SWITCHER);
const syncGroup = (page: Page) => section(page, T.SYNC_MODE);
const syncSwitch = (page: Page) => page.getByRole('switch', { name: T.AUTO_SYNC });
/** The row's `<label htmlFor>` names the zone trigger; `getByText` would hit the notice's `Keep <zone>` instead. */
const zoneTrigger = (page: Page) => page.getByRole('button', { name: T.TIME_ZONE, exact: true });
const languageTrigger = (page: Page) => page.getByRole('combobox', { name: T.LANGUAGE });
const selectItems = (page: Page) => page.locator('[data-slot=select-item]');
const zoneItems = (page: Page) => page.locator('[cmdk-item]');
const liveStatus = (page: Page) => page.locator(`main [aria-live=polite]`);
const toasts = (page: Page) => page.locator('[data-sonner-toast]');
const headings = (page: Page) => page.locator('main h1, main h2');
/**
 * The notice's own title lines, cut out of the copy: `timeZoneNotice.TITLE` (`locales/en.json:8462`) up to its
 * `{profileZone}` and `timeZoneNotice.TITLE_NO_PROFILE_ZONE` (`:8464`) up to its `{browserZone}` — the words before the
 * first placeholder. Nothing is typed, so a copy change moves the locator with the copy instead of matching nothing.
 * `probe-15.log` C5 counted exactly 1 line for it while the notice was on the page.
 */
const noticeLines = (page: Page) =>
	page.getByText(
		new RegExp(
			`^(${[NOTICE.TITLE.split('{profileZone}')[0], NOTICE.TITLE_NO_PROFILE_ZONE.split('{browserZone}')[0]]
				.map(asPatternSource)
				.join('|')})`
		)
	);
const noticeButtons = (page: Page) =>
	page
		.getByRole('button')
		.filter({ hasText: new RegExp(`^(${NOTICE.USE.split('{')[0]}|${NOTICE.KEEP.split('{')[0]})`) });

/** `<html>` as next-themes leaves it: the `attribute="class"` marker and the resolved `color-scheme`. */
const htmlTheme = (page: Page) =>
	page.evaluate(() => ({
		htmlClass: document.documentElement.className,
		htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
		theme: window.localStorage.getItem('theme')
	}));

const pickedValues = async (page: Page, group: Locator) =>
	group
		.locator('input[type=radio]')
		.evaluateAll((nodes) =>
			nodes.filter((node) => (node as HTMLInputElement).checked).map((node) => (node as HTMLInputElement).value)
		);

/** sonner pauses its countdown while the pointer is over the toaster: park it first (`brief-common`). */
const dismissToasts = async (page: Page) => {
	await page.mouse.move(2, 2);
	await expect(toasts(page)).toHaveCount(0, { timeout: 30_000 });
};

const cookiePairs = async (page: Page): Promise<Array<[string, string]>> => {
	const cookies = await page.context().cookies();
	return cookies
		.filter((cookie) => /language|locale|timezone/i.test(cookie.name))
		.map((cookie) => [cookie.name, cookie.value] as [string, string])
		.sort();
};

const storageValue = (page: Page, key: string) =>
	page.evaluate((name: string) => window.localStorage.getItem(name), key);

/** A locale string turned into a regular expression source, so no expected wording is ever typed. */
const asPatternSource = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asPattern = (value: string) => new RegExp(asPatternSource(value));

/** `settings.preferences.UTC_OFFSET` (`locales/en.json`) with any real `±hh:mm` in its placeholder's place. */
const utcOffsetPattern = () => new RegExp(`${asPatternSource(T.UTC_OFFSET.split('{offset}')[0])}[+-]\\d{2}:\\d{2}`);

/**
 * `timeZoneNotice.TITLE` with its four placeholders filled the way `core/components/layouts/default-layout/time-zone-notice.tsx:22-31`
 * fills them: each zone through `timeZoneLabelOf`, each offset through `UTC_OFFSET`. `probe-15.log` C5 compared this
 * with the line the page printed and they were equal, which is what lets a test compare the whole notice instead of
 * typing half a sentence.
 */
const noticeTitleOf = (profileZone: string, profileOffset: string, browserZone: string, browserOffset: string) =>
	NOTICE.TITLE.replace('{profileZone}', profileZone)
		.replace('{profileOffset}', T.UTC_OFFSET.replace('{offset}', profileOffset))
		.replace('{browserZone}', browserZone)
		.replace('{browserOffset}', T.UTC_OFFSET.replace('{offset}', browserOffset));

/** Every zone row this file reads comes out of the open picker: the trigger is the row's own button. */
const openZonePicker = async (page: Page) => {
	await zoneTrigger(page).click({ timeout: 15_000 });
	await expect(page.getByPlaceholder(T.TIME_ZONE_SEARCH)).toHaveCount(1, { timeout: 15_000 });
	await expect.poll(() => zoneItems(page).count(), { timeout: 15_000 }).toBeGreaterThan(0);
};

type ZoneRow = {
	id: string;
	label: string;
	offset: string;
	offsetText: string;
	value: string;
	item: Locator;
	text: string;
};

/**
 * The picker's own words for one zone: its row prints the label and `UTC_OFFSET` (`time-zone-list.tsx:36-45`), read out of
 * the row's `textContent`, which is the text `toHaveText` compares (`probe-15.log` C5 printed
 * `Pacific/KiritimatiUTC +14:00Selected`). The offset therefore comes from the page and never from this file. `null` when
 * the picker prints no row for the zone, which is how a browser with a shorter `Intl` list is handled.
 */
const readZoneRow = async (page: Page, id: string): Promise<ZoneRow | null> => {
	await page.getByPlaceholder(T.TIME_ZONE_SEARCH).fill(id, { timeout: 15_000 });
	const item = zoneItems(page).filter({ hasText: id }).first();
	let listed = true;
	try {
		await expect.poll(() => item.count(), { timeout: 8_000 }).toBeGreaterThan(0);
	} catch {
		listed = false;
	}
	if (!listed) {
		return null;
	}
	const text = String(await item.evaluate((node) => (node as HTMLElement).textContent ?? ''));
	const offset = /[+-]\d{2}:\d{2}/.exec(text)?.[0];
	if (!offset) {
		return null;
	}
	return {
		id,
		label: zoneLabelOf(id),
		offset,
		offsetText: T.UTC_OFFSET.replace('{offset}', offset),
		value: zoneValue(id, offset),
		item,
		text
	};
};

/** A candidate the picker printed no row for is this file's failure to say so, never a silent pass. */
const requiredRow = (row: ZoneRow | null, zone: string): ZoneRow => {
	if (!row) {
		throw new Error(`the zone picker printed no row for ${zone}`);
	}
	return row;
};

/** The first candidate the picker really lists that is neither this browser's zone nor `taken`, read from its row. */
const pickZoneRow = async (page: Page, taken: string[]): Promise<ZoneRow> => {
	const { zone: browserZone } = await browserZoneOf(page);
	for (const candidate of ZONE_CANDIDATES) {
		if (candidate === browserZone || taken.includes(candidate)) {
			continue;
		}
		const row = await readZoneRow(page, candidate);
		if (row) {
			return row;
		}
	}
	throw new Error(`the zone picker listed none of ${ZONE_CANDIDATES.join(', ')} besides ${taken.join(', ')}`);
};

test.describe('Settings › Personal › Preferences', () => {
	test('1 the page as printed: its sections, its controls, the reads it sends', async ({ fixture, page, shield }) => {
		// a zone this browser is not in, chosen at run time — never a machine's own zone and never a typed one
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [
				{ code: 'en', name: 'English' },
				{ code: 'fr', name: 'Français' },
				{ code: 'de', name: 'Deutsch' }
			]
		});
		await openPreferences(page, fixture);

		await expect(headings(page)).toHaveText([
			EN.settings.entries.preferences.TITLE,
			T.SECTION_THEME,
			T.SECTION_REGION,
			T.SECTION_SYNC
		]);
		// the App switcher section only exists when the runtime env names other Ever apps (`:30-39`); this lane sets none
		await expect(switcherGroup(page)).toHaveCount(0);

		await expect(themeGroup(page)).toHaveCount(1);
		await expect(themeGroup(page).locator('label')).toHaveCount(3);
		await expect(themeGroup(page).locator('legend')).toHaveText(T.SECTION_THEME);

		await expect(languageTrigger(page)).toHaveCount(1);
		await expect(languageTrigger(page)).toHaveText('English');
		// the row names the zone this file served and prints an offset in the copy's own shape (`UTC_OFFSET`), the value
		// `utcOffsetOf` reads for that zone (`settings-time-zone.ts:75-90`) — this file pins the shape, not the number
		await expect(zoneTrigger(page)).toContainText(zoneLabelOf(profileZone));
		await expect(zoneTrigger(page)).toContainText(utcOffsetPattern());

		await expect(syncSwitch(page)).toHaveCount(1);
		await expect(syncSwitch(page).first()).toHaveAttribute('aria-checked', 'true');
		// Auto sync defaults to on with nothing written yet (`probe-3.log` R5 atLoad: storage `null`)
		expect(await storageValue(page, 'conf-is-data-sync')).toBeNull();

		// the two settings reads of this page, as members of a set: a dev-mode mount asks twice
		const reads = new Set(
			served.readsOf(LANGUAGES_PATH).map((call) => `${call.method} ${call.path}${call.search}`)
		);
		const profileReads = new Set(
			served.calls
				.filter((call) => call.path === USER_ME_PATH)
				.map((call) => `${call.method} ${call.path}${call.search}`)
		);
		report('1 reads', {
			languages: [...reads].sort(),
			userMe: [...profileReads].sort(),
			writes: served.profileWrites().length
		});
		expect([...reads]).toEqual([`GET ${LANGUAGES_PATH}?is_system=true`]);
		expect([...profileReads]).toEqual([
			`GET ${USER_ME_PATH}?relations%5B0%5D=role&relations%5B1%5D=tenant&includeEmployee=true`
		]);
		expect(served.profileWrites()).toEqual([]);

		expect(shield.externalCalls(), 'the page reached outside the lane').toEqual([]);
		expect(consoleFindings(shield), 'the page printed a console error').toEqual([]);
	});

	test('2 theme tiles: what <html> shows, what the browser stores, and what a reload keeps', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);

		const pickTheme = async (label: string, value: string) => {
			await themeGroup(page).locator('label').filter({ hasText: label }).first().click({ timeout: 15_000 });
			await expect.poll(() => storageValue(page, 'theme'), { timeout: 10_000 }).toBe(value);
		};

		// nothing chosen yet: the tiles show `system` picked and store nothing (`probe-3.log` R1 atLoad)
		expect(await storageValue(page, 'theme')).toBeNull();
		expect(await pickedValues(page, themeGroup(page))).toEqual(['system']);

		const seen: Record<string, unknown> = {};
		await pickTheme(EN.common.THEME_DARK, 'dark');
		seen.dark = await htmlTheme(page);
		expect(await pickedValues(page, themeGroup(page))).toEqual(['dark']);
		await expect(themeGroup(page).getByText(SELECTED)).toHaveCount(1);

		await pickTheme(EN.common.THEME_LIGHT, 'light');
		seen.light = await htmlTheme(page);
		expect(await pickedValues(page, themeGroup(page))).toEqual(['light']);

		await pickTheme(T.THEME_SYSTEM, 'system');
		seen.system = await htmlTheme(page);
		// `system` follows this browser's own preference, read in the page — never assumed
		const { prefersDark } = await browserZoneOf(page);
		seen.prefersDark = prefersDark;

		await pickTheme(EN.common.THEME_DARK, 'dark');
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		seen.afterReload = await htmlTheme(page);
		expect(await storageValue(page, 'theme')).toBe('dark');
		report('2 theme', seen);

		// `next-themes` writes the class the page was rendered with and the matching `color-scheme`
		expect(seen.dark).toMatchObject({ htmlColorScheme: 'dark' });
		expect(String((seen.dark as { htmlClass: string }).htmlClass)).toContain('dark');
		expect(seen.light).toMatchObject({ htmlColorScheme: 'light' });
		expect(String((seen.light as { htmlClass: string }).htmlClass)).toContain('light');
		expect(seen.system).toMatchObject({ htmlColorScheme: prefersDark ? 'dark' : 'light' });
		expect(seen.afterReload).toMatchObject({ theme: 'dark', htmlColorScheme: 'dark' });

		expect(consoleFindings(shield), 'the theme tiles printed a console error').toEqual([]);
	});

	test('3 app switcher tiles: the three placements, where the shell puts the switcher, a reload', async ({
		fixture,
		page,
		shield
	}) => {
		// the section exists only when the runtime env names other Ever apps (`preferences-settings-page.tsx:30-39`);
		// the link points at this lane's own mock, so the shield still sees nothing outside it
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_EVER_APP_LINKS: `gauzy=${MOCK_ORIGIN}` });
		const profileZone = await profileZoneFor(page);
		await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);

		await expect(switcherGroup(page)).toHaveCount(1);
		await expect(switcherGroup(page).locator('label')).toHaveCount(3);

		const switcherButton = page.getByRole('button', { name: EN.switchers.SWITCH_APP });
		const railNav = page.getByRole('navigation', { name: EN.switchers.EVER_APPS });
		// the wording sits in the link's `aria-label` (`app-rail.tsx:86-98`), not in its text
		const railLink = page.getByRole('link', { name: asPattern(EN.switchers.OPENS_IN_NEW_TAB) });
		const seen: Record<string, unknown> = {};

		const pickPlacement = async (label: string, value: string) => {
			await switcherGroup(page).locator('label').filter({ hasText: label }).first().click({ timeout: 15_000 });
			// `atomWithStorage` stores the JSON-quoted value (`core/stores/common/app-switcher.ts:13-20`)
			await expect
				.poll(() => storageValue(page, 'app-switcher-placement'), { timeout: 10_000 })
				.toBe(JSON.stringify(value));
		};

		// with nothing stored the switcher sits in the sidebar, and there is no left rail yet
		expect(await storageValue(page, 'app-switcher-placement')).toBeNull();
		await expect(switcherButton).toHaveCount(1);
		await expect(page.locator('header').getByRole('button', { name: EN.switchers.SWITCH_APP })).toHaveCount(0);
		await expect(railNav).toHaveCount(0);

		await pickPlacement(T.APP_SWITCHER_RAIL, 'rail');
		seen.rail = {
			buttons: await switcherButton.count(),
			railNav: await railNav.count(),
			railLink: await railLink.count()
		};
		await expect(railNav).toHaveCount(1);
		await expect(railLink).toHaveCount(1);
		await expect(switcherButton).toHaveCount(0);

		await pickPlacement(T.APP_SWITCHER_HEADER, 'header');
		seen.header = {
			inHeader: await page.locator('header').getByRole('button', { name: EN.switchers.SWITCH_APP }).count(),
			railNav: await railNav.count()
		};
		await expect(page.locator('header').getByRole('button', { name: EN.switchers.SWITCH_APP })).toHaveCount(1);
		await expect(railNav).toHaveCount(0);

		await pickPlacement(T.APP_SWITCHER_SIDEBAR, 'sidebar');
		seen.sidebar = {
			buttons: await switcherButton.count(),
			inHeader: await page.locator('header').getByRole('button', { name: EN.switchers.SWITCH_APP }).count(),
			railNav: await railNav.count()
		};
		await expect(switcherButton).toHaveCount(1);
		await expect(page.locator('header').getByRole('button', { name: EN.switchers.SWITCH_APP })).toHaveCount(0);
		await expect(railNav).toHaveCount(0);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		seen.afterReload = {
			storage: await storageValue(page, 'app-switcher-placement'),
			buttons: await switcherButton.count()
		};
		report('3 app switcher', seen);

		expect(await storageValue(page, 'app-switcher-placement')).toBe(JSON.stringify('sidebar'));
		await expect(switcherButton).toHaveCount(1);

		expect(shield.externalCalls(), 'the switcher reached outside the lane').toEqual([]);
		expect(consoleFindings(shield), 'the switcher tiles printed a console error').toEqual([]);
	});

	test('4 language: the served list, the pick, the write it sends, the page after, a reload', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone, preferredLanguage: 'en' }),
			languages: [
				{ code: 'en', name: 'English' },
				{ code: 'fr', name: 'Français' },
				{ code: 'de', name: 'Deutsch' },
				// a code the app does not offer: `filterLanguagesByCode` (`use-language-settings.ts:29-34`) drops it
				{ code: 'xx', name: 'NotOffered' }
			]
		});
		await openPreferences(page, fixture);

		await expect.poll(() => served.readsOf(LANGUAGES_PATH).length, { timeout: 20_000 }).toBeGreaterThan(0);
		await expect(languageTrigger(page)).toHaveText('English');

		await languageTrigger(page).click({ timeout: 15_000 });
		await expect.poll(() => selectItems(page).count(), { timeout: 15_000 }).toBeGreaterThan(0);
		// three offered codes: `NotOffered` never reaches the picker
		await expect(selectItems(page)).toHaveText(['English', 'Français', 'Deutsch']);
		await selectItems(page).filter({ hasText: 'Français' }).first().click({ timeout: 15_000 });

		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		// a page that polls: take the write, never `calls[0]`
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		const body = JSON.parse(String(write?.body)) as Record<string, unknown>;
		report('4 language write', { body });
		// only these four fields, exactly as `probe-3.log` R2 printed them
		expect(Object.keys(body).sort()).toEqual(['id', 'organizationId', 'preferredLanguage', 'tenantId']);
		expect(body).toMatchObject({ preferredLanguage: 'fr', id: fixture.ids.user, tenantId: fixture.ids.tenantA });
		expect(served.store.profile.preferredLanguage).toBe('fr');

		await expect.poll(() => page.url(), { timeout: 25_000 }).toContain(`/fr${PREFERENCES_PATH}`);
		const afterPick = Object.fromEntries(await cookiePairs(page));
		report('4 after pick', { url: page.url(), cookies: afterPick });
		expect(afterPick['auth-active-language']).toBe('fr');
		expect(afterPick['NEXT_LOCALE']).toBe('fr');
		// the app's own stored language follows the account's: `changeLanguage` writes it (`use-language.ts:24-28`) and the
		// user query re-applies the account's value (`use-user-language-preference.ts:14-21`), so wait for it to settle
		await expect.poll(() => storageValue(page, 'preferredLanguage'), { timeout: 20_000 }).toBe('fr');

		// the page itself moved to French (`language-row.tsx` shows the routing locale, `use-preferred-language.ts:50`)
		await expect(headings(page)).toHaveText([
			FR.settings.entries.preferences.TITLE,
			FR.settings.preferences.SECTION_THEME,
			FR.settings.preferences.SECTION_REGION,
			FR.settings.preferences.SECTION_SYNC
		]);
		await expect(page.locator('[data-slot=select-trigger]').first()).toHaveText('Français');

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		// a plain string matcher: nothing to await here
		expect(page.url()).toContain(`/fr${PREFERENCES_PATH}`);
		await expect(page.locator('[data-slot=select-trigger]').first()).toHaveText('Français');
		await expect(headings(page)).toHaveText([
			FR.settings.entries.preferences.TITLE,
			FR.settings.preferences.SECTION_THEME,
			FR.settings.preferences.SECTION_REGION,
			FR.settings.preferences.SECTION_SYNC
		]);

		// and the routing cookie carries the language to the next visit (`probe-3.log` R2: `/` became `/fr`)
		await page.goto(`${APP_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
		await expect.poll(() => page.url(), { timeout: 25_000 }).toBe(`${APP_ORIGIN}/fr`);

		expect(
			consoleFindings(shield, [REACT_SCRIPT_TAG_WARNING]),
			'the language pick printed a console error'
		).toEqual([]);
	});

	test('5 a refused language save (500): the page moves to the picked language, the account does not', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone, preferredLanguage: 'en' }),
			languages: [
				{ code: 'en', name: 'English' },
				{ code: 'fr', name: 'Français' }
			],
			updateFails: 500
		});
		await openPreferences(page, fixture);
		await expect.poll(() => served.readsOf(LANGUAGES_PATH).length, { timeout: 20_000 }).toBeGreaterThan(0);

		/**
		 * Every main-frame URL from here on, so "did the page move" is a recorded history and not one read. The recorder
		 * goes in once the page is already open: the history therefore covers the pick and everything after it, and never
		 * the load that got here (`probe-12.log` C3 recorded exactly one main-frame URL the same way).
		 */
		const frameUrls: string[] = [];
		page.on('framenavigated', (frame) => {
			if (frame !== page.mainFrame()) {
				return;
			}
			frameUrls.push(frame.url());
		});

		await languageTrigger(page).click({ timeout: 15_000 });
		await expect.poll(() => selectItems(page).count(), { timeout: 15_000 }).toBeGreaterThan(0);
		await selectItems(page).filter({ hasText: 'Français' }).first().click({ timeout: 15_000 });
		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		expect(JSON.parse(String(write?.body))).toMatchObject({ preferredLanguage: 'fr' });

		// the write was sent and refused: what the profile holds is still English
		expect(served.store.profile.preferredLanguage).toBe('en');

		await expect
			.poll(() => cookiePairs(page))
			.toEqual([
				['NEXT_LOCALE', 'fr'],
				['auth-active-language', 'fr']
			]);

		// the page moved anyway: `router.replace` runs whatever the account answered (`use-preferred-language.ts:34-38`),
		// and every main-frame URL recorded after the pick was the French page (`probe-12.log` C3, `probe-11.log` C1)
		const movedTo = `/fr${PREFERENCES_PATH}`;
		await expect.poll(() => page.url(), { timeout: 25_000 }).toContain(movedTo);
		report('5 navigations after the refused save', {
			frameUrls,
			allFrench: frameUrls.every((url) => url.includes(movedTo))
		});
		expect(frameUrls.length, 'the refused save never moved the page').toBeGreaterThan(0);
		expect(
			frameUrls.every((url) => url.includes(movedTo)),
			'the refused save moved the page somewhere other than the picked language'
		).toBe(true);
		await expect(headings(page)).toHaveText([
			FR.settings.entries.preferences.TITLE,
			FR.settings.preferences.SECTION_THEME,
			FR.settings.preferences.SECTION_REGION,
			FR.settings.preferences.SECTION_SYNC
		]);
		await expect(page.locator('[data-slot=select-trigger]').first()).toHaveText('Français');

		// the fallback toast for a mutation nobody handled (`mutation-error-toaster.tsx:49-53`)
		await expect(page.getByText(MUTATION_FAILED, { exact: true })).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(EN.toasts.REASONS.SERVER)).toBeVisible();
		report('5 refused language save', {
			url: page.url(),
			cookies: Object.fromEntries(await cookiePairs(page)),
			storeLanguage: served.store.profile.preferredLanguage,
			storageLanguage: await storageValue(page, 'preferredLanguage'),
			toasts: await toasts(page).allInnerTexts()
		});
		await dismissToasts(page);

		// the account wins the browser's own stored language once the user query settles: it re-applies
		// `preferredLanguage` (`core/hooks/common/use-user-language-preference.ts:14-21`) through `changeLanguage`, which
		// writes it to `localStorage` (`core/hooks/common/use-language.ts:24-28`). Measured settling to the account's 'en'
		// in `probe-11.log` C1 and `probe-12.log` C3, after `changeLanguage('fr')` had written 'fr' first.
		await expect.poll(() => storageValue(page, 'preferredLanguage'), { timeout: 25_000 }).toBe('en');

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		// the routing cookie decided the language of the next load, the profile did not
		await expect.poll(() => page.url(), { timeout: 25_000 }).toContain(movedTo);
		await expect(page.locator('[data-slot=select-trigger]').first()).toHaveText('Français');
		await expect(headings(page)).toHaveText([
			FR.settings.entries.preferences.TITLE,
			FR.settings.preferences.SECTION_THEME,
			FR.settings.preferences.SECTION_REGION,
			FR.settings.preferences.SECTION_SYNC
		]);
		expect(served.store.profile.preferredLanguage).toBe('en');
		expect(await storageValue(page, 'preferredLanguage')).toBe('en');
		report('5 after reload', {
			url: page.url(),
			storeLanguage: served.store.profile.preferredLanguage,
			storageLanguage: await storageValue(page, 'preferredLanguage')
		});

		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', `/user/${fixture.ids.user}`, 500),
				REACT_SCRIPT_TAG_WARNING,
				DEV_MUTATION_NOISE
			]),
			'the refused language save printed a console error nobody named'
		).toEqual([]);
	});

	test('6 time zone: the row, the picker, its search, a saved zone, the shell notice after', async ({
		fixture,
		page,
		shield
	}) => {
		// the profile's zone is a candidate this browser is not in, chosen for this run
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);

		const browser = await browserZoneOf(page);
		const profileLabel = zoneLabelOf(profileZone);
		const profileOffset = await offsetOfZone(page, profileZone);

		// the row names the profile's zone with the offset `utcOffsetOf` reads for it
		await expect(zoneTrigger(page)).toContainText(profileLabel);
		await expect(zoneTrigger(page)).toContainText(T.UTC_OFFSET.replace('{offset}', profileOffset));

		// the shell's notice is `timeZoneNotice.TITLE` with all four placeholders filled (`time-zone-notice.tsx:22-31`)
		report('6 notice at load', {
			profileZone,
			profileOffset,
			browserZone: browser.zone,
			browserOffset: browser.offset,
			noticeText: flat(await noticeLines(page).first().innerText())
		});
		await expect(noticeLines(page).first()).toHaveText(
			noticeTitleOf(profileLabel, profileOffset, browser.label, browser.offset)
		);
		await expect(noticeButtons(page)).toHaveText([
			NOTICE.KEEP.replace('{zone}', profileLabel),
			NOTICE.USE.replace('{zone}', browser.label)
		]);

		await openZonePicker(page);
		// the profile's own zone is the row the list marks (`time-zone-list.tsx:31-45`), and the offset the row prints is
		// the one the trigger prints
		const profileRow = requiredRow(await readZoneRow(page, profileZone), profileZone);
		expect(profileRow.offset, 'the picker and the trigger print different offsets for the same zone').toBe(
			profileOffset
		);
		await expect(profileRow.item).toHaveText(asPattern(`${profileRow.label}${profileRow.offsetText}${SELECTED}`));

		await page.getByPlaceholder(T.TIME_ZONE_SEARCH).fill('no-such-zone-9', { timeout: 15_000 });
		await expect(page.getByText(T.TIME_ZONE_EMPTY, { exact: true })).toHaveCount(1);

		// the zone this test saves: the next candidate the picker really lists, with its offset read from its own row
		const saved = await pickZoneRow(page, [profileZone]);
		await saved.item.click({ timeout: 15_000 });

		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		const body = JSON.parse(String(write?.body)) as Record<string, unknown>;
		report('6 zone write', { body, savedZone: saved.id, offsetFromPicker: saved.offset, rowText: saved.text });
		expect(Object.keys(body).sort()).toEqual(['id', 'organizationId', 'tenantId', 'timeZone']);
		expect(body).toMatchObject({ timeZone: saved.value, id: fixture.ids.user, tenantId: fixture.ids.tenantA });

		// the row, the announcement and the shell notice all move to the saved zone (`probe-7.log` S1, `probe-15.log` C5)
		await expect(zoneTrigger(page)).toContainText(saved.label);
		await expect(zoneTrigger(page)).toContainText(saved.offsetText);
		// `time-zone-row.tsx:33-37` announces the saved zone through `timeZoneLabelOf`
		await expect(liveStatus(page)).toHaveText(T.TIME_ZONE_SET.replace('{zone}', saved.label));
		await expect(noticeLines(page).first()).toHaveText(
			noticeTitleOf(saved.label, saved.offset, browser.label, browser.offset)
		);
		await expect(noticeButtons(page)).toHaveText([
			NOTICE.KEEP.replace('{zone}', saved.label),
			NOTICE.USE.replace('{zone}', browser.label)
		]);
		report('6 after the save', {
			rowText: flat(await zoneTrigger(page).innerText()),
			noticeText: flat(await noticeLines(page).first().innerText()),
			storeZone: served.store.profile.timeZone
		});
		expect(served.store.profile.timeZone).toBe(saved.value);

		expect(consoleFindings(shield, [REACT_SCRIPT_TAG_WARNING]), 'the zone save printed a console error').toEqual(
			[]
		);
	});

	test('7 a zone save refused with 400: the row and the profile keep the old zone', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }],
			updateFails: 400
		});
		await openPreferences(page, fixture);
		const browser = await browserZoneOf(page);
		const profileLabel = zoneLabelOf(profileZone);
		const profileOffset = await offsetOfZone(page, profileZone);

		await openZonePicker(page);
		const saved = await pickZoneRow(page, [profileZone]);
		await saved.item.click({ timeout: 15_000 });
		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		expect(JSON.parse(String(write?.body))).toMatchObject({ timeZone: saved.value });

		// the row's own failure toast (`time-zone-row.tsx:42-46`) plus the fallback for the failed mutation
		await expect(toasts(page).filter({ hasText: NOTICE.SAVE_FAILED })).toHaveCount(1, { timeout: 20_000 });
		await expect(toasts(page).filter({ hasText: MUTATION_FAILED })).toHaveCount(1);

		// nothing else moved: the row, the announcement, the notice and the profile all keep what the mock holds
		await expect(zoneTrigger(page)).toContainText(profileLabel);
		await expect(zoneTrigger(page)).toContainText(T.UTC_OFFSET.replace('{offset}', profileOffset));
		await expect(liveStatus(page)).toHaveText('');
		expect(served.store.profile.timeZone).toBe(profileZone);
		await expect(noticeLines(page).first()).toHaveText(
			noticeTitleOf(profileLabel, profileOffset, browser.label, browser.offset)
		);
		await expect(noticeButtons(page)).toHaveText([
			NOTICE.KEEP.replace('{zone}', profileLabel),
			NOTICE.USE.replace('{zone}', browser.label)
		]);
		report('7 refused zone save', {
			profileZone,
			savedZone: saved.id,
			zoneText: flat(await zoneTrigger(page).innerText()),
			noticeText: flat(await noticeLines(page).first().innerText()),
			storeZone: served.store.profile.timeZone,
			toasts: await toasts(page).allInnerTexts()
		});
		await dismissToasts(page);

		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', `/user/${fixture.ids.user}`, 400),
				REACT_SCRIPT_TAG_WARNING,
				DEV_MUTATION_NOISE
			]),
			'the refused zone save printed a console error nobody named'
		).toEqual([]);
	});

	test("8 the Detect button: this browser's own zone, written and adopted", async ({ fixture, page, shield }) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);
		// the zone is read in the page and never typed (`brief-common`: a machine's zone is not a pinned value)
		const { zone: browserZone, label: browserLabel } = await browserZoneOf(page);

		const detect = page.getByRole('button', { name: EN.common.DETECT, exact: true });
		await expect(detect).toHaveCount(1);
		await detect.click({ timeout: 15_000 });

		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		const body = JSON.parse(String(write?.body)) as Record<string, unknown>;
		report('8 detect write', { body, browserZone, profileZone });
		// `formatStoredTimeZone` writes the zone name untouched, then its offset (`settings-time-zone.ts:109-112`)
		expect(String(body.timeZone).startsWith(browserZone)).toBe(true);
		expect(Object.keys(body).sort()).toEqual(['id', 'organizationId', 'tenantId', 'timeZone']);

		await expect(zoneTrigger(page)).toContainText(browserLabel);
		await expect(liveStatus(page)).toHaveText(T.TIME_ZONE_SET.replace('{zone}', browserLabel));
		expect(served.store.profile.timeZone).toBe(body.timeZone);

		// profile and browser now agree, so the shell's notice has nothing left to offer (`probe-9.log` A1)
		await expect(noticeLines(page)).toHaveCount(0);
		await expect(noticeButtons(page)).toHaveCount(0);

		expect(
			consoleFindings(shield, [REACT_SCRIPT_TAG_WARNING]),
			'the Detect button printed a console error'
		).toEqual([]);
	});

	test('9 a profile save the API answered while keeping the old zone is not a save', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }],
			// 200 and the profile it already held: `use-time-zone-setting.ts:41-47` counts that as not saved
			updateKeepsOldProfile: true
		});
		await openPreferences(page, fixture);
		const profileLabel = zoneLabelOf(profileZone);
		const profileOffset = await offsetOfZone(page, profileZone);

		await openZonePicker(page);
		const saved = await pickZoneRow(page, [profileZone]);
		await saved.item.click({ timeout: 15_000 });
		await expect.poll(() => served.profileWrites().length, { timeout: 20_000 }).toBeGreaterThan(0);
		expect(JSON.parse(String(served.profileWrites().find((call) => call.method !== 'GET')?.body))).toMatchObject({
			timeZone: saved.value
		});

		// the row says it failed, and nothing else moved (`probe-9.log` A2, `probe-13.log` C6)
		await expect(toasts(page).filter({ hasText: NOTICE.SAVE_FAILED })).toHaveCount(1, { timeout: 20_000 });
		await expect(zoneTrigger(page)).toContainText(profileLabel);
		await expect(zoneTrigger(page)).toContainText(T.UTC_OFFSET.replace('{offset}', profileOffset));
		await expect(liveStatus(page)).toHaveText('');
		expect(served.store.profile.timeZone).toBe(profileZone);
		// no fallback toast for this one: the mutation answered 200, so nobody reached `onError`
		await expect(toasts(page).filter({ hasText: MUTATION_FAILED })).toHaveCount(0);
		report('9 kept the old profile', {
			profileZone,
			savedZone: saved.id,
			zoneText: flat(await zoneTrigger(page).innerText()),
			storeZone: served.store.profile.timeZone,
			toasts: await toasts(page).allInnerTexts()
		});
		await dismissToasts(page);

		expect(consoleFindings(shield, [REACT_SCRIPT_TAG_WARNING]), 'the kept profile printed a console error').toEqual(
			[]
		);
	});

	test('10 the languages read refused: the row says it failed, and its retry asks again', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languagesFails: 502
		});
		await openPreferences(page, fixture);

		const alert = page.locator('main [role=alert]');
		// the client retries a failed read on its own, so the row is judged once it settled (`probe-10.log` B1)
		await expect(page.getByText(T.LANGUAGE_LOAD_FAILED)).toHaveCount(1, { timeout: 30_000 });
		await expect(alert).toHaveCount(1);
		await expect(alert).toContainText(T.LANGUAGE_LOAD_FAILED);
		await expect(alert.getByRole('button', { name: EN.notifications.RETRY, exact: true })).toHaveCount(1);
		// no picker, and not the empty state either
		await expect(languageTrigger(page)).toHaveCount(0);
		await expect(page.locator('[data-slot=select-trigger]')).toHaveCount(0);
		await expect(page.getByText(T.LANGUAGE_EMPTY)).toHaveCount(0);

		const before = served.readsOf(LANGUAGES_PATH).length;
		await alert.getByRole('button', { name: EN.notifications.RETRY, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => served.readsOf(LANGUAGES_PATH).length, { timeout: 20_000 }).toBeGreaterThan(before);
		report('10 languages retry', {
			before,
			after: served.readsOf(LANGUAGES_PATH).length,
			// never an exact count of a read that failed: only that the row's own button asked again
			stillFailed: await page.getByText(T.LANGUAGE_LOAD_FAILED).count()
		});

		expect(
			consoleFindings(shield, [armedHttpError('GET', '/languages?is_system=true', 502)]),
			'the refused languages read printed a console error nobody named'
		).toEqual([]);
	});

	test("11 a profile with no zone: the page writes this browser's zone before anyone asks", async ({
		fixture,
		page,
		shield
	}) => {
		const served = await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: null }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);
		const { zone: browserZone } = await browserZoneOf(page);

		// `useFillMissingTimeZone` (`use-time-zone-setting.ts:84-99`, called by the page at `:15`) writes it unprompted
		await expect.poll(() => served.profileWrites().length, { timeout: 25_000 }).toBeGreaterThan(0);
		const write = served.profileWrites().find((call) => call.method !== 'GET');
		const body = JSON.parse(String(write?.body)) as Record<string, unknown>;
		report('11 fill write', { body, browserZone });
		expect(String(body.timeZone).startsWith(browserZone)).toBe(true);
		expect(Object.keys(body).sort()).toEqual(['id', 'organizationId', 'tenantId', 'timeZone']);
		expect(served.store.profile.timeZone).toBe(body.timeZone);

		await expect(zoneTrigger(page)).toContainText(zoneLabelOf(browserZone));
		// and the shell's offer for a profile without a zone never reaches this screen (`probe-3.log` R4: every count 0)
		await expect(noticeLines(page)).toHaveCount(0);
		await expect(noticeButtons(page)).toHaveCount(0);

		expect(consoleFindings(shield, [REACT_SCRIPT_TAG_WARNING]), 'the filled zone printed a console error').toEqual(
			[]
		);
	});

	test('12 auto sync: the switch, the modes it reveals, what is stored, and a reload', async ({
		fixture,
		page,
		shield
	}) => {
		const profileZone = await profileZoneFor(page);
		await servePreferences(page, {
			profile: profileOf(fixture.ids, fixture.names, { timeZone: profileZone }),
			languages: [{ code: 'en', name: 'English' }]
		});
		await openPreferences(page, fixture);

		/** The two mode radios' real state: they are `sr-only` inputs inside labels, so the DOM answers, not the pointer. */
		const modeInputs = (scope: Page) =>
			scope
				.locator('main input[type=radio][value=PULL], main input[type=radio][value=REAL_TIME]')
				.evaluateAll((nodes) =>
					nodes.map((node) => {
						const input = node as HTMLInputElement;
						return { value: input.value, checked: input.checked, disabled: input.disabled };
					})
				);

		await expect(syncSwitch(page)).toHaveAttribute('aria-checked', 'true');
		expect(await storageValue(page, 'conf-is-data-sync')).toBeNull();
		await expect(syncGroup(page)).toHaveCount(1);
		expect(await modeInputs(page)).toEqual([
			{ value: 'PULL', checked: true, disabled: false },
			{ value: 'REAL_TIME', checked: false, disabled: true }
		]);
		// the hint the fieldset points at with `aria-describedby` (`data-sync-section.tsx:24,52-54`)
		await expect(syncGroup(page).getByText(T.SYNC_MODE_HINT)).toHaveCount(1);

		await syncSwitch(page).click({ timeout: 15_000 });
		await expect.poll(() => storageValue(page, 'conf-is-data-sync'), { timeout: 10_000 }).toBe('false');
		await expect(syncSwitch(page)).toHaveAttribute('aria-checked', 'false');
		// the modes are the switch's `revealed` body: off means they are gone, and no mode was ever stored
		await expect(syncGroup(page)).toHaveCount(0);
		expect(await modeInputs(page)).toEqual([]);
		expect(await storageValue(page, 'conf-data-sync-mode')).toBeNull();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(syncSwitch(page)).toHaveAttribute('aria-checked', 'false');
		expect(await storageValue(page, 'conf-is-data-sync')).toBe('false');
		report('12 auto sync', {
			storage: await storageValue(page, 'conf-is-data-sync'),
			checked: await syncSwitch(page).getAttribute('aria-checked')
		});

		await syncSwitch(page).click({ timeout: 15_000 });
		await expect.poll(() => storageValue(page, 'conf-is-data-sync'), { timeout: 10_000 }).toBe('true');
		await expect(syncGroup(page)).toHaveCount(1);
		expect(await modeInputs(page)).toEqual([
			{ value: 'PULL', checked: true, disabled: false },
			{ value: 'REAL_TIME', checked: false, disabled: true }
		]);

		expect(consoleFindings(shield), 'the auto sync switch printed a console error').toEqual([]);
	});
});
