---
'@ever-teams/atoms': patch
---

Two `TeamsProvider` (or two `<ever-teams-timer>` elements) of one page keep the `colorScheme` each was given: the last one to load no longer sets the scheme of every widget of the page. A scheme a person picks with the theme toggle still applies to every widget.
