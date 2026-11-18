---
'@ever-teams/atoms': minor
'@ever-teams/toolkit-types': minor
---

`TeamsClientTimeReport` shows a client the time spent on its projects (today, this week, and this week by project) from what the host's backend returns through `getReport`; the backend gets that `IClientTimeReport` (new in `@ever-teams/toolkit-types`) from the Ever Teams API with an embed credential limited to that client, so no token reaches the client's browser. It needs an API with `POST /api/embed/client-report`. Nothing changes for the existing components.
