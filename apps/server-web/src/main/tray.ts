import { app, NativeImage, nativeImage, Menu, Tray } from 'electron';
import path from 'path';
import { EventEmitter } from 'events';
import { EventLists } from './helpers/constant';

export const _initTray = (resourceDir: any, resourcesFiles: any, contextMenu:any): Tray => {
    const appPath = app.getAppPath();
    const iconPath = path.join(__dirname, resourceDir.resources, resourcesFiles.iconTray);
    console.log(iconPath)
    const iconNativePath: NativeImage = nativeImage.createFromPath(iconPath);
    iconNativePath.resize({ width: 16, height: 16 })
    const tray = new Tray(iconNativePath);
    tray.setContextMenu(Menu.buildFromTemplate(contextMenu));
    return tray;
}

export const defaultTrayMenuItem = (eventEmitter: EventEmitter) => {
    const contextMenu = [
        {
          id: 'SERVER_STATUS',
          label: 'Status: Stopped',
        },
        {
          id: 'SERVER_START',
          label: 'Start',
          async click() {
            eventEmitter.emit(EventLists.webServerStart);
          }
        },
        {
          id: 'SERVER_STOP',
          label: 'Stop',
          async click() {
            eventEmitter.emit(EventLists.webServerStop);
          }
        },
        {
          id: 'APP_SETTING',
          label: 'Settings',
          async click() {
            console.log('settings')
          }
        },
        {
          id: 'APP_ABOUT',
          label: 'About Gauzy Web Server',
          async click() {
            console.log('about')
          }
        },
        {
          id: 'APP_QUIT',
          label: 'Quit',
          click() {
            app.quit();
          }
        }
    ];
    return contextMenu;
}

export const updateTrayMenu = (menuItem: string, context: { label?: string, enabled?: boolean}, eventEmitter: EventEmitter, tray: Tray, contextMenuItems: any) => {
    const menuIdx:number = contextMenuItems.findIndex((item: any) => item.id === menuItem);
    if (menuIdx > -1) {
        contextMenuItems[menuIdx] = {...contextMenuItems[menuIdx], ...context};
        console.log(contextMenuItems)
        tray.setContextMenu(Menu.buildFromTemplate(contextMenuItems));
    }
}
