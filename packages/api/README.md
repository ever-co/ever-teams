# @ever-teams/api

The typed client of an Ever Teams API (Gauzy), for Node 20 or later and the browser: start and stop the timer, list
and add time entries, projects, tasks and members, and read the tracked totals of the day and the week. It has no user
interface. It also holds the request functions the Ever Teams kit makes (see [The request functions](#the-request-functions)).

To show a timer or a report in a React page, install [`@ever-teams/atoms`](https://www.npmjs.com/package/@ever-teams/atoms),
which uses this package: start with [its README](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#readme).

On your server, `@ever-teams/api/server` exchanges an embed credential for a short-lived token for a person signed in
to your product: see [Sign people in from your server](#sign-people-in-from-your-server). A site without a server
lets the person sign in with Ever Teams in a popup instead, and renews that sign-in from the page: see
[Renew a sign-in from a site](#renew-a-sign-in-from-a-site). It also checks the
signature of the webhooks the API sends when a timer starts or stops: see
[Receive the API's webhooks](#receive-the-apis-webhooks).

## Install

```sh
npm install @ever-teams/api
```

It brings two dependencies: `@ever-teams/toolkit-types` (the types it shares with the kit) and `qs`. It uses the
platform's `fetch`.

## Quick start: start a timer from a script

You need the address of your Ever Teams API, ending with `/api` (the hosted service's is `https://api.ever.team/api`),
and a token:

- a **personal API token**: in the web app, open Settings > API tokens and create one. The server must offer them
  (`GAUZY_USER_API_TOKENS_ENABLED`); the page says so when it does not. The client exchanges it for a short-lived
  access token, and again when that one expires.
- or a token your server got from the **embed exchange** (see [Sign people in from your server](#sign-people-in-from-your-server)).
  It reaches the timer only.

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
| `timer.watch(listener, options?)`     | `GET /timesheet/timer/status`, at each read       | `() => void`               |
| `timeEntries.list({ from, to, ... })` | `GET /timesheet/time-log`                         | `EverTeamsTimeEntry[]`     |
| `timeEntries.create({ ... })`         | `POST /timesheet/time-log`                        | `EverTeamsTimeLog`         |
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
`organizationTeamId`, `description`, `isBillable`.

```js
const log = await teams.timer.start({ projectId, taskId, description: 'Review the pull request' });
```

The time is recorded with the source `EMBED`; an API that predates that source gets `TEAMS` instead, as the kit does.
In the answer, `projectId`, `taskId` and `organizationTeamId` are `null` when the timer started without them.

Without `isBillable`, the time is billable as its project is set (the one named, else its task's), as in the web app;
time without a project is billable. An API older than this setting records every start as billable.

### timer.stop()

Stops the running timer and answers its time log. With no timer running, the API refuses it (an `EverTeamsError`
with status 406).

```js
const log = await teams.timer.stop();
```

### timer.watch(listener, options?)

Tells `listener` the timer as a first read shows it, then each start or stop a later read shows, wherever it was made
(the web app, the desktop app, a script). It answers the function that stops it.

```js
const stopWatching = teams.timer.watch(
	(change) => {
		if (change.running) {
			console.log(`Started at ${change.startedAt} on project ${change.projectId}`);
			return;
		}
		console.log('Stopped');
	},
	{ onError: (error) => console.error(error.message, error.nextStep) }
);

// Later, when the page or the script no longer needs it:
stopWatching();
```

The listener receives a `TimerChange`: `running`, `startedAt` (an ISO date, `null` while stopped), `projectId`,
`taskId`, and `initial`, `true` for the first read. After the first read it runs once per start, stop or switch to
another running entry (another start, project or task), never twice for one change.

| Option    | Default | What it does                                                                                                                                      |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `every`   | `60000` | Milliseconds between two reads, 15 000 at the least: a shorter one reads every 15 seconds.                                                        |
| `onError` | none    | Called with the error of a read that failed (an `EverTeamsError`, or what `getToken` threw), and with what the listener threw. The watch goes on. |

An answer with no status in it is a failed read too (`UNEXPECTED_ANSWER`). Without `onError`, a failed read is dropped
and the watch reads again at its next turn; an error the listener throws is thrown again on a fresh task, as an
uncaught error (in Node, `process.on('uncaughtException')` sees it). Neither stops the watch, and neither becomes an
unhandled rejection.

It reads `timer.status()` at once, then every `every` milliseconds, one read at a time. In a page it reads only while
the page is visible, and once more when the page becomes visible again or the network comes back (after the read
pending then, if there is one); in Node it reads at every turn. That is when it reads, not a deadline for the
listener: a change made elsewhere is told when a read that succeeds shows it, and a read can fail or come late. A start
and a stop that both fall between two reads leave the timer as the last read saw it, so neither is told. A server that
needs each change at once receives the API's webhooks instead (see
[Receive the API's webhooks](#receive-the-apis-webhooks)).

A host that reads the status itself can use the same rule: `timerChangeOf(status, previous)` answers the change a read
shows after the last one, or `null` when the timer is as it was.

```js
import { timerChangeOf } from '@ever-teams/api';

let last = null;
const change = timerChangeOf(await teams.timer.status(), last);
if (change) {
	last = change;
}
```

### timeEntries.list({ from, to, employeeIds?, mine? })

The time entries started from `from` to `to`, each with its project, task, client and member. A day (`YYYY-MM-DD`)
means that whole day in the time zone the code runs in; a `Date` or an ISO date-time is the instant it names. Without
`employeeIds`, the API answers the entries of every member the token may see: a manager's token sees the team's.
With `mine: true`, it answers only the entries of the token's own member, whatever `employeeIds` names.

```js
const today = await teams.timeEntries.list({ from: '2026-11-18', to: '2026-11-18', mine: true });
const seconds = today.reduce((sum, entry) => sum + entry.duration, 0);
```

### timeEntries.create({ startedAt, stoppedAt, ... })

Adds a past entry of the token's member, from `startedAt` to `stoppedAt` (each a `Date` or an ISO date-time with its
time of day), and answers its time log. The other fields are optional: `projectId`, `taskId`, `organizationTeamId`,
`description`, `reason` (why the time is added by hand, kept with the entry) and `isBillable`.

```js
const log = await teams.timeEntries.create({
	startedAt: '2026-11-18T09:00:00+01:00',
	stoppedAt: '2026-11-18T10:30:00+01:00',
	projectId,
	description: 'Call with the client'
});
```

The API records it as time added by hand (`logType` `MANUAL`). It refuses it with an `EverTeamsForbiddenError` when
the organization does not allow manual time or the member's role may not add it, and with an
`EverTeamsConflictError` when the range overlaps a timer still running (`code` `RUNNING_TIMER_OVERLAP`) or a break
(`BREAK_OVERLAP`); each says what to do next. A range with no time of day, or that does not end after it starts, is
refused before any request (`INVALID_DATE`). An entry it overlaps loses the time the new one covers, as in the web app.
Without `isBillable`, the entry is billable as its project is set, as in the web app; an entry without a project is
not billable. An API older than this setting records it as not billable.

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
the other methods throw an `EverTeamsForbiddenError` with the code `EMBED_SCOPE`. The client knows an embed token by
its claims and throws that error without a request, so a browser gets it too (the API answers an allowed site's CORS on
the timer's routes only). Today's tracked seconds are in `(await teams.timer.status()).duration`.

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
| `EverTeamsNetworkError`    | No answer: wrong address, network, CORS   | `cause`: the error `fetch` threw (from the server helpers: a copy of its name, message, code and causes).                 |

The client also throws an `EverTeamsError` with status 0 and one of these codes before or without a request:
`CLIENT_OPTIONS` (no `apiUrl`, or neither `token` nor `getToken`; a `timer.watch` listener that is not a function, or
an `every` that is not a number), `NO_TOKEN`, `NO_ORGANIZATION` and `NO_EMPLOYEE`
(the token's user is not a member of an organization, or `organizationId` names another organization than its
member's), `INVALID_DATE` (also a date-time on a day that does not exist, such as 2026-02-29T00:00:00Z), `NO_FETCH`,
`UNEXPECTED_ANSWER` (`GET /user/me` answered no user, and the next call reads it again; or a read of `timer.watch`
answered no status, which goes to its `onError`); and `NOT_JSON` with the answer's status when `apiUrl` answers
something else than JSON, such as the web app's pages.

An error your `getToken` throws comes back as it is. A browser reads `Retry-After` only when the API exposes it to
the page (CORS): there, `retryAfter` may stay `undefined`. When a page loads both the ESM and the CommonJS build, `instanceof` works within one build;
`error.name` (`'EverTeamsAuthError'`, ...) works across both.

## Sign people in from your server

A page of your product shows a person's Ever Teams timer with a short-lived **embed token**, which your server gets
for them. Your server holds an **embed credential** (`gze_...`): an administrator of the organization creates it in
Settings > Workspace > Embeds of the web app, and adds your site to the allowed sites on the same page. The
credential stays on your server, in an environment variable; only the token reaches the page.

`@ever-teams/api/server` exchanges the credential for a token in one call:

```js
import { exchangeEmbedToken } from '@ever-teams/api/server';

const { token, expiresAt } = await exchangeEmbedToken({
	apiUrl: process.env.EVER_TEAMS_API_URL,
	credential: process.env.EVER_TEAMS_EMBED_CREDENTIAL,
	email: user.email, // the person signed in to your product
	origin: 'https://app.example.com'
});
```

| Option                  | Required    | What it is                                                                                                                                                                                    |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`                | yes         | The API's address, ending with `/api`.                                                                                                                                                        |
| `credential`            | yes         | The embed credential, from an environment variable.                                                                                                                                           |
| `email` or `employeeId` | one of them | The person: the email of their Ever Teams account, or their employee id in the credential's organization.                                                                                     |
| `origin`                | yes         | The site of the page the timer runs in (`https://app.example.com`, no path), one of the organization's allowed sites. In a browser the token works only from it.                              |
| `firstName`, `lastName` | no          | Sent only when given: the name of the account the API creates for `email` when the credential may add members ([ever-co/ever-gauzy#12084](https://github.com/ever-co/ever-gauzy/pull/12084)). |
| `fetch`                 | no          | The `fetch` to send the request with; the platform's by default.                                                                                                                              |

The token reaches only that person's timer, from that site, until `expiresAt` (an ISO date): 15 minutes unless the
API's administrator set `GAUZY_EMBED_TOKEN_TTL_SECONDS`, one hour at most. Answer it to the page with
`Cache-Control: no-store`. In the page, give it to `createClient` through `getToken`, or to the kit's
`config.getToken` ([`@ever-teams/atoms`](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#sign-in-from-your-backend)),
which asks your server again before the token expires.

The entry runs on a server only: Node 20 or later, or another runtime with `fetch` and no `document`. A bundle for a
page refuses it (the `browser` condition of the package's `exports`), and in a page it throws an `EverTeamsError`
with the code `SERVER_ONLY`.

### In a Next.js route handler

```ts
// app/api/ever-teams-token/route.ts
import { NextResponse } from 'next/server';
import { exchangeEmbedToken } from '@ever-teams/api/server';
import { currentUser } from '@/lib/session'; // your own sign-in

const noStore = { 'Cache-Control': 'no-store' };

export async function POST() {
	const user = await currentUser();
	if (!user) {
		return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: noStore });
	}
	try {
		const answer = await exchangeEmbedToken({
			apiUrl: process.env.EVER_TEAMS_API_URL,
			credential: process.env.EVER_TEAMS_EMBED_CREDENTIAL,
			email: user.email,
			origin: process.env.APP_ORIGIN // https://app.example.com
		});
		return NextResponse.json(answer, { headers: noStore });
	} catch (error) {
		console.error(error); // its message and nextStep say why; no error holds the credential
		return NextResponse.json({ error: 'No Ever Teams token' }, { status: 502, headers: noStore });
	}
}
```

### In Express

```js
import express from 'express';
import { exchangeEmbedToken } from '@ever-teams/api/server';

const app = express();

// req.user: the person your own session middleware signed in.
app.post('/api/ever-teams-token', async (req, res) => {
	res.set('Cache-Control', 'no-store');
	if (!req.user) {
		return res.status(401).json({ error: 'Not signed in' });
	}
	try {
		const answer = await exchangeEmbedToken({
			apiUrl: process.env.EVER_TEAMS_API_URL,
			credential: process.env.EVER_TEAMS_EMBED_CREDENTIAL,
			email: req.user.email,
			origin: process.env.APP_ORIGIN
		});
		res.json(answer);
	} catch (error) {
		console.error(error);
		res.status(502).json({ error: 'No Ever Teams token' });
	}
});
```

### With plain fetch

A server whose handlers take a `Request` and answer a `Response` (the Fetch API), such as Bun, Deno, a Cloudflare
Worker or Hono:

```js
import { exchangeEmbedToken } from '@ever-teams/api/server';
import { signedInUser } from './session.js'; // your own sign-in

const noStore = { 'Cache-Control': 'no-store' };

export async function everTeamsToken(request, env) {
	const user = await signedInUser(request);
	if (!user) {
		return Response.json({ error: 'Not signed in' }, { status: 401, headers: noStore });
	}
	try {
		const answer = await exchangeEmbedToken({
			apiUrl: env.EVER_TEAMS_API_URL,
			credential: env.EVER_TEAMS_EMBED_CREDENTIAL,
			email: user.email,
			origin: env.APP_ORIGIN
		});
		return Response.json(answer, { headers: noStore });
	} catch (error) {
		console.error(error);
		return Response.json({ error: 'No Ever Teams token' }, { status: 502, headers: noStore });
	}
}
```

### When the exchange is refused

Each refusal is an `EverTeamsError` subclass with the API's `code` and a `nextStep`. Import the classes from
`@ever-teams/api`: the server entry throws those same classes.

| Status | Class                     | `code`                     | What to do                                                                                                                                                                   |
| ------ | ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401    | `EverTeamsAuthError`      | none                       | The credential is unknown, malformed or revoked: check it, or ask an administrator for a new one.                                                                            |
| 403    | `EverTeamsForbiddenError` | `EMBED_MEMBER_NOT_ALLOWED` | The person is not an active member the credential may act for (no account, time tracking off, archived): check the email or employeeId, or ask an administrator to add them. |
| 403    | `EverTeamsForbiddenError` | `EMBED_ORIGIN_NOT_ALLOWED` | The origin is missing or not one of the organization's allowed sites: send the page's origin, and ask an administrator to add it.                                            |
| 429    | `EverTeamsRateLimitError` | `EMBED_EXCHANGE_LIMITED`   | Too many refused credentials came from your server's address within a minute: fix the credential, then wait a minute.                                                        |
| 429    | `EverTeamsRateLimitError` | none                       | Too many exchanges: wait `error.retryAfter` seconds (the `Retry-After` header).                                                                                              |
| 404    | `EverTeamsNotFoundError`  | none                       | Embeds are off on this API (its administrator sets `GAUZY_EMBED_TOKENS_ENABLED=true`), or `apiUrl` is not its address.                                                       |
| 503    | `EverTeamsServerError`    | none                       | The API cannot reach its database: try again shortly.                                                                                                                        |

Before any request, a missing or malformed option throws an `EverTeamsError` with the code `CLIENT_OPTIONS` (status
0), and a call in a page `SERVER_ONLY`. A success that is not a token throws `UNEXPECTED_ANSWER` (`apiUrl` is likely
the web app's address), and no answer an `EverTeamsNetworkError`. The helpers log nothing, and no error holds the
credential: a copy of it in an answer becomes `[credential]`.

### The same exchange over plain HTTP

For a backend in another language, the exchange is one request:

```http
POST https://api.example.com/api/embed/token
Content-Type: application/json

{"credential":"gze_...","email":"lina@example.com","origin":"https://app.example.com"}
```

Send `employeeId` in place of `email` to name the person by their employee id. The success:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{"token":"eyJhbGciOi...","expiresAt":"2026-11-18T18:15:00.000Z"}
```

A refusal has the status and `code` of the table above, with a `message`:

```json
{
	"statusCode": 403,
	"code": "EMBED_ORIGIN_NOT_ALLOWED",
	"message": "This site is not allowed to embed the organization's timer."
}
```

Answer the token to your page with `Cache-Control: no-store`, whatever the language. Each snippet below uses the
standard library's HTTP client and reads the credential from the environment.

**PHP**

```php
$response = file_get_contents(getenv('EVER_TEAMS_API_URL') . '/embed/token', false, stream_context_create(['http' => [
    'method' => 'POST',
    'header' => "Content-Type: application/json\r\n",
    'content' => json_encode([
        'credential' => getenv('EVER_TEAMS_EMBED_CREDENTIAL'),
        'email' => $user->email,
        'origin' => 'https://app.example.com',
    ]),
    'ignore_errors' => true, // read the body of a refusal too
]]));
$status = (int) explode(' ', $http_response_header[0])[1];
$answer = json_decode($response, true); // 200: token, expiresAt; else statusCode, message, code
```

**Python**

```python
import json, os, urllib.error, urllib.request

request = urllib.request.Request(
    os.environ["EVER_TEAMS_API_URL"] + "/embed/token",
    data=json.dumps({
        "credential": os.environ["EVER_TEAMS_EMBED_CREDENTIAL"],
        "email": user.email,
        "origin": "https://app.example.com",
    }).encode(),
    headers={"Content-Type": "application/json"},
)
try:
    with urllib.request.urlopen(request, timeout=10) as response:
        answer = json.load(response)  # {"token": ..., "expiresAt": ...}
except urllib.error.HTTPError as refusal:
    answer = json.load(refusal)  # refusal.code is the status; answer.get("code") names a 403 or a 429
```

**Ruby**

```ruby
require 'json'
require 'net/http'

response = Net::HTTP.post(
  URI("#{ENV.fetch('EVER_TEAMS_API_URL')}/embed/token"),
  { credential: ENV.fetch('EVER_TEAMS_EMBED_CREDENTIAL'), email: user.email, origin: 'https://app.example.com' }.to_json,
  'Content-Type' => 'application/json'
)
answer = JSON.parse(response.body) # response.code == '200': answer['token']; else answer['code']
```

**Go**

```go
body, _ := json.Marshal(map[string]string{
	"credential": os.Getenv("EVER_TEAMS_EMBED_CREDENTIAL"),
	"email":      user.Email,
	"origin":     "https://app.example.com",
})
response, err := http.Post(os.Getenv("EVER_TEAMS_API_URL")+"/embed/token", "application/json", bytes.NewReader(body))
if err != nil {
	return err // no answer
}
defer response.Body.Close()
var answer struct{ Token, ExpiresAt, Code string }
json.NewDecoder(response.Body).Decode(&answer) // StatusCode 200: answer.Token; else answer.Code
```

**Java** (15 or later)

```java
var body = """
    {"credential":"%s","email":"%s","origin":"https://app.example.com"}
    """.formatted(System.getenv("EVER_TEAMS_EMBED_CREDENTIAL"), user.email()); // or your JSON library
var request = HttpRequest.newBuilder(URI.create(System.getenv("EVER_TEAMS_API_URL") + "/embed/token"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();
var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
// response.statusCode() 200: token and expiresAt in response.body(); else its code
```

**.NET** (6 or later)

```csharp
using System.Net.Http.Json;
using System.Text.Json;

// http: the HttpClient your app reuses
var response = await http.PostAsJsonAsync(
    Environment.GetEnvironmentVariable("EVER_TEAMS_API_URL") + "/embed/token",
    new
    {
        credential = Environment.GetEnvironmentVariable("EVER_TEAMS_EMBED_CREDENTIAL"),
        email = user.Email,
        origin = "https://app.example.com"
    });
var answer = await response.Content.ReadFromJsonAsync<JsonElement>();
// response.IsSuccessStatusCode: answer.GetProperty("token"); else answer.GetProperty("code")
```

### A client's spent time

A credential limited to one client (the administrator picks the client when creating it) reads the time your team
spent for that client, for a client portal:

```js
import { getClientReport } from '@ever-teams/api/server';

const report = await getClientReport({
	apiUrl: process.env.EVER_TEAMS_API_URL,
	credential: process.env.EVER_TEAMS_CLIENT_CREDENTIAL
});
// { client: { id, name }, timeZone, today: { date, seconds }, week: { start, end, seconds },
//   projects: [{ id, name, seconds }] }
```

Today and this week are counted in the organization's time zone (`timeZone`); `projects` holds this week's, the most
first. The answer is the `IClientTimeReport` of `@ever-teams/toolkit-types`, which the kit's `TeamsClientTimeReport`
draws: answer it to the page with `Cache-Control: no-store`.

Over plain HTTP it is `POST {apiUrl}/embed/client-report` with `{"credential":"gze_..."}`, answered 200 with the
report. Its refusals are those of the exchange (401, 429, 404, 503), and:

| Status | Class                     | `code`                  | What to do                                                                                            |
| ------ | ------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| 403    | `EverTeamsForbiddenError` | `EMBED_CLIENT_REQUIRED` | The credential is the whole organization's: ask an administrator for one limited to the client.       |
| 403    | `EverTeamsForbiddenError` | `EMBED_CLIENT_GONE`     | The credential's client was deleted: restore the client, or use the credential of another one.        |
| 500    | `EverTeamsServerError`    | none                    | The API accepted the credential but could not read the report: try again, and tell its administrator. |

## Renew a sign-in from a site

A site without a server of its own lets a person sign in with Ever Teams: the web app's page `/embed/authorize`,
opened in a popup, asks the person to allow the site, then posts a timer token and a renewal token to the page that
opened it ([ever-co/ever-gauzy#12094](https://github.com/ever-co/ever-gauzy/issues/12094)). The kit
(`config.signIn: 'ever-teams'` of [`@ever-teams/atoms`](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#sign-in-with-ever-teams))
does all of this for you. These two functions of the main entry are what it calls, for a page that does it itself:

```js
import { renewEmbedSiteSession, revokeEmbedSiteSession } from '@ever-teams/api';

// About a minute before the timer token expires: a new timer token, and a new renewal token in place of the old one.
const renewed = await renewEmbedSiteSession({
	apiUrl: 'https://api.ever.team/api',
	renewalToken: saved.renewalToken
});
// The old renewal token is spent: keep the new one at once, for the next renewal. Keep the timer token in memory.
saved.renewalToken = renewed.renewalToken;
saved.renewalExpiresAt = renewed.renewalExpiresAt;
const { token, expiresAt } = renewed;

// Sign-out: the renewal token, and every one renewed from the same sign-in, stop working.
await revokeEmbedSiteSession({ apiUrl: 'https://api.ever.team/api', renewalToken: saved.renewalToken });
```

Both send the renewal token in the body and no `Authorization` header: the API refuses a timer token on these routes.
The renewal runs only from a page of the site the person allowed, since the API checks the browser's `Origin`. A
renewal token works once, and the API ends the whole sign-in when one is presented twice: renew one tab at a time
(the kit uses Web Locks, else a lock in `localStorage`) and always with the token the last renewal answered. Keep the
timer token in memory. The revocation answers the same for any token, so it never says whether a token was valid.

| Status | Class                     | `code`                     | What to do                                                                                                   |
| ------ | ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 401    | `EverTeamsAuthError`      | `EMBED_GRANT_ENDED`        | The sign-in ended (revoked, expired, or its renewal token already used): forget the token, sign in again.    |
| 403    | `EverTeamsForbiddenError` | `EMBED_ORIGIN`             | Not from the site the person allowed: renew from a page of that site.                                        |
| 403    | `EverTeamsForbiddenError` | `EMBED_ORIGIN_NOT_ALLOWED` | The organization no longer allows the site. Keep the renewal token: it works again once the site is allowed. |
| 403    | `EverTeamsForbiddenError` | `EMBED_SITE_SIGN_IN_OFF`   | Sign-in from the site was turned off. Keep the renewal token: it works again once it is on.                  |
| 403    | `EverTeamsForbiddenError` | `EMBED_MEMBER_NOT_ALLOWED` | The person may no longer track time. Keep the renewal token: it works again once that is lifted.             |
| 404    | `EverTeamsNotFoundError`  | none                       | The API has no sign-in from sites, or embeds are off (`GAUZY_EMBED_TOKENS_ENABLED`).                         |
| 429    | `EverTeamsRateLimitError` | none                       | Too many renewals from this address: wait `error.retryAfter` seconds.                                        |
| 503    | `EverTeamsServerError`    | none                       | The API cannot reach its database: try again shortly.                                                        |

Each error has its `nextStep`, and `EmbedSiteSessionErrorCode` types the codes. Before any request, a missing
`apiUrl` or `renewalToken` throws an `EverTeamsError` with the code `CLIENT_OPTIONS`, which never quotes a value; a
success without the four tokens throws `UNEXPECTED_ANSWER`, and no answer an `EverTeamsNetworkError`.

## Receive the API's webhooks

The API posts a signed webhook to your server when a time entry starts, stops, is added, changed or deleted, so your
server learns at once that a timer started elsewhere, and can pass it on to your own pages.

An administrator subscribes your endpoint once, with a token that has the webhooks permission (`WEBHOOKS_CREATE`):

```http
POST {apiUrl}/webhooks/subscriptions
Content-Type: application/json

{ "name": "Portal", "url": "https://app.example.com/ever-teams/webhook", "events": ["time_log.*"] }
```

The answer holds the subscription and its signing `secret`, shown only then (and again when the secret is rotated,
`POST {apiUrl}/webhooks/subscriptions/:id/rotate-secret`): keep it in an environment variable of your server.

The endpoint must use HTTPS and a public host name. The API refuses a subscription to `localhost` or to a private,
loopback or link-local address (400), and checks the address again before each delivery, so a name that resolves
there is refused then (the delivery ends `DEAD`). To try the webhooks on your own machine, expose the endpoint
through a public HTTPS tunnel; a self-hosted API that posts to its own network sets
`GAUZY_WEBHOOK_ALLOW_PRIVATE_NETWORK=true`, and outside production a subscription with
`"metadata": { "allowInsecure": true }` may use plain `http`.

`verifyWebhook` checks a delivery and answers its event. It needs the raw body as received, before any JSON parsing,
because the signature covers those exact bytes: in Express, `express.raw({ type: 'application/json' })` on the route.

```js
import express from 'express';
import { isTimeEntryEvent, verifyWebhook } from '@ever-teams/api/server';

const app = express();

app.post('/ever-teams/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
	let event;
	try {
		event = await verifyWebhook({
			body: req.body,
			signature: req.get('x-signature'),
			secret: process.env.EVER_TEAMS_WEBHOOK_SECRET
		});
	} catch (error) {
		console.error(error.code, error.message);
		return res.sendStatus(401);
	}
	if (isTimeEntryEvent(event)) {
		const { employeeId, projectId, startedAt } = event.data;
		if (event.name === 'time_log.started') {
			await tellPortalPages(employeeId, { running: true, projectId, startedAt });
		}
		if (event.name === 'time_log.stopped') {
			await tellPortalPages(employeeId, { running: false });
		}
	}
	res.sendStatus(204);
});
```

`tellPortalPages` stands for your own way to reach the pages, such as server-sent events or a WebSocket. In a route
handler that takes a `Request`, pass `body: await request.text()` and `signature: request.headers.get('x-signature')`.

- The signature is `X-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>`, over `<t>.<raw body>` with the secret.
  During a rotation of the secret the header carries a second `v1`, and either secret verifies; a header with more than
  two is refused before any check. The HMAC is computed once with the Web Crypto API, so `verifyWebhook` also runs in
  a worker or an edge route, and the package compares it in constant time itself, on every runtime and Node release.
- A delivery signed more than `tolerance` seconds before or after your server's clock is refused (300 by default, as
  the API's own check): a captured request cannot be sent again later.
- The API sends each event at least once and tries again after a failed delivery: answer 2xx quickly, and handle each
  `event.id` once (the `X-Event-Id` header holds it too).
- `isTimeEntryEvent(event)` is true for the five time entry events, and types `event.data`: `time_log.started`,
  `time_log.stopped`, `time_log.created` (time added already finished), `time_log.updated` and `time_log.deleted`.
  The data holds the entry's ids and times: `timeLogId`, `employeeId`, `projectId`, `taskId`,
  `organizationContactId`, `organizationTeamId`, `startedAt`, `stoppedAt`, `isRunning`, `isBillable`, `source` and
  `logType`, never its description. Any other event comes with its `name` and its `data` as the API sent them.

A refusal is an `EverTeamsError` with status 0, a `code` and a `nextStep`; no error holds the secret:

| `code`              | When                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `WEBHOOK_SIGNATURE` | No `X-Signature`, a header that is not `t=...,v1=...` or has more than two `v1`, or a signature that does not match |
| `WEBHOOK_EXPIRED`   | A genuine signature made more than `tolerance` seconds from now: check the server's clock                           |
| `WEBHOOK_BODY`      | A body already parsed as JSON (pass the raw body), or a signed body that is not an event                            |
| `CLIENT_OPTIONS`    | No `secret`, or a `tolerance` or `now` that is not a number                                                         |

## The request functions

Every function this package exported before `createClient` is still exported and works as before. They hold the
requests the kit makes: sign-in, user, organization, teams, tasks, projects, the timer and the time logs. They take
the user, the token and the kit's state, return an `IServerError` value on a failure instead of throwing, and send
every request to the address set with `apiConfigManager.setConfig({ apiUrl })` (default `https://api.ever.team/api`),
unless they get one of their own: each takes `{ apiUrl }` as an optional last argument, for a page that talks to two
APIs. `TeamsProvider` of `@ever-teams/atoms` passes its `config.apiUrl` that way, and sets the page's address from it.
`apiConfigManager.subscribe(listener)` calls `listener` after each `setConfig()` that changes the configuration, and
returns the function that stops it: a provider without an `apiUrl` of its own hears that way that the page's address
changed.

```js
import { apiConfigManager, getTimerStatus } from '@ever-teams/api';

apiConfigManager.setConfig({ apiUrl: process.env.EVER_TEAMS_API_URL });
const status = await getTimerStatus(user, accessToken, organizationId);

// Another API of the same page, for this call only
const otherStatus = await getTimerStatus(otherUser, otherToken, otherOrganizationId, {
	apiUrl: 'https://teams.example.com/api'
});
```

A new script or server is simpler with `createClient`. Nothing is deprecated: any change to these functions will be
announced in the changelog first, and made later in a release of its own.

## The answers, checked against the API

The types the client's methods answer are checked against answers recorded from a running API, kept in
`test/contract/` (one file per method, and one for `GET /user/me`). The API's Swagger description gives no answer
shape for the timer and time entry routes, so the recorded answers are the reference. Three tests read them:

- `test/contract-types.test.mjs` assigns each recorded answer, every value typed as the literal it is, to the type
  the client declares for it, and compiles that with `tsc --noEmit`. A value the type does not allow (`null` where it
  declares a string, a text where it declares a number) or a required field the answer lacks fails the test. A field
  the API answers and the type does not name passes.
- `test/contract-answers.test.mjs` serves each method its recorded answer and checks that the method sends the
  recorded route and returns that answer.
- `test/contract-privacy.test.mjs` checks that the recordings hold no personal data: every text is a placeholder or a
  value the API picks from a fixed list (a log type, a source, a currency), with no email address, token or id.

When the API changes an answer, recording it again shows the change in the fixtures, and the type test names the
field that no longer fits.

`timeEntries.create()` is not recorded yet: the recording would need an organization that allows manual time. Its
test serves it the recorded answer of `timer.start()`, the same time log, as an entry added by hand.

### Record the answers again

The script is in the repository, not in the published package. Run it from `packages/api`, against a local API,
with the account of a member whose role may list members (a manager) and whose timer is stopped:

```sh
yarn --cwd ../toolkit-types build && yarn build
EVER_TEAMS_API_URL=http://localhost:3000/api EVER_TEAMS_EMAIL=manager@example.com EVER_TEAMS_PASSWORD=... \
  node scripts/record-contract.mjs
# The path the script printed, quoted:
EVER_TEAMS_CONTRACT_FORBIDDEN='/tmp/ever-teams-api-contract-AbC123/forbidden.json' yarn test
```

`EVER_TEAMS_TOKEN`, a personal API token, can replace the email and the password. The script refuses an address
other than `localhost` unless `EVER_TEAMS_CONTRACT_REMOTE=1` is set, since it changes the account's data: it starts
the account's timer twice (once bare, once on one of its tasks) and stops it, reads the time entries of the days it
ran and the totals, then deletes the two time entries it created. It refuses an account whose timer runs, so the
timer stays as it was, and follows no redirect, so the password and the token stay on the local API. When a step
fails, it still stops its timer and deletes its entries before it reports the failure, and it prints the id of each
entry it could not delete, so you can delete it in the app. A timer the account's member started in the meantime is
left running. After a start whose answer was lost, a new entry, running or stopped, counts as the recording's own
only when it has the client's source (`EMBED`); a running one from another source is left running and its id printed.

Before writing, it replaces ids, names, emails, addresses, dates, amounts of money and the labels each organization
names itself (a task's status, priority, size and type) with placeholders of the same form (`<employee-1>`,
`<status-1>`, `person-1@example.com`, dates from `2000-01-01`). It lists the real values it replaced in a file of a
new directory of the system's temporary folder that only your account may open, and prints its path: with
`EVER_TEAMS_CONTRACT_FORBIDDEN` set to it, the privacy test also checks that none of them reached a fixture.

## License

MIT
