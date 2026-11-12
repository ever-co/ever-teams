import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows Settings → Automations (`NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED` exactly `true`, read at
 * run time so a published image is switched without a rebuild; the build-time value is the fallback). Off by default:
 * the entry is not listed, the page answers "not found" and nothing is asked of the platform. On, the platform decides
 * the rest: where its task automations plugin is not loaded, the routes answer 404 and the entry hides again.
 */
export function isTaskAutomationsEnabled(): boolean {
	const runtimeFlag =
		readRuntimeEnv('NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED') || process.env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED;
	return runtimeFlag === 'true';
}
