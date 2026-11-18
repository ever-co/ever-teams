---
'@ever-teams/embed': minor
---

New package: `<ever-teams-timer api-url="...">`, the Ever Teams timer as an HTML element for pages without React. One `<script type="module">` loads React, the kit and its stylesheet; the element renders the kit's sign-in and basic timer in its own shadow root, reads `api-url`, `color-scheme` and `lang`, and stops when removed.
