/**
 * Runtime (container) configuration.
 *
 * Next.js inlines every `process.env.NEXT_PUBLIC_*` it can see at BUILD time, into the client AND the
 * server bundles, so a published Docker image would carry the values of whoever built it. Reading the
 * env by a COMPUTED key keeps the lookup out of that substitution, so the value comes from the
 * environment the container was started with: `docker run -e NEXT_PUBLIC_TEAMS_API_URL=...`.
 *
 * Server only: call it from a server component (the root layout) and pass the result down as a prop.
 * Whitespace-only counts as unset, so a secret-store placeholder does not become an unusable value.
 */
export function readRuntimeEnv(name: string): string | undefined {
	const env = process.env as Record<string, string | undefined>;
	const value = env[name];
	return value?.trim() === '' ? undefined : value;
}
