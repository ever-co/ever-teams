# @ever-teams/toolkit-ui

## 0.4.0

### Minor Changes

- c608a95: Published as one file per module, in ESM (`dist`) and CommonJS (`dist/cjs`), with `exports` conditions `import` and `require`, each with its own declarations (`dist/cjs/*.d.ts` for CommonJS callers; TypeScript also resolves them on `"moduleResolution": "node16"` and `"nodenext"`): a host's bundler keeps only the components it uses, `require('@ever-teams/toolkit-ui')` works, and every client module keeps its `"use client"` directive, so Next.js App Router server components can import the components directly. `@ever-teams/toolkit-types` is no longer bundled and is required with a real range (`^0.1.10`). `theme-ui` and `@emotion/react` are peers only (no longer optional dependencies as well).
- 5079548: The kit's daily statistics ("Worked today" and the day's projects, tasks and activities) count today from local midnight, as the web app does, instead of the last 24 hours. `@ever-teams/toolkit-ui` adds `getTodaySoFar()`; `getStartAndEndOfDay()` keeps its window for anyone who calls it.
- b41149f: `CollapseIcon` joins `ExpandIcon`: both draw in the text color, are hidden from screen readers (the control that draws them carries the name), and take an optional `size`. The modern timer's toggle is named "Show timer details" or "Hide timer details", tells whether it is unfolded, and folds back with the collapse icon instead of a hyphen.

### Patch Changes

- fc7f6ac: Dialogs have a title for screen readers. `Dialog` renders a given `title` as the dialog's title (it printed the bare text and left the dialog unnamed), and the new `hideTitle` prop keeps that title for screen readers only (a `description` stays visible). The sign-in, registration, member invitation and team creation dialogs of atoms use it, so they no longer trigger Radix's "DialogContent requires a DialogTitle" error; the sign-in and registration dialogs are named after the form they show, through the new `onModeChange` prop of `TeamsLoginForm` and `TeamsRegistrationForm`.
- 53802c1: Each package now ships the text of the MIT license its manifest declares, in a `LICENSE` file.
- 01552c3: A Tab that a control of a dialog in a shadow root handles itself is left to it, and a `lang` a host changes applies even when the provider already held that value.
- 95d561d: Rendered in a shadow root, the kit root opens its dialogs, popovers and menus in that shadow root instead of `document.body`, and a dialog there takes the focus itself instead of focusing each of its elements in turn (the sign-in dialog opened on its Token tab). In a page nothing changes.
- acbcbb7: `getEmbedProjects(token, tenantId)` reads `GET /embed/projects` with the tenant in the `Tenant-Id` header: the projects a token from the host's `getToken` may track time on (ever-co/ever-gauzy#12080). An API without that route answers an error that keeps its 404 or 403 status; a read with no answer, or an answer that is not a list, comes back as a message with no status. `Select` takes `emptyMessage`, what its list says when it has no item ("No item found" without it). With `getToken`, the timer's project picker lists those projects, and its list says while they are read, when there is none (also on an API without the route) and when they could not be read (any refusal but an older API's 404 or 403 `EMBED_SCOPE`, such as 403 `EMBED_TOKEN_REQUIRED`), in English and French. A failed read is made again with the next token; a list read stays through token renewals, and is no longer shown once the host signs the person out. A project remembered from an earlier entry that the list does not hold (an empty list too) is let go, and picking another project lets the remembered task and client go: the task and client pickers list nothing to change them, and the API refuses a start with a task of another project. `useEmployeeOrganization`, `useMyTasks` and `useOrganizationProjects` no longer send a read the token cannot make: they answer an empty list, so the client and task pickers stay empty with no red notice. Without `getToken` nothing changes.
- 75c31d1: A `Dialog` without a description tells the dialog library there is none: `TeamsLoginDialog` and `TeamsRegistrationDialog` no longer print "Missing `Description`" in the site's console each time they open.
- 02ff88c: `Avatar` takes an optional `alt` for its picture; without one, the picture is described by the avatar's `title`. With an `alt`, the initials shown when there is no picture say the same: the `alt`, or nothing for `alt=""`.
- e72a8ac: `@ever-teams/api`, `@ever-teams/toolkit-ui` and `@ever-teams/atoms` require `@ever-teams/toolkit-types` `^0.2.0`, and `@ever-teams/atoms` requires `@ever-teams/toolkit-ui` `^0.3.0`. The `^0.1.10` range let a 0.1 `@ever-teams/toolkit-types` in, which has no `TimerSource.EMBED`: the timer then started and stopped without its source.
- Updated dependencies [39b3d59]
- Updated dependencies [53802c1]
- Updated dependencies [ab417cb]
- Updated dependencies [7f64ba8]
- Updated dependencies [608d55d]
    - @ever-teams/toolkit-types@0.3.0

## 0.3.0

### Minor Changes

- b195f4d: `PortalContainerContext` and `withKitContainer`: dialogs, alert dialogs, popovers, menus and selects mount their content in the element this context provides, instead of `document.body` when there is none (unchanged default). `TeamsProvider scopedStyles` of `@ever-teams/atoms` provides one inside its kit root.

### Patch Changes

- Auto-generated patch version bump for SDK changes
- ce625a1: Theme colors (`mainColor`, `borderColor`) reach `ThemedButton`, `Progress`, `TabsListThemed`, the timer button, the token sign-in button and the bordered reports as inline styles, through the new `useThemeColor` hook. Under the kit root of `scopedStyles`, the components' utility classes no longer replace a theme's plain color.
- bc585f3: `useThemeColor` reads the theme's own colors when it turns theme-ui's custom properties off (as the kit's theme does), so a host's outer `ThemeUIProvider` no longer lends it its colors, and it gives a nested color scale's `__default` value, as an `sx` color does.
- d166bc2: READMEs: what each package is, and a pointer to the quick start of `@ever-teams/atoms`. `@ever-teams/tracking` says what it records and sends, and asks hosts to get consent and set `apiUrl`.
- Updated dependencies
- Updated dependencies [d166bc2]
- Updated dependencies [1221223]
    - @ever-teams/toolkit-types@0.2.0

## 0.2.6

### Patch Changes

- 410458f: Refactored SDK request structure

## 0.2.5

### Patch Changes

- Class name build includes

## 0.2.4

### Patch Changes

- Raw class exportations

## 0.2.3

### Patch Changes

- Tracking Package First version and integration in other packages
- Updated dependencies
    - @ever-teams/types@0.1.10

## 0.2.2

### Patch Changes

- Introduced team management
- Updated dependencies
    - @ever-teams/types@0.1.9

## 0.2.1

### Patch Changes

- Refac Teams Sign Components, Add language support with i18n.
- Updated dependencies
    - @ever-teams/types@0.1.8
