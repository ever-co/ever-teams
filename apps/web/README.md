This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3030](http://localhost:3030) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3030/api/hello](http://localhost:3030/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Dev Server Memory

`next dev` keeps everything it has compiled in memory for as long as it runs.
Memory peaks while a page compiles, then settles at a retained level that
grows with each new page you open and is only released when the server stops.
After a walk through the app it can hold several GB, and two dev servers side
by side can push a 16 GB machine into swap, which slows the editor and the
terminal too.

When that happens, stop the dev server and start it again. Turbopack keeps its
compiler cache on disk in `apps/web/.next/dev`, so the restarted server reuses
what it already compiled and the restart is quick. Keep that folder between
restarts: deleting `.next` makes every page compile from scratch again.

## API routes and authorization

When the browser reaches the Gauzy API through this app
(`NEXT_PUBLIC_GAUZY_API_SERVER_URL` not set), it calls the routes under
`app/api` that forward the call to the Gauzy API. Their guard,
`authenticatedGuard` in
`core/services/server/guards/authenticated-guard-app.ts`, only authenticates: it
checks the access token and reads the tenant, organization and team from the
caller's cookies. Such a route then sends the caller's own token, so the Gauzy
API is its authorization boundary: it decides from the caller's role and
permissions whether an id sent by the client (an employee, a team, a daily plan)
may be read or changed. Do not add an ownership or membership check in a route
that forwards to the Gauzy API. The access token is readable in the browser and
can be sent to the Gauzy API directly, so such a check protects nothing, and it
would break the legitimate reads of managers and admins on other members.

This does not apply to the routes that sign their own credentials with a server
secret, such as `app/api/livekit` and `app/api/auth/meet/jwt`. The browser
cannot make those tokens itself and calls these routes through this app in both
API modes, so the app is their authorization boundary and the route must decide
who may get a token.

## Linting

`yarn workspace @ever-teams/web lint` runs ESLint 9 with `eslint.config.mjs`
over every `.js`, `.jsx`, `.ts` and `.tsx` file and fails on any warning. CI's
`nx run web:lint` runs that same script, and the pre-commit hook runs
`lint:staged` (with `--fix`) on the staged `apps/web` files. Run ESLint through
these scripts: the repository root has its own ESLint 8.46, which cannot load
this config.

The rules come from eslint-config-next's `core-web-vitals` and `typescript`
configs (Next, React, hooks, accessibility, import and typescript-eslint).
Violations that existed when TypeScript linting was turned on are recorded in
`eslint-suppressions.json` ([ESLint bulk suppressions](https://eslint.org/docs/latest/use/suppressions)),
so every rule already applies to new code:

- A new violation fails. So does one more violation of a rule in a file that
  has suppressed ones: ESLint then lists all of that rule's violations in the
  file, old and new, and you fix the new one.
- After fixing suppressed violations, run
  `yarn workspace @ever-teams/web lint:prune` and commit the smaller
  `eslint-suppressions.json`. `lint` does not fail on a stale entry, so a fix
  never turns a promotion red, but a stale count would let the file take the
  violation back.
- Do not use `--suppress-all` to make a new violation pass. It is only for
  recording the backlog of a rule you turn on, in its own pull request.

Backlog when TypeScript linting was turned on (1,690 violations in 512 files),
in the order to burn it down:

1.  Possible bugs, a handful each: `no-constant-binary-expression` (an
    always-true `!false &&` in `email-reset-modal.tsx`),
    `react-hooks/static-components` (a component created during render in
    `review-summary.tsx`), `react/no-children-prop`, `react-hooks/use-memo` (3),
    `react-hooks/purity` (8), `react-hooks/immutability` (28),
    `@typescript-eslint/no-non-null-asserted-optional-chain` (5), `prefer-const`
    (5, auto-fixable).
2.  Hook correctness: `react-hooks/exhaustive-deps` (118),
    `react-hooks/set-state-in-effect` (121), `react-hooks/refs` (122),
    `react-hooks/preserve-manual-memoization` (76),
    `react-hooks/incompatible-library` (6).
3.  TypeScript hygiene: `@typescript-eslint/no-unused-vars` (90),
    `@typescript-eslint/no-unused-expressions` (97),
    `@typescript-eslint/ban-ts-comment` (55),
    `@typescript-eslint/no-require-imports` (85),
    `@typescript-eslint/no-explicit-any` (854, folder by folder), and the
    one-offs: `no-empty-object-type` (4), `import/no-anonymous-default-export`
    (4), `react/no-unescaped-entities` (2), `no-namespace`, `no-redeclare` (a
    `/* global module */` that Node's globals now cover), `no-head-element`
    and `jsx-a11y/role-has-required-aria-props` (both in tests).
4.  About 67 `eslint-disable` comments name rules that are not enabled
    (`no-console`, `no-mixed-spaces-and-tabs`, the old
    `@typescript-eslint/no-var-requires`...). Remove them, then turn
    `reportUnusedDisableDirectives` back on in `eslint.config.mjs`.
5.  The house rules of `@ever-teams/eslint-config/next.js` (`import/order`,
    `@typescript-eslint/naming-convention`, `react/self-closing-comp`...), which
    only the ESLint 8 era `.eslintrc.json` loaded, are not enabled. Measure each
    one and add it with its own baseline.

`eslint-plugin-unused-imports` only checks JavaScript: it builds on the root's
`@typescript-eslint/eslint-plugin` 5.60, which crashes on TypeScript under
ESLint 9, so `@typescript-eslint/no-unused-vars` reports unused imports in
TypeScript instead (without the automatic removal). Upgrading the root's lint
packages would let it cover TypeScript again.

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
