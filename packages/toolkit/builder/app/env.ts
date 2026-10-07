const NEXT_PUBLIC_ENVS: { value: Env } = { value: {} };

type Env = Record<string, string | undefined>;

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

			let value = NEXT_PUBLIC_ENVS.value[name] || defaultValue;
			if (typeof options === 'object' && options.map) {
				value = options.map(value) as any;
			}

			return value as any;
		}
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
setNextPublicEnv(loadNextPublicEnvs());

/**
 * Runtime (container) configuration.
 *
 * Next.js inlines every `process.env.NEXT_PUBLIC_*` it can see at BUILD time, into the client AND the
 * server bundles, so a published Docker image would carry the values of whoever built it. Reading the
 * env by a COMPUTED key keeps the lookup out of that substitution, so the value comes from the
 * environment the container was started with: `docker run -e NEXT_PUBLIC_TEAMS_API_URL=...`.
 *
 * Server only: call it from a server component (app/layout.tsx) and pass the result down as a prop.
 * Whitespace-only counts as unset, so a secret-store placeholder does not become an unusable value.
 */
export function readRuntimeEnv(name: string): string | undefined {
	const env = process.env as Env;
	const value = env[name];
	return value?.trim() === '' ? undefined : value;
}
