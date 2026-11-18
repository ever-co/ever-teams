---
'@ever-teams/api': minor
'@ever-teams/toolkit-ui': patch
'@ever-teams/atoms': patch
---

`getEmbedProjects(token)` reads `GET /embed/projects`: the projects a token from the host's `getToken` may track time on (ever-co/ever-gauzy#12080). An API without that route answers an error that keeps its 404 or 403 status. `Select` takes `emptyMessage`, what its list says when it has no item ("No item found" without it). With `getToken`, the timer's project picker lists those projects, and its list says while they are read, when there is none (also on an API without the route) and when they could not be read, in English and French. `useEmployeeOrganization`, `useMyTasks` and `useOrganizationProjects` no longer send a read the token cannot make: they answer an empty list, so the client and task pickers stay empty with no red notice. Without `getToken` nothing changes.
