# @ever-teams/api

The typed client of an Ever Teams API (Gauzy), for Node 20 or later and the browser: start and stop the timer, list
time entries, projects, tasks and members, and read the tracked totals of the day and the week. It has no user
interface. It also holds the request functions the Ever Teams kit makes (see [The request functions](#the-request-functions)).

To show a timer or a report in a React page, install [`@ever-teams/atoms`](https://www.npmjs.com/package/@ever-teams/atoms),
which uses this package: start with [its README](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#readme).

On your server, `@ever-teams/api/server` exchanges an embed credential for a short-lived token for a person signed in
to your product: see [Sign people in from your server](#sign-people-in-from-your-server).

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
| `timeEntries.list({ from, to, ... })` | `GET /timesheet/time-log`                         | `EverTeamsTimeEntry[]`     |
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
| `EverTeamsNetworkError`    | No answer: wrong address, network, CORS   | `cause`: the error `fetch` threw (from the server helpers: a copy of its name, message, code and causes).                 |

The client also throws an `EverTeamsError` with status 0 and one of these codes before or without a request:
`CLIENT_OPTIONS` (no `apiUrl`, or neither `token` nor `getToken`), `NO_TOKEN`, `NO_ORGANIZATION` and `NO_EMPLOYEE`
(the token's user is not a member of an organization, or `organizationId` names another organization than its
member's), `INVALID_DATE` (also a date-time on a day that does not exist, such as 2026-02-29T00:00:00Z), `NO_FETCH`,
`UNEXPECTED_ANSWER` (`GET /user/me` answered no user; the next call reads it again); and `NOT_JSON` with the answer's
status when `apiUrl` answers something else than JSON, such as the web app's pages.

An error your `getToken` throws comes back as it is. A browser reads `Retry-After` only when the API exposes it to
the page (CORS): there, `retryAfter` may stay `undefined`. When a page loads both the ESM and the CommonJS build, `instanceof` works within one build;
`error.name` (`'EverTeamsAuthError'`, ...) works across both.

## Sign people in from your server

A page of your product shows a person's Ever Teams timer with a short-lived **embed token**, which your server gets
for them. Your server holds an **embed credential** (`gze_...`): an administrator of the organization creates it in
Settings > Embeds of the web app, and adds your site to the allowed sites on the same page. The credential stays on
your server, in an environment variable; only the token reaches the page.

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
| `origin`                | yes         | The site of the page the timer runs in (`https://app.example.com`, no path), one of the organization's allowed sites. The token works only from it.                                           |
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
