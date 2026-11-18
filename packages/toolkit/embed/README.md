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

## Examples

`examples/` holds two pages that run as they are once the files of `dist/` sit next to them, and a Svelte component:

- `html/`: a plain page.
- `vue/`: a Vue app on Vue's browser build, which goes next to the page too (`dist/vue.esm-browser.prod.js` of the `vue`
  package, as its import map says). Vue takes a tag it does not know for a component, so it is told that the
  `ever-teams-` tags are custom elements, with `app.config.compilerOptions.isCustomElement`. In a project built with
  single-file components, the same function goes to the Vue plugin's `template.compilerOptions.isCustomElement`.
- `svelte/`: a component for a Svelte app, which compiles it with its own build, like its other components, and
  resolves `@ever-teams/embed` to the package or to the `dist/` file it serves. The component loads the package in
  `onMount` and binds `color-scheme`. Svelte needs no setting.

`@ever-teams/embed` is not published on npm yet (see [Release](#release)): until it is, an app resolves that name
to the `dist/` file it serves, as the Svelte example says.

Angular needs the custom elements schema on the component that holds the element:

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

An app that renders on the server loads the package in the browser only: the element extends `HTMLElement`, which a
server does not have. In Svelte that is `onMount`, as the example does; in Angular, add `afterNextRender` to the
`@angular/core` import and call `afterNextRender(() => import('@ever-teams/embed'))` in the component's constructor,
in place of the import above.

In a site editor, a custom HTML block takes the script tag and the element as they are, once your site serves the
files of `dist/`.

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

    New package: `<ever-teams-timer api-url="...">`, the Ever Teams timer as an HTML element for pages without React. One `<script type="module">` loads React, the kit and its stylesheet; the element renders the kit's sign-in and basic timer in its own shadow root, reads `api-url`, `color-scheme` and `lang`, and stops when removed.
    ```

3. add `packages/toolkit/embed` to `.github/workflows/release.sdk.prod.yml`: its build (after atoms), the
   `SDK_PACKAGES` of the change detection, and the `dirs` of "Start SDK versions from npm's latest" (without that, a
   release cut before the bump PR reaches main computes a version npm already has, and publish skips it);
4. its first publish may need a token: npm trusted publishing is set up in the settings of a package that already
   exists.
