---
'@ever-teams/api': minor
---

The client's methods answer types of their own, exported from the package and checked against answers recorded from the API: `timer.status()` answers `EverTeamsTimerStatus`, `timer.start()` and `timer.stop()` an `EverTeamsTimeLog` (its `projectId`, `taskId` and `organizationTeamId` are `null` when the timer started without them, `logType` and `source` are their text values), `timeEntries.list()` `EverTeamsTimeEntry[]`, `projects.list()` `EverTeamsProject[]`, `tasks.list()` `EverTeamsTask[]` and `members.list()` `EverTeamsMember[]`. `timerChangeOf` takes what `timer.status()` answers as well as the kit's `ITimerStatus` (its parameter is `TimerStatusRead`). The request functions and `@ever-teams/toolkit-types` are unchanged.
