
import { BrowserWindow, app, BrowserWindowConstructorOptions, ipcMain, Menu} from 'electron';
import { resolveHtmlPath } from '../util';
import { mainBindings } from 'i18next-electron-fs-backend';
import fs from 'fs';
import { EventEmitter } from 'events';
import { EventLists, WindowOptions, WindowTypes, WINDOW_EVENTS } from '../helpers/constant';
import { IAppWindow, IWindowTypes } from '../helpers/interfaces';
import { platform } from 'os';

export default class WindowsFactory {
    private preloadPath: string;
    private iconPath: string;
    private eventEmitter: EventEmitter;
    constructor(
        preloadPath: string,
        iconPath: string,
        eventEmitter: EventEmitter
    ) {
        this.preloadPath = preloadPath;
        this.iconPath = iconPath;
        this.eventEmitter = eventEmitter;
    }


    defaultOptionWindow(): BrowserWindowConstructorOptions {
        let windowOptions = {
            title: app.name,
            frame: false,
            show: false,
            icon: this.iconPath,
            maximizable: false,
            resizable: false,
            width: 1024,
            height: 728,
            transparent: true,
            roundedCorners: true,
            hasShadow: true,
            // titleBarStyle: 'hiddenInset',
            webPreferences: {
                preload: this.preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true
            }
        }
        if (process.platform === 'darwin') {
          windowOptions = {
            ...windowOptions,
            transparent: true,
            roundedCorners: true,
            hasShadow: true
          }
        }
        return windowOptions;
    }

    createWindow(
        width: number,
        height: number,
        hashPath: string,
        menu: Menu
    ): BrowserWindow {
        const windowOptions: BrowserWindowConstructorOptions = this.defaultOptionWindow();
        windowOptions.width = width;
        windowOptions.height = height;
        const browserWindow = new BrowserWindow(windowOptions);
        if (process.platform === 'darwin') {
          browserWindow.setBackgroundColor('#00000000');
        }
        const url = resolveHtmlPath('index.html', hashPath);
        browserWindow.loadURL(url);
        mainBindings(ipcMain, browserWindow, fs);
        Menu.setApplicationMenu(menu);
        return  browserWindow;
    }

    buildWindow({windowType, menu}: IAppWindow): BrowserWindow {
        const options = this.windowCustomOptions(windowType);
        const browserWindow = this.createWindow(
            options.width,
            options.height,
            options.hashPath,
            menu
        )
        browserWindow.on(WINDOW_EVENTS.CLOSE, () => {
            this.eventEmitter.emit(EventLists.WINDOW_EVENT, {
                windowType: WindowTypes[windowType],
                eventType: WINDOW_EVENTS.CLOSE
            })
        })
        return browserWindow;
    }

    windowCustomOptions(windowType: IWindowTypes) {
        return WindowOptions[windowType];
    }
}
