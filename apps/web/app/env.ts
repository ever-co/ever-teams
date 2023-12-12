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
 * This function loads only env variables which start with NEXT_PUBLIC_*
 *
 * Useful to get the latest value of variable at runtime instead of build time
 *
 * @param name
 * @param options
 * @returns
 */
export function getNextPublicEnv<O extends Options<unknown>>(name: string, options?: O): ReturnedType<O> {
	return {
		get value() {
			let value = typeof options === 'string' ? options : options?.default;
			value = NEXT_PUBLIC_ENVS.value[name] || value;

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
		.reduce(
			(acc, value) => {
				if (process.env[value]) {
					acc[value] = process.env[value] as string;
				}
				return acc;
			},
			{} as Record<string, string>
		);
}

// Preload Some variables
setNextPublicEnv(loadNextPublicEnvs());
