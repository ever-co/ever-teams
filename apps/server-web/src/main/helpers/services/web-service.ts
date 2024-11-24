import { BrowserWindow } from 'electron';
import { ServerTask } from './libs/server-task';
import { EventEmitter } from 'stream';

export class WebService extends ServerTask {
	constructor(
		readonly path: string,
		public env: any,
		readonly window: BrowserWindow,
		readonly signal: AbortSignal,
		readonly eventEmitter: EventEmitter
	) {
		const args = { ...env, serviceName: 'WebServer' };

		// Note: do not change this prefix because we may use it to detect the success message from the running server!
		const successMessage = 'Starting...';

		const errorMessage = 'Error running API server:';

		super(path, args, window, successMessage, errorMessage, signal, eventEmitter);
	}

	public override async start(): Promise<void> {
		try {
			this.setApiConfig();
			await super.start();
		} catch (error) {
			this.handleError(error);
		}
	}

	public override async restart(): Promise<void> {
		try {
			this.setApiConfig();
			await super.restart();
		} catch (error) {
			this.handleError(error);
		}
	}

	public setApiConfig(): void {
		Object.assign(this.args, {...this.env});
	}
}
