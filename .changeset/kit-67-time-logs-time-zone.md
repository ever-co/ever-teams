---
'@ever-teams/api': patch
---

`getTimeLogs` sends the time zone's name ("Europe/Berlin") when a profile stores it with its offset, as the web app does, so the kit's timesheet no longer answers "Bad Request" to those people.
