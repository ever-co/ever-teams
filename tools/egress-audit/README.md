<!-- markdownlint-disable MD013 MD043 -->

# Egress audit

A runtime proof of what the optional Ever Platform features of the Ever Teams web app may send, from the
web server and from the UI in a real browser: **nothing at all** when they are off, **not a single call
before an operator acts** when they are loaded but switched off, and **only the statistics report** when
the statistics are on. Every call they can make is listed in
[`docs/ever-platform/outbound-calls.md`](../../docs/ever-platform/outbound-calls.md).

## The harness

The harness is the egress audit of the Ever Platform SDK, the dev dependency `@ever-co/connect-tools`
(`ever-egress-audit`), at the version and integrity `yarn.lock` pins. It is not copied here. It runs the
compose file below with every Docker bridge sealed (no route out), makes CoreDNS the only resolver,
captures every connection attempt and DNS question of the web server and of the browser from before they
start, drives the app from inside the sealed setup, walks every page of the app in Chromium, and fails the
run when anything looks up, requests or links an Ever host, tries to reach anything outside the compose
services, answers an Ever Platform route while the features are off, or makes a call its mode does not
allow.

This directory holds only Ever Teams' inputs:

| File | What it is |
|---|---|
| `egress-audit.config.json` | The services, the Ever Platform routes probed in `off`, the browser leg (the web app as `webapp`, the idle pages, the positive control) |
| `compose.egress-audit.yml` | The web image under test (`TEAMS_WEB_IMAGE`), the paired Gauzy API (`GAUZY_API_IMAGE`, with `EVER_STATS_SERVES=gauzy,teams`) and its PostgreSQL; random secrets per run; nothing published to the host |
| `adapter.mjs` | Makes the seeded super admin a team manager, switches the statistics off as the operator (`loaded_off`), calls every Ever Platform route of the app (404 in `off`), signs in through the password sign-in page, and gives the ids of the pages that take one |
| `ui-routes.json` | Every page of the Next.js app router (generated, checked in CI), plus the settings' health probe path |
| `route-params.json` | The locale of the walk (`en`); the adapter adds the ids only a run knows |
| `ui-baseline.json` | Links to Ever hosts the UI rendered before the Ever Platform settings existed (it may only shrink) |
| `optin-hosts.json` | Older features that can reach an Ever host, off by default and documented as operator opt-ins (read by the static scan only) |

The web server is audited as a process (`process_services`) and as the UI (`web_service`): it renders on the
server. The browser reaches the web app as `webapp` and the API as `api`, never `localhost`. The paired API is
a dependency here, not what is audited (the Gauzy repository audits its own egress).

## Modes

| Mode | The web app | The paired API | Passes when |
|---|---|---|---|
| `off` | `EVER_STATS_ENABLED=false`, `NEXT_PUBLIC_EVER_CONNECT_ENABLED` unset | statistics off | no Ever host looked up, requested or linked outside `ui-baseline.json`, no connection attempt out, every `/api/ever-stats` and `/api/ever-connect` route 404, no health probe from the browser |
| `loaded_off` | both loaded; a local reporting address outside the sealed setup and a 5-second interval, so a report sent by mistake is seen | statistics on, switched off by the operator in its settings; connection on, not connected | no call at all |
| `positive_stats` | statistics on, reporting to the mock platform every 5 seconds | statistics on | reports accepted (202), no other call; the settings page asks `GET /api/ever-stats/status` (the browser's positive control) |
| control | `positive_stats` without the mock platform | | must **fail** (exit 1): a green run is not a blind one |

## Running it

`.github/workflows/egress-audit.yml` runs it on a GitHub-hosted runner for every pull request that changes the
web app, in this order: the route list is in step with the router (`ui-routes --check`, with a control that
must fail), the baseline only shrank (`check-baseline-shrink`), the web image is built, the modes and the
control run, the browser never asked `health` in `off`, and the client bundle is scanned for Ever hosts
(`static-hostnames`). The evidence (`report.json`, pcaps, DNS logs, the HAR, the DOM references, the mock's
call record) is uploaded as the `egress-audit` artifact.

Locally, with Docker and the dependencies installed (`yarn install`):

```sh
docker build -f .deploy/web/Dockerfile -t ever-teams-webapp:egress-audit .
docker pull ghcr.io/ever-co/gauzy-api-demo:latest
export TEAMS_WEB_IMAGE=ever-teams-webapp:egress-audit GAUZY_API_IMAGE=ghcr.io/ever-co/gauzy-api-demo:latest
export TEAMS_AUDIT_SECRET=$(openssl rand -hex 32) TEAMS_AUDIT_ADMIN_PASSWORD=$(openssl rand -hex 16)
AUDIT_GAUZY_STATS_ENABLED=false npx ever-egress-audit --config tools/egress-audit/egress-audit.config.json --mode off
```

After changing the pages of the app, regenerate the route list:

```sh
npx ever-egress-audit ui-routes --framework next-app --entry apps/web/app --out tools/egress-audit/ui-routes.json
```
