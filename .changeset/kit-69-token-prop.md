---
'@ever-teams/atoms': patch
---

`TeamsProvider`'s `token` prop, which the provider never read, is marked deprecated, and passing it warns once in the console with the sign-in options the kit reads: `config.getToken`, `config.signIn: 'ever-teams'` or the kit's sign-in dialog (`TeamsLoginDialog`).
