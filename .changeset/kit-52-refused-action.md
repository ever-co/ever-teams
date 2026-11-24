---
'@ever-teams/atoms': patch
---

After a start or stop the API refuses (the timer was already stopped or started in another tab or app), every timer widget of the page reads the status again before it shows the refusal, so it shows the timer as it is instead of the stale state.
