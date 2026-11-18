---
'@ever-teams/embed': patch
'@ever-teams/atoms': patch
'@ever-teams/toolkit-ui': patch
---

Removing `api-url` from `<ever-teams-timer>` brings back the default API address; a Tab a control of a dialog in a shadow root handles itself is left to it; a `lang` a host changes applies even when the provider already held that value.
