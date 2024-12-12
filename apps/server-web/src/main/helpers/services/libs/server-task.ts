import { ChildProcessFactory, Observer } from '../utils';
import { BrowserWindow } from 'electron';
import { ServerConfig } from './server-config';
import EventEmitter from 'events';
import { EventLists, LOG_TYPES } from '../../constant';
// import { Timeout } from '../../decorators';

export abstract class ServerTask {
	private processPath: string;
	protected args: Record<string, any>;
	protected window: BrowserWindow;
	protected successMessage: string;
	private errorMessage: string;
	protected config: ServerConfig;
	protected loggerObserver: Observer<string, void>;
	private stateObserver: Observer<boolean, void>;
	public restartObserver: Observer<{ type?: string; status?: string }, void>;
	protected pid: string;
	protected isRunning: boolean;
	protected signal: AbortSignal;
	private criticalMessageError = ['[CRITICAL::ERROR]', 'EADDRINUSE'];
	public eventEmitter: EventEmitter;

	protected constructor(
		processPath: string,
		args: Record<string, any>,
		serverWindow: BrowserWindow,
		successMessage: string,
		errorMessage: string,
		signal: AbortSignal,
		eventEmitter: EventEmitter
	) {
		this.processPath = processPath;
		this.args = args;
		this.window = serverWindow;
		this.successMessage = successMessage;
		this.errorMessage = errorMessage;
		this.config = new ServerConfig();
		this.pid = `${this.args.serviceName}Pid`;
		this.signal = signal;
		this.isRunning = false;
		this.eventEmitter = eventEmitter;

		this.loggerObserver = new Observer((msg: string) => {
			console.log('Sending log_state:', msg);
			const logType = this.isErrorMessage(msg) ? LOG_TYPES.SERVER_LOG_ERROR : LOG_TYPES.SERVER_LOG;
			console.log(logType, msg);
		});

		this.stateObserver = new Observer((state: boolean) => {
			this.isRunning = state;
			if (!this.window?.isDestroyed()) {
				console.log('Sending running_state:', state);
				// this.window.webContents.send('running_state', state);
			}
		});

		this.restartObserver = new Observer((options?) => {
			if (!this.window?.isDestroyed()) {
				console.log('Sending resp_msg:', options);
				// this.window.webContents.send('resp_msg', { type: 'start_server', status: 'success', ...options });
			}
		});
	}

	private isErrorMessage(msg: string): boolean {
		return msg.includes('stderr:') ||
			   this.criticalMessageError.some(error => msg.includes(error));
	  }

	protected async runTask(signal: AbortSignal): Promise<void> {
		console.log('Run Server Task');
		return new Promise<void>((resolve, reject) => {
			try {
				console.log('creating process with processPath:', this.processPath, 'args:', JSON.stringify(this.args));

				const service = ChildProcessFactory.createProcess(this.processPath, this.args, signal);

				this.loggerObserver.notify(`Service created ${service.pid}`)

				service.stdout?.on('data', (data: any) => {
					const msg = data.toString();
					this.loggerObserver.notify(msg);
					if (msg.includes(this.successMessage)) {
						const name = String(this.args.serviceName);
						this.stateObserver.notify(true);
						console.log(this.args)
						this.loggerObserver.notify(
							`☣︎ ${name.toUpperCase()} running on http://${this.args.DESKTOP_WEB_SERVER_HOSTNAME}:${this.args.PORT}`
						);
						this.loggerObserver.notify(
							`☣︎ ${name.toUpperCase()} connected to api ${this.args.GAUZY_API_SERVER_URL}`
						);
						resolve();
					}

					if (this.criticalMessageError.some((error) => msg.includes(error))) {
						this.handleError(msg);
						reject(msg);
					}
				});

				service.stderr?.on('data', this.handleStdErr.bind(this));

				service.on('disconnect', this.handleDisconnect.bind(this));

				service.on('error', (err) => {
					this.handleError(err, false);
				})

				if (this.eventEmitter) {
					this.eventEmitter.emit(EventLists.webServerStarted);
				}
				this.config.setting = { server: { ...this.config.setting.server, [this.pid]: service.pid } };
			} catch (error) {
				console.error('Error running task:', error);
				this.handleError(error);
				reject(error);
			}
		});
	}

	public kill(callHandleError = true): void {
		console.log('Kill Server Task');
		try {
			if (this.pid && this.config.setting.server[this.pid]) {
				process.kill(this.config.setting.server[this.pid]);
				delete this.config.setting.server[this.pid];
				this.stateObserver.notify(false);
				this.loggerObserver.notify(`[${this.pid.toUpperCase()}-${this.config.setting.server[this.pid]}]: stopped`);
			}
		} catch (error: any) {
			if (callHandleError) {
				if (error.code === 'ESRCH') {
					error.message = `ERROR: Could not terminate the process [${this.pid}]. It was not running: ${error}`;
				}
				this.handleError(error, false); // Pass false to prevent retrying kill in handleError
			}
		}
	}

	public get running(): boolean {
		return this.isRunning && !!this.config.setting.server[this.pid];
	}

	public async restart(): Promise<void> {
		console.log('Restart Server Task');

		if (this.running) {
			this.stop();
		}

		await this.start();
	}

	public stop(): void {
		console.log('Stop Server Task');
		this.kill();
	}

	public async start(): Promise<void> {
		console.log('Start Server Task');
		try {
			await this.runTask(this.signal);
		} catch (error) {
			console.error('Error starting task:', error);
			this.handleError(error);
		}
	}

	private handleStdErr(data: any): void {
		const errorMessage: string = data.toString();
		this.loggerObserver.notify(`stderr: ${errorMessage}`);
	}

	private handleDisconnect(): void {
		this.loggerObserver.notify('Webserver disconnected')
		if (this.eventEmitter) {
			this.eventEmitter.emit(EventLists.webServerStopped);
		}
		this.stateObserver.notify(false);
	}

	protected handleError(error: any, attemptKill = true) {
		if (attemptKill) {
			this.kill(false); // Pass false to indicate that handleError should not attempt to kill again
		}
		this.stateObserver.notify(false);
		console.error(this.errorMessage, error);
		this.loggerObserver.notify(`ERROR: ${this.errorMessage} ${error}`);
	}
}
