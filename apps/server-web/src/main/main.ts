import path from 'path'
import { app, ipcMain, Tray, dialog, BrowserWindow, shell } from 'electron';
import { DesktopServer } from './helpers/desktop-server';
import { LocalStore } from './helpers/services/libs/desktop-store';
import { EventEmitter } from 'events';
import { defaultTrayMenuItem, _initTray, updateTrayMenu } from './tray';
import { EventLists, SettingPageTypeMessage } from './helpers/constant';
import { resolveHtmlPath } from './util';
import Updater from './updater';
import { mainBindings } from 'i18next-electron-fs-backend';
import i18nextMainBackend from '../configs/i18n.mainconfig';
import fs from 'fs';
import { WebServer } from './helpers/interfaces';

const eventEmitter = new EventEmitter();

const controller = new AbortController();
const { signal } = controller;
const isPack = app.isPackaged;
const desktopServer = new DesktopServer(false, eventEmitter);
const isProd = process.env.NODE_ENV === 'production';

// const appPath = app.getAppPath();

let isServerRun: boolean;

let tray:Tray;
let settingWindow: BrowserWindow | null = null;
const updater = new Updater(eventEmitter);
i18nextMainBackend.on('initialized', () => {
  const config = LocalStore.getStore('config');
  const selectedLang = config && config.general && config.general.lang;
  i18nextMainBackend.changeLanguage(selectedLang || 'en');
  i18nextMainBackend.off('initialized'); // Remove listener to this event as it's not needed anymore
});

let trayMenuItems: any = [];

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

  mainBindings(ipcMain, settingWindow , fs);
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
  const setting: WebServer = LocalStore.getStore('config')
	return setting.server;
};

const SendMessageToSettingWindow = (type: string, data: any) => {
  settingWindow?.webContents.send('setting-page', {
    type,
    data
  });
}

const onInitApplication = () => {
  LocalStore.setDefaultServerConfig(); // check and set default config
  trayMenuItems = trayMenuItems.length ? trayMenuItems : defaultTrayMenuItem(eventEmitter);
  tray = _initTray(trayMenuItems, getAssetPath('icon.png'));
  i18nextMainBackend.on('languageChanged', (lng) => {
    if (i18nextMainBackend.isInitialized) {
      trayMenuItems = trayMenuItems.length ? trayMenuItems : defaultTrayMenuItem(eventEmitter);
      updateTrayMenu('none', {}, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    }
  });
  eventEmitter.on(EventLists.webServerStart, async () => {
    updateTrayMenu('SERVER_START', { enabled: false }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    isServerRun = true;
    await runServer();
  })

  eventEmitter.on(EventLists.webServerStop, async () => {
    isServerRun = false;
    await stopServer();
  })

  eventEmitter.on(EventLists.webServerStarted, () => {
    console.log(EventLists.webServerStarted)
    updateTrayMenu('SERVER_START', { enabled: false }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    updateTrayMenu('SERVER_STOP', { enabled: true }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    updateTrayMenu('SERVER_STATUS', { label: 'MENU.SERVER_STATUS_STARTED' }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    isServerRun = true;
  })

  eventEmitter.on(EventLists.webServerStopped, () => {
    console.log(EventLists.webServerStopped);
    updateTrayMenu('SERVER_STOP', { enabled: false }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    updateTrayMenu('SERVER_START', { enabled: true }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    updateTrayMenu('SERVER_STATUS', { label: 'MENU.SERVER_STATUS_STOPPED' }, eventEmitter, tray, trayMenuItems, i18nextMainBackend);
    isServerRun = false;
  })

  eventEmitter.on(EventLists.gotoSetting, async () => {
    if (!settingWindow) {
      await createWindow()
    }
    const serverSetting: WebServer = LocalStore.getStore('config');
    console.log('setting data', serverSetting);
    settingWindow?.show();
    settingWindow?.webContents.once('did-finish-load', () => {
      setTimeout(()=> {
        settingWindow?.webContents.send('languageSignal', serverSetting.general?.lang);
        SendMessageToSettingWindow(SettingPageTypeMessage.loadSetting, serverSetting);
      }, 50)
    })
  })

  eventEmitter.on(EventLists.UPDATE_AVAILABLE, (data)=> {
    console.log('UPDATE_AVAILABLE', data);
    SendMessageToSettingWindow(SettingPageTypeMessage.updateAvailable, data);
  })

  eventEmitter.on(EventLists.UPDATE_ERROR, (data)=> {
    console.log('UPDATE_ERROR', data);
    SendMessageToSettingWindow(SettingPageTypeMessage.updateError, {message: JSON.stringify(data)});
  })

  eventEmitter.on(EventLists.UPDATE_NOT_AVAILABLE, (data)=> {
    console.log('UPDATE_NOT_AVAILABLE', data);
    SendMessageToSettingWindow(SettingPageTypeMessage.upToDate, data);
  })

  eventEmitter.on(EventLists.UPDATE_PROGRESS, (data)=> {
    console.log('UPDATE_PROGRESS', data.percent);
    SendMessageToSettingWindow(SettingPageTypeMessage.downloadingUpdate, {percent: Math.floor(data.percent || 0)});
  })

  eventEmitter.on(EventLists.UPDATE_DOWNLOADED, (data)=> {
    console.log('UPDATE_DOWNLOADED', data);
    SendMessageToSettingWindow(SettingPageTypeMessage.downloaded, data);
  })

  eventEmitter.on(EventLists.UPDATE_CANCELLED, (data)=> {
    console.log('UPDATE_CANCELLED', data);
  })

  eventEmitter.on(EventLists.CHANGE_LANGUAGE, (data) => {
    i18nextMainBackend.changeLanguage(data.code);
    LocalStore.updateConfigSetting({general: {
      lang: data.code
    }})
  })

  eventEmitter.on(EventLists.gotoAbout, async () => {
    if (!settingWindow) {
      await createWindow();
    }
    const serverSetting = LocalStore.getStore('config');
    settingWindow?.show();
    settingWindow?.webContents.once('did-finish-load', () => {
      setTimeout(()=> {
        SendMessageToSettingWindow(SettingPageTypeMessage.loadSetting, serverSetting);
        settingWindow?.webContents.send('languageSignal', serverSetting.general?.lang);
        SendMessageToSettingWindow(SettingPageTypeMessage.selectMenu, { key: 'about'});
      }, 100)
    })
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

ipcMain.on('setting-page', (event, arg) => {
  console.log('main setting page', arg);
  switch (arg.type) {
    case SettingPageTypeMessage.saveSetting:
      LocalStore.updateConfigSetting({
        server: arg.data
      });
      event.sender.send('setting-page', { type: SettingPageTypeMessage.mainResponse, data: true });
      break;
    case SettingPageTypeMessage.checkUpdate:
      updater.checkUpdate();
      break;
    case SettingPageTypeMessage.installUpdate:
      updater.installUpdate();
      break;
    case SettingPageTypeMessage.showVersion:
      const currentVersion = app.getVersion();
      event.sender.send('setting-page', { type: SettingPageTypeMessage.showVersion, data: currentVersion})
      break;
    case SettingPageTypeMessage.langChange:
      event.sender.send('languageSignal', arg.data);
      eventEmitter.emit(EventLists.CHANGE_LANGUAGE, {code: arg.data})
      break;
    default:
      break;
  }
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
