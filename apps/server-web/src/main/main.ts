import path from 'path'
import { app, ipcMain, Tray, dialog } from 'electron';
// import serve from 'electron-serve'
import { createWindow } from './helpers';
import { ServerConfig } from './helpers/services/libs/server-config';
import { DesktopServer } from './helpers/desktop-server';
import { LocalStore } from './helpers/services/libs/desktop-store';
import { EventEmitter } from 'events';
import { defaultTrayMenuItem, _initTray, updateTrayMenu } from './tray';
import { EventLists } from './helpers/constant';

const eventEmiter = new EventEmitter();

const controller = new AbortController();
const serverConfig = new ServerConfig();
const { signal } = controller;
const isPack = app.isPackaged;
const desktopServer = new DesktopServer(false, eventEmiter);
const isProd = process.env.NODE_ENV === 'production';

const appPath = app.getAppPath();

let isServerRun: boolean;

let tray:Tray;

const trayMenuItems = defaultTrayMenuItem(eventEmiter);



console.log(__dirname);

if (isProd) {
  // serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')}`)
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
  const setting = LocalStore.getStore('config')
  console.log(setting);
	return setting;
};

const onInitApplication = () => {
  LocalStore.setDefaultServerConfig(); // check and set default config
  tray = _initTray(resourceDir, resourcesFiles, trayMenuItems);
  eventEmiter.on(EventLists.webServerStart, async () => {
    updateTrayMenu('SERVER_START', { enabled: false }, eventEmiter, tray, trayMenuItems);
    isServerRun = true;
    await runServer();
  })

  eventEmiter.on(EventLists.webServerStop, async () => {
    isServerRun = false;
    await stopServer();
  })

  eventEmiter.on(EventLists.webServerStarted, () => {
    console.log(EventLists.webServerStarted)
    updateTrayMenu('SERVER_START', { enabled: false }, eventEmiter, tray, trayMenuItems);
    updateTrayMenu('SERVER_STOP', { enabled: true }, eventEmiter, tray, trayMenuItems);
    updateTrayMenu('SERVER_STATUS', { label: 'Status: Started' }, eventEmiter, tray, trayMenuItems);
    isServerRun = true;
  })

  eventEmiter.on(EventLists.webServerStopped, () => {
    console.log(EventLists.webServerStopped);
    updateTrayMenu('SERVER_STOP', { enabled: false }, eventEmiter, tray, trayMenuItems);
    updateTrayMenu('SERVER_START', { enabled: true }, eventEmiter, tray, trayMenuItems);
    updateTrayMenu('SERVER_STATUS', { label: 'Status: Stopped' }, eventEmiter, tray, trayMenuItems);
    isServerRun = false;
  })
}

 (async () => {
  await app.whenReady()
  onInitApplication();
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

app.on('before-quit', async (e) => {
	console.log('Before Quit');

	e.preventDefault();

	if (isServerRun) {
		const exitConfirmationDialog = await dialog.showMessageBox({
      message: '',
      title: 'Warning',
      detail: 'Server web still running, Are you sure to exit the app ?',
      buttons: [
        'Yes',
        'No'
      ]
    })

		if (exitConfirmationDialog.response === 0) {
			// Stop the server from main
			stopServer();
		}
	} else {
		app.exit(0);
	}
});
