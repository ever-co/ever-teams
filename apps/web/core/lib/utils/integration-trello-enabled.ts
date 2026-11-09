import { readRuntimeEnv } from '@/env-config';

/**
 * Whether the Trello integration page is on for this deployment: `NEXT_PUBLIC_INTEGRATION_TRELLO_ENABLED` exactly
 * `true` (read at run time, the build-time value as the fallback). The platform decides the rest: where its Trello
 * plugin is not loaded, the page hides the provider.
 */
export function isTrelloIntegrationEnabled(): boolean {
	return (readRuntimeEnv('NEXT_PUBLIC_INTEGRATION_TRELLO_ENABLED') || process.env.NEXT_PUBLIC_INTEGRATION_TRELLO_ENABLED) === 'true';
}
