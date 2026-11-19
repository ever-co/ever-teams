# @ever-teams/toolkit-ui

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
