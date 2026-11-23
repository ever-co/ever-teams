---
'@ever-teams/atoms': patch
'@ever-teams/embed': patch
---

A person the site signs in from its backend, whom Ever Teams refused (no account, time tracking off, no longer a member), reads that they may not track time in the workspace instead of "Sign in to this site to use your Ever Teams timer.": a `config.getToken` that throws an error with the code `EMBED_MEMBER_NOT_ALLOWED`, or a `token-url` that answers 403 with `{ "code": "EMBED_MEMBER_NOT_ALLOWED" }`, as the route handlers of the `@ever-teams/api` README now do.
