---
'@ever-teams/atoms': patch
'@ever-teams/toolkit-ui': patch
---

Rendered in a shadow root, the kit root opens its dialogs, popovers and menus in that shadow root instead of `document.body`, and a dialog there takes the focus itself instead of focusing each of its elements in turn (the sign-in dialog opened on its Token tab). In a page nothing changes.
