---
'@ever-teams/api': minor
'@ever-teams/atoms': patch
'@ever-teams/embed': patch
---

The kit's password sign-in lists the workspaces an email and password open, as the web app does: with one, it signs in at once as before; with several, the person picks the one to sign in to, instead of landing in the account updated last. `authSignInWorkspace({ email, token })` signs in to one workspace of `authWithEmailPassword`'s list.
