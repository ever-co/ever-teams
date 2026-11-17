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
| `theme`                 | `defaultTheme`              | A theme object: `defaultTheme` and `theme1` to `theme14` are exported.                                                                                                                                                                                       |
| `scopedStyles`          | `false`                     | Renders the kit root that `@ever-teams/atoms/styles.css` is scoped under, and a container in `document.body` for the kit's dialogs, popovers, menus and selects. Set it with the stylesheet; leave it off when your own Tailwind compiles the kit's classes. |
| `colorScheme`           | `'system'`                  | The widgets' color scheme inside the kit root (`scopedStyles`): `'light'`, `'dark'` or `'system'` (follows the system's). Nothing is written on `<html>`.                                                                                                    |
| `loadGoogleFonts`       | `false`                     | Lets the font toggle (`TeamsFontToggle`) load the font a person picks from Google Fonts. Off: no request to a third party, and the widgets keep your page's font until a person picks one.                                                                   |
| `onSignOut`             | none                        | Called after a person signs out from the kit's user menu. Without it, the page stays where it is with `scopedStyles`; without `scopedStyles`, the kit sends the browser to `/`.                                                                              |

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

On your server, a route that answers the token for the person signed in to your product (Next.js route handler):

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

export function Timer() {
	return (
		<TeamsProvider scopedStyles config={{ apiUrl: 'https://your-api.example.com/api', getToken }}>
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
- When `getToken` throws or rejects, the widgets show the person as signed out, and `TeamsLoginDialog` says
  "Sign in to this site to use your Ever Teams timer." instead of asking for a password.
- When a person signs out of your product, unmount the `TeamsProvider` (or reload the page): until then the kit keeps
  the token it holds, at most until it expires.

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

With `config.getToken` (above), none of that applies: the token comes from your backend, is limited to the timer
and to one person, lives a few minutes and stays in memory; a revoked embed credential ends its tokens.

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
