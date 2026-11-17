# Atoms

`@ever-teams/atoms` puts a live Ever Teams timer, and the reports around it, inside your own React product. The
timer is the same one your team uses in the Ever Teams web, desktop and mobile apps: start it here, see it running
there. MIT licensed.

Components to browse: [storybook.ever.team](https://storybook.ever.team). Example apps:
[packages/toolkit/examples](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples).

## Quick start

You need a React app (tested with React 19) styled with Tailwind CSS 4, and an Ever Teams API: the cloud
(`https://api.ever.team/api`) or your own server (its address ending with `/api`).

```bash
npm install @ever-teams/atoms
```

```tsx
'use client';
import { TeamsProvider, TeamsLoginDialog, TeamsBasicTimer } from '@ever-teams/atoms';

export function EverTeamsTimer() {
	return (
		<TeamsProvider config={{ apiUrl: 'https://api.ever.team/api' }}>
			<TeamsLoginDialog />
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

Then let Tailwind see the kit's class names, in the CSS file that has `@import "tailwindcss";` (paths are relative
to that file):

```css
@import 'tailwindcss';
@source "../node_modules/@ever-teams/atoms/dist";
@source "../node_modules/@ever-teams/toolkit-ui/dist";
```

Without those two lines the widget renders unstyled. The kit does not ship its own stylesheet yet
([ever-co/ever-teams#5407](https://github.com/ever-co/ever-teams/issues/5407)).

## Next.js (App Router)

1. `npx create-next-app@latest my-app` (TypeScript, Tailwind, App Router), then `cd my-app` and
   `npm install @ever-teams/atoms`.
2. Create `app/ever-teams-timer.tsx` with the component of the quick start. The `'use client'` line is required:
   the provider uses state and the browser.
3. Add the two `@source` lines to `app/globals.css`, under `@import "tailwindcss";`, with `../` paths as above.
4. Use it in a page:

```tsx
// app/page.tsx
import { EverTeamsTimer } from './ever-teams-timer';

export default function Page() {
	return <EverTeamsTimer />;
}
```

## Vite + React

1. `npm create vite@latest my-app -- --template react-ts`, then `cd my-app` and
   `npm install @ever-teams/atoms tailwindcss @tailwindcss/vite`.
2. `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({ plugins: [react(), tailwindcss()] });
```

3. `src/index.css` (imported by `src/main.tsx`):

```css
@import 'tailwindcss';
@source "../node_modules/@ever-teams/atoms/dist";
@source "../node_modules/@ever-teams/toolkit-ui/dist";
```

4. `src/App.tsx` (`src/main.tsx` imports it as the default export):

```tsx
import { TeamsProvider, TeamsLoginDialog, TeamsBasicTimer } from '@ever-teams/atoms';

export default function App() {
	return (
		<TeamsProvider config={{ apiUrl: 'https://api.ever.team/api' }}>
			<TeamsLoginDialog />
			<TeamsBasicTimer />
		</TeamsProvider>
	);
}
```

## Configuration

| Prop of `TeamsProvider` | Default                     | What it does                                                                                                                  |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `config.apiUrl`         | `https://api.ever.team/api` | The Ever Teams API every request goes to. Always set it. With your own server, give its address ending with `/api`.           |
| `lang`                  | `'en'`                      | Language of the components: `'en'` or `'fr'`. A language chosen earlier in the language switch, kept in `localStorage`, wins. |
| `theme`                 | the kit's default           | A theme object: `theme1` to `theme14` are exported.                                                                           |

The API must accept your site's origin: on a self-hosted Gauzy API, add it to `ALLOWED_ORIGINS` (comma-separated)
and restart the API.

## Security: where tokens live today, and what is planned

Today:

- The sign-in dialog (`TeamsLoginDialog`) takes the user's email and password inside your page and sends them to
  `{apiUrl}/auth/login`. A "Token" tab also accepts a pasted access token.
- The access token and the user record are kept in `localStorage['_teams-store']`, readable by every script of your
  page, for 24 hours from the last visit.
- The user menu shows the token, with a copy button.
- What leaves your page: requests to `config.apiUrl`. Versions up to 0.2.14 also send the token to the demo API when
  `config.apiUrl` is not set (fixed by [ever-co/ever-teams#5406](https://github.com/ever-co/ever-teams/issues/5406);
  always set `apiUrl`), and the provider loads the Geist font from Google Fonts
  ([ever-co/ever-teams#5408](https://github.com/ever-co/ever-teams/issues/5408)).

Planned ([ever-co/ever-teams#5405](https://github.com/ever-co/ever-teams/issues/5405)): your backend hands the
widget a short-lived token, limited to the timer and to one person, kept in memory only; the workspace lists the
sites allowed to embed it and can revoke them.

## Troubleshooting

| You see                                                                     | Cause and fix                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| The widget is unstyled (digits one under the other, a large coloured block) | Tailwind does not see the kit's classes: add the two `@source` lines.      |
| A network or CORS error in the console, sign-in does nothing                | The API does not allow your origin: add it to the API's `ALLOWED_ORIGINS`. |
| 404 on every request                                                        | `apiUrl` must end with `/api` (`https://api.example.com/api`).             |
| "useState only works in Client Components" (Next.js)                        | Add `'use client'` at the top of the file that renders `TeamsProvider`.    |

## Links

- Components and their props: [storybook.ever.team](https://storybook.ever.team)
- Example apps (Next.js, Vite, Remix, SaaS starter): [packages/toolkit/examples](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples)
- API reference: [docs.ever.team/api-reference](https://docs.ever.team/api-reference/)
- Licence: MIT
