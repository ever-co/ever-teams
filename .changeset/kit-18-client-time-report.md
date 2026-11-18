---
'@ever-teams/atoms': minor
'@ever-teams/toolkit-types': minor
---

`TeamsClientTimeReport` shows a client the time spent on its projects (today, this week, and this week by project) from what the host's backend returns through `getReport`, in the `IClientTimeReport` shape (new in `@ever-teams/toolkit-types`). A backend that reads it from the Ever Teams API calls `POST /api/embed/client-report` with an embed credential limited to that client, so no token reaches the client's browser; a backend may also return its own figures. Nothing changes for the existing components.
