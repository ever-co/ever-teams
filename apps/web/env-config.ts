type Env = Record<string, string | undefined>;

const NEXT_PUBLIC_ENVS: { value: Env } = { value: {} };

/**
 * Runtime (container) configuration for the browser.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` (and every key of next.config's `env` block) into the
 * bundles at BUILD time, so a published Docker image used to carry the values of whoever built it —
 * e.g. Ever's reCAPTCHA site key — and no `docker run -e ...` could change them. Instead, the root
 * layout (app/layout.tsx) now reads the allow-listed public keys from process.env on EVERY request
 * (see core/services/server/runtime-env.ts) and app/[locale]/layout.tsx writes them into the
 * RUNTIME_ENV_ATTRIBUTE of <html>. The <html> start tag is the first thing the browser parses, so
 * every reader below (lazy getters AND module-level constants) sees the runtime values from the
 * first module evaluation on, exactly as the server does — even for the `async` bundle chunks Next
 * puts at the top of <head>, which may run before the rest of the document is parsed.
 *
 * An attribute rather than an inline <script> on purpose: a script in <head> is a positionally
 * hydrated host element, so anything that injects into <head> (a test harness, a proxy, a browser
 * extension) shifts it and makes React discard and re-render the document; and it would force
 * `script-src unsafe-inline` on deployments with a strict CSP.
 *
 * Only keys that are public by definition may be exposed: every `NEXT_PUBLIC_*` key plus the
 * branding keys below (all rendered in the UI anyway). NEVER add a secret here.
 */
const RUNTIME_ENV_GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
export const RUNTIME_ENV_ATTRIBUTE = 'data-ever-teams-runtime-env';
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
	'MAIN_PICTURE_DARK',
	'APP_FAVICON_URL'
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

/** The payload the server wrote on <html>, or undefined when this document did not get one. */
function readRuntimeEnvAttribute(): Env | undefined {
	if (typeof document === 'undefined') return undefined;
	const raw = document.documentElement?.getAttribute(RUNTIME_ENV_ATTRIBUTE);
	if (!raw) return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as Env) : undefined;
	} catch {
		// A payload we cannot parse is no payload: fall back to the build-time values.
		return undefined;
	}
}

/** The runtime env the server injected into the page, when running in a browser that received it. */
function readInjectedRuntimeEnv(): Env | undefined {
	if (typeof window === 'undefined') return undefined;
	const injected = (globalThis as Record<string, unknown>)[RUNTIME_ENV_GLOBAL];
	if (injected && typeof injected === 'object') return injected as Env;
	// Read <html> once and keep it: app/global-error.tsx re-renders the document without the
	// attribute, and a soft navigation never re-parses it.
	const fromAttribute = readRuntimeEnvAttribute();
	if (fromAttribute) installRuntimeEnv(fromAttribute);
	return fromAttribute;
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
 * The RUNTIME_ENV_ATTRIBUTE value that publishes `env` to the browser. Plain JSON: React escapes
 * attribute values, and an attribute can hold no markup, so nothing here can break out of the tag.
 */
export function serializeRuntimeEnvAttribute(env: Env): string {
	return JSON.stringify(env);
}

/**
 * Installs the runtime env in the browser, for the lazy readers (getNextPublicEnv getters,
 * readRuntimeEnv calls made from now on). Normally the <html> attribute already carried it before
 * any module ran; values a module computed at load time on a document that had NEITHER the
 * attribute are not corrected by this, so every document the app renders must carry it (see
 * app/[locale]/layout.tsx and app/not-found.tsx). Idempotent.
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

/**
 * Whether the module-level constants of this bundle saw the deployment's runtime env.
 *
 * Decided once, HERE, before anything can install a payload later: true on the server (it reads live
 * process.env) and in every document the app renders itself, where the <html> attribute or
 * the <html> attribute published the payload before the first module ran. False only in the document
 * Next builds WITHOUT app/layout.tsx — its own `<html id="__next_error__">` shell, client-rendered
 * after an SSR error or a notFound() raised during SSR (a first path segment with a dot, e.g.
 * /foo.bar, which proxy.ts's matcher skips). There every `const` computed at load time keeps the
 * build-time default; installRuntimeEnv() from a later <RuntimeEnvProvider> repairs the lazy readers
 * but never those, so such a document must be left by a full page load, not a soft navigation.
 */
const MODULE_CONSTANTS_SAW_RUNTIME_ENV = typeof window === 'undefined' || injectedRuntimeEnv !== undefined;

export function moduleConstantsSawRuntimeEnv(): boolean {
	return MODULE_CONSTANTS_SAW_RUNTIME_ENV;
}

/**
 * The RUNTIME_ENV_ATTRIBUTE props for a document that re-renders <html> outside
 * <RuntimeEnvProvider>: app/global-error.tsx replaces the root layout, so React would otherwise drop
 * the attribute from the element and leave nothing on the document for a module that has not read it
 * yet. Empty when this document never carried a payload (the `__next_error__` shell).
 */
export function injectedRuntimeEnvHtmlProps(): Record<string, string> {
	const env = readInjectedRuntimeEnv();
	return env ? { [RUNTIME_ENV_ATTRIBUTE]: serializeRuntimeEnvAttribute(env) } : {};
}
