import Store from 'electron-store';
import { WebServer } from '../../interfaces';
const store = new Store();
export const LocalStore = {
	getStore: (source: string) => {
		return store.get(source);
	},

	updateConfigSetting: (values: WebServer) => {
		let config: WebServer | any = store.get('config');
		config = { ...config, ...values };
		store.set({
			config
		});
	},


	setDefaultServerConfig: () => {
		const defaultConfig: WebServer | any = store.get('config');
		if (!defaultConfig || !defaultConfig.PORT) {
			const config: WebServer = {
				PORT: 3002,
				GAUZY_API_SERVER_URL: 'htpp://localhost:3000',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'http://localhost:3000'
			}
			store.set({ config });
		}
	}
};
