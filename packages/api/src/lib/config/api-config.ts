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
		this.config = {
			...this.config,
			...config
		};
	}

	getConfig(): IApiTeamsConfig {
		return this.config;
	}
}

export const apiConfigManager = ApiConfigManager.getInstance();
