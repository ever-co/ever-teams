import Store from 'electron-store';
import { WebServer } from '../../interfaces';
const store = new Store();
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
		const defaultConfig: WebServer | any = store.get('config');
		if (!defaultConfig || !defaultConfig.server || !defaultConfig.general) {
			const config: WebServer = {
				server: {
					PORT: 3002,
					GAUZY_API_SERVER_URL: 'http://localhost:3000',
					NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://localhost:3000',
					DESKTOP_WEB_SERVER_HOSTNAME: '0.0.0.0'
				},
				general: {
					lang: 'en',
					autoUpdate: true,
					updateCheckPeriode: '30'
				}
			}
			store.set({ config });
		}
	}
};
