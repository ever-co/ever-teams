type Env = Record<string, string | undefined>;

const NEXT_PUBLIC_ENVS: { value: Env } = { value: {} };

/**
 * Runtime (container) configuration for the browser.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` (and every key of next.config's `env` block) into the
 * bundles at BUILD time, so a published Docker image used to carry the values of whoever built it —
 * e.g. Ever's reCAPTCHA site key — and no `docker run -e ...` could change them. Instead, the root
 * layout (app/layout.tsx) now reads the allow-listed public keys from process.env on EVERY request
 * (see core/services/server/runtime-env.ts) and app/[locale]/layout.tsx writes them into an inline
 * <script> as the first child of <head>. That script runs during HTML parsing, before any bundle
 * module is evaluated, so every reader below (lazy getters AND module-level constants) sees the
 * runtime values in the browser, exactly as the server does.
 *
 * Only keys that are public by definition may be exposed: every `NEXT_PUBLIC_*` key plus the
 * branding keys below (all rendered in the UI anyway). NEVER add a secret here.
 */
const RUNTIME_ENV_GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
export const RUNTIME_ENV_SCRIPT_ID = 'ever-teams-runtime-env';
export const PUBLIC_RUNTIME_ENV_KEYS = [
	'APP_NAME',
	'APP_SIGNATURE',
	'APP_LOGO_URL',
	'APP_LINK',
	'APP_SLOGAN_TEXT',
	'COMPANY_NAME',
	'COMPANY_LINK',
	'TERMS_LINK',
	'PRIVACY_POLICY_LINK',
	'MAIN_PICTURE',
	'MAIN_PICTURE_DARK'
] as const;

export function isPublicRuntimeEnvKey(key: string): boolean {
	return key.startsWith('NEXT_PUBLIC_') || (PUBLIC_RUNTIME_ENV_KEYS as readonly string[]).includes(key);
}

/**
 * A whitespace-only value counts as EMPTY. Secrets managers often hold single-space placeholders for
 * "unset" keys (stage did, for BOARD_*, MEET_DOMAIN, CHATWOOT, ...): a space is truthy, so it would
 * switch features on with an unusable value. Empty stays distinct from absent (undefined), which some
 * readers rely on (NEXT_PUBLIC_<X>_APP_NAME).
 */
function normalizeRuntimeValue(value: string | undefined): string | undefined {
	return value?.trim() === '' ? '' : value;
}

/** The runtime env the server injected into the page, when running in a browser that received it. */
function readInjectedRuntimeEnv(): Env | undefined {
	if (typeof window === 'undefined') return undefined;
	const injected = (globalThis as Record<string, unknown>)[RUNTIME_ENV_GLOBAL];
	return injected && typeof injected === 'object' ? (injected as Env) : undefined;
}

/**
 * Runtime value of a public env var, or undefined when the deployment did not set it.
 *
 * - Browser: the value the server injected for this request (app/[locale]/layout.tsx).
 * - Server: the live process env, read with a computed key so Next never inlines a build-time
 *   value in place of it.
 *
 * Callers pass their build-time value as the fallback (`readRuntimeEnv('X') || process.env.X`) so
 * non-Docker builds (Vercel, `yarn build`), where build and runtime env are the same, keep working
 * even on pages rendered without the injected script.
 */
export function readRuntimeEnv(name: string): string | undefined {
	const injected = readInjectedRuntimeEnv();
	if (injected) return normalizeRuntimeValue(injected[name]);
	if (typeof window !== 'undefined') return normalizeRuntimeValue(NEXT_PUBLIC_ENVS.value[name]);
	const env = process.env as Env;
	return normalizeRuntimeValue(env[name]);
}

/**
 * The `<script>` body that publishes `env` to the browser. JSON is escaped so a value can never
 * close the script tag or break out of the string (same escaping as Next's htmlescape).
 */
export function serializeRuntimeEnvScript(env: Env): string {
	const json = JSON.stringify(env)
		.replace(/</g, String.raw`\u003c`)
		.replace(/>/g, String.raw`\u003e`)
		.replace(/&/g, String.raw`\u0026`)
		.replace(/\u2028/g, String.raw`\u2028`)
		.replace(/\u2029/g, String.raw`\u2029`);
	return `self.${RUNTIME_ENV_GLOBAL}=${json};`;
}

/**
 * Installs the runtime env in the browser, for the lazy readers (getNextPublicEnv getters,
 * readRuntimeEnv calls made from now on). Normally the inline <script> already did this before any
 * module ran; values a module computed at load time on a document WITHOUT that script (a page
 * outside app/[locale] that does not render <RuntimeEnvScript />) are not corrected by this — every
 * document must render the script (see app/not-found.tsx). Idempotent.
 */
export function installRuntimeEnv(env: Env) {
	if (typeof window === 'undefined' || !env) return;
	(globalThis as Record<string, unknown>)[RUNTIME_ENV_GLOBAL] = env;
	setNextPublicEnv(env);
}

type OptionObject<T> = {
	default?: string;
	map?: (value: string | undefined) => T;
};
type Options<T> = string | OptionObject<T>;

type InferValue<T> = T extends { map: (value: any) => infer U } ? U : string | undefined;

type ReturnedType<T> = {
	readonly value: T extends string ? string : InferValue<T>;
};

/**
 * This function only loads environment variables starting with NEXT_PUBLIC_*
 *
 * Useful for getting the latest value of the variable at runtime rather than at build time
 *
 * @param name
 * @param options
 * @returns
 */
export function getNextPublicEnv<O extends Options<unknown>>(name: string, options?: O): ReturnedType<O> {
	return {
		get value() {
			const defaultValue = typeof options === 'string' ? options : options?.default;

			let value = normalizeRuntimeValue(NEXT_PUBLIC_ENVS.value[name]) || defaultValue;
			if (typeof options === 'object' && options.map) {
				value = options.map(value) as any;
			}

			return value as any;
		}
	};
}

export function getServerRuntimeConfig() {
	// Next.js 16: serverRuntimeConfig removed, use environment variables instead
	return {
		GAUZY_API_SERVER_URL: process.env.GAUZY_API_SERVER_URL
	};
}

export function setNextPublicEnv(envs: Env) {
	if (envs) {
		NEXT_PUBLIC_ENVS.value = {
			...NEXT_PUBLIC_ENVS.value,
			...envs
		};
	}
}

export function loadNextPublicEnvs() {
	return Object.keys(process.env)
		.filter((key) => key.startsWith('NEXT_PUBLIC'))
		.reduce((acc, value) => {
			acc[value] = process.env[value];
			return acc;
		}, {} as Env);
}

// Preload Some variables
const injectedRuntimeEnv = readInjectedRuntimeEnv();
if (injectedRuntimeEnv) {
	// Browser with the server-injected runtime env (the normal path, desktop app included: the
	// server already mapped the desktop API URL into it, see core/services/server/runtime-env.ts).
	setNextPublicEnv(injectedRuntimeEnv);
} else if (process.env.NEXT_PUBLIC_IS_DESKTOP_APP === 'true' && typeof window !== 'undefined' && !Object.keys(NEXT_PUBLIC_ENVS.value).length) {
	(async () => {
		const resp = await fetch('/api/desktop-server');
		if (resp.ok) {
			const serverConfig = await resp.json();
			setNextPublicEnv({ ...loadNextPublicEnvs(), ...{ NEXT_PUBLIC_GAUZY_API_SERVER_URL: serverConfig?.GAUZY_API_SERVER_URL } });
		}
	})();
} else {
	setNextPublicEnv(loadNextPublicEnvs());
}
