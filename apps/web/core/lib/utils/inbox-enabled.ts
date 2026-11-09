import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows the Inbox (`NEXT_PUBLIC_INBOX_ENABLED=true`, read at runtime so a published image
 * is switched without a rebuild). Off by default: the bell stays the only inbox.
 */
export function isInboxEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_INBOX_ENABLED') || process.env.NEXT_PUBLIC_INBOX_ENABLED;
	return runtimeFlag === 'true';
}
