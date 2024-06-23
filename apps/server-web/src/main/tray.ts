import { app, NativeImage, nativeImage, Menu, Tray } from 'electron';
import path from 'path';
import { EventEmitter } from 'events';
import { EventLists } from './helpers/constant';
import i18n from 'i18next';

export const _initTray = (contextMenu:any, icon:string): Tray => {
    const iconNativePath: NativeImage = nativeImage.createFromPath(icon);
    iconNativePath.resize({ width: 16, height: 16 })
    const tray = new Tray(iconNativePath);
    tray.setContextMenu(Menu.buildFromTemplate(contextMenu));
    return tray;
}

export const defaultTrayMenuItem = (eventEmitter: EventEmitter) => {
    const contextMenu = [
        {
          id: 'SERVER_STATUS',
          label: 'MENU.SERVER_STATUS_STOPPED',
        },
        {
          id: 'SERVER_START',
          label: 'MENU.SERVER_START',
          async click() {
            eventEmitter.emit(EventLists.webServerStart);
          }
        },
        {
          id: 'SERVER_STOP',
          label: 'MENU.SERVER_STOP',
          enabled: false,
          async click() {
            eventEmitter.emit(EventLists.webServerStop);
          }
        },
        {
          id: 'APP_SETTING',
          label: 'MENU.APP_SETTING',
          async click() {
            eventEmitter.emit(EventLists.gotoSetting);
          }
        },
        {
          id: 'APP_ABOUT',
          label: 'MENU.APP_ABOUT',
          async click() {
            eventEmitter.emit(EventLists.gotoAbout)
          }
        },
        {
          id: 'APP_QUIT',
          label: 'MENU.APP_QUIT',
          click() {
            app.quit();
          }
        }
    ];
    return contextMenu;
}

export const updateTrayMenu = (menuItem: string, context: { label?: string, enabled?: boolean}, eventEmitter: EventEmitter, tray: Tray, contextMenuItems: any, i18nextMainBackend: typeof i18n) => {
    const menuIdx:number = contextMenuItems.findIndex((item: any) => item.id === menuItem);
    if (menuIdx > -1) {
        contextMenuItems[menuIdx] = {...contextMenuItems[menuIdx], ...context};
        const newMenu = [...contextMenuItems];
        tray.setContextMenu(Menu.buildFromTemplate(translateTrayMenu(i18nextMainBackend, newMenu)));
    } else {
      const newMenu = [...contextMenuItems];
      tray.setContextMenu(Menu.buildFromTemplate(translateTrayMenu(i18nextMainBackend, newMenu)))
    }
}

export const translateTrayMenu = (i18nextMainBackend: typeof i18n, contextMenu: any) => {
  return contextMenu.map((menu: any) => {
    const menuCopied = {...menu};
    menuCopied.label = i18nextMainBackend.t(menuCopied.label);
    return menuCopied;
  })
}
