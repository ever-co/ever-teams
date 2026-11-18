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

A change of attribute applies at once. Removing the element stops the timer's display and its polling. All the timers of a page share one color scheme for now: the last element to load sets it.

## Examples

`examples/` holds pages that run as they are once the files of `dist/` sit next to them:

- `html/`: a plain page.
- `vue/`: a Vue app on Vue's browser build. Vue takes a tag it does not know for a component, so it is told that the
  `ever-teams-` tags are custom elements, with `app.config.compilerOptions.isCustomElement`. In a project built with
  single-file components, the same function goes to the Vue plugin's `template.compilerOptions.isCustomElement`.
- `svelte/`: a Svelte component that imports the package once and binds `color-scheme`. Svelte needs no setting.

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
