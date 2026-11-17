---
'@ever-teams/toolkit-ui': patch
---

`useThemeColor` reads the theme's own colors when it turns theme-ui's custom properties off (as the kit's theme does), so a host's outer `ThemeUIProvider` no longer lends it its colors, and it gives a nested color scale's `__default` value, as an `sx` color does.
