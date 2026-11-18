---
'@ever-teams/atoms': minor
---

`TeamsProvider` takes `onTimerChange`, called with a `TimerChange` at the first read of the person's timer (`initial: true`) and at each start, stop or other running entry a later read shows, once, wherever it was made. It hears the reads the kit already makes while one of its timers is on the page (on load, every minute while the page is visible, on focus, when the network comes back): no request is added. The package exports the `TimerChange` type. Without the prop nothing changes.
