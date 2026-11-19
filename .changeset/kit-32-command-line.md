---
'@ever-teams/cli': minor
---

First release of the command line `ever-teams`, for Node 20 or later, on `@ever-teams/api`: `login` (a personal API token from a hidden prompt or `--token-stdin`, checked once, then kept in the user's settings folder in a file of mode 600), `logout`, `status`, `start`, `stop`, `today`, `log` (a past entry, where the organization allows manual time), `export` (the entries of a period as CSV or JSON) and `projects`. Every command answers JSON with `--json` and exits with 0 when done, 1 when refused or failed, 2 on a usage error. `EVER_TEAMS_TOKEN` and `EVER_TEAMS_API_URL` (or `--api-url`) win over the stored login, a stored token goes only to the address it was stored for, and no token is ever printed.
