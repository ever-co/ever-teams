---
'@ever-teams/toolkit-types': patch
---

The declarations npm packs and publishes keep the `.js` the build writes on each relative path: the package's `prepare` script, which npm runs after the build, wrote them again without it, so an ES module under `"moduleResolution": "node16"` or `"nodenext"` got none of the package's types, directly or through `@ever-teams/api`.
