---
'@ever-teams/api': patch
---

With an embed token, the methods the token cannot reach (time entries, totals, members, projects, tasks) throw `EverTeamsForbiddenError` with the code `EMBED_SCOPE` without sending a request, so a browser gets the documented error instead of a network error that pointed at CORS. The timer and the user are sent as before, and any other token is sent as before.
