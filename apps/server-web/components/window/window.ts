import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';

export class Window {
	private window: BrowserWindow | null = null;

	constructor(private options: BrowserWindowConstructorOptions) {}

	public create(url: string) {
		if (!this.window) {
			this.window = new BrowserWindow(this.options);
			this.window.loadURL(url);

			this.window.on('closed', () => {
				this.window = null;
			});
		}
	}

	public close() {
		if (this.window && !this.window.isDestroyed) {
			this.window.close();
			this.window = null;
		}
	}

	public getWindow(): BrowserWindow | null {
		return this.window;
	}

	public reload() {
		if (this.window && !this.window.isDestroyed) {
			this.window.reload();
		}
	}
}
