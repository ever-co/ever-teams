import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows Docs (`NEXT_PUBLIC_DOCS_ENABLED=true`, read at runtime so a published image is
 * switched without a rebuild). Off by default. The file attachments of tasks and projects do not depend on it.
 */
export function isDocsEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_DOCS_ENABLED') || process.env.NEXT_PUBLIC_DOCS_ENABLED;
	return runtimeFlag === 'true';
}
