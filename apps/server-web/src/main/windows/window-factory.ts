
import { BrowserWindow, app, BrowserWindowConstructorOptions, ipcMain, Menu } from 'electron';
import { resolveHtmlPath } from '../util';
import { mainBindings } from 'i18next-electron-fs-backend';
import fs from 'fs';
import { EventEmitter } from 'events';
import { EventLists, WindowOptions, WindowTypes } from '../helpers/constant';
import { IAppWindow, IWindowTypes } from '../helpers/interfaces';

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
        return {
            title: app.name,
            frame: true,
            show: false,
            icon: this.iconPath,
            maximizable: false,
            resizable: false,
            width: 1024,
            height: 728,
            webPreferences: {
                preload: this.preloadPath
            }
        }
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
        let browserWindow = new BrowserWindow(windowOptions);
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
        browserWindow.on('close', () => {
            this.eventEmitter.emit(EventLists.WINDOW_EVENT, {
                windowType: WindowTypes[windowType],
                eventType: 'close'
            })
        })
        return browserWindow;
    }

    windowCustomOptions(windowType: IWindowTypes) {
        return WindowOptions[windowType];
    }
}
