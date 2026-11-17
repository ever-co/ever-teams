---
'@ever-teams/toolkit-ui': minor
---

`PortalContainerContext` and `withKitContainer`: dialogs, alert dialogs, popovers, menus and selects mount their content in the element this context provides, instead of `document.body` when there is none (unchanged default). `TeamsProvider scopedStyles` of `@ever-teams/atoms` provides one inside its kit root.
