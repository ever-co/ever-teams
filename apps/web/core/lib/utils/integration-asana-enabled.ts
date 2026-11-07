import { readRuntimeEnv } from '@/env-config';

/**
 * Whether the Asana integration page is on for this deployment: `NEXT_PUBLIC_INTEGRATION_ASANA_ENABLED` exactly
 * `true` (read at run time, the build-time value as the fallback). The platform decides the rest: where its Asana
 * plugin is not loaded, the page hides the provider.
 */
export function isAsanaIntegrationEnabled(): boolean {
	return (readRuntimeEnv('NEXT_PUBLIC_INTEGRATION_ASANA_ENABLED') || process.env.NEXT_PUBLIC_INTEGRATION_ASANA_ENABLED) === 'true';
}
