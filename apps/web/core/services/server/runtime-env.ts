import { isPublicRuntimeEnvKey } from '@/env-config';
import { getDesktopConfig } from '@/core/services/server/requests/desktop-source';

/**
 * The public runtime configuration the browser receives for this request.
 *
 * Read from the live process env on every call (never inlined at build time), so a published Docker
 * image is configured entirely by the env it is started with: `docker run -e
 * NEXT_PUBLIC_CAPTCHA_SITE_KEY=... -e NEXT_PUBLIC_GAUZY_API_SERVER_URL=...`.
 *
 * Only `NEXT_PUBLIC_*` keys and the allow-listed branding keys (env-config.ts
 * PUBLIC_RUNTIME_ENV_KEYS) are returned — never server secrets such as AUTH_SECRET,
 * CAPTCHA_SECRET_KEY or *_CLIENT_SECRET. Keys that are set to an empty string are kept (empty),
 * because some readers distinguish "set" from "absent" (e.g. NEXT_PUBLIC_<X>_APP_NAME).
 */
export function getPublicRuntimeEnv(): Record<string, string> {
	const env = process.env as Record<string, string | undefined>;
	const publicEnv: Record<string, string> = {};

	for (const key of Object.keys(env).sort()) {
		const value = env[key];
		if (value !== undefined && isPublicRuntimeEnvKey(key)) {
			publicEnv[key] = value;
		}
	}

	// Desktop (Electron) app: the browser talks to the API the user configured in the desktop
	// settings, which the server receives as GAUZY_API_SERVER_URL. This used to be fetched
	// asynchronously from /api/desktop-server after the page loaded (env-config.ts); injecting it
	// here gives the same value before any module reads it.
	if (env['NEXT_PUBLIC_IS_DESKTOP_APP'] === 'true' || process.env.NEXT_PUBLIC_IS_DESKTOP_APP === 'true') {
		const desktopApiUrl = getDesktopConfig().GAUZY_API_SERVER_URL;
		if (desktopApiUrl) {
			publicEnv.NEXT_PUBLIC_GAUZY_API_SERVER_URL = desktopApiUrl;
		}
	}

	return publicEnv;
}
