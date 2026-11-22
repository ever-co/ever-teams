---
'@ever-teams/api': minor
'@ever-teams/atoms': patch
'@ever-teams/embed': patch
---

The kit's password sign-in asks an account with two-factor sign-in on for the code of its authenticator app, or a recovery code, instead of saying the person may not track time. `authVerifyTwoFactor({ challenge, code })` (or `recoveryCode`) completes a sign-in the API answered with `TWO_FACTOR_REQUIRED`.
