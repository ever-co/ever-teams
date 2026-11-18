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
| `lang`                  | `'en'`                      | Language of the components: `'en'` or `'fr'`. A language chosen earlier in the language switch, kept in `localStorage`, wins.                                                                                                                                |
| `theme`                 | `defaultTheme`              | A theme object: `defaultTheme` (flat), `gradientTheme` and `theme1` to `theme14` are exported.                                                                                                                                                               |
| `scopedStyles`          | `false`                     | Renders the kit root that `@ever-teams/atoms/styles.css` is scoped under, and a container for the kit's dialogs and menus in `document.body` or its shadow root. Set it with the stylesheet; leave it off when your own Tailwind compiles the kit's classes. |
| `colorScheme`           | `'system'`                  | The widgets' color scheme inside the kit root (`scopedStyles`): `'light'`, `'dark'` or `'system'` (follows the system's). Nothing is written on `<html>`.                                                                                                    |
| `loadGoogleFonts`       | `false`                     | Lets the font toggle (`TeamsFontToggle`) load the font a person picks from Google Fonts. Off: no request to a third party, and the widgets keep the default font until a person picks one.                                                                   |
| `onSignOut`             | none                        | Called after a person signs out from the kit's user menu. Without it, the page stays where it is with `scopedStyles`; without `scopedStyles`, the kit sends the browser to `/`.                                                                              |
| `branding`              | `true`                      | Shows "Powered by Ever Teams" under the forms, reports and team widgets. `false` hides it everywhere.                                                                                                                                                        |
| `onTimerChange`         | none                        | Called with the person's timer at the first read of its status, then at each start or stop a later read shows, wherever it was made: see [Know when the timer starts or stops](#know-when-the-timer-starts-or-stops).                                        |

The widgets draw in the Ever Teams web app's font, the system UI face (nothing is downloaded), inside the kit root only: your page keeps its own. To give the widgets your page's font, set `--ever-teams-kit-font` on any parent of the widgets, or on `:root` so that their dialogs follow: `:root { --ever-teams-kit-font: Georgia, serif; }`.

`config.apiUrl` is one setting for the whole page: every `TeamsProvider` of a page writes it to the same
`apiConfigManager`, and every request uses the address set last. Give all the providers of a page the same `apiUrl`.

The API must accept your site's origin: on a self-hosted Gauzy API, add it to `ALLOWED_ORIGINS` (comma-separated)
and restart the API.

## Sign in from your backend

On a site that is not the Ever Teams workspace itself, do not let the kit ask for an Ever Teams password: your
backend already knows who is signed in. It exchanges an embed credential of the workspace for a short-lived token for
that person, and `config.getToken` hands it to the kit.

What you need: an Ever Teams API with embed credentials turned on (`GAUZY_EMBED_TOKENS_ENABLED=true`,
[ever-co/ever-gauzy#12069](https://github.com/ever-co/ever-gauzy/pull/12069)) and an embed credential created by an
admin of the organization (`POST /api/embed-credentials`). Keep the credential on your server, never in the page.
An API that also checks allowed origins ([ever-co/ever-gauzy#12066](https://github.com/ever-co/ever-gauzy/issues/12066))
needs your site in the organization's list (`POST /api/embed-allowed-origins`): the backend sends the page's origin
with each exchange, and the token then works only from that site.

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
  again), never sooner than 5 seconds after the failure.
- A token for another person or organization than the previous one starts a new session: the user is read again.
- When a person signs in to or out of your product without a page load, mount a new `TeamsProvider` (the `key` in the
  example) or unmount it. Unmounting is what clears the token and the profile the kit holds in memory: the token's
  expiry only limits how long the API accepts it.

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
  after the read that follows it; one made elsewhere (the web app, the desktop app, the browser extension) at the next
  successful read: within a minute while the page is visible, once it is visible again otherwise. A start and a stop
  that both fall between two reads leave the timer as the last read saw it, so neither is told.
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
their saved session, and clears it once expired (see
[Security](#security-where-tokens-live-today-and-what-is-planned)). The saved session belongs to the site's origin, not
to a page: on an origin where nobody has signed in with the kit, there is no session to read.

## Security: where tokens live today, and what is planned

Without `config.getToken`:

- The sign-in dialog (`TeamsLoginDialog`) takes the user's email and password inside your page and sends them to
  `{apiUrl}/auth/login`. A "Token" tab also accepts a pasted access token.
- The access token and the user record are kept in `localStorage['_teams-store']`, readable by every script of your
  page. Each time the kit saves them (at every page load once signed in) it sets their expiry 24 hours later;
  it removes them only when it next reads them after that expiry, so until then an expired token stays readable
  there.
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

Planned ([ever-co/ever-teams#5405](https://github.com/ever-co/ever-teams/issues/5405)): the workspace lists the sites
allowed to embed it.

## Troubleshooting

| You see                                                                     | Cause and fix                                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The widget is unstyled (digits one under the other, a large coloured block) | Import `@ever-teams/atoms/styles.css` and set `scopedStyles`; with your own Tailwind, add the two `@source` lines instead. |
| A network or CORS error in the console, sign-in does nothing                | The API does not allow your origin: add it to the API's `ALLOWED_ORIGINS`.                                                 |
| 404 on every request                                                        | `apiUrl` must end with `/api` (`https://api.example.com/api`).                                                             |
| "useState only works in Client Components" (Next.js)                        | Add `'use client'` at the top of the file that renders `TeamsProvider`.                                                    |

## Links

- Components and their props: [storybook.ever.team](https://storybook.ever.team)
- Example apps (Next.js, Vite, Remix, SaaS starter): [packages/toolkit/examples](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples)
- API reference: [docs.ever.team/api-reference](https://docs.ever.team/api-reference/)
- Licence: MIT
