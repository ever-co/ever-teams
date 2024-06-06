import { BrowserWindow } from 'electron';
import { WebService } from './web-service';
import { EventEmitter } from 'events';

export class DesktopServerFactory {
	private static apiInstance: WebService;
	public static getApiInstance(path?: string, env?: any, win?: BrowserWindow, signal?: AbortSignal, eventEmitter?: EventEmitter): WebService {
		if (!this.apiInstance && !!env) {
			this.apiInstance = new WebService(path, env, win, signal, eventEmitter);
		}
		return this.apiInstance;
	}
}
