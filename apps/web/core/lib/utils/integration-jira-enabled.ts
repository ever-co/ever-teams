import { readRuntimeEnv } from '@/env-config';

/**
 * Whether the Jira integration page is on for this deployment: `NEXT_PUBLIC_INTEGRATION_JIRA_ENABLED` exactly
 * `true` (read at run time, the build-time value as the fallback). The platform decides the rest: where its Jira
 * Cloud sync is not loaded (`JIRA_ENABLED` off there), the page hides the provider.
 */
export function isJiraIntegrationEnabled(): boolean {
	return (
		(readRuntimeEnv('NEXT_PUBLIC_INTEGRATION_JIRA_ENABLED') || process.env.NEXT_PUBLIC_INTEGRATION_JIRA_ENABLED) ===
		'true'
	);
}
