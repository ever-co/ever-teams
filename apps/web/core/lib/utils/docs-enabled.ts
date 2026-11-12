import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows Docs (`NEXT_PUBLIC_DOCS_ENABLED=true`, read at runtime so a published image is
 * switched without a rebuild). Off by default. The file attachments of tasks and projects do not depend on it.
 */
export function isDocsEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_DOCS_ENABLED') || process.env.NEXT_PUBLIC_DOCS_ENABLED;
	return runtimeFlag === 'true';
}

/**
 * Whether this deployment offers the import of exported workspaces into Docs (`NEXT_PUBLIC_DOCS_IMPORT_ENABLED=true`,
 * read at runtime). Off by default. With it on, the Import action still waits for the platform's import probe: a
 * platform whose import is off answers 404 and the action stays hidden.
 */
export function isDocsImportEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_DOCS_IMPORT_ENABLED') || process.env.NEXT_PUBLIC_DOCS_IMPORT_ENABLED;
	return isDocsEnabled() && runtimeFlag === 'true';
}
