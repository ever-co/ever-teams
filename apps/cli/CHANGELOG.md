# @ever-teams/cli

## 0.1.0

### Minor Changes

- a25c4de: First release of the command line `ever-teams`, for Node 26 or later, on `@ever-teams/api`: `login` (a personal API token from a hidden prompt or `--token-stdin`, checked once, then kept in the user's settings folder in a file of mode 600), `logout`, `status`, `start`, `stop`, `today`, `log` (a past entry, where the organization allows manual time), `export` (the entries of a period as CSV or JSON) and `projects`. Every command answers JSON with `--json` and exits with 0 when done, 1 when refused or failed, 2 on a usage error. `EVER_TEAMS_TOKEN` and `EVER_TEAMS_API_URL` (or `--api-url`) win over the stored login, a stored token goes only to the address it was stored for, and no token is ever printed.

### Patch Changes

- 5ae4385: A timer start (`timer.start`, and the kit's `startTimer` that its timers use) and a past entry (`timeEntries.create`) without `isBillable` ask the API to bill the time as its project is set (`billableFromProject`: the project named, else its task's), as the web app does; `timer.start` takes `isBillable` for an explicit choice, and an explicit choice still wins. Time without a project, and an API that does not know the field yet, record what they did before: a start is billable, a past entry is not. `ever-teams log` follows the entry's project the same way and takes `--billable` or `--not-billable` to choose; both together is a usage error, refused before any request.
- Updated dependencies [39b3d59]
- Updated dependencies [53802c1]
- Updated dependencies [477ee1e]
- Updated dependencies [7678d4b]
- Updated dependencies [acbcbb7]
- Updated dependencies [db7b67d]
- Updated dependencies [393b479]
- Updated dependencies [935bdb2]
- Updated dependencies [7f01171]
- Updated dependencies [7f64ba8]
- Updated dependencies [a25c4de]
- Updated dependencies [a51ba41]
- Updated dependencies [5ae4385]
- Updated dependencies [7ea42f5]
- Updated dependencies [20a949e]
- Updated dependencies [dcb4773]
- Updated dependencies [6024c81]
- Updated dependencies [c0f16bf]
- Updated dependencies [464d3b0]
- Updated dependencies [1565902]
- Updated dependencies [64c1d6a]
- Updated dependencies [ae39d65]
- Updated dependencies [e72a8ac]
    - @ever-teams/api@0.3.0
