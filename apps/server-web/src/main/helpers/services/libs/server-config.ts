import { LocalStore } from './desktop-store';

export class ServerConfig {
	public get setting(): any {
		return LocalStore.getStore('config');
	}

	public set setting(value:any) {
		LocalStore.updateConfigSetting(value);
	}
}
