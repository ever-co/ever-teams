---
'@ever-teams/toolkit-ui': patch
'@ever-teams/atoms': patch
---

Theme colors (`mainColor`, `borderColor`) reach `ThemedButton`, `Progress`, `TabsListThemed`, the timer button, the token sign-in button and the bordered reports as inline styles, through the new `useThemeColor` hook. Under the kit root of `scopedStyles`, the components' utility classes no longer replace a theme's plain color.
