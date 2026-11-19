---
'@ever-teams/api': minor
---

`renewEmbedSiteSession({ apiUrl, renewalToken })` and `revokeEmbedSiteSession({ apiUrl, renewalToken })`, in the main entry: a site whose people sign in with Ever Teams renews its timer token with the renewal token the web app handed it (`POST /embed/renew`, answering `{ token, expiresAt, renewalToken, renewalExpiresAt }`) and ends the sign-in (`POST /embed/revoke`). Both send no `Authorization` header. Each refusal is the SDK's typed error with the API's code and a next step: `EMBED_GRANT_ENDED` (sign in again), `EMBED_ORIGIN`, and `EMBED_ORIGIN_NOT_ALLOWED`, `EMBED_SITE_SIGN_IN_OFF` and `EMBED_MEMBER_NOT_ALLOWED` (keep the renewal token); `EmbedSiteSessionErrorCode` types them. Nothing else changes.
