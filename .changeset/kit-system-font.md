---
'@ever-teams/atoms': minor
---

Inside the kit root (`scopedStyles`), the widgets and their dialogs draw in the Ever Teams web app's font, the system UI face, instead of the host page's font; nothing is downloaded and the host page keeps its own font. A host that wants its font in the widgets sets `--ever-teams-kit-font` (for example on `:root`). A font picked with the font toggle still wins.
