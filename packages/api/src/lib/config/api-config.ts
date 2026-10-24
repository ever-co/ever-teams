export interface IApiTeamsConfig {
	apiUrl: string;
	apiVersion?: string;
	environment?: 'development' | 'production' | 'test';
}

class ApiConfigManager {
	private static instance: ApiConfigManager;
	private config: IApiTeamsConfig = { apiUrl: 'https://api.ever.team/api' };

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

		this.config = {
			...this.config,
			...defined
		};
	}

	getConfig(): IApiTeamsConfig {
		return this.config;
	}
}

export const apiConfigManager = ApiConfigManager.getInstance();
