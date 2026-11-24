# @ever-teams/embed

## 0.1.0

### Minor Changes

- a51ba41: `<ever-teams-timer sign-in="ever-teams" organization="..." app-url="...">` signs people in with Ever Teams in a popup, with no password or token typed in the page. Without `sign-in`, or with another value, the element keeps the kit's own sign-in. The shipped declaration types the three attributes, also in camelCase (`signIn`, `organization`, `appUrl`).
- b787bea: A host can sign the person out of a sign-in with Ever Teams from its own sign-out, on a computer people share: `useSiteSignIn()` gives the controls the user menu uses (`signOut()` shows the button again), `endSiteSignIn({ apiUrl, organizationId })` ends a saved sign-in when no provider shows it, and `<ever-teams-timer>` gets `signOut()`, which does the same from the page, also once the element is removed.
- 9541704: `<ever-teams-timer token-url="/api/ever-teams-token">` signs the person in from your backend: the element asks your own route (the `exchangeEmbedToken` route of `@ever-teams/api`) with a `POST` and the page's cookies, uses the `{ token, expiresAt }` it answers, and asks again before it expires. A refusal shows the person as signed out. Another `token-url`, or `signOut()`, starts a new session that drops the token the element held, so a page that signs its own user out without a reload signs the timer out too. Nothing changes for an element without it.

### Patch Changes

- 64c1d6a: The kit's password sign-in lists the workspaces an email and password open, as the web app does: with one, it signs in at once as before; with several, the person picks the one to sign in to, instead of landing in the account updated last. `authSignInWorkspace({ email, token })` signs in to one workspace of `authWithEmailPassword`'s list.
- ae39d65: The kit's password sign-in asks an account with two-factor sign-in on for the code of its authenticator app, or a recovery code, instead of saying the person may not track time. `authVerifyTwoFactor({ challenge, code })` (or `recoveryCode`) completes a sign-in the API answered with `TWO_FACTOR_REQUIRED`.
- 2d89212: A person the site signs in from its backend, whom Ever Teams refused (no account, time tracking off, no longer a member), reads that they may not track time in the workspace instead of "Sign in to this site to use your Ever Teams timer.": a `config.getToken` that throws an error with the code `EMBED_MEMBER_NOT_ALLOWED`, or a `token-url` that answers 403 with `{ "code": "EMBED_MEMBER_NOT_ALLOWED" }`, as the route handlers of the `@ever-teams/api` README now do.
