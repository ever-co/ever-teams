---
'@ever-teams/toolkit-ui': minor
'@ever-teams/atoms': patch
---

The kit's daily statistics ("Worked today" and the day's projects, tasks and activities) count today from local midnight, as the web app does, instead of the last 24 hours. `@ever-teams/toolkit-ui` adds `getTodaySoFar()`; `getStartAndEndOfDay()` keeps its window for anyone who calls it.
