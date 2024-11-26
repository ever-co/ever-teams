import Store from 'electron-store';
import { WebServer, ServerConfig } from '../../interfaces';
const store = new Store();
const DEFAULT_CONFIG:WebServer = {
	server: {
		PORT: 3002,
		GAUZY_API_SERVER_URL: 'http://localhost:3000',
		NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://localhost:3000',
		DESKTOP_WEB_SERVER_HOSTNAME: '0.0.0.0'
	},
	general: {
		lang: 'en',
		autoUpdate: true,
		updateCheckPeriod: '1140' // Time in minutes
	}
}
export const LocalStore = {
	getStore: (source: string | 'config'): WebServer | any => {
		return store.get(source);
	},

	updateConfigSetting: (values: WebServer) => {
		let config: WebServer | any = store.get('config') || {};
		Object.keys(values).forEach((key: string) => {
			if (key === 'server') {
				config[key] = { ...(config[key] || {}), ...values.server }
			}

			if (key === 'general') {
				config[key] = { ...(config[key] || {}), ...values.general }
			}
		})
		store.set({
			config
		});
	},

	deepMerge<T>(target: T, source: Partial<T>): T {
		const result: T = { ...target };
		Object.keys(source).forEach(key => {
			const value = source[key as keyof T];
			if (value && typeof value === 'object') {
				result[key as keyof T] = this.deepMerge(
					target[key as keyof T],
					value as any
				);
			} else if (value !== undefined) {
				result[key as keyof T] = value as any;
			}
		});
		return result;
	},

	validateConfig(config: WebServer): void {
		const required = ['PORT', 'GAUZY_API_SERVER_URL'];
		required.forEach(field => {
			if (!config || !config.server || !config?.server[field as keyof ServerConfig]) {
				throw new Error(`Missing required field: ${field}`);
			}
		});
	},

	setDefaultServerConfig() {
	    try {
	        const storedConfig = store.get('config') as Partial<WebServer> || {};
	        const mergedConfig = this.deepMerge<WebServer>(DEFAULT_CONFIG, storedConfig)
	        this.validateConfig(mergedConfig || {});

	        store.set({ config: mergedConfig });
	    } catch (error) {
	        console.error('Failed to set default configuration:', error);
	        store.set({ config: DEFAULT_CONFIG });
	    }
	}
};
