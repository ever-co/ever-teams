---
'@ever-teams/atoms': patch
---

`TeamsProvider` applies a `lang` the host changes after mount at once, and no longer saves the `lang` it is given as the person's choice: only a language picked in the language switch is kept for later visits, so each page of a site gets its own `lang`.
