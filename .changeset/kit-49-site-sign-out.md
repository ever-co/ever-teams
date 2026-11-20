---
'@ever-teams/atoms': minor
'@ever-teams/embed': minor
---

A host can sign the person out of a sign-in with Ever Teams from its own sign-out, on a computer people share: `useSiteSignIn()` gives the controls the user menu uses (`signOut()` shows the button again), `endSiteSignIn({ apiUrl, organizationId })` ends a saved sign-in when no provider shows it, and `<ever-teams-timer>` gets `signOut()`, which does the same from the page, also once the element is removed.
