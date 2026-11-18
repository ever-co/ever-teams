# Teams api calls

`@ever-teams/api` holds the requests the Ever Teams kit makes to an Ever Teams (Gauzy) API: sign-in, user,
organization, teams, tasks, projects, the timer and the time logs. It has no user interface.

Most hosts install [`@ever-teams/atoms`](https://www.npmjs.com/package/@ever-teams/atoms) only, which uses this
package: start with [its README](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#readme).

Every request goes to the address set with `apiConfigManager.setConfig({ apiUrl })` (default
`https://api.ever.team/api`); `TeamsProvider` of `@ever-teams/atoms` sets it from its `config.apiUrl`. MIT licensed.
