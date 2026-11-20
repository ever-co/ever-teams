---
'@ever-teams/atoms': patch
---

Signed out while the timer runs (the host's `getToken` fails, a credential is revoked, a sign-in with Ever Teams ends), the kit's signed-out prompt now says that the timer keeps running in Ever Teams until the person stops it there, instead of showing a stopped timer and nothing else. It says so when the last timer status the kit read before the sign-out showed the timer running: with no status read (no timer widget on the page), the prompt is the same as before.
