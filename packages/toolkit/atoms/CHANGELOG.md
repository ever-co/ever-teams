# @ever-teams/atoms

## 0.4.0

### Minor Changes

- 9809ecf: Published as one file per module, in ESM (`dist`) and CommonJS (`dist/cjs`), with `exports` conditions `import` and `require`, each with its own declarations (`dist/cjs/*.d.ts` for CommonJS callers; TypeScript also resolves them on `"moduleResolution": "node16"` and `"nodenext"`), and `./styles.css`. Every client module keeps its `"use client"` directive and `TeamsProvider` gets one, so a Next.js App Router layout or page can import `TeamsProvider` and the timers without a wrapper file. `@ever-teams/api`, `@ever-teams/toolkit-ui` and `@ever-teams/toolkit-types` are no longer bundled and are required with real ranges, so a host that also installs `@ever-teams/api` has one copy and one `apiConfigManager`. The published declarations no longer contain the source's path aliases. `theme-ui`, `@emotion/react` and `next-themes` are peers only.
- 0749b96: `TeamsProvider` takes `config.getToken`, which signs people in from the host's backend: the kit asks it for a short-lived token at start, shortly before the token expires and once after the API refuses it, keeps the token in memory only, asks for no password or token in the page (`TeamsLoginDialog` says to sign in to the site instead), reads the organization from the token and lists no other. Without `getToken` nothing changes, except a one-time console warning that the password and token sign-in ask for an Ever Teams credential inside the page. A token renewed for the same person keeps the timer's status on screen.
- 9fd329e: The timers and the sign-in forms say what went wrong, inside the widget instead of a red toast on the host page: "This site isn't allowed to show Ever Teams", "Your session ended" (with a "Sign in again" action), "You don't have permission to track time in this workspace" or "Ever Teams is unreachable", in English and French. A request that gets no answer is told apart with a no-cors request to the API (at most 5 seconds): the site is not allowed when the API answers, Ever Teams is unreachable when it does not. Going offline shows the unreachable message at once, and the next successful read clears it; a page that loaded while Ever Teams was unreachable reads the user again once the browser is back online or the page regains focus. A wrong password or a refused token keeps the form's own message, and any other refusal keeps the API's text.
- 20cca98: `TeamsProvider` takes `branding` (default `true`): with `branding={false}`, the "Powered by Ever Teams" line under the kit's forms, reports and team widgets is not drawn. Without the option nothing changes.
- ab417cb: `TeamsClientTimeReport` shows a client the time spent on its projects (today, this week, and this week by project) from what the host's backend returns through `getReport`, in the `IClientTimeReport` shape (new in `@ever-teams/toolkit-types`). A backend that reads it from the Ever Teams API calls `POST /api/embed/client-report` with an embed credential limited to that client, so no token reaches the client's browser; a backend may also return its own figures. Nothing changes for the existing components.
- 7f64ba8: `TeamsProvider` takes `onTimerChange`, called with a `TimerChange` at the first read of the person's timer (`initial: true`) and at each start, stop or other running entry a later read shows, once, wherever it was made. It hears the reads the kit already makes while one of its timers is on the page (on load, every minute while the page is visible, on focus, when the network comes back): no request is added. The package exports the `TimerChange` type. Without the prop nothing changes.
- a51ba41: `TeamsProvider` takes `config.signIn: 'ever-teams'` with `config.appUrl` (`https://app.ever.team` by default) and `config.organizationId`, for a site without a server: `TeamsLoginDialog` shows a "Sign in with Ever Teams" button (fr: "Se connecter avec Ever Teams") that opens the web app's `/embed/authorize` in a popup, where the person allows the site. The kit takes the popup's answer only from the web app's origin, from that window and with the one-time state it put in the popup's address, keeps the timer token in memory and the renewal token in `localStorage` under a key of its own for its API address and organization, and renews about a minute before expiry, one tab at a time (Web Locks, else a lock in `localStorage`). An ended sign-in (`EMBED_GRANT_ENDED`) is forgotten and the button shows again; the user menu signs out by forgetting it, then revoking it. A provider without `signIn` works as before; `getToken` wins when both are given.
- b787bea: A host can sign the person out of a sign-in with Ever Teams from its own sign-out, on a computer people share: `useSiteSignIn()` gives the controls the user menu uses (`signOut()` shows the button again), `endSiteSignIn({ apiUrl, organizationId })` ends a saved sign-in when no provider shows it, and `<ever-teams-timer>` gets `signOut()`, which does the same from the page, also once the element is removed.
- 3ed4ae8: `defaultTheme` uses the Ever Teams web app's flat primary (`#3826A6`) for its main and border colors, so buttons, tabs, progress circles and focused fields drawn with the theme match the web app. The gradient it had is exported as `gradientTheme` and offered in `TeamsThemeToggle` as "Purple gradient": pass `theme={gradientTheme}` to keep it.
- 9ac0471: The sign-in and registration forms name each field with its label (a click on the label reaches the field, screen readers announce it), drop the colon after the labels, say a refused sign-in on the kit's error notice, and read like the web app's sign-in: title on the auth scale, the design system's field surface, links in the theme's primary. Their buttons, and the default buttons of `TeamsLoginDialog` and `TeamsRegistrationDialog`, read in the kit's locale ("Sign In", "Register Now" in English, "Se connecter", "S'inscrire maintenant" in French) instead of hard-coded English capitals, and the token form's button stays disabled while the token is checked. The theme's color on buttons and tabs is unchanged.
- 2fb51f5: Inside the kit root (`scopedStyles`), the widgets and their dialogs draw in the Ever Teams web app's font, the system UI face, instead of the host page's font; nothing is downloaded and the host page keeps its own font. A host that wants its font in the widgets sets `--ever-teams-kit-font` (for example on `:root`). A font picked with the font toggle still wins.
- 92834f8: The basic, custom, essential and extra timers show a small "Today" caption before their time, which is the time tracked today (screen readers hear it too, in the button's description). A host can replace it or drop it with the new `caption` prop of the timers (`caption={null}`).

### Patch Changes

- fc7f6ac: Dialogs have a title for screen readers. `Dialog` renders a given `title` as the dialog's title (it printed the bare text and left the dialog unnamed), and the new `hideTitle` prop keeps that title for screen readers only (a `description` stays visible). The sign-in, registration, member invitation and team creation dialogs of atoms use it, so they no longer trigger Radix's "DialogContent requires a DialogTitle" error; the sign-in and registration dialogs are named after the form they show, through the new `onModeChange` prop of `TeamsLoginForm` and `TeamsRegistrationForm`.
- 53802c1: Each package now ships the text of the MIT license its manifest declares, in a `LICENSE` file.
- 477ee1e: `getOrganisationTeams` takes `embedded`: a read with a token from the host's `getToken` asks only for the member's teams, by organization and member, as the API's embed guard allows. With `getToken`, the timer's team picker reads its teams that way. The team members widget no longer breaks on teams read without their members.
- 01552c3: A Tab that a control of a dialog in a shadow root handles itself is left to it, and a `lang` a host changes applies even when the provider already held that value.
- 95d561d: Rendered in a shadow root, the kit root opens its dialogs, popovers and menus in that shadow root instead of `document.body`, and a dialog there takes the focus itself instead of focusing each of its elements in turn (the sign-in dialog opened on its Token tab). In a page nothing changes.
- acbcbb7: `getEmbedProjects(token, tenantId)` reads `GET /embed/projects` with the tenant in the `Tenant-Id` header: the projects a token from the host's `getToken` may track time on (ever-co/ever-gauzy#12080). An API without that route answers an error that keeps its 404 or 403 status; a read with no answer, or an answer that is not a list, comes back as a message with no status. `Select` takes `emptyMessage`, what its list says when it has no item ("No item found" without it). With `getToken`, the timer's project picker lists those projects, and its list says while they are read, when there is none (also on an API without the route) and when they could not be read (any refusal but an older API's 404 or 403 `EMBED_SCOPE`, such as 403 `EMBED_TOKEN_REQUIRED`), in English and French. A failed read is made again with the next token; a list read stays through token renewals, and is no longer shown once the host signs the person out. A project remembered from an earlier entry that the list does not hold (an empty list too) is let go, and picking another project lets the remembered task and client go: the task and client pickers list nothing to change them, and the API refuses a start with a task of another project. `useEmployeeOrganization`, `useMyTasks` and `useOrganizationProjects` no longer send a read the token cannot make: they answer an empty list, so the client and task pickers stay empty with no red notice. Without `getToken` nothing changes.
- 0232701: Two `TeamsProvider` (or two `<ever-teams-timer>` elements) of one page keep the `colorScheme` each was given: the last one to load no longer sets the scheme of every widget of the page. A scheme a person picks with the theme toggle still applies to every widget, until the host changes the `colorScheme` of one of them.
- db7b67d: Each `TeamsProvider` sends the requests of its components (sign-in, the person's reads, the timer and its pickers, the reports, the team and profile forms, the sessions list) to its own `config.apiUrl`: two providers of a page, or two `<ever-teams-timer>` elements with two `api-url`, no longer send everything to the address set last. A provider without `apiUrl` follows `apiConfigManager` as before, its sessions list included, and every provider still sets it. A provider whose `apiUrl` changes, or without one, whose page's address changes, starts its state afresh, as it does when `getToken` is turned on or off, so an answer of the previous address never shows in the new one's widgets, nor a toast of its errors.
- 793749a: The session a sign-in saves in `localStorage['_teams-store']` names the API address that issued its token: a `TeamsProvider` reads back only the session of the address it sends to, so a page for one server no longer sends another server's token to it, nor says "Your session ended" for a server nobody signed in to there. A sign-out or "Sign in again" removes the session of that address only, and a provider whose `apiUrl` changes starts its session afresh. A site with one server keeps the shape it had under that key; a session saved by an earlier version is kept by the first provider that reads it. `updateSession` takes the address as an optional third argument.
- 0748cfa: The kit's notices (a blocked window, an unreachable server, an API error, a sign-in refusal, the client report's failure) are drawn on the kit's own background with their tint laid over it, instead of a tint over transparency, so they stay readable in the dark scheme on a light host page. In the dark scheme their action ("Try again", "Sign in again") takes the kit's light purple, which reads at more than 4.5:1 on the dark surface. The light scheme looks as before.
- eb15010: Signed out while the timer runs (the host's `getToken` fails, a credential is revoked, a sign-in with Ever Teams ends), the kit's signed-out prompt now says that the timer keeps running in Ever Teams until the person stops it there, instead of showing a stopped timer and nothing else. It says so when the last timer status the kit read before the sign-out showed the timer running: with no status read (no timer widget on the page), the prompt is the same as before.
- 5079548: The kit's daily statistics ("Worked today" and the day's projects, tasks and activities) count today from local midnight, as the web app does, instead of the last 24 hours. `@ever-teams/toolkit-ui` adds `getTodaySoFar()`; `getStartAndEndOfDay()` keeps its window for anyone who calls it.
- a05f538: After a start or stop the API refuses (the timer was already stopped or started in another tab or app), every timer widget of the page reads the status again before it shows the refusal, so it shows the timer as it is instead of the stale state.
- dcb4773: `isEmbedToken` tells an embed token from another one. With an embed token (from the host's `getToken` or a sign-in with Ever Teams), the report widgets read nothing and say "Open Ever Teams to see this." instead of showing zeros and "Failed to fetch".
- b41149f: `CollapseIcon` joins `ExpandIcon`: both draw in the text color, are hidden from screen readers (the control that draws them carries the name), and take an optional `size`. The modern timer's toggle is named "Show timer details" or "Hide timer details", tells whether it is unfolded, and folds back with the collapse icon instead of a hyphen.
- 3cc10f2: The password and token sign-in forms say that the site cannot sign people in that way, and to ask the site's team for the sign-in with Ever Teams, instead of sending them to their workspace admin.
- b4d9cda: `TeamsTimesheet` draws its loader over its table from outside it, so the console no longer reports a `<div>` inside a `<tbody>` each time the time logs load, and the table's rows stay in place while they load.
- 5080c9f: The report, the project, task and app lists and the timesheet fit a narrow page: each keeps its width as a maximum and shrinks below it, a list row keeps its figures whole, the timesheet's filters and the report's header wrap, and a long employee name no longer widens the report's header or the timesheet's filters.
- f9ece63: The kit's French strings carry their accents and its timer reads "Minuteur"; the English activity card reads "Weekly activity".
- fa78bce: A stop refused because the timer was already stopped elsewhere says "Your timer was already stopped." in the kit's language, instead of the API's English text.
- 1b51134: The report, the project list, the task list and the apps and URLs list follow the employee picked in "Select employee", as the worked time card does; with "All employees", each reads the signed-in person's own as before. A person who may not pick an employee reads their own in every one of them, the worked time card included, whatever employee the kit holds.
- 06b0e54: `TeamsProvider`'s `token` prop, which the provider never read, is marked deprecated, and passing it warns once in the console with the sign-in options the kit reads: `config.getToken`, `config.signIn: 'ever-teams'` or the kit's sign-in dialog (`TeamsLoginDialog`).
- 9e4ce35: `TeamsTimesheet` and `TeamsTeamsViewer` name no organization while none is known (signed out, or the organizations not read yet): "Timesheets" and "Teams" instead of "Timesheets for Ever" and "Teams for Ever".
- 64c1d6a: The kit's password sign-in lists the workspaces an email and password open, as the web app does: with one, it signs in at once as before; with several, the person picks the one to sign in to, instead of landing in the account updated last. `authSignInWorkspace({ email, token })` signs in to one workspace of `authWithEmailPassword`'s list.
- ae39d65: The kit's password sign-in asks an account with two-factor sign-in on for the code of its authenticator app, or a recovery code, instead of saying the person may not track time. `authVerifyTwoFactor({ challenge, code })` (or `recoveryCode`) completes a sign-in the API answered with `TWO_FACTOR_REQUIRED`.
- 2d89212: A person the site signs in from its backend, whom Ever Teams refused (no account, time tracking off, no longer a member), reads that they may not track time in the workspace instead of "Sign in to this site to use your Ever Teams timer.": a `config.getToken` that throws an error with the code `EMBED_MEMBER_NOT_ALLOWED`, or a `token-url` that answers 403 with `{ "code": "EMBED_MEMBER_NOT_ALLOWED" }`, as the route handlers of the `@ever-teams/api` README now do.
- 8f378fd: The account button of `TeamsLoginDialog` is named for screen readers after the person whose menu it opens ("Lina Moreau: account menu", in English and French; "Account menu" for an account with no name, never the email); the avatars next to a name already said are decorative, and an avatar shown alone is described by the person's name.
- 7d445db: The employee picker of the reports keeps its gap between the label and the select: a stray `}` in its class list (`gap-2}`) meant the gap was never applied.
- e39c992: `TeamsProvider` applies a `lang` the host changes after mount at once, and no longer saves the `lang` it is given as the person's choice: only a language picked in the language switch is kept for later visits, so each page of a site gets its own `lang`.
- e72a8ac: `@ever-teams/api`, `@ever-teams/toolkit-ui` and `@ever-teams/atoms` require `@ever-teams/toolkit-types` `^0.2.0`, and `@ever-teams/atoms` requires `@ever-teams/toolkit-ui` `^0.3.0`. The `^0.1.10` range let a 0.1 `@ever-teams/toolkit-types` in, which has no `TimerSource.EMBED`: the timer then started and stopped without its source.
- Updated dependencies [39b3d59]
- Updated dependencies [fc7f6ac]
- Updated dependencies [53802c1]
- Updated dependencies [c608a95]
- Updated dependencies [477ee1e]
- Updated dependencies [7678d4b]
- Updated dependencies [01552c3]
- Updated dependencies [95d561d]
- Updated dependencies [ab417cb]
- Updated dependencies [acbcbb7]
- Updated dependencies [db7b67d]
- Updated dependencies [393b479]
- Updated dependencies [935bdb2]
- Updated dependencies [7f01171]
- Updated dependencies [7f64ba8]
- Updated dependencies [7f64ba8]
- Updated dependencies [a25c4de]
- Updated dependencies [a51ba41]
- Updated dependencies [5ae4385]
- Updated dependencies [608d55d]
- Updated dependencies [5079548]
- Updated dependencies [7ea42f5]
- Updated dependencies [20a949e]
- Updated dependencies [dcb4773]
- Updated dependencies [6024c81]
- Updated dependencies [b41149f]
- Updated dependencies [c0f16bf]
- Updated dependencies [464d3b0]
- Updated dependencies [1565902]
- Updated dependencies [75c31d1]
- Updated dependencies [64c1d6a]
- Updated dependencies [ae39d65]
- Updated dependencies [02ff88c]
- Updated dependencies [e72a8ac]
    - @ever-teams/api@0.3.0
    - @ever-teams/toolkit-types@0.3.0
    - @ever-teams/toolkit-ui@0.4.0

## 0.3.0

### Minor Changes

- 6f81d39: `@ever-teams/atoms/styles.css`: the components' styles, compiled, without Tailwind's preflight and scoped under the kit root, so a host needs no Tailwind and the stylesheet changes nothing outside the kit. Use it with the new `scopedStyles` prop: `import '@ever-teams/atoms/styles.css'` and `<TeamsProvider config={{ apiUrl }} scopedStyles>`. Without the prop nothing changes: hosts that compile the kit's classes with their own Tailwind keep working as before.
- 97a1dee: The kit leaves the host page alone. Two visible changes: the widgets use the host's font until a person picks one in `TeamsFontToggle` (no Geist by default), and fonts are requested from Google Fonts only with the new `loadGoogleFonts` prop. theme-ui no longer writes styles on `html`, `body` or every element, nor stores a color mode. With `scopedStyles`, the picked font and the color scheme stay on the kit root (new `colorScheme` prop: `'light' | 'dark' | 'system'`, default `'system'`), nothing is written on `<html>`, and a sign-out keeps the page where it is. The new `onSignOut` prop is called after a sign-out from the user menu; without `scopedStyles` and without `onSignOut`, the kit still sends the browser to `/` and warns once, and a picked font still goes on `document.body` with a warning. Pass `onSignOut={() => { window.location.href = '/'; }}` to keep the redirect. The picked font is stored under `ever-teams:selected-font`; a choice stored under the old `selected-font` key is carried over.
- 5e62495: The basic, custom, essential and extra timers draw their own surface: a card with a ring and a soft shadow in the kit's tokens, so the widget reads the same in light and dark on any host page. The digits use the text color with tabular, lining figures. The basic timer's play control is a filled chip in the brand color that turns red with a stop sign while the timer runs (the other three keep their own icons). `background="none"` (with `rounded="none"`) gives back the bare digits of earlier versions.
- 31ed804: One timer status per `TeamsProvider`: every timer widget of a page shows the same timer, read once every 60 s while the page is visible (the Ever Teams web app's rate; it was every 30 s per widget, background tabs included), and at once on focus, on return to the page and when the browser is back online. A start or a stop in one widget updates the others at once, and the running time comes from the server; while one runs, every widget shows it as loading and a second start or stop, from any widget, is ignored. The start and stop control of each timer is named "Start timer" or "Stop timer" for screen readers, and a polite live region announces "Timer started" and "Timer stopped". New strings in English and French.

### Patch Changes

- Auto-generated patch version bump for SDK changes
- af51d8d: `TeamsProvider` reads tracking sessions only while a component that shows them (filter, insights, heatmap, replay) is on the page, and always from the kit's own API. A page with a timer alone makes no session request. This release also carries the fix of October 17: without `config.apiUrl`, the published 0.2.14 sent the signed-in user's token to the demo Gauzy API.
- ce625a1: Theme colors (`mainColor`, `borderColor`) reach `ThemedButton`, `Progress`, `TabsListThemed`, the timer button, the token sign-in button and the bordered reports as inline styles, through the new `useThemeColor` hook. Under the kit root of `scopedStyles`, the components' utility classes no longer replace a theme's plain color.
- a96e076: README: a quick start for Next.js (App Router) and Vite, the configuration of `TeamsProvider`, where tokens live today and what is planned, and troubleshooting (unstyled widget, CORS, `apiUrl` without `/api`).
- e885587: The kit's timers now start and stop with `source: 'EMBED'`, so managers can tell embedded time from the web app's in reports. Against an API that does not know that source yet (a 400 naming `source`), the kit sends the request again with `TEAMS`, as before, and keeps `TEAMS` for that API for the rest of the page: nothing changes for hosts on an older API. `currentTimerSource()` tells which one is in use.
- Updated dependencies
- Updated dependencies [bb7c0e5]
- Updated dependencies [b195f4d]
- Updated dependencies [ce625a1]
- Updated dependencies [bc585f3]
- Updated dependencies [d166bc2]
- Updated dependencies [1221223]
- Updated dependencies [e885587]
    - @ever-teams/api@0.2.1
    - @ever-teams/toolkit-ui@0.3.0
    - @ever-teams/toolkit-types@0.2.0

## 0.2.14

### Patch Changes

- Timesheet Report and Nextjs Removal

## 0.2.13

### Patch Changes

- 410458f: Refactored SDK request structure
- Updated dependencies [410458f]
    - @ever-teams/api@0.1.9
    - @ever-teams/toolkit-ui@0.2.6

## 0.2.12

### Patch Changes

- Class name build includes
- Updated dependencies
    - @ever-teams/toolkit-ui@0.2.5

## 0.2.11

### Patch Changes

- Raw class exportations
- Updated dependencies
    - @ever-teams/toolkit-ui@0.2.4

## 0.2.10

### Patch Changes

- This patch is a fix of nodejs packages not available on browser : utils, process, ...

## 0.2.9

### Patch Changes

- Tracking Package First version and integration in other packages
- Updated dependencies
    - @ever-teams/types@0.1.10
    - @ever-teams/api@0.1.8
    - @ever-teams/toolkit-ui@0.2.3

## 0.2.8

### Patch Changes

- Introduced team management
- Updated dependencies
    - @ever-teams/api@0.1.7
    - @ever-teams/types@0.1.9
    - @ever-teams/toolkit-ui@0.2.2

## 0.2.7

### Patch Changes

- Refac Teams Sign Components, Add language support with i18n.
- Updated dependencies
    - @ever-teams/api@0.1.6
    - @ever-teams/types@0.1.8
    - @ever-teams/toolkit-ui@0.2.1
