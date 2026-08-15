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

const THEME_COLOR = {
  dark: '#202023',
  light: '#f7f9fc'
};



window.addEventListener('DOMContentLoaded', async () => {
  cleanup();
  let theme: string;
  try {
    theme = await ipcRenderer.invoke('current-theme');
  } catch (error) {
    theme = 'dark';
    console.error('Failed to retrieve preferred theme, defaulting to dark mode.');
  }

  const iconPath = await ipcRenderer.invoke('get-app-icon');
  const titleBar = new CustomTitlebar({
    icon: iconPath,
    backgroundColor: TitlebarColor.fromHex(theme === 'dark' ? THEME_COLOR.dark : THEME_COLOR.light),
    enableMnemonics: false,
    iconSize: 16,
    maximizable: false,
    menuPosition: 'left',
    menuTransparency: 0.2
  });

  ipcRenderer.on('refresh-menu', () => {
    titleBar.refreshMenu();
  })

  ipcRenderer.on('themeSignal', (_, arg) => {
    titleBar.updateBackground(TitlebarColor.fromHex(arg.data === 'dark' ? THEME_COLOR.dark : THEME_COLOR.light));
    titleBar.refreshMenu();
  });

  ipcRenderer.on('hide-menu', () => {
    titleBar.dispose();
  })


  const overStyle = document.createElement('style');
  overStyle.innerHTML = `
    /* Use system-ui for the titlebar and all its children */
		.cet-titlebar, .cet-menubar, .cet-action-label, .cet-menubar-menu-title {
			font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important;
			font-size: 12px !important;
			-webkit-font-smoothing: antialiased;
		}

		/* Make the title text slightly more prominent like native Windows 11 apps */
		.cet-title {
			font-weight: 400;
		}

      .cet-container {
          top:0px !important;
          overflow: unset !important;
      }
      .cet-menubar-menu-container {
          font-family: system-ui, sans-serif;
          position: absolute;
          display: block;
          left: 0px;
          opacity: 1;
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
          border: solid 1px rgba(255, 255, 255, 0.5);
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
          padding: 0px 5px;
          height: 100%;
          cursor: default;
          zoom: 0.98;
          white-space: nowrap;
          -webkit-app-region: no-drag;
          outline: 0;
      }
    `;
  document.head.appendChild(overStyle);
})
