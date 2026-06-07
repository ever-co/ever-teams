# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It is used to
version and publish the **public** Ever Teams SDK packages to the npm registry:

- `@ever-teams/api`
- `@ever-teams/toolkit-types`
- `@ever-teams/toolkit-ui`
- `@ever-teams/atoms`
- `@ever-teams/tracking`

All other workspace packages are marked `"private": true` and are **never** published — they are
consumed locally via Yarn Workspaces, so cloning the repo and building works without any of the SDK
packages being published to npm.

## Adding a changeset

```bash
yarn changeset
```

Pick the changed SDK package(s), choose a semver bump, and write a short summary. Commit the generated
file under `.changeset/`.

## Releasing

On push to `main`, the **Release Ever Teams SDK to npm** workflow runs:

```bash
yarn version-packages   # changeset version  — applies bumps + changelogs
yarn publish-packages   # changeset publish  — publishes public packages to npm
```

Publishing requires the `NPM_TOKEN` repository secret with publish rights to the `@ever-teams` npm
organization. `access: "public"` in `config.json` (and `publishConfig.access: "public"` in each
package) ensures the scoped packages are published publicly.
