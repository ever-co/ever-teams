/**
 * Runtime (container) configuration for a static Vite bundle.
 *
 * Vite freezes every `import.meta.env.*` into the bundle at build time and this image has no server,
 * so the values are published by /runtime-config.js, which index.html loads before the app bundle.
 * The container entrypoint (.deploy/examples/runtime-config.sh) rewrites that file from the
 * environment at start, so `docker run -e VITE_TEAMS_API_URL=...` works without a rebuild.
 *
 * Callers keep the build-time value as the fallback, so `yarn dev` / `yarn build` keep reading .env.
 * Whitespace-only counts as unset, so a secret-store placeholder does not become an unusable value.
 */
type RuntimeEnv = Record<string, string | undefined>;

export function readRuntimeEnv(name: string): string | undefined {
	const injected = (globalThis as { __EVER_TEAMS_RUNTIME_ENV__?: RuntimeEnv }).__EVER_TEAMS_RUNTIME_ENV__;
	const value = injected?.[name];
	return value?.trim() === '' ? undefined : value;
}
