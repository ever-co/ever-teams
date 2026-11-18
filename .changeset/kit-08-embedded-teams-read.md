---
'@ever-teams/api': minor
'@ever-teams/atoms': patch
---

`getOrganisationTeams` takes `embedded`: a read with a token from the host's `getToken` asks only for the member's teams, by organization and member, as the API's embed guard allows. With `getToken`, the timer's team picker reads its teams that way.
