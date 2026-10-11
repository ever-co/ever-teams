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

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
