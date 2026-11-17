---
'@ever-teams/atoms': minor
---

One timer status per `TeamsProvider`: every timer widget of a page shows the same timer, read once every 60 s while the page is visible (the Ever Teams web app's rate; it was every 30 s per widget, background tabs included), and at once on focus, on return to the page and when the browser is back online. A start or a stop in one widget updates the others at once, and the running time comes from the server. The start and stop control of each timer is named "Start timer" or "Stop timer" for screen readers, and a polite live region announces "Timer started" and "Timer stopped". New strings in English and French.
