# @ever-teams/cli

The Ever Teams command line: start and stop your timer, see your day, add time you worked without the timer, and
export your time entries as CSV or JSON, from a terminal or a script. It works with your own time, signs in once with
a personal API token, and runs on Node 20 or later. It talks to the API only through the typed client
[`@ever-teams/api`](https://github.com/ever-co/ever-teams/tree/develop/packages/api#readme).

## Quick start

1. In the web app, open **Settings > API tokens** and create a personal API token. Copy it.
2. Install the command line, sign in, and start your timer:

```sh
npm install --global @ever-teams/cli
ever-teams login
ever-teams start
```

`ever-teams login` asks for the token and hides it while you paste it. It checks the token once with the server, then
keeps it for the next commands. It signs in to the hosted service (`https://api.ever.team/api`); for your own server,
give its API address, which ends with `/api`:

```sh
ever-teams login --api-url https://teams.example.com/api
```

Then `ever-teams status` shows the running timer and `ever-teams stop` stops it.

The server must accept personal API tokens: its administrator turns them on with `GAUZY_USER_API_TOKENS_ENABLED`.
When it does not, `login` says so.

### From this repository

Before a release, or to try a change, build the command line in a clone of this repository and run its entry with
Node:

```sh
yarn install
yarn --cwd packages/toolkit-types build
yarn --cwd packages/api build
yarn --cwd apps/cli build
node apps/cli/dist/index.js login --api-url http://localhost:3000/api
```

## Commands

Every command takes `--json`, `--api-url <url>` and `--help`. `ever-teams --help` lists the commands,
`ever-teams <command> --help` shows the options of one, and `ever-teams --version` the version.

### login

```sh
ever-teams login
ever-teams login --api-url https://teams.example.com/api
ever-teams login --token-stdin < token.txt
```

Asks for a personal API token, checks it once, then keeps it with the address. With `--token-stdin` it reads the token
from the standard input, for a script. The token is never an argument, so it never lands in your shell history. A
token that is not a personal one (they start with `gzp_`) is refused. Over plain `http` to another machine than this
one, it warns that the token travels unencrypted.

### logout

```sh
ever-teams logout
```

Removes the stored token. The token keeps working until you revoke it in **Settings > API tokens**.

### status

```sh
ever-teams status
```

```text
The timer is running since 09:12 (1h 05m) on Website, WEB-12 Fix the sign-in page.
Today: 3h 20m tracked.
```

### start

```sh
ever-teams start
ever-teams start --project Website --task 12 --note "Review the pull request"
```

`--project` takes a project's name (in any case) or its id, `--task` a task's number (`12`, `#12`, or `WEB-12` as the
app shows it) or its id, among your own. A task given alone brings its project. A timer already running stops first, as
in the apps. A name or a number that matches nothing, or more than one, is refused before the timer starts, with what
to give instead.

### stop

```sh
ever-teams stop
```

```text
Timer stopped at 10:17 after 1h 05m on Website, WEB-12 Fix the sign-in page.
```

With no timer running, it says so and succeeds.

### today

```sh
ever-teams today
```

```text
Today (2026-11-18): 3h 00m tracked.
  08:30-10:00   1h 30m  Website, WEB-12 Fix the sign-in page
  10:30-11:00      30m  (no project)
  14:00-now     1h 00m  Website: Call with the client
```

Your entries started today, in the time zone of this computer. A running entry counts up to now.

### log

```sh
ever-teams log --from 09:00 --to 10:30 --project Website --note "Call with the client"
ever-teams log --date 2026-11-17 --from 14:00 --to 16:15 --task 12
ever-teams log --duration 45m --note "Code review"
```

Adds time you worked without the timer: `--from` and `--to` on `--date` (today by default), or `--duration` (`1h30m`,
`2h`, `45m`) that starts at `--from`, ends at `--to`, or ends now. Times are in the time zone of this computer; a
time its clocks skip for daylight saving (02:30 on the day they move forward) is refused. `--project`, `--task` and `--note` work as for `start`. Your organization must allow manual time; an entry over a
running timer or a break is refused, and an entry it overlaps loses the time the new one covers, as in the web app.

### export

```sh
ever-teams export --from 2026-11-01 --to 2026-11-30 --format csv --output november.csv
ever-teams export --from 2026-11-18 --to 2026-11-18 --format json
```

Writes your entries started from the first day to the last, both included, to the standard output, or to a file with
`--output` (replaced if it exists). With `--all`, it writes every entry your token may see: the team's, for a manager.

Both formats carry the same fields, and the CSV columns are named and ordered as the JSON keys: `id`, `startedAt`,
`stoppedAt` (empty while running), `durationSeconds`, `running`, `projectId`, `projectName`, `taskId`, `taskNumber`,
`taskTitle`, `note`, `logType`, `billable`, `memberId`, `memberName`. Times are ISO 8601 in UTC.

The CSV follows RFC 4180: a header row, a cell with a comma, a quote or a line end in quotes, quotes doubled, CRLF line
ends. A text that a spreadsheet would run as a formula (it starts with `=`, `+`, `-` or `@`) gets a leading `'`, so a
note never runs in the sheet that imports the export.

### projects

```sh
ever-teams projects
```

```text
Mobile app  2b6f1c3e-8a41-4f0e-9d2a-5c7e1b9a0f34
Website     7d1e2a90-3c5b-4e8f-a6d4-0b9c8e7f6a51
```

Your projects, by name, with the id of each: `start` and `log` take either.

## In a script

With `--json`, a command answers one JSON document on the standard output, and a failure answers one on the error
output:

```json
{
	"error": {
		"code": "TOKEN_REFUSED",
		"message": "Your token was refused: create a new one in Settings > API tokens, then run ever-teams login.",
		"status": 401
	}
}
```

`status` is the HTTP status when the failure is an answer of the API. `export` without `--output` writes the CSV or the
JSON it was asked for, whatever `--json` says. `--help` with `--json` answers `{ "help": "..." }`, the text it prints
without `--json`.

| Exit code | Meaning                                                                               |
| --------- | ------------------------------------------------------------------------------------- |
| `0`       | Done (`stop` with no timer running included)                                          |
| `1`       | Refused or failed: by the API, by the network, or by the command line (not signed in) |
| `2`       | Usage error: an unknown command or option, a value missing or not in its form         |

A nightly job on Linux that writes yesterday's entries of the whole team, with the token from the job's secrets:

```sh
export EVER_TEAMS_API_URL=https://teams.example.com/api
export EVER_TEAMS_TOKEN="$TEAMS_TOKEN"
day=$(date -d yesterday +%F)
ever-teams export --from "$day" --to "$day" --format csv --all --output "entries-$day.csv"
```

## Environment variables

| Variable             | What it does                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `EVER_TEAMS_TOKEN`   | A personal API token, used in place of the stored one. Nothing is written to disk.                |
| `EVER_TEAMS_API_URL` | The API's address, ending with `/api`, used in place of the stored one. `--api-url` wins over it. |
| `XDG_CONFIG_HOME`    | On Linux and macOS, the folder of the settings (`~/.config` when it is not set).                  |
| `APPDATA`            | On Windows, the folder of the settings.                                                           |

## Where the token is kept

`login` writes the address and the token to `config.json` in the folder `ever-teams` of your settings folder:

| System          | File                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| Linux and macOS | `$XDG_CONFIG_HOME/ever-teams/config.json`, else `~/.config/ever-teams/config.json` |
| Windows         | `%APPDATA%\ever-teams\config.json`                                                 |

On Linux and macOS the file has the mode `600`: only your account may read or write it. The stored token is sent only
to the address it was stored with: with another `--api-url` or `EVER_TEAMS_API_URL`, a command refuses and says to run
`ever-teams login` for that address, or to set `EVER_TEAMS_TOKEN`.

The command line never prints a token: not in a result, not in an error, not with `--json`, not when an answer of the
server repeats it.

## When something goes wrong

Each failure is one sentence that says what to do next. The most common, by their `code` in JSON:

| Code                    | What happened                                                             | What to do                                                       |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `NOT_SIGNED_IN`         | No stored token and no `EVER_TEAMS_TOKEN`                                 | Run `ever-teams login`                                           |
| `TOKEN_REFUSED`         | The token expired or was revoked                                          | Create a new one in **Settings > API tokens**, then log in again |
| `PERSONAL_TOKENS_OFF`   | The server does not accept personal API tokens                            | Its administrator sets `GAUZY_USER_API_TOKENS_ENABLED`           |
| `OTHER_API`             | The stored token belongs to another address                               | Run `ever-teams login --api-url <url>`                           |
| `MANUAL_TIME_REFUSED`   | Your organization does not allow manual time, or your role may not add it | Ask an administrator, or use `start` and `stop`                  |
| `RUNNING_TIMER_OVERLAP` | The entry overlaps your running timer                                     | Stop it, or pick another time                                    |
| `NO_ANSWER`             | No answer from the address                                                | Check the network and the address                                |

## License

MIT
