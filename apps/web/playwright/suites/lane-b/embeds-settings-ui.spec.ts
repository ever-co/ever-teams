import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Settings › Workspace › Embeds**
 * (`/settings/workspace/embeds`, `app/[locale]/(main)/settings/workspace/embeds/page.tsx:1-5` →
 * `core/components/settings/pages/embeds/embeds-settings-page.tsx`), on lane-b (app `http://localhost:3032`, mock
 * `http://127.0.0.1:3996`, control `3998`, `playwright/test-servers.ts:39` `LANE_PORTS`).
 *
 * ## Where the numbers came from
 *
 * Every value pinned here was printed by a run first: the throwaway probe `E:\Coding\.tmp\probe-embeds\probe.spec.ts`,
 * run on this lane on 2026-11-25 — `probe-1.log` (28 cases, 18 passed: the add-site form and its nine refused values,
 * the person sign-in switch and its refused PATCH, removing a site, the revoke question and its refused DELETE, every
 * refused write, the two failing list reads and their retry, the credential whose option the API dropped, and the
 * dev-log bodies around a create), `probe-2.log` (the create dialog's fields, its empty-name refusal, the secret step
 * and its copy button, Escape and an outside click while the secret is shown, everything `Done` leaves behind, and the
 * refused site removal) and `probe-3.log` (the page as the lane serves it, the served lists with the copy each row
 * prints, and the config answered off / 500 / 404 / 403). Eight cases of `probe-1.log` failed on the probe's own bugs —
 * a Node helper called from inside a browser callback (`flat is not defined`, `probe-1.log:63`) and `locator('main')`
 * matching the shell's two `<main>` elements — and `probe-1.log:218` timed out on a Remove button that probe had not
 * armed a site for; all three are fixed in `probe-2.log` and `probe-3.log`, which is where those cases' numbers come
 * from. `E2E_REUSE_SERVERS=1` appears in the run command and is not needed by this file: it starts no server.
 *
 * The whole file was then run on the lane seven times: `s3-lane-b-embeds-1.log` … `-4.log` found four pins this file
 * now states as measured — a 403 config read arriving twice as well as once (`s3-lane-b-embeds-2.log`), the site field
 * keeping `aria-invalid="false"` under a 403 or a 500 (`-2.log`), the name refusal coming back off as soon as a name is
 * typed (`-3.log`), and the create dialog's combobox and checkbox having to be read while its dialog is still open
 * (`-4.log`) — and `s3-lane-b-embeds-5.log` and `s3-lane-b-embeds-6.log` are the two consecutive whole-file runs
 * (21 tests, **21 passed** each) this file was accepted on, with `s3-lane-b-embeds-7.log` confirming the finished
 * header. Every value pinned below is printed by a `MEASURE` line in those logs.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own mock answers exactly three routes of this page — `GET /api/embed-credentials/config` →
 * `{ enabled: true, clientLimits: false, addMembers: false }` and both lists → `[]`
 * (`cypress/support/mock-gauzy-server.mjs:850-855`). Test 1 runs on those alone and pins them, including what that
 * config does **not** say: `personSignIn` is optional (`core/types/schemas/embeds/embed.schema.ts:17`) and absent
 * here, so `canAllowPersonSignInOf` (`core/hooks/settings/use-embeds.ts:93-98`) is false and the timer-code section is
 * not drawn at all (`embeds-settings-page.tsx:517`). The mock has no handler for any write of this page: an
 * `POST /api/embed-allowed-origins` there would be echoed the body it was sent (`:894`), which has no `id` and fails
 * `embedAllowedOriginSchema` (`embed.schema.ts:24-30`), and a `POST /api/embed-credentials` the same way, which has no
 * `id`, no `prefix` and no `secret` and fails `createdEmbedCredentialSchema` (`:55-57`). The NextAuth stub of the
 * fixture and the app's own shell are the lane's, as in every lane-b file.
 *
 * **Served by this file:** everything else, with `page.route` on the mock origin (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`): the config answered every other way, both lists, the
 * clients the credential dialog names (`GET /api/organization-contact/pagination`, which the mock would answer with
 * its catch-all `pagination([])` at `:895`), the add / change / remove answers for a site, the create answer (only it
 * carries a secret) and every revoke answer. Each served answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`), because the page sits on `localhost:3032` and
 * the API on `127.0.0.1:3996`; `route.fetch()` is never called, so `mock.calls('embed')` is empty in every stubbed
 * test — the witness that the page acted on this file and not on the mock. The store behind it answers a list from its
 * current state, so "the row is gone" can be told apart from "the server still lists it", and a refused write changes
 * nothing in it.
 *
 * **The browser talks to the mock, never to the app's own route twins** — the lane's wiring, as spelled out in
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:50-57`. Every call this file measured went to
 * `http://127.0.0.1:3996/api/...` (`probe-3.log` P1, `probe-1.log` P9 and P15); `app/api/embed-credentials/**` is not
 * in this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/embeds/embeds-settings-page.tsx`: the availability decides the whole body —
 *   skeleton `:505-509`, `AVAILABILITY_FAILED_TITLE` + `LIST_FAILED_TEXT` + `RETRY` when the question failed,
 *   `ADMINS_ONLY_TITLE` + `ADMINS_ONLY_TEXT` for a 403, `UNAVAILABLE_TITLE` + `UNAVAILABLE_TEXT` when it says off
 *   (`:459-487`), and only on `enabled` the two sections with the timer-code section between them (`:514-520`).
 *   Allowed sites: the add form `:72-141` (its `isOriginLike` gate `:80-88`, its note `:90-94`, its `Notice` `:138`),
 *   the loading skeleton `:266`, the list-failure `ListFailed` `:47-61` and `:267`, `NO_ORIGINS` `:268`, one `OriginRow`
 *   per site in served order `:269-280` (`:178-218`: the origin as a `title`, `ADDED_ON` `:189-192`, the switch only
 *   when the server offers it `:147-176`, and `REMOVE`), and the removal question `:281-290`. Credentials: the section
 *   action disabled while its list is not ready `:420`, `NO_CREDENTIALS` `:428`, one `CredentialRow` `:320-363` (prefix,
 *   the client fact `:299-312`, `ADDS_MEMBERS` `:328-330`, `CREATED_ON` `:331-333` and the last use `:334-338`), the
 *   create dialog `:436-441` and the revoke question `:442-451`.
 * - `core/hooks/settings/use-embeds.ts`: `embedsAvailabilityOf` `:39-65` (a 404 is off, a 403 is not an administrator,
 *   any other failure is the error state), `canLimitToClientOf` / `canAllowAddMembersOf` / `canAllowPersonSignInOf`
 *   `:71-98`, `shouldRetry` `:101-108` (a 4xx is not retried, a 5xx at most twice), the config read `:136-150` (shared
 *   with the settings sidebar, `core/hooks/settings/use-hidden-settings-entries.ts:76-80`), the two lists `:163-194`,
 *   and the four mutations `:197-323` — the add `:197-206`, the optimistic switch with its rollback `:250-281`, the
 *   removal and the revoke, each `handlesOwnError` so the global fallback toast stays quiet
 *   (`core/components/common/mutation-error-toaster.tsx:22-30`), and the create `:290-308`.
 * - `core/services/client/api/embeds/embeds.service.ts`: `readConfig` `:81-84`, `listOrigins` `:86-89` and
 *   `listCredentials` `:111-116` (each `?organizationId=<the active organization>`, `:73-75`), `addOrigin` `:92-95`
 *   (the origin sent **trimmed**, with `organizationId`), `setPersonSignIn` `:101-105`, `removeOrigin` `:107-109`,
 *   `credentialBody` `:122-131` (name trimmed; `organizationContactId` and `canAddMembers` only when asked for) and
 *   `createCredential` `:141-161` (`:143` posts with `{ secretResponse: true }`, and a credential that comes back
 *   without the client or the members option it was asked for is revoked at once and the call throws
 *   `EmbedClientNotLimitedError` `:31-36` / `EmbedMembersNotAddedError` `:44-56`), `revokeCredential` `:190-192`.
 *   `core/services/client/api.service.ts:400-417` is what that flag buys: the answer is logged with `data:
 *   '[not logged]'` instead of its body.
 * - `core/components/settings/pages/embeds/create-embed-credential-dialog.tsx`: the form `:238-281` (name `Input` with
 *   `maxLength={EMBED_CREDENTIAL_NAME_MAX_LENGTH}` `:246-257` and its note `:258-260`, judged on submit only
 *   `:209-222`, the client field only when the server can limit `:202` and `:262`, the members checkbox only when the
 *   server can let it `:205` and `:265-267`, the failure `Notice` `:268` over `createFailureOf` `:173-178`);
 *   `CreatedCredentialStep` `:284-303` (`SECRET_TITLE`, `SECRET_TEXT` with the name, `ApiTokenSecret` and
 *   `SECRET_SERVER_ONLY`, `DONE` as the only way out); the dialog props `:340-347` (`keepOpenOnOutsideClick`,
 *   `dismissible={!isSecretShown && !isCreating}`) and `close()` `:331-338`, which forgets the answer. The secret field
 *   itself is the API tokens one: `core/components/settings/pages/api-tokens/api-token-secret.tsx:95-116`, so its
 *   label, its copy button and its status line read `settings.apiTokens.*`.
 * - `core/components/settings/pages/embeds/embed-timer-code-section.tsx` `:32-98`: the snippet is
 *   `embedTimerCodeOf({ apiUrl: embedApiUrlOf(publicApiOriginOrPlaceholder()), organizationId, appUrl })`
 *   (`core/lib/utils/embed-timer-code.ts:31-49`, `core/lib/utils/public-api-origin.ts:9-11`), which on this lane is
 *   the mock's own origin and this app's own address; the copy button keeps its name and the copy is said in an
 *   `<output>` beside it (`:63-94`).
 * - The settings sidebar's own read of the same switch: `use-hidden-settings-entries.ts:27-29` (`embeds` is hidden
 *   unless the availability is `enabled`) and entry `core/components/settings/kit/settings-entries.ts:74-75`.
 *
 * ## What the probe measured, per case (the assertions are pinned on these)
 *
 * - **The lane as it is** (P1, `probe-3.log`): the mock logged `GET /api/embed-credentials/config 200`,
 *   `GET /api/embed-allowed-origins 200` and `GET /api/embed-credentials 200`; the browser's own three calls were the
 *   config with no query and both lists with `?organizationId=22222222-2222-4222-8222-111111111111` (the fixture's
 *   organization); the page read `Embeds … Allowed sites … Site Add site For example https://app.example.com, with no
 *   path. No site may embed your timer yet.` and `Credentials … Create credential No credential yet.`; there were **0**
 *   switches and **no** `#embed-timer-code` section.
 * - **Config off** (P4): `Embeds are off on this server / The server administrator turns them on with the
 *   GAUZY_EMBED_TOKENS_ENABLED setting.`, **no** `#embed-origins`, no `#embed-credentials`, no `#embed-timer-code`, and
 *   exactly **one** call in total (`GET …/config`) — neither list was read. **A 404** (P6) draws that same pair of
 *   sentences and also reads the config once; **a 403** (P7) draws `For workspace administrators / Only an
 *   administrator of this organization can manage the sites and credentials that embed its timer.`. How often the config
 *   itself is asked under a refusal is **not** pinned — 1 read in `probe-3.log` P6 and P7 and in
 *   `s3-lane-b-embeds-5.log` and `-6.log`, 2 in `s3-lane-b-embeds-2.log` — while neither list is ever read; what test 4
 *   pins is that nothing **but** the config was read.
 *   **A 500** (P5) draws `Embeds could not be checked` with `Check your connection and try again.` and a `Try again`
 *   button, with no list read; the probe counted 3 config attempts (`:101-108` retries a 5xx while
 *   `failureCount < 2`), so the count of a *failed* read is not pinned, as in
 *   `suites/lane-a/api-tokens-settings-ui.spec.ts:116-120`.
 * - **A served list of two sites and three credentials** (P8): the sites came back in served order —
 *   `https://a.example.com` with `Added on Nov 15, 2026` and its switch off, `https://b.example.com:8443` with no
 *   `Added on` line and its switch on (the dates are `Intl.DateTimeFormat('en', { dateStyle: 'medium' })` of the served
 *   ISO strings, `formatUserApiTokenDate`, `core/lib/utils/user-api-tokens.ts:89-95`); the credentials read
 *   `Credential A gze_aaaaaaaa · Created on Nov 20, 2026 · Last used on Nov 24, 2026`, `Credential B limited
 *   gze_bbbbbbbb · Time report limited to Probe Client One · Adds people · Created on Nov 22, 2026 · Never used` and
 *   `Credential C archived client gze_cccccccc · Time report limited to one client · Never used` — the client is named
 *   from the clients read (`GET /api/organization-contact/pagination?…&take=100&skip=1`, made because one credential
 *   names a client, `:378-379`), and an id the page cannot name is never shown (`:299-312`).
 * - **Adding a site** (P9): the field is `inputmode="url"`, `autocomplete="off"`, `spellcheck="false"`,
 *   `placeholder="https://app.example.com"`, `aria-describedby` set, `aria-invalid="false"` at rest and carries **no**
 *   `type` attribute; the ten typed values `''`, `' '`, `app.example.com`, `https://app.example.com/timer`,
 *   `https://*.example.com`, `https:app.example.com`, `ftp://app.example.com`, `?x=1`, `user:pass@` and a backslash
 *   path (`https://app.example.com\timer`, the nine of `probe-1.log` plus the one test 6 adds) each drew
 *   `Enter a site as https://host or https://host:port, with no path and no wildcard.`, set `aria-invalid="true"`, kept
 *   the rows untouched and sent **no** `POST` (`isOriginLike`, `embed.schema.ts:97-114`). A duplicate of an allowed
 *   site is *not* refused by the form (measured: the `POST` went out and the answer was added) — see Findings. The good
 *   value typed as `'  https://added.example.com  '` was posted trimmed, with `organizationId`, added a row and emptied
 *   the field. A site the server refuses is explained by the form only for a **400**: the note becomes
 *   `ORIGIN_INVALID` and the field gets `aria-invalid="true"`. Under a **403** or a **500** the field keeps
 *   `aria-invalid="false"`, the note stays the hint, and only the `ADD_ORIGIN_FAILED` Notice speaks (`:84-87`,
 *   `:90-94`, measured in `s3-lane-b-embeds-2.log` and `-5.log`).
 * - **The person sign-in switch** (P10, P11): the click sent `PATCH /api/embed-allowed-origins/switch-a` with
 *   `{"allowPersonSignIn":true}` and the switch stayed on through the re-read; a refused `PATCH` (403) put it back to
 *   `aria-checked="false"` and printed `The setting could not be saved, so it went back. Try again.`, once, with no
 *   fallback toast and with the site still listed.
 * - **Removing a site** (P12): the question read `Remove https://drop-site.example.com?` with `REMOVE_DESCRIPTION` and
 *   the buttons `Cancel` and `Remove`; a cancel sent **no** `DELETE` and both rows stayed; confirming sent
 *   `DELETE http://127.0.0.1:3996/api/embed-allowed-origins/drop-site` and read the list again.
 * - **The credential dialog** (P2, P3, P13): with the config's `clientLimits` and `addMembers` off the dialog offers
 *   **no** combobox and **no** checkbox; with both on it reads `New embed credential / Name / … / Client Whole
 *   workspace / … / Add the people signed in with this credential / …`, its name field is `maxlength="100"`,
 *   `autocomplete="off"`, `aria-describedby` set, carries no `type` attribute and no value; the combobox reads `Whole
 *   workspace` and its popup lists `Whole workspace` then the served clients; the checkbox is unticked. Submitting an
 *   empty name put `Give the credential a name.` where the hint was, set `aria-invalid="true"` and sent **no** `POST`;
 *   typing a name after that takes the refusal straight back off — the hint is back and `aria-invalid="false"`
 *   (`changeName`, `:233-236`, measured in `s3-lane-b-embeds-3.log`).
 * - **A create that succeeds** (P13): with the client chosen and the checkbox ticked the body was
 *   `{"name":…,"organizationId":…,"organizationContactId":"probe-client-1","canAddMembers":true}`; the dialog then read
 *   `Copy the credential now … Token Copy … Done` with a read-only field holding exactly the served secret (its length
 *   counted, never printed), one copy button, and `Done` as the only control. `Escape` and a click outside left the
 *   dialog and the secret on screen; `Done` closed it and the secret was in no input and nowhere in `body.innerHTML`,
 *   while the row `Created credential gze_created · Time report limited to Probe Client One · Adds people · Created on
 *   Nov 25, 2026 · Never used` stayed.
 * - **The secret and the dev log** (P14): the create answered `✅ Response: 201 POST /embed-credentials` with
 *   `details.data = "[not logged]"`, the request entry carried the body it sent (`name`, `organizationId`), and the
 *   secret appeared in none of the `POST /api/log` bodies.
 * - **Revoking a credential** (P15): the question `Revoke “Drop credential”?`, a cancel that sent nothing, and a
 *   confirm that sent `DELETE /api/embed-credentials/drop-cred`, read the list again and left one row.
 * - **Refused writes** (P16): a 400 on the add form drew its own `ORIGIN_INVALID` sentence and **no** `ADD_ORIGIN_FAILED`
 *   notice (`:90-95`), while a 403 or 500 drew `The site could not be added. Try again.`; a create refused at 400, 403
 *   or 500 left the form open with `The credential could not be created. Try again.` and no secret screen; a revoke
 *   refused at 403 or 500 left the question open with `The credential could not be revoked. Try again.` as its
 *   `role="alert"` and kept the row; a refused site removal left `The site could not be removed. Try again.` and kept
 *   the site. Every one of them sent its write exactly once, left the served store as it was, and raised no fallback
 *   toast.
 * - **A list read failing** (P17): a 502 on the sites list drew `This list could not be loaded` with `Check your
 *   connection and try again.` and one `Try again` button, while the credentials section kept its own empty state —
 *   and the other way round for the credentials list. A failed read is retried on its own (`:101-108`), so only the
 *   copy, the one retry control and the fact that `Try again` asks again are pinned, never a count.
 * - **The timer code** (P3): the `<code>` was exactly the script line plus the four attributes
 *   `api-url="http://127.0.0.1:3996/api"`, `sign-in="ever-teams"`, `organization="22222222-…-111111111111"`,
 *   `app-url="http://localhost:3032"`, with one button named `Copy the code`.
 * - **The API dropped the option it was asked for** (P18): a credential that came back without the client it was given
 *   showed `The credential could not be created. Try again.` and never its secret, and was revoked
 *   (`DELETE /api/embed-credentials/dropped-1`) followed by a config re-read; one that came back without `canAddMembers`
 *   showed its own sentence `The server could not let this credential add people, so it was revoked. …` and the same
 *   revoke and re-read.
 *
 * ## Findings
 *
 * - **The add form does not refuse a duplicate site; the platform is the one that does** (measured, a hardening idea,
 *   not a defect): `AddOriginForm.submit` (`embeds-settings-page.tsx:80-88`) only asks `isOriginLike`
 *   (`embed.schema.ts:97-114`), which is shape alone, so typing an origin the organization already allows passes the
 *   form and `POST`s it — measured in `probe-1.log` P9, where `https://dup.example.com` was sent once and the answer
 *   was listed beside its twin. What the form does when the platform refuses such a `POST` with a 400 is its own
 *   sentence: the note turns into `ORIGIN_INVALID` (`:90-94`, `refusedByPlatform`) and no `ADD_ORIGIN_FAILED` notice
 *   appears, which test 6 pins. No comment, type, unit test or copy states a different intent (`embeds-settings-page.test.tsx:272-285`
 *   pins only the path case), so this is written as what the form does.
 * - **A dropped option is reported as a plain create failure for the client, and only the members option has its own
 *   words** (measured, untagged): `createFailureOf` (`create-embed-credential-dialog.tsx:173-178`) names
 *   `EmbedMembersNotAddedError` and falls through to `CREATE_FAILED` for `EmbedClientNotLimitedError`, so the person
 *   who asked for one client and got the whole workspace reads `The credential could not be created. Try again.` and
 *   would try again as it was. The dialog's own comment at `:169-172` says only the members case gets "its own words",
 *   so this is what the code intends for one branch and what it does for the other; the unit tests pin both sentences
 *   (`create-embed-credential-dialog.test.tsx:341-359`) and never reach the client case, which the browser can.
 * - **A refused write is logged as a console error by the dev tools even though the page explains it** (dev-only, by
 *   design of those tools): `core/services/client/api.service.ts` `logError` prints
 *   `[ERROR] [HttpClient] HTTP Error: <verb> <path> <status>` for any non-2xx it was not told to expect, and
 *   `mutation-error-toaster.tsx:43-45` prints `Mutation failed: …` for *every* failed mutation before its
 *   `handlesOwnError` check at `:46`. Both are excluded from this file's console assertions by their exact text
 *   (`armedHttpError`, `DEV_MUTATION_NOISE`), printed in every `MEASURE` line, and every other console error still
 *   fails this file. The app's own fallback toast stayed silent in every refusal, which is also asserted. A **403** goes
 *   down the adapter's critical branch instead of that sentence —
 *   `[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - <verb> <path> - Permission Denied`
 *   (`core/services/logs/logger-adapter.service.ts:189-199`), which `armedHttpError` names too. The config read's
 *   **404** is the one refusal told to the client as expected (`embeds.service.ts` readConfig, `quietStatuses`): a
 *   server with embeds off is a supported one, so test 4 excuses no line for it.
 * - **A row's facts cannot be addressed one by one** (measured, no defect): every credential fact is drawn inside a span
 *   that also carries the `· ` beside it (`embeds-settings-page.tsx:349-354`), and a site's `ADDED_ON` line shares its
 *   element with the person sign-in switch (`:196-204`), so `getByText(<one fact>, { exact: true })` finds nothing on
 *   this page — the first run of test 5 failed exactly there (`s3-lane-b-embeds-2.log`). The rows' copy is therefore
 *   asserted out of each section's own flattened text (`sectionText` + `occurrences`), which pins the same sentences,
 *   the same dates and the same counts.
 * - **The settings sidebar's `Embeds` entry follows the same answer** (measured): the entry was there when the config
 *   said `enabled` (test 1, test 5) and gone for `enabled: false`, a 404 and a 403 (`use-hidden-settings-entries.ts:27-29`).
 *
 * ## What this file does not cover
 *
 * - Proxy mode: `app/api/embed-credentials/**` and `app/api/embed-allowed-origins/**` are not in this lane's browser
 *   path — see "Which layer is real".
 * - The server's own rules: no real Gauzy here, so the platform's normalizing of an origin, its refusal of a duplicate
 *   and its 30-second and one-minute cut-offs are *imitated* by this file's answers rather than measured.
 * - The site-side half of the platform (`POST /api/embed/authorize`, `GET /api/embed/grants`,
 *   `embeds.service.ts:169-187`): those are Settings › Security's pages, not this one, and this page never calls them.
 * - The credential dialog's client field beyond what the lane can show: a client that left the active ones stays
 *   chosen in sight (`:69-74`, `:200-205`), the loading and failed states of that read (`:49-60`) and the retry beside
 *   its note are pinned by `create-embed-credential-dialog.test.tsx:175-214`; test 9 reaches only the offered clients,
 *   the whole-workspace default and the refusal of an empty name.
 * - `ADD_MEMBERS_NOT_REVOKED` (`create-embed-credential-dialog.tsx:175`): it needs a create whose option was dropped
 *   **and** whose revocation failed; test 18 arms the revoked case, which is what a working server does.
 * - Which of `COPIED`/`COPY_DONE` or `COPY_FAILED` this Chrome grants for the two copy buttons: the counts are
 *   reported after each click, and only "no failure sentence" and "the button keeps its name" are pinned, as in
 *   `suites/lane-a/api-tokens-settings-ui.spec.ts:189-192`.
 * - A credential whose secret was already lost: reload cannot bring it back (`use-embeds.ts:295`, `gcTime: 0`), which
 *   test 10 asserts as the secret being absent from the DOM after `Done`, not as a reload study.
 *
 * ## Secrets
 *
 * The secrets this file serves are its own random values; they are never printed. Each place one is checked is compared
 * for equality or containment and reported as a boolean or a length, and `grep -c` of such a value in the run logs is
 * 0. The dev-log entries of a signed-in page carry that page's own `Authorization: Bearer …` (finding 8 of
 * `suites/lane-b/dev-log-route.spec.ts`), so this file reads only `details.data` out of them and never prints a
 * `details` object; the probe logs of this page were redacted for the same reason.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const EMBEDS_PATH = '/settings/workspace/embeds';
const CREDENTIALS_ROUTE = '/api/embed-credentials';
const CONFIG_ROUTE = '/api/embed-credentials/config';
const ORIGINS_ROUTE = '/api/embed-allowed-origins';
const CLIENTS_ROUTE = '/api/organization-contact/pagination';
/** `core/lib/utils/embed-timer-code.ts:9` — where the code expects the embed's own files. */
const EMBED_SCRIPT_PATH = '/ever-teams/ever-teams-embed.js';

/**
 * `locales/en.json` again: `settings.embeds` `:5839-5903`, `settings.entries.embeds.TITLE` `:4752`, and
 * `settings.apiTokens` `:5785-5838` for the secret field the credential dialog borrows.
 */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: {
		embeds: Record<string, string>;
		apiTokens: Record<string, string>;
		entries: { embeds: { TITLE: string } };
	};
	common: { CANCEL: string };
};
const T = EN.settings.embeds;
/** `ApiTokenSecret` (`api-token-secret.tsx:66`, `:84-101`) is drawn from the API tokens copy, in this page too. */
const SECRET_T = EN.settings.apiTokens;
const PAGE_TITLE = EN.settings.entries.embeds.TITLE; // Embeds
/** `UNAVAILABLE_TEXT` = "The server administrator turns them on with the {variable} setting." */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b embeds] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
/** How often a phrase appears in a section's own flattened text — how a row's copy is counted here. */
const occurrences = (value: string, phrase: string) => value.split(phrase).length - 1;
/** A served date at local noon, so a rendered `dateStyle: 'medium'` value cannot straddle midnight. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};
const shownDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));

/** `EmbedAllowedOrigin` (`embed.schema.ts:24-30`) and `EmbedCredential` (`:38-50`) as this file serves them. */
type ServedOrigin = {
	id: string;
	origin: string;
	allowPersonSignIn?: boolean | null;
	createdAt?: string | null;
};
type ServedCredential = {
	id: string;
	name: string;
	prefix: string;
	organizationContactId?: string | null;
	canAddMembers?: boolean | null;
	createdAt?: string | null;
	lastUsedAt?: string | null;
};
type ServedClient = { id: string; name: string };
type ServedConfig = { enabled: boolean; clientLimits?: boolean; addMembers?: boolean; personSignIn?: boolean };
type Refusal = { status: number; message: string };

type ServedCall = {
	method: string;
	path: string;
	query: string;
	body: string | null;
	url: string;
	/** The `content-type` the browser sent, recorded so a write can be shown to have been sent as JSON. */
	contentType: string | null;
};

/** What this file's fake server is asked to answer; a refusal never changes the store it holds. */
type ServedScript = {
	config?: ServedConfig;
	configRefusal?: Refusal;
	origins?: ServedOrigin[];
	credentials?: ServedCredential[];
	clients?: ServedClient[];
	originsListRefusal?: Refusal;
	credentialsListRefusal?: Refusal;
	addOrigin?: { origin?: ServedOrigin; refusal?: Refusal };
	patchOrigin?: { refusal?: Refusal };
	removeOrigin?: { refusal?: Refusal };
	create?: { credential?: ServedCredential & { secret: string }; refusal?: Refusal };
	revokeCredential?: { refusal?: Refusal };
};

type EmbedsHarness = {
	calls: ServedCall[];
	/** The sites and credentials this file's fake server holds; a write adds or removes one, a refusal neither. */
	origins: () => ServedOrigin[];
	credentials: () => ServedCredential[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	originPathOf: (id: string) => string;
	credentialPathOf: (id: string) => string;
};

/**
 * This file's stand-in for the embeds API, on the mock origin, because the mock has no handler for any of it (see the
 * header). Every list answer is the current store, so a write can be followed by the re-read the hooks ask for
 * (`use-embeds.ts:204`, `:219`, `:278`, `:305`, `:321`) — which is the only way "the row is gone" can be told apart
 * from "the server still lists it". `GET /api/embed-credentials/config` is answered here too, so a stubbed test never
 * mixes the mock's own answer with this file's.
 */
async function serveEmbeds(page: Page, initial: ServedScript): Promise<EmbedsHarness> {
	const store = {
		origins: [...(initial.origins ?? [])],
		credentials: [...(initial.credentials ?? [])]
	};
	const calls: ServedCall[] = [];
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname.startsWith(CREDENTIALS_ROUTE) ||
			url.pathname.startsWith(ORIGINS_ROUTE) ||
			url.pathname === CLIENTS_ROUTE);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		const pathname = url.pathname;
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({
			method,
			path: pathname,
			query: url.searchParams.toString(),
			body: request.postData(),
			url: request.url(),
			contentType: request.headers()['content-type'] ?? null
		});
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const refuse = (refusal: Refusal) =>
			answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
		const originId = pathname.startsWith(`${ORIGINS_ROUTE}/`)
			? decodeURIComponent(pathname.slice(ORIGINS_ROUTE.length + 1))
			: '';
		const credentialId =
			pathname.startsWith(`${CREDENTIALS_ROUTE}/`) && pathname !== CONFIG_ROUTE
				? decodeURIComponent(pathname.slice(CREDENTIALS_ROUTE.length + 1))
				: '';

		if (pathname === CONFIG_ROUTE) {
			if (initial.configRefusal) {
				return refuse(initial.configRefusal);
			}
			return answer(200, initial.config ?? { enabled: true, clientLimits: false, addMembers: false });
		}
		if (pathname === CLIENTS_ROUTE) {
			const items = initial.clients ?? [];
			return answer(200, { items, total: items.length });
		}
		if (pathname === ORIGINS_ROUTE && method === 'GET') {
			if (initial.originsListRefusal) {
				return refuse(initial.originsListRefusal);
			}
			return answer(200, store.origins);
		}
		if (pathname === ORIGINS_ROUTE && method === 'POST') {
			if (initial.addOrigin?.refusal) {
				return refuse(initial.addOrigin.refusal);
			}
			// What the service sends (`embeds.service.ts:93`): the trimmed origin and the organization it was asked of.
			const body = JSON.parse(String(request.postData())) as { origin: string; organizationId: string };
			const created: ServedOrigin = {
				id: initial.addOrigin?.origin?.id ?? `served-origin-${store.origins.length + 1}`,
				origin: body.origin,
				allowPersonSignIn: initial.addOrigin?.origin?.allowPersonSignIn ?? false,
				createdAt: initial.addOrigin?.origin?.createdAt ?? dayIso(0)
			};
			store.origins = [...store.origins, created];
			return answer(201, created);
		}
		if (originId && method === 'PATCH') {
			if (initial.patchOrigin?.refusal) {
				return refuse(initial.patchOrigin.refusal);
			}
			const body = JSON.parse(String(request.postData())) as { allowPersonSignIn: boolean };
			const kept = store.origins.find((row) => row.id === originId);
			const updated: ServedOrigin = {
				id: originId,
				origin: kept?.origin ?? '',
				allowPersonSignIn: body.allowPersonSignIn,
				createdAt: kept?.createdAt ?? null
			};
			store.origins = store.origins.map((row) => (row.id === originId ? updated : row));
			return answer(200, updated);
		}
		if (originId && method === 'DELETE') {
			if (initial.removeOrigin?.refusal) {
				return refuse(initial.removeOrigin.refusal);
			}
			store.origins = store.origins.filter((row) => row.id !== originId);
			return answer(204);
		}
		if (pathname === CREDENTIALS_ROUTE && method === 'GET') {
			if (initial.credentialsListRefusal) {
				return refuse(initial.credentialsListRefusal);
			}
			return answer(200, store.credentials);
		}
		if (pathname === CREDENTIALS_ROUTE && method === 'POST') {
			if (initial.create?.refusal) {
				return refuse(initial.create.refusal);
			}
			const body = JSON.parse(String(request.postData())) as {
				name: string;
				organizationId: string;
				organizationContactId?: string;
				canAddMembers?: boolean;
			};
			const created: ServedCredential & { secret: string } = initial.create?.credential ?? {
				id: `served-credential-${store.credentials.length + 1}`,
				name: body.name,
				prefix: 'gze_served1',
				organizationContactId: body.organizationContactId ?? null,
				canAddMembers: body.canAddMembers === true,
				createdAt: dayIso(0),
				lastUsedAt: null,
				secret: `gze_scratch_${Math.random().toString(36).slice(2, 18)}`
			};
			// Gauzy answers the secret this once and never lists it again (`embed.schema.ts:54-57`), so the store keeps
			// the credential without it — a store that kept it would put the secret into the re-read the dev log records.
			const { secret, ...listed } = created;
			void secret;
			store.credentials = [...store.credentials, listed];
			return answer(201, created);
		}
		if (credentialId && method === 'DELETE') {
			if (initial.revokeCredential?.refusal) {
				return refuse(initial.revokeCredential.refusal);
			}
			store.credentials = store.credentials.filter((row) => row.id !== credentialId);
			return answer(204);
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${pathname}` });
	});

	return {
		calls,
		origins: () => store.origins,
		credentials: () => store.credentials,
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		originPathOf: (id) => `${ORIGINS_ROUTE}/${id}`,
		credentialPathOf: (id) => `${CREDENTIALS_ROUTE}/${id}`
	};
}

/** Only records: what the browser really sent to the mock, for the test that runs with no stub at all. */
function recordMockCalls(page: Page) {
	const calls: ServedCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		const isEmbedCall =
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname.startsWith(CREDENTIALS_ROUTE) || url.pathname.startsWith(ORIGINS_ROUTE));
		if (isEmbedCall) {
			calls.push({
				method: request.method(),
				path: url.pathname,
				query: url.searchParams.toString(),
				body: request.postData(),
				url: request.url(),
				contentType: request.headers()['content-type'] ?? null
			});
		}
	});
	return {
		calls,
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`)
	};
}

/**
 * The page's own dev-log traffic: every `POST /api/log` body the app sent (copied from
 * `suites/lane-b/dev-log-route.spec.ts:806-857`, which is where those entries are pinned). `🚀 Request:` and
 * `✅ Response:` are `api.service.ts:387-395` and `:400-417`; the posting is `core/services/logs/logger-client.ts:41`.
 * Only `details.data` is ever read out of an entry, and only compared — the entry also carries the page's own bearer
 * token, which this file never prints.
 */
type LogPost = { message?: string; level?: string; details?: Record<string, unknown> };

function watchLog(page: Page) {
	const posts: LogPost[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (request.method() === 'POST' && url.origin === APP_ORIGIN && url.pathname === '/api/log') {
			try {
				posts.push(JSON.parse(String(request.postData())) as LogPost);
			} catch {
				posts.push({ message: `(unparseable body) ${String(request.postData()).slice(0, 120)}` });
			}
		}
	});
	const byPrefix = (prefix: string) => posts.filter((post) => String(post.message ?? '').startsWith(prefix));
	return {
		posts,
		requests: () => byPrefix('🚀 Request:'),
		responses: () => byPrefix('✅ Response:'),
		/** Consecutive quiet rounds, so a page that has not started yet is not mistaken for a settled one. */
		settle: async (quietRounds = 10, maxRounds = 48) => {
			let previous = -1;
			let quiet = 0;
			for (let attempt = 0; attempt < maxRounds && quiet < quietRounds; attempt += 1) {
				quiet = posts.length === previous ? quiet + 1 : 0;
				previous = posts.length;
				await page.waitForTimeout(250);
			}
		}
	};
}

const named = (fragment: string) => (post: LogPost) => String(post.message ?? '').includes(fragment);

/** React's dev-mode store warning, not this page's (see `security-two-factor-ui.spec.ts:226-233`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/**
 * The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`): the service path
 * **without** its `/api` prefix and **with** the query the client sent, as `suites/lane-b/time-import-settings-ui.spec.ts:539-545`
 * measured it for that page (`GET /timesheet/time-log/conflict?… 500`). A 403 goes down the adapter's critical branch
 * instead of that sentence (`core/services/logs/logger-adapter.service.ts:189-199`), named as
 * `suites/lane-b/task-property-settings-ui.spec.ts:751-753` names it.
 */
const armedHttpError = (verb: string, path: string, status: number) =>
	status === 403
		? `[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path.replace(/^\/api/, '')} - Permission Denied`
		: `[ERROR] [HttpClient] HTTP Error: ${verb} ${path.replace(/^\/api/, '')} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

const section = (page: Page, id: string) => page.locator(`#${id}`);
const text = (scope: Page | Locator, value: string) => scope.getByText(value, { exact: true });
const dialogOf = (page: Page) => page.getByRole('dialog');
/** The dev-only `DEV Query failed …` / `DEV Mutation failed …` toast of `dev-error-toaster.tsx:17-18`. */
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const createButton = (page: Page) => page.getByRole('button', { name: T.CREATE, exact: true });
const addSiteButton = (page: Page) => page.getByRole('button', { name: T.ADD_ORIGIN, exact: true });
const originField = (page: Page) => page.getByLabel(T.ORIGIN_LABEL, { exact: true });
const switches = (page: Page) => page.getByRole('switch');
/** The rows are addressed by the `title` each one carries (`embeds-settings-page.tsx:207`, `:343`). */
const titlesIn = async (page: Page, id: string) =>
	page.locator(`#${id} [title]`).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title') ?? ''));
const settingsNavEntry = (page: Page) =>
	page
		.getByRole('navigation', { name: 'Settings', exact: true })
		.getByRole('link', { name: PAGE_TITLE, exact: true });
const sectionText = async (page: Page, id: string) => {
	const locator = section(page, id);
	if ((await locator.count()) === 0) {
		return `<no #${id}>`;
	}
	return flat(await locator.innerText());
};

const openCreateDialog = async (page: Page) => {
	await createButton(page).first().click();
	const dialog = dialogOf(page);
	await expect(dialog, 'the create dialog never opened').toBeVisible();
	return dialog;
};
const submitIn = (dialog: Locator) => dialog.getByRole('button', { name: T.CREATE, exact: true });
const cancelIn = (dialog: Locator) => dialog.getByRole('button', { name: EN.common.CANCEL, exact: true });

test.describe('lane-b · Settings › Workspace › Embeds: what the page shows and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------- 1. the lane as it is: the mock's switch and its two empty lists

	test('1 · the mock has embeds on with no site and no credential: the two empty states, and who answered what', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const seen = recordMockCalls(page);
		const organizationId = fixture.ids.organizationA;
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		await expect(
			page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true }),
			'Settings > Embeds rendered no page title'
		).toBeVisible({ timeout: 25_000 });
		await expect(text(page, T.PAGE_DESCRIPTION)).toBeVisible();

		await expect(section(page, 'embed-origins')).toBeVisible();
		await expect(section(page, 'embed-credentials')).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: T.SECTION_ORIGINS, exact: true })).toHaveCount(1);
		await expect(page.getByRole('heading', { level: 2, name: T.SECTION_CREDENTIALS, exact: true })).toHaveCount(1);
		await expect(text(page, T.SECTION_ORIGINS_TEXT)).toBeVisible();
		await expect(text(page, T.SECTION_CREDENTIALS_TEXT)).toBeVisible();
		// mock-gauzy-server.mjs:853-855 answers both lists with [] -> EmptyList (embeds-settings-page.tsx:268, :428)
		await expect(text(page, T.NO_ORIGINS)).toBeVisible();
		await expect(text(page, T.NO_CREDENTIALS)).toBeVisible();
		await expect(originField(page)).toHaveCount(1);
		await expect(text(page, T.ORIGIN_HINT)).toBeVisible();
		await expect(addSiteButton(page)).toHaveCount(1);
		await expect(createButton(page)).toHaveCount(1);

		// the mock's config names no personSignIn (mock-gauzy-server.mjs:851), so the switches and the code section are off
		await expect(switches(page), 'the mock never said personSignIn, yet a switch was drawn').toHaveCount(0);
		await expect(
			section(page, 'embed-timer-code'),
			'a server that never said personSignIn drew its code section'
		).toHaveCount(0);
		await expect(text(page, T.UNAVAILABLE_TITLE), 'the mock says embeds are on').toHaveCount(0);
		await expect(text(page, T.ADMINS_ONLY_TITLE), 'the mock answers as an administrator').toHaveCount(0);

		await expect
			.poll(() => seen.shapes(), { timeout: 20_000 })
			.toEqual([
				`GET ${CONFIG_ROUTE}`,
				`GET ${ORIGINS_ROUTE}?organizationId=${organizationId}`,
				`GET ${CREDENTIALS_ROUTE}?organizationId=${organizationId}`
			]);
		const logged = await mock.calls('embed');
		expect(
			logged.map((request) => [request.method, request.path, request.status]),
			'the mock answered the switch and the two lists'
		).toEqual([
			['GET', CONFIG_ROUTE, 200],
			['GET', ORIGINS_ROUTE, 200],
			['GET', CREDENTIALS_ROUTE, 200]
		]);
		await expect(page.getByRole('navigation', { name: 'Settings', exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(settingsNavEntry(page), 'the sidebar hides Embeds only when the switch says no').toHaveCount(1);

		report('mock-as-it-is', {
			browserMockCalls: seen.shapes(),
			mockLogged: logged.map((request) => `${request.method} ${request.path} ${request.status}`),
			emptyOrigins: await text(page, T.NO_ORIGINS).count(),
			emptyCredentials: await text(page, T.NO_CREDENTIALS).count(),
			switches: await switches(page).count(),
			timerCodeSection: await section(page, 'embed-timer-code').count(),
			navEntry: await settingsNavEntry(page).count(),
			originsText: await sectionText(page, 'embed-origins'),
			credentialsText: await sectionText(page, 'embed-credentials'),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 2. the switch off, and the switch failing

	test('2 · the config says off: the administrator notice, no list read at all, and no entry in the sidebar', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveEmbeds(page, { config: { enabled: false } });
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		// availability 'disabled' -> Notice(UNAVAILABLE_TITLE) (embeds-settings-page.tsx:478-483)
		await expect(text(page, T.UNAVAILABLE_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(text(page, filled('UNAVAILABLE_TEXT', { variable: 'GAUZY_EMBED_TOKENS_ENABLED' }))).toBeVisible();
		await expect(section(page, 'embed-origins'), 'a server with embeds off drew the sites section').toHaveCount(0);
		await expect(
			section(page, 'embed-credentials'),
			'a server with embeds off drew the credentials section'
		).toHaveCount(0);
		await expect(section(page, 'embed-timer-code')).toHaveCount(0);
		await expect(createButton(page), 'Create was offered although embeds are off').toHaveCount(0);
		await expect(text(page, T.NO_ORIGINS), 'a server with embeds off showed an empty list').toHaveCount(0);

		// use-embeds.ts:163-194 are enabled only while availability is 'enabled': nothing but the config was read
		await page.waitForTimeout(2_000);
		expect(served.shapes(), 'the page read more than the config').toEqual([`GET ${CONFIG_ROUTE}`]);
		expect(served.countOf('GET', ORIGINS_ROUTE), 'a sites list was read although embeds are off').toBe(0);
		expect(served.countOf('GET', CREDENTIALS_ROUTE), 'a credentials list was read although embeds are off').toBe(0);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);
		await expect(page.getByRole('navigation', { name: 'Settings', exact: true })).toBeVisible({ timeout: 25_000 });
		await expect(settingsNavEntry(page), 'the sidebar still listed Embeds').toHaveCount(0);

		report('config-off', {
			calls: served.shapes(),
			mockLogged: (await mock.calls('embed')).length,
			noticeTitle: T.UNAVAILABLE_TITLE,
			sections: {
				origins: await section(page, 'embed-origins').count(),
				credentials: await section(page, 'embed-credentials').count(),
				timerCode: await section(page, 'embed-timer-code').count()
			},
			navEntry: await settingsNavEntry(page).count(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('3 · the config could not be read: the availability notice with a retry, and still no list read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const refusal = { status: 500, message: 'this file refused the config' };
		const served = await serveEmbeds(page, { configRefusal: refusal });
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		// availability 'error' -> Notice(AVAILABILITY_FAILED_TITLE + LIST_FAILED_TEXT + RETRY) (embeds-settings-page.tsx:461-471)
		await expect(text(page, T.AVAILABILITY_FAILED_TITLE)).toBeVisible({ timeout: 30_000 });
		await expect(text(page, T.LIST_FAILED_TEXT)).toBeVisible();
		await expect(
			page.getByRole('button', { name: T.RETRY, exact: true }),
			'the failed config offered no retry'
		).toHaveCount(1);
		await expect(
			section(page, 'embed-origins'),
			'the sites section was drawn against a config that never answered'
		).toHaveCount(0);
		await expect(section(page, 'embed-credentials')).toHaveCount(0);
		await expect(text(page, T.UNAVAILABLE_TITLE), 'a failed read was shown as embeds being off').toHaveCount(0);

		// A quiet window, not a wait for something: no list may be read while the availability is an error
		// (use-embeds.ts:163-194), and the only way to see that nothing was sent is to give it time to be sent.
		await page.waitForTimeout(2_000);
		expect(served.countOf('GET', ORIGINS_ROUTE), 'a sites list was read although the config never answered').toBe(
			0
		);
		expect(
			served.countOf('GET', CREDENTIALS_ROUTE),
			'a credentials list was read although the config never answered'
		).toBe(0);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('config-failed', {
			// not pinned: a failed read is retried while failureCount < 2 (use-embeds.ts:101-108)
			configReads: served.countOf('GET', CONFIG_ROUTE),
			listReads: served.countOf('GET', ORIGINS_ROUTE) + served.countOf('GET', CREDENTIALS_ROUTE),
			devToasts: (await devToasts(page).allInnerTexts()).length,
			consoleErrors: shield.consoleErrors()
		});
		// the client logs a status it was not told to expect (api.service.ts logError); only that line is excused
		expect(
			consoleFindings(shield, [armedHttpError('GET', '/embed-credentials/config', 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------- 4. a 404 and a 403, both read once

	for (const item of [
		{
			status: 404,
			label: 'no such routes',
			title: T.UNAVAILABLE_TITLE,
			description: filled('UNAVAILABLE_TEXT', { variable: 'GAUZY_EMBED_TOKENS_ENABLED' })
		},
		{
			status: 403,
			label: 'not an administrator',
			title: T.ADMINS_ONLY_TITLE,
			description: T.ADMINS_ONLY_TEXT
		}
	]) {
		test(`4 · a config answering ${item.status} (${item.label}): ${item.title}, and one read in total`, async ({
			page,
			fixture,
			mock,
			shield
		}) => {
			const served = await serveEmbeds(page, {
				configRefusal: { status: item.status, message: `this file answered ${item.status}` }
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);

			// embedsAvailabilityOf (use-embeds.ts:42-50): a 404 is 'disabled', a 403 is 'forbidden'
			await expect(text(page, item.title), `${item.label}: the page did not say what it means`).toBeVisible({
				timeout: 25_000
			});
			await expect(text(page, item.description)).toBeVisible();
			await expect(section(page, 'embed-origins')).toHaveCount(0);
			await expect(section(page, 'embed-credentials')).toHaveCount(0);
			await expect(
				page.getByRole('button', { name: T.RETRY, exact: true }),
				`${item.label}: a refusal offered a retry`
			).toHaveCount(0);

			// Nothing but the config was read: the two lists stay closed while the availability is a refusal
			// (use-embeds.ts:163-194). How often the config itself was asked is **not** pinned — a read that failed is
			// asked again by the hooks (`shouldRetry`, :101-108, and a remount is such a read), which is why this file
			// counts only successful reads, as `suites/lane-a/api-tokens-settings-ui.spec.ts:116-120`: a 404 came with
			// 1 read in `probe-3.log` P6 and in `s3-lane-b-embeds-1.log`, a 403 with 1 in `probe-3.log` P7 and with 2 in
			// `s3-lane-b-embeds-2.log`.
			await page.waitForTimeout(2_000);
			expect(
				served.calls.map((call) => `${call.method} ${call.path}`),
				`${item.label}: something other than the config was read`
			).toEqual(served.calls.map(() => `GET ${CONFIG_ROUTE}`));
			expect(
				served.countOf('GET', CONFIG_ROUTE),
				`${item.label}: the config was never read`
			).toBeGreaterThanOrEqual(1);
			expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);
			await expect(page.getByRole('navigation', { name: 'Settings', exact: true })).toBeVisible({
				timeout: 25_000
			});
			await expect(settingsNavEntry(page), `${item.label}: the sidebar still offered Embeds`).toHaveCount(0);

			report('config-refused', {
				status: item.status,
				label: item.label,
				calls: served.shapes(),
				noticeTitle: item.title,
				navEntry: await settingsNavEntry(page).count(),
				consoleErrors: shield.consoleErrors()
			});
			// A 404 is the answer of a server with embeds off, a supported one: the read keeps it out of the client's error
			// log (`embeds.service.ts` readConfig, `quietStatuses`), so nothing is excused for it. A 403 keeps its line.
			const excused = item.status === 404 ? [] : [armedHttpError('GET', '/embed-credentials/config', item.status)];
			expect(
				consoleFindings(shield, excused),
				`${item.label}: besides the HTTP error line it is allowed, the page logged a console error`
			).toEqual([]);
		});
	}

	// ---------------------------------- 5. served lists: rows, order, facts, the client named and the id not shown

	test('5 · a served list of two sites and three credentials: the rows in served order and what each one prints', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const organizationId = fixture.ids.organizationA;
		const tenantId = fixture.ids.tenantA;
		const siteAdded = {
			id: 'site-a',
			origin: 'https://a.example.com',
			allowPersonSignIn: false,
			createdAt: dayIso(-10)
		};
		const siteOn = { id: 'site-b', origin: 'https://b.example.com:8443', allowPersonSignIn: true, createdAt: null };
		const clientOne = { id: 'served-client-1', name: 'Probe Client One' };
		const plain = {
			id: 'cred-a',
			name: 'Credential A',
			prefix: 'gze_aaaaaaaa',
			createdAt: dayIso(-5),
			lastUsedAt: dayIso(-1)
		};
		const limited = {
			id: 'cred-b',
			name: 'Credential B limited',
			prefix: 'gze_bbbbbbbb',
			organizationContactId: clientOne.id,
			canAddMembers: true,
			createdAt: dayIso(-3),
			lastUsedAt: null
		};
		const unknownClient = {
			id: 'cred-c',
			name: 'Credential C archived client',
			prefix: 'gze_cccccccc',
			organizationContactId: 'served-client-gone'
		};
		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: true, addMembers: true, personSignIn: true },
			origins: [siteAdded, siteOn],
			credentials: [plain, limited, unknownClient],
			clients: [clientOne]
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		await expect(section(page, 'embed-origins')).toBeVisible({ timeout: 25_000 });
		// the rows come as the API listed them: origins.map (embeds-settings-page.tsx:271-278), no sorting of its own
		await expect
			.poll(() => titlesIn(page, 'embed-origins'), { timeout: 15_000 })
			.toEqual([siteAdded.origin, siteOn.origin]);
		await expect
			.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 15_000 })
			.toEqual([plain.name, limited.name, unknownClient.name]);

		// the switch on each site, off unless the site has it on (embeds-settings-page.tsx:161)
		await expect(switches(page)).toHaveCount(2);
		await expect
			.poll(() => switches(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-checked'))))
			.toEqual(['false', 'true']);
		await expect(text(page, T.PERSON_SIGN_IN)).toHaveCount(2);
		await expect(page.getByRole('button', { name: T.REMOVE, exact: true })).toHaveCount(2);
		// The rows' copy is read out of each section's own text: every fact sits in a span that also carries the `· `
		// beside it (`embeds-settings-page.tsx:196-204`, `:349-354`), so no element holds one fact on its own and an
		// exact `getByText` of a fact would find nothing.
		const originsText = await sectionText(page, 'embed-origins');
		expect(originsText, 'the site rows are not what probe-3.log P8 printed').toContain(
			`${siteAdded.origin} Added on ${shownDate(String(siteAdded.createdAt))} ${T.PERSON_SIGN_IN} ${T.REMOVE} ${siteOn.origin} ${T.PERSON_SIGN_IN} ${T.REMOVE}`
		);
		// siteOn carries createdAt: null, so only one row prints a date (:187-191)
		expect(occurrences(originsText, 'Added on'), 'a row with no createdAt printed an added-on date').toBe(1);

		// one CredentialRow per credential, in served order (:320-363 over :429-435)
		const credentialsText = await sectionText(page, 'embed-credentials');
		expect(credentialsText, 'the first credential row lost its dates').toContain(
			`${plain.name} ${plain.prefix} · Created on ${shownDate(String(plain.createdAt))} · Last used on ${shownDate(String(plain.lastUsedAt))} ${T.REVOKE}`
		);
		expect(credentialsText, 'the client-limited row lost its client, its members fact or its dates').toContain(
			`${limited.name} ${limited.prefix} · ${filled('LIMITED_TO_CLIENT', { client: clientOne.name })} · ${T.ADDS_MEMBERS} · Created on ${shownDate(String(limited.createdAt))} · ${T.NEVER_USED} ${T.REVOKE}`
		);
		expect(credentialsText, 'a client the page cannot name lost the sentence that says so').toContain(
			`${unknownClient.name} ${unknownClient.prefix} · ${T.LIMITED_TO_ONE_CLIENT} · ${T.NEVER_USED} ${T.REVOKE}`
		);
		expect(
			occurrences(credentialsText, filled('LIMITED_TO_CLIENT', { client: clientOne.name })),
			'the client named in a row is not the one served'
		).toBe(1);
		expect(occurrences(credentialsText, T.LIMITED_TO_ONE_CLIENT), 'the unnamed-client sentence was not said').toBe(
			1
		);
		expect(occurrences(credentialsText, T.ADDS_MEMBERS), 'the members fact was said other than once').toBe(1);
		expect(occurrences(credentialsText, T.NEVER_USED), 'the two credentials never used do not both say so').toBe(2);
		// clientFactOf (:299-312) names a client it can and never shows an id it cannot
		expect(credentialsText.includes('served-client-gone'), 'a client id the page could not name was shown').toBe(
			false
		);
		expect(credentialsText.includes(clientOne.id), 'a client id was shown where its name is').toBe(false);
		await expect(
			createButton(page),
			'the create action stayed disabled over a list that had arrived'
		).toBeEnabled();
		await expect(
			section(page, 'embed-timer-code'),
			'personSignIn was served, and the code section is missing'
		).toBeVisible();
		await expect(text(page, T.NO_ORIGINS), 'two sites drew an empty state').toHaveCount(0);
		await expect(text(page, T.NO_CREDENTIALS), 'three credentials drew an empty state').toHaveCount(0);

		// the clients are read only to name the clients credentials are limited to (:378-379)
		const decoded = () =>
			served.calls.map((call) =>
				decodeURIComponent(`${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`)
			);
		await expect
			.poll(decoded, { timeout: 15_000 })
			.toEqual([
				`GET ${CONFIG_ROUTE}`,
				`GET ${ORIGINS_ROUTE}?organizationId=${organizationId}`,
				`GET ${CREDENTIALS_ROUTE}?organizationId=${organizationId}`,
				`GET ${CLIENTS_ROUTE}?where[organizationId]=${organizationId}&where[tenantId]=${tenantId}&where[contactType]=CLIENT&order[name]=ASC&take=100&skip=1`
			]);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);
		await expect(settingsNavEntry(page), 'the sidebar hides Embeds only when the config says no').toHaveCount(1);

		report('served-lists', {
			originRows: await titlesIn(page, 'embed-origins'),
			credentialRows: await titlesIn(page, 'embed-credentials'),
			switchStates: await switches(page).evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('aria-checked'))
			),
			limitedToClient: await text(page, T.LIMITED_TO_CLIENT).count(),
			limitedToOneClient: await text(page, T.LIMITED_TO_ONE_CLIENT).count(),
			addsPeople: await text(page, T.ADDS_MEMBERS).count(),
			neverUsed: await text(page, T.NEVER_USED).count(),
			clientIdShown: await text(page, 'served-client-gone').count(),
			calls: decoded(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 6. adding a site: what the form refuses on its own, and what it sends

	test('6 · adding a site: the field, the ten shapes its own check refuses without a POST, and the value it sends', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const organizationId = fixture.ids.organizationA;
		const armedSoFar: string[] = [];

		// A site the organization already allows: the form does not recognize it, so the platform is the one that answers.
		const duplicate = await serveEmbeds(page, {
			config: { enabled: true },
			origins: [{ id: 'dup-site', origin: 'https://dup.example.com', allowPersonSignIn: false }],
			addOrigin: { refusal: { status: 400, message: 'this file refused the duplicate' } }
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		const field = originField(page);
		const attributes = await field.evaluate((node) => {
			const input = node as HTMLInputElement;
			return {
				typeAttribute: input.getAttribute('type'),
				inputMode: input.getAttribute('inputmode'),
				autocomplete: input.getAttribute('autocomplete'),
				spellcheck: input.getAttribute('spellcheck'),
				placeholder: input.getAttribute('placeholder'),
				hasDescribedBy: Boolean(input.getAttribute('aria-describedby')),
				ariaInvalid: input.getAttribute('aria-invalid'),
				valueLength: input.value.length
			};
		});
		expect(
			attributes,
			'the site field is not the one AddOriginForm builds (embeds-settings-page.tsx:103-122)'
		).toEqual({
			typeAttribute: null,
			inputMode: 'url',
			autocomplete: 'off',
			spellcheck: 'false',
			placeholder: 'https://app.example.com',
			hasDescribedBy: true,
			ariaInvalid: 'false',
			valueLength: 0
		});

		await field.fill('https://dup.example.com');
		await addSiteButton(page).click();
		armedSoFar.push(armedHttpError('POST', '/embed-allowed-origins', 400));
		// refusedByPlatform (:90-94): a 400 turns the note into the form's own sentence and brings no Notice
		await expect(text(page, T.ORIGIN_INVALID), 'a site the platform refused was left unexplained').toBeVisible();
		await expect(text(page, T.ADD_ORIGIN_FAILED), 'a 400 raised the general adding failure instead').toHaveCount(0);
		await expect(field).toHaveAttribute('aria-invalid', 'true');
		expect(duplicate.countOf('POST', ORIGINS_ROUTE), 'a duplicate never reached the platform').toBe(1);
		expect(duplicate.origins(), 'a refused site was stored anyway').toHaveLength(1);
		await expect
			.poll(() => titlesIn(page, 'embed-origins'), { timeout: 15_000 })
			.toEqual(['https://dup.example.com']);
		expect(
			consoleFindings(shield, armedSoFar),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);

		// The same form with nothing armed: ten typed values, none of them sent (isOriginLike, embed.schema.ts:97-114)
		const served = await serveEmbeds(page, { config: { enabled: true }, origins: [] });
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		const typedField = originField(page);
		const refusedValues = [
			'',
			' ',
			'app.example.com',
			'https://app.example.com/timer',
			'https://*.example.com',
			'https:app.example.com',
			'ftp://app.example.com',
			'https://app.example.com?x=1',
			'https://user:pass@app.example.com',
			'https://app.example.com\\timer'
		];
		const refusedResults: Array<{ typed: string; posts: number; invalidShown: number; noticeShown: number }> = [];
		for (const value of refusedValues) {
			await typedField.fill(value);
			await addSiteButton(page).click();
			await expect(
				text(page, T.ORIGIN_INVALID),
				`${JSON.stringify(value)}: the form stayed silent`
			).toBeVisible();
			await expect(typedField, `${JSON.stringify(value)}: aria-invalid was not set`).toHaveAttribute(
				'aria-invalid',
				'true'
			);
			expect(
				served.calls.some((call) => call.method === 'POST'),
				`${JSON.stringify(value)}: a POST was sent`
			).toBe(false);
			refusedResults.push({
				typed: value,
				posts: served.countOf('POST', ORIGINS_ROUTE),
				invalidShown: await text(page, T.ORIGIN_INVALID).count(),
				noticeShown: await text(page, T.ADD_ORIGIN_FAILED).count()
			});
		}
		expect(
			refusedResults.map((row) => row.posts),
			'a value the form refused still reached the API'
		).toEqual(refusedValues.map(() => 0));
		expect(
			refusedResults.map((row) => [row.invalidShown, row.noticeShown]),
			'a refused shape drew a Notice instead of the note'
		).toEqual(refusedValues.map(() => [1, 0]));
		await expect(typedField, 'a refused shape cleared the field').toHaveValue(refusedValues[9]);
		await expect(text(page, T.ORIGIN_HINT), 'the note replaced the hint and the hint stayed too').toHaveCount(0);
		expect(await titlesIn(page, 'embed-origins'), 'a refused shape added a row').toEqual([]);

		// the good value, typed with spaces around it: trimmed by the service and added by the store
		await typedField.fill('  https://added.example.com  ');
		await addSiteButton(page).click();
		await expect
			.poll(() => titlesIn(page, 'embed-origins'), { timeout: 15_000 })
			.toEqual(['https://added.example.com']);
		const post = served.calls.find((call) => call.method === 'POST');
		expect(
			JSON.parse(String(post?.body)) as unknown,
			'the add body is not the trimmed origin beside the organization'
		).toEqual({ origin: 'https://added.example.com', organizationId });
		expect(post?.contentType, 'the add was not sent as JSON').toBe('application/json');
		await expect(typedField, 'the form kept the value it added').toHaveValue('');
		await expect(text(page, T.ORIGIN_HINT)).toBeVisible();
		await expect(typedField).toHaveAttribute('aria-invalid', 'false');
		expect(served.countOf('POST', ORIGINS_ROUTE), 'the site was sent more than once').toBe(1);
		await expect.poll(() => served.countOf('GET', ORIGINS_ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('add-site', {
			field: attributes,
			refused: refusedResults,
			postBody: post?.body ?? null,
			calls: served.shapes(),
			rowsAfter: await titlesIn(page, 'embed-origins'),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield, armedSoFar), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 7. the switch that lets people sign in from a site

	test('7 · a site person sign-in switch: the PATCH it sends, what the row keeps, and the switch that goes back', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const armedSoFar: string[] = [];
		const off = {
			id: 'switch-a',
			origin: 'https://switch-a.example.com',
			allowPersonSignIn: false,
			createdAt: null
		};
		const on = { id: 'switch-b', origin: 'https://switch-b.example.com', allowPersonSignIn: true, createdAt: null };
		const served = await serveEmbeds(page, {
			config: { enabled: true, personSignIn: true },
			origins: [off, on]
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		await expect(switches(page)).toHaveCount(2);
		await switches(page).nth(0).click();

		await expect.poll(() => served.countOf('PATCH', served.originPathOf(off.id)), { timeout: 15_000 }).toBe(1);
		const patch = served.calls.find((call) => call.method === 'PATCH');
		expect(
			JSON.parse(String(patch?.body)) as unknown,
			'the switch body is not the one setting of that site'
		).toEqual({ allowPersonSignIn: true });
		expect(patch?.url, 'the PATCH went somewhere else than the mock').toBe(
			`${MOCK_API_ORIGIN}${served.originPathOf(off.id)}`
		);
		// the switch stays where it was moved, and its neighbour keeps its own setting (use-embeds.ts:231-237)
		await expect
			.poll(() => switches(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-checked'))), {
				timeout: 15_000
			})
			.toEqual(['true', 'true']);
		expect(
			served.origins().find((row) => row.id === off.id)?.allowPersonSignIn,
			'the served site was not changed'
		).toBe(true);
		expect(
			served.origins().find((row) => row.id === on.id)?.allowPersonSignIn,
			'the other site was changed too'
		).toBe(true);
		expect(
			served.countOf('GET', ORIGINS_ROUTE),
			'the sites list was not read again once the switch settled (use-embeds.ts:272-279)'
		).toBeGreaterThanOrEqual(2);
		await expect(text(page, T.PERSON_SIGN_IN_FAILED), 'a switch that worked said it failed').toHaveCount(0);

		// the same switch against a server that refuses it
		const refusedSite = { id: 'switch-c', origin: 'https://switch-c.example.com', allowPersonSignIn: false };
		const refused = await serveEmbeds(page, {
			config: { enabled: true, personSignIn: true },
			origins: [refusedSite],
			patchOrigin: { refusal: { status: 403, message: 'this file refused the setting' } }
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		await expect(switches(page)).toHaveCount(1);
		await switches(page).nth(0).click();
		armedSoFar.push(armedHttpError('PATCH', '/embed-allowed-origins/switch-c', 403));

		// onError (embeds-settings-page.tsx:154) -> the row's own sentence; the rollback is use-embeds.ts:267-271
		await expect(text(page, T.PERSON_SIGN_IN_FAILED), 'a refused setting said nothing').toBeVisible({
			timeout: 25_000
		});
		await expect(page.locator('[role=alert]').filter({ hasText: T.PERSON_SIGN_IN_FAILED })).toHaveCount(1);
		await expect(switches(page).nth(0), 'the switch stayed where the refused change left it').toHaveAttribute(
			'aria-checked',
			'false'
		);
		expect(refused.countOf('PATCH', refused.originPathOf(refusedSite.id)), 'the setting was asked twice').toBe(1);
		expect(refused.origins()[0].allowPersonSignIn, 'a refused PATCH changed the served site anyway').toBe(false);
		await expect.poll(() => titlesIn(page, 'embed-origins'), { timeout: 15_000 }).toEqual([refusedSite.origin]);
		expect(await appToasts(page).count(), 'the global fallback toast spoke beside the row').toBe(0);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('person-sign-in', {
			acceptedPatch: patch?.body ?? null,
			acceptedPatchUrl: patch ? new URL(String(patch.url)).pathname : null,
			refusedPatch: refused.calls.find((call) => call.method === 'PATCH')?.body ?? null,
			servedAfterAccept: served.origins(),
			servedAfterRefusal: refused.origins(),
			acceptedCalls: served.shapes(),
			refusedCalls: refused.shapes(),
			fallbackToasts: await appToasts(page).count(),
			devToasts: (await devToasts(page).allInnerTexts()).length,
			consoleErrors: shield.consoleErrors()
		});
		expect(
			consoleFindings(shield, armedSoFar),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------- 8. removing a site

	test('8 · removing a site: the question, a cancel that sends nothing, and a confirm that removes at the measured path', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const dropped = { id: 'drop-site', origin: 'https://drop-site.example.com', allowPersonSignIn: false };
		const kept = { id: 'keep-site', origin: 'https://keep-site.example.com', allowPersonSignIn: false };
		const served = await serveEmbeds(page, { config: { enabled: true }, origins: [dropped, kept] });
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		await expect
			.poll(() => titlesIn(page, 'embed-origins'), { timeout: 25_000 })
			.toEqual([dropped.origin, kept.origin]);
		await page.getByRole('button', { name: T.REMOVE, exact: true }).first().click();
		const dialog = dialogOf(page);
		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByRole('heading', { name: filled('REMOVE_TITLE', { origin: dropped.origin }), exact: true })
		).toBeVisible();
		await expect(text(dialog, T.REMOVE_DESCRIPTION)).toBeVisible();
		await expect(cancelIn(dialog)).toHaveCount(1);
		await expect(dialog.getByRole('button', { name: T.REMOVE, exact: true })).toHaveCount(1);

		await cancelIn(dialog).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect
			.poll(() => titlesIn(page, 'embed-origins'), { timeout: 10_000 })
			.toEqual([dropped.origin, kept.origin]);
		expect(served.countOf('DELETE', served.originPathOf(dropped.id)), 'a cancelled removal sent a DELETE').toBe(0);

		await page.getByRole('button', { name: T.REMOVE, exact: true }).first().click();
		await dialog.getByRole('button', { name: T.REMOVE, exact: true }).click();

		// useRemoveEmbedOrigin (use-embeds.ts:209-221): the row leaves at once, then the list is read again
		await expect.poll(() => titlesIn(page, 'embed-origins'), { timeout: 15_000 }).toEqual([kept.origin]);
		await expect(dialogOf(page), 'the question stayed open after the site was removed').toHaveCount(0);
		expect(served.countOf('DELETE', served.originPathOf(dropped.id)), 'the removal was sent twice').toBe(1);
		const removal = served.calls.find((call) => call.method === 'DELETE');
		expect(removal?.url, 'the DELETE went somewhere else than the mock').toBe(
			`${MOCK_API_ORIGIN}${served.originPathOf(dropped.id)}`
		);
		expect(served.shapes(), 'the calls around a removal are not the measured ones').toEqual([
			`GET ${CONFIG_ROUTE}`,
			`GET ${ORIGINS_ROUTE}?organizationId=${fixture.ids.organizationA}`,
			`GET ${CREDENTIALS_ROUTE}?organizationId=${fixture.ids.organizationA}`,
			`DELETE ${served.originPathOf(dropped.id)}`,
			`GET ${ORIGINS_ROUTE}?organizationId=${fixture.ids.organizationA}`
		]);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('remove-site', {
			question: filled('REMOVE_TITLE', { origin: dropped.origin }),
			confirmLabel: T.REMOVE,
			calls: served.shapes(),
			deleteUrlPath: removal ? new URL(String(removal.url)).pathname : null,
			rowsAfterConfirm: await titlesIn(page, 'embed-origins'),
			storeAfterConfirm: served.origins().map((row) => row.origin),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 9. the credential dialog: what the server's config makes it offer

	test('9 · the credential dialog: no client and no members option when the config cannot, both when it can', async ({
		page,
		fixture,
		shield
	}) => {
		// the mock's own shape of the config, served here so the dialog is asked the same question test 1 was
		const plainConfig = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: false, addMembers: false }
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });

		const plainDialog = await openCreateDialog(page);
		await expect(plainDialog.getByRole('heading', { name: T.CREATE_TITLE, exact: true })).toBeVisible();
		await expect(text(plainDialog, T.NAME_LABEL)).toBeVisible();
		await expect(text(plainDialog, T.NAME_HINT)).toBeVisible();
		// :202 and :205: the client field and the members checkbox appear only when the server said it can
		await expect(plainDialog.getByRole('combobox')).toHaveCount(0);
		await expect(plainDialog.getByRole('checkbox')).toHaveCount(0);
		await expect(text(plainDialog, T.CLIENT_LABEL)).toHaveCount(0);
		await expect(text(plainDialog, T.ADD_MEMBERS_LABEL)).toHaveCount(0);
		await expect(text(plainDialog, T.CLIENT_HINT)).toHaveCount(0);
		await expect(text(plainDialog, T.ADD_MEMBERS_HINT)).toHaveCount(0);
		await cancelIn(plainDialog).click();
		await expect(dialogOf(page)).toHaveCount(0);
		expect(plainConfig.countOf('POST', CREDENTIALS_ROUTE), 'a dialog that offered nothing still wrote').toBe(0);

		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: true, addMembers: true },
			clients: [
				{ id: 'served-client-1', name: 'Probe Client One' },
				{ id: 'served-client-2', name: 'Probe Client Two' }
			]
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });
		const dialog = await openCreateDialog(page);

		const nameField = dialog.locator('input').first();
		const nameAttributes = await nameField.evaluate((node) => {
			const input = node as HTMLInputElement;
			return {
				maxLength: input.getAttribute('maxlength'),
				autocomplete: input.getAttribute('autocomplete'),
				hasDescribedBy: Boolean(input.getAttribute('aria-describedby')),
				typeAttribute: input.getAttribute('type'),
				valueLength: input.value.length
			};
		});
		// maxLength={EMBED_CREDENTIAL_NAME_MAX_LENGTH} (:251), the same 100 as embed.schema.ts:4
		expect(nameAttributes, 'the name field is not the one CreateCredentialForm builds (:246-257)').toEqual({
			maxLength: '100',
			autocomplete: 'off',
			hasDescribedBy: true,
			typeAttribute: null,
			valueLength: 0
		});

		const combobox = dialog.getByRole('combobox');
		await expect(combobox).toHaveCount(1);
		await expect(text(dialog, T.CLIENT_LABEL)).toBeVisible();
		await expect(text(dialog, T.CLIENT_HINT)).toBeVisible();
		await expect(combobox).toContainText(T.CLIENT_WHOLE_WORKSPACE);
		await expect(dialog.getByRole('checkbox')).toHaveCount(1);
		expect(
			await dialog
				.getByRole('checkbox')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-checked'))),
			'the members checkbox did not start unticked'
		).toEqual(['false']);
		await expect(text(dialog, T.ADD_MEMBERS_LABEL)).toBeVisible();
		await expect(text(dialog, T.ADD_MEMBERS_HINT)).toBeVisible();
		await expect(dialog.getByRole('button', { name: T.CREATE, exact: true })).toHaveCount(1);

		// the offered clients, after the whole workspace (CredentialClientField :110-125)
		await combobox.click();
		await expect
			.poll(() => page.getByRole('option').allInnerTexts(), { timeout: 15_000 })
			.toEqual([T.CLIENT_WHOLE_WORKSPACE, 'Probe Client One', 'Probe Client Two']);
		const offeredOptions = await page.getByRole('option').allInnerTexts();
		await page.keyboard.press('Escape');
		await expect(combobox, 'Escape closed the dialog with it').toBeVisible();

		// an empty name: the note changes and nothing is sent (:209-222)
		await submitIn(dialog).click();
		await expect(text(dialog, T.NAME_REQUIRED)).toBeVisible();
		await expect(text(dialog, T.NAME_HINT), 'the hint stayed under a name the form refused').toHaveCount(0);
		await expect(nameField).toHaveAttribute('aria-invalid', 'true');
		expect(served.countOf('POST', CREDENTIALS_ROUTE), 'a name the form refused still reached the API').toBe(0);

		// typing answers the refusal at once (`changeName`, :233-236 → `setIsNameMissing(false)`): the hint is back and
		// the field is valid again, measured in `s3-lane-b-embeds-3.log` test 9
		await nameField.fill('Typed after a refusal');
		await expect(text(dialog, T.NAME_REQUIRED), 'the refusal stayed under a name that was typed').toHaveCount(0);
		await expect(text(dialog, T.NAME_HINT), 'the hint did not come back with the name').toBeVisible();
		await expect(nameField).toHaveAttribute('aria-invalid', 'false');

		// read out while the dialog is still open: once it is cancelled its controls are gone and a locator would wait
		const comboboxText = await combobox.innerText();
		const checkboxStates = await dialog
			.getByRole('checkbox')
			.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-checked')));

		await cancelIn(dialog).click();
		await expect(dialogOf(page)).toHaveCount(0);
		expect(served.countOf('POST', CREDENTIALS_ROUTE), 'cancel came with a write').toBe(0);
		expect(
			served.countOf('GET', CLIENTS_ROUTE),
			'the clients were not read for a dialog that offers them (use-clients-query)'
		).toBeGreaterThanOrEqual(1);

		report('create-form', {
			nameField: nameAttributes,
			plainDialogCombobox: await plainDialog.getByRole('combobox').count(),
			comboboxText,
			options: offeredOptions,
			checkbox: checkboxStates,
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 10. a create that succeeds: the body, the secret once, then Done

	test('10 · a create: the body it posts, the secret shown once with its copy control, and Done leaving only the row', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const organizationId = fixture.ids.organizationA;
		const secret = `gze_scratch_${Math.random().toString(36).slice(2, 22)}`;
		const created = {
			id: 'served-credential-new',
			name: 'Friday host',
			prefix: 'gze_friday1',
			organizationContactId: 'served-client-1',
			canAddMembers: true,
			createdAt: dayIso(0),
			lastUsedAt: null,
			secret
		};
		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: true, addMembers: true },
			clients: [{ id: 'served-client-1', name: 'Probe Client One' }],
			create: { credential: created }
		});
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });

		const dialog = await openCreateDialog(page);
		// typed with spaces around it: credentialBody trims it (embeds.service.ts:123)
		await dialog.locator('input').first().fill('  Friday host  ');
		await dialog.getByRole('combobox').click();
		await page.getByRole('option', { name: 'Probe Client One', exact: true }).click();
		await dialog.getByRole('checkbox').click();
		await expect(dialog.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
		await submitIn(dialog).click();

		await expect(text(dialog, T.SECRET_TITLE), 'the create answer never reached the screen').toBeVisible({
			timeout: 25_000
		});
		await expect(text(dialog, filled('SECRET_TEXT', { name: created.name }))).toBeVisible();
		expect(served.countOf('POST', CREDENTIALS_ROUTE), 'the create was sent more than once').toBe(1);
		const post = served.calls.find((call) => call.method === 'POST');
		expect(
			JSON.parse(String(post?.body)) as unknown,
			'the create body is not the three things the form holds'
		).toEqual({
			name: 'Friday host',
			organizationId,
			organizationContactId: 'served-client-1',
			canAddMembers: true
		});
		expect(post?.contentType, 'the create was not sent as JSON').toBe('application/json');

		// ApiTokenSecret (api-token-secret.tsx:95-104): read only, equal to what this file served, never printed
		const secretField = await dialog
			.getByLabel(SECRET_T.SECRET_LABEL, { exact: true })
			.evaluate((node, servedSecret) => {
				const field = node as HTMLInputElement;
				return {
					readOnly: field.readOnly,
					holdsServedSecret: field.value === servedSecret,
					length: field.value.length
				};
			}, secret);
		expect(secretField, 'the secret field is not the one the component builds').toEqual({
			readOnly: true,
			holdsServedSecret: true,
			length: secret.length
		});
		await expect(text(dialog, T.SECRET_SERVER_ONLY)).toBeVisible();
		const copyButton = dialog.getByRole('button', { name: SECRET_T.COPY_TOKEN, exact: true });
		await expect(copyButton).toHaveCount(1);
		await copyButton.click();
		// reported, not pinned: which of COPIED / COPY_DONE this Chrome grants (see the header, "not covered")
		const copyOutcome = {
			copyLabel: await text(dialog, SECRET_T.COPY).count(),
			copiedLabel: await text(dialog, SECRET_T.COPIED).count(),
			doneSentence: await text(dialog, SECRET_T.COPY_DONE).count(),
			failedSentence: await text(dialog, SECRET_T.COPY_FAILED).count(),
			statusRegions: await dialog.locator('output').count()
		};
		await expect(copyButton, 'the copy button lost its name after one click').toHaveCount(1);
		expect(copyOutcome.failedSentence, 'the copy failed on a page this file granted the clipboard to').toBe(0);

		// dismissible={!isSecretShown && !isCreating} (:340-347): the secret survives a stray Escape or click
		await page.keyboard.press('Escape');
		await expect(dialog, 'Escape closed the dialog while the secret was on screen').toBeVisible();
		await expect(text(dialog, T.SECRET_TITLE)).toBeVisible();
		await page.mouse.click(4, 4);
		await expect(dialog, 'a click outside closed the dialog while the secret was on screen').toBeVisible();
		await expect(
			dialog.getByRole('button', { name: EN.common.CANCEL, exact: true }),
			'Cancel offered a way out'
		).toHaveCount(0);

		await dialog.getByRole('button', { name: T.DONE, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 15_000 }).toEqual([created.name]);

		// the answer is dropped from the cache (use-embeds.ts:295, gcTime 0): only the row, never the secret
		const secretInPage = await page.evaluate((value) => {
			const inputs = Array.from(document.querySelectorAll('input')).map(
				(node) => (node as HTMLInputElement).value
			);
			return {
				anyInputHoldsIt: inputs.some((held) => held === value),
				bodyHtmlHoldsIt: document.body.innerHTML.includes(value)
			};
		}, secret);
		expect(secretInPage, 'the secret was still in the page after Done').toEqual({
			anyInputHoldsIt: false,
			bodyHtmlHoldsIt: false
		});
		expect(await text(page, T.SECRET_TITLE).count(), 'the secret screen stayed open').toBe(0);
		const credentialsText = await sectionText(page, 'embed-credentials');
		expect(credentialsText, 'the new row does not say what the create asked for').toContain(
			`${created.name} ${created.prefix} · ${filled('LIMITED_TO_CLIENT', { client: 'Probe Client One' })} · ${T.ADDS_MEMBERS} · Created on ${shownDate(created.createdAt)} · ${T.NEVER_USED} ${T.REVOKE}`
		);

		report('create-succeeded', {
			postBodyKeys: Object.keys(JSON.parse(String(post?.body)) as object).sort(),
			postContentType: post?.contentType ?? null,
			secretLength: secret.length,
			secretField,
			copyOutcome,
			listReads: served.countOf('GET', CREDENTIALS_ROUTE),
			calls: served.calls.map((call) =>
				decodeURIComponent(`${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`)
			),
			mockLogged: (await mock.calls('embed')).length,
			rowsAfterDone: await titlesIn(page, 'embed-credentials'),
			secretInPageAfterDone: secretInPage,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 11. the create answer stays out of the dev log

	test('11 · the create answer stays out of every POST /api/log body (secretResponse)', async ({
		page,
		fixture,
		shield
	}) => {
		const secret = `gze_scratch_log_${Math.random().toString(36).slice(2, 22)}`;
		const created = {
			id: 'served-credential-log',
			name: 'Log probe credential',
			prefix: 'gze_logprobe',
			createdAt: dayIso(0),
			lastUsedAt: null,
			secret
		};
		// no clientLimits and no addMembers here: the create body is the two keys alone (embeds.service.ts:123)
		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: false, addMembers: false },
			create: { credential: created }
		});
		const seen = watchLog(page);
		await signInAndVisit(page, fixture, EMBEDS_PATH);
		await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });
		await seen.settle();
		const beforeCreate = seen.posts.length;

		const dialog = await openCreateDialog(page);
		await dialog.locator('input').first().fill('Log probe credential');
		await submitIn(dialog).click();
		await expect(text(dialog, T.SECRET_TITLE)).toBeVisible({ timeout: 25_000 });
		await seen.settle();

		const createResponses = seen.responses().filter(named('POST /embed-credentials'));
		const createRequests = seen.requests().filter(named('POST /embed-credentials'));
		const raw = JSON.stringify(seen.posts);

		expect(createResponses.length, 'the create answered no 🚀/✅ pair in the dev log').toBeGreaterThanOrEqual(1);
		// api.service.ts:403, :408 — the answer is logged as '[not logged]' because create passed secretResponse (:143)
		expect(
			createResponses.map((post) => post.details?.data),
			'a create answer was logged with its body'
		).toEqual(createResponses.map(() => '[not logged]'));
		expect(
			createRequests.map((post) => Object.keys((post.details?.data ?? {}) as object).sort()),
			'the logged create request body is not the name beside the organization'
		).toEqual(createRequests.map(() => ['name', 'organizationId']));
		expect(raw.includes(secret), 'the served secret appeared in a POST /api/log body').toBe(false);
		expect(served.countOf('POST', CREDENTIALS_ROUTE), 'the create was not sent exactly once').toBe(1);

		report('secret-out-of-log', {
			postsBeforeCreate: beforeCreate,
			postsAfterCreate: seen.posts.length,
			calls: served.shapes(),
			createResponseEntries: createResponses.length,
			createRequestEntries: createRequests.length,
			createRequestDataKeys: createRequests.map((post) =>
				Object.keys((post.details?.data ?? {}) as object).sort()
			),
			// every side reported as a boolean or a length; the value itself is never printed
			secretLength: secret.length,
			secretInAnyLogBody: raw.includes(secret),
			consoleErrors: shield.consoleErrors()
		});
		expect(
			consoleFindings(shield),
			'the page logged a console error while a create was being made and read'
		).toEqual([]);
		await dialog.getByRole('button', { name: T.DONE, exact: true }).click();
	});

	// ---------------------------------- 12. revoking a credential

	test('12 · revoking a credential: the question, a cancel that sends nothing, and a confirm that revokes at the measured path', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const organizationId = fixture.ids.organizationA;
		const dropped = {
			id: 'drop-cred',
			name: 'Drop credential',
			prefix: 'gze_drop01',
			createdAt: dayIso(-2),
			lastUsedAt: null
		};
		const kept = {
			id: 'keep-cred',
			name: 'Keep credential',
			prefix: 'gze_keep01',
			createdAt: dayIso(-2),
			lastUsedAt: null
		};
		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: false, addMembers: false, personSignIn: false },
			credentials: [dropped, kept]
		});
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		await expect
			.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 25_000 })
			.toEqual([dropped.name, kept.name]);
		await page.getByRole('button', { name: T.REVOKE, exact: true }).first().click();
		const dialog = dialogOf(page);
		await expect(dialog).toBeVisible();
		// the question names the credential (embeds-settings-page.tsx:442-451 over kit/danger.tsx)
		await expect(
			dialog.getByRole('heading', { name: filled('REVOKE_TITLE', { name: dropped.name }), exact: true })
		).toBeVisible();
		await expect(text(dialog, T.REVOKE_DESCRIPTION)).toBeVisible();
		await expect(cancelIn(dialog)).toHaveCount(1);
		await expect(dialog.getByRole('button', { name: T.REVOKE, exact: true })).toHaveCount(1);

		await cancelIn(dialog).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect
			.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 10_000 })
			.toEqual([dropped.name, kept.name]);
		expect(
			served.countOf('DELETE', served.credentialPathOf(dropped.id)),
			'a cancelled revocation sent a DELETE'
		).toBe(0);

		await page.getByRole('button', { name: T.REVOKE, exact: true }).first().click();
		await dialog.getByRole('button', { name: T.REVOKE, exact: true }).click();

		// useRevokeEmbedCredential (use-embeds.ts:311-323): the row leaves at once, then the list is read again
		await expect.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 15_000 }).toEqual([kept.name]);
		await expect(dialogOf(page), 'the question stayed open after the credential was revoked').toHaveCount(0);
		expect(served.countOf('DELETE', served.credentialPathOf(dropped.id)), 'the revocation was sent twice').toBe(1);
		expect(
			served.credentials().map((row) => row.id),
			'the served list still holds the revoked credential'
		).toEqual([kept.id]);
		expect(served.shapes(), 'the calls around a revocation are not the measured ones').toEqual([
			`GET ${CONFIG_ROUTE}`,
			`GET ${ORIGINS_ROUTE}?organizationId=${organizationId}`,
			`GET ${CREDENTIALS_ROUTE}?organizationId=${organizationId}`,
			`DELETE ${served.credentialPathOf(dropped.id)}`,
			`GET ${CREDENTIALS_ROUTE}?organizationId=${organizationId}`
		]);
		const credentialsText = await sectionText(page, 'embed-credentials');
		expect(credentialsText, 'the surviving credential lost its own row').toContain(
			`${kept.name} ${kept.prefix} · Created on ${shownDate(String(kept.createdAt))} · ${T.NEVER_USED} ${T.REVOKE}`
		);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('revoke-credential', {
			question: filled('REVOKE_TITLE', { name: dropped.name }),
			confirmLabel: T.REVOKE,
			calls: served.shapes(),
			rowsAfterConfirm: await titlesIn(page, 'embed-credentials'),
			storeAfterConfirm: served.credentials().map((row) => row.id),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 13. a site the server refuses to add

	test('13 · adding a site the server refuses (400, 403 and 500): the form explains a 400 itself, a Notice the rest', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const armedSoFar: string[] = [];
		const outcomes: Array<{
			status: number;
			posts: number;
			ariaInvalid: string | null;
			originInvalidShown: number;
			addFailedShown: number;
			rows: string[];
			store: string[];
			appToasts: number;
		}> = [];

		for (const status of [400, 403, 500]) {
			const served = await serveEmbeds(page, {
				config: { enabled: true },
				origins: [],
				addOrigin: { refusal: { status, message: `this file refused the site with ${status}` } }
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);
			const field = originField(page);
			await field.fill('https://refused.example.com');
			await addSiteButton(page).click();
			armedSoFar.push(armedHttpError('POST', ORIGINS_ROUTE, status));

			if (status === 400) {
				// refusedByPlatform (embeds-settings-page.tsx:90-94): the platform's own 400 becomes the note under the field
				await expect(
					text(page, T.ORIGIN_INVALID),
					`${status}: the form did not explain the refusal`
				).toBeVisible();
				await expect(
					text(page, T.ADD_ORIGIN_FAILED),
					`${status}: a 400 raised the general failure too`
				).toHaveCount(0);
			} else {
				await expect(
					text(page, T.ADD_ORIGIN_FAILED),
					`${status}: the adding failure was never said`
				).toBeVisible();
				await expect(
					text(page, T.ORIGIN_INVALID),
					`${status}: the refusal was reported as a bad shape`
				).toHaveCount(0);
			}
			// aria-invalid comes from the form's own check or from the platform's 400 alone (:84-87, :90-94): a 403 or a
			// 500 says nothing about the typed value, so the field keeps its resting state and only the Notice speaks.
			await expect(field, `${status}: the field was left in the wrong state`).toHaveAttribute(
				'aria-invalid',
				status === 400 ? 'true' : 'false'
			);
			await expect(field, `${status}: the typed site was dropped from the field`).toHaveValue(
				'https://refused.example.com'
			);
			expect(served.countOf('POST', ORIGINS_ROUTE), `${status}: the site was sent more than once`).toBe(1);
			expect(served.origins(), `${status}: a refused site was stored anyway`).toEqual([]);
			await expect.poll(() => titlesIn(page, 'embed-origins'), { timeout: 10_000 }).toEqual([]);
			await expect(text(page, T.NO_ORIGINS), `${status}: the refused site left no empty state`).toBeVisible();
			expect(await appToasts(page).count(), `${status}: the global fallback toast spoke beside the form`).toBe(0);

			outcomes.push({
				status,
				posts: served.countOf('POST', ORIGINS_ROUTE),
				ariaInvalid: await field.getAttribute('aria-invalid'),
				originInvalidShown: await text(page, T.ORIGIN_INVALID).count(),
				addFailedShown: await text(page, T.ADD_ORIGIN_FAILED).count(),
				rows: await titlesIn(page, 'embed-origins'),
				store: served.origins().map((row) => row.origin),
				appToasts: await appToasts(page).count()
			});
			expect(
				consoleFindings(shield, armedSoFar),
				`${status}: besides its own refusal line the page logged a console error`
			).toEqual([]);
		}

		expect(
			outcomes.map((row) => row.posts),
			'a refused add was sent other than once'
		).toEqual([1, 1, 1]);
		expect(
			outcomes.map((row) => [row.originInvalidShown, row.addFailedShown]),
			'the 400 and the 5xx said the same thing'
		).toEqual([
			[1, 0],
			[0, 1],
			[0, 1]
		]);
		// measured in s3-lane-b-embeds-2.log (403): the field kept aria-invalid="false" beside its Notice
		expect(
			outcomes.map((row) => row.ariaInvalid),
			'a refusal that was not a 400 put the site field in the invalid state'
		).toEqual(['true', 'false', 'false']);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('add-site-refused', {
			outcomes,
			calls: outcomes.map((row) => row.store),
			excusedConsoleLines: armedSoFar,
			consoleErrors: shield.consoleErrors()
		});
	});

	// ---------------------------------- 14. a create the server refuses

	test('14 · a create the server refuses (400, 403 and 500): the form stays open with its notice and never a secret', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const armedSoFar: string[] = [];
		const outcomes: Array<{
			status: number;
			posts: number;
			createFailedShown: number;
			secretShown: number;
			dialogOpen: number;
			rows: string[];
			store: string[];
			appToasts: number;
		}> = [];

		for (const status of [400, 403, 500]) {
			const served = await serveEmbeds(page, {
				config: { enabled: true, clientLimits: false, addMembers: false },
				credentials: [],
				create: { refusal: { status, message: `this file refused the create with ${status}` } }
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);
			await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });
			const dialog = await openCreateDialog(page);
			await dialog.locator('input').first().fill('Refused credential');
			await submitIn(dialog).click();
			armedSoFar.push(armedHttpError('POST', CREDENTIALS_ROUTE, status));

			// createFailureOf (create-embed-credential-dialog.tsx:173-178): any refusal this is not named for
			await expect(text(dialog, T.CREATE_FAILED), `${status}: the create failure was never said`).toBeVisible({
				timeout: 25_000
			});
			await expect(text(dialog, T.NAME_LABEL), `${status}: the form was closed by the refusal`).toBeVisible();
			await expect(text(dialog, T.SECRET_TITLE), `${status}: a refused create still showed a secret`).toHaveCount(
				0
			);
			await expect(text(dialog, T.ADD_MEMBERS_FAILED), `${status}: the members sentence was raised`).toHaveCount(
				0
			);
			await expect(
				dialog.getByRole('button', { name: T.DONE, exact: true }),
				`${status}: Done was offered`
			).toHaveCount(0);
			expect(served.countOf('POST', CREDENTIALS_ROUTE), `${status}: the create was sent more than once`).toBe(1);
			expect(served.credentials(), `${status}: a refused create was stored anyway`).toEqual([]);
			await expect.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 10_000 }).toEqual([]);
			expect(await appToasts(page).count(), `${status}: the global fallback toast spoke beside the dialog`).toBe(
				0
			);

			outcomes.push({
				status,
				posts: served.countOf('POST', CREDENTIALS_ROUTE),
				createFailedShown: await text(dialog, T.CREATE_FAILED).count(),
				secretShown: await text(page, T.SECRET_TITLE).count(),
				dialogOpen: await dialogOf(page).count(),
				rows: await titlesIn(page, 'embed-credentials'),
				store: served.credentials().map((row) => row.id),
				appToasts: await appToasts(page).count()
			});
			await cancelIn(dialog).click();
			expect(
				consoleFindings(shield, armedSoFar),
				`${status}: besides its own refusal line the page logged a console error`
			).toEqual([]);
		}

		expect(
			outcomes.map((row) => [row.posts, row.createFailedShown, row.secretShown, row.dialogOpen]),
			'a refused create did something it should not have'
		).toEqual([
			[1, 1, 0, 1],
			[1, 1, 0, 1],
			[1, 1, 0, 1]
		]);
		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

		report('create-refused', {
			outcomes,
			excusedConsoleLines: armedSoFar,
			consoleErrors: shield.consoleErrors()
		});
	});

	// ---------------------------------- 15. a revoke and a removal the server refuses

	test('15 · a revocation (403, 500) and a removal (500) the server refuses: the question stays open with its alert, the row stays', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const armedSoFar: string[] = [];
		const refusedCredential = {
			id: 'refused-cred',
			name: 'Refused credential',
			prefix: 'gze_refuse',
			createdAt: dayIso(-1),
			lastUsedAt: null
		};
		const refusedSite = {
			id: 'refused-site',
			origin: 'https://refused-site.example.com',
			allowPersonSignIn: false
		};

		for (const item of [
			{ kind: 'revoke' as const, status: 403 },
			{ kind: 'revoke' as const, status: 500 },
			{ kind: 'remove' as const, status: 500 }
		]) {
			const failedText = item.kind === 'revoke' ? T.REVOKE_FAILED : T.REMOVE_FAILED;
			const served = await serveEmbeds(page, {
				config: { enabled: true },
				credentials: item.kind === 'revoke' ? [refusedCredential] : [],
				origins: item.kind === 'remove' ? [refusedSite] : [],
				revokeCredential:
					item.kind === 'revoke' ? { refusal: { status: item.status, message: 'refused' } } : undefined,
				removeOrigin:
					item.kind === 'remove' ? { refusal: { status: item.status, message: 'refused' } } : undefined
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);

			const label = item.kind === 'revoke' ? T.REVOKE : T.REMOVE;
			const path =
				item.kind === 'revoke'
					? served.credentialPathOf(refusedCredential.id)
					: served.originPathOf(refusedSite.id);
			await page.getByRole('button', { name: label, exact: true }).first().click();
			const dialog = dialogOf(page);
			await expect(dialog).toBeVisible();
			await dialog.getByRole('button', { name: label, exact: true }).click();
			armedSoFar.push(armedHttpError('DELETE', path, item.status));

			// the dialog's own error line (kit/danger.tsx:165-167) over the failure the mutation left (use-embeds.ts:311-323, :209-221)
			await expect(text(page, failedText), `${item.kind} ${item.status}: the refusal was never said`).toBeVisible(
				{
					timeout: 25_000
				}
			);
			await expect(
				page.locator('[role=alert]').filter({ hasText: failedText }),
				`${item.kind} ${item.status}: the refusal was not a named alert`
			).toHaveCount(1);
			await expect(dialog, `${item.kind} ${item.status}: the question closed on a refusal`).toHaveCount(1);
			expect(
				served.countOf('DELETE', path),
				`${item.kind} ${item.status}: the write was sent more than once`
			).toBe(1);
			if (item.kind === 'revoke') {
				expect(
					served.credentials().map((row) => row.id),
					'a refused revocation removed the credential'
				).toEqual([refusedCredential.id]);
				await expect
					.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 10_000 })
					.toEqual([refusedCredential.name]);
			} else {
				expect(
					served.origins().map((row) => row.id),
					'a refused removal removed the site'
				).toEqual([refusedSite.id]);
				await expect
					.poll(() => titlesIn(page, 'embed-origins'), { timeout: 10_000 })
					.toEqual([refusedSite.origin]);
			}
			expect(
				await appToasts(page).count(),
				`${item.kind} ${item.status}: the fallback toast spoke beside the question`
			).toBe(0);
			expect(
				consoleFindings(shield, armedSoFar),
				`${item.kind} ${item.status}: besides its own refusal line the page logged a console error`
			).toEqual([]);
		}

		expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);
		report('destructive-refused', {
			excusedConsoleLines: armedSoFar,
			revokeFailedText: T.REVOKE_FAILED,
			removeFailedText: T.REMOVE_FAILED,
			consoleErrors: shield.consoleErrors()
		});
	});

	// ---------------------------------- 16. a list read failing, and the retry it offers

	for (const item of [
		{ which: 'origins' as const, route: ORIGINS_ROUTE, failedText: T.NO_ORIGINS, keptText: T.NO_CREDENTIALS },
		{
			which: 'credentials' as const,
			route: CREDENTIALS_ROUTE,
			failedText: T.NO_CREDENTIALS,
			keptText: T.NO_ORIGINS
		}
	]) {
		test(`16 · the ${item.which} list refusing 502: its own failure with one retry, while the other section keeps its empty state`, async ({
			page,
			fixture,
			mock,
			shield
		}) => {
			const organizationId = fixture.ids.organizationA;
			const refusal = { status: 502, message: 'this file refused the list' };
			// both lists empty, as probe-1.log P17 served them: the section that answered keeps its own empty state
			const served = await serveEmbeds(page, {
				config: { enabled: true },
				origins: [],
				credentials: [],
				[item.which === 'origins' ? 'originsListRefusal' : 'credentialsListRefusal']: refusal
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);

			const failedSection = section(page, item.which === 'origins' ? 'embed-origins' : 'embed-credentials');
			const keptSection = section(page, item.which === 'origins' ? 'embed-credentials' : 'embed-origins');
			// ListFailed (embeds-settings-page.tsx:47-61), drawn by :267 / :429
			await expect(text(failedSection, T.LIST_FAILED_TITLE)).toBeVisible({ timeout: 30_000 });
			await expect(text(failedSection, T.LIST_FAILED_TEXT)).toBeVisible();
			await expect(failedSection.getByRole('button', { name: T.RETRY, exact: true })).toHaveCount(1);
			await expect(text(page, T.LIST_FAILED_TITLE), 'both sections claimed they could not be read').toHaveCount(
				1
			);
			await expect(
				text(keptSection, item.keptText),
				'the section that answered lost its own state'
			).toBeVisible();
			await expect(text(failedSection, item.failedText), 'a failed list drew an empty state instead').toHaveCount(
				0
			);
			await expect(section(page, 'embed-timer-code')).toHaveCount(0);

			// a failed read is retried on its own (use-embeds.ts:101-108), so its count is reported, never pinned
			const readBefore = served.countOf('GET', item.route);
			expect(readBefore, 'the failed list was never read').toBeGreaterThanOrEqual(1);
			expect(
				served.countOf('GET', CONFIG_ROUTE),
				'the config was not read before the lists'
			).toBeGreaterThanOrEqual(1);
			expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

			await failedSection.getByRole('button', { name: T.RETRY, exact: true }).click();
			// onRetry={() => refetch()} (:267, :429): the same read, asked again
			await expect.poll(() => served.countOf('GET', item.route), { timeout: 15_000 }).toBeGreaterThan(readBefore);

			report('list-refused', {
				which: item.which,
				status: refusal.status,
				// not pinned: a failed read is retried while failureCount < 2 (use-embeds.ts:101-108)
				listReadsBeforeRetry: readBefore,
				listReadsAfterRetry: served.countOf('GET', item.route),
				failedCopy: await failedSection.innerText(),
				keptCopy: await sectionText(page, item.which === 'origins' ? 'embed-credentials' : 'embed-origins'),
				excusedConsoleLines: [armedHttpError('GET', `${item.route}?organizationId=${organizationId}`, 502)],
				consoleErrors: shield.consoleErrors()
			});
			expect(
				consoleFindings(shield, [armedHttpError('GET', `${item.route}?organizationId=${organizationId}`, 502)]),
				'besides its own HTTP error line the page logged a console error'
			).toEqual([]);
		});
	}

	// ---------------------------------- 17. the timer embed code

	test('17 · the timer code section: the exact snippet of this lane, its own copy button, and nothing the page invented', async ({
		page,
		fixture,
		shield
	}) => {
		const organizationId = fixture.ids.organizationA;
		const served = await serveEmbeds(page, {
			config: { enabled: true, clientLimits: false, addMembers: false, personSignIn: true },
			origins: [],
			credentials: []
		});
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
		await signInAndVisit(page, fixture, EMBEDS_PATH);

		const codeSection = section(page, 'embed-timer-code');
		await expect(codeSection).toBeVisible({ timeout: 25_000 });
		await expect(page.getByRole('heading', { level: 2, name: T.TIMER_CODE_TITLE, exact: true })).toHaveCount(1);
		await expect(text(page, T.TIMER_CODE_TEXT)).toBeVisible();
		// the three sections in order (:514-520): sites, then the code, then the credentials
		expect(
			await page
				.locator('main section[id]')
				.evaluateAll((nodes) => nodes.map((node) => node.id).filter((id) => id.startsWith('embed-'))),
			'the sections are not in the measured order'
		).toEqual(['embed-origins', 'embed-timer-code', 'embed-credentials']);

		// what probe-3.log P3 printed, attribute by attribute: the mock's own API, this app's own address, this organization
		const expectedCode = [
			`<script type="module" src="${EMBED_SCRIPT_PATH}"></script>`,
			'<ever-teams-timer',
			// one attribute per line, each tab-indented; the closing `>` is not (`embed-timer-code.ts:31-45`)
			`\tapi-url="${MOCK_API_ORIGIN}/api"`,
			'\tsign-in="ever-teams"',
			`\torganization="${organizationId}"`,
			`\tapp-url="${APP_ORIGIN}"`,
			'></ever-teams-timer>'
		].join('\n');
		const codeLocator = codeSection.locator('code');
		await expect(codeLocator).toHaveCount(1);
		await expect(codeLocator).toHaveText(expectedCode);
		expect(await codeLocator.innerText(), 'the code the page shows is not the one probe-3.log measured').toEqual(
			expectedCode
		);

		const copyButton = page.getByRole('button', { name: T.TIMER_CODE_COPY, exact: true });
		await expect(copyButton).toHaveCount(1);
		await expect(copyButton).toHaveAttribute('aria-label', T.TIMER_CODE_COPY);
		await copyButton.click();
		const copyOutcome = {
			copied: await text(page, T.TIMER_CODE_COPIED).count(),
			failed: await text(page, T.TIMER_CODE_NOT_COPIED).count(),
			statusRegions: await codeSection.locator('output').count(),
			appToasts: await appToasts(page).count()
		};
		// the button keeps its name and the copy is said in a status region beside it (:63-94)
		await expect(copyButton, 'the copy button lost its name after one click').toHaveCount(1);
		await expect(copyButton).toHaveAccessibleName(T.TIMER_CODE_COPY);
		expect(copyOutcome.failed, 'the page said the code could not be copied').toBe(0);
		expect(copyOutcome.appToasts, 'a toast spoke beside the code section').toBe(0);
		await expect(text(page, T.NO_ORIGINS), 'the code section replaced the sites empty state').toBeVisible();
		await expect(
			text(page, T.NO_CREDENTIALS),
			'the code section replaced the credentials empty state'
		).toBeVisible();
		await expect(switches(page)).toHaveCount(0);

		report('timer-code', {
			code: await codeLocator.innerText(),
			codeLength: (await codeLocator.innerText()).length,
			copyButton: await copyButton.evaluate((node) => ({
				ariaLabel: node.getAttribute('aria-label'),
				title: node.getAttribute('title')
			})),
			copyOutcome,
			sectionOrder: await page
				.locator('main section[id]')
				.evaluateAll((nodes) => nodes.map((node) => node.id).filter((id) => id.startsWith('embed-'))),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 18. the API dropped the option it was asked for

	for (const item of [
		{ dropped: 'client' as const, failedText: T.CREATE_FAILED, otherText: T.ADD_MEMBERS_FAILED },
		{ dropped: 'members' as const, failedText: T.ADD_MEMBERS_FAILED, otherText: T.CREATE_FAILED }
	]) {
		test(`18 · a create whose ${item.dropped === 'client' ? 'client' : 'members'} option the API dropped: its words, its secret never shown, and the revocation`, async ({
			page,
			fixture,
			mock,
			shield
		}) => {
			const droppedId = 'dropped-1';
			const served = await serveEmbeds(page, {
				config: { enabled: true, clientLimits: true, addMembers: true, personSignIn: false },
				clients: [{ id: 'served-client-1', name: 'Probe Client One' }],
				create: {
					credential: {
						id: droppedId,
						name: 'Dropped option credential',
						prefix: 'gze_dropped',
						// the answer this case is about: the option the form asked for is missing from it
						organizationContactId: item.dropped === 'client' ? null : 'served-client-1',
						canAddMembers: item.dropped === 'members' ? false : true,
						createdAt: dayIso(0),
						lastUsedAt: null,
						secret: `gze_scratch_dropped_${Math.random().toString(36).slice(2, 18)}`
					}
				}
			});
			await signInAndVisit(page, fixture, EMBEDS_PATH);
			await expect(createButton(page)).toBeEnabled({ timeout: 25_000 });
			const dialog = await openCreateDialog(page);
			await dialog.locator('input').first().fill('Dropped option credential');
			if (item.dropped === 'client') {
				await dialog.getByRole('combobox').click();
				await page.getByRole('option', { name: 'Probe Client One', exact: true }).click();
			} else {
				await dialog.getByRole('checkbox').click();
				await expect(dialog.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
			}
			await submitIn(dialog).click();

			// createFailureOf (create-embed-credential-dialog.tsx:173-178): the members case has its own sentence, the
			// client case falls through to CREATE_FAILED — see the header's Findings
			await expect(text(dialog, item.failedText), `${item.dropped}: the drop was never said`).toBeVisible({
				timeout: 25_000
			});
			await expect(text(dialog, item.otherText), `${item.dropped}: the other sentence was raised`).toHaveCount(0);
			await expect(
				text(dialog, T.ADD_MEMBERS_NOT_REVOKED),
				`${item.dropped}: the page claimed the revocation had failed`
			).toHaveCount(0);
			await expect(
				text(dialog, T.SECRET_TITLE),
				`${item.dropped}: the secret of a revoked credential was shown`
			).toHaveCount(0);
			await expect(
				dialog.getByRole('button', { name: T.DONE, exact: true }),
				`${item.dropped}: Done was offered`
			).toHaveCount(0);
			await expect(dialog, `${item.dropped}: the form closed on its own`).toHaveCount(1);

			// embeds.service.ts:149-161: the credential is revoked at once, which is what the list re-read then shows
			const writes = served.calls
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`);
			expect(writes, `${item.dropped}: the calls are not create then revoke`).toEqual([
				`POST ${CREDENTIALS_ROUTE}`,
				`DELETE ${CREDENTIALS_ROUTE}/${droppedId}`
			]);
			expect(
				served.countOf('POST', CREDENTIALS_ROUTE),
				`${item.dropped}: the create was sent more than once`
			).toBe(1);
			expect(
				served.countOf('DELETE', `${CREDENTIALS_ROUTE}/${droppedId}`),
				`${item.dropped}: the credential the API dropped was not revoked`
			).toBe(1);
			expect(
				served.credentials(),
				`${item.dropped}: the revoked credential is still listed by the fake server`
			).toEqual([]);
			expect(
				served.countOf('GET', CONFIG_ROUTE),
				'the config was not read again after the revocation'
			).toBeGreaterThanOrEqual(2);
			await expect.poll(() => titlesIn(page, 'embed-credentials'), { timeout: 15_000 }).toEqual([]);
			await expect(text(page, T.NO_CREDENTIALS), 'the revoked credential left no empty state').toBeVisible();
			expect(await appToasts(page).count(), 'the global fallback toast spoke beside the dialog').toBe(0);
			expect((await mock.calls('embed')).length, 'the mock heard a call this file answered').toBe(0);

			report('dropped-option', {
				dropped: item.dropped,
				failedText: item.failedText,
				secretShown: await text(page, T.SECRET_TITLE).count(),
				writes,
				configReads: served.countOf('GET', CONFIG_ROUTE),
				listReads: served.countOf('GET', CREDENTIALS_ROUTE),
				rows: await titlesIn(page, 'embed-credentials'),
				credentialsStillInStore: served.credentials().length,
				calls: served.calls.map((call) =>
					decodeURIComponent(`${call.method} ${call.path}${call.query ? `?${call.query}` : ''}`)
				),
				consoleErrors: shield.consoleErrors()
			});
			// both writes answered: only the mutation itself failed, which `Mutation failed:` names (DEV_MUTATION_NOISE)
			expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
			await cancelIn(dialog).click();
		});
	}
});
