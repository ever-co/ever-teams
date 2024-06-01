import path from 'path'
import { app, ipcMain, Tray, Menu, nativeImage } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

 (async () => {
  console.log(app.getAppPath())

  await app.whenReady()
  const appPath = app.getAppPath();
  const iconPath = path.join(appPath, 'resources', 'tray', 'icon.png');
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
        console.log('settings')
      }
    },
    {
      id: '3',
      label: 'Stop',
      async click() {
        console.log('settings')
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
