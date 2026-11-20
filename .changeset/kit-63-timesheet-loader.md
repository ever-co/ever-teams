---
'@ever-teams/atoms': patch
---

`TeamsTimesheet` draws its loader over its table from outside it, so the console no longer reports a `<div>` inside a `<tbody>` each time the time logs load, and the table's rows stay in place while they load.
