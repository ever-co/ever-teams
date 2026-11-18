---
'@ever-teams/atoms': minor
---

`TeamsProvider` takes `config.getToken`, which signs people in from the host's backend: the kit asks it for a short-lived token at start, shortly before the token expires and once after the API refuses it, keeps the token in memory only, asks for no password or token in the page (`TeamsLoginDialog` says to sign in to the site instead), reads the organization from the token and lists no other. Without `getToken` nothing changes, except a one-time console warning that the password and token sign-in ask for an Ever Teams credential inside the page. A token renewed for the same person keeps the timer's status on screen.
