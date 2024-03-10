// import * as path from 'path';

// export class Tray {
// 	private tray: Tray | null = null;

// 	constructor(private mainWindow: BrowserWindow) {}

// 	createTray() {
// 		const iconPath = path.join(__dirname, 'icon.png');

// 		this.tray = new Tray(iconPath);
// 		const contextMenu = Menu.buildFromTemplate([
// 			{
// 				label: 'Show App',
// 				click: () => {
// 					this.mainWindow.show();
// 				}
// 			},
// 			{
// 				label: 'Quit',
// 				click: () => {
// 					app.quit();
// 				}
// 			}
// 		]);

// 		this.tray.setToolTip('Your App Name');
// 		this.tray.setContextMenu(contextMenu);
// 	}
// }
