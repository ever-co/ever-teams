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
