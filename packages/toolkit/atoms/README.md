# Atoms

`@ever-teams/atoms` puts a live Ever Teams timer, and the reports around it, inside your own React product. The
timer is the same one your team uses in the Ever Teams web, desktop and mobile apps: start it here, see it running
there. The time is recorded as embedded time (`source: 'EMBED'`), so reports tell it apart; on an API too old to know
that source, the kit records it as `TEAMS`. MIT licensed.

Components to browse: [storybook.ever.team](https://storybook.ever.team). Example apps:
[packages/toolkit/examples](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples).

## Quick start

You need a React app (tested with React 19) and an Ever Teams API: the cloud (`https://api.ever.team/api`) or your
own server (its address ending with `/api`).

```bash
npm install @ever-teams/atoms
```

```tsx
'use client';
import '@ever-teams/atoms/styles.css';
import { TeamsProvider, TeamsLoginDialog, TeamsBasicTimer } from '@ever-teams/atoms';

export function EverTeamsTimer() {
	return (
		<TeamsProvider config={{ apiUrl: 'https://api.ever.team/api' }} scopedStyles>
			<TeamsLoginDialog />
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

`@ever-teams/atoms/styles.css` holds the components' styles, compiled and scoped under the kit root that
`scopedStyles` renders: your app needs no Tailwind, and the stylesheet changes nothing outside the kit. It ships from
the first release after 0.2.14; on 0.2.14, style the kit with your own Tailwind (below).

### With your own Tailwind CSS 4

If your app compiles Tailwind CSS 4 already, you can leave out the `styles.css` import and `scopedStyles`, and let
your Tailwind see the kit's class names instead, in the CSS file that has `@import "tailwindcss";` (paths are
relative to that file):

```css
@import 'tailwindcss';
@source "../node_modules/@ever-teams/atoms/dist";
@source "../node_modules/@ever-teams/toolkit-ui/dist";
```

The `../` paths fit `app/globals.css` in Next.js and `src/index.css` in Vite; with a Next.js `src/` directory the file
is `src/app/globals.css` and the paths start with `../../`.

These lines only let Tailwind generate the kit's classes. Their colors come from tokens your theme must then define:
the kit's colors (`primary`, `secondary`, ...), the CSS variables they read (`--background`, `--primary-foreground`,
...) and the `tailwindcss-animate` plugin, as the kit's own [`kit.css`](https://github.com/ever-co/ever-teams/blob/develop/packages/toolkit/atoms/src/styles/kit.css) declares them. The kit publishes no
Tailwind preset for this, so without that setup those components lose their colors: unless you need your own
Tailwind to compile the kit, use `styles.css`.

## Next.js (App Router)

1. `npx create-next-app@latest my-app` (TypeScript, App Router), then `cd my-app` and
   `npm install @ever-teams/atoms`.
2. Create `app/ever-teams-timer.tsx` (`src/app/ever-teams-timer.tsx` with a `src/` directory) with the component of
   the quick start. The `'use client'` line is required: the provider uses state and the browser.
3. Use it in a page:

```tsx
// app/page.tsx
import { EverTeamsTimer } from './ever-teams-timer';

export default function Page() {
	return <EverTeamsTimer />;
}
```

## Vite + React

1. `npm create vite@latest my-app -- --template react-ts`, then `cd my-app` and `npm install @ever-teams/atoms`.
2. Replace `src/App.tsx` (`src/main.tsx` imports it as the default export):

```tsx
import '@ever-teams/atoms/styles.css';
import { TeamsProvider, TeamsLoginDialog, TeamsBasicTimer } from '@ever-teams/atoms';

export default function App() {
	return (
		<TeamsProvider config={{ apiUrl: 'https://api.ever.team/api' }} scopedStyles>
			<TeamsLoginDialog />
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

## Configuration

| Prop of `TeamsProvider` | Default                     | What it does                                                                                                                                                                                                                                                 |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config.apiUrl`         | `https://api.ever.team/api` | The Ever Teams API every request goes to, with the token in the `Authorization` header. Always set it. With your own server, give its address ending with `/api`.                                                                                            |
| `config.getToken`       | none                        | Signs people in from your backend: see [Sign in from your backend](#sign-in-from-your-backend). Without it, the sign-in dialog asks for an Ever Teams password or token inside your page.                                                                    |
| `config.signIn`         | none                        | `'ever-teams'`: a "Sign in with Ever Teams" button opens the web app in a popup, for a site without a server: see [Sign in with Ever Teams](#sign-in-with-ever-teams). Ignored when `getToken` is given.                                                     |
| `config.appUrl`         | `https://app.ever.team`     | The Ever Teams web app the popup opens, with `signIn: 'ever-teams'`.                                                                                                                                                                                         |
| `config.organizationId` | none                        | The organization the site signs people in to, with `signIn: 'ever-teams'`.                                                                                                                                                                                   |
| `lang`                  | `'en'`                      | Language of the components: `'en'` or `'fr'`. A language chosen earlier in the language switch, kept in `localStorage`, wins.                                                                                                                                |
| `theme`                 | `defaultTheme`              | A theme object: `defaultTheme` (flat), `gradientTheme` and `theme1` to `theme14` are exported.                                                                                                                                                               |
| `scopedStyles`          | `false`                     | Renders the kit root that `@ever-teams/atoms/styles.css` is scoped under, and a container for the kit's dialogs and menus in `document.body` or its shadow root. Set it with the stylesheet; leave it off when your own Tailwind compiles the kit's classes. |
| `colorScheme`           | `'system'`                  | The widgets' color scheme inside the kit root (`scopedStyles`): `'light'`, `'dark'` or `'system'` (follows the system's). Nothing is written on `<html>`.                                                                                                    |
| `loadGoogleFonts`       | `false`                     | Lets the font toggle (`TeamsFontToggle`) load the font a person picks from Google Fonts. Off: no request to a third party, and the widgets keep the default font until a person picks one.                                                                   |
| `onSignOut`             | none                        | Called after a person signs out from the kit's user menu. Without it, the page stays where it is with `scopedStyles`; without `scopedStyles`, the kit sends the browser to `/`.                                                                              |
| `branding`              | `true`                      | Shows "Powered by Ever Teams" under the forms, reports and team widgets. `false` hides it everywhere.                                                                                                                                                        |
| `onTimerChange`         | none                        | Called with the person's timer at the first read of its status, then at each start or stop a later read shows, wherever it was made: see [Know when the timer starts or stops](#know-when-the-timer-starts-or-stops).                                        |

The widgets draw in the Ever Teams web app's font, the system UI face (nothing is downloaded), inside the kit root only: your page keeps its own. To give the widgets your page's font, set `--ever-teams-kit-font` on any parent of the widgets, or on `:root` so that their dialogs follow: `:root { --ever-teams-kit-font: Georgia, serif; }`.

Each `TeamsProvider` sends the requests of the components under it to its own `config.apiUrl`: two providers of a
page can reach two different servers. A provider without `apiUrl` uses the address set with
`apiConfigManager.setConfig()` of `@ever-teams/api` (`https://api.ever.team/api` by default), and starts afresh
when that address changes: the token, the person and the lists it holds in memory are dropped. It then reads back
only a session saved for the new address, if there is one, so a token never reaches another server, apart from a
session saved by an earlier version (see [Security](#security-where-tokens-live-today-and-what-is-planned)). Every
provider still writes its `apiUrl` there, for your own calls to the request functions of that package.

The API must accept your site's origin. With `getToken` or a sign-in with Ever Teams, an administrator adds your site
to the allowed sites in Settings > Workspace > Embeds of the web app; the API opens to it at once, on the routes the
timer needs. The kit's own password and token sign-in reaches other routes: on a self-hosted Gauzy API, add your site
to `ALLOWED_ORIGINS` (comma-separated) for it, and restart the API.

## Sign in from your backend

On a site that is not the Ever Teams workspace itself, do not let the kit ask for an Ever Teams password: your
backend already knows who is signed in. It exchanges an embed credential of the workspace for a short-lived token for
that person, and `config.getToken` hands it to the kit.

What you need: an Ever Teams API with embed credentials turned on (`GAUZY_EMBED_TOKENS_ENABLED=true`) and an embed
credential an administrator of the organization creates in Settings > Workspace > Embeds of the web app. Keep the
credential on your server, never in the page. Your site goes in the allowed sites on the same page: the backend sends
the page's origin with each exchange, and in a browser the token then works only from that site. Outside a browser
the origin is not checked, which is why the token reaches the timer only and lives a few minutes.

On your server, a route that answers the token for the person signed in to your product (Next.js route handler).
Its settings stay on the server, never in a `NEXT_PUBLIC_` variable: `EVER_TEAMS_API_URL` is the API's full address
ending with `/api` (`https://your-api.example.com/api`), and `EVER_TEAMS_EMBED_CREDENTIAL` is the embed credential.

```ts
// app/api/ever-teams-token/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session'; // your own sign-in

export async function POST() {
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
	}
	const answer = await fetch(`${process.env.EVER_TEAMS_API_URL}/embed/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			credential: process.env.EVER_TEAMS_EMBED_CREDENTIAL,
			email: user.email,
			// The site the widget runs on, as the organization allows it (https://app.example.com).
			origin: process.env.APP_ORIGIN
		}),
		cache: 'no-store'
	});
	if (!answer.ok) {
		return NextResponse.json({ error: 'No Ever Teams token' }, { status: answer.status });
	}
	const { token, expiresAt } = await answer.json();
	return NextResponse.json({ token, expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
}
```

`exchangeEmbedToken` of `@ever-teams/api/server` (the kit installs `@ever-teams/api`) makes this request in one call
and throws typed errors with a next step: see
[Sign people in from your server](https://github.com/ever-co/ever-teams/tree/develop/packages/api#sign-people-in-from-your-server),
with Express, plain `fetch` and plain HTTP for other languages.

In the page:

```tsx
'use client';
import { TeamsProvider, TeamsBasicTimer } from '@ever-teams/atoms';

async function getToken() {
	const answer = await fetch('/api/ever-teams-token', { method: 'POST' });
	if (!answer.ok) {
		throw new Error('Not signed in');
	}
	return answer.json(); // { token, expiresAt }
}

// userId: the person signed in to your product (null when nobody is).
export function Timer({ userId }: { userId: string | null }) {
	if (!userId) {
		return null;
	}
	// The key gives each person their own provider: a sign-in or a sign-out without a page load starts afresh.
	return (
		<TeamsProvider key={userId} scopedStyles config={{ apiUrl: 'https://your-api.example.com/api', getToken }}>
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

What the kit does with it:

- It calls `getToken` once at start, again about a minute before the token expires, and once more if the API
  refuses the token (until a request succeeds again). Calls never overlap: the widgets of a provider share one.
- The token stays in memory: nothing is written to `localStorage`, and the user menu shows no token and no sign-out.
- The kit reads the organization from the token and lists no other: the token reaches only the timer of that person.
- The project picker of `TeamsModernTimer` (expand the timer to see it; `TeamsBasicTimer` has none) lists the projects
  the token may track time on, read from `GET /api/embed/projects`
  ([ever-co/ever-gauzy#12080](https://github.com/ever-co/ever-gauzy/issues/12080)); against an API without that route
  it stays empty. The client and task pickers stay empty: the token reads no clients or tasks. Picking another project
  lets go of the task and client the timer remembers from an earlier entry.
- When `getToken` throws or rejects, or answers a token with no `expiresAt` or one less than 10 seconds away, the
  widgets show the person as signed out, and `TeamsLoginDialog` says "Sign in to this site to use your Ever Teams
  timer." instead of asking for a password. The kit asks again when the page comes back (focus, or the tab visible
  again), never sooner than 5 seconds after the failure. Signed out while the timer runs (the last status the kit read
  showed it running), it also says that the timer keeps running in Ever Teams until the person stops it there: a
  sign-out stops nothing.
- A token for another person or organization than the previous one starts a new session: the user is read again.
- When a person signs in to or out of your product without a page load, mount a new `TeamsProvider` (the `key` in the
  example) or unmount it. Unmounting is what clears the token and the profile the kit holds in memory: the token's
  expiry only limits how long the API accepts it.

## Sign in with Ever Teams

A site without a server of its own (a page made with a site builder, a static site) has no backend to exchange an
embed credential. With `config.signIn: 'ever-teams'`, the kit shows a "Sign in with Ever Teams" button instead of
the password dialog. It opens the Ever Teams web app in a popup, where the person signs in if they are not already and
allows the site to start and stop their timer. The popup hands the site a timer token and a renewal token, then
closes. The person never types their password in your page, and two-factor sign-in works as on the web app.

What the administrator turns on:

- the API has embeds on (`GAUZY_EMBED_TOKENS_ENABLED=true`) in a version with sign-in from sites
  ([ever-co/ever-gauzy#12094](https://github.com/ever-co/ever-gauzy/issues/12094));
- your site is one of the organization's allowed sites, and its switch "People can sign in from this site" is on, in
  Settings > Workspace > Embeds of the web app. It is off for every site until then.

```tsx
'use client';
import '@ever-teams/atoms/styles.css';
import { TeamsProvider, TeamsBasicTimer, TeamsLoginDialog } from '@ever-teams/atoms';

export function Timer() {
	return (
		<TeamsProvider
			scopedStyles
			config={{
				apiUrl: 'https://api.ever.team/api',
				signIn: 'ever-teams',
				appUrl: 'https://app.ever.team',
				organizationId: 'your-organization-id'
			}}
		>
			<TeamsLoginDialog />
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

What the kit does with it:

- The button opens `${appUrl}/embed/authorize` from the click, so the browser lets the popup open, with your page's
  origin, `organizationId` and a one-time state in its query. A second click opens that page again in the same
  window, in front, with a new state. A popup the browser blocked says to allow pop-ups for the site.
- It takes the popup's answer only from the web app's origin, from that popup window, and with the state of that
  opening: a message from another page or another window, or an answer to another opening, is ignored.
- The timer token stays in memory. The renewal token is saved in `localStorage`, under a key of its own
  (`ever-teams:site-sign-in:` and the API address and organization), for the API address that issued it and the
  organization it was allowed for: a reload stays signed in, the token of one server is never sent to another, and a
  timer set up for another organization asks the person to sign in for that one.
- About a minute before the timer token expires, the kit renews it with the renewal token (`POST /embed/renew`,
  without an `Authorization` header), and saves the new renewal token in place of the old one. Each renewal token
  works once, and the API ends the whole sign-in when one is presented twice, so the tabs of your site renew one at a
  time: under Web Locks where the browser has them, else under a lock written in `localStorage`. That fallback is best
  effort (a tab the browser freezes during a renewal can lose its lock): the API's reuse check then ends the sign-in,
  and the person signs in again.
- When the API says the sign-in ended (`EMBED_GRANT_ENDED`: revoked by the person or an administrator, expired
  after 30 days without a renewal, or a renewal token used twice), the kit forgets it and shows the button again. When
  it refuses for a reason it lifts later (the site removed from the allowed sites, its switch turned off, the person's
  time tracking off), the kit keeps the renewal token, shows the button, and tries again when the page comes back.
- The user menu offers to sign out: the kit forgets the sign-in, then asks the API to revoke it
  (`POST /embed/revoke`). When the API cannot be reached, the sign-in is forgotten in the browser all the same, but
  stays valid at the API until it expires: the person can revoke the site from the web app. A renewal on its way at
  that moment keeps nothing of its answer.
- As with `getToken`, the token reaches only that person's timer, from your site, and the kit lists no other
  organization.
- On a computer people share, sign the person out when your page signs its own user out: the sign-in is kept for
  the API address and organization, not for a user of your page, so the next person would get the same timer.
  Under the provider, `useSiteSignIn()` gives `signOut()`, which does what the user menu does and shows the button
  again. With no provider on the page, `endSiteSignIn({ apiUrl, organizationId })` forgets the saved sign-in and
  asks the API to end it.

A provider without `signIn` keeps the kit's own sign-in, and nothing above changes for it.

## Know when the timer starts or stops

`onTimerChange` tells your page what the person's timer does, so that it can show its own state next to the widgets:
"Lina is working on Fabrikam" while it runs, nothing once it stops.

```tsx
import { TeamsBasicTimer, TeamsProvider, type TimerChange } from '@ever-teams/atoms';
import { useState } from 'react';

export function TimerWithStatus() {
	const [timer, setTimer] = useState<TimerChange | null>(null);

	return (
		<TeamsProvider config={{ apiUrl: 'https://api.ever.team/api' }} onTimerChange={setTimer}>
			<TeamsBasicTimer />
			{timer?.running && <p>Working since {timer.startedAt}</p>}
		</TeamsProvider>
	);
}
```

The callback receives a `TimerChange`:

| Field       | What it holds                                                                                |
| ----------- | -------------------------------------------------------------------------------------------- |
| `running`   | Whether the timer runs. A running break reads as `false`, as the API answers it.             |
| `startedAt` | When the running entry started (an ISO date), `null` while the timer is stopped.             |
| `projectId` | The running entry's project, `null` while stopped or on no project.                          |
| `taskId`    | The running entry's task, `null` while stopped or on no task.                                |
| `initial`   | `true` for the first read, which tells the timer as it is; `false` for each change after it. |

- The first read is always told, running or not, with `initial: true`: your page can draw its state from it. After
  that, the callback runs once for each start, stop or switch to another running entry (another start, project or
  task) that a read shows, never twice for one change.
- It hears the reads the kit already makes while one of its timers (`TeamsBasicTimer` or another) is on the page: on
  load, every minute while the page is visible, when the page becomes visible again, when the window gets the focus
  back and when the network comes back. It adds no request. A start or a stop made in the kit's own widgets is told
  after the read that follows it; one made elsewhere (the web app, the desktop app, the browser extension) when a read
  that succeeds shows it. Those times are when the kit reads, not a deadline for the callback: a read can fail or come
  late. A start and a stop that both fall between two reads leave the timer as the last read saw it, so neither is
  told.
- Another person or organization starts afresh: its first read is told with `initial: true`. A read that fails tells
  nothing.
- An error your callback throws reaches the page as an uncaught error; the kit goes on reading.

A browser cannot hear a change sooner without a push channel the API does not open to other sites. When your page
needs it at once, have your server receive the API's webhooks (`verifyWebhook` of `@ever-teams/api/server`) and pass
them on to your page.

## A client's spent time

`TeamsClientTimeReport` shows one of your clients the time your team spent on its projects: today, this week, and
this week by project. It fits a client portal, where the client has no Ever Teams account: your server asks the Ever
Teams API for the report with an embed credential, and the widget only draws what your server returns. No token
reaches the client's browser, and the widget sends no request to Ever Teams: `getReport` is its only call.

What you need: an Ever Teams API with the client report route (`POST /api/embed/client-report`, coming with
[ever-co/ever-gauzy#12076](https://github.com/ever-co/ever-gauzy/issues/12076)), and an embed credential limited to
that client. The credential is what limits the report to that client: keep it on your server, never in the page, and
give each client's portal its own.

On your server, a route that answers the report to the people allowed to see the portal (Next.js route handler).
`EVER_TEAMS_API_URL` is the API's full address ending with `/api`, and `EVER_TEAMS_CLIENT_CREDENTIAL` the client's
embed credential, both server-side only (never a `NEXT_PUBLIC_` variable):

```ts
// app/api/client-report/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session'; // your own sign-in

export async function GET() {
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
	}
	const answer = await fetch(`${process.env.EVER_TEAMS_API_URL}/embed/client-report`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ credential: process.env.EVER_TEAMS_CLIENT_CREDENTIAL }),
		cache: 'no-store'
	});
	if (!answer.ok) {
		return NextResponse.json({ error: 'No time report' }, { status: answer.status });
	}
	const report = await answer.json();
	return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
```

In the page:

```tsx
'use client';
import '@ever-teams/atoms/styles.css';
import { TeamsProvider, TeamsClientTimeReport, type GetClientTimeReport } from '@ever-teams/atoms';

const getReport: GetClientTimeReport = async () => {
	const answer = await fetch('/api/client-report');
	if (!answer.ok) {
		throw new Error('No time report');
	}
	return answer.json(); // IClientTimeReport, from @ever-teams/toolkit-types
};

export function ClientTimeReport() {
	return (
		<TeamsProvider scopedStyles>
			<TeamsClientTimeReport getReport={getReport} />
		</TeamsProvider>
	);
}
```

The widget calls `getReport` once when it appears (twice in development under React's Strict Mode, which mounts
components twice), and again when the day ends in the report's time zone, so a portal left open overnight never shows
yesterday as today. While it waits, the report tiles show loaders; when it throws, rejects or returns something that
is not an `IClientTimeReport` (an API without the client report route answers an error), the widget says the time
couldn't be loaded and offers "Try again", which calls it again. A week with no time says so, with the client's name.
Today and this week are counted in the time zone the report names (`timeZone`).

A new `getReport` at each render of your page does not call it again. To show another client in the same place, give
the widget a `key` per client (`<TeamsClientTimeReport key={clientId} getReport={...} />`): it then starts afresh, and
an answer still on its way for the previous client is dropped.

The widget keeps the report in memory and writes nothing to the browser's storage. The `TeamsProvider` around it
handles the session as it does for every kit component: on a site where people also sign in with the kit, it reads
the session saved for its API address, and clears it once expired (see
[Security](#security-where-tokens-live-today-and-what-is-planned)). The saved session belongs to the site's origin and
to the API that issued it, not to a page: on an origin where nobody has signed in to that API with the kit, there is no
session to read.

## Security: where tokens live today, and what is planned

Without `config.getToken`:

- The sign-in dialog (`TeamsLoginDialog`) takes the user's email and password inside your page and sends them to
  `{apiUrl}/auth/login`. A "Token" tab also accepts a pasted access token.
- The access token and the user record are kept in `localStorage['_teams-store']`, readable by every script of your
  page, with the API address that issued the token (`persist.apiUrl`). A provider reads back only the session saved
  for the address it sends to, so a token never reaches another server (but see the next point for a session saved
  by an earlier version); the sessions of other servers sit in the same key, under `servers`, and a site with one
  server keeps the shape it had. Signing out, or "Sign in again" after a session ended, removes that address's session
  only. Each time the kit saves a session (at every page load once
  signed in) it sets its expiry 24 hours later; it removes it only when it next reads it after that expiry, so until
  then an expired token stays readable there.
- A session saved by an earlier version names no address: the first provider that reads it keeps it as its own. On a
  site with several servers, that can be another server's provider: that server gets the token once and refuses it,
  its widgets say the session ended, and the person signs in again on both. While the browser refuses to record the
  address (storage full), such a session is not read at all.
- The user menu shows the token, with a copy button.
- What leaves your page: requests to `config.apiUrl` (`https://api.ever.team/api` when it is not set), with the token
  in their `Authorization` header. Fonts are requested from Google Fonts only with `loadGoogleFonts`. Tracking
  sessions are read only while a component that shows them (filter, insights, heatmap, replay) is on the page.
- Published versions up to 0.2.14 sent the signed-in user's token to the demo Gauzy API when `config.apiUrl` was not
  set ([ever-co/ever-teams#5406](https://github.com/ever-co/ever-teams/issues/5406)): on 0.2.x, upgrade, and always
  set `apiUrl`.

With `config.getToken` (above), the sign-in dialog, the stored token and the token in the user menu are gone: the
token comes from your backend, is limited to the timer and to one person, lives a few minutes and stays in memory; a
revoked embed credential ends its tokens. Requests still go to `config.apiUrl` with that token in their
`Authorization` header.

With `config.signIn: 'ever-teams'` (above), the dialog asks for no password or token either: the timer token stays
in memory, and the renewal token, which gets the next timer token from your site only, sits in `localStorage` for
its API address and organization, readable by the scripts of your page. Anyone who reads it can renew from your
site's origin until the person signs out or revokes the site. Sign-out asks the API to revoke it; when the API cannot
be reached, the person revokes the site from the web app.

Planned ([ever-co/ever-teams#5405](https://github.com/ever-co/ever-teams/issues/5405)): the workspace lists the sites
allowed to embed it.

## Troubleshooting

| You see                                                                     | Cause and fix                                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The widget is unstyled (digits one under the other, a large coloured block) | Import `@ever-teams/atoms/styles.css` and set `scopedStyles`; with your own Tailwind, add the two `@source` lines instead. |
| A network or CORS error in the console, sign-in does nothing                | Allow your origin: for `getToken` or Ever Teams sign-in, in Settings > Workspace > Embeds; else in `ALLOWED_ORIGINS`.      |
| 404 on every request                                                        | `apiUrl` must end with `/api` (`https://api.example.com/api`).                                                             |
| "useState only works in Client Components" (Next.js)                        | Add `'use client'` at the top of the file that renders `TeamsProvider`.                                                    |

## Links

- Components and their props: [storybook.ever.team](https://storybook.ever.team)
- Example apps (Next.js, Vite, Remix, SaaS starter): [packages/toolkit/examples](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples)
- API reference: [docs.ever.team/api-reference](https://docs.ever.team/api-reference/)
- Licence: MIT
