import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment shows the team chat (`NEXT_PUBLIC_CHAT_ENABLED=true`, read at runtime so a published image
 * is switched without a rebuild). Off by default. The AI assistant is a separate entry and is not affected.
 */
export function isChatEnabled(): boolean {
	const runtimeFlag = readRuntimeEnv('NEXT_PUBLIC_CHAT_ENABLED') || process.env.NEXT_PUBLIC_CHAT_ENABLED;
	return runtimeFlag === 'true';
}
