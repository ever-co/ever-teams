---
'@ever-teams/api': patch
---

`TrackingApiClient` created without a base URL now reads sessions from the API the SDK is configured with (`apiConfigManager`, `https://api.ever.team/api` by default) instead of the demo Gauzy API, so the user's token is never sent to another server. A base URL given to the constructor or to `updateConfig` still wins.
