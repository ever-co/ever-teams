---
'@ever-teams/api': patch
---

Every request function, `ApiCall`, `ApiCallUpload` and `TrackingApiClient.getFilteredSessions` take `{ apiUrl }` as an optional last argument (`IApiRequestConfig`): a page that talks to two APIs gives each call its own address. Called without it, they send to the address set with `apiConfigManager.setConfig()`, as before. The TEAMS fallback of an API that refuses the EMBED timer source is kept for the address a write went to. `apiConfigManager.subscribe(listener)` calls `listener` after each `setConfig()` that changes the configuration.
