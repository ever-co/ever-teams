---
'@ever-teams/atoms': minor
---

`@ever-teams/atoms/styles.css`: the components' styles, compiled, without Tailwind's preflight and scoped under the kit root, so a host needs no Tailwind and the stylesheet changes nothing outside the kit. Use it with the new `scopedStyles` prop: `import '@ever-teams/atoms/styles.css'` and `<TeamsProvider config={{ apiUrl }} scopedStyles>`. Without the prop nothing changes: hosts that compile the kit's classes with their own Tailwind keep working as before.
