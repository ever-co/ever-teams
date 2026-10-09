# Outbound calls of the Ever Platform features (Ever Teams web app)

Every call the optional Ever Platform features of the Ever Teams web app can make, with what it carries and
what switches it off. With `EVER_STATS_ENABLED=false` and `NEXT_PUBLIC_EVER_CONNECT_ENABLED` unset, the web
app makes none of them: the [egress audit](../../tools/egress-audit/README.md) proves it on every change, from
the web server and from the UI in a real browser.

| # | Call | Made by | When | To | Carries | Switched off by |
|---|---|---|---|---|---|---|
| 1 | Anonymous usage report | Web server | Once a day (see [anonymous-usage-statistics.md](anonymous-usage-statistics.md)) | `POST <EVER_STATS_API_URL>/v1/stats/reports` (default `https://api.ever.co`) | The report, signed (`Ever-Stats-Key`, `Ever-Stats-Signature`, `Ever-Stats-Key-Id`); no cookie, no credential | `EVER_STATS_ENABLED=false`; the operator's switch; the Gauzy API's statistics off or unpaired |
| 2 | Statistics state | Web server | Before every report | `GET <GAUZY_API_SERVER_URL>/api/ever-stats/state`: the Gauzy API this app is configured with, never an Ever service unless that is the API you configured | Nothing (no credential) | `EVER_STATS_ENABLED=false` |
| 3 | Statistics settings | Web server, for a signed-in team manager on *Settings → Team* | When the settings open, or the operator switches | `GET /api/ever-stats/status`, `GET /api/ever-stats/last`, `PUT /api/ever-stats/enabled` on the Gauzy API | The person's own token and tenant; `{"enabled": true \| false}` | `EVER_STATS_ENABLED=false` |
| 4 | Connection health | The browser of a signed-in team manager (or the web server's `/api/ever-connect` routes, when the browser reaches the API through this app) | When *Settings → Team* opens, at most every 5 minutes | `GET /api/ever-connect/health` on the Gauzy API | The person's own token and tenant | `NEXT_PUBLIC_EVER_CONNECT_ENABLED` unset (the default): never asked |
| 5 | Connection parts | The same | While *Settings → Team* shows them | The Gauzy API's organization routes: `GET /api/ever-connect/{status,integrations,entitlement,audit}`, `POST /api/ever-connect/links`, `DELETE /api/ever-connect/links/{id}`, `POST /api/ever-connect/integrations/{key}/consent-url`, `POST /api/ever-connect/integrations/refresh`, `PUT /api/ever-connect/integrations/{key}` `{"enabled": false}`, `POST /api/ever-connect/entitlement/refresh` | The person's own token and tenant; a link code; the switch of one integration | `NEXT_PUBLIC_EVER_CONNECT_ENABLED` unset; the Gauzy API's `health` answering 404 or 401 |

Notes:

- Calls 2 to 5 go to the Gauzy API the web app already uses for everything else. The web app never calls Ever
  Platform for the connection: the Gauzy API does, under its own switches (see the Gauzy documentation of
  its Ever Platform plugin). The browser never talks to an Ever Platform host.
- The Gauzy API answers calls 2 and 4 only when it declares that it serves Ever Teams
  (`EVER_STATS_SERVES=gauzy,teams` in its environment); otherwise they answer 404 and the web app stays
  silent and hides the connection parts.
- `health` is asked only for a signed-in person, with that person's own token: a signed-out visitor never
  causes it.
- *Manage in app.ever.co* opens the consent page the Gauzy API returns for that integration; the link carries
  no token and no e-mail address.
- The `/api/ever-connect/*` routes of this app forward only the organization routes above (their methods,
  their query parameters and body fields), to the configured Gauzy API only. The installation's own routes
  (connecting, disconnecting, the operator's policy and public address) are never forwarded: they belong to
  the Gauzy API's own settings.

## Operator opt-ins

Features older than the Ever Platform settings that can reach an Ever host stay off in the default
configuration and are listed here with the setting that turns them on. They are also listed in
[`tools/egress-audit/optin-hosts.json`](../../tools/egress-audit/optin-hosts.json).

| Feature | Host | Turned on by |
|---|---|---|
| None so far | | |
