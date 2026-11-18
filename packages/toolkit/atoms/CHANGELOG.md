# @ever-teams/atoms

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
