# Ever Teams Toolkit

The SDK packages (`@ever-teams/api`, `atoms`, `toolkit-ui`, `toolkit-types`) and
the example apps that show how to use them.

## Docker images (SDK demos)

`.github/workflows/k8s-build-examples.yml` publishes one image per example plus
the builder and the Storybook:
`ghcr.io/ever-co/ever-teams-example-{vite,next,next-boilerplate,saas,base,remix}`,
`ghcr.io/ever-co/ever-teams-builder`, `ghcr.io/ever-co/ever-teams-storybook`.

They are **demos**, but they are re-usable: no deployment value is baked in, and
none may ever be added as a Docker build arg (Next.js inlines `NEXT_PUBLIC_*`
into the client **and** server bundles; Vite freezes `import.meta.env.*`). Point
one at your own Gauzy API at runtime:

```bash
# Next.js / Remix examples and the builder
# (a Node server reads the env on every request)
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_TEAMS_API_URL=https://api.example.com/api \
  ghcr.io/ever-co/ever-teams-example-next
docker run -p 3000:3000 -e PUBLIC_TEAMS_API_URL=https://api.example.com/api \
  ghcr.io/ever-co/ever-teams-example-remix

# Vite example and Storybook
# (static bundles: the entrypoint writes /runtime-config.js at start)
docker run -p 8080:80 -e VITE_TEAMS_API_URL=https://api.example.com/api \
  ghcr.io/ever-co/ever-teams-example-vite
docker run -p 8080:80 -e STORYBOOK_TEAMS_API_URL=https://api.example.com/api \
  ghcr.io/ever-co/ever-teams-storybook
```

How it works, per app type:

- **Next.js** (`base`, `next`, `saas-starter`, `next-boilerplate-ixartz`,
  `builder`): the server root layout calls `await connection()` (so the value is
  never frozen into a prerendered shell), reads the env through
  `runtime-env.ts` by a **computed key** (so Next cannot inline it) and passes
  it to the client layout as a prop. This is the web app's contract without its
  payload machinery: each demo reads one value, in one place, inside the root
  layout's subtree.
- **Remix** (`remix`): already runtime-configurable — `app/root.tsx`'s
  `loader()` reads `process.env.PUBLIC_TEAMS_API_URL` on every request.
- **Vite / Storybook**: pure static bundles behind nginx, **no server**.
  `/runtime-config.js` is rewritten from the container environment by
  `.deploy/examples/runtime-config.sh` before nginx starts, and the page loads
  it ahead of its own bundle.

Still build-time in these demos, deliberately: the builder's Builder.io /
Plasmic / encryption keys (`initPlasmicLoader` runs at module scope, so making
them runtime would need a lazy-init refactor) and the ixartz boilerplate's
`NEXT_PUBLIC_SENTRY_DSN` (`sentry.client.config.ts` runs before React, so no
prop can reach it). Nothing of Ever's is baked into them — they are simply unset
in the published images, so those integrations stay off until you rebuild with
your own values.
