---
'@ever-teams/atoms': patch
---

The session a sign-in saves in `localStorage['_teams-store']` names the API address that issued its token: a `TeamsProvider` reads back only the session of the address it sends to, so a page for one server no longer sends another server's token to it, nor says "Your session ended" for a server nobody signed in to there. A sign-out or "Sign in again" removes the session of that address only, and a provider whose `apiUrl` changes starts its session afresh. A site with one server keeps the shape it had under that key; a session saved by an earlier version is kept by the first provider that reads it. `updateSession` takes the address as an optional third argument.
