---
'@ever-teams/toolkit-ui': patch
'@ever-teams/atoms': patch
---

Dialogs have a title for screen readers. `Dialog` renders a given `title` as the dialog's title (it printed the bare text and left the dialog unnamed), and the new `hideTitle` prop keeps that title for screen readers only (a `description` stays visible). The sign-in, registration, member invitation and team creation dialogs of atoms use it, so they no longer trigger Radix's "DialogContent requires a DialogTitle" error; the sign-in and registration dialogs are named after the form they show, through the new `onModeChange` prop of `TeamsLoginForm` and `TeamsRegistrationForm`.
