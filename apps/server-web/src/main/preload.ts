// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Channels } from './helpers/interfaces';
import { CustomTitlebar, TitlebarColor } from 'custom-electron-titlebar';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    sendMessageSync(channel: Channels, ...args: unknown[]) {
      ipcRenderer.sendSync(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: Channels, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
    removeEventListener(channel: Channels) {
      ipcRenderer.removeAllListeners(channel)
    }
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('languageChange', {
  language: (callback: any) => ipcRenderer.on('languageSignal', (_event, value) => callback(value))
})
contextBridge.exposeInMainWorld('themeChange', {
  theme: (callback: any) => ipcRenderer.on('themeSignal', (_event, value) => callback(value))
})

export type ElectronHandler = typeof electronHandler;
export type languageChange = {
  language: (callback: any) => void
}
export type themeChange = {
  theme: (callback: any) => void
}

const cleanup = () => {
  ipcRenderer.removeAllListeners('refresh-menu');
  ipcRenderer.removeAllListeners('hide-menu');
};

window.addEventListener('DOMContentLoaded', async () => {
  cleanup();
  const platform = await ipcRenderer.invoke('get-platform');
  if (platform === 'darwin') {
    return;
  }
  const iconPath = await ipcRenderer.invoke('get-app-icon');
  const currentTheme: 'dark' | 'light' = await ipcRenderer.invoke('current-theme');
  const themeColor = {
    light: '#F2F2F2',
    dark: '#1e2025'
  }
  const titleBar = new CustomTitlebar({
    icon: iconPath,
    backgroundColor: TitlebarColor.fromHex(themeColor[currentTheme]),
    enableMnemonics: false,
    iconSize: 16,
    maximizable: false,
    menuPosition: 'left',
    menuTransparency: 0.2
  });

  ipcRenderer.on('refresh-menu', () => {
    titleBar.refreshMenu();
  })

  ipcRenderer.on('themeSignal', (_, arg: any) => {
    const theme: 'dark' | 'light' = arg.data;
    titleBar.updateBackground(TitlebarColor.fromHex(themeColor[theme]));
    titleBar.refreshMenu();
  })

  ipcRenderer.on('hide-menu', () => {
    titleBar.dispose();
  })


  const overStyle = document.createElement('style');
  overStyle.innerHTML = `
        .cet-container {
            top:0px !important;
			      overflow: unset !important;
        }
        .cet-menubar-menu-container {
            position: absolute;
            display: block;
            left: 0px;
            padding: 5px 0px 5px 0px;
            outline: 0;
            text-align: left;
            margin: 0 auto;
            margin-left: 0;
            font-size: inherit;
            overflow-x: visible;
            overflow-y: visible;
            -webkit-overflow-scrolling: touch;
            justify-content: flex-end;
            white-space: nowrap;
            border-radius: 5px;
            backdrop-filter: blur(10px);
            box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
            z-index: 99999;
            min-width: 130px;
        }

        .cet-menubar-menu-container .cet-action-menu-item {
            -ms-flex: 1 1 auto;
            flex: 1 1 auto;
            display: -ms-flexbox;
            display: flex;
            height: 2.231em;
            margin: 0px 0px;
            align-items: center;
            position: relative;
            border-radius: 4px;
            text-decoration: none;
        }

        .cet-menubar .cet-menubar-menu-button {
            box-sizing: border-box;
            padding: 1px 5px;
            height: 100%;
            cursor: pointer;
            zoom: 1;
            white-space: nowrap;
            -webkit-app-region: no-drag;
            outline: 0;
        }
    `;
  document.head.appendChild(overStyle);
})
