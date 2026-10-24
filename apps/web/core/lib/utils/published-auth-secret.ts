import { isPublishedAuthSecret } from '@/core/constants/config/constants';

/**
 * Production start-up step (instrumentation.ts), run before `assertAuthSecret`: an AUTH_SECRET that is one of the
 * values published in this repository (`apps/web/.env`) is removed from the environment. Ignoring it in `authSecret`
 * is not enough: next-auth reads AUTH_SECRET from the environment itself when it is given no secret, and would keep
 * signing its cookies with a value anyone can read.
 *
 * @returns Whether a published value was removed.
 */
export function dropPublishedAuthSecret(env: Record<string, string | undefined> = process.env): boolean {
	if (!isPublishedAuthSecret(env.AUTH_SECRET)) return false;
	delete env.AUTH_SECRET;
	console.error(
		'AUTH_SECRET is the public value from the Ever Teams repository (apps/web/.env) and is ignored: anyone could ' +
			'forge sign-in cookies with it. Set your own, e.g. AUTH_SECRET=$(openssl rand -base64 32).'
	);
	return true;
}
