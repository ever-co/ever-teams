export interface IApiTeamsConfig {
	apiUrl: string;
	apiVersion?: string;
	environment?: 'development' | 'production' | 'test';
}

// The package ships an ES and a CommonJS build. A page that loads both (a host imports this package while a
// dependency requires it) runs two copies of this module: they share one configuration, kept on globalThis, so a
// setConfig() through either reaches the requests of both.
const SHARED_CONFIG_KEY: unique symbol = Symbol.for('@ever-teams/api/config');

type SharedConfigHolder = typeof globalThis & { [SHARED_CONFIG_KEY]?: { config: IApiTeamsConfig } };

function sharedConfig(): { config: IApiTeamsConfig } {
	const holder = globalThis as SharedConfigHolder;
	if (!holder[SHARED_CONFIG_KEY]) {
		holder[SHARED_CONFIG_KEY] = { config: { apiUrl: 'https://api.ever.team/api' } };
	}
	return holder[SHARED_CONFIG_KEY];
}

class ApiConfigManager {
	private static instance: ApiConfigManager;
	private readonly shared = sharedConfig();

	private constructor() {}

	static getInstance(): ApiConfigManager {
		if (!ApiConfigManager.instance) {
			ApiConfigManager.instance = new ApiConfigManager();
		}
		return ApiConfigManager.instance;
	}

	setConfig(config: Partial<IApiTeamsConfig>) {
		// Callers pass `{ apiUrl: <env value> }`, which is `undefined` when the deployment did not set it.
		// A plain spread would wipe the default above and every request would go to `undefined/<path>`,
		// i.e. a relative URL against the app's own origin. Undefined means "leave it as it is".
		const defined = Object.fromEntries(
			Object.entries(config).filter(([, value]) => value !== undefined)
		) as Partial<IApiTeamsConfig>;

		this.shared.config = {
			...this.shared.config,
			...defined
		};
	}

	getConfig(): IApiTeamsConfig {
		return this.shared.config;
	}
}

export const apiConfigManager = ApiConfigManager.getInstance();
