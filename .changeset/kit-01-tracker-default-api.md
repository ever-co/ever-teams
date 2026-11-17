---
'@ever-teams/tracking': patch
---

Without an `apiUrl`, the tracker uploads recordings to the kit's default API (`https://api.ever.team/api`) instead of the demo Gauzy API: the uploads carry the user's token. Set `apiUrl` to your own API, as before.
