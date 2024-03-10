import { BrowserWindow } from 'electron';

export interface IWindow {
	create(url: string): void;
	close(): void;
	getWindow(): BrowserWindow | null;
	reload(): void;
}
