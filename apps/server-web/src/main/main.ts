import path from 'path'
import { app, ipcMain, Tray, Menu, nativeImage } from 'electron';
// import serve from 'electron-serve'
import { createWindow } from './helpers';
import { ServerConfig } from './helpers/services/libs/server-config';
import { DesktopServer } from './helpers/desktop-server';
import { LocalStore } from './helpers/services/libs/desktop-store';

const controller = new AbortController();
const serverConfig = new ServerConfig();
const { signal } = controller;
const isPack = app.isPackage;
const desktopServer = new DesktopServer();
const isProd = process.env.NODE_ENV === 'production';
console.log(__dirname);

if (isProd) {
  // serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

const resourceDir = {
  webServer: !isPack ? '../../release/app/dist' : '..',
  resources: '../resources' 
};
const resourcesFiles = {
  webServer: 'standalone/apps/web/server.js',
  iconTray: 'icons/tray/icon.png'
}

const runServer = async () => {
	console.log('Run the Server...');
	try {
		const envVal = getEnvApi();

		// Instantiate API and UI servers
		await desktopServer.start(
			{ api: path.join(__dirname, resourceDir.webServer, resourcesFiles.webServer) },
			envVal,
			null,
			signal
		);
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('You exit without to stop the server');
			return;
		}
	}
};

const stopServer = async () => {
	await desktopServer.stop();
};

const getEnvApi = () => {
  LocalStore.setDefaultServerConfig();
  const setting = LocalStore.getStore('config')
  console.log(setting);
	return setting;
};

 (async () => {
  console.log(app.getAppPath())

  await app.whenReady()
  const appPath = app.getAppPath();
  const iconPath = path.join(__dirname, resourceDir.resources, resourcesFiles.iconTray);
  console.log(iconPath)
  const iconNativePath = nativeImage.createFromPath(iconPath);
  iconNativePath.resize({ width: 16, height: 16 })
  const tray = new Tray(iconNativePath)
  const contextMenu = [
    {
      id: '-1',
      label: 'Status: Stopped',
      async click() {
        console.log('settings')
      }
    },
    {
      id: '1',
      label: 'Start',
      async click() {
        await runServer();
      }
    },
    {
      id: '3',
      label: 'Stop',
      async click() {
        await stopServer();
      }
    },
    {
      id: '4',
      label: 'Settings',
      async click() {
        console.log('settings')
      }
    },
    {
      id: '5',
      label: 'About Gauzy Web Server',
      async click() {
        console.log('about')
      }
    },
    {
      id: '6',
      label: 'Quit',
      click() {
        app.quit();
      }
    }
  ];

  tray.setContextMenu(Menu.buildFromTemplate(contextMenu));
  // const mainWindow = createWindow('main', {
  //   width: 1000,
  //   height: 600,
  //   webPreferences: {
  //     preload: path.join(__dirname, 'preload.js'),
  //   },
  // })

  // if (isProd) {
  //   await mainWindow.loadURL('app://./home')
  // } else {
  //   const port = process.argv[2]
  //   await mainWindow.loadURL(`http://localhost:${port}/home`)
  //   mainWindow.webContents.openDevTools()
  // }
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})
