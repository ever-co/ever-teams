# End-to-end flows

These flows use the app the way a person does, on an Android emulator or an iOS simulator, against a Gauzy API with test data. They are written for [Maestro](https://maestro.dev), the tool of [Expo's end-to-end guide](https://docs.expo.dev/build-reference/e2e-tests/).

| Flow | What the person does |
| --- | --- |
| `sign-in.yaml` | signs in with the code sent by e-mail |
| `timer-start-stop.yaml` | starts the timer and stops it |
| `timer-after-kill.yaml` | closes the app while the timer runs, opens it again, and finds the timer still running |
| `timer-correct-start.yaml` | moves the start of the running timer one minute earlier (waits two minutes first, see below) |
| `timer-discard.yaml` | discards a run started by mistake |
| `team.yaml` | opens the Team tab and sees the team and its members |
| `task-open.yaml` | chooses a task, opens it from their own card and reads it, the app staying open |
| `sign-out.yaml` | signs out, and still sees the sign-in screen when the app starts again |

Each flow starts from a cleared app and signs in first (`common/sign-in.yaml`), so the flows can run in any order. Clearing the app does not clear the time the API saved, so `timer-correct-start.yaml` starts its run two minutes after any earlier stop: the start it moves back then cannot fall inside a run an earlier flow saved, which the API refuses.

The timer flows wait for the API's answer, not only for the button that changes when it is tapped: a run counts as started once the run's menu (`timer-actions-trigger`) shows, which follows the API's status, and as stopped once that menu is gone.

## What a run needs

- Maestro 2 (`curl -fsSL "https://get.maestro.mobile.dev" | bash`) and Java 17.
- A release or development build of the app, installed on a booted emulator or simulator, and pointed at the Gauzy API of the run (`GAUZY_API_URL` in `apps/mobile/.env` before `yarn config:mobile`; from the Android emulator, the computer is `10.0.2.2`).
- A Gauzy API on develop with test data: a person who belongs to one workspace and one team, whose organization allows tracking time. The defaults in the flows are `kofi.arden@example.com`, the team `Field Crew North` and the member `Priya Holt`; pass others with `-e`.
  - `timer-correct-start.yaml` moves a start back: the organization has `allowModifyTime` and `allowManualTime` on, and the person's role holds `TIME_TRACKER`, `ALLOW_MODIFY_TIME` and `ALLOW_MANUAL_TIME`. Without modify-time access the start panel only shows the start, and the flow fails waiting for `timer-start-time`; without manual-time access the field is there but the panel refuses an earlier start, and the flow fails with `timer-start-error` showing. It does not run across midnight (a run started at 00:00 stops it with a message) or a daylight-saving change, when the same time of day names two moments.
  - `task-open.yaml` opens the task on the first card of the Team tab, the person's own, after choosing one in the Work tab: the team has at least one task.
  - `timer-discard.yaml` discards a run: the organization leaves `allowDiscardTimer` and `allowDeleteTime` on (neither `false`). Without them the run's menu has no discard, and the flow fails at `timer-discard`.
- The code helper. Signing in needs the code Gauzy just sent by e-mail, which a test cannot read from a mailbox. On a local setup, a small HTTP service answers `GET <HELPER>/code?email=<address>` with that person's latest code, read from the local database (`SELECT code FROM "user" WHERE email = $1 AND code IS NOT NULL ORDER BY "updatedAt" DESC LIMIT 1`). It only exists on that test setup; the app never calls it.

## Run

```bash
maestro test apps/mobile/.maestro \
  -e APP_ID=<the app's Android package or iOS bundle identifier> \
  -e HELPER=http://127.0.0.1:3999
```

`runScript` steps run on the computer that runs Maestro, so `HELPER` is an address seen from that computer, not from the emulator. One flow: `maestro test apps/mobile/.maestro/team.yaml -e ...`.

## The new app's flows

The flows in `next/` use the new app (`src/`, Expo Router), which only opens in builds made with `EXPO_PUBLIC_APP_SHELL=next`, so `maestro test apps/mobile/.maestro` leaves them out. The new app has no sign-in screen yet and reads the session the current app saved: sign in with a build of the current app, install the new app's build over it, then run them.

| Flow | What the person does |
| --- | --- |
| `next/home-timer.yaml` | starts the timer from Home on their last task, sees today's time run, and stops it |

`home-timer.yaml` needs a person who has tracked time on a task before, since Home starts the timer on the last task.

```bash
maestro test apps/mobile/.maestro/next -e APP_ID=<the app's Android package or iOS bundle identifier>
```

## Checking a run on another device

- `--format junit --output report.xml` writes one result per flow, and `--debug-output <folder>` keeps each step's screenshot and the logs.
- On iOS, the same command runs on a Mac with a booted simulator, with `APP_ID` set to the bundle identifier and `HELPER` reachable from the Mac.
- A recording of a flow: `adb shell screenrecord /sdcard/flow.mp4` on Android, `xcrun simctl io booted recordVideo flow.mp4` on iOS, started before the flow.

## Test IDs

The flows find the controls by test ID, never by their English text, so they also run with the app in another language. Keep these IDs when a screen is redrawn:

- sign-in: `sign-in-email`, `sign-in-continue`, `sign-in-back`, `sign-in-resend-code`, `emailed-code-input`;
- tabs and menu: `tab-work`, `tab-tasks`, `tab-team`, `open-menu`, `menu-work`, `menu-team`, `menu-tasks`, `menu-settings`, `menu-log-out`;
- task: `task-picker-field`, `task-picker-option`, `member-task` (the title of the task on a team card), `task-screen`, `task-title`;
- timer: `timer-start`, `timer-stop`, `timer-card-time`, `timer-actions-trigger`, `timer-change-start`, `timer-discard`, `timer-start-time`, `timer-start-reason`, `timer-start-save`, `timer-start-cancel`, `timer-start-error`;
- confirmation dialogs: `confirmation-confirm`, `confirmation-cancel`.
