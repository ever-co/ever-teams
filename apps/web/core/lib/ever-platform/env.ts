import { readRuntimeEnv } from '@/env-config';

/**
 * Strict switches of the optional Ever Platform features (shared by the server and the browser).
 *
 * Every switch is read at RUNTIME and compared with the exact strings 'true' and 'false'. Anything
 * else ('TRUE', '1', 'yes', a typo) falls back to the switch's default and is logged once per
 * process, so a misspelt value can never turn a feature on by accident.
 *
 * Nothing in this file names a host: the browser bundle imports it.
 */

type Env = Record<string, string | undefined>;

/** One configuration warning per process and key (the registry the other configuration warnings use). */
export function warnOnce(key: string, message: string): void {
	const registry = globalThis as typeof globalThis & { __everTeamsConfigWarnings?: Set<string> };
	registry.__everTeamsConfigWarnings ??= new Set<string>();
	if (registry.__everTeamsConfigWarnings.has(key)) return;
	registry.__everTeamsConfigWarnings.add(key);
	console.warn(message);
}

/**
 * `'true'` or `'false'`, else `fallback`. Unset and blank mean "not configured" (the default, no
 * warning); any other value is logged once and also means the default.
 */
export function parseBoolEnv(name: string, fallback: boolean, env: Env = process.env as Env): boolean {
	const raw = env[name];
	if (raw === undefined || raw.trim() === '') return fallback;
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	warnOnce(
		`ever-platform:${name}`,
		`${name} must be exactly "true" or "false": the value is ignored and the default (${fallback}) applies.`
	);
	return fallback;
}

/**
 * The anonymous usage statistics of this web app: on unless `EVER_STATS_ENABLED` is exactly 'false'.
 * Server only (the browser never sees the variable). With 'false' the statistics code is not even
 * loaded and every /api/ever-stats route answers 404.
 */
export function isEverStatsEnabled(env: Env = process.env as Env): boolean {
	return parseBoolEnv('EVER_STATS_ENABLED', true, env);
}

/**
 * The Ever Platform connection parts of the settings: off unless `NEXT_PUBLIC_EVER_CONNECT_ENABLED` is
 * exactly 'true'. Read from the runtime env (the server's env, or what the server published to this
 * page), the build-time value being only the fallback of a non-Docker build.
 */
export function isEverConnectFlagOn(): boolean {
	const raw = readRuntimeEnv('NEXT_PUBLIC_EVER_CONNECT_ENABLED') ?? process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
	return parseBoolEnv('NEXT_PUBLIC_EVER_CONNECT_ENABLED', false, { NEXT_PUBLIC_EVER_CONNECT_ENABLED: raw });
}
