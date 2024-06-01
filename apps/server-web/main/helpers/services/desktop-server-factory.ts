import { BrowserWindow } from 'electron';
import { WebService } from './web-service';

export class DesktopServerFactory {
	private static apiInstance: WebService;

	public static getApiInstance(path?: string, env?: any, win?: BrowserWindow, signal?: AbortSignal): WebService {
		if (!this.apiInstance && !!env) {
			this.apiInstance = new WebService(path, env, win, signal);
		}
		return this.apiInstance;
	}
}
