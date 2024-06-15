import path from 'path'
import { app, ipcMain, Tray, dialog, BrowserWindow, shell } from 'electron';
import { DesktopServer } from './helpers/desktop-server';
import { LocalStore } from './helpers/services/libs/desktop-store';
import { EventEmitter } from 'events';
import { defaultTrayMenuItem, _initTray, updateTrayMenu } from './tray';
import { EventLists } from './helpers/constant';
import { resolveHtmlPath } from './util';
import Updater from './updater';

const eventEmiter = new EventEmitter();

const controller = new AbortController();
const { signal } = controller;
const isPack = app.isPackaged;
const desktopServer = new DesktopServer(false, eventEmiter);
const isProd = process.env.NODE_ENV === 'production';

// const appPath = app.getAppPath();

let isServerRun: boolean;

let tray:Tray;
let settingWindow: BrowserWindow | null = null;
const updater = new Updater(eventEmiter);

const trayMenuItems = defaultTrayMenuItem(eventEmiter);

const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets/icons/gauzy')
    : path.join(__dirname, '../../assets/icons/gauzy');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

console.log(__dirname);

if (isProd) {
  // serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')}`)
}

const resourceDir = {
  webServer: !isPack ? '../../release/app/dist' : '.',
  resources: '../resources'
};
const resourcesFiles = {
  webServer: 'standalone/apps/web/server.js',
  iconTray: 'icons/tray/icon.png'
}

const devServerPath = path.join(__dirname, resourceDir.webServer, resourcesFiles.webServer);
const serverPath = isPack ? path.join(process.resourcesPath, 'release', 'app', 'dist', resourcesFiles.webServer) : devServerPath;



if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};


const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  settingWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  const url = resolveHtmlPath('index.html', 'setting');
  settingWindow.loadURL(url);


  settingWindow.on('closed', () => {
    settingWindow = null;
  });

};

const runServer = async () => {
	console.log('Run the Server...');
	try {
		const envVal = getEnvApi();

		// Instantiate API and UI servers
		await desktopServer.start(
			{ api: serverPath },
			envVal,
			undefined,
			signal
		);
	} catch (error:any) {
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
  tray = _initTray(trayMenuItems, getAssetPath('icon.png'));
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

  eventEmiter.on(EventLists.gotoSetting, async () => {
    if (!settingWindow) {
      await createWindow()
    }
    const serverSetting = LocalStore.getStore('config');
    console.log('setting data', serverSetting);
    settingWindow?.show();
    settingWindow?.webContents.once('did-finish-load', () => {
      settingWindow?.webContents.send('load_setting', serverSetting);
    })
  })

  eventEmiter.on(EventLists.UPDATE_AVAILABLE, (data)=> {
    console.log('UPDATE_AVAILABLE', data);
  })

  eventEmiter.on(EventLists.UPDATE_ERROR, (data)=> {
    console.log('UPDATE_ERROR', data);
  })

  eventEmiter.on(EventLists.UPDATE_NOT_AVAILABLE, (data)=> {
    console.log('UPDATE_NOT_AVAILABLE', data);
  })

  eventEmiter.on(EventLists.UPDATE_PROGRESS, (data)=> {
    console.log('UPDATE_PROGRESS', data);
  })

  eventEmiter.on(EventLists.UPDATE_DOWNLOADED, (data)=> {
    console.log('UPDATE_DOWNLOADED', data);
  })

  eventEmiter.on(EventLists.UPDATE_CANCELLED, (data)=> {
    console.log('UPDATE_CANCELLED', data);
  })
}

 (async () => {
  await app.whenReady()
  onInitApplication();
})()

app.on('window-all-closed', () => {
  // e.preventDefault()
  // app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

ipcMain.on('save_setting', (event, arg) => {
  LocalStore.updateConfigSetting(arg);
})

ipcMain.on('check_for_update', (event, arg) => {
  updater.checkUpdate()
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

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (mainWindow === null) createWindow();
});
