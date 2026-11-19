---
'@ever-teams/atoms': patch
---

Each `TeamsProvider` sends the requests of its components (sign-in, the person's reads, the timer and its pickers, the reports, the team and profile forms, the sessions list) to its own `config.apiUrl`: two providers of a page, or two `<ever-teams-timer>` elements with two `api-url`, no longer send everything to the address set last. A provider without `apiUrl` follows `apiConfigManager` as before, its sessions list included, and every provider still sets it. A provider whose `apiUrl` changes, or without one, whose page's address changes, starts its state afresh, as it does when `getToken` is turned on or off, so an answer of the previous address never shows in the new one's widgets, nor a toast of its errors.
