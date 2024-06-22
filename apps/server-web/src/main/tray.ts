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

export const defaultTrayMenuItem = (eventEmitter: EventEmitter, i18nextMainBackend: typeof i18n) => {
    const contextMenu = [
        {
          id: 'SERVER_STATUS',
          label: `${i18nextMainBackend.t('MENU.STATUS')}: ${i18nextMainBackend.t('MENU.STOPPED')}`,
        },
        {
          id: 'SERVER_START',
          label: i18nextMainBackend.t('MENU.SERVER_START'),
          async click() {
            eventEmitter.emit(EventLists.webServerStart);
          }
        },
        {
          id: 'SERVER_STOP',
          label: i18nextMainBackend.t('MENU.SERVER_STOP'),
          enabled: false,
          async click() {
            eventEmitter.emit(EventLists.webServerStop);
          }
        },
        {
          id: 'APP_SETTING',
          label: i18nextMainBackend.t('MENU.APP_SETTING'),
          async click() {
            eventEmitter.emit(EventLists.gotoSetting);
          }
        },
        {
          id: 'APP_ABOUT',
          label: i18nextMainBackend.t('MENU.APP_ABOUT'),
          async click() {
            eventEmitter.emit(EventLists.gotoAbout)
          }
        },
        {
          id: 'APP_QUIT',
          label: i18nextMainBackend.t('MENU.APP_QUIT'),
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
    } else {
      tray.setContextMenu(Menu.buildFromTemplate(contextMenuItems))
    }
}
