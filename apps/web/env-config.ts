import getConfig from 'next/config';

type Env = Record<string, string | undefined>;

const NEXT_PUBLIC_ENVS: { value: Env } = { value: {} };

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

export function getServerRuntimeConfig() {
	try {
		const { serverRuntimeConfig } = getConfig();
		return {
			GAUZY_API_SERVER_URL: serverRuntimeConfig.GAUZY_API_SERVER_URL
		};
	} catch (e) {
		console.log('skip get config on call from client');
	}
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
