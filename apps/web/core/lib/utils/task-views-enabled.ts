import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows the saved views, the built-in views, the bulk toolbar's platform path and the
 * keyboard preferences (`NEXT_PUBLIC_TASK_VIEWS_ENABLED=true`, read at runtime so a published image is switched
 * without a rebuild). Off by default: the Team tasks page then keeps its device-local view exactly as before.
 */
export function isTaskViewsEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_TASK_VIEWS_ENABLED') || process.env.NEXT_PUBLIC_TASK_VIEWS_ENABLED;
	return runtimeFlag === 'true';
}
