import { assertServerOnly } from './lib/server/server-only';

// Refused when a page loads it, also through a bundler that ignored the browser condition of package.json.
assertServerOnly();

export { exchangeEmbedToken } from './lib/server/embed-token';
export { getClientReport } from './lib/server/client-report';
export type { EverTeamsEmbedToken, ExchangeEmbedTokenOptions, GetClientReportOptions } from './lib/server/types';
export type { IClientTimeReport } from '@ever-teams/toolkit-types';
