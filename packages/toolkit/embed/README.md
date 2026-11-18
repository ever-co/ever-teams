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

A change of attribute applies at once. Removing the element stops the timer's display and its polling; moving it in the page keeps it as it is. Each element keeps its own `color-scheme`, until a person picks a scheme with the kit's theme toggle: that pick applies to every timer of the page, until an element's `color-scheme` changes. All the timers of a page share one language and one API address for now (ever-co/ever-teams#5483): the last element to load or change sets them, so give every element of a page the same `api-url`. A language a person picks in the kit's language switch is kept for their next visits and wins over `lang` when an element loads.

## Events

The element dispatches `ever-teams-timer-change` when it first reads the person's timer, then at each start or stop it
sees, wherever it was made (this timer, the web app, the desktop app). The event bubbles and crosses shadow roots, so
your page can listen on the element or on `document`:

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
on load, every minute while the page is visible, on focus and when the network comes back; it adds no request, and a
change made elsewhere shows up to a minute later. In a Vue template, `@ever-teams-timer-change` on the element listens
to it. `TIMER_CHANGE_EVENT`, exported by the package, holds the name.

## Examples

`examples/` holds two pages that run as they are once the files of `dist/` sit next to them, a Svelte component and an
Angular app:

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
the attributes under the camelCase names Vue gives them (`colorScheme` for `color-scheme`):

```ts
import type { HTMLAttributes } from 'vue';
import type { EverTeamsTimerElement, EverTeamsTimerProps } from '@ever-teams/embed';

declare module 'vue' {
	interface GlobalComponents {
		'ever-teams-timer': new () => EverTeamsTimerElement & { $props: HTMLAttributes & EverTeamsTimerProps };
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

No framework needs a wrapper component: the element takes three attributes, which every framework binds, and
dispatches no events, so there is nothing to bind both ways and nothing to listen to.

## What it changes in your page

The timer draws in the element's own shadow root: your page's CSS does not reach it, and its styles do not reach your
page. It takes your page's font, like the React kit. Two things are added to the page:

- one `<style data-ever-teams-properties>` in `<head>`, which registers the custom properties the timer's shadows and
  rings use (all named `--ever-teams-tw-*`; browsers ignore these registrations inside a shadow root);
- the `<ever-teams-timer>` element definition.

## Sign-in

The element uses the kit's own sign-in: a person types their Ever Teams email and password, or a token, in the
element. Sign-in from your backend, without a password in the page, comes with the host sign-in model of
`@ever-teams/atoms`.

## Size

258 KB gzip when the page loads (React, the kit and its stylesheet), and 63 KB more only when a view needs time zones.

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
