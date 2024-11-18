import Store from 'electron-store';
import { WebServer } from '../../interfaces';
const store = new Store();
const DEFAULT_CONFIG:any = {
	server: {
		PORT: 3002,
		GAUZY_API_SERVER_URL: 'http://localhost:3000',
		NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://localhost:3000',
		DESKTOP_WEB_SERVER_HOSTNAME: '0.0.0.0'
	},
	general: {
		lang: 'en',
		autoUpdate: true,
		updateCheckPeriode: '1140'
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


	setDefaultServerConfig: () => {
		const defaultConfig: WebServer | any = store.get('config') || {};
		Object.keys(DEFAULT_CONFIG).forEach((key) => {
			Object.keys(DEFAULT_CONFIG[key]).forEach((keySub) => {
				defaultConfig[key] = defaultConfig[key] || {};
				defaultConfig[key][keySub] = defaultConfig[key][keySub] || DEFAULT_CONFIG[key][keySub];
			})
		})
		store.set({
			config: defaultConfig
		});
	}
};
