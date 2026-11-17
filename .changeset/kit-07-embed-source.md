---
'@ever-teams/api': minor
'@ever-teams/atoms': minor
---

The kit's timers now start and stop with `source: 'EMBED'`, so managers can tell embedded time from the web app's in reports. Against an API that does not know that source yet (a 400 naming `source`), the kit sends the request again with `TEAMS`, as before, and keeps `TEAMS` for the rest of the page: nothing changes for hosts on an older API. `currentTimerSource()` tells which one is in use.
