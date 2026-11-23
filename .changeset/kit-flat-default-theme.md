---
'@ever-teams/atoms': minor
---

`defaultTheme` uses the Ever Teams web app's flat primary (`#3826A6`) for its main and border colors, so buttons, tabs, progress circles and focused fields drawn with the theme match the web app. The gradient it had is exported as `gradientTheme` and offered in `TeamsThemeToggle` as "Purple gradient": pass `theme={gradientTheme}` to keep it.
