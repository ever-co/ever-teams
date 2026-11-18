---
'@ever-teams/atoms': patch
---

Each `TeamsProvider` sends the requests of its components (sign-in, the person's reads, the timer and its pickers, the reports, the team and profile forms, the sessions list) to its own `config.apiUrl`: two providers of a page, or two `<ever-teams-timer>` elements with two `api-url`, no longer send everything to the address set last. A provider without `apiUrl` follows `apiConfigManager` as before, and every provider still sets it.
