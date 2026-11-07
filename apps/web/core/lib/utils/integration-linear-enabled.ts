import { readRuntimeEnv } from '@/env-config';

/**
 * Whether the Linear integration page is on for this deployment: `NEXT_PUBLIC_INTEGRATION_LINEAR_ENABLED` exactly
 * `true` (read at run time, the build-time value as the fallback). The platform decides the rest: where its Linear
 * plugin is not loaded, the page hides the provider.
 */
export function isLinearIntegrationEnabled(): boolean {
	return (readRuntimeEnv('NEXT_PUBLIC_INTEGRATION_LINEAR_ENABLED') || process.env.NEXT_PUBLIC_INTEGRATION_LINEAR_ENABLED) === 'true';
}
