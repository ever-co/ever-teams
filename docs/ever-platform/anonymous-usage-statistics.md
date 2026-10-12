<!-- markdownlint-disable MD013 MD043 -->

# Anonymous usage statistics (Ever Teams web app)

Ever Teams can send one small, anonymous report a day about the web app itself: which release runs and
how it was installed. It never sends anything about the people, organizations, teams, tasks or time
records the app manages. The report follows the published schema `ever.stats.v1`, and the code that
builds and sends it is in this repository (`apps/web/core/services/server/ever-stats`).

Everything here is optional, and every existing feature works the same with it switched off.

## What is sent

A web app reports as a `frontend` of the `teams` product. Its `counts`, `features` and `aggregates` are
always empty: the counts of an installation come from its Gauzy API's own report. A complete report:

```json
{
  "schema": "ever.stats.v1",
  "report_id": "52ff5a9f-0495-4953-a479-b724058eeb89",
  "instance_id": "3ddf1821-761d-4247-8f3d-e65e4bc66ac8",
  "sent_at": "2026-11-02",
  "module_version": "1.0.0",
  "product": "teams",
  "instance_kind": "frontend",
  "serves": ["teams"],
  "version": "1.4.2",
  "channel": "stable",
  "install_source": "self-hosted",
  "country": "ZZ",
  "period": "2026-11",
  "final": false,
  "counts": {},
  "features": {},
  "aggregates": {}
}
```

- `instance_id`: an opaque random id. By default each web app process makes a new one at start and keeps
  it in memory only (see [Several replicas](#several-replicas-or-restarts) to pin one). It is never derived
  from a host name, a URL or any setting.
- `version`: the release as `major.minor.patch`. A pre-release or build suffix never leaves the server: it
  only sets `channel` (`rc`, `beta`, `dev`, or `custom` for anything else).
- `install_source`: what the operator declares in `EVER_INSTALL_SOURCE` (`self-hosted` by default); never
  guessed.
- `country`: what the operator declares in `EVER_STATS_COUNTRY` (two capital letters), `ZZ` otherwise;
  never guessed.
- `sent_at`: the UTC date only, and `period`: the UTC month.

Before signing, the web app runs the receiving side's own checks on the exact bytes (with the Ever Platform
SDK, `@ever-co/connect-sdk`): a report that would be refused is never sent.

## When and where

- The first attempt is 10 minutes after the server starts, then once a day at a second drawn at random for
  each day (UTC). On the first three days of a month the closed previous month is sent once more
  (`final: true`).
- **Before every report** the web app asks the Gauzy API it is configured with whether statistics are on
  (`GET <GAUZY_API_SERVER_URL>/api/ever-stats/state`, no credential). It sends only after the answer
  `200 {"enabled": true}`. An API with statistics switched off (in its environment or in its settings), an
  API that does not serve this web app (see [Pairing](#pairing-with-the-gauzy-api)), or an API that is down
  keeps the web app silent. With neither `GAUZY_API_SERVER_URL` nor `NEXT_PUBLIC_GAUZY_API_SERVER_URL` set,
  nothing is asked and nothing is sent.
- The report goes to `POST <EVER_STATS_API_URL>/v1/stats/reports` (`EVER_STATS_API_URL` defaults to
  `EVER_PLATFORM_API_URL`, then `https://api.ever.co`): exactly the signed bytes, with the signature headers
  `Ever-Stats-Key`, `Ever-Stats-Signature` (`ed25519=…`) and `Ever-Stats-Key-Id` as the SDK exports them, no
  cookie, no credential, no redirect followed, within 10 seconds. The address must be https; plain http is
  accepted only for a local address (this machine or a private address range).
- A delivery that fails (no answer, 429, 5xx) is tried again after 1 hour, 4 hours and 12 hours, then at the
  next day's slot. A refused report is not sent again before the next slot.

Each attempt writes one log line without any payload, id or key:
`ever_stats.send outcome=sent|rejected|failed|skipped_gauzy_off|skipped_gauzy_unpaired|skipped_gauzy_unreachable|skipped_invalid status=<n> final=<true|false>`.

## Switching it off

| Where | How | Effect |
|---|---|---|
| The web app's environment | `EVER_STATS_ENABLED=false` (exactly; any other value is ignored and logged) | The statistics code is not even loaded, and `/api/ever-stats/*` answers 404. |
| *Settings → Team → Ever Platform* | The operator of the installation switches *Send anonymous usage statistics* off | Stored in the Gauzy API (the same switch as its own settings): the web app reads it before every report, so the next report is not sent. |
| The Gauzy API's environment | Its own statistics switch, or no `teams` in its `EVER_STATS_SERVES` | The API answers `state` with 404 or `{"enabled": false}`: the web app sends nothing. |

The switch in the settings is shown to the operator of the installation only: the Gauzy API decides who that
is. Everyone else sees who manages the statistics ("Managed by the instance operator", or "Managed by Ever
Cloud" when `EVER_INSTALL_SOURCE=cloud`) and a link to this page. Demo deployments (`NEXT_PUBLIC_DEMO=true`)
never show the section.

## Pairing with the Gauzy API

The Gauzy API answers the web app only when it declares that it serves Ever Teams:
`EVER_STATS_SERVES=gauzy,teams` in the API's environment. Without it, `GET /api/ever-stats/state` (and the
connection's `GET /api/ever-connect/health`) answer 404, the web app sends no report (`skipped_gauzy_unpaired`,
logged once) and the settings hide the Ever Platform connection parts.

## Several replicas or restarts

By default every web app process is a new series (a new id and key each start). To report as one
installation across replicas and restarts, set both:

- `EVER_INSTANCE_ID`: a lowercase UUID v4, for example from `node -e "console.log(crypto.randomUUID())"`;
- `EVER_STATS_PRIVATE_KEY`: an Ed25519 private key, base64url (or base64) of its 32-byte seed or of its
  PKCS#8 DER document, for example from
  `node -e "const {generateKeyPairSync}=require('crypto');console.log(generateKeyPairSync('ed25519').privateKey.export({format:'der',type:'pkcs8'}).toString('base64url'))"`.

Keep the key secret (a secret store, never a committed file). An id without a key turns the report off
(`stats_key_missing`); a key without an id, or a key that cannot be read, also turns it off
(`stats_key_invalid`). The key is never logged.

## What the operator can see

*Settings → Team → Ever Platform → Last report sent* shows the exact bytes of the last reports the web app
sent (kept in the server's memory, the last 12), with their date and the answer, next to the Gauzy API's
own last report. The web app routes behind it answer only after the Gauzy API accepted the signed-in person
as the operator:

| Route | What it does |
|---|---|
| `GET /api/ever-stats/status` | The API's status, plus the web app's reporter state |
| `GET /api/ever-stats/last` | The API's last report, plus the web app's last attempts |
| `PUT /api/ever-stats/enabled` `{"enabled": true \| false}` | The operator's switch, stored in the API |

All three answer 404 when `EVER_STATS_ENABLED=false`, and 404 to anyone the API does not accept as the
operator. Nothing is cached.

## All settings

| Variable | Default | Meaning |
|---|---|---|
| `EVER_STATS_ENABLED` | on | `false` unloads the statistics |
| `EVER_STATS_API_URL` | `EVER_PLATFORM_API_URL`, then `https://api.ever.co` | Where reports go |
| `EVER_INSTALL_SOURCE` | `self-hosted` | `cloud`, `self-hosted`, `ever.sh`, `works_app`, `desktop` or `partner:<name>` |
| `EVER_STATS_COUNTRY` | `ZZ` | Two capital letters, as the operator declares |
| `EVER_INSTANCE_ID`, `EVER_STATS_PRIVATE_KEY` | unset | Set both to pin the identity |
| `EVER_STATS_SEND_INTERVAL_S` | unset | Tests only; honoured for a local statistics address only |

See also [outbound-calls.md](outbound-calls.md) for every call the web app's Ever Platform features can make.
