# @ever-teams/api

The typed client of an Ever Teams API (Gauzy), for Node 20 or later and the browser: start and stop the timer, list
time entries, projects, tasks and members, and read the tracked totals of the day and the week. It has no user
interface. It also holds the request functions the Ever Teams kit makes (see [The request functions](#the-request-functions)).

To show a timer or a report in a React page, install [`@ever-teams/atoms`](https://www.npmjs.com/package/@ever-teams/atoms),
which uses this package: start with [its README](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#readme).

## Install

```sh
npm install @ever-teams/api
```

It brings two dependencies: `@ever-teams/toolkit-types` (the types of the answers) and `qs`. It uses the platform's
`fetch`.

## Quick start: start a timer from a script

You need the address of your Ever Teams API, ending with `/api` (the hosted service's is `https://api.ever.team/api`),
and a token:

- a **personal API token**: in the web app, open Settings > API tokens and create one. The server must offer them
  (`GAUZY_USER_API_TOKENS_ENABLED`); the page says so when it does not. The client exchanges it for a short-lived
  access token, and again when that one expires.
- or a token your server got from the **embed exchange**. It reaches the timer only.

In an empty folder:

```sh
npm init -y
npm install @ever-teams/api
```

Save this as `start.mjs`:

```js
import { createClient } from '@ever-teams/api';

const teams = createClient({
	apiUrl: process.env.EVER_TEAMS_API_URL,
	token: process.env.EVER_TEAMS_TOKEN
});

const log = await teams.timer.start();
console.log(`Timer started at ${log.startedAt}`);
```

Run it with your address and token in the environment, never in the file:

```sh
EVER_TEAMS_API_URL=https://api.example.com/api EVER_TEAMS_TOKEN=gzp_... node start.mjs
```

In PowerShell, set them first: `$env:EVER_TEAMS_API_URL = 'https://api.example.com/api'` and
`$env:EVER_TEAMS_TOKEN = 'gzp_...'`, then `node start.mjs`. Stop the timer with `await teams.timer.stop()`.

A personal API token acts as you: keep it on a server or in a script, never in a page a browser loads. A page gets
its tokens from your server through `getToken` (see below).

## createClient(options)

```js
import { createClient } from '@ever-teams/api';

const teams = createClient({ apiUrl: process.env.EVER_TEAMS_API_URL, token: process.env.EVER_TEAMS_TOKEN });
```

Each client keeps its own address, token and `fetch`: two clients never share them, and neither changes the
configuration of the request functions.

| Option           | Required              | What it is                                                                                                                                  |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`         | yes                   | The API's address, ending with `/api`.                                                                                                      |
| `token`          | `token` or `getToken` | A personal API token (`gzp_...`), or an access token such as an embed token.                                                                |
| `getToken`       | `token` or `getToken` | `() => Promise<string \| { token: string }>`. Gives the first token when there is no `token`, and a new one once after the API refused one. |
| `tenantId`       | no                    | The tenant to work in. Without it, the client reads it once from `GET /user/me`.                                                            |
| `organizationId` | no                    | The organization to work in. Without it, the client reads the member's organization once from `GET /user/me`.                               |
| `fetch`          | no                    | The `fetch` to send requests with; the platform's by default.                                                                               |
| `headers`        | no                    | Headers added to every request. The client's own (`Authorization`, `tenant-id`, `organization-id`) take precedence.                         |

In a browser page, ask your server for the token, so no secret reaches the page:

```js
const teams = createClient({
	apiUrl: 'https://api.example.com/api',
	getToken: async () => {
		const answer = await fetch('/api/ever-teams-token', { method: 'POST' });
		return answer.json(); // { token: '...' }
	}
});
```

After a 401 the client asks `getToken` for a new token once (or exchanges the personal token again) and sends the
request once more. A second refusal is thrown. A client stands for one person: it reads `GET /user/me` once, so
`getToken` must answer tokens of that person. For another person, create another client.

## The client's methods

Each method answers the API's data, with the type the table names, and throws an `EverTeamsError` on a failure. The
table names the route behind each one; they are the routes the kit already calls.

| Method                                | Route                                             | Answer                     |
| ------------------------------------- | ------------------------------------------------- | -------------------------- |
| `timer.status()`                      | `GET /timesheet/timer/status`                     | `EverTeamsTimerStatus`     |
| `timer.start(options?)`               | `POST /timesheet/timer/start`                     | `EverTeamsTimeLog`         |
| `timer.stop()`                        | `POST /timesheet/timer/stop`                      | `EverTeamsTimeLog \| null` |
| `timeEntries.list({ from, to, ... })` | `GET /timesheet/time-log`                         | `ITimeLog[]`               |
| `projects.list()`                     | `GET /organization-projects/employee/:employeeId` | `EverTeamsProject[]`       |
| `tasks.list({ projectId? })`          | `GET /tasks/employee/:employeeId`                 | `EverTeamsTask[]`          |
| `members.list()`                      | `GET /employee/working`                           | `EverTeamsMember[]`        |
| `totals.today()`, `totals.week()`     | `GET /timesheet/statistics/counts`                | `EverTeamsTotal`           |

### timer.status()

Whether the timer runs, its last time log, and the seconds tracked today.

```js
const status = await teams.timer.status();
if (status.running) {
	console.log(`Running since ${status.lastLog.startedAt}, ${status.duration} s today`);
}
```

### timer.start(options?)

Starts the timer at the API's time and answers the new time log. Every option is optional: `projectId`, `taskId`,
`organizationTeamId`, `description`.

```js
const log = await teams.timer.start({ projectId, taskId, description: 'Review the pull request' });
```

The time is recorded with the source `EMBED`; an API that predates that source gets `TEAMS` instead, as the kit does.
In the answer, `projectId`, `taskId` and `organizationTeamId` are `null` when the timer started without them.

### timer.stop()

Stops the running timer and answers its time log. With no timer running, the API refuses it (an `EverTeamsError`
with status 406).

```js
const log = await teams.timer.stop();
```

### timeEntries.list({ from, to, employeeIds? })

The time entries started from `from` to `to`, each with its project, task, client and member. A day (`YYYY-MM-DD`)
means that whole day in the time zone the code runs in; a `Date` or an ISO date-time is the instant it names. Without
`employeeIds`, the API answers the entries of every member the token may see.

```js
const today = await teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18' });
const seconds = today.reduce((sum, entry) => sum + entry.duration, 0);
```

### projects.list()

The projects of the token's member.

```js
const projects = await teams.projects.list();
const website = projects.find((project) => project.name === 'Website');
await teams.timer.start({ projectId: website.id });
```

### tasks.list({ projectId? })

The tasks of the token's member, in one project when it is given.

```js
const tasks = await teams.tasks.list({ projectId: website.id });
```

### members.list()

The organization's members working this week, each with its user. The API answers it to a role that may select
employees; for another, it throws an `EverTeamsForbiddenError`.

```js
const members = await teams.members.list();
console.log(members.map((member) => member.fullName));
```

### totals.today() and totals.week()

The member's tracked time today, or this week from Monday to Sunday: `{ duration, activity }`, the seconds and the
average activity in percent.

```js
const { duration } = await teams.totals.week();
console.log(`${Math.round(duration / 3600)} h this week`);
```

### With an embed token

An embed token reaches the timer and the user only: `timer.status()`, `timer.start()` and `timer.stop()` work, and
the other methods throw an `EverTeamsForbiddenError` with the code `EMBED_SCOPE`. Today's tracked seconds are in
`(await teams.timer.status()).duration`.

## Errors

Every failure is an `EverTeamsError`: its `message`, the HTTP `status` (0 when there was no answer), the API's `code`
when its answer has one, the API's answer as `body`, and `nextStep`, a sentence that says what to do.

```js
import { createClient, EverTeamsAuthError, EverTeamsError } from '@ever-teams/api';

try {
	await teams.timer.start({ projectId });
} catch (error) {
	if (error instanceof EverTeamsAuthError) {
		console.error('Create a new token, then run the script again.');
	} else if (error instanceof EverTeamsError) {
		console.error(`${error.message} (${error.status}). ${error.nextStep}`);
	} else {
		throw error;
	}
}
```

| Class                      | When                                      | What it adds                                                                                                              |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `EverTeamsAuthError`       | 401: the token expired or was revoked     | The next step: get a new token, or give `getToken`.                                                                       |
| `EverTeamsForbiddenError`  | 403: the token may not do this            | `code`: `EMBED_SCOPE`, `EMBED_ORIGIN`, `EMBED_CLIENT_PROJECT`, or none for a missing permission, each with its next step. |
| `EverTeamsNotFoundError`   | 404                                       | The next step: check `apiUrl` and the ids.                                                                                |
| `EverTeamsValidationError` | 400 or 422: the API refused the values    | `messages`: the API's messages, each naming a field.                                                                      |
| `EverTeamsConflictError`   | 409: the request conflicts with the state | `messages`, as a validation error (it extends that class).                                                                |
| `EverTeamsRateLimitError`  | 429: too many requests                    | `retryAfter`: the seconds to wait, from the `Retry-After` header.                                                         |
| `EverTeamsServerError`     | 5xx: the API or a gateway failed          | The next step: try again in a moment.                                                                                     |
| `EverTeamsNetworkError`    | No answer: wrong address, network, CORS   | `cause`: the error `fetch` threw.                                                                                         |

The client also throws an `EverTeamsError` with status 0 and one of these codes before or without a request:
`CLIENT_OPTIONS` (no `apiUrl`, or neither `token` nor `getToken`), `NO_TOKEN`, `NO_ORGANIZATION` and `NO_EMPLOYEE`
(the token's user is not a member of an organization, or `organizationId` names another organization than its
member's), `INVALID_DATE`, `NO_FETCH`; and `NOT_JSON` with the answer's status when `apiUrl` answers something else
than JSON, such as the web app's pages.

An error your `getToken` throws comes back as it is. A browser reads `Retry-After` only when the API exposes it to
the page (CORS): there, `retryAfter` may stay `undefined`. When a page loads both the ESM and the CommonJS build, `instanceof` works within one build;
`error.name` (`'EverTeamsAuthError'`, ...) works across both.

## The request functions

Every function this package exported before `createClient` is still exported and works as before. They hold the
requests the kit makes: sign-in, user, organization, teams, tasks, projects, the timer and the time logs. They take
the user, the token and the kit's state, return an `IServerError` value on a failure instead of throwing, and send
every request to the one address set with `apiConfigManager.setConfig({ apiUrl })` (default
`https://api.ever.team/api`); `TeamsProvider` of `@ever-teams/atoms` sets it from its `config.apiUrl`.

```js
import { apiConfigManager, getTimerStatus } from '@ever-teams/api';

apiConfigManager.setConfig({ apiUrl: process.env.EVER_TEAMS_API_URL });
const status = await getTimerStatus(user, accessToken, organizationId);
```

A new script or server is simpler with `createClient`. Nothing is deprecated: any change to these functions will be
announced in the changelog first, and made later in a release of its own.

## License

MIT
