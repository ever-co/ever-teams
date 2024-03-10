import { app } from 'electron';
import { IWindow } from './components/window/window.model';
import { Window } from './components/window/window';
import { IMenu } from './components/menu/menu.model';
import { MainMenu } from './components/menu/main-menu';

class ServerWeb {
	private mainWindow: IWindow | null = null;
	private mainMenu: IMenu | null = null;

	constructor() {
		app.on('ready', this.createWindow.bind(this));
		app.on('window-all-closed', this.onWindowAllClosed.bind(this));
		app.on('activate', this.onActivate.bind(this));
	}

	private async createWindow() {
		this.mainMenu = new MainMenu();
		this.mainWindow = new Window({
			width: 800,
			height: 600,
			title: 'Ever Teams',
			webPreferences: {
				nodeIntegration: true,
				webSecurity: false
			}
		});
		this.mainWindow.create('https://app.ever.team');
	}

	private onWindowAllClosed() {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	}

	private onActivate() {
		if (this.mainWindow === null) {
			this.createWindow();
		}
	}
}

new ServerWeb();
