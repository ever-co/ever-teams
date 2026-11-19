---
'@ever-teams/atoms': minor
---

`TeamsProvider` takes `config.signIn: 'ever-teams'` with `config.appUrl` (`https://app.ever.team` by default) and `config.organizationId`, for a site without a server: `TeamsLoginDialog` shows a "Sign in with Ever Teams" button (fr: "Se connecter avec Ever Teams") that opens the web app's `/embed/authorize` in a popup, where the person allows the site. The kit takes the popup's answer only from the web app's origin and from that window, keeps the timer token in memory and the renewal token in `localStorage['_teams-store']` under `siteSignIns`, for its API address, and renews about a minute before expiry, one tab at a time (Web Locks, else a lock in `localStorage`). An ended sign-in (`EMBED_GRANT_ENDED`) is forgotten and the button shows again; the user menu signs out by revoking it. A provider without `signIn` works as before; `getToken` wins when both are given.
