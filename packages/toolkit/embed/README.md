# @ever-teams/embed

The Ever Teams timer as an HTML element, for any page: plain HTML, a site editor, Vue, Angular or Svelte. React, the
kit and its styles are bundled in, so the page installs and builds nothing.

## Quick start

Serve the files of `dist/` (`ever-teams-embed.js` and the files next to it, which it loads when needed) from your
site, then add one script and one element:

```html
<script type="module" src="/ever-teams/ever-teams-embed.js"></script>

<ever-teams-timer api-url="https://api.ever.team/api"></ever-teams-timer>
```

The element shows the kit's sign-in button, then the person's timer once they are signed in.

## Attributes

| Attribute      | Default                     | What it does                                                                               |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `api-url`      | `https://api.ever.team/api` | The Ever Teams API the timer talks to. With your own server, its address ending in `/api`. |
| `color-scheme` | `system`                    | `light`, `dark`, or `system` (follows the system's).                                       |
| `lang`         | `en`                        | The language of the timer and its sign-in: `en` or `fr`.                                   |
| `sign-in`      | none                        | `ever-teams`: the "Sign in with Ever Teams" button, see [Sign-in](#sign-in).               |
| `organization` | none                        | With `sign-in="ever-teams"`: the organization the site signs people in to.                 |
| `app-url`      | `https://app.ever.team`     | With `sign-in="ever-teams"`: the Ever Teams web app the popup opens.                       |
| `token-url`    | none                        | Your own route that answers the signed-in person's embed token, see [Sign-in](#sign-in).   |

A change of attribute applies at once. Removing the element stops the timer's display and its polling; moving it in the page keeps it as it is. Each element keeps its own `color-scheme`, until a person picks a scheme with the kit's theme toggle: that pick applies to every timer of the page, until an element's `color-scheme` changes. Each element with an `api-url` talks to that address: two timers of one page can reach two different servers. An element without `api-url` follows the page's address, the one another element or your own code set, and never changes it; when nothing set one, it is `https://api.ever.team/api`. When that address changes, such an element starts afresh: the token and the person it holds in memory are dropped. It then reads back only a session a sign-in saved for the new address, if there is one: each address keeps its own session across reloads, and a token is never sent to another server. The one exception is a session saved by an earlier version of the kit, which names no address: the first element to read it takes it as its own and sends its token once; when that is another server's element, the server refuses it and the person signs in again. An element whose `api-url` is removed does not go back to following the page: it talks to `https://api.ever.team/api` and sets that as the page's address. All the timers of a page share one language: the last element to load or change sets it. A language a person picks in the kit's language switch is kept for their next visits and wins over `lang` when an element loads.

## Events

The element dispatches `ever-teams-timer-change` when it first reads the person's timer, then each time a later read
shows it changed, wherever the change was made (this timer, the web app, the desktop app): a start, a stop, or another
running entry (a new start, another project or another task). The event bubbles and crosses shadow roots, so your page
can listen on the element or on `document`:

```html
<ever-teams-timer api-url="https://api.ever.team/api"></ever-teams-timer>
<p id="timer-status"></p>

<script>
	document.addEventListener('ever-teams-timer-change', (event) => {
		const status = document.getElementById('timer-status');
		if (event.detail.running) {
			status.textContent = `Working since ${event.detail.startedAt}`;
			return;
		}
		status.textContent = 'Not tracking time';
	});
</script>
```

`event.detail` holds `running`, `startedAt` (an ISO date, `null` while stopped), `projectId`, `taskId` and `initial`
(`true` for the first read, which tells the timer as it is). The event comes from the reads the element already makes:
on load, every minute while the page is visible, when the page becomes visible again, on focus and when the network
comes back; it adds no request. Those times are when the element reads, not a deadline for the event: a change made
elsewhere is told when a read that succeeds shows it, and a read can fail or come late. A start and a stop that both
fall between two reads leave the timer as the last read saw it, so neither is told. In a Vue template, `@ever-teams-timer-change` on the element
listens to it. `TIMER_CHANGE_EVENT`, exported by the package, holds the name, and the package's declaration types
`event.detail` (`EverTeamsTimerChange`) on the element, `document` and `window`.

## Examples

The [`examples/`](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/embed/examples) folder of the
repository (the package itself ships `dist/` only) holds two pages that run as they are once the files of `dist/` sit
next to them, a Svelte component and an Angular app:

- `html/`: a plain page.
- `vue/`: a Vue app on Vue's browser build, which goes next to the page too (`dist/vue.esm-browser.prod.js` of the `vue`
  package, as its import map says). Vue takes a tag it does not know for a component, so it is told that the
  `ever-teams-` tags are custom elements, with `app.config.compilerOptions.isCustomElement`. In a project built with
  single-file components, the same function goes to the Vue plugin's `template.compilerOptions.isCustomElement`.
- `svelte/`: a component for a Svelte app, which compiles it with its own build, like its other components, and
  resolves `@ever-teams/embed` to the package or to the `dist/` file it serves. The component loads the package in
  `onMount` and binds `color-scheme`. Svelte needs no setting.
- `angular/`: an Angular app with its own `package.json`, built by Angular's application builder. Its standalone root
  component holds the element, binds `api-url` and `color-scheme`, and loads the package in the browser only. Its
  README says how to run it.

`@ever-teams/embed` is not published on npm yet (see [Release](#release)): until it is, an app resolves that name
to the `dist/` file it serves, as the Svelte example says, or installs it from this folder, as the Angular example does
with `"@ever-teams/embed": "file:../.."`.

Angular needs the custom elements schema on the component that holds the element, as `examples/angular/` does:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@ever-teams/embed';

@Component({
	selector: 'app-timer',
	standalone: true,
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: '<ever-teams-timer api-url="https://api.ever.team/api"></ever-teams-timer>'
})
export class TimerComponent {}
```

The element reads attributes: a value that comes from the component's state goes through `[attr.color-scheme]="..."`,
as the example binds it. `[color-scheme]="..."` or `color-scheme="{{ ... }}"` sets a property of that name, which the
element ignores.

An app that renders on the server loads the package in the browser only: the element extends `HTMLElement`, which a
server does not have. In Svelte that is `onMount`, as the example does; in Angular, add `afterNextRender` to the
`@angular/core` import and call `afterNextRender(() => import('@ever-teams/embed'))` in the component's constructor,
in place of the import above, as the Angular example does.

In a site editor, a custom HTML block takes the script tag and the element as they are, once your site serves the
files of `dist/`.

## TypeScript

The package comes with its types (`dist/ever-teams-embed.d.ts`): an app with `strict` imports `@ever-teams/embed`
without a declaration of its own, `document.createElement('ever-teams-timer')` returns an `EverTeamsTimerElement`, and
`EverTeamsTimerAttributes` types the attributes. How a template checks them depends on the framework.

Angular needs nothing more. Its template checker does not check the values given to an attribute, on any element, so
no declaration can type them there; a template reference such as `#timer` gets the element's type.

Vue's template checker (`vue-tsc`) takes `<ever-teams-timer>` for a component: with `strictTemplates` it refuses a
component it does not know, and without, it accepts any value. This declaration, in a `.d.ts` file of the app, types
the attributes under the camelCase names Vue gives them (`colorScheme` for `color-scheme`), and the change event, so
`@ever-teams-timer-change` gets an `EverTeamsTimerChange` in its `detail`:

```ts
import type { HTMLAttributes } from 'vue';
import type { EverTeamsTimerChange, EverTeamsTimerElement, EverTeamsTimerProps } from '@ever-teams/embed';

interface EverTeamsTimerEvents {
	onEverTeamsTimerChange?: (event: CustomEvent<EverTeamsTimerChange>) => void;
}

declare module 'vue' {
	interface GlobalComponents {
		'ever-teams-timer': new () => EverTeamsTimerElement & {
			$props: HTMLAttributes & EverTeamsTimerProps & EverTeamsTimerEvents;
		};
	}
}
```

Svelte's checker (`svelte-check`) accepts any value on an element it does not know. This declaration, in
`src/app.d.ts` for example, types the attributes, with Svelte 4 and 5:

```ts
import type { HTMLAttributes } from 'svelte/elements';
import type { EverTeamsTimerAttributes, EverTeamsTimerElement } from '@ever-teams/embed';

declare module 'svelte/elements' {
	interface SvelteHTMLElements {
		'ever-teams-timer': HTMLAttributes<EverTeamsTimerElement> & EverTeamsTimerAttributes;
	}
}
```

These two declarations stay in the app: they extend Vue's and Svelte's own types, which an app without Vue or Svelte
does not have.

No framework needs a wrapper component: the element takes seven attributes, which every framework binds, and
dispatches one event, `ever-teams-timer-change` (see [Events](#events)), which a framework listens to as to any DOM
event. Nothing binds both ways.

## What it changes in your page

The timer draws in the element's own shadow root: your page's CSS does not reach it, and its styles do not reach your
page. Like the React kit, it draws in the system UI font; to give it your page's font, set `--ever-teams-kit-font` on
the element or a parent, for example `ever-teams-timer { --ever-teams-kit-font: Georgia, serif; }`. Three things are
added to the page:

- one `<style data-ever-teams-properties>` in `<head>`, which registers the custom properties the timer's shadows and
  rings use (all named `--ever-teams-tw-*`; browsers ignore these registrations inside a shadow root);
- the `<ever-teams-timer>` element definition;
- while one of the timer's menus or dialogs is open, two empty `<span data-radix-focus-guard>` at the start and the end
  of `<body>`, which keep the keyboard focus inside it; they go when it closes.

## Sign-in

Without `sign-in`, the element uses the kit's own sign-in: a person types their Ever Teams email and password, or a
token, in the element.

When your product has a server and already knows who is signed in, `token-url` names your own route that answers that
person's embed token, the one the route handlers of the
[`@ever-teams/api` README](https://github.com/ever-co/ever-teams/tree/develop/packages/api#sign-people-in-from-your-server)
write with `exchangeEmbedToken`. No password or token is typed in the page:

```html
<ever-teams-timer api-url="https://api.ever.team/api" token-url="/api/ever-teams-token"></ever-teams-timer>
```

The element asks that route with a `POST` and the page's cookies (a route of your page's own origin: the cookies go to
no other), signs the person in with the `{ token, expiresAt }` it answers, and asks again shortly before the token
expires. An answer that is not 2xx (your route's 401 for a person
signed out of your product) shows the person as signed out, with a note that points to your own sign-in. `token-url`
wins over `sign-in`. Another `token-url` starts a new session, and so does `signOut()`: when the person signed in to
your page changes without a page load, call `signOut()` once your route answers for the new person (or 401), give
`token-url` a new value (your route with that person's id in its query, for example) or replace the element.

On a page without a server, `sign-in="ever-teams"` shows a "Sign in with Ever Teams" button instead. It opens the
Ever Teams web app in a popup, where the person signs in if they are not already and allows your site to start and
stop their timer; the popup hands the element a timer token and a renewal token, then closes. No password or token is
typed in your page:

```html
<ever-teams-timer
	api-url="https://api.ever.team/api"
	sign-in="ever-teams"
	organization="your-organization-id"
	app-url="https://app.ever.team"
></ever-teams-timer>
```

An administrator of the organization turns it on: your site in the allowed sites of Settings > Workspace > Embeds of
the web app, with its switch "People can sign in from this site" on, on an API with sign-in from sites
([ever-co/ever-gauzy#12094](https://github.com/ever-co/ever-gauzy/issues/12094)). The timer token stays in memory;
the renewal token is kept in the browser's storage for the API address and organization it was issued for, so a
reload stays signed in where the browser lets the page store it (not in a window that blocks storage). The element
renews the timer token about a minute before it expires, one tab at a time under Web Locks; a browser without them
gets a best-effort lock in `localStorage`, where a race can end the sign-in and ask the person to sign in again. The
user menu signs out: the element forgets the sign-in and asks the API to end it, and when the API cannot be reached,
an administrator removes the site or turns its sign-in off in Settings > Workspace > Embeds. When the sign-in ends
that way, or the API revokes it, the element shows the button again at its next renewal. [Sign in with Ever Teams](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#sign-in-with-ever-teams)
in the README of `@ever-teams/atoms` says what happens in each case.

The sign-in is kept for the API address and organization, not for a user of your page. On a computer people share,
sign the timers out when your page signs its own user out, so the next person does not get the previous one's timer.
Each timer holds its own token, so sign out every one on the page:

```js
await Promise.all([...document.querySelectorAll('ever-teams-timer')].map((timer) => timer.signOut()));
```

`signOut()` does what the user menu does and shows the button again. Called on an element already removed from the
page, it still ends the sign-in saved for its `api-url` and `organization`. With `token-url`, it drops the token the
element holds and asks your route again, which then answers 401: call it after your own sign-out. Without
`sign-in="ever-teams"` or `token-url` it does nothing. Another tab of your site that shows a timer shows the button again at its next renewal, as after a sign-out
from the user menu.

## Size

271 KB gzip when the page loads (React, the kit and its stylesheet), and 63 KB more only when a view needs time zones.

## Build

```bash
yarn build   # from packages/toolkit/embed, after the @ever-teams/atoms build
yarn test
```

## Release

Not on npm yet: the package is `private` until its name and its first release are approved. The SDK release publishes
every public package that has a changeset (`changeset publish`), so to release it:

1. remove `"private": true` from `package.json`;
2. add `.changeset/kit-11-timer-element.md`:

    ```md
    ---
    '@ever-teams/embed': minor
    ---

    New package: `<ever-teams-timer api-url="...">`, the Ever Teams timer as an HTML element for pages without React. One `<script type="module">` loads React, the kit and its stylesheet; the element renders the kit's sign-in and basic timer in its own shadow root, reads `api-url`, `color-scheme` and `lang`, dispatches `ever-teams-timer-change` with the person's timer at its first read and at each change a later read shows, and stops when removed. It ships its TypeScript declaration (`dist/ever-teams-embed.d.ts`): a `strict` app, such as a new Angular app, imports the package without a declaration of its own, `document.createElement('ever-teams-timer')` gets the element's type, and `EverTeamsTimerAttributes` (`EverTeamsTimerProps` in camelCase) types its attributes in Vue and Svelte templates.
    ```

3. add `packages/toolkit/embed` to `.github/workflows/release.sdk.prod.yml`: its build (after atoms), the
   `SDK_PACKAGES` of the change detection, and the `dirs` of "Start SDK versions from npm's latest" (without that, a
   release cut before the bump PR reaches main computes a version npm already has, and publish skips it);
4. its first publish may need a token: npm trusted publishing is set up in the settings of a package that already
   exists.
