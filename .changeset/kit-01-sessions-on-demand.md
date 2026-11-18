---
'@ever-teams/atoms': patch
---

`TeamsProvider` reads tracking sessions only while a component that shows them (filter, insights, heatmap, replay) is on the page, and always from the kit's own API. A page with a timer alone makes no session request. This release also carries the fix of October 17: without `config.apiUrl`, the published 0.2.14 sent the signed-in user's token to the demo Gauzy API.
