---
'@ever-teams/api': patch
---

`timeEntries.list()` names each entry's client: its own, else its project's, as the web app does, with only `id`, `name` and `imageUrl`. Before, `organizationContact` was always `null`, since time entries record no client of their own.
