// Sentry for the edge runtime (edge routes; the Node.js runtime uses sentry.server.config.ts).
// Same runtime-env options as the Node.js server: instrumentation.ts loads this file only in the edge bundle, where
// '@sentry/nextjs' resolves to the SDK's edge build.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

export { initSentryServer as initSentryEdge } from './sentry.server.config';
