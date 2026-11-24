---
'@ever-teams/api': patch
'@ever-teams/cli': patch
---

A timer start (`timer.start`, and the kit's `startTimer` that its timers use) and a past entry (`timeEntries.create`) without `isBillable` ask the API to bill the time as its project is set (`billableFromProject`: the project named, else its task's), as the web app does; `timer.start` takes `isBillable` for an explicit choice, and an explicit choice still wins. Time without a project, and an API that does not know the field yet, record what they did before: a start is billable, a past entry is not. `ever-teams log` follows the entry's project the same way and takes `--billable` or `--not-billable` to choose; both together is a usage error, refused before any request.
