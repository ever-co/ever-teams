---
'@ever-teams/embed': minor
---

`<ever-teams-timer token-url="/api/ever-teams-token">` signs the person in from your backend: the element asks your own route (the `exchangeEmbedToken` route of `@ever-teams/api`) with a `POST` and the page's cookies, uses the `{ token, expiresAt }` it answers, and asks again before it expires. A refusal shows the person as signed out. Another `token-url`, or `signOut()`, starts a new session that drops the token the element held, so a page that signs its own user out without a reload signs the timer out too. Nothing changes for an element without it.
