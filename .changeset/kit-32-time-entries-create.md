---
'@ever-teams/api': minor
---

`timeEntries.create({ startedAt, stoppedAt, projectId?, taskId?, organizationTeamId?, description?, reason?, isBillable? })` adds a past entry of the token's member (`POST /timesheet/time-log`, with only the fields the API declares) and answers its time log. A range with no time of day, or that does not end after it starts, is refused before any request (`INVALID_DATE`); an organization that does not allow manual time answers an `EverTeamsForbiddenError` that says so, and a range over a running timer or a break an `EverTeamsConflictError` with the API's code (`RUNNING_TIMER_OVERLAP`, `BREAK_OVERLAP`). `timeEntries.list({ from, to, mine: true })` lists only the entries of the token's own member, whatever `employeeIds` names. Without the new method and option, nothing changes.
